/**
 * RecommendationReviewPanel Component
 * Displays AI-generated tasks and milestones for review and selection
 * Story 1.4: AI-Assisted Transition Planning
 */

import React, { useState } from 'react';
import {
  TaskRecommendation,
  MilestoneRecommendation,
  TaskPriority,
} from '../../../types/ai-planning';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { CheckCircle2, Circle, Edit2, Calendar, Clock, Users, Target } from 'lucide-react';

interface RecommendationReviewPanelProps {
  tasks: TaskRecommendation[];
  milestones: MilestoneRecommendation[];
  selectedTaskIds: string[];
  selectedMilestoneIds: string[];
  onTaskSelectionChange: (taskIds: string[]) => void;
  onMilestoneSelectionChange: (milestoneIds: string[]) => void;
  onTaskEdit?: (index: number, updates: Partial<TaskRecommendation>) => void;
  onMilestoneEdit?: (index: number, updates: Partial<MilestoneRecommendation>) => void;
}

export const RecommendationReviewPanel: React.FC<RecommendationReviewPanelProps> = ({
  tasks,
  milestones,
  selectedTaskIds,
  selectedMilestoneIds,
  onTaskSelectionChange,
  onMilestoneSelectionChange,
  onTaskEdit,
  onMilestoneEdit,
}) => {
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-300';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case TaskPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === tasks.length) {
      onTaskSelectionChange([]);
    } else {
      onTaskSelectionChange(tasks.map((_, index) => `task-${index}`));
    }
  };

  const handleSelectAllMilestones = () => {
    if (selectedMilestoneIds.length === milestones.length) {
      onMilestoneSelectionChange([]);
    } else {
      onMilestoneSelectionChange(milestones.map((_, index) => `milestone-${index}`));
    }
  };

  const handleTaskSelection = (taskId: string) => {
    const newSelection = selectedTaskIds.includes(taskId)
      ? selectedTaskIds.filter((id) => id !== taskId)
      : [...selectedTaskIds, taskId];
    onTaskSelectionChange(newSelection);
  };

  const handleMilestoneSelection = (milestoneId: string) => {
    const newSelection = selectedMilestoneIds.includes(milestoneId)
      ? selectedMilestoneIds.filter((id) => id !== milestoneId)
      : [...selectedMilestoneIds, milestoneId];
    onMilestoneSelectionChange(newSelection);
  };

  const renderTaskCard = (task: TaskRecommendation, index: number) => {
    const taskId = `task-${index}`;
    const isSelected = selectedTaskIds.includes(taskId);
    const isEditing = editingTaskIndex === index;

    return (
      <Card
        key={taskId}
        className={`mb-3 transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Checkbox
                id={taskId}
                checked={isSelected}
                onCheckedChange={() => handleTaskSelection(taskId)}
                className="mt-1"
              />
              <div className="flex-1">
                {isEditing && onTaskEdit ? (
                  <Input
                    value={task.title}
                    onChange={(e) => onTaskEdit(index, { title: e.target.value })}
                    className="font-semibold mb-2"
                  />
                ) : (
                  <CardTitle className="text-base">{task.title}</CardTitle>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {task.assigned_role}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Day {task.days_from_start}
                  </Badge>
                  {task.estimated_hours && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimated_hours}h
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {onTaskEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingTaskIndex(isEditing ? null : index)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing && onTaskEdit ? (
            <Textarea
              value={task.description}
              onChange={(e) => onTaskEdit(index, { description: e.target.value })}
              rows={3}
              className="mb-2"
            />
          ) : (
            <CardDescription className="text-sm">{task.description}</CardDescription>
          )}
          {task.dependencies.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <strong>Dependencies:</strong> {task.dependencies.join(', ')}
            </div>
          )}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderMilestoneCard = (milestone: MilestoneRecommendation, index: number) => {
    const milestoneId = `milestone-${index}`;
    const isSelected = selectedMilestoneIds.includes(milestoneId);
    const isEditing = editingMilestoneIndex === index;

    return (
      <Card
        key={milestoneId}
        className={`mb-3 transition-all ${
          isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Checkbox
                id={milestoneId}
                checked={isSelected}
                onCheckedChange={() => handleMilestoneSelection(milestoneId)}
                className="mt-1"
              />
              <div className="flex-1">
                {isEditing && onMilestoneEdit ? (
                  <Input
                    value={milestone.title}
                    onChange={(e) => onMilestoneEdit(index, { title: e.target.value })}
                    className="font-semibold mb-2"
                  />
                ) : (
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    {milestone.title}
                  </CardTitle>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getPriorityColor(milestone.priority)}>
                    {milestone.priority}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Day {milestone.days_from_start}
                  </Badge>
                  {milestone.assigned_role && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {milestone.assigned_role}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {onMilestoneEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingMilestoneIndex(isEditing ? null : index)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing && onMilestoneEdit ? (
            <Textarea
              value={milestone.description}
              onChange={(e) => onMilestoneEdit(index, { description: e.target.value })}
              rows={3}
              className="mb-2"
            />
          ) : (
            <CardDescription className="text-sm">{milestone.description}</CardDescription>
          )}
          {milestone.success_criteria.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Success Criteria:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {milestone.success_criteria.map((criteria, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">AI-Generated Recommendations</h3>
            <p className="text-sm text-blue-700 mt-1">
              Review the tasks and milestones below. Select the ones you want to create, or edit
              them before accepting.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{tasks.length}</div>
            <div className="text-xs text-blue-700">Tasks</div>
            <div className="text-2xl font-bold text-purple-900 mt-2">{milestones.length}</div>
            <div className="text-xs text-purple-700">Milestones</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">
            Tasks ({selectedTaskIds.length}/{tasks.length})
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones ({selectedMilestoneIds.length}/{milestones.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Recommended Tasks</h4>
            <Button variant="outline" size="sm" onClick={handleSelectAllTasks}>
              {selectedTaskIds.length === tasks.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            {tasks.length > 0 ? (
              tasks.map((task, index) => renderTaskCard(task, index))
            ) : (
              <p className="text-center text-gray-500 py-8">No tasks generated</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Recommended Milestones</h4>
            <Button variant="outline" size="sm" onClick={handleSelectAllMilestones}>
              {selectedMilestoneIds.length === milestones.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            {milestones.length > 0 ? (
              milestones.map((milestone, index) => renderMilestoneCard(milestone, index))
            ) : (
              <p className="text-center text-gray-500 py-8">No milestones generated</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
