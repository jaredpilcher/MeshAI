// Browser-based AI worker using server proxy for model loading
// Bypasses network restrictions by downloading models through our server

import {
  pipeline,
  env,
  type TextGenerationPipeline
} from '@huggingface/transformers';

// Configure transformers.js to use our server proxy
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.useBrowserCache = true;

// Configure transformers.js for chat-only models via server proxy
env.localModelPath = '/models';
env.remoteHost = window.location.origin; 
env.remotePathTemplate = `${window.location.origin}/models/{model}/`;
env.allowRemoteModels = true;
env.allowLocalModels = true;

// Server-proxy transformers.js implementation for browser-based AI inference
export class TransformersWorker {
  private generator: TextGenerationPipeline | null = null;
  private currentModel: any = null;
  private isLoading = false;

  constructor() {
    console.log('TransformersWorker initialized with server proxy for model loading');
  }

  async loadModel(model: any): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;

    try {
      console.log(`🔄 Loading model through server proxy: ${model.repo_id}`);
      
      // Step 1: Trigger model download on server if needed
      await this.ensureModelDownloaded(model.repo_id);
      
      // Step 2: Wait for download completion
      await this.waitForModelReady(model.repo_id);
      
      // Step 3: Load model from our server
      console.log('Creating pipeline from server-hosted model...');
      
      // Force the env settings right before pipeline creation
      console.log('Setting transformers.js environment:', {
        remoteHost: window.location.origin,
        remotePathTemplate: `${window.location.origin}/models/{model}/`,
        allowRemoteModels: true,
      });
      
      env.remoteHost = window.location.origin;
      env.remotePathTemplate = `${window.location.origin}/models/{model}/`;
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      
      // Use the model's actual task (should be 'text-generation' or 'text2text-generation')
      const task = model.task || 'text-generation';
      console.log('[Loader] pipeline', task, model.repo_id);
      
      // Create pipeline with the supported task
      this.generator = await pipeline(
        task, 
        model.repo_id, 
        {
          revision: 'main',
          cache_dir: './.cache',
          progress_callback: (progress: any) => {
            console.log(`Model loading: ${progress.file} - ${Math.round(progress.progress || 0)}%`);
          }
        }
      ) as any;
      
      this.currentModel = model;
      console.log('✅ Model loaded successfully from server proxy!');
      
    } catch (error: any) {
      console.error('Model loading failed:', error);
      throw new Error(`Failed to load model: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  private async ensureModelDownloaded(modelId: string): Promise<void> {
    try {
      console.log(`Triggering server download for: ${modelId}`);
      
      const response = await fetch(`/api/models/${encodeURIComponent(modelId)}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server download failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Server download status:', result);
      
    } catch (error) {
      console.error('Failed to trigger server download:', error);
      throw error;
    }
  }

  private async waitForModelReady(modelId: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds
    
    console.log(`Waiting for model to be ready on server...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`/api/models/${encodeURIComponent(modelId)}/status`);
        
        if (!response.ok) {
          console.warn('Status check failed, retrying...');
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        
        const status = await response.json();
        console.log('Model status:', status);
        
        if (status.isAvailable) {
          console.log('✅ Model is ready on server!');
          return;
        }
        
        if (status.isDownloading) {
          console.log('📥 Model still downloading on server...');
        } else {
          console.log('⏳ Model not ready yet, will retry...');
        }
        
      } catch (error) {
        console.warn('Status check error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Model download timeout after ${maxWaitTime / 1000}s`);
  }

  // Chat adapter - formats messages into prompt for causal LMs
  toChatPrompt(messages: {role: 'user'|'assistant'|'system', content: string}[]): string {
    const sys = messages.find(h => h.role === 'system')?.content?.trim();
    const turns = messages
      .filter(h => h.role !== 'system')
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content.trim()}`)
      .join('\n');

    const prefix = sys ? `System: ${sys}\n` : '';
    return `${prefix}${turns}\nAssistant:`;
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    if (!this.generator) {
      throw new Error('No model loaded');
    }

    try {
      console.log('Generating text with real AI model...');
      
      const result = await this.generator(prompt, {
        max_new_tokens: options.max_new_tokens || 128,
        temperature: options.temperature || 0.8,
        do_sample: true,
        ...options
      });

      const generatedText = (result as any)[0]?.generated_text || '';
      console.log('AI generation completed:', generatedText.length, 'characters');
      
      return generatedText;
      
    } catch (error: any) {
      console.error('Text generation failed:', error);
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  async generateChat(messages: {role: 'user'|'assistant'|'system', content: string}[], options: any = {}): Promise<string> {
    const prompt = this.toChatPrompt(messages);
    console.log('Chat prompt formatted:', prompt);
    return this.generateText(prompt, options);
  }

  getStatus() {
    return {
      hasModel: !!this.generator,
      modelName: this.currentModel?.name || 'None',
      isLoading: this.isLoading,
      mode: 'SERVER_PROXY'
    };
  }

  destroy() {
    this.generator = null;
    this.currentModel = null;
    this.isLoading = false;
    console.log('TransformersWorker destroyed');
  }

  // Compatibility method for React hook cleanup
  terminate() {
    this.destroy();
  }
}

// Export singleton instance
export const transformersWorker = new TransformersWorker();