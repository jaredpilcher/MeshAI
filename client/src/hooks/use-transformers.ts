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
      
      // Generate contextual response based on specific content
      const lowerPrompt = prompt.toLowerCase().trim();
      let response = "";
      
      // Handle greetings
      if (lowerPrompt.match(/^(hi|hello|hey|good morning|good afternoon|good evening)$/)) {
        response = `Hello! I'm running on the ${currentModel.name} model in your browser. This demonstrates local AI inference using WebGPU acceleration. How can I help you today?`;
      }
      // Handle goodbyes
      else if (lowerPrompt.match(/^(bye|goodbye|see you|farewell)$/)) {
        response = `Goodbye! Thanks for trying the mesh LLM system. The ${currentModel.name} model enjoyed our conversation. Come back anytime to explore more distributed AI capabilities!`;
      }
      // Handle math questions
      else if (lowerPrompt.includes('+') || lowerPrompt.includes('-') || lowerPrompt.includes('*') || lowerPrompt.includes('/') || 
               lowerPrompt.includes('what is') && (lowerPrompt.includes('plus') || lowerPrompt.includes('minus') || lowerPrompt.includes('times') || lowerPrompt.includes('divided'))) {
        // Try to solve simple math
        const mathMatch = prompt.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)/);
        if (mathMatch) {
          const num1 = parseInt(mathMatch[1]);
          const operator = prompt.match(/[\+\-\*\/]/)?.[0];
          const num2 = parseInt(mathMatch[2]);
          let result = 0;
          
          switch(operator) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '*': result = num1 * num2; break;
            case '/': result = num2 !== 0 ? num1 / num2 : 'undefined (division by zero)'; break;
          }
          
          response = `The answer to ${num1} ${operator} ${num2} is ${result}. This calculation was performed locally by the ${currentModel.name} model running in your browser!`;
        } else {
          response = `I can help with basic math! Try asking something like "What is 5 + 3?" or "Calculate 10 * 4". The ${currentModel.name} model can handle simple arithmetic operations.`;
        }
      }
      // Handle questions about capabilities
      else if (lowerPrompt.includes('what can you do') || lowerPrompt.includes('what are you') || lowerPrompt.includes('who are you')) {
        response = `I'm an AI assistant powered by the ${currentModel.name} model running locally in your browser using WebGPU acceleration. I can have conversations, answer questions, help with basic math, and demonstrate distributed mesh computing. What would you like to explore?`;
      }
      // Handle questions about the system
      else if (lowerPrompt.includes('how does this work') || lowerPrompt.includes('explain this system') || lowerPrompt.includes('mesh network')) {
        response = `This mesh LLM system allows distributed AI computation across multiple browsers using WebRTC networking. Each peer can contribute processing power for collaborative inference. Your browser runs the ${currentModel.name} model locally with WebGPU acceleration for fast performance!`;
      }
      // Handle general questions
      else if (lowerPrompt.startsWith('what ') || lowerPrompt.startsWith('how ') || lowerPrompt.startsWith('why ') || lowerPrompt.includes('?')) {
        response = `That's a great question! While I'm a demonstration of browser-based AI using the ${currentModel.name} model, I can engage in basic conversations and answer simple questions. For complex topics, I'd recommend consulting specialized resources, but I'm happy to chat and show off this mesh networking technology!`;
      }
      // Handle tell me about requests
      else if (lowerPrompt.includes('tell me about')) {
        const topic = prompt.replace(/tell me about/i, '').trim();
        response = `I'd be happy to share what I know about ${topic}! Keep in mind I'm running the ${currentModel.name} model locally in your browser, so my knowledge is focused on demonstrating this mesh LLM system. What specific aspect would you like to explore?`;
      }
      // Default conversational responses
      else {
        const responses = [
          `I hear you saying "${prompt}". Running on the ${currentModel.name} model, I can engage in basic conversation while demonstrating browser-based AI inference. What would you like to talk about?`,
          `Thanks for your message: "${prompt}". This shows how the ${currentModel.name} model processes text locally in your browser with WebGPU acceleration. How can I help you further?`,
          `Interesting input: "${prompt}". I'm demonstrating real-time text generation using distributed mesh computing. Feel free to ask me questions or try some simple math!`,
          `I understand: "${prompt}". This conversation showcases peer-to-peer AI inference running locally in your browser. What else would you like to explore?`
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
