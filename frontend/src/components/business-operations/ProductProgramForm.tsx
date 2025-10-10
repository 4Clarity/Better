import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  ProductProgram,
  CreateProductProgramRequest,
  UpdateProductProgramRequest,
  SecurityClassification,
  CriticalDate,
} from '@/types/productProgram';
import {
  createProductProgram,
  updateProductProgram,
} from '@/services/productProgramApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProductProgramFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductProgram;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  objectives: string;
  deliverables: string;
  dependencies: string;
  securityClassification: SecurityClassification;
  criticalDates: CriticalDate[];
}

export function ProductProgramForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: ProductProgramFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      objectives: initialData?.objectives || '',
      deliverables: initialData?.deliverables || '',
      dependencies: initialData?.dependencies || '',
      securityClassification:
        initialData?.securityClassification || SecurityClassification.UNCLASSIFIED,
      criticalDates: initialData?.criticalDates || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'criticalDates',
  });

  const securityClassification = watch('securityClassification');

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      if (mode === 'create') {
        const createData: CreateProductProgramRequest = {
          name: data.name,
          description: data.description,
          objectives: data.objectives,
          deliverables: data.deliverables,
          dependencies: data.dependencies || undefined,
          securityClassification: data.securityClassification,
          criticalDates: data.criticalDates,
        };
        await createProductProgram(createData);
        setSuccessMessage('Product/Program created successfully!');
      } else if (initialData) {
        const updateData: UpdateProductProgramRequest = {
          name: data.name,
          description: data.description,
          objectives: data.objectives,
          deliverables: data.deliverables,
          dependencies: data.dependencies || null,
          securityClassification: data.securityClassification,
          criticalDates: data.criticalDates,
        };
        await updateProductProgram(initialData.id, updateData);
        setSuccessMessage('Product/Program updated successfully!');
      }

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      console.error('Failed to save Product/Program:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save Product/Program';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name', {
              required: 'Name is required',
              maxLength: {
                value: 200,
                message: 'Name must be 200 characters or less',
              },
            })}
            placeholder="Enter product/program name"
            disabled={loading}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            {...register('description', { required: 'Description is required' })}
            placeholder="Enter a detailed description"
            rows={4}
            disabled={loading}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Objectives */}
        <div>
          <Label htmlFor="objectives">
            Objectives <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="objectives"
            {...register('objectives', { required: 'Objectives are required' })}
            placeholder="Enter operational objectives"
            rows={4}
            disabled={loading}
          />
          {errors.objectives && (
            <p className="text-sm text-destructive mt-1">{errors.objectives.message}</p>
          )}
        </div>

        {/* Deliverables */}
        <div>
          <Label htmlFor="deliverables">
            Deliverables <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="deliverables"
            {...register('deliverables', { required: 'Deliverables are required' })}
            placeholder="Enter expected deliverables"
            rows={4}
            disabled={loading}
          />
          {errors.deliverables && (
            <p className="text-sm text-destructive mt-1">{errors.deliverables.message}</p>
          )}
        </div>

        {/* Dependencies */}
        <div>
          <Label htmlFor="dependencies">Dependencies (Optional)</Label>
          <Textarea
            id="dependencies"
            {...register('dependencies')}
            placeholder="Enter any dependencies or prerequisites"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Security Classification */}
        <div>
          <Label htmlFor="securityClassification">
            Security Classification <span className="text-destructive">*</span>
          </Label>
          <Select
            value={securityClassification}
            onValueChange={(value) =>
              setValue('securityClassification', value as SecurityClassification)
            }
            disabled={loading}
          >
            <SelectTrigger id="securityClassification">
              <SelectValue placeholder="Select classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SecurityClassification.UNCLASSIFIED}>
                Unclassified
              </SelectItem>
              <SelectItem value={SecurityClassification.CUI}>CUI</SelectItem>
              <SelectItem value={SecurityClassification.SECRET}>Secret</SelectItem>
              <SelectItem value={SecurityClassification.TOP_SECRET}>
                Top Secret
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Critical Dates */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Critical Dates</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ date: '', description: '', type: 'milestone' })}
              disabled={loading}
            >
              Add Date
            </Button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    type="date"
                    {...register(`criticalDates.${index}.date`, {
                      required: 'Date is required',
                    })}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    {...register(`criticalDates.${index}.description`, {
                      required: 'Description is required',
                    })}
                    placeholder="Description"
                    disabled={loading}
                  />
                </div>
                <div className="w-32">
                  <Select
                    value={watch(`criticalDates.${index}.type`) || 'milestone'}
                    onValueChange={(value) =>
                      setValue(`criticalDates.${index}.type`, value as any)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={loading}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-900 dark:text-green-400 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading
              ? 'Saving...'
              : mode === 'create'
              ? 'Create Product/Program'
              : 'Update Product/Program'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
