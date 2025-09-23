import { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Alert, AlertDescription } from '../../ui/alert';
import { Loader2, Plus, Database, AlertTriangle } from 'lucide-react';
import { knowledgeSourceApi, type KnowledgeSource } from '../../../services/knowledgeSourceApi';
import { KnowledgeSourceConfigModal } from '../../KnowledgeManagement/KnowledgeSourceConfigModal';
import { ConfigurationIntegrationCard } from '../../KnowledgeManagement/ConfigurationIntegrationCard';

export function Configuration() {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeSources();
  }, []);

  const loadKnowledgeSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const sources = await knowledgeSourceApi.getAllKnowledgeSources();
      setKnowledgeSources(sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge sources');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setConfigModalOpen(true);
  };

  const handleEditSource = (source: KnowledgeSource) => {
    setEditingSource(source);
    setConfigModalOpen(true);
  };

  const handleDeleteSource = async (source: KnowledgeSource) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(source.id);
      await knowledgeSourceApi.deleteKnowledgeSource(source.id);
      await loadKnowledgeSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge source');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestConnection = async (source: KnowledgeSource) => {
    try {
      setActionLoading(source.id);
      const result = await knowledgeSourceApi.testConnection(source.id);

      if (result.status === 'healthy') {
        alert(`Connection successful! Response time: ${result.responseTime || 'N/A'}ms`);
      } else {
        alert(`Connection failed: ${result.details || 'Unknown error'}`);
      }

      await loadKnowledgeSources(); // Refresh to update health status
    } catch (err) {
      alert(`Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (source: KnowledgeSource) => {
    try {
      setActionLoading(source.id);
      const newStatus = source.status === 'active' ? 'inactive' : 'active';
      await knowledgeSourceApi.updateKnowledgeSource(source.id, { status: newStatus });
      await loadKnowledgeSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfigSuccess = async (source: KnowledgeSource) => {
    await loadKnowledgeSources();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Configuration</h2>
        <Button>Save Changes</Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="approval">Approval Workflow</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="knowledge-sources">Knowledge Sources</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Knowledge Processing</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Auto-processing Confidence Threshold</label>
                  <Input type="number" placeholder="85" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Facts above this confidence level are auto-approved
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fact Retention Period (days)</label>
                  <Input type="number" placeholder="365" />
                  <p className="text-xs text-muted-foreground mt-1">
                    How long to keep facts before archiving
                  </p>
                </div>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Enable automatic fact extraction from uploaded documents</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Monitor communication channels for knowledge extraction</span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Content Categories</h3>
            <div className="space-y-3">
              {[
                { name: 'Technical', color: 'bg-blue-500', count: 156 },
                { name: 'Business', color: 'bg-green-500', count: 89 },
                { name: 'Metrics', color: 'bg-purple-500', count: 67 },
                { name: 'Planning', color: 'bg-orange-500', count: 43 },
                { name: 'Process', color: 'bg-red-500', count: 34 },
              ].map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${category.color}`} />
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary">{category.count} facts</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="outline">Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">Add New Category</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Approval Rules</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Require approval for all manually entered facts</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Require approval for facts with confidence below threshold</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Require approval for all document uploads</span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Approval Roles</h3>
            <div className="space-y-3">
              {[
                { role: 'Product Manager', permissions: ['Business facts', 'Planning facts', 'All documents'] },
                { role: 'Tech Lead', permissions: ['Technical facts', 'Process facts'] },
                { role: 'Data Analyst', permissions: ['Metrics facts', 'Reports'] },
              ].map((approver, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{approver.role}</span>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {approver.permissions.map((permission, permIndex) => (
                      <Badge key={permIndex} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">Add Approval Role</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Communication Integrations</h3>
            <div className="space-y-4">
              {[
                { name: 'Email Integration', status: 'Connected', description: 'Process team emails for knowledge extraction' },
                { name: 'Slack Integration', status: 'Pending', description: 'Monitor team channels for important communications' },
                { name: 'Microsoft Teams', status: 'Available', description: 'Process Teams conversations and files' },
                { name: 'Document Sharing', status: 'Connected', description: 'Auto-process shared documents from drive' },
              ].map((integration, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{integration.name}</span>
                      <Badge variant={integration.status === 'Connected' ? 'default' : integration.status === 'Pending' ? 'secondary' : 'outline'}>
                        {integration.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    {integration.status === 'Connected' ? 'Configure' : integration.status === 'Pending' ? 'Setup' : 'Connect'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge-sources" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Knowledge Sources</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure data source endpoints for N8N workflow integration
              </p>
            </div>
            <Button onClick={handleAddSource}>
              <Plus className="mr-2 h-4 w-4" />
              Add Knowledge Source
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading knowledge sources...</span>
            </div>
          ) : knowledgeSources.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <Database className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h4 className="text-lg font-medium">No Knowledge Sources Configured</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure your first knowledge source to start integrating data sources with N8N workflows.
                  </p>
                </div>
                <Button onClick={handleAddSource}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Knowledge Source
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {knowledgeSources.length} knowledge source{knowledgeSources.length !== 1 ? 's' : ''} configured
              </div>
              <div className="grid gap-4">
                {knowledgeSources.map((source) => (
                  <ConfigurationIntegrationCard
                    key={source.id}
                    source={source}
                    onEdit={handleEditSource}
                    onDelete={handleDeleteSource}
                    onTestConnection={handleTestConnection}
                    onToggleStatus={handleToggleStatus}
                    loading={actionLoading === source.id}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Email Notifications</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">New facts pending approval</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Weekly curation summary</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">System errors and warnings</span>
                  </label>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">In-App Notifications</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Real-time approval requests</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Processing completion alerts</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Integration status updates</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Knowledge Source Configuration Modal */}
      <KnowledgeSourceConfigModal
        isOpen={configModalOpen}
        onClose={() => {
          setConfigModalOpen(false);
          setEditingSource(null);
        }}
        onSuccess={handleConfigSuccess}
        editingSource={editingSource}
      />
    </div>
  );
}