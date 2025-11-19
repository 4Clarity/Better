import { useState, useEffect } from 'react';
import { DocumentRevision } from '../../types/n8n';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Download, RotateCcw, CheckCircle, XCircle, Loader2, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface DocumentRevisionsProps {
  documentId: string;
  onClose: () => void;
}

export const DocumentRevisions = ({ documentId, onClose }: DocumentRevisionsProps) => {
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [selectedRevisions, setSelectedRevisions] = useState<[string, string] | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://api.tip.localhost';

  /**
   * Get authorization token
   */
  const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
  };

  /**
   * Fetch document revisions from API
   */
  const fetchRevisions = async () => {
    try {
      setError(null);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/knowledge/documents/${documentId}/revisions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        // Handle 404 gracefully - feature not implemented yet
        if (response.status === 404) {
          setError('Document revision tracking is coming soon! This feature is currently under development.');
        } else {
          throw new Error(`Failed to fetch revisions: ${response.statusText}`);
        }
        return;
      }

      const data = await response.json();

      // Transform dates from strings to Date objects
      const transformedData = data.map((revision: any) => ({
        ...revision,
        uploadedAt: new Date(revision.uploadedAt),
      }));

      setRevisions(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revisions');
      console.error('Error fetching revisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [documentId]);

  /**
   * Handle restore version action
   */
  const handleRestoreVersion = async (revisionId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/knowledge/documents/${documentId}/revisions/${revisionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to restore version: ${response.statusText}`);
      }

      // Refresh revisions after restore
      await fetchRevisions();
    } catch (err) {
      console.error('Error restoring version:', err);
      alert(err instanceof Error ? err.message : 'Failed to restore version');
    }
  };

  /**
   * Handle download version action
   */
  const handleDownloadVersion = async (revisionId: string, fileName: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/knowledge/documents/${documentId}/revisions/${revisionId}/download`, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download version: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading version:', err);
      alert(err instanceof Error ? err.message : 'Failed to download version');
    }
  };

  /**
   * Handle version comparison
   */
  // const handleCompareVersions = (revision1Id: string, revision2Id: string) => {
  //   setSelectedRevisions([revision1Id, revision2Id]);
  //   setShowComparison(true);
  // };

  /**
   * Get status badge variant and icon
   */
  const getStatusBadge = (status: DocumentRevision['status']) => {
    switch (status) {
      case 'completed':
        return { variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500' };
      case 'failed':
        return { variant: 'destructive' as const, icon: <XCircle className="w-3 h-3" />, color: 'text-red-500' };
      case 'processing':
        return { variant: 'secondary' as const, icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-blue-500' };
      default:
        return { variant: 'outline' as const, icon: null, color: 'text-gray-500' };
    }
  };

  /**
   * Format file size in bytes to human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format timestamp to local string
   */
  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Document Revisions</DialogTitle>
            <DialogDescription>Please wait while we fetch the revision history...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading revisions...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    const isComingSoon = error.includes('coming soon');
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isComingSoon ? 'Feature Coming Soon' : 'Error Loading Revisions'}</DialogTitle>
            <DialogDescription className={isComingSoon ? 'text-blue-600' : 'text-red-600'}>{error}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Revision History</DialogTitle>
          <DialogDescription>
            View and manage all versions of this document
          </DialogDescription>
        </DialogHeader>

        {showComparison ? (
          <ComparisonView
            documentId={documentId}
            revision1Id="rev-1"
            revision2Id="rev-2"
            onBack={() => setShowComparison(false)}
          />
        ) : (
          <div className="space-y-4">
            {revisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No revisions found for this document.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((revision) => {
                    const statusConfig = getStatusBadge(revision.status);
                    return (
                      <TableRow key={revision.id}>
                        <TableCell className="font-medium">
                          v{revision.version}
                          {revision.isLatest && (
                            <Badge variant="default" className="ml-2">
                              Latest
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatTimestamp(revision.uploadedAt)}</TableCell>
                        <TableCell>{revision.uploadedBy}</TableCell>
                        <TableCell>{formatFileSize(revision.fileSize)}</TableCell>
                        <TableCell>{revision.chunks}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
                            {statusConfig.icon}
                            <span className="capitalize">{revision.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {revision.isDuplicate ? (
                            <Badge variant="outline" className="text-orange-600">
                              Duplicate
                            </Badge>
                          ) : (
                            <Badge variant="outline">Revision</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!revision.isLatest && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestoreVersion(revision.id)}
                                title="Restore this version"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadVersion(revision.id, revision.fileName)}
                              title="Download this version"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          {showComparison && (
            <Button onClick={() => setShowComparison(false)} variant="outline">
              Back to List
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Comparison View Component (Side-by-Side)
 */
interface ComparisonViewProps {
  documentId: string;
  revision1Id: string;
  revision2Id: string;
  onBack: () => void;
}

const ComparisonView = ({ documentId, revision1Id, revision2Id }: ComparisonViewProps) => {
  // const [revision1, setRevision1] = useState<DocumentRevision | null>(null);
  // const [revision2, setRevision2] = useState<DocumentRevision | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // In a real implementation, fetch the full details of both revisions
    // For now, we'll show a placeholder
    setLoading(false);
  }, [documentId, revision1Id, revision2Id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading comparison...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Version Comparison</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Version 1</CardTitle>
            <CardDescription>ID: {revision1Id}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Detailed comparison view would be implemented here with side-by-side diff visualization.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 2</CardTitle>
            <CardDescription>ID: {revision2Id}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Detailed comparison view would be implemented here with side-by-side diff visualization.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
