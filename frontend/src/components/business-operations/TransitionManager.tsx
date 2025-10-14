import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductProgramTransitions } from '@/services/productProgramApi';
import { TransitionSummary } from '@/types/productProgram';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateTransitionDialog } from './CreateTransitionDialog';

interface TransitionManagerProps {
  productProgramId: string;
}

/**
 * TransitionManager Component
 * Story 4.2 - Phase 2: Display transitions assigned to a Product/Program
 *
 * Features:
 * - Lists all transitions categorized under this product/program
 * - Shows key transition details (name, contract, status, dates, priority)
 * - Provides navigation to transition detail pages
 * - Read-only view (assignment/removal done from transition side)
 */
export function TransitionManager({ productProgramId }: TransitionManagerProps) {
  const navigate = useNavigate();
  const [transitions, setTransitions] = useState<TransitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransitions();
  }, [productProgramId]);

  const fetchTransitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductProgramTransitions(productProgramId);
      setTransitions(data);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch transitions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      NOT_STARTED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      ON_TRACK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      AT_RISK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      DELAYED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return statusStyles[status] || statusStyles.NOT_STARTED;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return priorityStyles[priority] || priorityStyles.MEDIUM;
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Transitions</h3>
        <div className="text-center py-8 text-muted-foreground">
          Loading transitions...
        </div>
      </div>
    );
  }

  const handleTransitionCreated = () => {
    setIsCreateDialogOpen(false);
    fetchTransitions(); // Refresh the list
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Transitions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Transitions categorized under this Product/Program
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Add Transition
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {transitions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No transitions assigned yet</p>
          <p className="text-sm">
            Transitions can be assigned to this Product/Program from the transition detail page
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transition Name</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transitions.map((transition) => (
                <TableRow key={transition.id}>
                  <TableCell className="font-medium">
                    {transition.name}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{transition.contractName}</div>
                      <div className="text-muted-foreground">{transition.contractNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                        transition.status
                      )}`}
                    >
                      {formatStatusLabel(transition.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(
                        transition.priority
                      )}`}
                    >
                      {transition.priority}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(transition.startDate)}</TableCell>
                  <TableCell>{formatDate(transition.endDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/transitions/${transition.id}`)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {transitions.length} transition{transitions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <CreateTransitionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleTransitionCreated}
        productProgramId={productProgramId}
      />
    </div>
  );
}
