import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { knowledgeSourceApi, type KnowledgeSource, type CreateKnowledgeSourceRequest } from '@/services/knowledgeSourceApi';

interface KnowledgeSourceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (source: KnowledgeSource) => void;
  editingSource?: KnowledgeSource | null;
}

export function KnowledgeSourceConfigModal({
  isOpen,
  onClose,
  onSuccess,
  editingSource
}: KnowledgeSourceConfigModalProps) {
  const [formData, setFormData] = useState<CreateKnowledgeSourceRequest>({
    name: '',
    description: '',
    endpointUrl: '',
    sourceType: 'REST_API',
    authType: 'none',
    authConfig: {},
    metadata: {}
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Reset form when modal opens/closes or when editing different source
  useEffect(() => {
    if (isOpen) {
      if (editingSource) {
        setFormData({
          name: editingSource.name,
          description: editingSource.description || '',
          endpointUrl: editingSource.endpointUrl,
          sourceType: editingSource.sourceType || 'REST_API',
          authType: editingSource.authType,
          authConfig: editingSource.authConfig || {},
          metadata: editingSource.metadata || {}
        });
      } else {
        setFormData({
          name: '',
          description: '',
          endpointUrl: '',
          sourceType: 'REST_API',
          authType: 'none',
          authConfig: {},
          metadata: {}
        });
      }
      setError(null);
      setTestResult(null);
    }
  }, [isOpen, editingSource]);

  const handleInputChange = (field: keyof CreateKnowledgeSourceRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error and test result when user makes changes
    if (error) setError(null);
    if (testResult) setTestResult(null);
  };

  const handleAuthConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      authConfig: { ...prev.authConfig, [key]: value }
    }));
    // Clear test result when auth config changes
    if (testResult) setTestResult(null);
  };

  const validateForm = (): string | null => {
    // Validate required fields
    if (!formData.name?.trim()) {
      return 'Name is required';
    }

    if (!formData.endpointUrl?.trim()) {
      return 'Endpoint URL is required';
    }

    // Validate URL format
    try {
      const url = new URL(formData.endpointUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'URL must use HTTP or HTTPS protocol';
      }
    } catch {
      return 'Please enter a valid URL (e.g., https://api.example.com)';
    }

    // Validate authentication configuration
    switch (formData.authType) {
      case 'basic':
        if (!formData.authConfig?.username?.trim() || !formData.authConfig?.password?.trim()) {
          return 'Username and password are required for basic authentication';
        }
        break;
      case 'api_key':
        if (!formData.authConfig?.apiKey?.trim()) {
          return 'API key is required for API key authentication';
        }
        break;
      case 'oauth':
        if (!formData.authConfig?.clientId?.trim() || !formData.authConfig?.clientSecret?.trim()) {
          return 'Client ID and Client Secret are required for OAuth authentication';
        }
        break;
    }

    return null;
  };

  const handleTestConnection = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await knowledgeSourceApi.testConnectionConfig(formData);

      if (result.status === 'healthy') {
        setTestResult({
          status: 'success',
          message: `Connection successful! Response time: ${result.responseTime || 'N/A'}ms`
        });
      } else {
        setTestResult({
          status: 'error',
          message: result.details || 'Connection failed'
        });
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Connection test failed. Please check your configuration and try again.';

      setTestResult({
        status: 'error',
        message: errorMessage
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: KnowledgeSource;

      if (editingSource) {
        result = await knowledgeSourceApi.updateKnowledgeSource(editingSource.id, formData);
      } else {
        result = await knowledgeSourceApi.createKnowledgeSource(formData);
      }

      onSuccess(result);
      onClose();
    } catch (err) {
      console.error('Error saving knowledge source:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to save knowledge source. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderAuthFields = () => {
    switch (formData.authType) {
      case 'basic':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.authConfig?.username || ''}
                onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                placeholder="Username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.authConfig?.password || ''}
                onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>
        );

      case 'api_key':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.authConfig?.apiKey || ''}
                onChange={(e) => handleAuthConfigChange('apiKey', e.target.value)}
                placeholder="API Key"
              />
            </div>
            <div>
              <Label htmlFor="apiKeyHeader">Header Name (optional)</Label>
              <Input
                id="apiKeyHeader"
                type="text"
                value={formData.authConfig?.headerName || ''}
                onChange={(e) => handleAuthConfigChange('headerName', e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
          </div>
        );

      case 'oauth':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={formData.authConfig?.clientId || ''}
                  onChange={(e) => handleAuthConfigChange('clientId', e.target.value)}
                  placeholder="OAuth Client ID"
                />
              </div>
              <div>
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={formData.authConfig?.clientSecret || ''}
                  onChange={(e) => handleAuthConfigChange('clientSecret', e.target.value)}
                  placeholder="OAuth Client Secret"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tokenUrl">Token URL (optional)</Label>
              <Input
                id="tokenUrl"
                type="url"
                value={formData.authConfig?.tokenUrl || ''}
                onChange={(e) => handleAuthConfigChange('tokenUrl', e.target.value)}
                placeholder="https://auth.example.com/oauth/token"
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No authentication will be used for this endpoint.
          </p>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSource ? 'Edit Knowledge Source' : 'Add Knowledge Source'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.status === 'success' ? 'default' : 'destructive'}>
              {testResult.status === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Knowledge source name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this knowledge source"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sourceType">Source Type</Label>
              <Select
                value={formData.sourceType}
                onValueChange={(value) => handleInputChange('sourceType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REST_API">REST API</SelectItem>
                  <SelectItem value="ServiceNow">ServiceNow</SelectItem>
                  <SelectItem value="Azure_DevOps">Azure DevOps</SelectItem>
                  <SelectItem value="Microsoft_Teams">Microsoft Teams</SelectItem>
                  <SelectItem value="Microsoft_SharePoint">Microsoft SharePoint</SelectItem>
                  <SelectItem value="Microsoft_Outlook">Microsoft Outlook</SelectItem>
                  <SelectItem value="Slack">Slack</SelectItem>
                  <SelectItem value="Confluence">Confluence</SelectItem>
                  <SelectItem value="Jira">Jira</SelectItem>
                  <SelectItem value="GitHub">GitHub</SelectItem>
                  <SelectItem value="GitLab">GitLab</SelectItem>
                  <SelectItem value="FTP_Server">FTP Server</SelectItem>
                  <SelectItem value="SFTP_Server">SFTP Server</SelectItem>
                  <SelectItem value="GraphQL_API">GraphQL API</SelectItem>
                  <SelectItem value="Database_PostgreSQL">Database PostgreSQL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="endpointUrl">Endpoint URL *</Label>
              <Input
                id="endpointUrl"
                type="url"
                value={formData.endpointUrl}
                onChange={(e) => handleInputChange('endpointUrl', e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Authentication</h3>

            <div>
              <Label htmlFor="authType">Authentication Type</Label>
              <Select
                value={formData.authType}
                onValueChange={(value) => handleInputChange('authType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authentication method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Authentication</SelectItem>
                  <SelectItem value="basic">Basic Authentication</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderAuthFields()}
          </div>

          {/* Test Connection */}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Test the connection before saving
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || loading}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingSource ? 'Update Source' : 'Create Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}