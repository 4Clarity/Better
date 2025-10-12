import { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { FolderOpen, Info } from 'lucide-react';
import { settingsApi } from '../../../services/settingsApi';

export function DocumentUpload() {
  const [uploadPath, setUploadPath] = useState<string>('');
  const [maxFileSize, setMaxFileSize] = useState<number>(0);
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Product Documents</h2>
        <Button>Upload Document</Button>
      </div>

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
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm text-muted-foreground">
                  <p>Drop files here or click to browse</p>
                  <p className="text-xs">
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
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Uploads</h3>
            <div className="space-y-3">
              {[
                { name: 'Product Spec v2.1.pdf', status: 'Processing', time: '2 minutes ago' },
                { name: 'User Guide Draft.docx', status: 'Completed', time: '1 hour ago' },
                { name: 'Technical Requirements.pdf', status: 'Completed', time: '3 hours ago' },
              ].map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.time}</p>
                  </div>
                  <Badge variant={doc.status === 'Completed' ? 'default' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Document Processing Queue</h3>
        <div className="space-y-3">
          {[
            { name: 'Architecture Overview.pdf', progress: 85, stage: 'Extracting facts' },
            { name: 'API Documentation.md', progress: 45, stage: 'Content analysis' },
            { name: 'Release Notes v3.0.docx', progress: 20, stage: 'File processing' },
          ].map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.stage}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}