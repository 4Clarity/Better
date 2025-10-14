import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProductProgram, linkToBusinessOperation } from "@/services/productProgramApi";
import { ProductProgram, SecurityClassification, BusinessOperationType } from "@/types/productProgram";

interface NewProgramProductDialogProps {
  businessOperationId: string;
  onCreated: (item: ProductProgram) => void;
  canCreate?: boolean;
}

export function NewProgramProductDialog({
  businessOperationId,
  onCreated,
  canCreate = true,
}: NewProgramProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: BusinessOperationType.Program,
    name: "",
    description: "",
    objectives: "",
    deliverables: "",
    dependencies: "",
    securityClassification: SecurityClassification.UNCLASSIFIED,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create the Program/Product
      const newItem = await createProductProgram({
        name: formData.name,
        description: formData.description,
        objectives: formData.objectives,
        deliverables: formData.deliverables,
        dependencies: formData.dependencies || undefined,
        securityClassification: formData.securityClassification,
        criticalDates: [],
      });

      // Link it to the Business Operation
      const linkedItem = await linkToBusinessOperation(newItem.id, {
        businessOperationId,
      });

      onCreated(linkedItem);
      setOpen(false);

      // Reset form
      setFormData({
        type: BusinessOperationType.Program,
        name: "",
        description: "",
        objectives: "",
        deliverables: "",
        dependencies: "",
        securityClassification: SecurityClassification.UNCLASSIFIED,
      });
    } catch (err) {
      console.error("Failed to create program/product:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create program/product"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Program/Product</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Program or Product</DialogTitle>
          <DialogDescription>
            Create a new program or product under this business operation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as BusinessOperationType })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BusinessOperationType.Program}>
                    Program
                  </SelectItem>
                  <SelectItem value={BusinessOperationType.Product}>
                    Product
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="securityClassification">
                Security Classification *
              </Label>
              <Select
                value={formData.securityClassification}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    securityClassification: value as SecurityClassification,
                  })
                }
              >
                <SelectTrigger id="securityClassification">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SecurityClassification.UNCLASSIFIED}>
                    Unclassified
                  </SelectItem>
                  <SelectItem value={SecurityClassification.CUI}>CUI</SelectItem>
                  <SelectItem value={SecurityClassification.SECRET}>
                    Secret
                  </SelectItem>
                  <SelectItem value={SecurityClassification.TOP_SECRET}>
                    Top Secret
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Customer Portal Enhancement Program"
              required
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the program/product..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="objectives">Objectives *</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) =>
                setFormData({ ...formData, objectives: e.target.value })
              }
              placeholder="Key objectives and goals..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="deliverables">Deliverables *</Label>
            <Textarea
              id="deliverables"
              value={formData.deliverables}
              onChange={(e) =>
                setFormData({ ...formData, deliverables: e.target.value })
              }
              placeholder="Expected deliverables and outputs..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="dependencies">Dependencies (Optional)</Label>
            <Textarea
              id="dependencies"
              value={formData.dependencies}
              onChange={(e) =>
                setFormData({ ...formData, dependencies: e.target.value })
              }
              placeholder="Dependencies on other systems, programs, or resources..."
              rows={2}
            />
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
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
