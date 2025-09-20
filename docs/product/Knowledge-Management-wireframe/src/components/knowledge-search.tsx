import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  Search, 
  Filter, 
  Clock, 
  FileText, 
  MessageSquare, 
  Database,
  Star,
  ArrowUpRight,
  Calendar,
  User,
  Tag,
  Eye
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'fact' | 'document' | 'communication';
  source: string;
  category: string;
  tags: string[];
  confidence: number;
  lastUpdated: string;
  version: number;
  approved: boolean;
  viewCount: number;
  rating: number;
}

interface SearchFilters {
  type: string;
  category: string;
  confidence: string;
  dateRange: string;
  approved: string;
}

export function KnowledgeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    category: 'all',
    confidence: 'all',
    dateRange: 'all',
    approved: 'all'
  });
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const [searchResults] = useState<SearchResult[]>([
    {
      id: '1',
      title: 'Multi-factor Authentication Requirements',
      content: 'The product requires enhanced security features including multi-factor authentication and encryption to meet enterprise security standards.',
      type: 'fact',
      source: 'Client Requirements Discussion',
      category: 'Security',
      tags: ['authentication', 'encryption', 'security', 'requirements'],
      confidence: 95,
      lastUpdated: '2024-01-16',
      version: 2,
      approved: true,
      viewCount: 47,
      rating: 4.8
    },
    {
      id: '2',
      title: 'API Rate Limiting Configuration',
      content: 'API rate limiting should be implemented with a default of 1000 requests per hour to prevent service abuse and ensure system stability.',
      type: 'fact',
      source: 'Technical_Manual.docx',
      category: 'API',
      tags: ['api', 'rate-limiting', 'performance', 'configuration'],
      confidence: 82,
      lastUpdated: '2024-01-15',
      version: 1,
      approved: true,
      viewCount: 32,
      rating: 4.5
    },
    {
      id: '3',
      title: 'Database Backup Strategy',
      content: 'Database backup frequency should be increased to daily instead of weekly to ensure data integrity and reduce potential data loss.',
      type: 'fact',
      source: 'Infrastructure Review Meeting',
      category: 'Infrastructure',
      tags: ['database', 'backup', 'reliability', 'data-integrity'],
      confidence: 91,
      lastUpdated: '2024-01-14',
      version: 3,
      approved: true,
      viewCount: 28,
      rating: 4.9
    },
    {
      id: '4',
      title: 'Product Specification Document v2.1',
      content: 'Complete product specifications including technical requirements, user interface guidelines, and integration protocols.',
      type: 'document',
      source: 'Product_Specification_v2.1.pdf',
      category: 'Documentation',
      tags: ['specifications', 'requirements', 'technical', 'guidelines'],
      confidence: 99,
      lastUpdated: '2024-01-13',
      version: 1,
      approved: true,
      viewCount: 156,
      rating: 4.7
    },
    {
      id: '5',
      title: 'User Interface Preferences Discussion',
      content: 'Team discussion about user interface improvements, dark mode preferences, and accessibility features based on user feedback.',
      type: 'communication',
      source: 'UX Team Meeting',
      category: 'UI/UX',
      tags: ['ui', 'dark-mode', 'accessibility', 'user-feedback'],
      confidence: 78,
      lastUpdated: '2024-01-12',
      version: 1,
      approved: false,
      viewCount: 23,
      rating: 4.2
    }
  ]);

  const filteredResults = searchResults.filter(result => {
    const matchesQuery = searchQuery === '' || 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filters.type === 'all' || result.type === filters.type;
    const matchesCategory = filters.category === 'all' || result.category === filters.category;
    const matchesConfidence = filters.confidence === 'all' || 
      (filters.confidence === 'high' && result.confidence >= 90) ||
      (filters.confidence === 'medium' && result.confidence >= 70 && result.confidence < 90) ||
      (filters.confidence === 'low' && result.confidence < 70);
    const matchesApproval = filters.approved === 'all' || 
      (filters.approved === 'approved' && result.approved) ||
      (filters.approved === 'pending' && !result.approved);

    return matchesQuery && matchesType && matchesCategory && matchesConfidence && matchesApproval;
  });

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'fact':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const openDetailDialog = (result: SearchResult) => {
    setSelectedResult(result);
    setIsDetailDialogOpen(true);
  };

  const categories = [...new Set(searchResults.map(result => result.category))];

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Knowledge Search</h2>
          <p className="text-muted-foreground">
            Search through approved facts, documents, and communications in the knowledge base.
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="fact">Facts</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="communication">Communications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Confidence</label>
                <Select value={filters.confidence} onValueChange={(value) => setFilters(prev => ({ ...prev, confidence: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="high">High (90%+)</SelectItem>
                    <SelectItem value="medium">Medium (70-89%)</SelectItem>
                    <SelectItem value="low">Low (&lt;70%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filters.approved} onValueChange={(value) => setFilters(prev => ({ ...prev, approved: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setFilters({ type: 'all', category: 'all', confidence: 'all', dateRange: 'all', approved: 'all' })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredResults.length} results found
            </p>
            <Select defaultValue="relevance">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(result.type)}
                        <h3 className="font-semibold">{result.title}</h3>
                        {result.approved && <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>}
                        {!result.approved && <Badge variant="secondary">Pending</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailDialog(result)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline">{result.category}</Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
                            {result.confidence}% confidence
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{result.lastUpdated}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{result.viewCount} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{result.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 4).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {result.tags.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{result.tags.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredResults.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No results found matching your search criteria.</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search terms or filters.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {selectedResult && getTypeIcon(selectedResult.type)}
                <span>{selectedResult?.title}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.source} • Version {selectedResult?.version}
              </DialogDescription>
            </DialogHeader>
            {selectedResult && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{selectedResult.category}</Badge>
                  <Badge variant="outline" className={getConfidenceColor(selectedResult.confidence)}>
                    {selectedResult.confidence}% confidence
                  </Badge>
                  {selectedResult.approved ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  <div className="flex items-center space-x-1 ml-auto">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{selectedResult.rating}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Content</h4>
                  <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-md">
                    {selectedResult.content}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source:</span>
                        <span>{selectedResult.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span>{selectedResult.lastUpdated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Views:</span>
                        <span>{selectedResult.viewCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version:</span>
                        <span>{selectedResult.version}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedResult.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Close
                  </Button>
                  <Button>
                    View Full History
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}