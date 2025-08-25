import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserManagementApi, type User } from '@/services/userManagementApi';
import {
  Users,
  UserPlus,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
} from 'lucide-react';

interface TransitionUser {
  id: string;
  transitionId: string;
  userId: string;
  role: 'PROGRAM_MANAGER' | 'DEPARTING_CONTRACTOR' | 'INCOMING_CONTRACTOR' | 'SECURITY_OFFICER' | 'OBSERVER';
  securityStatus: 'PENDING' | 'IN_PROCESS' | 'INTERIM_CLEARED' | 'CLEARED' | 'DENIED' | 'REVOKED';
  platformAccess: 'DISABLED' | 'READ_ONLY' | 'STANDARD' | 'FULL_ACCESS';
  accessNotes?: string;
  invitedBy: string;
  invitedAt: string;
  user: User;
}

interface TransitionUserManagementProps {
  transitionId: string;
  title?: string;
}

interface UserInviteData {
  userId: string;
  role: 'PROGRAM_MANAGER' | 'DEPARTING_CONTRACTOR' | 'INCOMING_CONTRACTOR' | 'SECURITY_OFFICER' | 'OBSERVER';
  platformAccess: 'DISABLED' | 'READ_ONLY' | 'STANDARD' | 'FULL_ACCESS';
  accessNotes?: string;
}

