/**
 * Chat Proxy Service
 * Proxies chat requests to the Python AI service
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import axios, { AxiosInstance } from 'axios';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://backend-python:8000';

export interface ChatSession {
  session_id: string;
  user_id: string;
  context: Record<string, any>;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface CreateSessionRequest {
  user_id: string;
  context?: Record<string, any>;
}

export interface SendMessageRequest {
  message: string;
  stream?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  session_id: string;
  message: ChatMessage;
  conversation_length: number;
}

export class ChatProxyService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: PYTHON_API_URL,
      timeout: 30000, // 30 second timeout for AI responses
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string, context?: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post('/chat/sessions', {
        user_id: userId,
        context: context || {},
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }
  }

  /**
   * Get chat session history
   */
  async getSessionHistory(sessionId: string, limit?: number): Promise<ChatSession> {
    try {
      const params = limit ? { limit } : {};
      const response = await this.client.get(`/chat/sessions/${sessionId}`, { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Chat session not found');
      }
      throw new Error(`Failed to get session history: ${error.message}`);
    }
  }

  /**
   * Send a message to the AI assistant
   */
  async sendMessage(sessionId: string, message: string, stream: boolean = false): Promise<SendMessageResponse> {
    try {
      const response = await this.client.post(`/chat/sessions/${sessionId}/messages`, {
        message,
        stream,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Chat session not found');
      }
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.delete(`/chat/sessions/${sessionId}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Chat session not found');
      }
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * List all sessions for a user
   */
  async listUserSessions(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/chat/users/${userId}/sessions`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list user sessions: ${error.message}`);
    }
  }

  /**
   * Health check for chat service
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await this.client.get('/chat/health');
      return response.data;
    } catch (error: any) {
      throw new Error(`Chat service health check failed: ${error.message}`);
    }
  }
}

export default new ChatProxyService();
