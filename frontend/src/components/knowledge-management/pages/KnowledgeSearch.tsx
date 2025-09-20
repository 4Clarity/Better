import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';

export function KnowledgeSearch() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Knowledge Search</h2>
        <Button variant="outline">Advanced Search</Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search facts, documents, and communications..."
              className="flex-1"
            />
            <Button>Search</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Quick filters:</span>
            {['Recent', 'High Confidence', 'Technical', 'Business', 'Metrics'].map((filter) => (
              <Button key={filter} variant="outline" size="sm">
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-medium mb-4">Filter Results</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Content Type</label>
                <div className="space-y-2">
                  {['Facts', 'Documents', 'Communications'].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select className="w-full p-2 border rounded-md text-sm">
                  <option>All Categories</option>
                  <option>Technical</option>
                  <option>Business</option>
                  <option>Metrics</option>
                  <option>Planning</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <select className="w-full p-2 border rounded-md text-sm">
                  <option>All Time</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing 247 results for "api"
              </p>
              <select className="p-2 border rounded-md text-sm">
                <option>Sort by Relevance</option>
                <option>Sort by Date</option>
                <option>Sort by Confidence</option>
              </select>
            </div>

            {[
              {
                type: 'Fact',
                title: 'New API endpoint /v2/analytics released in version 3.2.1',
                source: 'Product Spec v2.1.pdf',
                confidence: 95,
                category: 'Technical',
                date: '2 days ago',
                tags: ['api', 'analytics', 'v3.2.1']
              },
              {
                type: 'Document',
                title: 'API Documentation v3.0.pdf',
                source: 'Direct upload',
                confidence: null,
                category: 'Technical',
                date: '1 week ago',
                tags: ['api', 'documentation', 'v3.0']
              },
              {
                type: 'Communication',
                title: 'API rate limiting discussion',
                source: '#dev-team Slack channel',
                confidence: 82,
                category: 'Technical',
                date: '3 days ago',
                tags: ['api', 'rate-limiting', 'performance']
              },
              {
                type: 'Fact',
                title: 'API response time improved by 40% after optimization',
                source: 'Performance Report Q3',
                confidence: 91,
                category: 'Metrics',
                date: '1 week ago',
                tags: ['api', 'performance', 'optimization']
              },
            ].map((result, index) => (
              <Card key={index} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={result.type === 'Fact' ? 'default' : result.type === 'Document' ? 'secondary' : 'outline'}>
                          {result.type}
                        </Badge>
                        <Badge variant="outline">{result.category}</Badge>
                        {result.confidence && (
                          <span className="text-xs text-muted-foreground">
                            {result.confidence}% confidence
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium">{result.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        Source: {result.source} • {result.date}
                      </div>
                      <div className="flex gap-1">
                        {result.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="text-xs bg-muted px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex justify-center">
              <Button variant="outline">Load More Results</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}