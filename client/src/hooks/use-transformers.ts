import { useState, useEffect, useCallback } from 'react';
import { transformersWorker } from '@/lib/transformers-worker';
import type { HFModel } from '@shared/schema';

interface UseTransformersOptions {
  onLog?: (level: 'info' | 'warn' | 'error' | 'model' | 'mesh', message: string) => void;
  onToken?: (token: string, messageId: string) => void;
  onGenerationComplete?: (messageId: string) => void;
}

export function useTransformers({ onLog, onToken, onGenerationComplete }: UseTransformersOptions) {
  const [worker, setWorker] = useState<typeof transformersWorker | null>(null);
  const [currentModel, setCurrentModel] = useState<HFModel | null>(null);
  const [acceleratorStatus, setAcceleratorStatus] = useState('Detecting...');
  const [modelStatus, setModelStatus] = useState('None');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Use the singleton instance
    setWorker(transformersWorker);

    // Detect WebGPU support
    const detectAccelerator = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            setAcceleratorStatus('WebGPU Available');
            onLog?.('info', 'WebGPU accelerator detected');
          } else {
            setAcceleratorStatus('WASM/CPU');
            onLog?.('info', 'WebGPU not available, using WASM/CPU');
          }
        } catch (error) {
          setAcceleratorStatus('WASM/CPU');
          onLog?.('warn', 'WebGPU detection failed, using WASM/CPU');
        }
      } else {
        setAcceleratorStatus('WASM/CPU');
        onLog?.('info', 'WebGPU not supported, using WASM/CPU');
      }
    };

    detectAccelerator();

    return () => {
      // No need to terminate singleton, just clean up local state
    };
  }, [onLog]);

  const loadModel = useCallback(async (model: HFModel) => {
    if (!worker) {
      onLog?.('error', 'Worker not initialized');
      return;
    }

    setModelStatus('Loading...');
    onLog?.('model', `Loading model: ${model.repo_id}`);

    try {
      console.log('Starting model load for:', model);
      await worker.loadModel(model);
      setCurrentModel(model);
      setModelStatus(model.name || model.repo_id);
      onLog?.('model', `Model loaded successfully: ${model.name || model.repo_id}`);
    } catch (error: any) {
      console.error('Failed to load model in hook:', error);
      console.error('Full error object:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        cause: error?.cause
      });
      // No fallback mode - if loading fails, it fails completely
      
      const errorMessage = error?.message || `Failed to load model: ${error}`;
      console.error('Setting error message:', errorMessage);
      onLog?.('error', errorMessage);
      setModelStatus('Error');
    }
  }, [worker, onLog]);

  // New chat-aware generation method that handles message history
  const generateChat = useCallback(async (messages: any[], params: any, messageId: string) => {
    if (!worker || !currentModel) {
      onLog?.('error', 'No model loaded');
      return;
    }

    setIsGenerating(true);
    onLog?.('info', `Starting chat generation for ${params.max_new_tokens || 160} tokens`);
    console.log('Generating chat with messages:', messages.length, 'messages');

    try {
      // Map to the expected format and take last conversation turns for context
      const chatTurns = messages
        .slice(-10) // Last 10 turns for context
        .map(m => ({
          role: (m.source === 'user' ? 'user' : m.source === 'system' ? 'system' : 'assistant') as 'user'|'system'|'assistant',
          content: m.content
        }));

      console.log('Chat turns formatted:', chatTurns);
      
      // Use the new generateChat method with proper formatting
      const response = await worker.generateChat(chatTurns, params);
      console.log('Chat-formatted AI response:', response);
      
      if (!response || response.trim() === '') {
        onLog?.('error', 'Model generated empty response');
        onToken?.('Sorry, I couldn\'t generate a response. Try a different message.', messageId);
        onGenerationComplete?.(messageId);
        return;
      }
      
      // Stream the response word by word for better UX
      const words = response.trim().split(/(\s+)/);
      console.log('Streaming chat response:', words.length, 'words');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;
        
        console.log('Emitting word:', word);
        onToken?.(word, messageId);
        
        // Slower streaming for chat responses
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 25));
      }
      
      onGenerationComplete?.(messageId);
      onLog?.('info', `Chat generation completed: ${words.length} words`);
    } catch (error: any) {
      console.error('Chat generation error:', error);
      
      onLog?.('error', `Chat generation failed: ${error.message || String(error)}`);
      onToken?.('Error: Chat generation failed. Please try again or reload the model.', messageId);
      onGenerationComplete?.(messageId);
    } finally {
      setIsGenerating(false);
    }
  }, [worker, currentModel, onLog, onToken, onGenerationComplete]);

  // Legacy generateText method for backwards compatibility
  const generateText = useCallback(async (prompt: string, params: any, messageId: string) => {
    // Convert simple prompt to message format and use chat generation
    const messages = [{ source: 'user', content: prompt, id: 'temp', isStreaming: false }];
    return generateChat(messages, params, messageId);
  }, [generateChat]);

  return {
    currentModel,
    acceleratorStatus,
    modelStatus,
    isGenerating,
    loadModel,
    generateText,
    generateChat
  };
}
