import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { enhancedTransitionApi, EnhancedTransition, API_BASE_URL, Task } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { EditTransitionDialog } from "@/components/EditTransitionDialog";
import { ProductProgramCategorization } from "@/components/transitions/ProductProgramCategorization";
import { TaskMilestoneManagement } from "@/components/transitions/TaskMilestoneManagement";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  Edit
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

  useEffect(() => {
    if (id) {
      fetchTransitionDetails();
      fetchMilestones();
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
      // Convert priority from UPPERCASE to PascalCase for backend
      const priorityMap: Record<string, string> = {
        'LOW': 'Low',
        'MEDIUM': 'Medium',
        'HIGH': 'High',
        'CRITICAL': 'Critical'
      };
      const backendPriority = priorityMap[msPriority] || msPriority;

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
          priority: backendPriority,
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
    // Normalize priority to uppercase format
    const normalizedPriority = m.priority?.toString().toUpperCase() as 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
    setEditPriority(normalizedPriority || 'MEDIUM');
    setEditDesc(m.description || '');
    // Normalize status to uppercase format
    const normalizedStatus = m.status?.toString().toUpperCase() as 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'BLOCKED'|'OVERDUE';
    setEditStatus(normalizedStatus || 'PENDING');
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
      // Convert priority from UPPERCASE to PascalCase for backend
      const priorityMap: Record<string, string> = {
        'LOW': 'Low',
        'MEDIUM': 'Medium',
        'HIGH': 'High',
        'CRITICAL': 'Critical'
      };
      const backendPriority = priorityMap[editPriority] || editPriority;

      // Convert status from UPPERCASE to Snake_Case for backend
      const statusMap: Record<string, string> = {
        'PENDING': 'Pending',
        'IN_PROGRESS': 'In_Progress',
        'COMPLETED': 'Completed',
        'BLOCKED': 'Blocked',
        'OVERDUE': 'Overdue'
      };
      const backendStatus = statusMap[editStatus] || editStatus;

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
          priority: backendPriority,
          description: editDesc || undefined,
          status: backendStatus,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to update milestone:', errorData);
        await fetchMilestones();
        cancelEdit();
        return;
      }
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
          {/* Contract & Business Operation - Only show if contract exists */}
          {transition.contract && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Contract & Business Operation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

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
                  {(() => {
                    const start = new Date(transition.startDate);
                    const end = new Date(transition.endDate);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product/Program Categorization (Story 4.2 - Phase 2) */}
          <ProductProgramCategorization
            transitionId={transition.id}
            currentProductProgramId={transition.productProgramId}
            currentProductProgram={transition.product_programs}
            onUpdate={fetchTransitionDetails}
          />
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
              {transition.requiresContinuousService !== undefined && (
                <div>
                  <div className="text-sm font-medium">Requires Continuous Service</div>
                  <div className="text-muted-foreground">
                    {transition.requiresContinuousService ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Milestones
                  {milestones.length > 0 && (
                    <Badge variant="secondary">{milestones.length}</Badge>
                  )}
                </CardTitle>
                <Button data-testid="milestones-add-btn" variant="outline" size="sm" onClick={() => setMsOpen(true)}>
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <TooltipProvider>
                  <div className="space-y-2">
                    {milestones.map((milestone) => (
                      <Tooltip key={milestone.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{milestone.title}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm">
                          <div className="space-y-3">
                            <div>
                              <div className="font-semibold">{milestone.title}</div>
                            </div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-medium">Due:</span> {new Date(milestone.dueDate).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span> {milestone.status}
                              </div>
                              <div>
                                <span className="font-medium">Priority:</span> {milestone.priority}
                              </div>
                              {milestone.description && (
                                <div>
                                  <span className="font-medium">Description:</span> {milestone.description}
                                </div>
                              )}
                            </div>
                            <div className="pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  startEdit(milestone);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit Milestone
                              </Button>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No milestones defined for this transition.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks & Milestones Management */}
        {transition && id && (
          <TaskMilestoneManagement transitionId={id} />
        )}

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

    {/* Edit Milestone Dialog */}
    {editingId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-md p-4 w-full max-w-lg">
          <div className="text-lg font-semibold mb-2">Edit Milestone</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs font-medium mb-1">Title</div>
              <input data-testid="milestone-edit-title" className="border rounded-md p-2 w-full" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Due Date</div>
              <input data-testid="milestone-edit-date" className="border rounded-md p-2 w-full" type="date" value={editDue} onChange={e=>setEditDue(e.target.value)} />
            </div>
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
            <div className="md:col-span-2">
              <div className="text-xs font-medium mb-1">Description</div>
              <textarea data-testid="milestone-edit-desc" className="border rounded-md p-2 w-full" rows={3} value={editDesc} onChange={e=>setEditDesc(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button data-testid="milestone-cancel-edit" variant="outline" onClick={cancelEdit}>Cancel</Button>
            <Button data-testid="milestone-save-edit" onClick={saveMilestone} disabled={!editTitle || !editDue}>Save Changes</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
