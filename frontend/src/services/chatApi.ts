/**
 * Chat API Service
 * API calls for AI chat functionality
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  session_id: string;
  user_id: string;
  context: Record<string, any>;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface CreateSessionResponse {
  session_id: string;
  user_id: string;
  context: Record<string, any>;
  created_at: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  session_id: string;
  message: ChatMessage;
  conversation_length: number;
}

export const chatApi = {
  /**
   * Create a new chat session
   */
  async createSession(context?: Record<string, any>): Promise<CreateSessionResponse> {
    const response = await api.post('/chat/sessions', { context });
    const data = await response.json();
    return data.data;
  },

  /**
   * Get chat session history
   */
  async getSessionHistory(sessionId: string, limit?: number): Promise<ChatSession> {
    const path = limit ? `/chat/sessions/${sessionId}?limit=${limit}` : `/chat/sessions/${sessionId}`;
    const response = await api.get(path);
    const data = await response.json();
    return data.data;
  },

  /**
   * Send a message
   */
  async sendMessage(sessionId: string, message: string, stream: boolean = false): Promise<SendMessageResponse> {
    const response = await api.post(`/chat/sessions/${sessionId}/messages`, {
      message,
      stream,
    });
    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/chat/sessions/${sessionId}`);
  },

  /**
   * Get all user sessions
   */
  async getMySessions(): Promise<{ user_id: string; sessions: ChatSession[]; count: number }> {
    const response = await api.get('/chat/my-sessions');
    const data = await response.json();
    return data.data;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await api.get('/chat/health');
    const data = await response.json();
    return data.data;
  },
};
