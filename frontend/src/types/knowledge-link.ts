// Product/Program Knowledge Link Types
// Story 4.3: Knowledge Integration and Advanced Features

export interface ProductProgramKnowledgeLink {
  id: string;
  productProgramId: string;
  knowledgeItemId: string;
  linkType?: string; // e.g., "Reference", "Related", "Dependency"
  linkedAt: string; // ISO 8601 date string
  linkedBy: string;
  linkedByUser?: {
    id: string;
    person?: {
      firstName: string;
      lastName: string;
      primaryEmail: string;
    };
  };
  productProgram?: {
    id: string;
    name: string;
    description: string;
    business_operation_type: string;
  };
}

export interface CreateKnowledgeLinkRequest {
  knowledgeItemId: string;
  linkType?: string;
}

export interface UpdateKnowledgeLinkRequest {
  linkType?: string;
}

export interface KnowledgeLinkApiResponse {
  success: boolean;
  data: ProductProgramKnowledgeLink;
}

export interface KnowledgeLinkListApiResponse {
  success: boolean;
  data: ProductProgramKnowledgeLink[];
}

export interface DeleteKnowledgeLinkResponse {
  success: boolean;
  message: string;
}
