import { useState, useEffect } from "react";
import { Contract } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContractSelector } from "@/components/ContractSelector";
import { Edit } from "lucide-react";

interface LegacyTransition {
  id: string;
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'BLOCKED' | 'COMPLETED';
  keyPersonnel?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface LegacyTransitionEditDialogProps {
  transition: LegacyTransition;
  onTransitionUpdated: (transition: LegacyTransition) => void;
  userRole: string;
  trigger?: React.ReactNode;
}

export function LegacyTransitionEditDialog({ 
  transition, 
  onTransitionUpdated, 
  userRole,
  trigger 
}: LegacyTransitionEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  const [formData, setFormData] = useState({
    contractName: transition.contractName || '',
    contractNumber: transition.contractNumber || '',
    startDate: transition.startDate ? transition.startDate.split('T')[0] : '',
    endDate: transition.endDate ? transition.endDate.split('T')[0] : '',
    keyPersonnel: transition.keyPersonnel || '',
    status: transition.status,
    description: transition.description || '',
  });

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData(prev => ({
      ...prev,
      contractName: contract.contractName,
      contractNumber: contract.contractNumber
    }));
    console.log('Selected contract for team member transition:', contract.contractName, contract.contractNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare update data for team member transition API
      const updateData = {
        contractName: formData.contractName,
        contractNumber: formData.contractNumber,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        keyPersonnel: formData.keyPersonnel || undefined,
        description: formData.description || undefined,
        status: formData.status,
      };

      const response = await fetch(`http://localhost:3000/api/transitions/${transition.id}`, {
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
      onTransitionUpdated(updatedTransition);
      setOpen(false);
    } catch (err) {
      console.error('Failed to update team member transition:', err);
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
          <DialogTitle>Edit Team Member Transition</DialogTitle>
          <DialogDescription>
            Update the team member transition details and contract information.
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
            
            {/* Manual Contract Fields for Team Member Transition Support */}
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractName">Contract Name *</Label>
                  <Input
                    id="contractName"
                    value={formData.contractName}
                    onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
                    placeholder="Enter contract name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractNumber">Contract Number *</Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    placeholder="Enter contract number"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transition Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transition Details</h3>

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

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LegacyTransition['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
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