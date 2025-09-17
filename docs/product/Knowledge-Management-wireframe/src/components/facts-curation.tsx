import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Brain, CheckCircle, XCircle, Edit, Search, Filter, ArrowRight, History, GitBranch, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Fact {
  id: string;
  content: string;
  confidenceScore: number;
  source: string;
  sourceType: 'document' | 'communication';
  category: string;
  tags: string[];
  extractedDate: string;
  status: 'draft' | 'reviewed' | 'approved' | 'rejected';
  reviewNotes?: string;
  version: number;
  previousVersions: FactVersion[];
  revisionCycles: number;
  lastModified: string;
  modifiedBy: string;
}

interface FactVersion {
  version: number;
  content: string;
  confidenceScore: number;
  modifiedDate: string;
  modifiedBy: string;
  changeReason: string;
}

export function FactsCuration() {
  const [facts, setFacts] = useState<Fact[]>([
    {
      id: '1',
      content: 'The product requires enhanced security features including multi-factor authentication and encryption.',
      confidenceScore: 95,
      source: 'Client Requirements Discussion',
      sourceType: 'communication',
      category: 'Security',
      tags: ['authentication', 'encryption', 'security'],
      extractedDate: '2024-01-16',
      status: 'draft',
      version: 2,
      previousVersions: [
        {
          version: 1,
          content: 'The product needs security improvements including authentication.',
          confidenceScore: 78,
          modifiedDate: '2024-01-15',
          modifiedBy: 'AI System',
          changeReason: 'Updated with more specific requirements from client discussion'
        }
      ],
      revisionCycles: 1,
      lastModified: '2024-01-16T10:30:00',
      modifiedBy: 'Knowledge Curator'
    },
    {
      id: '2',
      content: 'Current authentication system has reported issues affecting multiple users.',
      confidenceScore: 88,
      source: 'Support Ticket Analysis',
      sourceType: 'communication',
      category: 'Issues',
      tags: ['authentication', 'bugs', 'user-experience'],
      extractedDate: '2024-01-15',
      status: 'reviewed',
      version: 1,
      previousVersions: [],
      revisionCycles: 0,
      lastModified: '2024-01-15T14:20:00',
      modifiedBy: 'AI System'
    },
    {
      id: '3',
      content: 'Product specifications indicate maximum response time should not exceed 500ms.',
      confidenceScore: 99,
      source: 'Product_Specification_v2.pdf',
      sourceType: 'document',
      category: 'Performance',
      tags: ['performance', 'specifications', 'response-time'],
      extractedDate: '2024-01-15',
      status: 'approved',
      version: 3,
      previousVersions: [
        {
          version: 1,
          content: 'Response time requirements mentioned in specifications.',
          confidenceScore: 85,
          modifiedDate: '2024-01-13',
          modifiedBy: 'Document Parser',
          changeReason: 'Initial extraction'
        },
        {
          version: 2,
          content: 'Product specifications require response time under 1000ms.',
          confidenceScore: 92,
          modifiedDate: '2024-01-14',
          modifiedBy: 'Knowledge Curator',
          changeReason: 'Added specific timing requirement'
        }
      ],
      revisionCycles: 2,
      lastModified: '2024-01-15T09:15:00',
      modifiedBy: 'Senior Analyst'
    },
    {
      id: '4',
      content: 'API rate limiting should be implemented with a default of 1000 requests per hour.',
      confidenceScore: 82,
      source: 'Technical_Manual.docx',
      sourceType: 'document',
      category: 'API',
      tags: ['api', 'rate-limiting', 'performance'],
      extractedDate: '2024-01-14',
      status: 'draft',
      version: 1,
      previousVersions: [],
      revisionCycles: 0,
      lastModified: '2024-01-14T16:45:00',
      modifiedBy: 'Document Parser'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFactHistory, setSelectedFactHistory] = useState<Fact | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const filteredFacts = facts.filter(fact => {
    const matchesSearch = fact.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fact.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || fact.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || fact.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = [...new Set(facts.map(fact => fact.category))];

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadge = (status: Fact['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'reviewed':
        return <Badge variant="outline">Reviewed</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const updateFactStatus = (factId: string, newStatus: Fact['status']) => {
    setFacts(prev => prev.map(fact => 
      fact.id === factId ? { ...fact, status: newStatus } : fact
    ));
  };

  const editFact = (fact: Fact) => {
    setEditingFact({ ...fact });
    setIsEditDialogOpen(true);
  };

  const saveFactEdit = () => {
    if (!editingFact) return;
    
    setFacts(prev => prev.map(fact => 
      fact.id === editingFact.id ? editingFact : fact
    ));
    setIsEditDialogOpen(false);
    setEditingFact(null);
  };

  const queueForApproval = (factId: string) => {
    updateFactStatus(factId, 'reviewed');
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Facts Curation</h2>
          <p className="text-muted-foreground">
            Review, edit, and manage extracted facts with confidence scores before approval.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Facts</p>
                  <p className="text-2xl font-bold">{facts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Approved</p>
                  <p className="text-2xl font-bold">{facts.filter(f => f.status === 'approved').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">In Review</p>
                  <p className="text-2xl font-bold">{facts.filter(f => f.status === 'reviewed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Revision Cycles</p>
                  <p className="text-2xl font-bold">
                    {facts.reduce((acc, fact) => acc + fact.revisionCycles, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search facts by content or tags..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="min-w-32">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-32">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facts List */}
        <div className="space-y-4">
          {filteredFacts.map((fact) => (
            <Card key={fact.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{fact.category}</Badge>
                        <Badge variant="outline" className={getConfidenceColor(fact.confidenceScore)}>
                          {fact.confidenceScore}% confidence
                        </Badge>
                        {getStatusBadge(fact.status)}
                        <Badge variant="secondary" className="text-xs">
                          v{fact.version}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From {fact.source} • {fact.extractedDate} • {fact.sourceType} • {fact.revisionCycles} revision{fact.revisionCycles !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="leading-relaxed">{fact.content}</p>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {fact.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Confidence Score</span>
                        <span>{fact.confidenceScore}%</span>
                      </div>
                      <Progress value={fact.confidenceScore} className="h-2" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editFact(fact)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFactHistory(fact);
                          setIsHistoryDialogOpen(true);
                        }}
                      >
                        <History className="mr-2 h-4 w-4" />
                        History
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {fact.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => queueForApproval(fact.id)}
                        >
                          Queue for Approval
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      {fact.status === 'reviewed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateFactStatus(fact.id, 'rejected')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateFactStatus(fact.id, 'approved')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredFacts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No facts match your current filters.</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Fact Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Fact</DialogTitle>
              <DialogDescription>
                Modify the fact content, confidence score, and metadata.
              </DialogDescription>
            </DialogHeader>
            {editingFact && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={editingFact.content}
                    onChange={(e) => setEditingFact(prev => prev ? { ...prev, content: e.target.value } : null)}
                    className="min-h-24"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={editingFact.category}
                      onChange={(e) => setEditingFact(prev => prev ? { ...prev, category: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confidence Score (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingFact.confidenceScore}
                      onChange={(e) => setEditingFact(prev => prev ? { ...prev, confidenceScore: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    value={editingFact.tags.join(', ')}
                    onChange={(e) => setEditingFact(prev => prev ? { 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    } : null)}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveFactEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Fact Version History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Fact Version History</span>
              </DialogTitle>
              <DialogDescription>
                View all versions and revisions of this fact over time.
              </DialogDescription>
            </DialogHeader>
            {selectedFactHistory && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-4 border-b">
                  <Badge variant="outline">{selectedFactHistory.category}</Badge>
                  <Badge variant="secondary">
                    Current Version: {selectedFactHistory.version}
                  </Badge>
                  <Badge variant="outline">
                    {selectedFactHistory.revisionCycles} revision cycles
                  </Badge>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Current Version */}
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Current - v{selectedFactHistory.version}</Badge>
                        <Badge variant="outline" className={getConfidenceColor(selectedFactHistory.confidenceScore)}>
                          {selectedFactHistory.confidenceScore}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(selectedFactHistory.lastModified).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-2">
                      {selectedFactHistory.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Modified by: {selectedFactHistory.modifiedBy}
                    </p>
                  </div>

                  {/* Previous Versions */}
                  {selectedFactHistory.previousVersions.map((version) => (
                    <div key={version.version} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">v{version.version}</Badge>
                          <Badge variant="outline" className={getConfidenceColor(version.confidenceScore)}>
                            {version.confidenceScore}% confidence
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {new Date(version.modifiedDate).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed mb-2 text-muted-foreground">
                        {version.content}
                      </p>
                      <div className="text-xs space-y-1">
                        <p><span className="font-medium">Modified by:</span> {version.modifiedBy}</p>
                        <p><span className="font-medium">Change reason:</span> {version.changeReason}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
                    Close
                  </Button>
                  <Button variant="outline">
                    Export History
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