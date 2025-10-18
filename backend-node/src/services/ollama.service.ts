/**
 * Ollama Local LLM Service
 *
 * Integrates with local Ollama instance for AI/LLM features.
 * Provides text generation, chat, embeddings, and model management.
 *
 * Ollama API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import axios, { AxiosInstance } from 'axios';

// Environment configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://host.docker.internal:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:1b';

/**
 * Ollama API Types
 */
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
  options?: {
    temperature?: number;
  };
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaHealthResponse {
  status: 'healthy' | 'unhealthy';
  models_available: number;
  default_model: string;
  api_url: string;
}

/**
 * Ollama Service Class
 *
 * Provides integration with local Ollama instance for LLM capabilities.
 */
export class OllamaService {
  private client: AxiosInstance;
  private defaultModel: string;
  private apiUrl: string;

  constructor(apiUrl: string = OLLAMA_API_URL, defaultModel: string = OLLAMA_DEFAULT_MODEL) {
    this.apiUrl = apiUrl;
    this.defaultModel = defaultModel;

    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 120000, // 2 minutes for LLM operations
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Health check - verify Ollama is accessible and has models
   */
  async healthCheck(): Promise<OllamaHealthResponse> {
    try {
      // Check version endpoint
      const versionResponse = await this.client.get('/api/version', {
        timeout: 5000
      });

      // List available models
      const models = await this.listModels();

      return {
        status: 'healthy',
        models_available: models.length,
        default_model: this.defaultModel,
        api_url: this.apiUrl
      };
    } catch (error: any) {
      console.error('Ollama health check failed:', error.message);
      return {
        status: 'unhealthy',
        models_available: 0,
        default_model: this.defaultModel,
        api_url: this.apiUrl
      };
    }
  }

  /**
   * List all available models in Ollama
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error: any) {
      throw new Error(`Failed to list Ollama models: ${error.message}`);
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName || model.model === modelName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate text completion from a prompt
   *
   * @param prompt - The prompt to complete
   * @param options - Generation options
   * @returns The generated text
   */
  async generate(
    prompt: string,
    options?: {
      model?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
      format?: 'json';
    }
  ): Promise<OllamaGenerateResponse> {
    try {
      const model = options?.model || this.defaultModel;

      const request: OllamaGenerateRequest = {
        model,
        prompt,
        stream: false, // Non-streaming for simplicity
        system: options?.system,
        format: options?.format,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
          stop: options?.stop,
        }
      };

      const response = await this.client.post('/api/generate', request);
      return response.data as OllamaGenerateResponse;
    } catch (error: any) {
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  /**
   * Chat completion with message history
   *
   * @param messages - Array of chat messages
   * @param options - Chat options
   * @returns The chat response
   */
  async chat(
    messages: OllamaChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
      format?: 'json';
    }
  ): Promise<OllamaChatResponse> {
    try {
      const model = options?.model || this.defaultModel;

      const request: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        format: options?.format,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
          stop: options?.stop,
        }
      };

      const response = await this.client.post('/api/chat', request);
      return response.data as OllamaChatResponse;
    } catch (error: any) {
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for a text prompt
   *
   * Useful for semantic search, RAG, and vector similarity
   *
   * @param prompt - The text to generate embeddings for
   * @param model - Optional model to use (defaults to configured model)
   * @returns Vector embedding
   */
  async generateEmbedding(
    prompt: string,
    model?: string
  ): Promise<number[]> {
    try {
      const embeddingModel = model || this.defaultModel;

      const request: OllamaEmbeddingRequest = {
        model: embeddingModel,
        prompt
      };

      const response = await this.client.post('/api/embeddings', request);
      const data = response.data as OllamaEmbeddingResponse;
      return data.embedding;
    } catch (error: any) {
      throw new Error(`Ollama embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param prompts - Array of texts to generate embeddings for
   * @param model - Optional model to use
   * @returns Array of vector embeddings
   */
  async generateEmbeddings(
    prompts: string[],
    model?: string
  ): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(
        prompts.map(prompt => this.generateEmbedding(prompt, model))
      );
      return embeddings;
    } catch (error: any) {
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Pull/download a model from Ollama library
   *
   * @param modelName - Name of the model to pull (e.g., 'llama3:latest')
   * @returns Success status
   */
  async pullModel(modelName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.post('/api/pull', {
        name: modelName,
        stream: false
      });

      return {
        success: true,
        message: `Model ${modelName} pulled successfully`
      };
    } catch (error: any) {
      throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
    }
  }

  /**
   * Delete a model from local Ollama instance
   *
   * @param modelName - Name of the model to delete
   * @returns Success status
   */
  async deleteModel(modelName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.delete('/api/delete', {
        data: { name: modelName }
      });

      return {
        success: true,
        message: `Model ${modelName} deleted successfully`
      };
    } catch (error: any) {
      throw new Error(`Failed to delete model ${modelName}: ${error.message}`);
    }
  }

  /**
   * Simple question-answering method
   *
   * Convenience wrapper for single-turn Q&A
   *
   * @param question - The question to ask
   * @param context - Optional context/system prompt
   * @param options - Generation options
   * @returns The answer
   */
  async ask(
    question: string,
    context?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const messages: OllamaChatMessage[] = [];

      if (context) {
        messages.push({
          role: 'system',
          content: context
        });
      }

      messages.push({
        role: 'user',
        content: question
      });

      const response = await this.chat(messages, options);
      return response.message.content;
    } catch (error: any) {
      throw new Error(`Ollama ask failed: ${error.message}`);
    }
  }

  /**
   * Get detailed information about a specific model
   *
   * @param modelName - Name of the model
   * @returns Model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModel | null> {
    try {
      const models = await this.listModels();
      return models.find(m => m.name === modelName || m.model === modelName) || null;
    } catch (error: any) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();
export default ollamaService;
