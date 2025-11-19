import React, { useState, useEffect } from 'react';
import { ProductProgramKnowledgeLink } from '../../types/knowledge-link';
import {
  getKnowledgeLinks,
  linkKnowledgeItem,
  unlinkKnowledgeItem,
} from '../../services/productProgramApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus, ExternalLink, Trash2, Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface KnowledgeLinkManagerProps {
  productProgramId: string;
  canEdit: boolean;
}

const KnowledgeLinkManager: React.FC<KnowledgeLinkManagerProps> = ({
  productProgramId,
  canEdit,
}) => {
  const [links, setLinks] = useState<ProductProgramKnowledgeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    knowledgeItemId: '',
    linkType: 'Reference',
  });

  useEffect(() => {
    loadLinks();
  }, [productProgramId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await getKnowledgeLinks(productProgramId);
      setLinks(data);
    } catch (error) {
      console.error('Failed to load knowledge links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkKnowledge = async () => {
    try {
      const newLink = await linkKnowledgeItem(productProgramId, {
        knowledgeItemId: formData.knowledgeItemId,
        linkType: formData.linkType,
      });
      setLinks([...links, newLink]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to link knowledge item:', error);
      alert('Failed to link knowledge item. It may already be linked.');
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (
      !window.confirm('Are you sure you want to remove this knowledge link?')
    ) {
      return;
    }
    try {
      await unlinkKnowledgeItem(linkId);
      setLinks(links.filter((l) => l.id !== linkId));
    } catch (error) {
      console.error('Failed to unlink knowledge item:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      knowledgeItemId: '',
      linkType: 'Reference',
    });
  };

  const getLinkTypeBadge = (linkType?: string) => {
    if (!linkType) return null;
    const styles: Record<string, string> = {
      Reference: 'bg-blue-100 text-blue-800',
      Related: 'bg-purple-100 text-purple-800',
      Dependency: 'bg-orange-100 text-orange-800',
    };
    return (
      <Badge className={styles[linkType] || 'bg-gray-100 text-gray-800'}>
        {linkType}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Links</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {links.length} knowledge item{links.length !== 1 ? 's' : ''} linked
            </p>
          </div>
          {canEdit && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Link Knowledge Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Knowledge Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">
                      Knowledge Item ID
                    </label>
                    <Input
                      value={formData.knowledgeItemId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          knowledgeItemId: e.target.value,
                        })
                      }
                      placeholder="Enter knowledge item ID"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the ID of the knowledge management item you want to
                      link
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Link Type</label>
                    <Select
                      value={formData.linkType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, linkType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reference">Reference</SelectItem>
                        <SelectItem value="Related">Related</SelectItem>
                        <SelectItem value="Dependency">Dependency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleLinkKnowledge}
                      disabled={!formData.knowledgeItemId}
                    >
                      Link Item
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No knowledge items linked yet.</p>
            {canEdit && (
              <p className="text-sm">
                Click "Link Knowledge Item" to connect relevant documentation.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{link.knowledgeItemId}</span>
                    {getLinkTypeBadge(link.linkType)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Linked {format(new Date(link.linkedAt), 'MMM d, yyyy')}
                    </span>
                    {link.linkedByUser && (
                      <span>
                        by {link.linkedByUser.person?.firstName}{' '}
                        {link.linkedByUser.person?.lastName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: Navigate to knowledge management item
                      window.open(
                        `/knowledge/${link.knowledgeItemId}`,
                        '_blank'
                      );
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnlink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KnowledgeLinkManager;
