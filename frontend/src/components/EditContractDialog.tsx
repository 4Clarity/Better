import { useState, useEffect } from "react";
import { contractApi, Contract } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditContractDialogProps {
  contract: Contract;
  open: boolean;
  onClose: () => void;
  onContractUpdated: (contract: Contract) => void;
}

export function EditContractDialog({ contract, open, onClose, onContractUpdated }: EditContractDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    contractName: contract.contractName,
    contractNumber: contract.contractNumber,
    contractorName: contract.contractorName,
    contractorPMId: contract.contractorPMId || '',
    startDate: contract.startDate,
    endDate: contract.endDate,
    canBeExtended: contract.canBeExtended,
    status: contract.status,
  });

  // Update form data when contract prop changes
  useEffect(() => {
    setFormData({
      contractName: contract.contractName,
      contractNumber: contract.contractNumber,
      contractorName: contract.contractorName,
      contractorPMId: contract.contractorPMId || '',
      startDate: contract.startDate,
      endDate: contract.endDate,
      canBeExtended: contract.canBeExtended,
      status: contract.status,
    });
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updatedContract = await contractApi.update(contract.id, {
        ...formData,
        contractorPMId: formData.contractorPMId || undefined,
        startDate: formData.startDate.split('T')[0], // Remove time part if present
        endDate: formData.endDate.split('T')[0],
      });

      onContractUpdated(updatedContract);
      onClose();
    } catch (err) {
      console.error('Failed to update contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>
            Update the contract details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}

          <div>
            <Label htmlFor="contractName">Contract Name *</Label>
            <Input
              id="contractName"
              value={formData.contractName}
              onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
              placeholder="e.g., Customer Support Services Contract"
              required
            />
          </div>

          <div>
            <Label htmlFor="contractNumber">Contract Number *</Label>
            <Input
              id="contractNumber"
              value={formData.contractNumber}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
              placeholder="e.g., CONT-2024-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="contractorName">Contractor Name *</Label>
            <Input
              id="contractorName"
              value={formData.contractorName}
              onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
              placeholder="e.g., Acme Services Inc."
              required
            />
          </div>

          <div>
            <Label htmlFor="contractorPMId">Contractor PM ID (Optional)</Label>
            <Input
              id="contractorPMId"
              value={formData.contractorPMId}
              onChange={(e) => setFormData({ ...formData, contractorPMId: e.target.value })}
              placeholder="Contractor's Program Manager ID"
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
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="RENEWAL">Renewal</option>
                <option value="EXPIRING">Expiring</option>
                <option value="EXPIRED">Expired</option>
                <option value="EXTENDED">Extended</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                id="canBeExtended"
                type="checkbox"
                checked={formData.canBeExtended}
                onChange={(e) => setFormData({ ...formData, canBeExtended: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="canBeExtended">Can be extended</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Contract'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
