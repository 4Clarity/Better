import axios from 'axios';
import {
  ProductProgram,
  CreateProductProgramRequest,
  UpdateProductProgramRequest,
  ProductProgramFilters,
  ProductProgramListResponse,
  ProductProgramResponse,
  DeleteProductProgramResponse,
  ProductProgramStakeholder,
  AddStakeholderRequest,
  UpdateStakeholderRoleRequest,
  StakeholderResponse,
  StakeholdersListResponse,
  RemoveStakeholderResponse,
} from '../types/productProgram';

const API_BASE_URL = '/api/business-operations/products-programs';

/**
 * Create a new Product/Program
 */
export const createProductProgram = async (
  data: CreateProductProgramRequest
): Promise<ProductProgram> => {
  try {
    const response = await axios.post<ProductProgramResponse>(API_BASE_URL, data);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to create Product/Program'
      );
    }
    throw error;
  }
};

/**
 * Get paginated list of Products/Programs with optional filters
 */
export const getProductPrograms = async (
  filters?: ProductProgramFilters
): Promise<ProductProgramListResponse> => {
  try {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.securityClassification) {
      params.append('securityClassification', filters.securityClassification);
    }
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await axios.get<ProductProgramListResponse>(
      `${API_BASE_URL}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch Products/Programs'
      );
    }
    throw error;
  }
};

/**
 * Get a single Product/Program by ID
 */
export const getProductProgramById = async (id: string): Promise<ProductProgram> => {
  try {
    const response = await axios.get<ProductProgramResponse>(`${API_BASE_URL}/${id}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch Product/Program'
      );
    }
    throw error;
  }
};

/**
 * Update an existing Product/Program
 */
export const updateProductProgram = async (
  id: string,
  data: UpdateProductProgramRequest
): Promise<ProductProgram> => {
  try {
    const response = await axios.put<ProductProgramResponse>(
      `${API_BASE_URL}/${id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to update Product/Program'
      );
    }
    throw error;
  }
};

/**
 * Delete a Product/Program
 */
export const deleteProductProgram = async (id: string): Promise<void> => {
  try {
    await axios.delete<DeleteProductProgramResponse>(`${API_BASE_URL}/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to delete Product/Program'
      );
    }
    throw error;
  }
};

// Stakeholder Management API Methods (Story 4.2 - Phase 1)

/**
 * Add a stakeholder to a Product/Program
 */
export const addStakeholder = async (
  productProgramId: string,
  data: AddStakeholderRequest
): Promise<ProductProgramStakeholder> => {
  try {
    const response = await axios.post<StakeholderResponse>(
      `${API_BASE_URL}/${productProgramId}/stakeholders`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to add stakeholder'
      );
    }
    throw error;
  }
};

/**
 * Get all stakeholders for a Product/Program
 */
export const getStakeholders = async (
  productProgramId: string
): Promise<ProductProgramStakeholder[]> => {
  try {
    const response = await axios.get<StakeholdersListResponse>(
      `${API_BASE_URL}/${productProgramId}/stakeholders`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch stakeholders'
      );
    }
    throw error;
  }
};

/**
 * Update a stakeholder's role
 */
export const updateStakeholderRole = async (
  productProgramId: string,
  userId: string,
  data: UpdateStakeholderRoleRequest
): Promise<ProductProgramStakeholder> => {
  try {
    const response = await axios.put<StakeholderResponse>(
      `${API_BASE_URL}/${productProgramId}/stakeholders/${userId}`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to update stakeholder role'
      );
    }
    throw error;
  }
};

/**
 * Remove a stakeholder from a Product/Program
 */
export const removeStakeholder = async (
  productProgramId: string,
  userId: string
): Promise<void> => {
  try {
    await axios.delete<RemoveStakeholderResponse>(
      `${API_BASE_URL}/${productProgramId}/stakeholders/${userId}`
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to remove stakeholder'
      );
    }
    throw error;
  }
};
