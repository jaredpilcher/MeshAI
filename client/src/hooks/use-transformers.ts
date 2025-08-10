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

    try {
      // Simulate streaming by generating text and emitting tokens
      const result = await worker.generateText(prompt, params);
      
      // Simulate token-by-token streaming
      const tokens = result.split(' ');
      for (let i = 0; i < tokens.length; i++) {
        const token = i === 0 ? tokens[i] : ' ' + tokens[i];
        onToken?.(token, messageId);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      onGenerationComplete?.(messageId);
      onLog?.('info', `Generation completed: ${tokens.length} tokens`);
    } catch (error) {
      onLog?.('error', `Generation failed: ${error}`);
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
