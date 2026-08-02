import { apiClient } from './apiClient';
import {
  ChatResponse,
  DailyBriefResponse,
  ParseCommandResponse,
  ReportSummaryResponse,
} from '@/types/api';

export interface ChatPayload {
  message: string;
  session_id?: string;
}

export interface ExplainPayload {
  topic: string;
  item_id?: number;
  context_data?: Record<string, any>;
}

export const chatService = {
  chat: async (payload: ChatPayload): Promise<ChatResponse> => {
    const res = await apiClient.post<ChatResponse>('/chat', payload);
    return res.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>('/chat/suggestions');
    return res.data;
  },

  getDailyBrief: async (): Promise<DailyBriefResponse> => {
    const res = await apiClient.get<DailyBriefResponse>('/ai/daily-brief');
    return res.data;
  },

  getReportSummary: async (days: number = 30): Promise<ReportSummaryResponse> => {
    const res = await apiClient.get<ReportSummaryResponse>(`/ai/report-summary?days=${days}`);
    return res.data;
  },

  explainMetric: async (payload: ExplainPayload): Promise<{ topic: string; explanation: string; grounded_facts: any }> => {
    const res = await apiClient.post<{ topic: string; explanation: string; grounded_facts: any }>('/ai/explain', payload);
    return res.data;
  },

  parseCommand: async (commandText: string): Promise<ParseCommandResponse> => {
    const res = await apiClient.post<ParseCommandResponse>('/ai/parse-command', { command_text: commandText });
    return res.data;
  },
};
