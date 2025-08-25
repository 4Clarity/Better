import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, X, Calendar } from 'lucide-react';

interface SearchFilters {
  searchTerm?: string;
  accountStatus?: string[];
  roles?: string[];
  securityClearanceLevel?: string[];
  pivStatus?: string[];
  organizationId?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  clearanceExpiringIn?: number; // days
  hasPendingInvitation?: boolean;
}

interface AdvancedSearchDialogProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
  children: React.ReactNode;
}

export function AdvancedSearchDialog({ filters, onFiltersChange, onReset, children }: AdvancedSearchDialogProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const accountStatuses = [
    'PENDING',
    'ACTIVE', 
    'INACTIVE',
    'SUSPENDED',
    'LOCKED',
    'EXPIRED',
    'DEACTIVATED'
  ];

  const roles = [
    'Government Program Director',
    'Government Program Manager',
    'Departing Contractor',
    'Incoming Contractor',
    'Security Officer',
    'Observer'
  ];

  const clearanceLevels = [
    'NONE',
    'PUBLIC_TRUST',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TS_SCI'
  ];

  const pivStatuses = [
    'PIV_VERIFIED',
    'PIV_EXCEPTION_PENDING',
    'PIV_EXCEPTION_INTERIM',
    'PIV_EXPIRED',
    'PIV_SUSPENDED'
  ];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const emptyFilters: SearchFilters = {};
    setLocalFilters(emptyFilters);
    onReset();
    setIsOpen(false);
  };

  const handleMultiSelectChange = (
    key: keyof SearchFilters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (localFilters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    setLocalFilters({
      ...localFilters,
      [key]: newValues.length > 0 ? newValues : undefined
    });
  };

  const getActiveFiltersCount = () => {
    return Object.entries(filters).reduce((count, [, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        return count + 1;
      }
      return count;
    }, 0);
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative">
          {children}
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Advanced Search & Filters</span>
          </DialogTitle>
          <DialogDescription>
            Use advanced filters to find specific users based on multiple criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Term */}
          <div>
            <Label htmlFor="searchTerm">General Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="searchTerm"
                placeholder="Search by name, email, username, or phone..."
                value={localFilters.searchTerm || ''}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  searchTerm: e.target.value || undefined
                })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Status */}
            <div>
              <Label>Account Status</Label>
              <div className="mt-2 space-y-2">
                {accountStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={(localFilters.accountStatus || []).includes(status)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('accountStatus', status, checked as boolean)
                      }
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <Label>Roles</Label>
              <div className="mt-2 space-y-2">
                {roles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={(localFilters.roles || []).includes(role)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('roles', role, checked as boolean)
                      }
                    />
                    <Label htmlFor={`role-${role}`} className="text-sm">
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Clearance */}
            <div>
              <Label>Security Clearance Level</Label>
              <div className="mt-2 space-y-2">
                {clearanceLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`clearance-${level}`}
                      checked={(localFilters.securityClearanceLevel || []).includes(level)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('securityClearanceLevel', level, checked as boolean)
                      }
                    />
                    <Label htmlFor={`clearance-${level}`} className="text-sm">
                      {level.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* PIV Status */}
            <div>
              <Label>PIV Status</Label>
              <div className="mt-2 space-y-2">
                {pivStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`piv-${status}`}
                      checked={(localFilters.pivStatus || []).includes(status)}
                      onCheckedChange={(checked) =>
                        handleMultiSelectChange('pivStatus', status, checked as boolean)
                      }
                    />
                    <Label htmlFor={`piv-${status}`} className="text-sm">
                      {status.replace('PIV_', '').replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Date Filters</span>
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="lastLoginAfter">Last Login After</Label>
                <Input
                  id="lastLoginAfter"
                  type="date"
                  value={localFilters.lastLoginAfter || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    lastLoginAfter: e.target.value || undefined
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="lastLoginBefore">Last Login Before</Label>
                <Input
                  id="lastLoginBefore"
                  type="date"
                  value={localFilters.lastLoginBefore || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    lastLoginBefore: e.target.value || undefined
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="createdAfter">Account Created After</Label>
                <Input
                  id="createdAfter"
                  type="date"
                  value={localFilters.createdAfter || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    createdAfter: e.target.value || undefined
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="createdBefore">Account Created Before</Label>
                <Input
                  id="createdBefore"
                  type="date"
                  value={localFilters.createdBefore || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    createdBefore: e.target.value || undefined
                  })}
                />
              </div>
            </div>
          </div>

          {/* Special Filters */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Special Filters</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clearanceExpiringIn">Clearance Expiring Within (days)</Label>
                <Select
                  value={localFilters.clearanceExpiringIn?.toString() || 'all'}
                  onValueChange={(value) => setLocalFilters({
                    ...localFilters,
                    clearanceExpiringIn: value === 'all' ? undefined : parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time frame" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="hasPendingInvitation"
                  checked={localFilters.hasPendingInvitation || false}
                  onCheckedChange={(checked) => setLocalFilters({
                    ...localFilters,
                    hasPendingInvitation: checked as boolean || undefined
                  })}
                />
                <Label htmlFor="hasPendingInvitation">
                  Has Pending Invitation
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {activeFiltersCount > 0 && `${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} active`}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Reset All
            </Button>
            <Button onClick={handleApplyFilters}>
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}