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
  Loader2
} from 'lucide-react';


export function UserManagementPage() {
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

  // Load users from API
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, statusFilter, roleFilter, advancedFilters]);

  // Load security dashboard data
  useEffect(() => {
    loadSecurityData();
  }, []);

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

  const handleManageAccess = (userId: string) => {
    console.log('Managing access for user:', userId);
    // Open access management modal
  };

  const handleUpdateStatus = async (userId: string, status: string, reason?: string) => {
    try {
      await UserManagementApi.updateUserStatus(userId, {
        accountStatus: status as any,
        statusReason: reason,
      });
      loadUsers(); // Reload users to show the updated status
      loadSecurityData(); // Reload dashboard data
    } catch (err) {
      console.error('Error updating user status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update user status');
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
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
            <StatusFilterButton status="SUSPENDED" label="Suspended" icon={XCircle} />
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
                {filteredUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onViewDetails={handleViewDetails}
                    onManageAccess={handleManageAccess}
                    onUpdateStatus={handleUpdateStatus}
                  />
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
            
            {/* Sample transitions list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((id) => (
                <div key={id} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Transition TIP-00{id}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Defense Contract {id}</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Team Members:</span>
                      <span className="font-medium">{3 + id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Pending Access:</span>
                      <span className="font-medium">{Math.floor(Math.random() * 3)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center justify-center space-x-2"
                    onClick={() => window.open(`/transitions/transition-${id}/users`, '_blank')}
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage Users</span>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">This is a demonstration of transition user management. In production, this would show actual active transitions.</p>
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
