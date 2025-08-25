import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
 
  AlertTriangle, 
  Shield, 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';

interface SecurityDashboardProps {
  data: {
    totalUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    expiringSecurity: number;
    pivStatusCounts: Record<string, number>;
    clearanceLevelCounts: Record<string, number>;
    recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
    }>;
  };
}

export function SecurityDashboard({ data }: SecurityDashboardProps) {
  const {
    totalUsers,
    activeUsers,
    pendingInvitations,
    expiringSecurity,
    // pivStatusCounts, // TODO: Use for detailed PIV status breakdown
    // clearanceLevelCounts, // TODO: Use for detailed clearance level breakdown
    recentActivity,
  } = data;

  // Legacy compatibility - map new data to old structure
  const pendingUsers = pendingInvitations;
  const suspendedUsers = 0; // TODO: Add to API
  const pivExpiringUsers = 0; // TODO: Add to API
  const clearanceExpiringUsers = expiringSecurity;

  const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const pendingPercentage = totalUsers > 0 ? Math.round((pendingUsers / totalUsers) * 100) : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeType,
    variant = 'default'
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    change?: string;
    changeType?: 'increase' | 'decrease' | 'neutral';
    variant?: 'default' | 'warning' | 'danger' | 'success';
  }) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'warning':
          return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
        case 'danger':
          return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
        case 'success':
          return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
        default:
          return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
      }
    };

    const getIconColor = () => {
      switch (variant) {
        case 'warning': return 'text-yellow-600 dark:text-yellow-400';
        case 'danger': return 'text-red-600 dark:text-red-400';
        case 'success': return 'text-green-600 dark:text-green-400';
        default: return 'text-blue-600 dark:text-blue-400';
      }
    };

    return (
      <div className={`p-6 rounded-lg border ${getVariantClasses()}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                {changeType === 'increase' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
                {changeType === 'decrease' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                <span className={`text-sm ${
                  changeType === 'increase' ? 'text-green-600' : 
                  changeType === 'decrease' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${getIconColor()} bg-current bg-opacity-10`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          change={`${activePercentage}% active`}
          changeType="neutral"
        />
        
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={UserCheck}
          change="All verified"
          changeType="increase"
          variant="success"
        />
        
        <StatCard
          title="Pending Approval"
          value={pendingUsers}
          icon={Clock}
          change={`${pendingPercentage}% of total`}
          changeType="neutral"
          variant={pendingUsers > 0 ? 'warning' : 'default'}
        />
        
        <StatCard
          title="Suspended"
          value={suspendedUsers}
          icon={AlertTriangle}
          variant={suspendedUsers > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
              PIV Cards Expiring
            </h3>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <Badge variant="warning">{pivExpiringUsers}</Badge>
            </div>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            {pivExpiringUsers === 0 
              ? 'No PIV cards expiring in the next 30 days'
              : `${pivExpiringUsers} users have PIV cards expiring within 30 days. Review and renew as needed.`
            }
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Security Clearances Expiring
            </h3>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <Badge variant="destructive">{clearanceExpiringUsers}</Badge>
            </div>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            {clearanceExpiringUsers === 0
              ? 'No security clearances expiring in the next 60 days'
              : `${clearanceExpiringUsers} users have security clearances expiring within 60 days. Initiate renewal process.`
            }
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Recent security and user management activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent activity
                </p>
              ) : (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{activity.type}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Overall security and access management status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Security</span>
                <Badge variant="success">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">PIV Compliance</span>
                <Badge variant={pivExpiringUsers > 0 ? "warning" : "success"}>
                  {pivExpiringUsers > 0 ? "Action Needed" : "Compliant"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clearance Status</span>
                <Badge variant={clearanceExpiringUsers > 0 ? "destructive" : "success"}>
                  {clearanceExpiringUsers > 0 ? "Expiring Soon" : "Current"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Approvals</span>
                <Badge variant={pendingUsers > 0 ? "warning" : "success"}>
                  {pendingUsers > 0 ? `${pendingUsers} Pending` : "None"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Review Pending Users</p>
                  <p className="text-sm text-gray-500">Approve or reject user accounts</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Security Audit</p>
                  <p className="text-sm text-gray-500">Run comprehensive security check</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">Expiration Alerts</p>
                  <p className="text-sm text-gray-500">Manage PIV and clearance alerts</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}