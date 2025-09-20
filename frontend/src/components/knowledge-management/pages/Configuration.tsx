import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

export function Configuration() {
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
    </div>
  );
}