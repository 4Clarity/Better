import { useState } from "react";
import { enhancedTransitionApi, EnhancedTransition } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewEnhancedTransitionDialogProps {
  contractId: string;
  contractName: string;
  contractNumber: string;
  onTransitionCreated: (transition: EnhancedTransition) => void;
  userRole: string;
}

export function NewEnhancedTransitionDialog({ contractId, contractName, contractNumber, onTransitionCreated, userRole }: NewEnhancedTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    duration: 'THIRTY_DAYS' as EnhancedTransition['duration'],
    keyPersonnel: '',
    status: 'NOT_STARTED' as EnhancedTransition['status'],
    requiresContinuousService: true,
    transitionLevel: 'OPERATIONAL' as EnhancedTransition['transitionLevel'],
    createdBy: 'default-user-id', // TODO: Replace with actual user ID
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const transition = await enhancedTransitionApi.create({
        contractId,
        contractName,
        contractNumber,
        ...formData,
        createdBy: null, // Set to null instead of a non-existent user ID
        keyPersonnel: formData.keyPersonnel || undefined,
        description: formData.description || undefined,
        startDate: formData.startDate.split('T')[0], // Remove time part if present
        endDate: formData.endDate.split('T')[0],
      });

      onTransitionCreated(transition);
      setOpen(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        duration: 'THIRTY_DAYS',
        keyPersonnel: '',
        status: 'NOT_STARTED',
        requiresContinuousService: true,
        transitionLevel: 'OPERATIONAL',
        createdBy: 'default-user-id',
      });
    } catch (err) {
      console.error('Failed to create transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transition');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = userRole === 'program_manager' || userRole === 'director' || userRole === 'admin';

  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Transition</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Transition</DialogTitle>
          <DialogDescription>
            Create a new transition for this contract.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Transition Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Phase 2 Service Transition"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this transition..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value as EnhancedTransition['duration'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="THIRTY_DAYS">30 Days</option>
                <option value="FORTY_FIVE_DAYS">45 Days</option>
                <option value="SIXTY_DAYS">60 Days</option>
                <option value="NINETY_DAYS">90 Days</option>
              </select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EnhancedTransition['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="transitionLevel">Transition Type *</Label>
            <select
              id="transitionLevel"
              value={formData.transitionLevel}
              onChange={(e) => setFormData({ ...formData, transitionLevel: e.target.value as EnhancedTransition['transitionLevel'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="MAJOR">Major Transition</option>
              <option value="PERSONNEL">Personnel Transition</option>
              <option value="OPERATIONAL">Operational Change</option>
            </select>
          </div>

          <div>
            <Label htmlFor="keyPersonnel">Key Personnel</Label>
            <Textarea
              id="keyPersonnel"
              value={formData.keyPersonnel}
              onChange={(e) => setFormData({ ...formData, keyPersonnel: e.target.value })}
              placeholder="List key personnel involved in this transition..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="requiresContinuousService"
              type="checkbox"
              checked={formData.requiresContinuousService}
              onChange={(e) => setFormData({ ...formData, requiresContinuousService: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="requiresContinuousService">Requires continuous service</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Transition'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}