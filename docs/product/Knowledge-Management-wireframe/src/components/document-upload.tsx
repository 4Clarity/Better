import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Progress } from './ui/progress';

interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadDate: string;
  status: 'uploading' | 'processed' | 'error';
  progress?: number;
}

export function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Product_Specification_v2.pdf',
      size: '2.4 MB',
      type: 'PDF',
      uploadDate: '2024-01-15',
      status: 'processed'
    },
    {
      id: '2',
      name: 'Technical_Manual.docx',
      size: '1.8 MB',
      type: 'DOCX',
      uploadDate: '2024-01-14',
      status: 'processed'
    }
  ]);

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file, index) => {
      const newDoc: Document = {
        id: Date.now().toString() + index,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        type: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'uploading',
        progress: 0
      };

      setDocuments(prev => [...prev, newDoc]);

      // Simulate upload progress
      const interval = setInterval(() => {
        setDocuments(prev => prev.map(doc => {
          if (doc.id === newDoc.id && doc.progress! < 100) {
            return { ...doc, progress: doc.progress! + 10 };
          }
          if (doc.id === newDoc.id && doc.progress === 100) {
            clearInterval(interval);
            return { ...doc, status: 'processed', progress: undefined };
          }
          return doc;
        }));
      }, 200);
    });
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Processed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Product Documents</h2>
          <p className="text-muted-foreground">
            Upload product documentation, specifications, and reference materials for knowledge extraction.
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Drag and drop files here or click to browse. Supported formats: PDF, DOC, DOCX, TXT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg">Drop files here to upload</p>
                <p className="text-sm text-muted-foreground">or</p>
                <Label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Browse Files
                  </Button>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  />
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
            <CardDescription>
              Manage your uploaded product documents and their processing status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{doc.size}</span>
                        <span>{doc.type}</span>
                        <span>Uploaded {doc.uploadDate}</span>
                      </div>
                      {doc.status === 'uploading' && doc.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={doc.progress} className="w-full" />
                          <p className="text-xs text-muted-foreground mt-1">{doc.progress}% uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>No documents uploaded yet.</p>
                  <p className="text-sm">Upload your first document to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}