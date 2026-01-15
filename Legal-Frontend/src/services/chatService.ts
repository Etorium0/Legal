import { API_BASE_URL } from "../config";
import { authService } from "./authService";

const BASE_URL = API_BASE_URL;

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateSessionRequest {
  title?: string;
}

export interface AddMessageRequest {
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, any>;
}

class ChatService 
{
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T>
  {
    const token = await authService.getValidAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token)
    {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Debug log
    console.log('[ChatService] Fetching:', `${BASE_URL}${endpoint}`, 'Token exists:', !!token);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok)
    {
      const error = await response.text();
      console.error('[ChatService] Error response:', response.status, error);

      // If 401, token is invalid - clear it
      if (response.status === 401)
      {
        console.warn('[ChatService] Token invalid, clearing...');
        authService.logout();
      }

      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content (e.g., DELETE responses)
    if (response.status === 204)
    {
      return undefined as T;
    }

    return response.json();
  }

  // Create a new chat session
  async createSession(data: CreateSessionRequest = {}): Promise<ChatSession> 
{
    return this.fetch<ChatSession>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Get all sessions for current user
  async getSessions(): Promise<ChatSession[]> 
{
    const response = await this.fetch<{ sessions: ChatSession[] }>(
      "/chat/sessions"
    );
    return response.sessions || [];
  }

  // Get a specific session
  async getSession(sessionId: string): Promise<ChatSession> 
{
    return this.fetch<ChatSession>(`/chat/sessions/${sessionId}`);
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> 
{
    await this.fetch(`/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  // Update session title
  async updateSessionTitle(
    sessionId: string,
    title: string
  ): Promise<void> 
{
    await this.fetch(`/chat/sessions/${sessionId}/title`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  // Add a message to a session
  async addMessage(
    sessionId: string,
    data: AddMessageRequest
  ): Promise<ChatMessage> 
{
    return this.fetch<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Get messages for a session
  async getMessages(sessionId: string): Promise<ChatMessage[]> 
{
    const response = await this.fetch<{ messages: ChatMessage[] }>(
      `/chat/sessions/${sessionId}/messages`
    );
    return response.messages || [];
  }

  // Get or create current session (for active chat)
  async getCurrentSession(): Promise<ChatSession> 
{
    // Check localStorage for current session
    const currentSessionId = localStorage.getItem("current_chat_session");

    if (currentSessionId) 
{
      try 
{
        return await this.getSession(currentSessionId);
      }
 catch (error) 
{
        console.warn("Current session not found, creating new one");
        localStorage.removeItem("current_chat_session");
      }
    }

    // Create new session
    const session = await this.createSession({
      title: `Chat ${new Date().toLocaleDateString()}`,
    });
    localStorage.setItem("current_chat_session", session.id);
    return session;
  }

  // Save current conversation (call after each Q&A exchange)
  async saveConversation(
    question: string,
    answer: string,
    metadata?: Record<string, any>
  ): Promise<void> 
{
    try 
{
      const session = await this.getCurrentSession();

      // Save user question
      await this.addMessage(session.id, {
        role: "user",
        content: question,
      });

      // Save assistant answer
      await this.addMessage(session.id, {
        role: "assistant",
        content: answer,
        metadata,
      });
    }
 catch (error) 
{
      console.error("Failed to save conversation:", error);
      // Don't throw - saving history is not critical
    }
  }

  // Start new chat session
  async startNewChat(): Promise<ChatSession> 
{
    const session = await this.createSession({
      title: `Chat ${new Date().toLocaleString()}`,
    });
    localStorage.setItem("current_chat_session", session.id);
    return session;
  }

  // Clear current session from localStorage
  clearCurrentSession(): void 
{
    localStorage.removeItem("current_chat_session");
  }
}

export const chatService = new ChatService();
