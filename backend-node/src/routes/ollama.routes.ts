/**
 * Ollama Routes
 * API endpoints for interacting with local Ollama LLM instance
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ollamaService, { OllamaChatMessage } from '../services/ollama.service';

export default async function ollamaRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ollama/health
   * Check if Ollama service is available
   */
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Check Ollama service health',
        tags: ['ollama'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  models_available: { type: 'number' },
                  default_model: { type: 'string' },
                  api_url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await ollamaService.healthCheck();

        return reply.send({
          success: true,
          data: health,
        });
      } catch (error) {
        request.log.error(error, 'Ollama health check failed');
        return reply.send({
          success: false,
          data: {
            status: 'unhealthy',
            models_available: 0,
            default_model: '',
            api_url: '',
          },
        });
      }
    }
  );

  /**
   * GET /api/ollama/models
   * List all available models
   */
  fastify.get(
    '/models',
    {
      schema: {
        description: 'List all available Ollama models',
        tags: ['ollama'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const models = await ollamaService.listModels();

        return reply.send({
          success: true,
          data: models,
        });
      } catch (error) {
        request.log.error(error, 'Failed to list Ollama models');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list models',
        });
      }
    }
  );

  /**
   * GET /api/ollama/models/:modelName
   * Get information about a specific model
   */
  fastify.get<{ Params: { modelName: string } }>(
    '/models/:modelName',
    {
      schema: {
        description: 'Get information about a specific model',
        tags: ['ollama'],
        params: {
          type: 'object',
          properties: {
            modelName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { modelName: string } }>, reply: FastifyReply) => {
      try {
        const modelInfo = await ollamaService.getModelInfo(request.params.modelName);

        if (!modelInfo) {
          return reply.code(404).send({
            success: false,
            error: `Model ${request.params.modelName} not found`,
          });
        }

        return reply.send({
          success: true,
          data: modelInfo,
        });
      } catch (error) {
        request.log.error(error, `Failed to get info for model ${request.params.modelName}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get model info',
        });
      }
    }
  );

  /**
   * POST /api/ollama/generate
   * Generate text completion from a prompt
   */
  fastify.post<{
    Body: {
      prompt: string;
      model?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
      format?: 'json';
    };
  }>(
    '/generate',
    {
      schema: {
        description: 'Generate text completion from a prompt',
        tags: ['ollama'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1 },
            model: { type: 'string' },
            system: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1 },
            stop: { type: 'array', items: { type: 'string' } },
            format: { type: 'string', enum: ['json'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          prompt: string;
          model?: string;
          system?: string;
          temperature?: number;
          maxTokens?: number;
          stop?: string[];
          format?: 'json';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const response = await ollamaService.generate(request.body.prompt, {
          model: request.body.model,
          system: request.body.system,
          temperature: request.body.temperature,
          maxTokens: request.body.maxTokens,
          stop: request.body.stop,
          format: request.body.format,
        });

        return reply.send({
          success: true,
          data: response,
        });
      } catch (error) {
        request.log.error(error, 'Ollama generation failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }
  );

  /**
   * POST /api/ollama/chat
   * Chat completion with message history
   */
  fastify.post<{
    Body: {
      messages: OllamaChatMessage[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
      format?: 'json';
    };
  }>(
    '/chat',
    {
      schema: {
        description: 'Chat completion with message history',
        tags: ['ollama'],
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                  content: { type: 'string' },
                  images: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            model: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1 },
            stop: { type: 'array', items: { type: 'string' } },
            format: { type: 'string', enum: ['json'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          messages: OllamaChatMessage[];
          model?: string;
          temperature?: number;
          maxTokens?: number;
          stop?: string[];
          format?: 'json';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const response = await ollamaService.chat(request.body.messages, {
          model: request.body.model,
          temperature: request.body.temperature,
          maxTokens: request.body.maxTokens,
          stop: request.body.stop,
          format: request.body.format,
        });

        return reply.send({
          success: true,
          data: response,
        });
      } catch (error) {
        request.log.error(error, 'Ollama chat failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Chat failed',
        });
      }
    }
  );

  /**
   * POST /api/ollama/ask
   * Simple question-answering endpoint
   */
  fastify.post<{
    Body: {
      question: string;
      context?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    };
  }>(
    '/ask',
    {
      schema: {
        description: 'Ask a simple question and get an answer',
        tags: ['ollama'],
        body: {
          type: 'object',
          required: ['question'],
          properties: {
            question: { type: 'string', minLength: 1 },
            context: { type: 'string' },
            model: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number', minimum: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  answer: { type: 'string' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          question: string;
          context?: string;
          model?: string;
          temperature?: number;
          maxTokens?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const answer = await ollamaService.ask(request.body.question, request.body.context, {
          model: request.body.model,
          temperature: request.body.temperature,
          maxTokens: request.body.maxTokens,
        });

        return reply.send({
          success: true,
          data: { answer },
        });
      } catch (error) {
        request.log.error(error, 'Ollama ask failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Ask failed',
        });
      }
    }
  );

  /**
   * POST /api/ollama/embeddings
   * Generate embeddings for text(s)
   */
  fastify.post<{
    Body: {
      prompt?: string;
      prompts?: string[];
      model?: string;
    };
  }>(
    '/embeddings',
    {
      schema: {
        description: 'Generate embeddings for text or multiple texts',
        tags: ['ollama'],
        body: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            prompts: { type: 'array', items: { type: 'string' } },
            model: { type: 'string' },
          },
          oneOf: [{ required: ['prompt'] }, { required: ['prompts'] }],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  embedding: { type: 'array' },
                  embeddings: { type: 'array' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          prompt?: string;
          prompts?: string[];
          model?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { prompt, prompts, model } = request.body;

        // Validate that either prompt or prompts is provided
        if (!prompt && !prompts) {
          return reply.code(400).send({
            success: false,
            error: 'Either "prompt" or "prompts" must be provided',
          });
        }

        // Single embedding
        if (prompt) {
          const embedding = await ollamaService.generateEmbedding(prompt, model);
          return reply.send({
            success: true,
            data: { embedding },
          });
        }

        // Batch embeddings
        if (prompts) {
          const embeddings = await ollamaService.generateEmbeddings(prompts, model);
          return reply.send({
            success: true,
            data: { embeddings },
          });
        }
      } catch (error) {
        request.log.error(error, 'Ollama embedding generation failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Embedding generation failed',
        });
      }
    }
  );

  /**
   * POST /api/ollama/models/pull
   * Download a model from Ollama library
   */
  fastify.post<{
    Body: {
      modelName: string;
    };
  }>(
    '/models/pull',
    {
      schema: {
        description: 'Download a model from Ollama library',
        tags: ['ollama'],
        body: {
          type: 'object',
          required: ['modelName'],
          properties: {
            modelName: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          modelName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const result = await ollamaService.pullModel(request.body.modelName);

        return reply.send({
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        request.log.error(error, `Failed to pull model ${request.body.modelName}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to pull model',
        });
      }
    }
  );

  /**
   * DELETE /api/ollama/models/:modelName
   * Delete a model from local Ollama instance
   */
  fastify.delete<{ Params: { modelName: string } }>(
    '/models/:modelName',
    {
      schema: {
        description: 'Delete a model from local Ollama instance',
        tags: ['ollama'],
        params: {
          type: 'object',
          properties: {
            modelName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { modelName: string } }>, reply: FastifyReply) => {
      try {
        const result = await ollamaService.deleteModel(request.params.modelName);

        return reply.send({
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        request.log.error(error, `Failed to delete model ${request.params.modelName}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete model',
        });
      }
    }
  );
}
