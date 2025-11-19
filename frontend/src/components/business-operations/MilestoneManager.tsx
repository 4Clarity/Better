import React, { useState, useEffect } from 'react';
import {
  ProductProgramMilestone,
  MilestoneStatus,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from '../../types/milestone';
import {
  createMilestone,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  markMilestoneAchieved,
} from '../../services/milestoneApi';
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
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus, Award, Trash2, Edit, Loader2, Calendar } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface MilestoneManagerProps {
  productProgramId: string;
  canEdit: boolean;
}

const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  productProgramId,
  canEdit,
}) => {
  const [milestones, setMilestones] = useState<ProductProgramMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProductProgramMilestone | null>(
    null
  );
  const [formData, setFormData] = useState<CreateMilestoneRequest>({
    title: '',
    description: '',
    targetDate: '',
    status: MilestoneStatus.UPCOMING,
  });

  useEffect(() => {
    loadMilestones();
  }, [productProgramId]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const data = await getMilestones(productProgramId);
      // Sort by target date
      const sorted = data.sort(
        (a, b) =>
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      );
      setMilestones(sorted);
    } catch (error) {
      console.error('Failed to load milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    try {
      const newMilestone = await createMilestone(productProgramId, formData);
      setMilestones([...milestones, newMilestone].sort(
        (a, b) =>
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      ));
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  const handleUpdateMilestone = async (
    milestoneId: string,
    data: UpdateMilestoneRequest
  ) => {
    try {
      const updatedMilestone = await updateMilestone(milestoneId, data);
      setMilestones(
        milestones
          .map((m) => (m.id === milestoneId ? updatedMilestone : m))
          .sort(
            (a, b) =>
              new Date(a.targetDate).getTime() -
              new Date(b.targetDate).getTime()
          )
      );
      setEditingMilestone(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }
    try {
      await deleteMilestone(milestoneId);
      setMilestones(milestones.filter((m) => m.id !== milestoneId));
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const handleMarkAchieved = async (milestoneId: string) => {
    try {
      const updatedMilestone = await markMilestoneAchieved(milestoneId);
      setMilestones(
        milestones.map((m) => (m.id === milestoneId ? updatedMilestone : m))
      );
    } catch (error) {
      console.error('Failed to mark milestone achieved:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetDate: '',
      status: MilestoneStatus.UPCOMING,
    });
  };

  const openEditDialog = (milestone: ProductProgramMilestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || '',
      targetDate: format(new Date(milestone.targetDate), 'yyyy-MM-dd'),
      status: milestone.status,
    });
  };

  const getStatusBadge = (milestone: ProductProgramMilestone) => {
    const { status, targetDate } = milestone;
    const isOverdue =
      status !== MilestoneStatus.ACHIEVED &&
      status !== MilestoneStatus.CANCELLED &&
      isPast(new Date(targetDate));

    const styles = {
      [MilestoneStatus.UPCOMING]: 'bg-gray-100 text-gray-800',
      [MilestoneStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [MilestoneStatus.ACHIEVED]: 'bg-green-100 text-green-800',
      [MilestoneStatus.MISSED]: 'bg-orange-100 text-orange-800',
      [MilestoneStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={isOverdue ? 'bg-orange-100 text-orange-800' : styles[status]}>
        {isOverdue ? 'OVERDUE' : status.replace('_', ' ')}
      </Badge>
    );
  };

  const achievedCount = milestones.filter(
    (m) => m.status === MilestoneStatus.ACHIEVED
  ).length;
  const totalCount = milestones.length;

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
            <CardTitle>Milestones</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {achievedCount} of {totalCount} milestones achieved
            </p>
          </div>
          {canEdit && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Milestone title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Milestone description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Date</label>
                    <Input
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) =>
                        setFormData({ ...formData, targetDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          status: value as MilestoneStatus,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MilestoneStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ')}
                          </SelectItem>
                        ))}
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
                    <Button onClick={handleCreateMilestone}>
                      Create Milestone
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No milestones yet. {canEdit && 'Click "Add Milestone" to create one.'}
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id}>
                <div className="flex items-start gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        milestone.status === MilestoneStatus.ACHIEVED
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-200 my-1" />
                    )}
                  </div>

                  {/* Milestone content */}
                  <div className="flex-1 border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">
                            {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                          </span>
                          {getStatusBadge(milestone)}
                        </div>
                        <h4 className="font-medium text-lg mb-1">
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {milestone.description}
                          </p>
                        )}
                        {milestone.achievedAt && (
                          <p className="text-xs text-green-600">
                            Achieved on{' '}
                            {format(new Date(milestone.achievedAt), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2 ml-4">
                          {milestone.status !== MilestoneStatus.ACHIEVED && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAchieved(milestone.id)}
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(milestone)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingMilestone && (
          <Dialog
            open={!!editingMilestone}
            onOpenChange={(open) => !open && setEditingMilestone(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <Input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as MilestoneStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(MilestoneStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMilestone(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      handleUpdateMilestone(editingMilestone.id, formData)
                    }
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default MilestoneManager;
