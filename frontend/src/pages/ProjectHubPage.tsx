import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, Task } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Calendar, FileText, User, Edit2, Save, X } from "lucide-react";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";

interface Transition {
  id: string;
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE';
}

interface EditFormData {
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  keyPersonnel: string;
  description: string;
}

interface FormErrors {
  contractName?: string;
  contractNumber?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export function ProjectHubPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transition, setTransition] = useState<Transition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    contractName: "",
    contractNumber: "",
    startDate: "",
    endDate: "",
    keyPersonnel: "",
    description: "",
  });
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [msTitle, setMsTitle] = useState('');
  const [msDue, setMsDue] = useState('');
  const [msSaving, setMsSaving] = useState(false);
  const [msDialogOpen, setMsDialogOpen] = useState(false);
  const [msPriority, setMsPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [msDesc, setMsDesc] = useState('');

  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMsTitle, setEditMsTitle] = useState('');
  const [editMsDue, setEditMsDue] = useState('');
  const [editMsPriority, setEditMsPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [editMsDesc, setEditMsDesc] = useState('');
  const [editMsStatus, setEditMsStatus] = useState<'PENDING'|'IN_PROGRESS'|'COMPLETED'|'BLOCKED'|'OVERDUE'>('PENDING');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskMilestoneId, setTaskMilestoneId] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDue, setEditTaskDue] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'>('MEDIUM');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<'NOT_STARTED'|'ASSIGNED'|'IN_PROGRESS'|'ON_HOLD'|'BLOCKED'|'UNDER_REVIEW'|'COMPLETED'|'CANCELLED'|'OVERDUE'>('NOT_STARTED');
  const [editTaskMilestoneId, setEditTaskMilestoneId] = useState<string>('');

  const fetchTransition = async () => {
    if (!id) {
      setError("Transition ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/transitions/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Transition not found");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTransition(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transition');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransition();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMilestones();
      fetchTasks();
    }
  }, [id]);

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

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks?limit=100`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addTask = async () => {
    if (!id || !taskTitle || !taskDue) return;
    setTaskSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          title: taskTitle,
          dueDate: new Date(`${taskDue}T12:00:00`).toISOString(),
          priority: taskPriority,
          description: taskDesc || undefined,
          milestoneId: taskMilestoneId || undefined,
        }),
      });
      if (!res.ok) {
        let message = 'Failed to create task';
        try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
        throw new Error(message);
      }
      await fetchTasks();
      setTaskTitle(''); setTaskDue(''); setTaskPriority('MEDIUM'); setTaskDesc(''); setTaskMilestoneId(''); setTaskOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setTaskSaving(false);
    }
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

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskTitle(''); setEditTaskDue(''); setEditTaskDesc('');
  };

  const saveTask = async () => {
    if (!id || !editingTaskId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          title: editTaskTitle,
          dueDate: new Date(`${editTaskDue}T12:00:00`).toISOString(),
          priority: editTaskPriority,
          description: editTaskDesc || undefined,
          status: editTaskStatus,
          milestoneId: editTaskMilestoneId === '' ? null : editTaskMilestoneId,
        }),
      });
      if (!res.ok) {
        let message = 'Failed to update task';
        try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
        throw new Error(message);
      }
      await fetchTasks();
      cancelEditTask();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!id) return;
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
      });
      if (!res.ok) {
        let message = 'Failed to delete task';
        try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
        throw new Error(message);
      }
      await fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task');
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
          // Set time to midday to avoid timezone boundary issues
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
      let created: any = null;
      try {
        created = await res.json();
      } catch {
        // Some proxies may return 201 without a JSON body; fall back to refresh
      }
      if (created && created.id) {
        setMilestones(prev => [created, ...prev]);
      }
      // Best-effort refresh in background to sync counts
      fetchMilestones().catch(() => {});
      setMsTitle('');
      setMsDue('');
      setMsPriority('MEDIUM');
      setMsDesc('');
      setMsDialogOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add milestone');
    } finally {
      setMsSaving(false);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!id) return;
    if (!confirm('Delete this milestone?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: { 
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
      });
      if (!res.ok) {
        await fetchMilestones();
        return;
      }
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      fetchMilestones().catch(()=>{});
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete milestone');
    }
  };

  const startEditMilestone = (m: Milestone) => {
    setEditingMilestoneId(m.id);
    setEditMsTitle(m.title);
    setEditMsDue(m.dueDate.split('T')[0]);
    setEditMsPriority(m.priority);
    setEditMsDesc(m.description || '');
    setEditMsStatus(m.status);
  };

  const cancelEditMilestone = () => {
    setEditingMilestoneId(null);
    setEditMsTitle('');
    setEditMsDue('');
  };

  const saveMilestone = async () => {
    if (!id || !editingMilestoneId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transitions/${id}/milestones/${editingMilestoneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          title: editMsTitle,
          dueDate: new Date(`${editMsDue}T12:00:00`).toISOString(),
          priority: editMsPriority,
          description: editMsDesc || undefined,
          status: editMsStatus,
        }),
      });
      if (!res.ok) {
        await fetchMilestones();
        cancelEditMilestone();
        return;
      }
      try {
        const updated = await res.json();
        if (updated && updated.id) setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m));
      } catch {}
      fetchMilestones().catch(()=>{});
      cancelEditMilestone();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update milestone');
    }
  };

  // Initialize edit form when transition loads
  useEffect(() => {
    if (transition) {
      setEditFormData({
        contractName: transition.contractName,
        contractNumber: transition.contractNumber,
        startDate: transition.startDate.split('T')[0], // Convert to YYYY-MM-DD format
        endDate: transition.endDate.split('T')[0],
        keyPersonnel: "",
        description: "",
      });
    }
  }, [transition]);

  // Edit mode functions
  const handleEditClick = () => {
    setIsEditing(true);
    setEditErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditErrors({});
    // Reset form data to original values
    if (transition) {
      setEditFormData({
        contractName: transition.contractName,
        contractNumber: transition.contractNumber,
        startDate: transition.startDate.split('T')[0],
        endDate: transition.endDate.split('T')[0],
        keyPersonnel: "",
        description: "",
      });
    }
  };

  const validateEditForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!editFormData.contractName.trim()) {
      newErrors.contractName = "Contract name is required";
    }

    if (!editFormData.contractNumber.trim()) {
      newErrors.contractNumber = "Contract number is required";
    }

    if (!editFormData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!editFormData.endDate) {
      newErrors.endDate = "End date is required";
    }

    // Validate date logic
    if (editFormData.startDate && editFormData.endDate) {
      const startDate = new Date(editFormData.startDate);
      const endDate = new Date(editFormData.endDate);
      
      if (endDate <= startDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasSignificantChanges = (): boolean => {
    if (!transition) return false;
    
    return (
      editFormData.contractNumber !== transition.contractNumber ||
      editFormData.startDate !== transition.startDate.split('T')[0] ||
      editFormData.endDate !== transition.endDate.split('T')[0]
    );
  };

  const handleSaveClick = () => {
    if (!validateEditForm()) {
      return;
    }

    // Check if there are significant changes that require confirmation
    if (hasSignificantChanges()) {
      setShowConfirmation(true);
    } else {
      handleSaveTransition();
    }
  };

  const handleSaveTransition = async () => {
    if (!transition || !id) return;

    setIsSaving(true);
    try {
      const updateData = {
        contractName: editFormData.contractName,
        contractNumber: editFormData.contractNumber,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/transitions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update transition');
      }

      const updatedTransition = await response.json();
      setTransition(updatedTransition);
      setIsEditing(false);
      setShowConfirmation(false);
      setEditErrors({});
      
      // Show success message (in a real app, you'd use a toast notification)
      alert('Transition updated successfully!');
      
    } catch (error) {
      console.error('Failed to update transition:', error);
      alert('Failed to update transition: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Status change handler (User Story 1.3.1)
  const handleStatusChange = async (newStatus: string) => {
    if (!transition || !id || newStatus === transition.status) return;
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/transitions/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-role': 'program_manager',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update status');
      }
      const updated = await response.json();
      setTransition(updated);
      alert('Status updated');
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditInputChange = (field: keyof EditFormData, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return 'bg-green-100 text-green-800';
      case 'AT_RISK':
        return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate project duration
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      return `${years} year${years > 1 ? 's' : ''} ${remainingDays > 0 ? `${remainingDays} days` : ''}`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      return `${months} month${months > 1 ? 's' : ''} ${remainingDays > 0 ? `${remainingDays} days` : ''}`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link 
                to="/" 
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-500">Project Details</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link 
                to="/" 
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-500">Project Details</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="text-lg font-semibold mb-2">Error Loading Project</h2>
            <p>{error}</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button 
            onClick={fetchTransition}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!transition) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <p className="text-gray-600">Transition not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto p-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link 
              to="/" 
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-sm font-medium text-gray-500">
                {transition.contractName}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {transition.contractName}
          </h1>
          <p className="text-gray-600 mt-2">
            Contract #{transition.contractNumber}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 mb-4">
            {!isEditing ? (
              <Button onClick={handleEditClick} variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleCancelEdit} 
                  variant="outline"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveClick}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
          <span 
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transition.status)}`}
          >
            {formatStatus(transition.status)}
          </span>
        </div>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Project Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contractName" className="text-sm font-medium text-gray-500">Contract Name</Label>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    id="contractName"
                    value={editFormData.contractName}
                    onChange={(e) => handleEditInputChange('contractName', e.target.value)}
                    placeholder="Enter contract name"
                    className={editErrors.contractName ? 'border-red-500' : ''}
                  />
                  {editErrors.contractName && (
                    <p className="text-sm text-red-500 mt-1">{editErrors.contractName}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900 font-medium mt-1">{transition.contractName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contractNumber" className="text-sm font-medium text-gray-500">Contract Number</Label>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    id="contractNumber"
                    value={editFormData.contractNumber}
                    onChange={(e) => handleEditInputChange('contractNumber', e.target.value)}
                    placeholder="e.g., CNT-2024-001"
                    className={editErrors.contractNumber ? 'border-red-500' : ''}
                  />
                  {editErrors.contractNumber && (
                    <p className="text-sm text-red-500 mt-1">{editErrors.contractNumber}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900 font-medium mt-1">{transition.contractNumber}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Status</label>
              <p className="text-gray-900 font-medium">{formatStatus(transition.status)}</p>
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-500">Description</Label>
              {isEditing ? (
                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    📝 Description editing will be available after database migration is complete.
                  </p>
                </div>
              ) : (
                <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                  <p className="text-sm text-gray-500 italic">
                    Description field will be available in the next version after database migration.
                  </p>
                </div>
              )}
            </div>
            {/* Key Personnel temporarily disabled due to database schema mismatch */}
            {false && (
              <>
                <div>
                  <Label htmlFor="keyPersonnel" className="text-sm font-medium text-gray-500">Key Personnel</Label>
                  {isEditing ? (
                    <div className="mt-1">
                      <Input
                        id="keyPersonnel"
                        value={editFormData.keyPersonnel}
                        onChange={(e) => handleEditInputChange('keyPersonnel', e.target.value)}
                        placeholder="Enter key personnel (optional)"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium mt-1">Not specified</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-500">Description</Label>
                  {isEditing ? (
                    <div className="mt-1">
                      <textarea
                        id="description"
                        value={editFormData.description}
                        onChange={(e) => handleEditInputChange('description', e.target.value)}
                        placeholder="Enter transition description (optional)"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium mt-1">No description provided</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeline Information Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Timeline
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-500">Start Date</Label>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    id="startDate"
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) => handleEditInputChange('startDate', e.target.value)}
                    className={editErrors.startDate ? 'border-red-500' : ''}
                  />
                  {editErrors.startDate && (
                    <p className="text-sm text-red-500 mt-1">{editErrors.startDate}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900 font-medium mt-1">{formatDate(transition.startDate)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-500">End Date</Label>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    id="endDate"
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) => handleEditInputChange('endDate', e.target.value)}
                    className={editErrors.endDate ? 'border-red-500' : ''}
                  />
                  {editErrors.endDate && (
                    <p className="text-sm text-red-500 mt-1">{editErrors.endDate}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900 font-medium mt-1">{formatDate(transition.endDate)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <p className="text-gray-900 font-medium">
                {isEditing && editFormData.startDate && editFormData.endDate 
                  ? calculateDuration(editFormData.startDate, editFormData.endDate)
                  : calculateDuration(transition.startDate, transition.endDate)
                }
              </p>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Milestones</h3>
            {/* Add Milestone Dialog Trigger */}
            <div className="mb-4">
              <Button data-testid="milestones-add-btn" variant="outline" onClick={() => setMsDialogOpen(true)}>Add Milestone</Button>
            </div>
            <Dialog open={msDialogOpen} onOpenChange={setMsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milestone</DialogTitle>
                  <DialogDescription>Create a milestone event for this transition.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={msTitle} onChange={(e)=>setMsTitle(e.target.value)} placeholder="e.g., Kickoff Meeting" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={msDue} onChange={(e)=>setMsDue(e.target.value)} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={msPriority} onValueChange={(v)=>setMsPriority(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <textarea className="w-full border rounded-md p-2" rows={3} value={msDesc} onChange={(e)=>setMsDesc(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setMsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={addMilestone} disabled={msSaving || !msTitle || !msDue}>{msSaving ? 'Adding...' : 'Create Milestone'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones yet.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {milestones.map((m) => (
                  <div key={m.id} className="p-3">
                    {editingMilestoneId === m.id ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                          <Input value={editMsTitle} onChange={(e) => setEditMsTitle(e.target.value)} />
                          <Input type="date" value={editMsDue} onChange={(e) => setEditMsDue(e.target.value)} />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={cancelEditMilestone}>Cancel</Button>
                            <Button size="sm" onClick={saveMilestone}>Save</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div>
                            <Label>Priority</Label>
                            <Select value={editMsPriority} onValueChange={(v)=>setEditMsPriority(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select value={editMsStatus} onValueChange={(v)=>setEditMsStatus(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Not Started</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="BLOCKED">Blocked</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="OVERDUE">Overdue</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <textarea className="w-full border rounded-md p-2" rows={2} value={editMsDesc} onChange={(e)=>setEditMsDesc(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.title}</div>
                          <div className="text-xs text-muted-foreground">Due {formatDate(m.dueDate)} • {m.status} • Priority {m.priority}</div>
                          {m.description && (
                            <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditMilestone(m)}>Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => deleteMilestone(m.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Project Management Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Project Management
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{formatDate(transition.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-gray-900">{formatDate(transition.updatedAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Project ID</label>
              <p className="text-gray-900 font-mono text-sm">{transition.id}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={handleEditClick}
              disabled={isEditing}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Project Details
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setMsDialogOpen(true)}>
              Add Milestone Event
            </Button>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-500 mb-1">Update Status</label>
              <Select 
                value={transition.status}
                onValueChange={(v) => handleStatusChange(v)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="ON_TRACK">On Track</SelectItem>
                  <SelectItem value="AT_RISK">At Risk</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tasks</h2>
          <div className="mb-3">
            <Button data-testid="tasks-add-btn" variant="outline" onClick={()=>setTaskOpen(true)}>Add Task</Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <div className="border rounded-md divide-y">
              {tasks.map((t) => (
                <div key={t.id} className="p-3">
                  {editingTaskId === t.id ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <Input data-testid="edit-task-title" value={editTaskTitle} onChange={(e)=>setEditTaskTitle(e.target.value)} />
                        <Input data-testid="edit-task-date" type="date" value={editTaskDue} onChange={(e)=>setEditTaskDue(e.target.value)} />
                        <div className="flex justify-end gap-2">
                          <Button data-testid="cancel-task-btn" variant="outline" size="sm" onClick={cancelEditTask}>Cancel</Button>
                          <Button data-testid="save-task-btn" size="sm" onClick={saveTask}>Save</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                        <div>
                          <Label>Priority</Label>
                          <select data-testid="edit-task-priority" className="border rounded-md p-2 w-full" value={editTaskPriority} onChange={(e)=>setEditTaskPriority(e.target.value as any)}>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <select data-testid="edit-task-status" className="border rounded-md p-2 w-full" value={editTaskStatus} onChange={(e)=>setEditTaskStatus(e.target.value as any)}>
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
                          <Label>Milestone</Label>
                          <select data-testid="edit-task-milestone" className="border rounded-md p-2 w-full" value={editTaskMilestoneId} onChange={(e)=>setEditTaskMilestoneId(e.target.value)}>
                            <option value="">Unassigned</option>
                            {milestones.map(m => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea data-testid="edit-task-desc" className="border rounded-md p-2 w-full" rows={2} value={editTaskDesc} onChange={(e)=>setEditTaskDesc(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">Due {formatDate(t.dueDate)} • {t.status} • Priority {t.priority}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button data-testid="edit-task-btn" variant="outline" size="sm" onClick={()=>startEditTask(t)}>Edit</Button>
                        <Button data-testid="delete-task-btn" variant="outline" size="sm" onClick={()=>deleteTask(t.id)}>Delete</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is the Project Hub for {transition.contractName}. 
          You can now edit basic project details (contract name, number, and dates). 
          Additional features like description editing, milestone management, team collaboration, 
          and document sharing will be available in future releases.
        </p>
      </div>

      {/* Confirmation Dialog for Significant Changes */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Significant Changes</DialogTitle>
            <DialogDescription>
              You are about to make significant changes to this transition project that may affect 
              planning and coordination. The following changes were detected:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 text-sm">
            {transition && editFormData.contractNumber !== transition.contractNumber && (
              <p>• Contract Number: {transition.contractNumber} → {editFormData.contractNumber}</p>
            )}
            {transition && editFormData.startDate !== transition.startDate.split('T')[0] && (
              <p>• Start Date: {formatDate(transition.startDate)} → {formatDate(editFormData.startDate)}</p>
            )}
            {transition && editFormData.endDate !== transition.endDate.split('T')[0] && (
              <p>• End Date: {formatDate(transition.endDate)} → {formatDate(editFormData.endDate)}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransition} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Confirm Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    {/* Add Task Dialog */}
    {taskOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-md p-4 w-full max-w-lg">
          <div className="text-lg font-semibold mb-2">Add Task</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Title</Label>
              <input data-testid="task-title" className="border rounded-md p-2 w-full" value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} />
            </div>
            <div>
              <Label>Due Date</Label>
              <input data-testid="task-date" className="border rounded-md p-2 w-full" type="date" value={taskDue} onChange={(e)=>setTaskDue(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <select data-testid="task-priority" className="border rounded-md p-2 w-full" value={taskPriority} onChange={(e)=>setTaskPriority(e.target.value as any)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <Label>Milestone</Label>
              <select data-testid="task-milestone" className="border rounded-md p-2 w-full" value={taskMilestoneId} onChange={(e)=>setTaskMilestoneId(e.target.value)}>
                <option value="">Unassigned</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <textarea data-testid="task-desc" className="border rounded-md p-2 w-full" rows={3} value={taskDesc} onChange={(e)=>setTaskDesc(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button data-testid="task-cancel" variant="outline" onClick={()=>setTaskOpen(false)}>Cancel</Button>
            <Button data-testid="task-create" onClick={addTask} disabled={taskSaving || !taskTitle || !taskDue}>{taskSaving ? 'Adding...' : 'Create Task'}</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
