import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { enhancedTransitionApi, EnhancedTransition, API_BASE_URL, Task } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditTransitionDialog } from "@/components/EditTransitionDialog";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Building, 
  User, 
  FileText,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";

export function EnhancedTransitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transition, setTransition] = useState<EnhancedTransition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userRole = "director"; // TODO: Get from user context/auth

  // Milestones state
  type Milestone = {
    id: string;
    title: string;
    description?: string | null;
    dueDate: string;
    priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
    status: 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'BLOCKED'|'OVERDUE';
    transitionId: string;
  };
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [msOpen, setMsOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDue, setMsDue] = useState("");
  const [msPriority, setMsPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [msDesc, setMsDesc] = useState("");
  const [msSaving, setMsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<'PENDING'|'IN_PROGRESS'|'COMPLETED'|'BLOCKED'|'OVERDUE'>('PENDING');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [taskDesc, setTaskDesc] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskMilestoneId, setTaskMilestoneId] = useState<string>("");
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDue, setEditTaskDue] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<'NOT_STARTED'|'ASSIGNED'|'IN_PROGRESS'|'ON_HOLD'|'BLOCKED'|'UNDER_REVIEW'|'COMPLETED'|'CANCELLED'|'OVERDUE'>('NOT_STARTED');
  const [editTaskMilestoneId, setEditTaskMilestoneId] = useState<string>("");

  useEffect(() => {
    if (id) {
      fetchTransitionDetails();
      fetchMilestones();
      fetchTasks();
    }
  }, [id]);

  const fetchTransitionDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await enhancedTransitionApi.getById(id);
      setTransition(response);
    } catch (err) {
      console.error('Failed to fetch transition details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transition details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks?limit=100`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json(); setTasks(data.data || []);
    } catch (e) { console.error(e); }
  };

  const addTask = async () => {
    if (!id || !taskTitle || !taskDue) return;
    setTaskSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'program_manager', 'x-auth-bypass': localStorage.getItem('authBypass')==='true'?'true':'false' },
        body: JSON.stringify({ title: taskTitle, dueDate: new Date(`${taskDue}T12:00:00`).toISOString(), priority: taskPriority, description: taskDesc || undefined, parentTaskId: subtaskParentId || undefined, milestoneId: taskMilestoneId || undefined }),
      });
      if (!res.ok) { let m='Failed to create task'; try{const e=await res.json(); if(e?.message)m=e.message;}catch{} throw new Error(m);} 
      await fetchTasks(); setTaskTitle(""); setTaskDue(""); setTaskPriority('MEDIUM'); setTaskDesc(""); setTaskMilestoneId(""); setSubtaskParentId(null); setTaskOpen(false);
    } catch (e:any) { alert(e.message || 'Failed to create task'); } finally { setTaskSaving(false); }
  };

  const startEditTask = (t: Task) => {
    setEditingTaskId(t.id);
    setEditTaskTitle(t.title);
    setEditTaskDue(t.dueDate.split('T')[0]);
    setEditTaskPriority(t.priority);
    setEditTaskDesc(t.description || '');
    setEditTaskStatus(t.status);
    setEditTaskMilestoneId(t.milestoneId || '');
  };

  const cancelEditTask = () => { setEditingTaskId(null); setEditTaskTitle(""); setEditTaskDue(""); setEditTaskDesc(""); };

  const saveTask = async () => {
    if (!id || !editingTaskId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'program_manager', 'x-auth-bypass': localStorage.getItem('authBypass')==='true'?'true':'false' },
        body: JSON.stringify({ title: editTaskTitle, dueDate: new Date(`${editTaskDue}T12:00:00`).toISOString(), priority: editTaskPriority, description: editTaskDesc || undefined, status: editTaskStatus, milestoneId: editTaskMilestoneId === '' ? null : editTaskMilestoneId }),
      });
      if (!res.ok) { await fetchTasks(); cancelEditTask(); return; }
      try { const updated = await res.json(); if (updated && (updated as any).id) setTasks(prev=>prev.map(t=>t.id===updated.id?updated:t)); } catch {}
      fetchTasks().catch(()=>{}); cancelEditTask();
    } catch (e:any) { alert(e.message || 'Failed to update task'); }
  };

  const deleteTask = async (taskId: string) => {
    if (!id) return; if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks/${taskId}`, { method: 'DELETE', headers: { 'x-user-role': 'program_manager', 'x-auth-bypass': localStorage.getItem('authBypass')==='true'?'true':'false' } });
      if (!res.ok) { await fetchTasks(); return; }
      setTasks(prev=>prev.filter(t=>t.id!==taskId)); fetchTasks().catch(()=>{});
    } catch (e:any) { alert(e.message || 'Failed to delete task'); }
  };

  const handleTransitionUpdated = (updatedTransition: EnhancedTransition) => {
    setTransition(updatedTransition);
    // Optionally refresh the data
    fetchTransitionDetails();
  };

  const fetchMilestones = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones?limit=100`);
      if (!res.ok) throw new Error('Failed to load milestones');
      const data = await res.json();
      setMilestones(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addMilestone = async () => {
    if (!id || !msTitle || !msDue) return;
    setMsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          title: msTitle,
          dueDate: new Date(`${msDue}T12:00:00`).toISOString(),
          priority: msPriority,
          description: msDesc || undefined,
        }),
      });
      if (!res.ok) {
        let message = 'Failed to add milestone';
        try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
        throw new Error(message);
      }
      try {
        const created = await res.json();
        if (created && created.id) setMilestones(prev => [created, ...prev]);
      } catch {
        // Ignore non-JSON success bodies
      }
      fetchMilestones().catch(()=>{});
      setMsTitle(""); setMsDue(""); setMsPriority('MEDIUM'); setMsDesc(""); setMsOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add milestone');
    } finally {
      setMsSaving(false);
    }
  };

  const startEdit = (m: Milestone) => {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDue(m.dueDate.split('T')[0]);
    setEditPriority(m.priority);
    setEditDesc(m.description || '');
    setEditStatus(m.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDue("");
    setEditDesc("");
  };

  const saveMilestone = async () => {
    if (!id || !editingId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          title: editTitle,
          dueDate: new Date(`${editDue}T12:00:00`).toISOString(),
          priority: editPriority,
          description: editDesc || undefined,
          status: editStatus,
        }),
      });
      if (!res.ok) { await fetchMilestones(); cancelEdit(); return; }
      try { const updated = await res.json(); if (updated && (updated as any).id) setMilestones(prev=>prev.map(m=>m.id===updated.id?updated:m)); } catch {}
      fetchMilestones().catch(()=>{}); cancelEdit();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update milestone');
    }
  };

  const deleteMilestone = async (mid: string) => {
    if (!id) return;
    if (!confirm('Delete this milestone?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones/${mid}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
      });
      if (!res.ok) { await fetchMilestones(); return; }
      setMilestones(prev=>prev.filter(m=>m.id!==mid)); fetchMilestones().catch(()=>{});
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete milestone');
    }
  };

  const getStatusColor = (status: EnhancedTransition['status']) => {
    const colors = {
      'NOT_STARTED': 'bg-gray-100 text-gray-800',
      'ON_TRACK': 'bg-green-100 text-green-800',
      'AT_RISK': 'bg-yellow-100 text-yellow-800',
      'BLOCKED': 'bg-red-100 text-red-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: EnhancedTransition['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'BLOCKED':
      case 'AT_RISK':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-muted-foreground">Loading transition details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/transitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transitions
            </Button>
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!transition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/transitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transitions
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Transition not found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/transitions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transitions
          </Button>
        </Link>
        
        {transition && (
          <EditTransitionDialog
            transition={transition}
            onTransitionUpdated={handleTransitionUpdated}
            userRole={userRole}
          />
        )}
      </div>

      <div className="grid gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {transition.name || 'Unnamed Transition'}
                </CardTitle>
                {transition.description && (
                  <p className="text-muted-foreground">{transition.description}</p>
                )}
              </div>
              <Badge className={`${getStatusColor(transition.status)} flex items-center gap-1`}>
                {getStatusIcon(transition.status)}
                {transition.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contract & Business Operation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Contract & Business Operation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transition.contract && (
                <>
                  <div>
                    <div className="text-sm font-medium">Contract</div>
                    <Link
                      to={`/contracts/${transition.contract.id}`}
                      className="text-primary hover:underline"
                    >
                      {transition.contract.contractName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {transition.contract.contractNumber}
                    </div>
                  </div>
                  {transition.contract.businessOperation && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-medium">Business Operation</div>
                        <Link
                          to={`/business-operations/${transition.contract.businessOperation.id}`}
                          className="text-primary hover:underline"
                        >
                          {transition.contract.businessOperation.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {transition.contract.businessOperation.businessFunction}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Start Date</div>
                <div className="text-muted-foreground">
                  {new Date(transition.startDate).toLocaleDateString()}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium">End Date</div>
                <div className="text-muted-foreground">
                  {new Date(transition.endDate).toLocaleDateString()}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div className="text-muted-foreground">
                  {transition.duration.replace('_', ' ').toLowerCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Personnel & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personnel & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transition.keyPersonnel && (
                <div>
                  <div className="text-sm font-medium">Key Personnel</div>
                  <div className="text-muted-foreground">{transition.keyPersonnel}</div>
                </div>
              )}
              {transition.keyPersonnel && <Separator />}
              <div>
                <div className="text-sm font-medium">Requires Continuous Service</div>
                <div className="text-muted-foreground">
                  {transition.requiresContinuousService ? 'Yes' : 'No'}
                </div>
              </div>
              {transition.creator && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium">Created By</div>
                    <div className="text-muted-foreground">
                      {transition.creator.person?.firstName} {transition.creator.person?.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transition.creator.person?.primaryEmail}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Milestones
                {transition._count?.milestones && (
                  <Badge variant="secondary">{transition._count.milestones}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transition.milestones && transition.milestones.length > 0 ? (
                <div className="space-y-2">
                  {transition.milestones.map((milestone, index) => (
                    <div key={milestone.id || index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{milestone.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No milestones defined for this transition.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Milestones CRUD */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Milestones</CardTitle>
              <Button data-testid="milestones-add-btn" variant="outline" onClick={() => setMsOpen(true)}>Add Milestone</Button>
            </div>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <div className="text-sm text-muted-foreground">No milestones yet.</div>
            ) : (
              <div className="border rounded-md divide-y">
                {milestones.map(m => (
                  <div key={m.id} className="p-3">
                    {editingId === m.id ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                          <input data-testid="milestone-edit-title" className="border rounded-md p-2" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
                          <input data-testid="milestone-edit-date" className="border rounded-md p-2" type="date" value={editDue} onChange={e=>setEditDue(e.target.value)} />
                          <div className="flex justify-end gap-2">
                            <Button data-testid="milestone-cancel-edit" variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                            <Button data-testid="milestone-save-edit" size="sm" onClick={saveMilestone}>Save</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                          <div>
                            <div className="text-xs font-medium mb-1">Priority</div>
                            <select data-testid="milestone-edit-priority" className="border rounded-md p-2 w-full" value={editPriority} onChange={e=>setEditPriority(e.target.value as any)}>
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1">Status</div>
                            <select data-testid="milestone-edit-status" className="border rounded-md p-2 w-full" value={editStatus} onChange={e=>setEditStatus(e.target.value as any)}>
                              <option value="PENDING">Not Started</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="BLOCKED">Blocked</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="OVERDUE">Overdue</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1">Description</div>
                            <textarea data-testid="milestone-edit-desc" className="border rounded-md p-2 w-full" rows={2} value={editDesc} onChange={e=>setEditDesc(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.title}</div>
                          <div className="text-xs text-muted-foreground">Due {new Date(m.dueDate).toLocaleDateString()} • {m.status} • Priority {m.priority}</div>
                          {m.description && (
                            <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button data-testid="edit-milestone-btn" variant="outline" size="sm" onClick={() => startEdit(m)}>Edit</Button>
                          <Button data-testid="delete-milestone-btn" variant="outline" size="sm" onClick={() => deleteMilestone(m.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks CRUD */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <Button data-testid="tasks-add-btn" variant="outline" onClick={() => setTaskOpen(true)}>Add Task</Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks yet.</div>
            ) : (
              <div className="border rounded-md divide-y">
                {tasks.map(t => (
                  <div key={t.id} className="p-3">
                    {editingTaskId === t.id ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                          <input data-testid="edit-task-title" className="border rounded-md p-2" value={editTaskTitle} onChange={e=>setEditTaskTitle(e.target.value)} />
                          <input data-testid="edit-task-date" className="border rounded-md p-2" type="date" value={editTaskDue} onChange={e=>setEditTaskDue(e.target.value)} />
                          <div className="flex justify-end gap-2">
                            <Button data-testid="cancel-task-btn" variant="outline" size="sm" onClick={cancelEditTask}>Cancel</Button>
                            <Button data-testid="save-task-btn" size="sm" onClick={saveTask}>Save</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                          <div>
                            <div className="text-xs font-medium mb-1">Priority</div>
                            <select data-testid="edit-task-priority" className="border rounded-md p-2 w-full" value={editTaskPriority} onChange={e=>setEditTaskPriority(e.target.value as any)}>
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1">Status</div>
                            <select data-testid="edit-task-status" className="border rounded-md p-2 w-full" value={editTaskStatus} onChange={e=>setEditTaskStatus(e.target.value as any)}>
                              <option value="NOT_STARTED">Not Started</option>
                              <option value="ASSIGNED">Assigned</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="ON_HOLD">On Hold</option>
                              <option value="BLOCKED">Blocked</option>
                              <option value="UNDER_REVIEW">Under Review</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="OVERDUE">Overdue</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1">Milestone</div>
                            <select className="border rounded-md p-2 w-full" value={editTaskMilestoneId} onChange={e=>setEditTaskMilestoneId(e.target.value)}>
                              <option value="">Unassigned</option>
                              {milestones.map(m => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1">Description</div>
                            <textarea data-testid="edit-task-desc" className="border rounded-md p-2 w-full" rows={2} value={editTaskDesc} onChange={e=>setEditTaskDesc(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{t.title}</div>
                          <div className="text-xs text-muted-foreground">Due {new Date(t.dueDate).toLocaleDateString()} • {t.status} • Priority {t.priority}</div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button data-testid="edit-task-btn" variant="outline" size="sm" onClick={() => startEditTask(t)}>Edit</Button>
                          <Button data-testid="add-subtask-btn" variant="outline" size="sm" onClick={() => { setSubtaskParentId(t.id); setTaskOpen(true); }}>Add Subtask</Button>
                          <Button data-testid="delete-task-btn" variant="outline" size="sm" onClick={() => deleteTask(t.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Created</div>
                <div className="text-muted-foreground">
                  {new Date(transition.createdAt).toLocaleDateString()} at{' '}
                  {new Date(transition.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div className="text-muted-foreground">
                  {new Date(transition.updatedAt).toLocaleDateString()} at{' '}
                  {new Date(transition.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    {/* Simple Add Milestone Dialog (portal-like) */}
    {msOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-md p-4 w-full max-w-lg">
          <div className="text-lg font-semibold mb-2">Add Milestone</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs font-medium mb-1">Title</div>
              <input data-testid="milestone-title" className="border rounded-md p-2 w-full" value={msTitle} onChange={e=>setMsTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Due Date</div>
              <input data-testid="milestone-date" className="border rounded-md p-2 w-full" type="date" value={msDue} onChange={e=>setMsDue(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Priority</div>
              <select className="border rounded-md p-2 w-full" value={msPriority} onChange={e=>setMsPriority(e.target.value as any)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Milestone</div>
              <select className="border rounded-md p-2 w-full" value={taskMilestoneId} onChange={e=>setTaskMilestoneId(e.target.value)}>
                <option value="">Unassigned</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-medium mb-1">Description</div>
              <textarea data-testid="milestone-desc" className="border rounded-md p-2 w-full" rows={3} value={msDesc} onChange={e=>setMsDesc(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button data-testid="milestone-cancel" variant="outline" onClick={()=>setMsOpen(false)}>Cancel</Button>
            <Button data-testid="milestone-create" onClick={addMilestone} disabled={msSaving || !msTitle || !msDue}>{msSaving ? 'Adding...' : 'Create Milestone'}</Button>
          </div>
        </div>
      </div>
    )}

    {/* Simple Add Task Dialog (portal-like) */}
    {taskOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-md p-4 w-full max-w-lg">
          <div className="text-lg font-semibold mb-2">{subtaskParentId ? 'Add Subtask' : 'Add Task'}</div>
          {subtaskParentId && (
            <div className="text-xs text-muted-foreground mb-2">This task will be created as a subtask of the selected task.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs font-medium mb-1">Title</div>
              <input data-testid="task-title" className="border rounded-md p-2 w-full" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Due Date</div>
              <input data-testid="task-date" className="border rounded-md p-2 w-full" type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Priority</div>
              <select data-testid="task-priority" className="border rounded-md p-2 w-full" value={taskPriority} onChange={e=>setTaskPriority(e.target.value as any)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Milestone</div>
              <select data-testid="task-milestone" className="border rounded-md p-2 w-full" value={taskMilestoneId} onChange={e=>setTaskMilestoneId(e.target.value)}>
                <option value="">Unassigned</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-medium mb-1">Description</div>
              <textarea data-testid="task-desc" className="border rounded-md p-2 w-full" rows={3} value={taskDesc} onChange={e=>setTaskDesc(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button data-testid="task-cancel" variant="outline" onClick={()=>{ setTaskOpen(false); setSubtaskParentId(null); }}>Cancel</Button>
            <Button data-testid="task-create" onClick={addTask} disabled={taskSaving || !taskTitle || !taskDue}>{taskSaving ? 'Adding...' : 'Create Task'}</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
