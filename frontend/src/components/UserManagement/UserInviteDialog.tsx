import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, User, Shield, Building } from 'lucide-react';

interface UserInviteDialogProps {
  onInvite: (invitationData: any) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function UserInviteDialog({ onInvite, isOpen, onOpenChange, trigger }: UserInviteDialogProps) {
  const [formData, setFormData] = useState({
    // Person data
    firstName: '',
    lastName: '',
    middleName: '',
    preferredName: '',
    title: '',
    primaryEmail: '',
    alternateEmail: '',
    workPhone: '',
    mobilePhone: '',
    workLocation: '',
    professionalSummary: '',
    securityClearanceLevel: 'NONE',
    pivStatus: 'PIV_EXCEPTION_PENDING',
    
    // User data
    username: '',
    roles: [] as string[],
    
    // Organization affiliation
    organizationId: '',
    jobTitle: '',
    department: '',
    affiliationType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    accessLevel: 'STANDARD',
    contractNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.primaryEmail.trim()) newErrors.primaryEmail = 'Email is required';
    if (!formData.primaryEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.primaryEmail = 'Valid email is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (formData.roles.length === 0) newErrors.roles = 'At least one role is required';
    if (!formData.organizationId) newErrors.organizationId = 'Organization is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const invitationData = {
      personData: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        preferredName: formData.preferredName || undefined,
        title: formData.title || undefined,
        primaryEmail: formData.primaryEmail,
        alternateEmail: formData.alternateEmail || undefined,
        workPhone: formData.workPhone || undefined,
        mobilePhone: formData.mobilePhone || undefined,
        workLocation: formData.workLocation || undefined,
        professionalSummary: formData.professionalSummary || undefined,
        securityClearanceLevel: formData.securityClearanceLevel || undefined,
        pivStatus: formData.pivStatus,
      },
      userData: {
        username: formData.username,
        roles: formData.roles,
        invitedBy: 'current-user-id', // This should come from auth context
      },
      organizationAffiliation: {
        organizationId: formData.organizationId,
        jobTitle: formData.jobTitle || undefined,
        department: formData.department || undefined,
        affiliationType: formData.affiliationType,
        employmentStatus: formData.employmentStatus,
        accessLevel: formData.accessLevel,
        contractNumber: formData.contractNumber || undefined,
      },
    };
    
    onInvite(invitationData);
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      preferredName: '',
      title: '',
      primaryEmail: '',
      alternateEmail: '',
      workPhone: '',
      mobilePhone: '',
      workLocation: '',
      professionalSummary: '',
      securityClearanceLevel: 'NONE',
      pivStatus: 'PIV_EXCEPTION_PENDING',
      username: '',
      roles: [],
      organizationId: '',
      jobTitle: '',
      department: '',
      affiliationType: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      accessLevel: 'STANDARD',
      contractNumber: '',
    });
    
    if (onOpenChange) onOpenChange(false);
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const generateUsername = () => {
    if (formData.firstName && formData.lastName) {
      const username = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`;
      setFormData(prev => ({ ...prev, username }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Invite New User</span>
          </DialogTitle>
          <DialogDescription>
            Create a new user account by providing their personal information, security clearance, and organizational details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Personal Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  value={formData.preferredName}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Contact Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryEmail">Primary Email *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryEmail: e.target.value }))}
                  className={errors.primaryEmail ? 'border-red-500' : ''}
                />
                {errors.primaryEmail && <p className="text-sm text-red-500 mt-1">{errors.primaryEmail}</p>}
              </div>
              
              <div>
                <Label htmlFor="alternateEmail">Alternate Email</Label>
                <Input
                  id="alternateEmail"
                  type="email"
                  value={formData.alternateEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, alternateEmail: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workPhone">Work Phone</Label>
                <Input
                  id="workPhone"
                  value={formData.workPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, workPhone: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="mobilePhone">Mobile Phone</Label>
                <Input
                  id="mobilePhone"
                  value={formData.mobilePhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobilePhone: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="workLocation">Work Location</Label>
              <Input
                id="workLocation"
                value={formData.workLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, workLocation: e.target.value }))}
                placeholder="e.g., Washington, DC"
              />
            </div>
          </div>

          {/* Security Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Security Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="securityClearanceLevel">Security Clearance Level</Label>
                <Select value={formData.securityClearanceLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, securityClearanceLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select clearance level" />
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
                <Label htmlFor="pivStatus">PIV Status</Label>
                <Select value={formData.pivStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, pivStatus: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIV_VERIFIED">PIV Verified</SelectItem>
                    <SelectItem value="PIV_EXCEPTION_PENDING">Exception Pending</SelectItem>
                    <SelectItem value="PIV_EXCEPTION_INTERIM">Exception Interim</SelectItem>
                    <SelectItem value="PIV_EXPIRED">PIV Expired</SelectItem>
                    <SelectItem value="PIV_SUSPENDED">PIV Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* User Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">User Account</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className={errors.username ? 'border-red-500' : ''}
                  />
                  <Button type="button" onClick={generateUsername} variant="outline">
                    Generate
                  </Button>
                </div>
                {errors.username && <p className="text-sm text-red-500 mt-1">{errors.username}</p>}
              </div>
            </div>
            
            <div>
              <Label>Roles *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {[
                  'Government Program Manager',
                  'Government Program Director', 
                  'Security Officer',
                  'Departing Contractor',
                  'Incoming Contractor',
                  'Observer'
                ].map(role => (
                  <label key={role} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{role}</span>
                  </label>
                ))}
              </div>
              {errors.roles && <p className="text-sm text-red-500 mt-1">{errors.roles}</p>}
            </div>
          </div>

          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Organization Affiliation</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="organizationId">Organization *</Label>
                <Select value={formData.organizationId} onValueChange={(value) => setFormData(prev => ({ ...prev, organizationId: value }))}>
                  <SelectTrigger className={errors.organizationId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org-dod-001">Department of Defense (DOD)</SelectItem>
                    <SelectItem value="org-gsa-001">General Services Administration (GSA)</SelectItem>
                    <SelectItem value="org-acme-001">ACME Technology Solutions</SelectItem>
                    <SelectItem value="org-tech-001">TechCorp Systems</SelectItem>
                  </SelectContent>
                </Select>
                {errors.organizationId && <p className="text-sm text-red-500 mt-1">{errors.organizationId}</p>}
              </div>
              
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="affiliationType">Affiliation Type</Label>
                <Select value={formData.affiliationType} onValueChange={(value) => setFormData(prev => ({ ...prev, affiliationType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Select value={formData.employmentStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, employmentStatus: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select value={formData.accessLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, accessLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VISITOR">Visitor</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ELEVATED">Elevated</SelectItem>
                    <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="contractNumber">Contract Number</Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                placeholder="e.g., DOD-IT-2024-001"
              />
            </div>
          </div>

          {/* Professional Summary */}
          <div>
            <Label htmlFor="professionalSummary">Professional Summary</Label>
            <Textarea
              id="professionalSummary"
              value={formData.professionalSummary}
              onChange={(e) => setFormData(prev => ({ ...prev, professionalSummary: e.target.value }))}
              placeholder="Brief description of professional background and expertise..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}