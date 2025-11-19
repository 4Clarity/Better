import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserCard } from '@/components/UserManagement/UserCard';
import { UserInviteDialog } from '@/components/UserManagement/UserInviteDialog';
import { UserDetailDialog } from '@/components/UserManagement/UserDetailDialog';
import { AdvancedSearchDialog } from '@/components/UserManagement/AdvancedSearchDialog';
import { SecurityDashboard } from '@/components/UserManagement/SecurityDashboard';
import { UserManagementApi, type User, type SecurityDashboard as SecurityDashboardType, type UserInvitationData } from '@/services/userManagementApi';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Building
} from 'lucide-react';


export function UserManagementPage() {
  const { user: currentUser } = useAuth(); // Get current authenticated user
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [securityData, setSecurityData] = useState<SecurityDashboardType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const [activeTransitions, setActiveTransitions] = useState<any[]>([]);
  const [businessOperations, setBusinessOperations] = useState<any[]>([]);
  const [selectedBusinessOp, setSelectedBusinessOp] = useState<string>('all');
  const [stakeholders, setStakeholders] = useState<User[]>([]);
  const [stakeholdersLoading, setStakeholdersLoading] = useState(false);

  // Load users from API
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, statusFilter, roleFilter, advancedFilters]);

  // Load security dashboard data
  useEffect(() => {
    loadSecurityData();
  }, []);

  // Load active transitions
  useEffect(() => {
    loadActiveTransitions();
  }, []);

  // Load business operations
  useEffect(() => {
    loadBusinessOperations();
  }, []);

  // Load stakeholders when business operation filter changes
  useEffect(() => {
    if (selectedBusinessOp) {
      loadStakeholders();
    }
  }, [selectedBusinessOp]);

  const loadActiveTransitions = async () => {
    try {
      const response = await fetch('http://api.tip.localhost/api/enhanced-transitions?status=ACTIVE&limit=10');
      if (response.ok) {
        const data = await response.json();
        // Ensure we always set an array
        const transitions = Array.isArray(data.transitions)
          ? data.transitions
          : Array.isArray(data)
            ? data
            : [];
        setActiveTransitions(transitions);
      }
    } catch (err) {
      console.error('Error loading transitions:', err);
      setActiveTransitions([]);
    }
  };

  const loadBusinessOperations = async () => {
    try {
      const response = await fetch('http://api.tip.localhost/api/business-operations');
      if (response.ok) {
        const data = await response.json();
        // Ensure we always set an array
        const bizOps = Array.isArray(data.businessOperations)
          ? data.businessOperations
          : Array.isArray(data)
            ? data
            : [];
        setBusinessOperations(bizOps);

        // Set default to current user's business operation if available
        if (currentUser && bizOps.length > 0) {
          // Try to find user's business operation from their organization affiliations
          const userBusinessOp = bizOps[0]?.id; // Default to first for now
          setSelectedBusinessOp(userBusinessOp || 'all');
        }
      }
    } catch (err) {
      console.error('Error loading business operations:', err);
      setBusinessOperations([]);
    }
  };

  const loadStakeholders = async () => {
    try {
      setStakeholdersLoading(true);
      const params: any = {
        page: 1,
        pageSize: 100,
      };

      // Filter by business operation if not "all"
      if (selectedBusinessOp && selectedBusinessOp !== 'all') {
        params.organizationId = selectedBusinessOp;
      }

      const response = await UserManagementApi.getUsers(params);
      setStakeholders(response.users);
    } catch (err) {
      console.error('Error loading stakeholders:', err);
      setStakeholders([]);
    } finally {
      setStakeholdersLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: currentPage,
        pageSize,
      };
      
      // Apply simple filters
      if (searchTerm) params.searchTerm = searchTerm;
      if (statusFilter !== 'all') params.accountStatus = statusFilter;
      if (roleFilter !== 'all') params.role = roleFilter;
      
      // Apply advanced filters
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : true)) {
          if (Array.isArray(value)) {
            params[key] = value.join(',');
          } else {
            params[key] = value;
          }
        }
      });
      
      const response = await UserManagementApi.getUsers(params);
      
      setUsers(response.users);
      setFilteredUsers(response.users);
      
      // Handle pagination safely
      if (response.pagination && response.pagination.totalPages !== undefined) {
        setTotalPages(response.pagination.totalPages);
      } else {
        // Fallback calculation if pagination is missing
        const totalUsers = (response as any).totalCount || response.users?.length || 0;
        const pageSize = params.pageSize || 25;
        setTotalPages(Math.ceil(totalUsers / pageSize));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityData = async () => {
    try {
      const data = await UserManagementApi.getSecurityDashboard();
      setSecurityData(data);
    } catch (err) {
      console.error('Error loading security data:', err);
    }
  };

  const handleInviteUser = async (invitationData: UserInvitationData) => {
    try {
      await UserManagementApi.inviteUser(invitationData);
      setIsInviteDialogOpen(false);
      loadUsers(); // Reload users to show the new invitation
      loadSecurityData(); // Reload dashboard data
    } catch (err) {
      console.error('Error inviting user:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        invitationData
      });
      alert(err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedUser(userId);
    setUserDetailDialogOpen(true);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setFilteredUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    loadSecurityData(); // Reload dashboard data
  };

  const handleAdvancedFiltersChange = (filters: any) => {
    setAdvancedFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleResetAdvancedFilters = () => {
    setAdvancedFilters({});
    setCurrentPage(1);
  };

  // Helper function to determine if a user is the current user
  const isCurrentUser = (user: User) => {
    return currentUser && (
      user.id === currentUser.id ||
      user.person.primaryEmail === currentUser.email
    );
  };

  // Helper function to sort users with current user first
  const getSortedUsers = (userList: User[]) => {
    return [...userList].sort((a, b) => {
      const aIsCurrent = isCurrentUser(a);
      const bIsCurrent = isCurrentUser(b);

      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return 0; // Keep original order for other users
    });
  };

  const handleManageAccess = (userId: string) => {
    console.log('Managing access for user:', userId);
    // Open access management modal
  };

  const handleUpdateStatus = async (userId: string, status: string, reasonCode?: string, reason?: string) => {
    try {
      await UserManagementApi.updateUserStatus(userId, {
        accountStatus: status as any,
        reasonCode: reasonCode,
        statusReason: reason,
      });
      loadUsers(); // Reload users to show the updated status
      loadSecurityData(); // Reload dashboard data
    } catch (err) {
      console.error('Error updating user status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleReactivateUser = async (userId: string, reason?: string) => {
    try {
      await UserManagementApi.reactivateUser(userId, reason);
      loadUsers(); // Reload users to show the updated status
      loadSecurityData(); // Reload dashboard data
    } catch (err) {
      console.error('Error reactivating user:', err);
      alert(err instanceof Error ? err.message : 'Failed to reactivate user account');
    }
  };

  const getStatusCounts = () => {
    if (!securityData) {
      return {
        all: users.length,
        ACTIVE: users.filter(u => u.accountStatus === 'ACTIVE').length,
        PENDING: users.filter(u => u.accountStatus === 'PENDING').length,
        SUSPENDED: users.filter(u => u.accountStatus === 'SUSPENDED').length,
        DEACTIVATED: users.filter(u => u.accountStatus === 'DEACTIVATED').length,
      };
    }
    return {
      all: securityData.totalUsers,
      ACTIVE: securityData.activeUsers,
      PENDING: securityData.pendingInvitations,
      SUSPENDED: 0, // TODO: Add to security dashboard API
      DEACTIVATED: 0, // TODO: Add to security dashboard API
    };
  };

  const statusCounts = getStatusCounts();

  const StatusFilterButton = ({ status, label, icon: Icon }: { status: string; label: string; icon: React.ElementType }) => (
    <button
      onClick={() => setStatusFilter(status)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        statusFilter === status
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <Badge variant="secondary" className="ml-1">
        {statusCounts[status as keyof typeof statusCounts]}
      </Badge>
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user accounts, roles, and security access
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          
          <UserInviteDialog
            isOpen={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
            onInvite={handleInviteUser}
            currentUserId={currentUser?.id || null}
            trigger={
              <Button className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>Invite User</span>
              </Button>
            }
          />
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="stakeholders" className="flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>Stakeholders</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="transitions" className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Transitions</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Access Management</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <StatusFilterButton status="all" label="All Users" icon={Users} />
            <StatusFilterButton status="ACTIVE" label="Active" icon={CheckCircle} />
            <StatusFilterButton status="PENDING" label="Pending" icon={Clock} />
            <StatusFilterButton status="INACTIVE" label="Inactive" icon={XCircle} />
            <StatusFilterButton status="DEACTIVATED" label="Deactivated" icon={XCircle} />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-64">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Government Program Manager">Government PM</SelectItem>
                  <SelectItem value="Security Officer">Security Officer</SelectItem>
                  <SelectItem value="Departing Contractor">Departing Contractor</SelectItem>
                  <SelectItem value="Incoming Contractor">Incoming Contractor</SelectItem>
                  <SelectItem value="Observer">Observer</SelectItem>
                </SelectContent>
              </Select>
              
              <AdvancedSearchDialog
                filters={advancedFilters}
                onFiltersChange={handleAdvancedFiltersChange}
                onReset={handleResetAdvancedFilters}
              >
                <Button variant="outline" className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Advanced</span>
                </Button>
              </AdvancedSearchDialog>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <XCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error Loading Users</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
              <Button onClick={loadUsers} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          {/* Users Grid */}
          {!loading && !error && (
            <>
              <div data-testid="user-grid" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {getSortedUsers(filteredUsers).map(user => (
                  <div key={user.id} className={`relative ${isCurrentUser(user) ? "ring-2 ring-blue-500 ring-opacity-50 rounded-lg" : ""}`}>
                    <UserCard
                      user={user}
                      onViewDetails={handleViewDetails}
                      onManageAccess={handleManageAccess}
                      onUpdateStatus={handleUpdateStatus}
                      onReactivateUser={handleReactivateUser}
                    />
                    {isCurrentUser(user) && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full z-10">
                        Your Account
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}

          {!loading && !error && filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stakeholders" className="space-y-6">
          {/* Business Operation Selector */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stakeholders by Business Operation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and manage stakeholders for each business operation</p>
            </div>
            <div className="w-64">
              <Select value={selectedBusinessOp} onValueChange={setSelectedBusinessOp}>
                <SelectTrigger>
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select Business Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stakeholders</SelectItem>
                  {businessOperations.map((bizOp) => (
                    <SelectItem key={bizOp.id} value={bizOp.id}>
                      {bizOp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stakeholders Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stakeholders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stakeholders.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stakeholders.filter(u => u.accountStatus === 'ACTIVE').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Operations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{businessOperations.length}</p>
                </div>
                <Building className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Loading State */}
          {stakeholdersLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading stakeholders...</span>
            </div>
          )}

          {/* Stakeholders Grid */}
          {!stakeholdersLoading && stakeholders.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {stakeholders.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onViewDetails={handleViewDetails}
                  onManageAccess={handleManageAccess}
                  onUpdateStatus={handleUpdateStatus}
                  onReactivateUser={handleReactivateUser}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!stakeholdersLoading && stakeholders.length === 0 && (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No stakeholders found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedBusinessOp === 'all'
                  ? 'There are no stakeholders in the system.'
                  : 'No stakeholders found for this business operation.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {securityData ? (
            <SecurityDashboard data={securityData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading security data...</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transitions" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Transition User Management</h3>
                <p className="text-gray-600 dark:text-gray-400">Manage user access for active transitions</p>
              </div>
            </div>
            
            {/* Active transitions list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTransitions.length === 0 ? (
                <div className="col-span-3 text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Active Transitions</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    There are no active transitions at this time.
                  </p>
                </div>
              ) : (
                activeTransitions.slice(0, 6).map((transition) => (
                  <div key={transition.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{transition.name || 'Unnamed Transition'}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{transition.contract?.contractNumber || 'N/A'}</p>
                      </div>
                      <Badge variant="success">{transition.status}</Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                        <span className="font-medium">{new Date(transition.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                        <span className="font-medium">{new Date(transition.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center space-x-2"
                      onClick={() => window.open(`/transitions/${transition.id}/users`, '_blank')}
                    >
                      <Users className="w-4 h-4" />
                      <span>Manage Users</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="access" className="space-y-6">
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Access Management</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Advanced access management features coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Detail Dialog */}
      <UserDetailDialog
        userId={selectedUser}
        isOpen={userDetailDialogOpen}
        onOpenChange={setUserDetailDialogOpen}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
