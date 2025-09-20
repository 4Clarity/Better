import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ApprovalStats } from '../types';

// Demo data - in real implementation, this would come from API/state management
const APPROVAL_STATS: ApprovalStats[] = [
  { label: 'Pending Review', count: 12, color: 'bg-yellow-500' },
  { label: 'Approved Today', count: 8, color: 'bg-green-500' },
  { label: 'Rejected', count: 3, color: 'bg-red-500' },
  { label: 'Auto-Approved', count: 15, color: 'bg-blue-500' },
];

export function ApprovalQueue() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Approval Queue</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve knowledge submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" aria-label="Open bulk actions menu">
            Bulk Actions
          </Button>
          <Button aria-label="Open review settings">
            Review Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {APPROVAL_STATS.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Review (12)</TabsTrigger>
          <TabsTrigger value="approved">Recently Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected Items</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {[
            {
              type: 'Fact',
              content: 'New security protocol requires 2FA for all admin accounts',
              source: 'Security Policy Update.pdf',
              submittedBy: 'Auto-extraction',
              priority: 'High',
              confidence: 94
            },
            {
              type: 'Document',
              content: 'Q4 Performance Review Template.docx',
              source: 'HR Department upload',
              submittedBy: 'hr.admin@company.com',
              priority: 'Medium',
              confidence: null
            },
            {
              type: 'Fact',
              content: 'Client retention rate improved to 89% in Q3',
              source: 'team-metrics Slack channel',
              submittedBy: 'Communication monitoring',
              priority: 'Medium',
              confidence: 87
            },
          ].map((item, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === 'Fact' ? 'default' : 'secondary'}>
                        {item.type}
                      </Badge>
                      <Badge variant={item.priority === 'High' ? 'destructive' : 'outline'}>
                        {item.priority}
                      </Badge>
                      {item.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {item.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{item.content}</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Source: {item.source}</p>
                      <p>Submitted by: {item.submittedBy}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline">View Details</Button>
                    <Button size="sm" variant="outline">Reject</Button>
                    <Button size="sm">Approve</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {[
            {
              type: 'Fact',
              content: 'New API rate limiting implemented at 1000 requests/hour',
              approvedBy: 'Tech Lead',
              approvedAt: '2 hours ago'
            },
            {
              type: 'Document',
              content: 'User Manual v3.1.pdf',
              approvedBy: 'Product Manager',
              approvedAt: '4 hours ago'
            },
          ].map((item, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{item.type}</Badge>
                    <Badge variant="outline">Approved</Badge>
                  </div>
                  <p className="font-medium">{item.content}</p>
                  <p className="text-sm text-muted-foreground">
                    Approved by {item.approvedBy} • {item.approvedAt}
                  </p>
                </div>
                <Button size="sm" variant="outline">View</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No rejected items in the past 7 days.</p>
              <p className="text-sm">Items are automatically archived after 30 days.</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}