import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2Icon, ArrowRightIcon, ArrowLeftIcon, UsersIcon, ShieldIcon, BriefcaseIcon, XIcon } from "lucide-react";
import UserManagementApi, { User, UserInvitationData } from "@/services/userManagementApi";

interface InvitedUser {
  // For new users (full invite form)
  isNewUser: boolean;

  // For existing users (selected from list)
  existingUserId?: string;
  existingUserEmail?: string;
  existingUserName?: string;

  // For new users
  firstName?: string;
  lastName?: string;
  middleName?: string;
  preferredName?: string;
  title?: string;
  primaryEmail?: string;
  alternateEmail?: string;
  workPhone?: string;
  mobilePhone?: string;
  workLocation?: string;
  professionalSummary?: string;
  securityClearanceLevel?: string;
  username?: string;
  roles?: string[];
  organizationId?: string;
  jobTitle?: string;
  department?: string;
  affiliationType?: string;
  employmentStatus?: string;
  accessLevel?: string;
  contractNumber?: string;
}

export function StakeholdersSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalSteps = 4;

  // Generate a secure temporary password
  const generateSecurePassword = (): string => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';

    // Ensure at least one character from each category
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // User search and selection
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Invited users
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [currentNewUser, setCurrentNewUser] = useState<InvitedUser>({
    isNewUser: true,
    roles: []
  });

  // Communication preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [meetingCadence, setMeetingCadence] = useState('Weekly');

  // Fetch existing users
  useEffect(() => {
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
  }, [userSearchTerm]);

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      // Process new user invitations
      for (const user of invitedUsers.filter(u => u.isNewUser)) {
        // Auto-generate a secure temporary password for the user
        const temporaryPassword = generateSecurePassword();

        const invitationData: UserInvitationData = {
          personData: {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            middleName: user.middleName,
            preferredName: user.preferredName,
            title: user.title,
            primaryEmail: user.primaryEmail || '',
            alternateEmail: user.alternateEmail,
            workPhone: user.workPhone,
            mobilePhone: user.mobilePhone,
            workLocation: user.workLocation,
            professionalSummary: user.professionalSummary,
            securityClearanceLevel: user.securityClearanceLevel as any,
          },
          userData: {
            username: user.username || '',
            password: temporaryPassword,
            roles: user.roles || [],
          },
          ...(user.organizationId && {
            organizationAffiliation: {
              organizationId: user.organizationId,
              jobTitle: user.jobTitle,
              department: user.department,
              affiliationType: user.affiliationType as any,
              employmentStatus: user.employmentStatus as any,
              accessLevel: user.accessLevel as any,
              contractNumber: user.contractNumber,
            }
          })
        };

        await UserManagementApi.inviteUser(invitationData);
      }

      // Save configuration
      const stakeholderConfig = {
        invitedUsers: invitedUsers.length,
        communicationPreferences: {
          emailNotifications,
          inAppNotifications,
          weeklyDigest,
          meetingCadence
        },
        completedAt: new Date().toISOString()
      };

      localStorage.setItem('stakeholdersSetupConfig', JSON.stringify(stakeholderConfig));
      localStorage.setItem('stakeholdersSetupCompleted', 'true');
      localStorage.setItem('stakeholdersSetupCompletedAt', new Date().toISOString());

      navigate("/dashboard");
    } catch (err) {
      console.error('Failed to complete setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addExistingUser = (user: User) => {
    setInvitedUsers([
      ...invitedUsers,
      {
        isNewUser: false,
        existingUserId: user.id,
        existingUserEmail: user.email,
        existingUserName: `${user.firstName} ${user.lastName}`
      }
    ]);
  };

  const addNewUser = () => {
    if (!currentNewUser.primaryEmail || !currentNewUser.firstName || !currentNewUser.lastName || !currentNewUser.username) {
      setError('Please fill in required fields: First Name, Last Name, Primary Email, and Username');
      return;
    }

    setInvitedUsers([...invitedUsers, currentNewUser]);
    setCurrentNewUser({ isNewUser: true, roles: [] });
    setShowNewUserForm(false);
    setError(null);
  };

  const removeUser = (index: number) => {
    setInvitedUsers(invitedUsers.filter((_, i) => i !== index));
  };

  const handleRoleToggle = (role: string) => {
    setCurrentNewUser(prev => ({
      ...prev,
      roles: prev.roles?.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...(prev.roles || []), role]
    }));
  };

  const generateUsername = () => {
    if (currentNewUser.firstName && currentNewUser.lastName) {
      const username = `${currentNewUser.firstName.toLowerCase()}.${currentNewUser.lastName.toLowerCase()}`;
      setCurrentNewUser(prev => ({ ...prev, username }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Define Stakeholder Roles</h3>
            <p className="text-muted-foreground">
              Identify the key stakeholder roles involved in your transition processes.
            </p>
            <div className="space-y-3 mt-6">
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <ShieldIcon className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <span className="font-medium">Government Program Manager</span>
                  <p className="text-sm text-muted-foreground">Oversees transition planning and execution</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked disabled />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <BriefcaseIcon className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <span className="font-medium">Outgoing Contractor</span>
                  <p className="text-sm text-muted-foreground">Provides knowledge transfer and documentation</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked disabled />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <BriefcaseIcon className="w-5 h-5 text-purple-500" />
                <div className="flex-1">
                  <span className="font-medium">Incoming Contractor</span>
                  <p className="text-sm text-muted-foreground">Receives training and assumes responsibilities</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked disabled />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <span className="font-medium">Technical Lead</span>
                  <p className="text-sm text-muted-foreground">Subject matter expert for technical transitions</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-pink-500" />
                <div className="flex-1">
                  <span className="font-medium">Security Officer</span>
                  <p className="text-sm text-muted-foreground">Manages access and security clearances</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-teal-500" />
                <div className="flex-1">
                  <span className="font-medium">Operational Support</span>
                  <p className="text-sm text-muted-foreground">Provides ongoing operational assistance</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Invite Stakeholders</h3>
            <p className="text-muted-foreground">
              Select existing users or invite new stakeholders to your platform.
            </p>

            <div className="space-y-4 mt-6">
              {/* Search existing users */}
              <div className="p-4 border rounded-lg">
                <Label htmlFor="userSearch">Search Existing Users</Label>
                <Input
                  id="userSearch"
                  placeholder="Search by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  disabled={loadingUsers}
                />
                {userSearchTerm && existingUsers.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {existingUsers.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onClick={() => addExistingUser(user)}
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
              </div>

              {/* Invited users list */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <Label>Invited/Selected Stakeholders ({invitedUsers.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewUserForm(!showNewUserForm)}
                  >
                    {showNewUserForm ? 'Cancel' : '+ Invite New User'}
                  </Button>
                </div>

                {invitedUsers.map((user, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-white rounded mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {user.isNewUser
                          ? `${user.firstName} ${user.lastName}`
                          : user.existingUserName
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.isNewUser ? user.primaryEmail : user.existingUserEmail}
                        {user.isNewUser && ' (New Invitation)'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUser(index)}
                      type="button"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {invitedUsers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No stakeholders selected yet
                  </p>
                )}
              </div>

              {/* New user form */}
              {showNewUserForm && (
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Invite New User</h4>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={currentNewUser.firstName || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={currentNewUser.middleName || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, middleName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={currentNewUser.lastName || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="preferredName">Preferred Name</Label>
                      <Input
                        id="preferredName"
                        value={currentNewUser.preferredName || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, preferredName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        value={currentNewUser.title || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, title: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="primaryEmail">Primary Email *</Label>
                      <Input
                        id="primaryEmail"
                        type="email"
                        value={currentNewUser.primaryEmail || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, primaryEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="alternateEmail">Alternate Email</Label>
                      <Input
                        id="alternateEmail"
                        type="email"
                        value={currentNewUser.alternateEmail || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, alternateEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="workPhone">Work Phone</Label>
                      <Input
                        id="workPhone"
                        value={currentNewUser.workPhone || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, workPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobilePhone">Mobile Phone</Label>
                      <Input
                        id="mobilePhone"
                        value={currentNewUser.mobilePhone || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, mobilePhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="workLocation">Work Location</Label>
                    <Input
                      id="workLocation"
                      value={currentNewUser.workLocation || ''}
                      onChange={(e) => setCurrentNewUser({ ...currentNewUser, workLocation: e.target.value })}
                      placeholder="e.g., Washington, DC"
                    />
                  </div>

                  {/* Security Information */}
                  <div>
                    <Label htmlFor="securityClearanceLevel">Security Clearance Level</Label>
                    <Select
                      value={currentNewUser.securityClearanceLevel || 'None'}
                      onValueChange={(value) => setCurrentNewUser({ ...currentNewUser, securityClearanceLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select clearance level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Public_Trust">Public Trust</SelectItem>
                        <SelectItem value="Confidential">Confidential</SelectItem>
                        <SelectItem value="Secret">Secret</SelectItem>
                        <SelectItem value="Top_Secret">Top Secret</SelectItem>
                        <SelectItem value="TS_SCI">TS/SCI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* User Account */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="username"
                          value={currentNewUser.username || ''}
                          onChange={(e) => setCurrentNewUser({ ...currentNewUser, username: e.target.value })}
                        />
                        <Button type="button" onClick={generateUsername} variant="outline" size="sm">
                          Generate
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        A secure temporary password will be auto-generated. Users must contact support to receive their temporary credentials.
                      </p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <Label>Roles *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {[
                        'Government Program Manager',
                        'Government Program Director',
                        'Security Officer',
                        'Departing Contractor',
                        'Incoming Contractor',
                        'Operational Support',
                        'Observer'
                      ].map(role => (
                        <label key={role} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentNewUser.roles?.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Organization Affiliation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="organizationId">Organization</Label>
                      <Select
                        value={currentNewUser.organizationId || ''}
                        onValueChange={(value) => setCurrentNewUser({ ...currentNewUser, organizationId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org-dod-001">Department of Defense (DOD)</SelectItem>
                          <SelectItem value="org-gsa-001">General Services Administration (GSA)</SelectItem>
                          <SelectItem value="org-acme-001">ACME Technology Solutions</SelectItem>
                          <SelectItem value="org-tech-001">TechCorp Systems</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={currentNewUser.department || ''}
                        onChange={(e) => setCurrentNewUser({ ...currentNewUser, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="affiliationType">Affiliation Type</Label>
                      <Select
                        value={currentNewUser.affiliationType || 'Employee'}
                        onValueChange={(value) => setCurrentNewUser({ ...currentNewUser, affiliationType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Contractor">Contractor</SelectItem>
                          <SelectItem value="Consultant">Consultant</SelectItem>
                          <SelectItem value="Vendor">Vendor</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="employmentStatus">Employment Status</Label>
                      <Select
                        value={currentNewUser.employmentStatus || 'Active'}
                        onValueChange={(value) => setCurrentNewUser({ ...currentNewUser, employmentStatus: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="On_Leave">On Leave</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="accessLevel">Access Level</Label>
                      <Select
                        value={currentNewUser.accessLevel || 'Standard'}
                        onValueChange={(value) => setCurrentNewUser({ ...currentNewUser, accessLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visitor">Visitor</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Elevated">Elevated</SelectItem>
                          <SelectItem value="Administrative">Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="professionalSummary">Professional Summary</Label>
                    <Textarea
                      id="professionalSummary"
                      value={currentNewUser.professionalSummary || ''}
                      onChange={(e) => setCurrentNewUser({ ...currentNewUser, professionalSummary: e.target.value })}
                      placeholder="Brief description of professional background and expertise..."
                      rows={2}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={addNewUser}
                    className="w-full"
                  >
                    Add User to Invitation List
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Configure Communication Preferences</h3>
            <p className="text-muted-foreground">
              Set up how stakeholders will communicate and collaborate.
            </p>
            <div className="space-y-3 mt-6">
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                  <span className="font-medium">Email Notifications</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Send email updates for important events and milestones
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={inAppNotifications}
                    onChange={(e) => setInAppNotifications(e.target.checked)}
                  />
                  <span className="font-medium">In-App Notifications</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Show notifications within the platform interface
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                  />
                  <span className="font-medium">Weekly Digest</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Send a weekly summary of activities and updates
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <Label htmlFor="meetingCadence">Default Meeting Cadence</Label>
                <select
                  id="meetingCadence"
                  className="w-full px-3 py-2 border rounded-md mt-2"
                  value={meetingCadence}
                  onChange={(e) => setMeetingCadence(e.target.value)}
                >
                  <option>Weekly</option>
                  <option>Bi-weekly</option>
                  <option>Monthly</option>
                  <option>As Needed</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2Icon className="w-8 h-8 text-green-500" />
              <h3 className="text-xl font-semibold">Review & Confirm</h3>
            </div>
            <p className="text-muted-foreground">
              Review your stakeholder configuration and confirm to complete setup.
            </p>
            <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Stakeholder Roles:</span>
                <span className="text-muted-foreground">6 Roles Defined</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Invitations Sent:</span>
                <span className="text-muted-foreground">{invitedUsers.filter(u => u.isNewUser).length} New Users</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Existing Users Added:</span>
                <span className="text-muted-foreground">{invitedUsers.filter(u => !u.isNewUser).length} Users</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Notifications:</span>
                <span className="text-muted-foreground">
                  {[emailNotifications && 'Email', inAppNotifications && 'In-App', weeklyDigest && 'Weekly Digest'].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Meeting Cadence:</span>
                <span className="text-muted-foreground">{meetingCadence}</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <UsersIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Next Steps</p>
                  <p className="text-sm text-blue-700 mt-1">
                    User accounts will be created with "Pending" status and secure temporary passwords will be auto-generated. New users should contact support to receive their temporary credentials. All new accounts require password reset on first login for security. Visit the User Management page to review stakeholder status and manage access permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stakeholder Management Setup</h1>
        <p className="text-muted-foreground">
          Configure stakeholder roles, invite team members, and set up communication preferences.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
          <span className="text-sm text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
        {renderStepContent()}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || loading}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={loading}
          className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
        >
          {loading ? 'Processing...' : currentStep === totalSteps ? "Complete Setup" : "Next"}
          {currentStep < totalSteps && !loading && <ArrowRightIcon className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
