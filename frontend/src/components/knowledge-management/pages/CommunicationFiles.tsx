import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';

export function CommunicationFiles() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Communication Files</h2>
        <Button>Connect Source</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Email Integration</h3>
              <Badge variant="default">Connected</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically process team emails for knowledge extraction.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Emails processed today:</span>
                <span className="font-medium">24</span>
              </div>
              <div className="flex justify-between">
                <span>Facts extracted:</span>
                <span className="font-medium">7</span>
              </div>
              <div className="flex justify-between">
                <span>Last sync:</span>
                <span className="font-medium">5 min ago</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Configure Filters
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Slack Integration</h3>
              <Badge variant="secondary">Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor team channels for important communications.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Real-time message monitoring</p>
              <p>• Thread context preservation</p>
              <p>• File attachment processing</p>
            </div>
            <Button size="sm" className="w-full">
              Connect Slack
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Teams Integration</h3>
              <Badge variant="outline">Available</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Process Microsoft Teams conversations and files.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Channel message analysis</p>
              <p>• Meeting transcript processing</p>
              <p>• Shared file integration</p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Setup Teams
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Recent Communications</h3>
            <div className="flex gap-2">
              <Input placeholder="Search communications..." className="w-64" />
              <Button variant="outline">Filter</Button>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                type: 'Email',
                subject: 'Q4 Product Roadmap Discussion',
                sender: 'sarah.johnson@company.com',
                time: '2 hours ago',
                facts: 3,
                status: 'Processed'
              },
              {
                type: 'Slack',
                subject: '#product-team: Feature prioritization',
                sender: 'Mike Chen',
                time: '4 hours ago',
                facts: 1,
                status: 'Processing'
              },
              {
                type: 'Email',
                subject: 'Client Feedback on Beta Release',
                sender: 'client-success@company.com',
                time: '6 hours ago',
                facts: 5,
                status: 'Processed'
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <span className="font-medium">{item.subject}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    From: {item.sender} • {item.time}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{item.facts}</span> facts
                  </div>
                  <Badge variant={item.status === 'Processed' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}