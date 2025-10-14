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

interface SelectUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  title: string;
  currentUserId?: string;
}

export function SelectUserDialog({
  isOpen,
  onClose,
  onSelect,
  title,
  currentUserId,
}: SelectUserDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentUserId || '');
      fetchUsers();
    }
  }, [isOpen, searchTerm, currentUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await UserManagementApi.getUsers({
        page: 1,
        pageSize: 100,
        searchTerm: searchTerm || undefined,
      });
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    onSelect(selectedUserId);
    handleClose();
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSearchTerm('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
              disabled={loading}
            >
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {loading ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {searchTerm
                      ? 'No users found matching search'
                      : 'No users available'}
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId}>
            Select User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
