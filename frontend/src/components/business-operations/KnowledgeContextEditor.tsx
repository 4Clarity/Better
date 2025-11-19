import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Save, Edit, Loader2, FileText } from 'lucide-react';

interface KnowledgeContextEditorProps {
  productProgramId: string;
  initialContext: string | null | undefined;
  canEdit: boolean;
  onSave: (context: string) => Promise<void>;
}

const KnowledgeContextEditor: React.FC<KnowledgeContextEditorProps> = ({
  productProgramId,
  initialContext,
  canEdit,
  onSave,
}) => {
  const [context, setContext] = useState(initialContext || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContext(initialContext || '');
  }, [initialContext]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(context);
      setIsEditing(false);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save knowledge context:', error);
      alert('Failed to save knowledge context. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContext(initialContext || '');
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleChange = (value: string) => {
    setContext(value);
    setHasChanges(value !== (initialContext || ''));
  };

  const isEmpty = !context || context.trim().length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Context</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Additional narrative context for knowledge management
            </p>
          </div>
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={context}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter knowledge context information..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {context.length} characters
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No knowledge context provided yet.</p>
            {canEdit && (
              <p className="text-sm mt-1">
                Click "Edit" to add contextual information.
              </p>
            )}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border">
              {context}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeContextEditor;
