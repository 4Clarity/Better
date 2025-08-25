import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserManagementApi, type User } from '@/services/userManagementApi';
import {
  User as UserIcon,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
  FileText,
} from 'lucide-react';

interface UserDetailDialogProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate?: (user: User) => void;
}

export function UserDetailDialog({ userId, isOpen, onOpenChange, onUserUpdate }: UserDetailDialogProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState(false);
  const [personalFormData, setPersonalFormData] = useState<any>({});
  const [securityFormData, setSecurityFormData] = useState<any>({});

  // Load user data when dialog opens
  useEffect(() => {
    if (userId && isOpen) {
      loadUser();
    }
  }, [userId, isOpen]);

  const loadUser = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const userData = await UserManagementApi.getUserById(userId);
      setUser(userData);
      setPersonalFormData({
        firstName: userData.person.firstName,
        lastName: userData.person.lastName,
        middleName: userData.person.middleName || '',
        preferredName: userData.person.preferredName || '',
        title: userData.person.title || '',
        primaryEmail: userData.person.primaryEmail,
        alternateEmail: userData.person.alternateEmail || '',
        workPhone: userData.person.workPhone || '',
        mobilePhone: userData.person.mobilePhone || '',
        workLocation: userData.person.workLocation || '',
        professionalSummary: userData.person.professionalSummary || '',
      });
      setSecurityFormData({
        securityClearanceLevel: userData.person.securityClearanceLevel || 'NONE',
        clearanceExpirationDate: userData.person.clearanceExpirationDate ? 
          new Date(userData.person.clearanceExpirationDate).toISOString().split('T')[0] : '',
        pivStatus: userData.person.pivStatus,
        pivExpirationDate: userData.person.pivExpirationDate ? 
          new Date(userData.person.pivExpirationDate).toISOString().split('T')[0] : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const response = await UserManagementApi.updatePerson(user.person.id, personalFormData);
      const updatedUser = { ...user, person: { ...user.person, ...response.person } };
      setUser(updatedUser);
      setEditingPersonal(false);
      onUserUpdate?.(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update personal information');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const response = await UserManagementApi.updateUserSecurity(user.id, {
        ...securityFormData,
        clearanceExpirationDate: securityFormData.clearanceExpirationDate || undefined,
        pivExpirationDate: securityFormData.pivExpirationDate || undefined,
      });
      const updatedUser = { ...user, person: { ...user.person, ...response.person } };
      setUser(updatedUser);
      setEditingSecurity(false);
      onUserUpdate?.(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update security information');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!user) return;
    
    try {
      await UserManagementApi.resendInvitation(user.id);
      alert('Invitation resent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'SUSPENDED': return 'destructive';
      case 'DEACTIVATED': return 'secondary';
      default: return 'outline';
    }
  };

  const getPivStatusColor = (pivStatus: string) => {
    switch (pivStatus) {
      case 'PIV_VERIFIED': return 'success';
      case 'PIV_EXCEPTION_INTERIM': return 'warning';
      case 'PIV_EXPIRED': case 'PIV_SUSPENDED': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen || !userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserIcon className="w-6 h-6" />
            <span>User Details</span>
          </DialogTitle>
          <DialogDescription>
            View and manage user information, security settings, and access permissions.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading user details...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {user && !loading && (
          <>
            {/* Header with basic info */}
            <div className="flex items-start justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
                    {user.person.firstName[0]}{user.person.lastName[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.person.firstName} {user.person.lastName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={getStatusColor(user.accountStatus) as any}>
                      {user.accountStatus}
                    </Badge>
                    {user.person.title && (
                      <Badge variant="outline">{user.person.title}</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {user.accountStatus === 'PENDING' && (
                  <Button onClick={handleResendInvitation} variant="outline" size="sm">
                    Resend Invitation
                  </Button>
                )}
                <Badge variant={getPivStatusColor(user.person.pivStatus) as any}>
                  PIV: {user.person.pivStatus.replace('PIV_', '').replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="roles">Roles & Access</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <Button
                    variant={editingPersonal ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      if (editingPersonal) {
                        setEditingPersonal(false);
                        // Reset form data
                        setPersonalFormData({
                          firstName: user.person.firstName,
                          lastName: user.person.lastName,
                          middleName: user.person.middleName || '',
                          preferredName: user.person.preferredName || '',
                          title: user.person.title || '',
                          primaryEmail: user.person.primaryEmail,
                          alternateEmail: user.person.alternateEmail || '',
                          workPhone: user.person.workPhone || '',
                          mobilePhone: user.person.mobilePhone || '',
                          workLocation: user.person.workLocation || '',
                          professionalSummary: user.person.professionalSummary || '',
                        });
                      } else {
                        setEditingPersonal(true);
                      }
                    }}
                    className="flex items-center space-x-2"
                  >
                    {editingPersonal ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    <span>{editingPersonal ? 'Cancel' : 'Edit'}</span>
                  </Button>
                </div>

                {editingPersonal ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={personalFormData.firstName}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={personalFormData.lastName}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, lastName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={personalFormData.middleName}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, middleName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preferredName">Preferred Name</Label>
                      <Input
                        id="preferredName"
                        value={personalFormData.preferredName}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, preferredName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={personalFormData.title}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workLocation">Work Location</Label>
                      <Input
                        id="workLocation"
                        value={personalFormData.workLocation}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, workLocation: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="primaryEmail">Primary Email *</Label>
                      <Input
                        id="primaryEmail"
                        type="email"
                        value={personalFormData.primaryEmail}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, primaryEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="alternateEmail">Alternate Email</Label>
                      <Input
                        id="alternateEmail"
                        type="email"
                        value={personalFormData.alternateEmail}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, alternateEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workPhone">Work Phone</Label>
                      <Input
                        id="workPhone"
                        value={personalFormData.workPhone}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, workPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobilePhone">Mobile Phone</Label>
                      <Input
                        id="mobilePhone"
                        value={personalFormData.mobilePhone}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, mobilePhone: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="professionalSummary">Professional Summary</Label>
                      <Input
                        id="professionalSummary"
                        value={personalFormData.professionalSummary}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, professionalSummary: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 flex space-x-2">
                      <Button onClick={handleSavePersonal} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{user.person.primaryEmail}</p>
                          <p className="text-sm text-gray-500">Primary Email</p>
                        </div>
                      </div>
                      
                      {user.person.alternateEmail && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{user.person.alternateEmail}</p>
                            <p className="text-sm text-gray-500">Alternate Email</p>
                          </div>
                        </div>
                      )}
                      
                      {user.person.workPhone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium">{user.person.workPhone}</p>
                            <p className="text-sm text-gray-500">Work Phone</p>
                          </div>
                        </div>
                      )}
                      
                      {user.person.mobilePhone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="font-medium">{user.person.mobilePhone}</p>
                            <p className="text-sm text-gray-500">Mobile Phone</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {user.person.workLocation && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium">{user.person.workLocation}</p>
                            <p className="text-sm text-gray-500">Work Location</p>
                          </div>
                        </div>
                      )}
                      
                      {user.organizationAffiliations && user.organizationAffiliations.length > 0 && (
                        <div className="flex items-start space-x-2">
                          <Building className="w-5 h-5 text-purple-500 mt-1" />
                          <div>
                            <p className="font-medium">{user.organizationAffiliations[0].organization?.name}</p>
                            <p className="text-sm text-gray-500">Organization</p>
                            {user.organizationAffiliations[0].jobTitle && (
                              <p className="text-sm text-gray-600">{user.organizationAffiliations[0].jobTitle}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {user.person.professionalSummary && (
                        <div className="flex items-start space-x-2">
                          <FileText className="w-5 h-5 text-gray-500 mt-1" />
                          <div>
                            <p className="font-medium">Professional Summary</p>
                            <p className="text-sm text-gray-600">{user.person.professionalSummary}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Security & Clearance</h3>
                  <Button
                    variant={editingSecurity ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      if (editingSecurity) {
                        setEditingSecurity(false);
                      } else {
                        setEditingSecurity(true);
                      }
                    }}
                    className="flex items-center space-x-2"
                  >
                    {editingSecurity ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    <span>{editingSecurity ? 'Cancel' : 'Edit'}</span>
                  </Button>
                </div>

                {editingSecurity ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="securityClearanceLevel">Security Clearance Level</Label>
                      <Select
                        value={securityFormData.securityClearanceLevel}
                        onValueChange={(value) => setSecurityFormData({ ...securityFormData, securityClearanceLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="PUBLIC_TRUST">Public Trust</SelectItem>
                          <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                          <SelectItem value="SECRET">Secret</SelectItem>
                          <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
                          <SelectItem value="TS_SCI">TS/SCI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="clearanceExpirationDate">Clearance Expiration Date</Label>
                      <Input
                        id="clearanceExpirationDate"
                        type="date"
                        value={securityFormData.clearanceExpirationDate}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, clearanceExpirationDate: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pivStatus">PIV Status</Label>
                      <Select
                        value={securityFormData.pivStatus}
                        onValueChange={(value) => setSecurityFormData({ ...securityFormData, pivStatus: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PIV_VERIFIED">PIV Verified</SelectItem>
                          <SelectItem value="PIV_EXCEPTION_PENDING">PIV Exception - Pending</SelectItem>
                          <SelectItem value="PIV_EXCEPTION_INTERIM">PIV Exception - Interim</SelectItem>
                          <SelectItem value="PIV_EXPIRED">PIV Expired</SelectItem>
                          <SelectItem value="PIV_SUSPENDED">PIV Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pivExpirationDate">PIV Expiration Date</Label>
                      <Input
                        id="pivExpirationDate"
                        type="date"
                        value={securityFormData.pivExpirationDate}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, pivExpirationDate: e.target.value })}
                      />
                    </div>
                    
                    <div className="col-span-2 flex space-x-2">
                      <Button onClick={handleSaveSecurity} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-blue-500" />
                        <div>
                          <p className="font-medium">Security Clearance</p>
                          <p className="text-lg text-gray-900 dark:text-white">
                            {user.person.securityClearanceLevel?.replace(/_/g, ' ') || 'None'}
                          </p>
                          {user.person.clearanceExpirationDate && (
                            <p className="text-sm text-gray-500">
                              Expires: {formatDate(user.person.clearanceExpirationDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <CheckCircle className={`w-6 h-6 ${getPivStatusColor(user.person.pivStatus) === 'success' ? 'text-green-500' : 'text-orange-500'}`} />
                        <div>
                          <p className="font-medium">PIV Status</p>
                          <p className="text-lg text-gray-900 dark:text-white">
                            {user.person.pivStatus.replace('PIV_', '').replace(/_/g, ' ')}
                          </p>
                          {user.person.pivExpirationDate && (
                            <p className="text-sm text-gray-500">
                              Expires: {formatDate(user.person.pivExpirationDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-medium mb-2">Security Timeline</h4>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <p>Account created: {formatDate(user.createdAt)}</p>
                          <p>Last updated: {formatDate(user.updatedAt)}</p>
                          {user.lastLoginAt && (
                            <p>Last login: {formatDate(user.lastLoginAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="roles" className="space-y-4">
                <h3 className="text-lg font-semibold">Roles & Permissions</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Assigned Roles</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.roles.map((role, index) => (
                        <Badge key={index} variant="default">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Session Settings</Label>
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm">
                        Session Timeout: {user.sessionTimeout ? `${user.sessionTimeout} minutes` : 'Default (30 minutes)'}
                      </p>
                      {user.allowedIpRanges && user.allowedIpRanges.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Allowed IP Ranges:</p>
                          <ul className="text-sm text-gray-600 dark:text-gray-400">
                            {user.allowedIpRanges.map((ip, index) => (
                              <li key={index}>• {ip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Account Status Changes</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      <p className="text-sm text-gray-600">
                        Current status: <Badge variant={getStatusColor(user.accountStatus) as any}>{user.accountStatus}</Badge>
                      </p>
                      {user.statusReason && (
                        <p className="text-sm text-gray-500">Reason: {user.statusReason}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Important Dates</span>
                    </div>
                    <div className="pl-6 space-y-1 text-sm">
                      <p>Account created: {formatDate(user.createdAt)}</p>
                      <p>Profile updated: {formatDate(user.updatedAt)}</p>
                      {user.lastLoginAt && <p>Last login: {formatDate(user.lastLoginAt)}</p>}
                      {user.invitationExpiresAt && (
                        <p>Invitation expires: {formatDate(user.invitationExpiresAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}