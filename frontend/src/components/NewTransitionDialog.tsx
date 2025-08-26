import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContractSelector } from "@/components/ContractSelector";
import { Contract } from "@/services/api";

interface NewTransitionFormData {
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  keyPersonnel?: string;
  description?: string;
}

interface FormErrors {
  contractName?: string;
  contractNumber?: string;
  startDate?: string;
  endDate?: string;
}

interface NewTransitionDialogProps {
  onTransitionCreated: (transition: any) => void;
  userRole?: string; // For role-based visibility
}

export function NewTransitionDialog({ onTransitionCreated, userRole }: NewTransitionDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<NewTransitionFormData>({
    contractName: "",
    contractNumber: "",
    startDate: "",
    endDate: "",
    keyPersonnel: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role-based visibility - only show for program_manager role
  const canCreateTransition = userRole === "program_manager";

  // Handle contract selection and auto-populate form fields
  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData(prev => ({
      ...prev,
      contractName: contract.contractName,
      contractNumber: contract.contractNumber
    }));
    // Clear any existing validation errors for contract fields
    setErrors(prev => ({
      ...prev,
      contractName: undefined,
      contractNumber: undefined
    }));
    console.log('Auto-populated contract:', contract.contractName, contract.contractNumber);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.contractName.trim()) {
      newErrors.contractName = "Contract name is required";
    }

    if (!formData.contractNumber.trim()) {
      newErrors.contractNumber = "Contract number is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    // Validate date logic
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:3000/api/transitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractName: formData.contractName,
          contractNumber: formData.contractNumber,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          keyPersonnel: formData.keyPersonnel || undefined,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create transition');
      }

      const newTransition = await response.json();
      
      // Call parent callback
      onTransitionCreated(newTransition);
      
      // Reset form and close dialog
      setSelectedContract(null);
      setFormData({
        contractName: "",
        contractNumber: "",
        startDate: "",
        endDate: "",
        keyPersonnel: "",
        description: "",
      });
      setErrors({});
      setOpen(false);

      // Redirect to Project Hub (User Story requirement FE-1.1.5)
      navigate(`/transitions/${newTransition.id}`);
      
    } catch (error) {
      console.error('Failed to create transition:', error);
      // In a real app, you'd show this error to the user
      alert('Failed to create transition: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewTransitionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Don't render button if user doesn't have permission
  if (!canCreateTransition) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Transition</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Transition</DialogTitle>
          <DialogDescription>
            Create a new contract transition project by selecting a contract from your business operations and defining transition details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Selection Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-3">Contract Information</h3>
            <ContractSelector
              selectedContract={selectedContract}
              onContractSelect={handleContractSelect}
              className="space-y-3"
            />
            {(errors.contractName || errors.contractNumber) && (
              <p className="text-sm text-red-500 mt-2">
                Please select a contract from the list above
              </p>
            )}
          </div>

          {/* Display Selected Contract Info */}
          {selectedContract && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <Label className="text-sm font-medium text-green-800">Selected Contract Name</Label>
                <p className="text-sm text-green-700">{formData.contractName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-green-800">Selected Contract Number</Label>
                <p className="text-sm text-green-700">{formData.contractNumber}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyPersonnel">Key Personnel</Label>
            <Input
              id="keyPersonnel"
              value={formData.keyPersonnel}
              onChange={(e) => handleInputChange('keyPersonnel', e.target.value)}
              placeholder="Enter key personnel (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter transition description (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Transition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}