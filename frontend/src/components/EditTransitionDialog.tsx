import { useState, useEffect } from "react";
import { enhancedTransitionApi, EnhancedTransition, Contract } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContractSelector } from "@/components/ContractSelector";
import { Edit, XIcon } from "lucide-react";
import UserManagementApi, { User } from "@/services/userManagementApi";

interface EditTransitionDialogProps {
  transition: EnhancedTransition;
  onTransitionUpdated: (transition: EnhancedTransition) => void;
  userRole: string;
  trigger?: React.ReactNode;
}

export function EditTransitionDialog({
  transition,
  onTransitionUpdated,
  userRole,
  trigger
}: EditTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // User search and selection
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const [formData, setFormData] = useState({
    name: transition.name || '',
    description: transition.description || '',
    startDate: transition.startDate ? transition.startDate.split('T')[0] : '',
    endDate: transition.endDate ? transition.endDate.split('T')[0] : '',
    duration: transition.duration,
    keyPersonnel: transition.keyPersonnel || '',
    status: transition.status,
    requiresContinuousService: transition.requiresContinuousService,
    transitionLevel: transition.transitionLevel || 'OPERATIONAL',
  });

  // Initialize selected contract when dialog opens
  useEffect(() => {
    if (open && transition.contract) {
      setSelectedContract(transition.contract);
    }
  }, [open, transition.contract]);

  // Fetch existing users
  useEffect(() => {
    if (!showUserSearch) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await UserManagementApi.getUsers({
          page: 1,
          pageSize: 100,
          searchTerm: userSearchTerm || undefined,
          accountStatus: 'ACTIVE'
        });
        setExistingUsers(response.users);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [userSearchTerm, showUserSearch]);

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    console.log('Selected contract:', contract.contractName, contract.contractNumber);
  };

  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchTerm("");
    setShowUserSearch(false);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert selected users to a string format for keyPersonnel
      const keyPersonnelString = selectedUsers.length > 0
        ? selectedUsers.map(u => `${u.firstName} ${u.lastName} (${u.email})`).join(', ')
        : formData.keyPersonnel;

      // Prepare update data
      const updateData: any = {
        ...formData,
        contractId: selectedContract?.id || transition.contractId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        keyPersonnel: keyPersonnelString || undefined,
        description: formData.description || undefined,
      };

      const updatedTransition = await enhancedTransitionApi.update(transition.id, updateData);
      onTransitionUpdated(updatedTransition);
      setOpen(false);
    } catch (err) {
      console.error('Failed to update transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transition');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = userRole === 'program_manager' || userRole === 'director' || userRole === 'admin';

  if (!canEdit) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Edit className="h-4 w-4 mr-2" />
      Edit Transition
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transition</DialogTitle>
          <DialogDescription>
            Update the transition details and associated contract information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error: {error}
            </div>
          )}

          {/* Contract Selection Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-4">Contract Information</h3>
            <ContractSelector
              selectedContract={selectedContract}
              onContractSelect={handleContractSelect}
              className="space-y-3"
            />
          </div>

          {/* Transition Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transition Details</h3>

            <div>
              <Label htmlFor="name">Transition Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Phase 2 Service Transition"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this transition..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as EnhancedTransition['duration'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="THIRTY_DAYS">30 Days</option>
                  <option value="FORTY_FIVE_DAYS">45 Days</option>
                  <option value="SIXTY_DAYS">60 Days</option>
                  <option value="NINETY_DAYS">90 Days</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EnhancedTransition['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="ON_TRACK">On Track</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="transitionLevel">Transition Type *</Label>
              <select
                id="transitionLevel"
                value={formData.transitionLevel}
                onChange={(e) => setFormData({ ...formData, transitionLevel: e.target.value as EnhancedTransition['transitionLevel'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="MAJOR">Major Transition</option>
                <option value="PERSONNEL">Personnel Transition</option>
                <option value="OPERATIONAL">Operational Change</option>
              </select>
            </div>

            {/* Key Personnel - User Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="keyPersonnel">Key Personnel</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserSearch(!showUserSearch)}
                >
                  {showUserSearch ? 'Cancel' : '+ Add from Users'}
                </Button>
              </div>

              {/* Selected Users Display */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{user.firstName} {user.lastName}</span>
                      <button
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* User Search */}
              {showUserSearch && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50">
                  <Label htmlFor="userSearch" className="text-sm">Search System Users</Label>
                  <Input
                    id="userSearch"
                    placeholder="Search by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    disabled={loadingUsers}
                    className="mt-1"
                  />
                  {userSearchTerm && existingUsers.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-white">
                      {existingUsers.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                          onClick={() => addUser(user)}
                        >
                          <div>
                            <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                          <Button size="sm" variant="ghost" type="button">Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {userSearchTerm && existingUsers.length === 0 && !loadingUsers && (
                    <div className="mt-2 p-2 text-sm text-gray-500 text-center">
                      No users found
                    </div>
                  )}
                </div>
              )}

              {/* Fallback text input for manual entry */}
              {!showUserSearch && selectedUsers.length === 0 && (
                <Textarea
                  id="keyPersonnel"
                  value={formData.keyPersonnel}
                  onChange={(e) => setFormData({ ...formData, keyPersonnel: e.target.value })}
                  placeholder="Or manually enter key personnel names..."
                  rows={2}
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="requiresContinuousService"
                type="checkbox"
                checked={formData.requiresContinuousService}
                onChange={(e) => setFormData({ ...formData, requiresContinuousService: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="requiresContinuousService">Requires continuous service</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
