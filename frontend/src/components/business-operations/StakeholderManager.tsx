import { useState, useEffect } from 'react';
import {
  getStakeholders,
  addStakeholder,
  updateStakeholderRole,
  removeStakeholder,
} from '@/services/productProgramApi';
import { ProductProgramStakeholder } from '@/types/productProgram';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddStakeholderDialog } from './AddStakeholderDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface StakeholderManagerProps {
  productProgramId: string;
}

export function StakeholderManager({ productProgramId }: StakeholderManagerProps) {
  const permissions = usePermissions();
  const [stakeholders, setStakeholders] = useState<ProductProgramStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] =
    useState<ProductProgramStakeholder | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManageStakeholders = permissions.canPerformOperation(
    'Business Operations',
    'Products/Programs',
    'update'
  );

  useEffect(() => {
    fetchStakeholders();
  }, [productProgramId]);

  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStakeholders(productProgramId);
      setStakeholders(data);
    } catch (err) {
      console.error('Failed to fetch stakeholders:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch stakeholders';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStakeholder = async (userId: string, role?: string) => {
    try {
      await addStakeholder(productProgramId, { userId, role });
      await fetchStakeholders();
    } catch (err) {
      throw err; // Re-throw to be handled by dialog
    }
  };

  const handleStartEditRole = (stakeholder: ProductProgramStakeholder) => {
    setEditingRoleId(stakeholder.id);
    setEditRoleValue(stakeholder.role || '');
  };

  const handleCancelEditRole = () => {
    setEditingRoleId(null);
    setEditRoleValue('');
  };

  const handleSaveRole = async (stakeholder: ProductProgramStakeholder) => {
    try {
      setSubmitting(true);
      setError(null);
      await updateStakeholderRole(productProgramId, stakeholder.userId, {
        role: editRoleValue || null,
      });
      await fetchStakeholders();
      setEditingRoleId(null);
      setEditRoleValue('');
    } catch (err) {
      console.error('Failed to update stakeholder role:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update stakeholder role';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStakeholder = async () => {
    if (!selectedStakeholder) return;

    try {
      setSubmitting(true);
      setError(null);
      await removeStakeholder(productProgramId, selectedStakeholder.userId);
      await fetchStakeholders();
      setShowDeleteDialog(false);
      setSelectedStakeholder(null);
    } catch (err) {
      console.error('Failed to remove stakeholder:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to remove stakeholder';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Stakeholders</h3>
        <div className="text-center py-8 text-muted-foreground">
          Loading stakeholders...
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Stakeholders</h3>
        {canManageStakeholders && (
          <Button onClick={() => setShowAddDialog(true)}>Add Stakeholder</Button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {stakeholders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No stakeholders assigned yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Assigned Date</TableHead>
                {canManageStakeholders && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeholders.map((stakeholder) => (
                <TableRow key={stakeholder.id}>
                  <TableCell className="font-medium">
                    {stakeholder.user.firstName} {stakeholder.user.lastName}
                  </TableCell>
                  <TableCell>{stakeholder.user.email}</TableCell>
                  <TableCell>
                    {editingRoleId === stakeholder.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editRoleValue}
                          onChange={(e) => setEditRoleValue(e.target.value)}
                          placeholder="Enter role"
                          maxLength={100}
                          className="max-w-[200px]"
                          disabled={submitting}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveRole(stakeholder)}
                          disabled={submitting}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditRole}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {stakeholder.role || '—'}
                        </span>
                        {canManageStakeholders && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditRole(stakeholder)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {stakeholder.assignedByUser.firstName}{' '}
                    {stakeholder.assignedByUser.lastName}
                  </TableCell>
                  <TableCell>{formatDate(stakeholder.assignedAt)}</TableCell>
                  {canManageStakeholders && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedStakeholder(stakeholder);
                          setShowDeleteDialog(true);
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddStakeholderDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddStakeholder}
        existingStakeholderIds={stakeholders.map((s) => s.userId)}
      />

      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedStakeholder(null);
        }}
        onConfirm={handleRemoveStakeholder}
        itemName={
          selectedStakeholder
            ? `${selectedStakeholder.user.firstName} ${selectedStakeholder.user.lastName}`
            : ''
        }
        isDeleting={submitting}
        title="Remove Stakeholder"
        description="Are you sure you want to remove this stakeholder from the Product/Program?"
      />
    </div>
  );
}
