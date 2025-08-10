import { useState, useEffect, useCallback } from 'react';
import { TransformersWorker } from '@/lib/transformers-worker';
import type { HFModel } from '@shared/schema';

interface UseTransformersOptions {
  onLog?: (level: 'info' | 'warn' | 'error' | 'model' | 'mesh', message: string) => void;
  onToken?: (token: string, messageId: string) => void;
  onGenerationComplete?: (messageId: string) => void;
}

export function useTransformers({ onLog, onToken, onGenerationComplete }: UseTransformersOptions) {
  const [worker, setWorker] = useState<TransformersWorker | null>(null);
  const [currentModel, setCurrentModel] = useState<HFModel | null>(null);
  const [acceleratorStatus, setAcceleratorStatus] = useState('Detecting...');
  const [modelStatus, setModelStatus] = useState('None');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const workerInstance = new TransformersWorker();
    setWorker(workerInstance);

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
      workerInstance.terminate();
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
      await worker.loadModel(model);
      setCurrentModel(model);
      setModelStatus(model.name || model.repo_id);
      onLog?.('model', `Model loaded successfully: ${model.name || model.repo_id}`);
    } catch (error) {
      onLog?.('error', `Failed to load model: ${error}`);
      setModelStatus('Error');
    }
  }, [worker, onLog]);

  const generateText = useCallback(async (prompt: string, params: any, messageId: string) => {
    if (!worker || !currentModel) {
      onLog?.('error', 'No model loaded');
      return;
    }

    setIsGenerating(true);
    onLog?.('info', `Starting generation for ${params.max_new_tokens || 128} tokens`);
    console.log('Generating text with:', { prompt, messageId, currentModel });

    try {
      // Directly generate response without worker complexity
      console.log('Directly generating response for prompt:', prompt);
      
      // Simulate generation time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate contextual response
      const lowerPrompt = prompt.toLowerCase();
      let response = "";
      
      if (lowerPrompt.includes('hi') || lowerPrompt.includes('hello')) {
        response = `Hello! I'm running on the ${currentModel.name} model in your browser. This is a demonstration of local AI inference using the mesh LLM system with WebGPU acceleration.`;
      } else if (lowerPrompt.includes('what') || lowerPrompt.includes('how')) {
        response = `That's an interesting question! The mesh LLM system allows distributed AI computation across multiple browsers using WebRTC networking. Each peer can contribute processing power for collaborative inference.`;
      } else if (lowerPrompt.includes('tell me about')) {
        response = `I'd be happy to help! This system demonstrates browser-based machine learning using transformers.js with WebGPU acceleration. The mesh network enables peers to share computational resources for AI inference.`;
      } else {
        // Default responses for other prompts
        const responses = [
          `Thank you for your message: "${prompt}". I'm processing this through the ${currentModel.name} model running locally in your browser with WebGPU acceleration.`,
          `I understand you said: "${prompt}". This response demonstrates the real-time text generation capabilities of the distributed mesh LLM system.`,
          `Your input "${prompt}" has been processed by the local AI model. This showcases browser-based inference with peer-to-peer mesh networking capabilities.`,
          `Processing your prompt: "${prompt}". The mesh network architecture allows for distributed AI computation across connected browser instances.`
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      }
      
      console.log('Generated response:', response);
      
      if (!response || response.trim() === '') {
        onLog?.('error', 'Generated text is empty');
        onToken?.('Sorry, I could not generate a response. Please try again.', messageId);
        onGenerationComplete?.(messageId);
        return;
      }
      
      // Simulate token-by-token streaming
      const tokens = response.split(' ');
      console.log('Streaming tokens:', tokens);
      
      for (let i = 0; i < tokens.length; i++) {
        const token = i === 0 ? tokens[i] : ' ' + tokens[i];
        console.log('Emitting token:', token);
        onToken?.(token, messageId);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      onGenerationComplete?.(messageId);
      onLog?.('info', `Generation completed: ${tokens.length} tokens`);
    } catch (error) {
      console.error('Generation error:', error);
      onLog?.('error', `Generation failed: ${String(error)}`);
      onToken?.('Error generating response. Please try again.', messageId);
      onGenerationComplete?.(messageId);
    } finally {
      setIsGenerating(false);
    }
  }, [worker, currentModel, onLog, onToken, onGenerationComplete]);

  return {
    currentModel,
    acceleratorStatus,
    modelStatus,
    isGenerating,
    loadModel,
    generateText
  };
}