export function TransitionUserManagement({ transitionId, title = "Transition Users" }: TransitionUserManagementProps) {
  const [transitionUsers, setTransitionUsers] = useState<TransitionUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteFormData, setInviteFormData] = useState<UserInviteData>({
    userId: '',
    role: 'OBSERVER',
    platformAccess: 'READ_ONLY',
    accessNotes: '',
  });
  const [editingUser, setEditingUser] = useState<TransitionUser | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Load transition users and available users
  useEffect(() => {
    if (transitionId) {
      loadTransitionUsers();
      loadAvailableUsers();
    }
  }, [transitionId]);

  const loadTransitionUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await UserManagementApi.getTransitionUsers(transitionId);
      setTransitionUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transition users');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await UserManagementApi.getUsers({
        accountStatus: 'ACTIVE',
        pageSize: 1000, // Get all active users for selection
      });
      setAvailableUsers(response.users);
    } catch (err) {
      console.error('Failed to load available users:', err);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteFormData.userId) {
      setError('Please select a user to invite');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await UserManagementApi.inviteUserToTransition(transitionId, inviteFormData);
      setIsInviteDialogOpen(false);
      setInviteFormData({
        userId: '',
        role: 'OBSERVER',
        platformAccess: 'READ_ONLY',
        accessNotes: '',
      });
      await loadTransitionUsers(); // Reload users
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserAccess = async (transitionUser: TransitionUser, updates: Partial<TransitionUser>) => {
    try {
      setSaving(true);
      setError(null);
      await UserManagementApi.updateTransitionUserAccess(transitionId, transitionUser.userId, updates);
      await loadTransitionUsers(); // Reload users
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user access');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PROGRAM_MANAGER': return 'default';
      case 'DEPARTING_CONTRACTOR': return 'warning';
      case 'INCOMING_CONTRACTOR': return 'success';
      case 'SECURITY_OFFICER': return 'destructive';
      case 'OBSERVER': return 'secondary';
      default: return 'outline';
    }
  };

  const getSecurityStatusColor = (status: string) => {
    switch (status) {
      case 'CLEARED': return 'success';
      case 'INTERIM_CLEARED': return 'warning';
      case 'IN_PROCESS': return 'info';
      case 'PENDING': return 'secondary';
      case 'DENIED': case 'REVOKED': return 'destructive';
      default: return 'outline';
    }
  };

  const getAccessLevelColor = (access: string) => {
    switch (access) {
      case 'FULL_ACCESS': return 'success';
      case 'STANDARD': return 'info';
      case 'READ_ONLY': return 'warning';
      case 'DISABLED': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user => {
    const matchesSearch = userSearchTerm === '' || 
      user.person.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.person.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.person.primaryEmail.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    // Exclude users already assigned to this transition
    const notAlreadyAssigned = !transitionUsers.some(tu => tu.userId === user.id);
    
    return matchesSearch && notAlreadyAssigned;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user access and roles for this transition
          </p>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add User to Transition</DialogTitle>
              <DialogDescription>
                Select a user and configure their role and access level for this transition.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* User Selection */}
              <div>
                <Label htmlFor="userSearch">Search Users</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="userSearch"
                    placeholder="Search by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="userId">Select User</Label>
                <Select
                  value={inviteFormData.userId}
                  onValueChange={(value) => setInviteFormData({ ...inviteFormData, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAvailableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.person.firstName} {user.person.lastName} ({user.person.primaryEmail})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteFormData.role}
                    onValueChange={(value: any) => setInviteFormData({ ...inviteFormData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROGRAM_MANAGER">Program Manager</SelectItem>
                      <SelectItem value="DEPARTING_CONTRACTOR">Departing Contractor</SelectItem>
                      <SelectItem value="INCOMING_CONTRACTOR">Incoming Contractor</SelectItem>
                      <SelectItem value="SECURITY_OFFICER">Security Officer</SelectItem>
                      <SelectItem value="OBSERVER">Observer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="platformAccess">Platform Access</Label>
                  <Select
                    value={inviteFormData.platformAccess}
                    onValueChange={(value: any) => setInviteFormData({ ...inviteFormData, platformAccess: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                      <SelectItem value="READ_ONLY">Read Only</SelectItem>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="FULL_ACCESS">Full Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="accessNotes">Access Notes (Optional)</Label>
                <Textarea
                  id="accessNotes"
                  placeholder="Any additional notes about this user's access..."
                  value={inviteFormData.accessNotes || ''}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, accessNotes: e.target.value })}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 dark:text-red-400">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteUser} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading transition users...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {transitionUsers.map((transitionUser) => (
              <Card key={transitionUser.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                          {transitionUser.user.person.firstName[0]}{transitionUser.user.person.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {transitionUser.user.person.firstName} {transitionUser.user.person.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transitionUser.user.person.primaryEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={getRoleColor(transitionUser.role) as any}>
                      {transitionUser.role.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={getAccessLevelColor(transitionUser.platformAccess) as any}>
                      {transitionUser.platformAccess.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={getSecurityStatusColor(transitionUser.securityStatus) as any}>
                      {transitionUser.securityStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {transitionUser.accessNotes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Notes:</strong> {transitionUser.accessNotes}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <p>Added: {new Date(transitionUser.invitedAt).toLocaleDateString()}</p>
                    <p>By: {transitionUser.invitedBy}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(transitionUser)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to user details or open user detail dialog
                      }}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {transitionUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users assigned</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding users to this transition.
              </p>
            </div>
          )}
        </>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transition User Access</DialogTitle>
              <DialogDescription>
                Update {editingUser.user.person.firstName} {editingUser.user.person.lastName}'s role and access settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: any) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROGRAM_MANAGER">Program Manager</SelectItem>
                      <SelectItem value="DEPARTING_CONTRACTOR">Departing Contractor</SelectItem>
                      <SelectItem value="INCOMING_CONTRACTOR">Incoming Contractor</SelectItem>
                      <SelectItem value="SECURITY_OFFICER">Security Officer</SelectItem>
                      <SelectItem value="OBSERVER">Observer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Security Status</Label>
                  <Select
                    value={editingUser.securityStatus}
                    onValueChange={(value: any) => setEditingUser({ ...editingUser, securityStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROCESS">In Process</SelectItem>
                      <SelectItem value="INTERIM_CLEARED">Interim Cleared</SelectItem>
                      <SelectItem value="CLEARED">Cleared</SelectItem>
                      <SelectItem value="DENIED">Denied</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Platform Access</Label>
                <Select
                  value={editingUser.platformAccess}
                  onValueChange={(value: any) => setEditingUser({ ...editingUser, platformAccess: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                    <SelectItem value="READ_ONLY">Read Only</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="FULL_ACCESS">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Access Notes</Label>
                <Textarea
                  value={editingUser.accessNotes || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, accessNotes: e.target.value })}
                  placeholder="Any additional notes about this user's access..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateUserAccess(editingUser, {
                    role: editingUser.role,
                    securityStatus: editingUser.securityStatus,
                    platformAccess: editingUser.platformAccess,
                    accessNotes: editingUser.accessNotes,
                  })}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}