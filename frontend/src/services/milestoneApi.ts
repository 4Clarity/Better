import axios from '../lib/axios';
import {
  ProductProgramMilestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MilestoneApiResponse,
  MilestoneListApiResponse,
} from '../types/milestone';

const API_BASE_URL = '/business-operations';

/**
 * Create a new milestone for a Product/Program
 * Story 4.3: Knowledge Integration and Advanced Features
 */
export const createMilestone = async (
  productProgramId: string,
  data: CreateMilestoneRequest
): Promise<ProductProgramMilestone> => {
  try {
    const response = await axios.post<MilestoneApiResponse>(
      `${API_BASE_URL}/products-programs/${productProgramId}/milestones`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create milestone');
    }
    throw error;
  }
};

/**
 * Get all milestones for a Product/Program
 */
export const getMilestones = async (
  productProgramId: string
): Promise<ProductProgramMilestone[]> => {
  try {
    const response = await axios.get<MilestoneListApiResponse>(
      `${API_BASE_URL}/products-programs/${productProgramId}/milestones`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch milestones');
    }
    throw error;
  }
};

/**
 * Get a single milestone by ID
 */
export const getMilestoneById = async (
  milestoneId: string
): Promise<ProductProgramMilestone> => {
  try {
    const response = await axios.get<MilestoneApiResponse>(
      `${API_BASE_URL}/milestones/${milestoneId}`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch milestone');
    }
    throw error;
  }
};

/**
 * Update an existing milestone
 */
export const updateMilestone = async (
  milestoneId: string,
  data: UpdateMilestoneRequest
): Promise<ProductProgramMilestone> => {
  try {
    const response = await axios.put<MilestoneApiResponse>(
      `${API_BASE_URL}/milestones/${milestoneId}`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to update milestone');
    }
    throw error;
  }
};

/**
 * Delete a milestone
 */
export const deleteMilestone = async (milestoneId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/milestones/${milestoneId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to delete milestone');
    }
    throw error;
  }
};

/**
 * Mark a milestone as achieved
 */
export const markMilestoneAchieved = async (
  milestoneId: string
): Promise<ProductProgramMilestone> => {
  try {
    const response = await axios.patch<MilestoneApiResponse>(
      `${API_BASE_URL}/milestones/${milestoneId}/achieved`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to mark milestone as achieved'
      );
    }
    throw error;
  }
};
