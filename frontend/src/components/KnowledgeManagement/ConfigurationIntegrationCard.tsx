import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MoreVertical,
  Globe,
  Shield,
  Key,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { type KnowledgeSource } from '@/services/knowledgeSourceApi';

interface ConfigurationIntegrationCardProps {
  source: KnowledgeSource;
  onEdit: (source: KnowledgeSource) => void;
  onDelete: (source: KnowledgeSource) => void;
  onTestConnection: (source: KnowledgeSource) => void;
  onToggleStatus: (source: KnowledgeSource) => void;
  loading?: boolean;
}

export function ConfigurationIntegrationCard({
  source,
  onEdit,
  onDelete,
  onTestConnection,
  onToggleStatus,
  loading = false
}: ConfigurationIntegrationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getHealthStatusColor = (healthStatus?: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getHealthStatusIcon = (healthStatus?: string) => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getAuthTypeIcon = (authType: string) => {
    switch (authType) {
      case 'basic':
        return <User className="h-4 w-4" />;
      case 'api_key':
        return <Key className="h-4 w-4" />;
      case 'oauth':
        return <Shield className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getAuthTypeLabel = (authType: string) => {
    switch (authType) {
      case 'basic':
        return 'Basic Auth';
      case 'api_key':
        return 'API Key';
      case 'oauth':
        return 'OAuth 2.0';
      default:
        return 'No Auth';
    }
  };

  const formatLastHealthCheck = (lastHealthCheck?: string) => {
    if (!lastHealthCheck) return 'Never tested';

    const date = new Date(lastHealthCheck);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(source);
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* Header with name, status, and actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">{source.name}</h3>
              <Badge variant={getStatusColor(source.status)}>
                {source.status}
              </Badge>
            </div>
            {source.description && (
              <p className="text-sm text-muted-foreground">{source.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading || isDeleting}
                className="h-8 w-8 p-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(source)}>
                Edit Configuration
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTestConnection(source)}>
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(source)}>
                {source.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete Source
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Endpoint URL */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Endpoint
          </label>
          <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">
            {source.endpointUrl}
          </p>
        </div>

        {/* Authentication and Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Authentication
            </label>
            <div className="flex items-center gap-2">
              {getAuthTypeIcon(source.authType)}
              <span className="text-sm">{getAuthTypeLabel(source.authType)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Health Status
            </label>
            <div className={`flex items-center gap-2 ${getHealthStatusColor(source.healthStatus)}`}>
              {getHealthStatusIcon(source.healthStatus)}
              <span className="text-sm capitalize">
                {source.healthStatus || 'unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Last Health Check */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Last Health Check
          </label>
          <p className="text-sm text-muted-foreground">
            {formatLastHealthCheck(source.lastHealthCheck)}
          </p>
        </div>

        {/* Metadata Display */}
        {source.metadata && Object.keys(source.metadata).length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(source.metadata).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* N8N Integration Information */}
        {source.isEnabled && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              N8N Integration Endpoints
            </label>
            <div className="text-xs font-mono space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Metadata:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  GET /api/n8n/sources/{source.id}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Data:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  GET /api/n8n/sources/{source.id}/data
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sync:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  POST /api/n8n/sources/{source.id}/sync
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Show warning for unhealthy sources */}
        {source.healthStatus === 'unhealthy' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This knowledge source is currently unhealthy and may not be accessible by N8N workflows.
            </AlertDescription>
          </Alert>
        )}

        {/* Show info for disabled sources */}
        {!source.isEnabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This knowledge source is disabled and not available for N8N workflows. Test the connection to enable it.
            </AlertDescription>
          </Alert>
        )}

        {/* Creation info */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          Created {new Date(source.createdAt).toLocaleDateString()}
          {source.updatedAt !== source.createdAt && (
            <span> • Updated {new Date(source.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Card>
  );
}