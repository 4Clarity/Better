import axios from '../lib/axios';
import {
  ProductProgramTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskApiResponse,
  TaskListApiResponse,
} from '../types/task';

const API_BASE_URL = '/business-operations';

/**
 * Create a new task for a Product/Program
 * Story 4.3: Knowledge Integration and Advanced Features
 */
export const createTask = async (
  productProgramId: string,
  data: CreateTaskRequest
): Promise<ProductProgramTask> => {
  try {
    const response = await axios.post<TaskApiResponse>(
      `${API_BASE_URL}/products-programs/${productProgramId}/tasks`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create task');
    }
    throw error;
  }
};

/**
 * Get all tasks for a Product/Program
 */
export const getTasks = async (
  productProgramId: string
): Promise<ProductProgramTask[]> => {
  try {
    const response = await axios.get<TaskListApiResponse>(
      `${API_BASE_URL}/products-programs/${productProgramId}/tasks`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tasks');
    }
    throw error;
  }
};

/**
 * Get a single task by ID
 */
export const getTaskById = async (taskId: string): Promise<ProductProgramTask> => {
  try {
    const response = await axios.get<TaskApiResponse>(
      `${API_BASE_URL}/tasks/${taskId}`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch task');
    }
    throw error;
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (
  taskId: string,
  data: UpdateTaskRequest
): Promise<ProductProgramTask> => {
  try {
    const response = await axios.put<TaskApiResponse>(
      `${API_BASE_URL}/tasks/${taskId}`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to update task');
    }
    throw error;
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to delete task');
    }
    throw error;
  }
};

/**
 * Mark a task as complete
 */
export const markTaskComplete = async (
  taskId: string
): Promise<ProductProgramTask> => {
  try {
    const response = await axios.patch<TaskApiResponse>(
      `${API_BASE_URL}/tasks/${taskId}/complete`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to mark task as complete'
      );
    }
    throw error;
  }
};
