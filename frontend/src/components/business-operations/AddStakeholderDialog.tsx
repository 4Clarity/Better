import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UserManagementApi, { User } from '@/services/userManagementApi';

interface AddStakeholderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userId: string, role?: string) => Promise<void>;
  existingStakeholderIds: string[];
}

export function AddStakeholderDialog({
  isOpen,
  onClose,
  onAdd,
  existingStakeholderIds,
}: AddStakeholderDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const userManagementApi = new UserManagementApi();
      const response = await userManagementApi.getUsers({
        page: 1,
        pageSize: 100,
        search: searchTerm || undefined,
      });
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAdd(selectedUserId, role || undefined);
      handleClose();
    } catch (err) {
      console.error('Failed to add stakeholder:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add stakeholder';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setRole('');
    setSearchTerm('');
    setError(null);
    onClose();
  };

  // Filter out users who are already stakeholders
  const availableUsers = users.filter(
    (user) => !existingStakeholderIds.includes(user.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Stakeholder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="search-user">Search Users</Label>
            <Input
              id="search-user"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">User *</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loading || submitting}
            >
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {searchTerm
                      ? 'No users found matching search'
                      : 'All users are already stakeholders'}
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role (Optional)</Label>
            <Input
              id="role"
              placeholder="e.g., Project Lead, Technical Advisor"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={submitting}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Maximum 100 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || submitting}>
            {submitting ? 'Adding...' : 'Add Stakeholder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
