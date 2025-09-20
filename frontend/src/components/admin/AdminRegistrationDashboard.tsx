import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Mail,
  Building,
  Calendar,
  Users,
  AlertTriangle,
  Eye,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface RegistrationRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  position: string;
  isEmailVerified: boolean;
  adminApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  registrationIP: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface AdminStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalExpired: number;
  recentRegistrations: number;
}

export function AdminRegistrationDashboard() {
  const { user } = useEnhancedAuth();
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<RegistrationRequest[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalExpired: 0,
    recentRegistrations: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationRequest | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRegistrations();
  }, []);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, searchTerm, statusFilter]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pending-registrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to load registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = registrations;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(reg =>
        reg.email.toLowerCase().includes(term) ||
        reg.firstName.toLowerCase().includes(term) ||
        reg.lastName.toLowerCase().includes(term) ||
        reg.organizationName.toLowerCase().includes(term) ||
        reg.position.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(reg => reg.adminApprovalStatus === statusFilter);
    }

    setFilteredRegistrations(filtered);
  };

  const handleApproveRegistration = async (registrationId: string) => {
    setProcessingIds(prev => new Set(prev).add(registrationId));
    try {
      const response = await fetch(`/api/admin/approve-registration/${registrationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadRegistrations(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to approve registration:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registrationId);
        return newSet;
      });
    }
  };

  const handleRejectRegistration = async (registrationId: string) => {
    setProcessingIds(prev => new Set(prev).add(registrationId));
    try {
      const response = await fetch(`/api/admin/reject-registration/${registrationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadRegistrations(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to reject registration:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(registrationId);
        return newSet;
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!user || !user.roles?.includes('admin')) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page. Admin access required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Registration Management</h1>
          <p className="text-gray-600">Manage user registration requests and approvals</p>
        </div>
        <Button onClick={loadRegistrations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{stats.totalApproved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.totalRejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold">{stats.totalExpired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Recent (7d)</p>
                <p className="text-2xl font-bold">{stats.recentRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by name, email, organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status as any)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Requests</CardTitle>
          <CardDescription>
            {filteredRegistrations.length} of {registrations.length} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No registration requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistrations.map((registration) => (
                <Card key={registration.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="font-semibold">
                              {registration.firstName} {registration.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">{registration.email}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(registration.adminApprovalStatus)}>
                            {getStatusIcon(registration.adminApprovalStatus)}
                            <span className="ml-1">{registration.adminApprovalStatus}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{registration.organizationName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{registration.position}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDistanceToNow(new Date(registration.createdAt), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{registration.isEmailVerified ? 'Verified' : 'Unverified'}</span>
                          </div>
                        </div>
                      </div>

                      {registration.adminApprovalStatus === 'PENDING' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRegistration(registration.id)}
                            disabled={processingIds.has(registration.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            {processingIds.has(registration.id) ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectRegistration(registration.id)}
                            disabled={processingIds.has(registration.id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            {processingIds.has(registration.id) ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRegistration(registration)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Detail Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Registration Details
                <Button variant="outline" size="sm" onClick={() => setSelectedRegistration(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Name</label>
                  <p>{selectedRegistration.firstName} {selectedRegistration.lastName}</p>
                </div>
                <div>
                  <label className="font-medium">Email</label>
                  <p>{selectedRegistration.email}</p>
                </div>
                <div>
                  <label className="font-medium">Organization</label>
                  <p>{selectedRegistration.organizationName}</p>
                </div>
                <div>
                  <label className="font-medium">Position</label>
                  <p>{selectedRegistration.position}</p>
                </div>
                <div>
                  <label className="font-medium">Status</label>
                  <Badge variant={getStatusBadgeVariant(selectedRegistration.adminApprovalStatus)}>
                    {selectedRegistration.adminApprovalStatus}
                  </Badge>
                </div>
                <div>
                  <label className="font-medium">Email Verified</label>
                  <p>{selectedRegistration.isEmailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="font-medium">Registration Date</label>
                  <p>{format(new Date(selectedRegistration.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <label className="font-medium">Expires</label>
                  <p>{format(new Date(selectedRegistration.expiresAt), 'PPpp')}</p>
                </div>
              </div>
              <div>
                <label className="font-medium">Registration IP</label>
                <p className="text-sm text-gray-600">{selectedRegistration.registrationIP}</p>
              </div>
              <div>
                <label className="font-medium">User Agent</label>
                <p className="text-sm text-gray-600 break-all">{selectedRegistration.userAgent}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}