import React, { useState, useEffect } from 'react';
import {
  ProductProgramTask,
  TaskStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../../types/task';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  markTaskComplete,
} from '../../services/taskApi';
import { getStakeholders } from '../../services/productProgramApi';
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
import { Plus, CheckCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskManagerProps {
  productProgramId: string;
  canEdit: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  productProgramId,
  canEdit,
}) => {
  const [tasks, setTasks] = useState<ProductProgramTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProductProgramTask | null>(null);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    dueDate: '',
    assignedTo: '',
  });

  useEffect(() => {
    loadTasks();
    loadStakeholders();
  }, [productProgramId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks(productProgramId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStakeholders = async () => {
    try {
      const stakeholders = await getStakeholders(productProgramId);
      // Transform stakeholders to User format
      const stakeholderUsers: User[] = stakeholders.map((s) => ({
        id: s.user.id,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        email: s.user.email,
        role: s.role || 'Stakeholder',
      }));
      setUsers(stakeholderUsers);
    } catch (error) {
      console.error('Failed to load stakeholders:', error);
      // Don't block task loading if stakeholders fail
    }
  };

  const handleCreateTask = async () => {
    try {
      await createTask(productProgramId, formData);
      await loadTasks(); // Refresh entire list from server to ensure complete data
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, data: UpdateTaskRequest) => {
    try {
      const updatedTask = await updateTask(taskId, data);
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      setEditingTask(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    try {
      await markTaskComplete(taskId);
      await loadTasks(); // Refresh entire list from server to ensure complete data
    } catch (error) {
      console.error('Failed to mark task complete:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: TaskStatus.TODO,
      dueDate: '',
      assignedTo: '',
    });
  };

  const openEditDialog = (task: ProductProgramTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      assignedTo: task.assignedTo || '',
    });
  };

  const getStatusBadge = (status: TaskStatus | undefined) => {
    if (!status) {
      return <Badge className="bg-gray-100 text-gray-800">No Status</Badge>;
    }
    const styles = {
      [TaskStatus.TODO]: 'bg-gray-100 text-gray-800',
      [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [TaskStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status]}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const completedCount = tasks.filter(
    (t) => t.status === TaskStatus.COMPLETED
  ).length;
  const totalCount = tasks.length;

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
            <CardTitle>Tasks</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {completedCount} of {totalCount} tasks completed
            </p>
          </div>
          {canEdit && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Task title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Task description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value as TaskStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <Select
                      value={formData.assignedTo || 'unassigned'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          assignedTo: value === 'unassigned' ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
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
                    <Button onClick={handleCreateTask}>Create Task</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks yet. {canEdit && 'Click "Add Task" to create one.'}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {task.dueDate && (
                      <span>
                        Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                    {task.assignedUser && (
                      <span>
                        Assigned to:{' '}
                        {task.assignedUser.person?.firstName}{' '}
                        {task.assignedUser.person?.lastName}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 ml-4">
                    {task.status !== TaskStatus.COMPLETED && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(task.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingTask && (
          <Dialog
            open={!!editingTask}
            onOpenChange={(open) => !open && setEditingTask(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
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
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as TaskStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <Select
                    value={formData.assignedTo || 'unassigned'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        assignedTo: value === 'unassigned' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTask(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      handleUpdateTask(editingTask.id, formData)
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

export default TaskManager;
