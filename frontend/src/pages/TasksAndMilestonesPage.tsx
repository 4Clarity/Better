import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { API_BASE_URL, Task, taskApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TransitionLite = { id: string; contractName?: string; contractNumber?: string; startDate: string; endDate: string };
type MilestoneLite = { id: string; title: string };

function Sequence({ seq }: { seq?: string }) {
  return <span className="text-xs text-muted-foreground mr-2">{seq}</span>;
}

export function TasksAndMilestonesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transitions, setTransitions] = useState<TransitionLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(id || null);
  const [milestones, setMilestones] = useState<MilestoneLite[]>([]);
  const [tree, setTree] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  // Add Task dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDue, setAddDue] = useState('');
  const [addPriority, setAddPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [addDesc, setAddDesc] = useState('');
  const [addParentId, setAddParentId] = useState<string|undefined>();
  const [addMilestoneId, setAddMilestoneId] = useState<string|undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load transitions for selector if no id bound
    fetch(`${API_BASE_URL}/transitions?limit=100`)
      .then(r=>r.json()).then(d=>setTransitions(d?.data || []))
      .catch(()=>{});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true); setError(undefined);
    Promise.all([
      fetch(`${API_BASE_URL}/transitions/${selectedId}/milestones?limit=200`).then(r=>r.json()).catch(()=>({data:[]})),
      taskApi.getTree(selectedId).catch((e)=>{ setError(e.message); return { data: [] as Task[]}; })
    ]).then(([ms, tr]) => {
      setMilestones(ms?.data || []);
      setTree(tr?.data || []);
    }).finally(()=> setLoading(false));
  }, [selectedId]);

  const milestoneMap = useMemo(() => {
    const m = new Map<string, MilestoneLite>();
    milestones.forEach(x => m.set(x.id, x));
    return m;
  }, [milestones]);

  const refreshTree = async () => {
    if (!selectedId) return;
    const tr = await taskApi.getTree(selectedId);
    setTree(tr.data || []);
  };

  const moveUp = async (parentId: string|null, index: number, node: Task) => {
    if (!selectedId || index <= 0) return;
    const siblingBefore = (parentId ? treeFlat().filter(t=>t.parentTaskId===parentId) : treeFlat().filter(t=>!t.parentTaskId))[index-1];
    await taskApi.move(selectedId, node.id, { beforeTaskId: siblingBefore?.id, parentTaskId: parentId });
    await refreshTree();
  };
  const moveDown = async (parentId: string|null, index: number, node: Task) => {
    if (!selectedId) return;
    const siblings = parentId ? treeFlat().filter(t=>t.parentTaskId===parentId) : treeFlat().filter(t=>!t.parentTaskId);
    const siblingAfter = siblings[index+1];
    if (!siblingAfter) return;
    await taskApi.move(selectedId, node.id, { afterTaskId: siblingAfter.id, parentTaskId: parentId });
    await refreshTree();
  };
  const indent = async (parentId: string|null, index: number, node: Task, siblings: Task[]) => {
    if (!selectedId || index <= 0) return;
    const newParent = siblings[index-1];
    await taskApi.move(selectedId, node.id, { parentTaskId: newParent.id, position: 0 });
    await refreshTree();
  };
  const outdent = async (node: Task) => {
    if (!selectedId || !node.parentTaskId) return;
    // Move to be a sibling after its current parent in the grandparent group
    const parent = findNode(tree, node.parentTaskId);
    if (!parent) return;
    const grandParentId = parent.parentTaskId ?? null;
    await taskApi.move(selectedId, node.id, { parentTaskId: grandParentId, afterTaskId: parent.id });
    await refreshTree();
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

  const openAddFor = (parent?: Task, milestone?: MilestoneLite) => {
    setAddParentId(parent?.id);
    setAddMilestoneId(milestone?.id);
    setAddTitle(''); setAddDue(''); setAddPriority('MEDIUM'); setAddDesc('');
    setAddOpen(true);
  };

  const createTask = async () => {
    if (!selectedId || !addTitle || !addDue) return;
    setSaving(true);
    try {
      const payload: any = {
        title: addTitle,
        dueDate: new Date(`${addDue}T12:00:00`).toISOString(),
        priority: addPriority,
        status: 'NOT_STARTED',
        description: addDesc || undefined,
      };
      if (addMilestoneId) payload.milestoneId = addMilestoneId;
      if (addParentId) payload.parentTaskId = addParentId;
      await taskApi.create(selectedId, payload);
      setAddOpen(false);
      await refreshTree();
    } catch (e:any) {
      alert(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Tasks & Milestones Planning</div>
        <div className="flex items-center gap-2">
          <select className="border rounded-md p-2" value={selectedId ?? ''} onChange={(e)=>{
            const v = e.target.value; setSelectedId(v || null); if (v) navigate(`/transitions/${v}/tasks-milestones`);
          }}>
            <option value="">Select Transition…</option>
            {transitions.map(t => (
              <option key={t.id} value={t.id}>{t.contractName || 'Transition'} ({t.contractNumber || t.id.slice(0,6)})</option>
            ))}
          </select>
          <Link to="/transitions">
            <Button variant="outline" size="sm">Back to Transitions</Button>
          </Link>
        </div>
      </div>

      {!selectedId ? (
        <div className="text-sm text-muted-foreground">Select a Transition to plan Tasks & Milestones.</div>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">Loading planning data…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Unassigned tasks (roots without milestone) */}
          <div className="bg-white border rounded-md">
            <div className="p-3 flex items-center justify-between border-b"><div className="font-medium">Unassigned Tasks</div><Button data-testid="planning-add-root-task-btn" variant="outline" size="sm" onClick={()=>openAddFor(undefined, undefined)}>Add Task</Button></div>
            <div className="p-2">
              <TaskList nodes={tree.filter(t=>!t.milestoneId)} onMoveUp={moveUp} onMoveDown={moveDown} onIndent={indent} onOutdent={outdent} onAddSubtask={(n)=>openAddFor(n, undefined)} />
            </div>
          </div>

          {/* Milestone groups */}
          {milestones.map(m => (
            <div key={m.id} className="bg-white border rounded-md">
              <div className="p-3 flex items-center justify-between border-b"><div className="font-medium">Milestone: {m.title}</div><Button data-testid="planning-add-milestone-task-btn" variant="outline" size="sm" onClick={()=>openAddFor(undefined, m)}>Add Task</Button></div>
              <div className="p-2">
                <TaskList nodes={tree.filter(t=>t.milestoneId===m.id)} onMoveUp={moveUp} onMoveDown={moveDown} onIndent={indent} onOutdent={outdent} onAddSubtask={(n)=>openAddFor(n, m)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-md p-4 w-full max-w-lg">
            <div className="text-lg font-semibold mb-2">Add Task</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Title</Label>
                <Input data-testid="task-title" value={addTitle} onChange={(e)=>setAddTitle(e.target.value)} placeholder="Task title" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input data-testid="task-date" type="date" value={addDue} onChange={(e)=>setAddDue(e.target.value)} />
              </div>
              <div>
                <Label>Priority</Label>
                <select data-testid="task-priority" className="border rounded-md p-2 w-full" value={addPriority} onChange={(e)=>setAddPriority(e.target.value as any)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <Label>Milestone</Label>
                <select data-testid="task-milestone" className="border rounded-md p-2 w-full" value={addMilestoneId || ''} onChange={(e)=>setAddMilestoneId(e.target.value || undefined)}>
                  <option value="">Unassigned</option>
                  {milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea className="w-full border rounded-md p-2" rows={3} value={addDesc} onChange={(e)=>setAddDesc(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={saving || !addTitle || !addDue}>{saving ? 'Adding...' : 'Create Task'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskList({ nodes, onMoveUp, onMoveDown, onIndent, onOutdent, onAddSubtask }: {
  nodes: Task[];
  onMoveUp: (parentId: string|null, index: number, node: Task) => void | Promise<void>;
  onMoveDown: (parentId: string|null, index: number, node: Task) => void | Promise<void>;
  onIndent: (parentId: string|null, index: number, node: Task, siblings: Task[]) => void | Promise<void>;
  onOutdent: (node: Task) => void | Promise<void>;
  onAddSubtask: (node: Task) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((n, idx) => (
        <div key={n.id} className="border rounded-md p-2">
          <div className="flex items-center justify-between">
            <div>
              <Sequence seq={n.sequence} />
              <span className="font-medium mr-2">{n.title}</span>
              <span className="text-xs text-muted-foreground">Due {new Date(n.dueDate).toLocaleDateString()} • {n.status} • {n.priority}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button data-testid="up-btn" variant="outline" size="sm" onClick={()=>onMoveUp(n.parentTaskId ?? null, idx, n)}>Up</Button>
              <Button data-testid="down-btn" variant="outline" size="sm" onClick={()=>onMoveDown(n.parentTaskId ?? null, idx, n)}>Down</Button>
              <Button data-testid="indent-btn" variant="outline" size="sm" onClick={()=>onIndent(n.parentTaskId ?? null, idx, n, nodes)}>Indent</Button>
              <Button data-testid="outdent-btn" variant="outline" size="sm" onClick={()=>onOutdent(n)}>Outdent</Button>
              <Button data-testid="add-subtask-btn" variant="outline" size="sm" onClick={()=>onAddSubtask(n)}>Add Subtask</Button>
            </div>
          </div>
          {n.children && n.children.length > 0 && (
            <div className="ml-4 mt-2">
              <TaskList nodes={n.children} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onIndent={onIndent} onOutdent={onOutdent} onAddSubtask={onAddSubtask} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
