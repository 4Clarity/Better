import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProductProgramById,
  deleteProductProgram,
} from '@/services/productProgramApi';
import { ProductProgram, SecurityClassification } from '@/types/productProgram';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { StakeholderManager } from './StakeholderManager';

interface ProductProgramDetailProps {
  id: string;
}

export function ProductProgramDetail({ id }: ProductProgramDetailProps) {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [productProgram, setProductProgram] = useState<ProductProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = permissions.canPerformOperation(
    'Business Operations',
    'Products/Programs',
    'update'
  );
  const canDelete = permissions.canPerformOperation(
    'Business Operations',
    'Products/Programs',
    'delete'
  );

  useEffect(() => {
    fetchProductProgram();
  }, [id]);

  const fetchProductProgram = async () => {
    try {
      setLoading(true);
      const data = await getProductProgramById(id);
      setProductProgram(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Product/Program:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch Product/Program';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productProgram) return;

    try {
      setDeleting(true);
      await deleteProductProgram(productProgram.id);
      navigate('/business-operations/products-programs', {
        state: { message: 'Product/Program deleted successfully' },
      });
    } catch (err) {
      console.error('Failed to delete Product/Program:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete Product/Program';
      setError(errorMessage);
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getSecurityClassificationBadge = (classification: SecurityClassification) => {
    const styles = {
      UNCLASSIFIED:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      CUI: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      SECRET: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      TOP_SECRET: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[classification] || styles.UNCLASSIFIED;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading product/program details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          Error: {error}
        </div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate('/business-operations/products-programs')}
        >
          Back to List
        </Button>
      </div>
    );
  }

  if (!productProgram) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-muted-foreground">
          Product/Program not found
        </div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate('/business-operations/products-programs')}
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/business-operations/products-programs')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Products & Programs
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-semibold mb-2">{productProgram.name}</h2>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSecurityClassificationBadge(
              productProgram.securityClassification
            )}`}
          >
            {productProgram.securityClassification ? productProgram.securityClassification.replace('_', ' ') : 'Unclassified'}
          </span>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              onClick={() =>
                navigate(`/business-operations/products-programs/${productProgram.id}/edit`)
              }
            >
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Description */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-3">Description</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {productProgram.description}
          </p>
        </div>

        {/* Objectives */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-3">Objectives</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {productProgram.objectives}
          </p>
        </div>

        {/* Deliverables */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-3">Deliverables</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {productProgram.deliverables}
          </p>
        </div>

        {/* Dependencies */}
        {productProgram.dependencies && (
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-3">Dependencies</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {productProgram.dependencies}
            </p>
          </div>
        )}

        {/* Critical Dates */}
        {productProgram.criticalDates && productProgram.criticalDates.length > 0 && (
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-4">Critical Dates</h3>
            <div className="space-y-3">
              {productProgram.criticalDates.map((criticalDate, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 border rounded-lg bg-background"
                >
                  <div className="flex-1">
                    <p className="font-medium">{criticalDate.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(criticalDate.date)}
                    </p>
                  </div>
                  {criticalDate.type && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground capitalize">
                      {criticalDate.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stakeholders (Story 4.2 - Phase 1) */}
        <StakeholderManager productProgramId={productProgram.id} />

        {/* Metadata */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-3">Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(productProgram.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">{formatDate(productProgram.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        itemName={productProgram.name}
        isDeleting={deleting}
      />
    </div>
  );
}
