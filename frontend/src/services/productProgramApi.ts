import axios from '../lib/axios';
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
  TransitionSummary,
  AssignTransitionRequest,
  AssignTransitionResponse,
  RemoveTransitionResponse,
  ProductProgramTransitionsResponse,
  LinkToBusinessOperationRequest,
  LinkToBusinessOperationResponse,
  UnlinkFromBusinessOperationResponse,
} from '../types/productProgram';
import {
  ProductProgramKnowledgeLink,
  CreateKnowledgeLinkRequest,
  KnowledgeLinkApiResponse,
  KnowledgeLinkListApiResponse,
  DeleteKnowledgeLinkResponse,
} from '../types/knowledge-link';

const API_BASE_URL = '/business-operations/products-programs';

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

// Transition Categorization API Methods (Story 4.2 - Phase 2)

/**
 * Assign a transition to a Product/Program
 * @param transitionId - ID of the transition to assign
 * @param data - Request body containing productProgramId
 */
export const assignTransitionToProductProgram = async (
  transitionId: string,
  data: AssignTransitionRequest
): Promise<TransitionSummary> => {
  try {
    const response = await axios.put<AssignTransitionResponse>(
      `/transitions/${transitionId}/product-program`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to assign transition to product/program'
      );
    }
    throw error;
  }
};

/**
 * Remove product/program categorization from a transition
 * @param transitionId - ID of the transition to uncategorize
 */
export const removeTransitionFromProductProgram = async (
  transitionId: string
): Promise<void> => {
  try {
    await axios.delete<RemoveTransitionResponse>(
      `/transitions/${transitionId}/product-program`
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to remove transition from product/program'
      );
    }
    throw error;
  }
};

/**
 * Get all transitions assigned to a Product/Program
 * @param productProgramId - ID of the product/program
 */
export const getProductProgramTransitions = async (
  productProgramId: string
): Promise<TransitionSummary[]> => {
  try {
    const response = await axios.get<ProductProgramTransitionsResponse>(
      `${API_BASE_URL}/${productProgramId}/transitions`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch product/program transitions'
      );
    }
    throw error;
  }
};

// Business Operation Linking API Methods (Story 4.2 - Phase 3)

/**
 * Link a Program or Product to a Business Operation
 * @param productProgramId - ID of the program/product to link
 * @param data - Request body containing businessOperationId
 */
export const linkToBusinessOperation = async (
  productProgramId: string,
  data: LinkToBusinessOperationRequest
): Promise<ProductProgram> => {
  try {
    const response = await axios.put<LinkToBusinessOperationResponse>(
      `${API_BASE_URL}/${productProgramId}/business-operation`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to link to business operation'
      );
    }
    throw error;
  }
};

/**
 * Unlink a Program or Product from its Business Operation
 * @param productProgramId - ID of the program/product to unlink
 */
export const unlinkFromBusinessOperation = async (
  productProgramId: string
): Promise<void> => {
  try {
    await axios.delete<UnlinkFromBusinessOperationResponse>(
      `${API_BASE_URL}/${productProgramId}/business-operation`
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to unlink from business operation'
      );
    }
    throw error;
  }
};

/**
 * Get all Programs and Products linked to a Business Operation
 * @param businessOperationId - ID of the business operation
 */
export const getProgramsProductsByBusinessOperation = async (
  businessOperationId: string
): Promise<ProductProgram[]> => {
  try {
    const response = await axios.get<{ success: boolean; data: ProductProgram[] }>(
      `/business-operations/${businessOperationId}/programs-products`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch programs and products'
      );
    }
    throw error;
  }
};

// Knowledge Link Management API Methods (Story 4.3)

/**
 * Link a knowledge item to a Product/Program
 * @param productProgramId - ID of the product/program
 * @param data - Request body containing knowledgeItemId and linkType
 */
export const linkKnowledgeItem = async (
  productProgramId: string,
  data: CreateKnowledgeLinkRequest
): Promise<ProductProgramKnowledgeLink> => {
  try {
    const response = await axios.post<KnowledgeLinkApiResponse>(
      `${API_BASE_URL}/${productProgramId}/knowledge-links`,
      data
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to link knowledge item'
      );
    }
    throw error;
  }
};

/**
 * Get all knowledge links for a Product/Program
 * @param productProgramId - ID of the product/program
 */
export const getKnowledgeLinks = async (
  productProgramId: string
): Promise<ProductProgramKnowledgeLink[]> => {
  try {
    const response = await axios.get<KnowledgeLinkListApiResponse>(
      `${API_BASE_URL}/${productProgramId}/knowledge-links`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch knowledge links'
      );
    }
    throw error;
  }
};

/**
 * Search knowledge links by knowledge item ID
 * @param knowledgeItemId - ID of the knowledge item
 */
export const searchKnowledgeLinksByItemId = async (
  knowledgeItemId: string
): Promise<ProductProgramKnowledgeLink[]> => {
  try {
    const response = await axios.get<KnowledgeLinkListApiResponse>(
      `/business-operations/knowledge-links/search?knowledgeItemId=${knowledgeItemId}`
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to search knowledge links'
      );
    }
    throw error;
  }
};

/**
 * Unlink a knowledge item from a Product/Program
 * @param linkId - ID of the knowledge link
 */
export const unlinkKnowledgeItem = async (linkId: string): Promise<void> => {
  try {
    await axios.delete<DeleteKnowledgeLinkResponse>(
      `/business-operations/knowledge-links/${linkId}`
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to unlink knowledge item'
      );
    }
    throw error;
  }
};
