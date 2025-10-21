import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Search, Loader2 } from 'lucide-react';

interface SearchResult {
  chunk_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  semantic_boundary_type: string | null;
  vector_model: string;
  thought_completeness_score: number | null;
  document_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  security_classification: string;
  created_at: string;
  similarity_score: number;
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [resultLimit, setResultLimit] = useState(10);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://py.tip.localhost/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: resultLimit,
          similarity_threshold: similarityThreshold
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error('Search failed:', response.statusText);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatSimilarity = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Knowledge Search</h2>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search knowledge base using semantic search..."
              className="flex-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-medium mb-4">Search Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Similarity Threshold: {Math.round(similarityThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher values return more relevant but fewer results
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Results</label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={resultLimit}
                  onChange={(e) => setResultLimit(parseInt(e.target.value))}
                >
                  <option value="5">5 results</option>
                  <option value="10">10 results</option>
                  <option value="20">20 results</option>
                  <option value="50">50 results</option>
                </select>
              </div>
              {hasSearched && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {!hasSearched ? (
              <Card className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Search the Knowledge Base</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a query above to search through all uploaded documents using semantic search
                </p>
              </Card>
            ) : loading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Searching knowledge base...</p>
              </Card>
            ) : results.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">
                  Try lowering the similarity threshold or using different search terms
                </p>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                  </p>
                </div>

                {results.map((result) => (
                  <Card key={result.chunk_id} className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default">Document Chunk</Badge>
                            <Badge variant="outline">{result.security_classification}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatSimilarity(result.similarity_score)} match
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {result.token_count} tokens
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{result.filename}</h4>
                            <span className="text-xs text-muted-foreground">
                              (chunk {result.chunk_index + 1})
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
                            {result.content}
                          </p>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Model: {result.vector_model}</span>
                            {result.semantic_boundary_type && (
                              <>
                                <span>•</span>
                                <span>Type: {result.semantic_boundary_type}</span>
                              </>
                            )}
                            {result.created_at && (
                              <>
                                <span>•</span>
                                <span>Uploaded {getTimeAgo(result.created_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}