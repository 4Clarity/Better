import { useEffect, useMemo, useState } from 'react';
import { Task } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MilestoneLite = { id: string; title: string; dueDate: string; originalStatus?: string; status: string; description?: string };

function Sequence({ seq }: { seq?: string }) {
  return <span className="text-xs text-muted-foreground mr-2">{seq}</span>;
}

interface TransitionTasksAndMilestonesProps {
  transitionId: string;
}

export function TransitionTasksAndMilestones({ transitionId }: TransitionTasksAndMilestonesProps) {
  const [milestones, setMilestones] = useState<MilestoneLite[]>([]);
  const [productProgramMilestones, setProductProgramMilestones] = useState<any[]>([]);
  const [transitionMilestones, setTransitionMilestones] = useState<any[]>([]);
  const [productProgramTasks, setProductProgramTasks] = useState<any[]>([]);
  const [tree, setTree] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Add Task dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDue, setAddDue] = useState('');
  const [addPriority, setAddPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [addDesc, setAddDesc] = useState('');
  const [addParentId, setAddParentId] = useState<string | undefined>();
  const [addMilestoneId, setAddMilestoneId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transitionId) return;
    setLoading(true);
    setError(undefined);
    Promise.all([
      axios.get(`/transitions/${transitionId}/milestones/combined`).then(r => r.data).catch(() => ({ all: [], transitionMilestones: [], productProgramMilestones: [] })),
      axios.get(`/transitions/${transitionId}/tasks/combined`).then(r => r.data).catch(() => ({ transitionTasks: [], productProgramTasks: [] }))
    ]).then(([milestonesData, tasksData]) => {
      // Combine all milestones for the milestone selector
      setMilestones(milestonesData?.all || []);
      setProductProgramMilestones(milestonesData?.productProgramMilestones || []);
      setTransitionMilestones(milestonesData?.transitionMilestones || []);
      setProductProgramTasks(tasksData?.productProgramTasks || []);
      // Use transition tasks for the tree (product program tasks are shown separately)
      setTree(buildTree(tasksData?.transitionTasks || []));
    }).finally(() => setLoading(false));
  }, [transitionId]);

  // Helper to build tree from flat task list
  const buildTree = (tasks: any[]) => {
    const byParent = new Map<string | null, any[]>();
    tasks.forEach(t => {
      const key = (t.parentTaskId ?? null);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push({ ...t, sequence: '', children: [] as any[] });
    });
    const roots = (byParent.get(null) ?? []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const attach = (node: any) => {
      const kids = byParent.get(node.id) ?? [];
      node.children = kids.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      node.children.forEach(attach);
    };
    roots.forEach(attach);
    const computeSeq = (nodes: any[], prefix: number[] = []) => {
      nodes.forEach((n, i) => {
        const seqArr = [...prefix, i + 1];
        n.sequence = seqArr.join('.');
        computeSeq(n.children, seqArr);
      });
    };
    computeSeq(roots);
    return roots;
  };

  const milestoneMap = useMemo(() => {
    const m = new Map<string, MilestoneLite>();
    milestones.forEach(x => m.set(x.id, x));
    return m;
  }, [milestones]);

  const refreshTree = async () => {
    if (!transitionId) return;
    const res = await axios.get(`/transitions/${transitionId}/tasks/combined`);
    setTree(buildTree(res.data?.transitionTasks || []));
  };

  const openAddFor = (parent?: Task, milestone?: MilestoneLite) => {
    setAddParentId(parent?.id);
    setAddMilestoneId(milestone?.id);
    setAddTitle(''); setAddDue(''); setAddPriority('Medium'); setAddDesc('');
    setAddOpen(true);
  };

  const createTask = async () => {
    if (!transitionId || !addTitle || !addDue) return;
    setSaving(true);
    try {
      const payload: any = {
        title: addTitle,
        dueDate: new Date(`${addDue}T12:00:00`).toISOString(),
        priority: addPriority,
        status: 'Not_Started',
        description: addDesc || undefined,
      };
      if (addMilestoneId) payload.milestoneId = addMilestoneId;
      if (addParentId) payload.parentTaskId = addParentId;
      await axios.post(`/transitions/${transitionId}/tasks`, payload);
      setAddOpen(false);
      await refreshTree();
    } catch (e: any) {
      alert(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading planning data…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tasks & Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product/Program Milestones Section */}
          {productProgramMilestones.length > 0 && (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2">
                Product/Program Milestones (Gov Program Manager)
              </div>
              {productProgramMilestones.map(m => (
                <div key={m.id} className="bg-blue-50 border border-blue-200 rounded-md">
                  <div className="p-3 border-b border-blue-200">
                    <div className="font-medium text-blue-900">{m.title}</div>
                    <div className="text-xs text-blue-600 mt-1">Due: {new Date(m.dueDate).toLocaleDateString()} • Status: {m.originalStatus || m.status}</div>
                    {m.description && <div className="text-sm text-gray-600 mt-1">{m.description}</div>}
                  </div>
                  <div className="p-2">
                    {productProgramTasks.filter(t => t.milestoneId === m.id).length > 0 ? (
                      <SimpleTaskList tasks={productProgramTasks.filter(t => t.milestoneId === m.id)} />
                    ) : (
                      <div className="text-sm text-gray-500 italic p-2">No tasks assigned to this milestone</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Product/Program Tasks (Unassigned) */}
          {productProgramTasks.filter(t => !t.milestoneId).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md">
              <div className="p-3 border-b border-blue-200">
                <div className="font-medium text-blue-900">Product/Program Tasks (Unassigned)</div>
                <div className="text-xs text-blue-600">Set by Gov Program Manager</div>
              </div>
              <div className="p-2">
                <SimpleTaskList tasks={productProgramTasks.filter(t => !t.milestoneId)} />
              </div>
            </div>
          )}

          {/* Transition Milestones Section */}
          <div className="text-lg font-semibold text-green-700 border-b-2 border-green-200 pb-2 mt-8">
            Transition Milestones & Tasks
          </div>

          {/* Unassigned transition tasks */}
          <div className="bg-white border rounded-md">
            <div className="p-3 flex items-center justify-between border-b">
              <div className="font-medium">Unassigned Transition Tasks</div>
              <Button data-testid="planning-add-root-task-btn" variant="outline" size="sm" onClick={() => openAddFor(undefined, undefined)}>Add Task</Button>
            </div>
            <div className="p-2">
              <TaskList nodes={tree.filter(t => !t.milestoneId)} onAddSubtask={(n) => openAddFor(n, undefined)} />
            </div>
          </div>

          {/* Transition milestone groups */}
          {transitionMilestones.map(m => (
            <div key={m.id} className="bg-white border rounded-md">
              <div className="p-3 flex items-center justify-between border-b">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-gray-600 mt-1">Due: {new Date(m.dueDate).toLocaleDateString()} • Status: {m.status}</div>
                </div>
                <Button data-testid="planning-add-milestone-task-btn" variant="outline" size="sm" onClick={() => openAddFor(undefined, m)}>Add Task</Button>
              </div>
              <div className="p-2">
                <TaskList nodes={tree.filter(t => t.milestoneId === m.id)} onAddSubtask={(n) => openAddFor(n, m)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-md p-4 w-full max-w-lg">
            <div className="text-lg font-semibold mb-2">Add Task</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Title</Label>
                <Input data-testid="task-title" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Task title" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input data-testid="task-date" type="date" value={addDue} onChange={(e) => setAddDue(e.target.value)} />
              </div>
              <div>
                <Label>Priority</Label>
                <select data-testid="task-priority" className="border rounded-md p-2 w-full" value={addPriority} onChange={(e) => setAddPriority(e.target.value as any)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <Label>Milestone</Label>
                <select data-testid="task-milestone" className="border rounded-md p-2 w-full" value={addMilestoneId || ''} onChange={(e) => setAddMilestoneId(e.target.value || undefined)}>
                  <option value="">Unassigned</option>
                  {milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea className="w-full border rounded-md p-2" rows={3} value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={saving || !addTitle || !addDue}>{saving ? 'Adding...' : 'Create Task'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskList({ nodes, onAddSubtask }: {
  nodes: Task[];
  onAddSubtask: (node: Task) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.length === 0 ? (
        <div className="text-sm text-gray-500 italic p-2">No tasks yet</div>
      ) : (
        nodes.map((n) => (
          <div key={n.id} className="border rounded-md p-2">
            <div className="flex items-center justify-between">
              <div>
                <Sequence seq={n.sequence} />
                <span className="font-medium mr-2">{n.title}</span>
                <span className="text-xs text-muted-foreground">Due {new Date(n.dueDate).toLocaleDateString()} • {n.status} • {n.priority}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button data-testid="add-subtask-btn" variant="outline" size="sm" onClick={() => onAddSubtask(n)}>Add Subtask</Button>
              </div>
            </div>
            {n.children && n.children.length > 0 && (
              <div className="ml-4 mt-2">
                <TaskList nodes={n.children} onAddSubtask={onAddSubtask} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Simple read-only task list for Product/Program tasks
function SimpleTaskList({ tasks }: { tasks: any[] }) {
  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <div key={task.id} className="border border-blue-100 rounded-md p-2 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="font-medium mr-2">{task.title}</span>
              {task.description && <span className="text-sm text-gray-600">— {task.description}</span>}
            </div>
            <div className="text-xs text-gray-600 ml-4 flex-shrink-0">
              {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
              <span className="ml-2">• {task.originalStatus || task.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
