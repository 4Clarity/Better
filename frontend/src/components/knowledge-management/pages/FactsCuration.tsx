import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';

export function FactsCuration() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Facts Curation</h2>
        <Button>Add Manual Fact</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pending Review</h3>
            <div className="space-y-3">
              {[
                {
                  fact: 'New API endpoint /v2/analytics released in version 3.2.1',
                  source: 'Product Spec v2.1.pdf',
                  confidence: 95,
                  category: 'Technical'
                },
                {
                  fact: 'Client feedback indicates 40% improvement in user satisfaction',
                  source: 'Client Feedback Report',
                  confidence: 87,
                  category: 'Metrics'
                },
                {
                  fact: 'Q4 roadmap includes mobile app development initiative',
                  source: 'sarah.johnson@company.com',
                  confidence: 92,
                  category: 'Planning'
                },
              ].map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{item.fact}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Source: {item.source}</span>
                      <span>•</span>
                      <span>Confidence: {item.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{item.category}</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Create New Fact</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Fact Statement</label>
                <Textarea
                  placeholder="Enter a clear, factual statement..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Source</label>
                <Input placeholder="Document name, URL, or person" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Select category...</option>
                  <option>Technical</option>
                  <option>Business</option>
                  <option>Metrics</option>
                  <option>Planning</option>
                  <option>Process</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <Input placeholder="comma, separated, tags" />
              </div>
              <Button className="w-full">Create Fact</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Recent Facts</h3>
            <div className="flex gap-2">
              <Input placeholder="Search facts..." className="w-64" />
              <Button variant="outline">Filter</Button>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                fact: 'User engagement increased by 25% after implementing new onboarding flow',
                category: 'Metrics',
                tags: ['onboarding', 'engagement', 'ux'],
                approved: '2 days ago',
                approver: 'Product Manager'
              },
              {
                fact: 'Database migration to PostgreSQL 14 completed successfully',
                category: 'Technical',
                tags: ['database', 'migration', 'postgresql'],
                approved: '3 days ago',
                approver: 'Tech Lead'
              },
              {
                fact: 'Partnership agreement with TechCorp signed for Q1 integration',
                category: 'Business',
                tags: ['partnership', 'integration', 'q1'],
                approved: '1 week ago',
                approver: 'Business Development'
              },
            ].map((item, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="font-medium">{item.fact}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <div className="flex gap-1">
                      {item.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs bg-muted px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Approved {item.approved} by {item.approver}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}