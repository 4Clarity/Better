import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Info } from 'lucide-react';
import { type User } from '@/services/userManagementApi';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason: string) => void;
  user: User;
  targetStatus: string;
}

// Predefined reasons for different status changes
const STATUS_REASONS = {
  SUSPENDED: [
    { value: 'security_violation', label: 'Security Violation' },
    { value: 'policy_violation', label: 'Policy Violation' },
    { value: 'administrative_action', label: 'Administrative Action' },
    { value: 'pending_investigation', label: 'Pending Investigation' },
    { value: 'custom', label: 'Custom Reason' },
  ],
  DEACTIVATED: [
    { value: 'termination', label: 'Employee Termination' },
    { value: 'contract_ended', label: 'Contract Ended' },
    { value: 'resignation', label: 'Resignation' },
    { value: 'security_clearance_expired', label: 'Security Clearance Expired' },
    { value: 'administrative_action', label: 'Administrative Action' },
    { value: 'custom', label: 'Custom Reason' },
  ],
  ACTIVE: [
    { value: 'investigation_cleared', label: 'Investigation Cleared' },
    { value: 'appeal_approved', label: 'Appeal Approved' },
    { value: 'administrative_review', label: 'Administrative Review' },
    { value: 'security_clearance_renewed', label: 'Security Clearance Renewed' },
    { value: 'custom', label: 'Custom Reason' },
  ],
  INACTIVE: [
    { value: 'temporary_leave', label: 'Temporary Leave' },
    { value: 'medical_leave', label: 'Medical Leave' },
    { value: 'administrative_hold', label: 'Administrative Hold' },
    { value: 'custom', label: 'Custom Reason' },
  ],
};

const getStatusDescription = (status: string) => {
  switch (status) {
    case 'SUSPENDED':
      return 'User will lose access to all systems immediately. This action requires immediate attention.';
    case 'DEACTIVATED':
      return 'User account will be permanently deactivated. This action should be used for terminated employees.';
    case 'ACTIVE':
      return 'User will regain full access to authorized systems.';
    case 'INACTIVE':
      return 'User access will be temporarily disabled but account remains recoverable.';
    default:
      return 'Status change will be applied to user account.';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUSPENDED':
    case 'DEACTIVATED':
      return 'text-red-600';
    case 'ACTIVE':
      return 'text-green-600';
    case 'INACTIVE':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
};

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  targetStatus,
}: StatusChangeModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = STATUS_REASONS[targetStatus as keyof typeof STATUS_REASONS] || [];
  const isCustomReason = selectedReason === 'custom';
  const canSubmit = selectedReason && (isCustomReason ? customReason.trim() : true);

  const handleConfirm = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const finalReason = isCustomReason ? customReason.trim() : selectedReason;
      await onConfirm(selectedReason, finalReason);

      // Reset form on success
      setSelectedReason('');
      setCustomReason('');
    } catch (error) {
      // Error will be handled by parent component
      console.error('Status change failed:', error);
      // Keep form state on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="status-change-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${getStatusColor(targetStatus)}`} />
            Change User Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Information */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="font-medium">
              {user.person.firstName} {user.person.lastName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current Status: <span className="font-medium">{user.accountStatus}</span>
            </p>
          </div>

          {/* Status Change Information */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <p className="font-medium">
                Changing to: <span className={getStatusColor(targetStatus)}>{targetStatus}</span>
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getStatusDescription(targetStatus)}
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Status Change <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger data-testid="reason-select">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason Input */}
          {isCustomReason && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-medium">
                Custom Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="custom-reason"
                data-testid="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter detailed reason for status change..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {customReason.length}/500 characters
              </p>
            </div>
          )}

          {/* Warning for destructive actions */}
          {(targetStatus === 'SUSPENDED' || targetStatus === 'DEACTIVATED') && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Warning: This action will immediately restrict user access
                </p>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Ensure proper approval has been obtained before proceeding.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid="cancel-change"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            variant={targetStatus === 'SUSPENDED' || targetStatus === 'DEACTIVATED' ? 'destructive' : 'default'}
            data-testid="confirm-change"
          >
            {isSubmitting ? 'Processing...' : `Change to ${targetStatus}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}