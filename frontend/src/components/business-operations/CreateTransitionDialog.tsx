import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { API_BASE_URL } from '@/services/api';
import { AIPlanningWizard } from '../transitions/ai-planning';
import { TransitionType } from '@/types/ai-planning';
import { Bot, Sparkles } from 'lucide-react';

interface CreateTransitionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productProgramId: string;
}

export function CreateTransitionDialog({
  isOpen,
  onClose,
  onSuccess,
  productProgramId,
}: CreateTransitionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAIPlanning, setUseAIPlanning] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [createdTransitionId, setCreatedTransitionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractName: '',
    contractNumber: '',
    startDate: '',
    endDate: '',
    keyPersonnel: '',
    description: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.contractName.trim()) {
      setError('Contract name is required');
      return;
    }
    if (!formData.contractNumber.trim()) {
      setError('Contract number is required');
      return;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }
    if (!formData.endDate) {
      setError('End date is required');
      return;
    }

    // Validate date logic
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert dates to ISO format for API
      const startDateTime = new Date(formData.startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(formData.endDate + 'T23:59:59').toISOString();

      // Create the transition
      const createResponse = await fetch(`${API_BASE_URL}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify({
          contractName: formData.contractName.trim(),
          contractNumber: formData.contractNumber.trim(),
          startDate: startDateTime,
          endDate: endDateTime,
          keyPersonnel: formData.keyPersonnel.trim() || undefined,
          description: formData.description.trim() || undefined,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create transition');
      }

      const createdTransition = await createResponse.json();

      // Assign the transition to the product/program
      const assignResponse = await fetch(
        `${API_BASE_URL}/transitions/${createdTransition.id}/product-program`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
          },
          body: JSON.stringify({
            productProgramId: productProgramId,
          }),
        }
      );

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign transition to product/program');
      }

      // If AI planning is enabled, show wizard
      if (useAIPlanning) {
        setCreatedTransitionId(createdTransition.id);
        setShowAIWizard(true);
      } else {
        // Reset form and close dialog
        setFormData({
          contractName: '',
          contractNumber: '',
          startDate: '',
          endDate: '',
          keyPersonnel: '',
          description: '',
        });
        setUseAIPlanning(false);
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to create transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transition');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !showAIWizard) {
      setFormData({
        contractName: '',
        contractNumber: '',
        startDate: '',
        endDate: '',
        keyPersonnel: '',
        description: '',
      });
      setError(null);
      setUseAIPlanning(false);
      setShowAIWizard(false);
      setCreatedTransitionId(null);
      onClose();
    }
  };

  const handleAIPlanningComplete = (result: {
    sessionId: string;
    tasksCreated: number;
    milestonesCreated: number;
  }) => {
    // Reset state
    setFormData({
      contractName: '',
      contractNumber: '',
      startDate: '',
      endDate: '',
      keyPersonnel: '',
      description: '',
    });
    setUseAIPlanning(false);
    setShowAIWizard(false);
    setCreatedTransitionId(null);
    setError(null);

    // Call success callback
    onSuccess();
  };

  const handleAIPlanningCancel = () => {
    // User cancelled AI planning, but transition was still created
    setFormData({
      contractName: '',
      contractNumber: '',
      startDate: '',
      endDate: '',
      keyPersonnel: '',
      description: '',
    });
    setUseAIPlanning(false);
    setShowAIWizard(false);
    setCreatedTransitionId(null);
    setError(null);

    // Call success callback (transition was created, just no AI planning)
    onSuccess();
  };

  // If showing AI wizard, render it instead of the form
  if (showAIWizard && createdTransitionId) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <AIPlanningWizard
            transitionId={createdTransitionId}
            transitionType={TransitionType.CONTRACT}
            onComplete={handleAIPlanningComplete}
            onCancel={handleAIPlanningCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Transition</DialogTitle>
          <DialogDescription>
            Create a new transition and assign it to this Product/Program
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* AI Planning Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Bot className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="ai-planning-toggle" className="text-sm font-semibold text-blue-900">
                    Use AI Planning Assistant
                  </Label>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Let AI generate tasks and milestones after creating the transition
                  </p>
                </div>
              </div>
              <Switch
                id="ai-planning-toggle"
                checked={useAIPlanning}
                onCheckedChange={setUseAIPlanning}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractName">
                  Contract Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contractName"
                  value={formData.contractName}
                  onChange={(e) => handleChange('contractName', e.target.value)}
                  placeholder="Enter contract name"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractNumber">
                  Contract Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contractNumber"
                  value={formData.contractNumber}
                  onChange={(e) => handleChange('contractNumber', e.target.value)}
                  placeholder="Enter contract number"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyPersonnel">Key Personnel</Label>
              <Input
                id="keyPersonnel"
                value={formData.keyPersonnel}
                onChange={(e) => handleChange('keyPersonnel', e.target.value)}
                placeholder="Enter key personnel (optional)"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter transition description (optional)"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Creating...'
              ) : useAIPlanning ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create & Plan with AI
                </>
              ) : (
                'Create Transition'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
