// Shared API types for client-server communication

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: 'openai' | 'openrouter' | 'hf' | 'stub';
  model?: string;
}

export interface ChatResponse {
  content: string;
}

export interface HealthResponse {
  ok: boolean;
}

// Model types for the existing mesh functionality
export interface HFModel {
  repo_id: string;
  task: string;
  name: string;
}

export interface ModelStatus {
  modelId: string;
  isAvailable: boolean;
  isDownloading: boolean;
  status: string;
}