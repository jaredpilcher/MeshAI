import { pipeline, env } from '@huggingface/transformers';
import { downloadVerifier } from './download-verification';
import { proveModelDownloadIssue } from './simple-model-test';

// Configure transformers.js for browser-based inference
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.useBrowserCache = true;

// Real transformers.js implementation for browser-based AI inference
export class TransformersWorker {
  private generator: any = null;
  private currentModel: any = null;
  private isLoading = false;

  constructor() {
    console.log('TransformersWorker initialized for real browser-based AI inference');
  }

  async loadModel(model: any): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    this.isLoading = true;

    try {
      console.log(`⬇️  STARTING COMPREHENSIVE DOWNLOAD VERIFICATION FOR: ${model.repo_id}`);
      console.log(`📊 Expected model size: ~2.2GB for TinyLlama-1.1B`);
      console.log(`⏱️  Expected download time: 30+ seconds on good connection`);
      
      // Run definitive proof test first
      const proofResult = await proveModelDownloadIssue();
      console.log('Direct proof test result:', proofResult);
      
      if (!proofResult.success) {
        console.error('Model downloading is blocked in this environment');
        console.error('Evidence:', proofResult.evidence);
        throw new Error(`Model download blocked: ${proofResult.evidence}`);
      }
      
      // Start comprehensive download tracking
      downloadVerifier.startDownloadTracking();
      
      console.log('Creating pipeline for text generation...');
      
      // Use a try-catch for the pipeline creation to catch specific errors
      try {
        this.generator = await pipeline('text-generation', model.repo_id, {
          revision: 'main',
          cache_dir: './.cache',
          progress_callback: (progress: any) => {
            console.log(`Model loading progress: ${progress.file} - ${Math.round(progress.progress || 0)}%`);
            if (progress.status) {
              console.log(`Status: ${progress.status}`);
            }
          }
        });
        console.log('✅ Pipeline created successfully!');
        
        // Run comprehensive download verification
        const verificationResult = await downloadVerifier.verifyModelDownload(model.repo_id);
        downloadVerifier.logVerificationReport(verificationResult);
        
        if (!verificationResult.actuallyDownloaded) {
          console.error('🚨 VERIFICATION FAILED: Model did NOT actually download to browser');
          console.error('🚨 Evidence suggests this was a fake/cached response, not real model data');
          throw new Error('Model download verification failed - no actual model data received');
        }
      } catch (pipelineError: any) {
        console.error('Pipeline creation failed:', pipelineError);
        console.error('Pipeline error details:', {
          message: pipelineError?.message,
          name: pipelineError?.name,
          stack: pipelineError?.stack?.substring(0, 500)
        });
        
        // Check for network issues specifically
        if (pipelineError?.message?.includes('DOCTYPE') || pipelineError?.message?.includes('JSON')) {
          throw new Error('Network restrictions prevent model downloading from HuggingFace');
        }
        
        throw new Error(`Failed to create pipeline: ${pipelineError?.message || 'Unknown error'}`);
      }

      this.currentModel = {
        name: model.name || model.repo_id,
        repo_id: model.repo_id,
        task: model.task || 'text-generation',
        loaded: true,
        device: this.generator?.model?.device || 'cpu'
      };

      console.log(`Real model loaded successfully: ${this.currentModel.name}`);
      console.log(`Running on device: ${this.currentModel.device}`);
      
    } catch (error: any) {
      console.error('Real model loading failed:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause
      });
      this.currentModel = null;
      this.generator = null;
      throw new Error(`Model loading failed: ${error?.message || 'Unknown error'}`);
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
      
    } catch (error: any) {
      console.error('Real AI inference error:', error);
      throw new Error(`AI inference failed: ${error?.message || 'Unknown error'}`);
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