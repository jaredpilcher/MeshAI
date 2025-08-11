export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

export function toChatPrompt(history: ChatTurn[], kind: 'causal' | 't2t' = 'causal') {
  // System message helps steer GPT-2-style models
  const sys = history.find(h => h.role === 'system')?.content?.trim()
    ?? 'You are a concise, helpful assistant. Answer as a chat assistant.';

  // Flatten conversation
  const lines = history
    .filter(h => h.role !== 'system')
    .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content.trim()}`);

  // Two styles: causal LM (GPT-2/DialoGPT/TinyLlama-chat) vs text2text (T5/FLAN)
  if (kind === 't2t') {
    return [
      `System: ${sys}`,
      lines.join('\n'),
      'Assistant:'
    ].join('\n');
  }

  // causal default
  return [
    `System: ${sys}`,
    lines.join('\n'),
    'Assistant:' // very important: model will complete after this tag
  ].join('\n');
}

// Good default stops for causal chat
export const CHAT_STOPS = ['\nUser:', '\nSystem:'];

// EOS token for GPT-2 variants
export const EOS_GPT2 = 50256;