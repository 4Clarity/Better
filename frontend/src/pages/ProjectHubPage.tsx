import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  const fetchTransition = async () => {
    if (!id) {
      setError("Transition ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/transitions/${id}`);
      
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

      const response = await fetch(`http://localhost:3000/api/transitions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
            <Button className="w-full" variant="outline" disabled>
              Manage Timeline
              <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
            </Button>
            <Button className="w-full" variant="outline" disabled>
              Update Status
              <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
            </Button>
          </div>
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
  );
}