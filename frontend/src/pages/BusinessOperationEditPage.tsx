import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { businessOperationApi, BusinessOperation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserManagementApi, { User } from "@/services/userManagementApi";
import { SelectUserDialog } from "@/components/business-operations/SelectUserDialog";

export function BusinessOperationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCurrentManagerDialogOpen, setIsCurrentManagerDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    businessFunction: "",
    technicalDomain: "",
    scope: "",
    objectives: "",
    supportPeriodStart: "",
    supportPeriodEnd: "",
    currentContractEnd: "",
    governmentPMId: "",
    directorId: "",
    currentManagerId: "",
    performanceMetrics: {
      operational: [] as string[],
      quality: [] as string[],
      compliance: [] as string[]
    }
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await UserManagementApi.getUsers({
          page: 1,
          pageSize: 100,
          searchTerm: searchTerm || undefined,
        });
        // Filter for active users on the frontend
        const activeUsers = response.users.filter(
          (user) => !user.accountStatus || user.accountStatus === 'ACTIVE' || user.accountStatus === 'Active'
        );
        setUsers(activeUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [searchTerm]);

  useEffect(() => {
    const fetchOperation = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const operation = await businessOperationApi.getById(id);

        // Convert dates to YYYY-MM-DD format for input fields
        const formatDate = (date: string) => {
          return new Date(date).toISOString().split('T')[0];
        };

        setFormData({
          name: operation.name || "",
          description: operation.description || "",
          businessFunction: operation.businessFunction || "",
          technicalDomain: operation.technicalDomain || "",
          scope: operation.scope || "",
          objectives: operation.objectives || "",
          supportPeriodStart: formatDate(operation.supportPeriodStart),
          supportPeriodEnd: formatDate(operation.supportPeriodEnd),
          currentContractEnd: formatDate(operation.currentContractEnd),
          governmentPMId: operation.governmentPMId || "",
          directorId: operation.directorId || "",
          currentManagerId: operation.currentManagerId || "",
          performanceMetrics: operation.performanceMetrics || {
            operational: [],
            quality: [],
            compliance: []
          }
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch operation:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch operation');
      } finally {
        setLoading(false);
      }
    };

    fetchOperation();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      await businessOperationApi.update(id, {
        ...formData,
        // Remove empty IDs
        governmentPMId: formData.governmentPMId || undefined,
        directorId: formData.directorId || undefined,
        currentManagerId: formData.currentManagerId || undefined,
      });

      navigate(`/business-operations/${id}`);
    } catch (err) {
      console.error('Failed to update operation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update operation');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        Loading business operation...
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
        <Button onClick={() => navigate('/business-operations')}>
          Back to Business Operations
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/business-operations/${id}`)}
          >
            ← Cancel
          </Button>
          <h1 className="text-3xl font-bold">Edit Business Operation</h1>
        </div>
        <p className="text-gray-600">Update the details for this business operation</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core details about the business operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter operation name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter operation description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessFunction">Business Function *</Label>
                <Input
                  id="businessFunction"
                  value={formData.businessFunction}
                  onChange={(e) => handleChange('businessFunction', e.target.value)}
                  placeholder="e.g., IT Services"
                  required
                />
              </div>

              <div>
                <Label htmlFor="technicalDomain">Technical Domain *</Label>
                <Input
                  id="technicalDomain"
                  value={formData.technicalDomain}
                  onChange={(e) => handleChange('technicalDomain', e.target.value)}
                  placeholder="e.g., Cloud Infrastructure"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scope & Objectives</CardTitle>
            <CardDescription>Define the scope and objectives of this operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scope">Scope *</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => handleChange('scope', e.target.value)}
                placeholder="Describe the scope of this operation"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="objectives">Objectives *</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => handleChange('objectives', e.target.value)}
                placeholder="Define the objectives of this operation"
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Support period and contract dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supportPeriodStart">Support Period Start *</Label>
                <Input
                  id="supportPeriodStart"
                  type="date"
                  value={formData.supportPeriodStart}
                  onChange={(e) => handleChange('supportPeriodStart', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="supportPeriodEnd">Support Period End *</Label>
                <Input
                  id="supportPeriodEnd"
                  type="date"
                  value={formData.supportPeriodEnd}
                  onChange={(e) => handleChange('supportPeriodEnd', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="currentContractEnd">Current Contract End *</Label>
              <Input
                id="currentContractEnd"
                type="date"
                value={formData.currentContractEnd}
                onChange={(e) => handleChange('currentContractEnd', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Key Personnel</CardTitle>
            <CardDescription>Assign key personnel to this operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-users">Search Users</Label>
              <Input
                id="search-users"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loadingUsers}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="governmentPMId">Government PM</Label>
                <Select
                  value={formData.governmentPMId}
                  onValueChange={(value) => handleChange('governmentPMId', value)}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="governmentPMId">
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select user"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {loadingUsers ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Loading users...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No users found matching search' : 'No users available'}
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="directorId">Director</Label>
                <Select
                  value={formData.directorId}
                  onValueChange={(value) => handleChange('directorId', value)}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="directorId">
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select user"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {loadingUsers ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Loading users...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No users found matching search' : 'No users available'}
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currentManagerId">Current Manager</Label>
                <div className="flex items-center gap-2">
                  {formData.currentManagerId ? (
                    <div className="flex-1 p-2 border rounded-md bg-muted">
                      <div className="text-sm font-medium">
                        {users.find(u => u.id === formData.currentManagerId)?.firstName}{' '}
                        {users.find(u => u.id === formData.currentManagerId)?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {users.find(u => u.id === formData.currentManagerId)?.email}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 p-2 border rounded-md bg-muted text-sm text-muted-foreground">
                      No Current Manager selected
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCurrentManagerDialogOpen(true)}
                  >
                    {formData.currentManagerId ? 'Change' : 'Select'}
                  </Button>
                  {formData.currentManagerId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('currentManagerId', '')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/business-operations/${id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <SelectUserDialog
        isOpen={isCurrentManagerDialogOpen}
        onClose={() => setIsCurrentManagerDialogOpen(false)}
        onSelect={(userId) => handleChange('currentManagerId', userId)}
        title="Select Current Manager"
        currentUserId={formData.currentManagerId}
      />
    </div>
  );
}
