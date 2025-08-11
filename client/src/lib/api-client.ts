// Clean, simple API client for the new server architecture
import { ChatRequest, ChatResponse, HealthResponse } from '@shared/api-types';

// Point to the clean API server - use relative paths for Vite proxy
const API_BASE = '';

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function checkHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health');
}