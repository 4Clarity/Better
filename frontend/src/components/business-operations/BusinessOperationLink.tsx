import { useState, useEffect } from 'react';
import { linkToBusinessOperation, unlinkFromBusinessOperation } from '@/services/productProgramApi';
import { businessOperationApi } from '@/services/api';
import { BusinessOperationSummary } from '@/types/productProgram';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BusinessOperationLinkProps {
  productProgramId: string;
  currentBusinessOperation?: BusinessOperationSummary | null;
  onUpdate?: () => void;
}

interface BusinessOperation {
  id: string;
  name: string;
  description?: string;
  business_operation_type?: string;
}

/**
 * BusinessOperationLink Component
 * Story 4.2 - Phase 3: Link Programs/Products to Business Operations
 *
 * Features:
 * - Display currently linked Business Operation (if any)
 * - Implement "Link to Business Operation" button
 * - Create BusinessOperationSelector dialog
 * - Show confirmation when link is created
 * - Add "Unlink" button to remove relationship
 */
export function BusinessOperationLink({
  productProgramId,
  currentBusinessOperation,
  onUpdate,
}: BusinessOperationLinkProps) {
  const [businessOperations, setBusinessOperations] = useState<BusinessOperation[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (showDialog) {
      fetchBusinessOperations();
    }
  }, [showDialog]);

  const fetchBusinessOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch business operations with type = 'Operation'
      const response = await businessOperationApi.getAll({
        limit: 100,
      });

      // Filter to only show Operations (not Programs or Products)
      const operations = response.data.filter((op: BusinessOperation) =>
        !op.business_operation_type || op.business_operation_type === 'Operation'
      );

      setBusinessOperations(operations);
    } catch (err) {
      console.error('Failed to fetch business operations:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch business operations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedOperationId) {
      setError('Please select a business operation');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await linkToBusinessOperation(productProgramId, {
        businessOperationId: selectedOperationId,
      });

      setSuccessMessage('Successfully linked to business operation');
      setShowDialog(false);
      setSelectedOperationId('');

      // Call onUpdate to refresh parent component
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to link to business operation:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to link to business operation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink this business operation?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await unlinkFromBusinessOperation(productProgramId);

      setSuccessMessage('Successfully unlinked from business operation');

      // Call onUpdate to refresh parent component
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to unlink from business operation:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to unlink from business operation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Business Operation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Link this Program/Product to a parent Business Operation
          </p>
        </div>
        {!currentBusinessOperation && (
          <Button
            onClick={() => setShowDialog(true)}
            size="sm"
            disabled={loading}
          >
            Link to Business Operation
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {currentBusinessOperation ? (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium">{currentBusinessOperation.name}</h4>
                {currentBusinessOperation.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentBusinessOperation.description}
                  </p>
                )}
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Business Operation
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnlink}
                disabled={loading}
              >
                Unlink
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No business operation linked</p>
          <p className="text-sm">
            Link this Program/Product to a Business Operation for organizational hierarchy
          </p>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Business Operation</DialogTitle>
            <DialogDescription>
              Select a Business Operation to link this Program/Product to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading && (
              <div className="text-center py-4 text-muted-foreground">
                Loading business operations...
              </div>
            )}

            {!loading && businessOperations.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No business operations available
              </div>
            )}

            {!loading && businessOperations.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Operation</label>
                <Select
                  value={selectedOperationId}
                  onValueChange={setSelectedOperationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a business operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessOperations.map((operation) => (
                      <SelectItem key={operation.id} value={operation.id}>
                        {operation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setSelectedOperationId('');
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={loading || !selectedOperationId}
            >
              {loading ? 'Linking...' : 'Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
