import { useEffect, useMemo, useState } from 'react';
import { Task, taskApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from '@/lib/axios';
import { Calendar, List, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2 } from 'lucide-react';

type MilestoneLite = {
  id: string;
  title: string;
  dueDate: string;
  originalStatus?: string;
  status: string;
  description?: string;
};

function Sequence({ seq }: { seq?: string }) {
  return <span className="text-xs text-muted-foreground mr-2">{seq}</span>;
}

interface TaskMilestoneManagementProps {
  transitionId: string;
}

export function TaskMilestoneManagement({ transitionId }: TaskMilestoneManagementProps) {
  console.log('TaskMilestoneManagement component loaded for transition:', transitionId);
  const [viewMode, setViewMode] = useState<'management' | 'gantt'>('management');
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
  const [addAssignedTo, setAddAssignedTo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Edit Milestone state
  const [editMilestoneOpen, setEditMilestoneOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDue, setEditMilestoneDue] = useState('');
  const [editMilestonePriority, setEditMilestonePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [editMilestoneStatus, setEditMilestoneStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE'>('PENDING');
  const [editMilestoneDesc, setEditMilestoneDesc] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);

  useEffect(() => {
    if (!transitionId) return;
    setLoading(true);
    setError(undefined);
    Promise.all([
      axios.get(`/transitions/${transitionId}/milestones/combined`).then(r => r.data).catch(() => ({ all: [], transitionMilestones: [], productProgramMilestones: [] })),
      axios.get(`/transitions/${transitionId}/tasks/combined`).then(r => r.data).catch(() => ({ transitionTasks: [], productProgramTasks: [] }))
    ]).then(([milestonesData, tasksData]) => {
      setMilestones(milestonesData?.all || []);
      setProductProgramMilestones(milestonesData?.productProgramMilestones || []);
      setTransitionMilestones(milestonesData?.transitionMilestones || []);
      setProductProgramTasks(tasksData?.productProgramTasks || []);
      setTree(buildTree(tasksData?.transitionTasks || []));
    }).finally(() => setLoading(false));
  }, [transitionId]);

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

  const refreshTree = async () => {
    if (!transitionId) return;
    const res = await axios.get(`/transitions/${transitionId}/tasks/combined`);
    setTree(buildTree(res.data?.transitionTasks || []));
  };

  const treeFlat = () => {
    const acc: Task[] = [];
    const walk = (nodes: Task[]) => { nodes.forEach(n => { acc.push(n); if (n.children) walk(n.children); }); };
    walk(tree);
    return acc;
  };

  const findNode = (nodes: Task[], id: string): Task | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const child = n.children && findNode(n.children, id);
      if (child) return child;
    }
    return undefined;
  };

  const moveUp = async (parentId: string | null, index: number, node: Task) => {
    if (!transitionId || index <= 0) return;
    const siblingBefore = (parentId ? treeFlat().filter(t => t.parentTaskId === parentId) : treeFlat().filter(t => !t.parentTaskId))[index - 1];
    await taskApi.move(transitionId, node.id, { beforeTaskId: siblingBefore?.id, parentTaskId: parentId });
    await refreshTree();
  };

  const moveDown = async (parentId: string | null, index: number, node: Task) => {
    if (!transitionId) return;
    const siblings = parentId ? treeFlat().filter(t => t.parentTaskId === parentId) : treeFlat().filter(t => !t.parentTaskId);
    const siblingAfter = siblings[index + 1];
    if (!siblingAfter) return;
    await taskApi.move(transitionId, node.id, { afterTaskId: siblingAfter.id, parentTaskId: parentId });
    await refreshTree();
  };

  const indent = async (parentId: string | null, index: number, node: Task, siblings: Task[]) => {
    if (!transitionId || index <= 0) return;
    const newParent = siblings[index - 1];
    await taskApi.move(transitionId, node.id, { parentTaskId: newParent.id, position: 0 });
    await refreshTree();
  };

  const outdent = async (node: Task) => {
    if (!transitionId || !node.parentTaskId) return;
    const parent = findNode(tree, node.parentTaskId);
    if (!parent) return;
    const grandParentId = parent.parentTaskId ?? null;
    await taskApi.move(transitionId, node.id, { parentTaskId: grandParentId, afterTaskId: parent.id });
    await refreshTree();
  };

  const openAddFor = (parent?: Task, milestone?: MilestoneLite) => {
    setAddParentId(parent?.id);
    setAddMilestoneId(milestone?.id);
    setAddTitle('');
    setAddDue('');
    setAddPriority('Medium');
    setAddDesc('');
    setAddAssignedTo('');
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
        assignedTo: addAssignedTo || undefined,
      };
      if (addMilestoneId) payload.milestoneId = addMilestoneId;
      if (addParentId) payload.parentTaskId = addParentId;
      await taskApi.create(transitionId, payload);
      setAddOpen(false);
      await refreshTree();
    } catch (e: any) {
      alert(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const refreshMilestones = async () => {
    if (!transitionId) return;
    try {
      const res = await axios.get(`/transitions/${transitionId}/milestones/combined`);
      setMilestones(res.data?.all || []);
      setProductProgramMilestones(res.data?.productProgramMilestones || []);
      setTransitionMilestones(res.data?.transitionMilestones || []);
    } catch (e) {
      console.error('Failed to refresh milestones:', e);
    }
  };

  const openEditMilestone = (milestone: any) => {
    setEditingMilestoneId(milestone.id);
    setEditMilestoneTitle(milestone.title);
    setEditMilestoneDue(milestone.dueDate.split('T')[0]);
    setEditMilestonePriority(milestone.priority || 'MEDIUM');
    setEditMilestoneStatus(milestone.status || 'PENDING');
    setEditMilestoneDesc(milestone.description || '');
    setEditMilestoneOpen(true);
  };

  const saveMilestone = async () => {
    if (!transitionId || !editingMilestoneId) return;
    setSavingMilestone(true);
    try {
      await axios.put(`/transitions/${transitionId}/milestones/${editingMilestoneId}`, {
        title: editMilestoneTitle,
        dueDate: new Date(`${editMilestoneDue}T12:00:00`).toISOString(),
        priority: editMilestonePriority,
        status: editMilestoneStatus,
        description: editMilestoneDesc || undefined,
      });
      setEditMilestoneOpen(false);
      await refreshMilestones();
    } catch (e: any) {
      alert(e.message || 'Failed to update milestone');
    } finally {
      setSavingMilestone(false);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!transitionId) return;
    if (!confirm('Delete this milestone? Associated tasks will be unassigned from the milestone.')) return;
    try {
      await axios.delete(`/transitions/${transitionId}/milestones/${milestoneId}`);
      await refreshMilestones();
      await refreshTree(); // Refresh tasks as they may have been updated
    } catch (e: any) {
      alert(e.message || 'Failed to delete milestone');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading planning data…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks & Milestones</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'management' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('management')}
            >
              <List className="h-4 w-4 mr-2" />
              Management
            </Button>
            <Button
              variant={viewMode === 'gantt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('gantt')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Gantt Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {viewMode === 'management' ? (
          <ManagementView
            productProgramMilestones={productProgramMilestones}
            productProgramTasks={productProgramTasks}
            transitionMilestones={transitionMilestones}
            tree={tree}
            moveUp={moveUp}
            moveDown={moveDown}
            indent={indent}
            outdent={outdent}
            openAddFor={openAddFor}
            onEditMilestone={openEditMilestone}
            onDeleteMilestone={deleteMilestone}
          />
        ) : (
          <GanttChartView
            productProgramMilestones={productProgramMilestones}
            productProgramTasks={productProgramTasks}
            transitionMilestones={transitionMilestones}
            tree={tree}
          />
        )}
      </CardContent>

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
                <Label>Assigned To</Label>
                <Input
                  data-testid="task-assigned-to"
                  value={addAssignedTo}
                  onChange={(e) => setAddAssignedTo(e.target.value)}
                  placeholder="User ID or email"
                />
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

      {editMilestoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-md p-4 w-full max-w-lg">
            <div className="text-lg font-semibold mb-2">Edit Milestone</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Title</Label>
                <Input
                  data-testid="milestone-edit-title"
                  value={editMilestoneTitle}
                  onChange={(e) => setEditMilestoneTitle(e.target.value)}
                  placeholder="Milestone title"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  data-testid="milestone-edit-date"
                  type="date"
                  value={editMilestoneDue}
                  onChange={(e) => setEditMilestoneDue(e.target.value)}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  data-testid="milestone-edit-priority"
                  className="border rounded-md p-2 w-full"
                  value={editMilestonePriority}
                  onChange={(e) => setEditMilestonePriority(e.target.value as any)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  data-testid="milestone-edit-status"
                  className="border rounded-md p-2 w-full"
                  value={editMilestoneStatus}
                  onChange={(e) => setEditMilestoneStatus(e.target.value as any)}
                >
                  <option value="PENDING">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea
                  data-testid="milestone-edit-desc"
                  className="w-full border rounded-md p-2"
                  rows={3}
                  value={editMilestoneDesc}
                  onChange={(e) => setEditMilestoneDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditMilestoneOpen(false)}>Cancel</Button>
              <Button
                onClick={saveMilestone}
                disabled={savingMilestone || !editMilestoneTitle || !editMilestoneDue}
              >
                {savingMilestone ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ManagementView({
  productProgramMilestones,
  productProgramTasks,
  transitionMilestones,
  tree,
  moveUp,
  moveDown,
  indent,
  outdent,
  openAddFor,
  onEditMilestone,
  onDeleteMilestone
}: {
  productProgramMilestones: any[];
  productProgramTasks: any[];
  transitionMilestones: any[];
  tree: Task[];
  moveUp: (parentId: string | null, index: number, node: Task) => void | Promise<void>;
  moveDown: (parentId: string | null, index: number, node: Task) => void | Promise<void>;
  indent: (parentId: string | null, index: number, node: Task, siblings: Task[]) => void | Promise<void>;
  outdent: (node: Task) => void | Promise<void>;
  openAddFor: (parent?: Task, milestone?: any) => void;
  onEditMilestone: (milestone: any) => void;
  onDeleteMilestone: (milestoneId: string) => void;
}) {
  return (
    <>
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
          <Button data-testid="planning-add-root-task-btn" variant="outline" size="sm" onClick={() => openAddFor(undefined, undefined)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
        <div className="p-2">
          <TaskList
            nodes={tree.filter(t => !t.milestoneId)}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onIndent={indent}
            onOutdent={outdent}
            onAddSubtask={(n) => openAddFor(n, undefined)}
          />
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
            <div className="flex items-center gap-2">
              <Button
                data-testid="edit-milestone-btn"
                variant="outline"
                size="sm"
                onClick={() => onEditMilestone(m)}
                title="Edit Milestone"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                data-testid="delete-milestone-btn"
                variant="outline"
                size="sm"
                onClick={() => onDeleteMilestone(m.id)}
                title="Delete Milestone"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button data-testid="planning-add-milestone-task-btn" variant="outline" size="sm" onClick={() => openAddFor(undefined, m)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </div>
          <div className="p-2">
            <TaskList
              nodes={tree.filter(t => t.milestoneId === m.id)}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onIndent={indent}
              onOutdent={outdent}
              onAddSubtask={(n) => openAddFor(n, m)}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function TaskList({ nodes, onMoveUp, onMoveDown, onIndent, onOutdent, onAddSubtask }: {
  nodes: Task[];
  onMoveUp: (parentId: string | null, index: number, node: Task) => void | Promise<void>;
  onMoveDown: (parentId: string | null, index: number, node: Task) => void | Promise<void>;
  onIndent: (parentId: string | null, index: number, node: Task, siblings: Task[]) => void | Promise<void>;
  onOutdent: (node: Task) => void | Promise<void>;
  onAddSubtask: (node: Task) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.length === 0 ? (
        <div className="text-sm text-gray-500 italic p-2">No tasks yet</div>
      ) : (
        nodes.map((n, idx) => (
          <div key={n.id} className="border rounded-md p-2 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Sequence seq={n.sequence} />
                <span className="font-medium mr-2">{n.title}</span>
                <span className="text-xs text-muted-foreground">
                  Due {new Date(n.dueDate).toLocaleDateString()} • {n.status} • {n.priority}
                  {n.assignedTo && ` • Assigned to: ${n.assignedTo}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  data-testid="up-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveUp(n.parentTaskId ?? null, idx, n)}
                  disabled={idx === 0}
                  title="Move Up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  data-testid="down-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveDown(n.parentTaskId ?? null, idx, n)}
                  disabled={idx === nodes.length - 1}
                  title="Move Down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  data-testid="indent-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => onIndent(n.parentTaskId ?? null, idx, n, nodes)}
                  disabled={idx === 0}
                  title="Indent (make subtask)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  data-testid="outdent-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOutdent(n)}
                  disabled={!n.parentTaskId}
                  title="Outdent (promote)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  data-testid="add-subtask-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddSubtask(n)}
                  title="Add Subtask"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {n.children && n.children.length > 0 && (
              <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-2">
                <TaskList
                  nodes={n.children}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onIndent={onIndent}
                  onOutdent={onOutdent}
                  onAddSubtask={onAddSubtask}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

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

function GanttChartView({
  productProgramMilestones,
  productProgramTasks,
  transitionMilestones,
  tree
}: {
  productProgramMilestones: any[];
  productProgramTasks: any[];
  transitionMilestones: any[];
  tree: Task[];
}) {
  // Gather all tasks for timeline
  const allTasks = useMemo(() => {
    const tasks: any[] = [];
    const flatten = (nodes: Task[]) => {
      nodes.forEach(n => {
        tasks.push(n);
        if (n.children) flatten(n.children);
      });
    };
    flatten(tree);
    return [...productProgramTasks, ...tasks];
  }, [productProgramTasks, tree]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const allDates = [
      ...productProgramMilestones.map(m => new Date(m.dueDate)),
      ...transitionMilestones.map(m => new Date(m.dueDate)),
      ...allTasks.map(t => new Date(t.dueDate))
    ];

    if (allDates.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    const start = new Date(Math.min(...allDates.map(d => d.getTime())));
    const end = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [productProgramMilestones, transitionMilestones, allTasks]);

  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

  const getTaskPosition = (dueDate: string) => {
    const taskDate = new Date(dueDate);
    const offset = Math.ceil((taskDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return (offset / totalDays) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Timeline: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
      </div>

      {/* Timeline header */}
      <div className="relative h-8 bg-gray-50 border rounded">
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-gray-600">
          <span>{dateRange.start.toLocaleDateString()}</span>
          <span>{dateRange.end.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Product/Program Milestones */}
      {productProgramMilestones.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-blue-700">Product/Program Milestones</div>
          {productProgramMilestones.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="w-48 text-sm truncate" title={m.title}>{m.title}</div>
              <div className="flex-1 relative h-8 bg-gray-50 border rounded">
                <div
                  className="absolute top-1 h-6 w-2 bg-blue-500 rounded"
                  style={{ left: `${getTaskPosition(m.dueDate)}%` }}
                  title={`Due: ${new Date(m.dueDate).toLocaleDateString()}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transition Milestones */}
      {transitionMilestones.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="text-sm font-semibold text-green-700">Transition Milestones</div>
          {transitionMilestones.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="w-48 text-sm truncate" title={m.title}>{m.title}</div>
              <div className="flex-1 relative h-8 bg-gray-50 border rounded">
                <div
                  className="absolute top-1 h-6 w-2 bg-green-500 rounded"
                  style={{ left: `${getTaskPosition(m.dueDate)}%` }}
                  title={`Due: ${new Date(m.dueDate).toLocaleDateString()}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {allTasks.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="text-sm font-semibold text-gray-700">Tasks</div>
          {allTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <div className="w-48 text-sm truncate" title={t.title}>{t.title}</div>
              <div className="flex-1 relative h-8 bg-gray-50 border rounded">
                <div
                  className="absolute top-1 h-6 bg-purple-400 rounded"
                  style={{
                    left: `${Math.max(0, getTaskPosition(t.dueDate) - 5)}%`,
                    width: '10%'
                  }}
                  title={`Due: ${new Date(t.dueDate).toLocaleDateString()}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
