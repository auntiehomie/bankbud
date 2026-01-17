import axios from 'axios';
import { BankRate, UserPreferences, AIRecommendation, CommunitySubmission, ChatResponse, ConversationHistory } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = {
  // Get all rates
  getRates: async (accountType?: string) => {
    const params = accountType ? { accountType } : {};
    const response = await axios.get<BankRate[]>(`${API_BASE}/rates`, { params });
    return response.data;
  },

  // Get AI recommendations
  getRecommendations: async (preferences: UserPreferences) => {
    const response = await axios.post<AIRecommendation[]>(
      `${API_BASE}/recommendations`,
      preferences
    );
    return response.data;
  },

  // Submit a new rate
  submitRate: async (submission: CommunitySubmission) => {
    const response = await axios.post<BankRate>(`${API_BASE}/rates`, submission);
    return response.data;
  },

  // Verify a rate
  verifyRate: async (rateId: string) => {
    const response = await axios.post(`${API_BASE}/rates/${rateId}/verify`);
    return response.data;
  },

  // Report a rate
  reportRate: async (rateId: string, reason: string) => {
    const response = await axios.post(`${API_BASE}/rates/${rateId}/report`, { reason });
    return response.data;
  },

  // Get top rates
  getTopRates: async (accountType: string, limit: number = 5) => {
    const response = await axios.get<BankRate[]>(`${API_BASE}/rates/top`, {
      params: { accountType, limit }
    });
    return response.data;
  },

  // Chat with AI advisor
  sendChatMessage: async (message: string, sessionId?: string, includeRates: boolean = true) => {
    const response = await axios.post<ChatResponse>(`${API_BASE}/chat/message`, {
      message,
      sessionId,
      includeRates
    });
    return response.data;
  },

  // Get conversation history
  getConversationHistory: async (sessionId: string) => {
    const response = await axios.get<ConversationHistory>(`${API_BASE}/chat/history/${sessionId}`);
    return response.data;
  },

  // Clear conversation
  clearConversation: async (sessionId: string) => {
    const response = await axios.delete(`${API_BASE}/chat/history/${sessionId}`);
    return response.data;
  },

  // Get AI advisor status
  getAIStatus: async () => {
    const response = await axios.get<{ available: boolean; message: string }>(`${API_BASE}/chat/status`);
    return response.data;
  }
};
