import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for browser-based inference
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.useBrowserCache = true;

// Enable WebGPU with fallback to WASM/CPU
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
}

// Real transformers.js implementation for browser-based AI inference
export class TransformersWorker {
  private generator: any = null;
  private currentModel: any = null;
  private isLoading = false;

  constructor() {
    console.log('TransformersWorker initialized with real transformers.js');
  }

  async loadModel(model: any): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;

    try {
      console.log(`Loading real model from HuggingFace: ${model.repo_id}`);
      console.log('This will download and cache the model in your browser...');

      // Load the actual model using transformers.js with simpler configuration
      this.generator = await pipeline('text-generation', model.repo_id, {
        quantized: true, // Use quantized model for efficiency
        progress_callback: (progress: any) => {
          console.log(`Model loading progress: ${progress.file} - ${Math.round(progress.progress || 0)}%`);
        }
      });

      this.currentModel = {
        name: model.name || model.repo_id,
        repo_id: model.repo_id,
        task: model.task || 'text-generation',
        loaded: true,
        device: this.generator.model?.device || 'cpu'
      };

      console.log(`Real model loaded successfully: ${this.currentModel.name}`);
      console.log(`Running on device: ${this.currentModel.device}`);
      
    } catch (error) {
      console.error('Real model loading failed:', error);
      this.currentModel = null;
      this.generator = null;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async generateText(prompt: string, params: any): Promise<string> {
    if (!this.generator) {
      throw new Error('No model loaded. Please load a model first.');
    }

    if (this.isLoading) {
      throw new Error('Model is still loading');
    }

    try {
      console.log(`Starting real AI inference for prompt: ${prompt.substring(0, 50)}...`);
      
      const startTime = performance.now();
      
      // Perform actual AI inference using the loaded model
      const result = await this.generator(prompt, {
        max_new_tokens: params.max_new_tokens || 50,
        temperature: params.temperature || 0.7,
        top_p: params.top_p || 0.9,
        do_sample: true,
        pad_token_id: this.generator.tokenizer?.pad_token_id,
        eos_token_id: this.generator.tokenizer?.eos_token_id,
        return_full_text: false, // Only return generated part
      });

      const inferenceTime = performance.now() - startTime;
      
      let generatedText = '';
      if (Array.isArray(result) && result.length > 0) {
        generatedText = result[0].generated_text || '';
      } else if (typeof result === 'string') {
        generatedText = result;
      }

      if (!generatedText.trim()) {
        throw new Error('Model generated empty response. Try a different prompt.');
      }

      console.log(`Real AI inference completed in ${Math.round(inferenceTime)}ms`);
      console.log('Generated response:', generatedText);
      
      return generatedText;
      
    } catch (error) {
      console.error('Real AI inference error:', error);
      throw new Error(`AI inference failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  terminate(): void {
    this.generator = null;
    this.currentModel = null;
    this.isLoading = false;
  }

  getStatus(): { hasModel: boolean; modelName: string | null; isLoading: boolean; device?: string } {
    return {
      hasModel: !!this.currentModel,
      modelName: this.currentModel?.name || null,
      isLoading: this.isLoading,
      device: this.currentModel?.device
    };
  }
}