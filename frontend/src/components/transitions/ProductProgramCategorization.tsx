import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getProductPrograms,
  assignTransitionToProductProgram,
  removeTransitionFromProductProgram,
} from '@/services/productProgramApi';
import { ProductProgram } from '@/types/productProgram';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building, X } from 'lucide-react';

interface ProductProgramCategorizationProps {
  transitionId: string;
  currentProductProgramId?: string | null;
  currentProductProgram?: {
    id: string;
    name: string;
    description: string;
  };
  onUpdate?: () => void;
}

/**
 * ProductProgramCategorization Component
 * Story 4.2 - Phase 2: Assign/Remove Product/Program categorization for transitions
 *
 * Features:
 * - Display currently assigned Product/Program (if any)
 * - Allow assignment of transition to a Product/Program
 * - Allow removal of Product/Program categorization
 * - Requires appropriate permissions
 */
export function ProductProgramCategorization({
  transitionId,
  currentProductProgramId,
  currentProductProgram,
  onUpdate,
}: ProductProgramCategorizationProps) {
  const permissions = usePermissions();
  const [productPrograms, setProductPrograms] = useState<ProductProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductProgramId, setSelectedProductProgramId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  const canManageTransitions = permissions.canPerformOperation(
    'Transitions',
    'Transitions',
    'update'
  );

  useEffect(() => {
    if (canManageTransitions) {
      fetchProductPrograms();
    }
  }, [canManageTransitions]);

  const fetchProductPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProductPrograms({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      setProductPrograms(response.data);
    } catch (err) {
      console.error('Failed to fetch product/programs:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch product/programs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedProductProgramId) return;

    try {
      setAssigning(true);
      setError(null);
      await assignTransitionToProductProgram(transitionId, {
        productProgramId: selectedProductProgramId,
      });
      setSelectedProductProgramId('');
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to assign product/program:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to assign product/program';
      setError(errorMessage);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the Product/Program categorization from this transition?')) {
      return;
    }

    try {
      setRemoving(true);
      setError(null);
      await removeTransitionFromProductProgram(transitionId);
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to remove product/program:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to remove product/program';
      setError(errorMessage);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Product/Program Categorization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {currentProductProgram ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-2">Currently Assigned</div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="flex-1">
                  <Link
                    to={`/business-operations/products-programs/${currentProductProgram.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {currentProductProgram.name}
                  </Link>
                  {currentProductProgram.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentProductProgram.description}
                    </p>
                  )}
                </div>
                {canManageTransitions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRemove}
                    disabled={removing}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This transition is not categorized under any Product/Program
            </div>

            {canManageTransitions && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2">Assign to Product/Program</div>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProductProgramId}
                      onValueChange={setSelectedProductProgramId}
                      disabled={loading || assigning}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a Product/Program" />
                      </SelectTrigger>
                      <SelectContent>
                        {productPrograms.map((pp) => (
                          <SelectItem key={pp.id} value={pp.id}>
                            {pp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssign}
                      disabled={!selectedProductProgramId || assigning}
                    >
                      {assigning ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </div>

                {loading && (
                  <div className="text-sm text-muted-foreground">
                    Loading available products/programs...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!canManageTransitions && !currentProductProgram && (
          <div className="text-sm text-muted-foreground">
            You don't have permission to assign product/program categorization
          </div>
        )}
      </CardContent>
    </Card>
  );
}
