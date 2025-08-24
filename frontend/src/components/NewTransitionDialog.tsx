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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Transition</DialogTitle>
          <DialogDescription>
            Create a new contract transition project. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractName">Contract Name *</Label>
              <Input
                id="contractName"
                value={formData.contractName}
                onChange={(e) => handleInputChange('contractName', e.target.value)}
                placeholder="Enter contract name"
                className={errors.contractName ? 'border-red-500' : ''}
              />
              {errors.contractName && (
                <p className="text-sm text-red-500">{errors.contractName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractNumber">Contract Number *</Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                onChange={(e) => handleInputChange('contractNumber', e.target.value)}
                placeholder="e.g., CNT-2024-001"
                className={errors.contractNumber ? 'border-red-500' : ''}
              />
              {errors.contractNumber && (
                <p className="text-sm text-red-500">{errors.contractNumber}</p>
              )}
            </div>
          </div>

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