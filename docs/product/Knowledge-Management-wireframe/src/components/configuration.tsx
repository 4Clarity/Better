import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { 
  Settings, 
  Tag, 
  Database, 
  Plus, 
  X, 
  Edit, 
  Save,
  Trash2,
  Plug,
  CheckCircle,
  XCircle,
  AlertCircle,
  Key,
  Clock,
  GitBranch,
  Ticket
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TagCategory {
  id: string;
  name: string;
  color: string;
  description: string;
  tags: string[];
  isSystem: boolean;
}

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'ServiceNow' | 'ADO' | 'Document' | 'Communication' | 'API';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  endpoint?: string;
  apiKey?: string;
  syncFrequency: string;
  lastSync: string;
  itemsProcessed: number;
  description: string;
  configuration: Record<string, any>;
}

export function Configuration() {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([
    {
      id: '1',
      name: 'Security',
      color: 'red',
      description: 'Security-related tags and classifications',
      tags: ['authentication', 'encryption', 'security', 'access-control', 'compliance'],
      isSystem: true
    },
    {
      id: '2',
      name: 'Technical',
      color: 'blue',
      description: 'Technical implementation and architecture tags',
      tags: ['api', 'database', 'performance', 'infrastructure', 'integration'],
      isSystem: false
    },
    {
      id: '3',
      name: 'User Experience',
      color: 'green',
      description: 'User interface and experience related tags',
      tags: ['ui', 'ux', 'accessibility', 'usability', 'design'],
      isSystem: false
    },
    {
      id: '4',
      name: 'Business',
      color: 'purple',
      description: 'Business requirements and process tags',
      tags: ['requirements', 'process', 'workflow', 'business-rules', 'compliance'],
      isSystem: false
    }
  ]);

  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([
    {
      id: '1',
      name: 'ServiceNow Production',
      type: 'ServiceNow',
      status: 'active',
      endpoint: 'https://company.service-now.com/api',
      apiKey: '****-****-****-****',
      syncFrequency: 'hourly',
      lastSync: '2024-01-16T10:30:00',
      itemsProcessed: 1247,
      description: 'Production ServiceNow instance for tickets and change requests',
      configuration: {
        tables: ['incident', 'change_request', 'problem'],
        fields: ['number', 'short_description', 'description', 'state', 'priority'],
        filters: 'state!=closed'
      }
    },
    {
      id: '2',
      name: 'Azure DevOps',
      type: 'ADO',
      status: 'active',
      endpoint: 'https://dev.azure.com/company',
      apiKey: '****-****-****-****',
      syncFrequency: 'daily',
      lastSync: '2024-01-16T09:15:00',
      itemsProcessed: 892,
      description: 'Azure DevOps for epics, features, and user stories',
      configuration: {
        project: 'ProductDevelopment',
        workItemTypes: ['Epic', 'Feature', 'User Story'],
        states: ['New', 'Active', 'Resolved']
      }
    },
    {
      id: '3',
      name: 'Document Repository',
      type: 'Document',
      status: 'syncing',
      syncFrequency: 'weekly',
      lastSync: '2024-01-15T08:00:00',
      itemsProcessed: 156,
      description: 'SharePoint document library for product documentation',
      configuration: {
        libraryPath: '/sites/product/documents',
        fileTypes: ['.pdf', '.docx', '.md'],
        excludeFolders: ['archive', 'temp']
      }
    }
  ]);

  const [newTag, setNewTag] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'ServiceNow' as KnowledgeSource['type'],
    endpoint: '',
    apiKey: '',
    syncFrequency: 'daily',
    description: ''
  });

  const addTag = (categoryId: string) => {
    if (!newTag.trim()) return;
    
    setTagCategories(prev => prev.map(category => 
      category.id === categoryId 
        ? { ...category, tags: [...category.tags, newTag.trim()] }
        : category
    ));
    setNewTag('');
  };

  const removeTag = (categoryId: string, tagToRemove: string) => {
    setTagCategories(prev => prev.map(category => 
      category.id === categoryId 
        ? { ...category, tags: category.tags.filter(tag => tag !== tagToRemove) }
        : category
    ));
  };

  const addSource = () => {
    if (!newSource.name || !newSource.description) return;

    const source: KnowledgeSource = {
      id: Date.now().toString(),
      name: newSource.name,
      type: newSource.type,
      status: 'inactive',
      endpoint: newSource.endpoint,
      apiKey: newSource.apiKey,
      syncFrequency: newSource.syncFrequency,
      lastSync: '',
      itemsProcessed: 0,
      description: newSource.description,
      configuration: {}
    };

    setKnowledgeSources(prev => [...prev, source]);
    setNewSource({ name: '', type: 'ServiceNow', endpoint: '', apiKey: '', syncFrequency: 'daily', description: '' });
    setIsAddSourceDialogOpen(false);
  };

  const getStatusBadge = (status: KnowledgeSource['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="border-blue-300 text-blue-600">Syncing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSourceIcon = (type: KnowledgeSource['type']) => {
    switch (type) {
      case 'ServiceNow':
        return <Ticket className="h-4 w-4 text-purple-500" />;
      case 'ADO':
        return <GitBranch className="h-4 w-4 text-blue-500" />;
      case 'Document':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'Communication':
        return <Database className="h-4 w-4 text-orange-500" />;
      case 'API':
        return <Plug className="h-4 w-4 text-gray-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Configuration</h2>
          <p className="text-muted-foreground">
            Manage tags, knowledge sources, and system configuration.
          </p>
        </div>

        <Tabs defaultValue="tags" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tags">Tags Management</TabsTrigger>
            <TabsTrigger value="sources">Knowledge Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="tags">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Tag Categories</span>
                  </CardTitle>
                  <CardDescription>
                    Organize and manage tags used for fact classification and knowledge organization.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {tagCategories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className={getCategoryColor(category.color)}>
                              {category.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {category.tags.length} tags
                            </span>
                            {category.isSystem && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!category.isSystem && (
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {category.description}
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {category.tags.map((tag, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                <Badge variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                                {!category.isSystem && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0"
                                    onClick={() => removeTag(category.id, tag)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {!category.isSystem && (
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Add new tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addTag(category.id)}
                                className="max-w-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => addTag(category.id)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Knowledge Sources</span>
                      </CardTitle>
                      <CardDescription>
                        Configure and manage external knowledge sources and their synchronization settings.
                      </CardDescription>
                    </div>
                    <Dialog open={isAddSourceDialogOpen} onOpenChange={setIsAddSourceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Source
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add Knowledge Source</DialogTitle>
                          <DialogDescription>
                            Configure a new external knowledge source for data integration.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Source Name</Label>
                              <Input
                                placeholder="Source name..."
                                value={newSource.name}
                                onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Source Type</Label>
                              <Select value={newSource.type} onValueChange={(value) => setNewSource(prev => ({ ...prev, type: value as KnowledgeSource['type'] }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ServiceNow">ServiceNow</SelectItem>
                                  <SelectItem value="ADO">Azure DevOps</SelectItem>
                                  <SelectItem value="Document">Document Repository</SelectItem>
                                  <SelectItem value="Communication">Communication System</SelectItem>
                                  <SelectItem value="API">Custom API</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Describe this knowledge source..."
                              value={newSource.description}
                              onChange={(e) => setNewSource(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Endpoint URL</Label>
                              <Input
                                placeholder="https://api.example.com"
                                value={newSource.endpoint}
                                onChange={(e) => setNewSource(prev => ({ ...prev, endpoint: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sync Frequency</Label>
                              <Select value={newSource.syncFrequency} onValueChange={(value) => setNewSource(prev => ({ ...prev, syncFrequency: value }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              placeholder="Enter API key..."
                              value={newSource.apiKey}
                              onChange={(e) => setNewSource(prev => ({ ...prev, apiKey: e.target.value }))}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsAddSourceDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={addSource}>
                              Add Source
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {knowledgeSources.map((source) => (
                      <div key={source.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getSourceIcon(source.type)}
                            <div>
                              <h4 className="font-medium">{source.name}</h4>
                              <p className="text-sm text-muted-foreground">{source.type}</p>
                            </div>
                            {getStatusBadge(source.status)}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              Test Connection
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {source.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sync Frequency:</span>
                            <p className="font-medium">{source.syncFrequency}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Sync:</span>
                            <p className="font-medium">
                              {source.lastSync ? new Date(source.lastSync).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items Processed:</span>
                            <p className="font-medium">{source.itemsProcessed.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Endpoint:</span>
                            <p className="font-medium truncate" title={source.endpoint}>
                              {source.endpoint || 'Not configured'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-3 border-t">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked={source.status === 'active'} />
                              <span className="text-sm">Auto-sync enabled</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Clock className="mr-2 h-4 w-4" />
                              Sync Now
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}