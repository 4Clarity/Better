/**
 * OllamaService Unit Tests
 * Tests for local Ollama LLM integration
 */

import axios from 'axios';
import { OllamaService } from '../ollama.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaService', () => {
  let ollamaService: OllamaService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    // Create service instance
    ollamaService = new OllamaService();
  });

  describe('healthCheck', () => {
    it('should return healthy status when Ollama is accessible', async () => {
      // Arrange
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { version: '0.12.6' } }) // /api/version
        .mockResolvedValueOnce({ data: { models: [{ name: 'llama3:latest' }] } }); // /api/tags

      // Act
      const result = await ollamaService.healthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.models_available).toBe(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/version', { timeout: 5000 });
    });

    it('should return unhealthy status when Ollama is not accessible', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await ollamaService.healthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.models_available).toBe(0);
    });
  });

  describe('listModels', () => {
    it('should return list of available models', async () => {
      // Arrange
      const mockModels = [
        {
          name: 'llama3:latest',
          model: 'llama3:latest',
          size: 4661224676,
          digest: 'sha256:abc123',
          details: {
            format: 'gguf',
            family: 'llama',
            parameter_size: '8.0B',
          },
        },
        {
          name: 'gemma3:1b',
          model: 'gemma3:1b',
          size: 815319791,
          digest: 'sha256:def456',
          details: {
            format: 'gguf',
            family: 'gemma3',
            parameter_size: '1B',
          },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: { models: mockModels } });

      // Act
      const result = await ollamaService.listModels();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('llama3:latest');
      expect(result[1].name).toBe('gemma3:1b');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags');
    });

    it('should return empty array when no models available', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValue({ data: { models: [] } });

      // Act
      const result = await ollamaService.listModels();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should throw error when request fails', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(ollamaService.listModels()).rejects.toThrow(
        'Failed to list Ollama models: Network error'
      );
    });
  });

  describe('isModelAvailable', () => {
    it('should return true when model is available', async () => {
      // Arrange
      const mockModels = [
        { name: 'llama3:latest', model: 'llama3:latest' },
        { name: 'gemma3:1b', model: 'gemma3:1b' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: { models: mockModels } });

      // Act
      const result = await ollamaService.isModelAvailable('llama3:latest');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when model is not available', async () => {
      // Arrange
      const mockModels = [{ name: 'llama3:latest', model: 'llama3:latest' }];

      mockAxiosInstance.get.mockResolvedValue({ data: { models: mockModels } });

      // Act
      const result = await ollamaService.isModelAvailable('nonexistent:model');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection error'));

      // Act
      const result = await ollamaService.isModelAvailable('llama3:latest');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generate', () => {
    it('should generate text completion from prompt', async () => {
      // Arrange
      const mockResponse = {
        model: 'gemma3:1b',
        created_at: '2025-10-18T12:00:00Z',
        response: 'This is a generated response.',
        done: true,
        total_duration: 1000000,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await ollamaService.generate('What is AI?');

      // Assert
      expect(result.response).toBe('This is a generated response.');
      expect(result.done).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/generate', {
        model: 'gemma3:1b',
        prompt: 'What is AI?',
        stream: false,
        system: undefined,
        format: undefined,
        options: {
          temperature: undefined,
          num_predict: undefined,
          stop: undefined,
        },
      });
    });

    it('should use custom options when provided', async () => {
      // Arrange
      const mockResponse = {
        model: 'llama3:latest',
        response: 'Custom response',
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      await ollamaService.generate('Test prompt', {
        model: 'llama3:latest',
        system: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 100,
        stop: ['\n'],
      });

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/generate', {
        model: 'llama3:latest',
        prompt: 'Test prompt',
        stream: false,
        system: 'You are a helpful assistant',
        format: undefined,
        options: {
          temperature: 0.7,
          num_predict: 100,
          stop: ['\n'],
        },
      });
    });

    it('should throw error when generation fails', async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(new Error('Model not found'));

      // Act & Assert
      await expect(ollamaService.generate('Test prompt')).rejects.toThrow(
        'Ollama generation failed: Model not found'
      );
    });
  });

  describe('chat', () => {
    it('should perform chat completion with message history', async () => {
      // Arrange
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello!' },
      ];

      const mockResponse = {
        model: 'gemma3:1b',
        created_at: '2025-10-18T12:00:00Z',
        message: { role: 'assistant' as const, content: 'Hi! How can I help you?' },
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await ollamaService.chat(messages);

      // Assert
      expect(result.message.content).toBe('Hi! How can I help you?');
      expect(result.message.role).toBe('assistant');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/chat', {
        model: 'gemma3:1b',
        messages,
        stream: false,
        format: undefined,
        options: {
          temperature: undefined,
          num_predict: undefined,
          stop: undefined,
        },
      });
    });

    it('should use custom model and options', async () => {
      // Arrange
      const messages = [{ role: 'user' as const, content: 'Test message' }];

      const mockResponse = {
        model: 'llama3:latest',
        message: { role: 'assistant' as const, content: 'Test response' },
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      await ollamaService.chat(messages, {
        model: 'llama3:latest',
        temperature: 0.5,
        maxTokens: 50,
      });

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/chat', {
        model: 'llama3:latest',
        messages,
        stream: false,
        format: undefined,
        options: {
          temperature: 0.5,
          num_predict: 50,
          stop: undefined,
        },
      });
    });

    it('should throw error when chat fails', async () => {
      // Arrange
      const messages = [{ role: 'user' as const, content: 'Test' }];
      mockAxiosInstance.post.mockRejectedValue(new Error('Timeout'));

      // Act & Assert
      await expect(ollamaService.chat(messages)).rejects.toThrow('Ollama chat failed: Timeout');
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector for text', async () => {
      // Arrange
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockAxiosInstance.post.mockResolvedValue({ data: { embedding: mockEmbedding } });

      // Act
      const result = await ollamaService.generateEmbedding('Sample text');

      // Assert
      expect(result).toEqual(mockEmbedding);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/embeddings', {
        model: 'gemma3:1b',
        prompt: 'Sample text',
      });
    });

    it('should use custom model when specified', async () => {
      // Arrange
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockAxiosInstance.post.mockResolvedValue({ data: { embedding: mockEmbedding } });

      // Act
      await ollamaService.generateEmbedding('Test text', 'llama3:latest');

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/embeddings', {
        model: 'llama3:latest',
        prompt: 'Test text',
      });
    });

    it('should throw error when embedding generation fails', async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(new Error('Model error'));

      // Act & Assert
      await expect(ollamaService.generateEmbedding('Test')).rejects.toThrow(
        'Ollama embedding generation failed: Model error'
      );
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Arrange
      const prompts = ['Text 1', 'Text 2', 'Text 3'];
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { embedding: mockEmbeddings[0] } })
        .mockResolvedValueOnce({ data: { embedding: mockEmbeddings[1] } })
        .mockResolvedValueOnce({ data: { embedding: mockEmbeddings[2] } });

      // Act
      const result = await ollamaService.generateEmbeddings(prompts);

      // Assert
      expect(result).toEqual(mockEmbeddings);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should throw error if any embedding fails', async () => {
      // Arrange
      const prompts = ['Text 1', 'Text 2'];
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { embedding: [0.1, 0.2] } })
        .mockRejectedValueOnce(new Error('Failed'));

      // Act & Assert
      await expect(ollamaService.generateEmbeddings(prompts)).rejects.toThrow(
        'Batch embedding generation failed'
      );
    });
  });

  describe('pullModel', () => {
    it('should successfully pull a model', async () => {
      // Arrange
      mockAxiosInstance.post.mockResolvedValue({ data: { status: 'success' } });

      // Act
      const result = await ollamaService.pullModel('llama3:latest');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('llama3:latest');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/pull', {
        name: 'llama3:latest',
        stream: false,
      });
    });

    it('should throw error when pull fails', async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(ollamaService.pullModel('llama3:latest')).rejects.toThrow(
        'Failed to pull model llama3:latest: Network error'
      );
    });
  });

  describe('deleteModel', () => {
    it('should successfully delete a model', async () => {
      // Arrange
      mockAxiosInstance.delete.mockResolvedValue({ data: { status: 'success' } });

      // Act
      const result = await ollamaService.deleteModel('old-model:latest');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('old-model:latest');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/delete', {
        data: { name: 'old-model:latest' },
      });
    });

    it('should throw error when delete fails', async () => {
      // Arrange
      mockAxiosInstance.delete.mockRejectedValue(new Error('Model in use'));

      // Act & Assert
      await expect(ollamaService.deleteModel('test-model')).rejects.toThrow(
        'Failed to delete model test-model: Model in use'
      );
    });
  });

  describe('ask', () => {
    it('should answer a simple question', async () => {
      // Arrange
      const mockResponse = {
        model: 'gemma3:1b',
        message: { role: 'assistant' as const, content: 'The answer is 42.' },
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await ollamaService.ask('What is the answer to life?');

      // Assert
      expect(result).toBe('The answer is 42.');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          messages: [{ role: 'user', content: 'What is the answer to life?' }],
        })
      );
    });

    it('should use context when provided', async () => {
      // Arrange
      const mockResponse = {
        model: 'gemma3:1b',
        message: { role: 'assistant' as const, content: 'Based on the context...' },
        done: true,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      await ollamaService.ask('What do you know?', 'You are an expert in biology');

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are an expert in biology' },
            { role: 'user', content: 'What do you know?' },
          ],
        })
      );
    });

    it('should throw error when ask fails', async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      await expect(ollamaService.ask('Test question')).rejects.toThrow(
        'Ollama ask failed: Service unavailable'
      );
    });
  });

  describe('getModelInfo', () => {
    it('should return model info when model exists', async () => {
      // Arrange
      const mockModels = [
        {
          name: 'llama3:latest',
          model: 'llama3:latest',
          size: 4661224676,
          details: { parameter_size: '8.0B' },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: { models: mockModels } });

      // Act
      const result = await ollamaService.getModelInfo('llama3:latest');

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe('llama3:latest');
      expect(result?.details.parameter_size).toBe('8.0B');
    });

    it('should return null when model does not exist', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValue({ data: { models: [] } });

      // Act
      const result = await ollamaService.getModelInfo('nonexistent:model');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when request fails', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(ollamaService.getModelInfo('test:model')).rejects.toThrow(
        'Failed to get model info: API error'
      );
    });
  });
});
