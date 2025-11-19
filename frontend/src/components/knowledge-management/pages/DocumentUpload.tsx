import { useState, useEffect, useRef } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { FolderOpen, Info, Upload, X, FileText, CheckCircle, AlertCircle, History, Play } from 'lucide-react';
import { settingsApi } from '../../../services/settingsApi';
import { documentApi } from '../../../services/documentApi';
import { useAuth } from '../../../contexts/AuthContext';
import { DocumentRevisions } from '../DocumentRevisions';

interface UploadedFile {
  file: File;
  id?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface RecentDocument {
  id: string;
  filename: string;
  upload_status: string;
  created_at: string;
  chunk_count: number;
}

export function DocumentUpload() {
  const { user } = useAuth();
  const [uploadPath, setUploadPath] = useState<string>('');
  const [maxFileSize, setMaxFileSize] = useState<number>(0);
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadRecentDocuments();
    const interval = setInterval(loadRecentDocuments, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [path, maxSize, fileTypes] = await Promise.all([
        settingsApi.getDocumentUploadPath(),
        settingsApi.getMaxFileSize(),
        settingsApi.getAllowedFileTypes(),
      ]);
      setUploadPath(path);
      setMaxFileSize(maxSize);
      setAllowedFileTypes(fileTypes);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatFileTypes = (): string => {
    return allowedFileTypes.map(type => type.toUpperCase()).join(', ');
  };

  const loadRecentDocuments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://py.tip.localhost/api/knowledge/documents?limit=10', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load recent documents:', error);
    }
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'UPLOADED': return 'Uploaded';
      case 'ANALYZING': return 'Analyzing';
      case 'EMBEDDING': return 'Embedding';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      default: return status;
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  // File selection handlers
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessDocument = async (documentId: string) => {
    try {
      setProcessingDocId(documentId);
      await documentApi.triggerDocumentProcessing(documentId);
      // Refresh document list to show updated status
      await loadRecentDocuments();
    } catch (error) {
      console.error('Failed to trigger document processing:', error);
      alert(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingDocId(null);
    }
  };

  const uploadFile = async (fileItem: UploadedFile, index: number) => {
    try {
      // Update status to uploading
      setSelectedFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'uploading' as const } : f
      ));

      const formData = new FormData();
      // Append the actual file (required by backend)
      formData.append('file', fileItem.file);
      // Use user ID if available, otherwise use a system user ID
      const userId = user?.id || 'user-richard-001'; // Fallback to known user
      formData.append('uploaded_by', userId);
      formData.append('security_classification', 'UNCLASSIFIED');

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://py.tip.localhost/api/knowledge/upload', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update status to processing
      setSelectedFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'processing' as const, id: result.document_id, progress: 100 } : f
      ));

      // Poll for processing status
      pollDocumentStatus(result.document_id, index);
    } catch (error) {
      console.error('Upload error:', error);
      setSelectedFiles(prev => prev.map((f, i) =>
        i === index ? {
          ...f,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const pollDocumentStatus = async (documentId: string, index: number) => {
    const maxAttempts = 60; // Poll for up to 2 minutes
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://py.tip.localhost/api/knowledge/documents/${documentId}/status`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error('Status check failed');
        }

        const status = await response.json();

        if (status.upload_status === 'COMPLETED') {
          setSelectedFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status: 'completed' as const } : f
          ));
          clearInterval(poll);
          loadRecentDocuments(); // Refresh the recent documents list
        } else if (status.upload_status === 'FAILED') {
          setSelectedFiles(prev => prev.map((f, i) =>
            i === index ? {
              ...f,
              status: 'failed' as const,
              error: status.processing_error || 'Processing failed'
            } : f
          ));
          clearInterval(poll);
          loadRecentDocuments(); // Refresh the recent documents list
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        setSelectedFiles(prev => prev.map((f, i) =>
          i === index ? { ...f, status: 'failed' as const, error: 'Processing timeout' } : f
        ));
      }
    }, 2000); // Poll every 2 seconds
  };

  const uploadAllFiles = async () => {
    const pendingFiles = selectedFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending');

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Product Documents</h2>
        <div className="flex gap-2">
          <Button onClick={handleBrowseClick} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
          {selectedFiles.length > 0 && (
            <Button onClick={uploadAllFiles} disabled={!selectedFiles.some(f => f.status === 'pending')}>
              Upload {selectedFiles.filter(f => f.status === 'pending').length} File(s)
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        accept=".pdf,.docx,.doc,.txt,.html,.md"
        className="hidden"
      />

      {/* Storage Configuration Info */}
      {!loading && uploadPath && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="font-medium">Upload Path:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">{uploadPath}</code>
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="font-medium">Max Size:</span>
              <span className="text-xs">{formatFileSize(maxFileSize)}</span>
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="font-medium">Allowed:</span>
              <span className="text-xs">{formatFileTypes()}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Upload New Document</h3>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Drop files here or click to browse</p>
                  <p className="text-xs mt-1">
                    {loading ? 'Loading restrictions...' : `${formatFileTypes()} up to ${formatFileSize(maxFileSize)}`}
                  </p>
                  {uploadPath && (
                    <p className="text-xs mt-1 text-muted-foreground/70">
                      Files will be stored in: <code className="bg-muted px-1 rounded">{uploadPath}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
                {selectedFiles.map((fileItem, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileItem.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fileItem.status === 'pending' && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {fileItem.status === 'uploading' && (
                        <Badge variant="secondary">Uploading...</Badge>
                      )}
                      {fileItem.status === 'processing' && (
                        <Badge variant="secondary">Processing...</Badge>
                      )}
                      {fileItem.status === 'completed' && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {fileItem.status === 'failed' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {fileItem.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Uploads</h3>
            <div className="space-y-3">
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet</p>
              ) : (
                recentDocuments.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(doc.created_at)} • {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(doc.upload_status)}>
                        {getStatusDisplay(doc.upload_status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDocumentId(doc.id);
                          setShowRevisions(true);
                        }}
                        title="View revisions"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Document Processing Queue</h3>
        <div className="space-y-3">
          {recentDocuments.filter(doc => ['UPLOADED', 'ANALYZING', 'EMBEDDING'].includes(doc.upload_status)).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No documents currently processing</p>
          ) : (
            recentDocuments
              .filter(doc => ['UPLOADED', 'ANALYZING', 'EMBEDDING'].includes(doc.upload_status))
              .map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium flex-1 truncate">{item.filename}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">{getStatusDisplay(item.upload_status)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleProcessDocument(item.id)}
                        disabled={processingDocId === item.id}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Process document"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse"
                      style={{ width: item.upload_status === 'UPLOADED' ? '10%' : item.upload_status === 'ANALYZING' ? '50%' : '90%' }}
                    />
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>

      {/* Document Revisions Dialog */}
      {showRevisions && selectedDocumentId && (
        <DocumentRevisions
          documentId={selectedDocumentId}
          onClose={() => {
            setShowRevisions(false);
            setSelectedDocumentId(null);
          }}
        />
      )}
    </div>
  );
}