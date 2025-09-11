import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Mail, Phone, Building, Clock, AlertTriangle, Check, X, Eye, RotateCcw } from 'lucide-react';
import { type User } from '@/services/userManagementApi';

interface UserCardProps {
  user: User;
  onViewDetails: (userId: string) => void;
  onManageAccess: (userId: string) => void;
  onUpdateStatus: (userId: string, status: string, reason?: string) => void;
  onReactivateUser?: (userId: string, reason?: string) => void;
  showActions?: boolean;
}

export function UserCard({ user, onViewDetails, onManageAccess, onUpdateStatus, onReactivateUser, showActions = true }: UserCardProps) {
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

  const getClearanceLevel = (level?: string) => {
    if (!level) return 'None';
    return level.replace(/_/g, ' ');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const primaryOrg = user.organizationAffiliations?.[0]; // Get first affiliation
  const isNearExpiration = user.person.clearanceExpirationDate && 
    new Date(user.person.clearanceExpirationDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
              {user.person.firstName[0]}{user.person.lastName[0]}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.person.firstName} {user.person.lastName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1">
          <Badge variant={getStatusColor(user.accountStatus) as any}>
            {user.accountStatus}
          </Badge>
          {user.accountStatus === 'PENDING' && user.invitationToken && (
            <Badge variant="warning">Invited</Badge>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-2 mb-4">
        {user.person.title && (
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {user.person.title}
          </p>
        )}
        
        {primaryOrg && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Building className="w-4 h-4" />
            <span>{primaryOrg.organization?.name}</span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Mail className="w-4 h-4" />
          <span>{user.person.primaryEmail}</span>
          {/* TODO: Add email verification status to API */}
          <Check className="w-4 h-4 text-green-500" />
        </div>
        
        {user.person.workPhone && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            <span>{user.person.workPhone}</span>
          </div>
        )}
      </div>

      {/* Security Information */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Security Clearance</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {getClearanceLevel(user.person.securityClearanceLevel)}
            </Badge>
            {isNearExpiration && (
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">PIV Status</span>
          <Badge variant={getPivStatusColor(user.person.pivStatus) as any} className="text-xs">
            {user.person.pivStatus.replace('PIV_', '').replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Roles */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</p>
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Last login: {formatDate(user.lastLoginAt)}</span>
        </div>
        {/* TODO: Add 2FA status to API */}
        <div className="flex items-center space-x-1">
          <Shield className="w-3 h-3 text-gray-400" />
          <span>2FA Status Unknown</span>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(user.id)}
            className="flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>Details</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageAccess(user.id)}
            className="flex items-center space-x-1"
          >
            <Shield className="w-4 h-4" />
            <span>Access</span>
          </Button>
          
          {user.accountStatus === 'PENDING' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(user.id, 'ACTIVE', 'Approved by administrator')}
              className="flex items-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </Button>
          )}
          
          {user.accountStatus === 'ACTIVE' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onUpdateStatus(user.id, 'SUSPENDED', 'Suspended for review')}
              className="flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Suspend</span>
            </Button>
          )}
          
          {user.accountStatus === 'SUSPENDED' && onReactivateUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReactivateUser(user.id, 'Reactivated by administrator')}
              className="flex items-center space-x-1 text-green-600 border-green-200 hover:bg-green-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reactivate</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}