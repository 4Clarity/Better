import { useState, useEffect } from "react";
import { enhancedTransitionApi, EnhancedTransition, Contract } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContractSelector } from "@/components/ContractSelector";
import { Edit } from "lucide-react";

interface EditTransitionDialogProps {
  transition: EnhancedTransition;
  onTransitionUpdated: (transition: EnhancedTransition) => void;
  userRole: string;
  trigger?: React.ReactNode;
}

export function EditTransitionDialog({ 
  transition, 
  onTransitionUpdated, 
  userRole,
  trigger 
}: EditTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  const [formData, setFormData] = useState({
    name: transition.name || '',
    description: transition.description || '',
    startDate: transition.startDate ? transition.startDate.split('T')[0] : '',
    endDate: transition.endDate ? transition.endDate.split('T')[0] : '',
    duration: transition.duration,
    keyPersonnel: transition.keyPersonnel || '',
    status: transition.status,
    requiresContinuousService: transition.requiresContinuousService,
  });

  // Initialize selected contract when dialog opens
  useEffect(() => {
    if (open && transition.contract) {
      setSelectedContract(transition.contract);
    }
  }, [open, transition.contract]);

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    // Auto-populate any contract-related fields if needed
    console.log('Selected contract:', contract.contractName, contract.contractNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare update data
      const updateData: any = {
        ...formData,
        contractId: selectedContract?.id || transition.contractId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        keyPersonnel: formData.keyPersonnel || undefined,
        description: formData.description || undefined,
      };

      const updatedTransition = await enhancedTransitionApi.update(transition.id, updateData);
      onTransitionUpdated(updatedTransition);
      setOpen(false);
    } catch (err) {
      console.error('Failed to update transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transition');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = userRole === 'program_manager' || userRole === 'director' || userRole === 'admin';

  if (!canEdit) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Edit className="h-4 w-4 mr-2" />
      Edit Transition
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transition</DialogTitle>
          <DialogDescription>
            Update the transition details and associated contract information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}

          {/* Contract Selection Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-4">Contract Information</h3>
            <ContractSelector
              selectedContract={selectedContract}
              onContractSelect={handleContractSelect}
              className="space-y-3"
            />
          </div>

          {/* Transition Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transition Details</h3>

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
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}