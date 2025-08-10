// Simple test to verify transformers.js is working
import { pipeline, env } from '@huggingface/transformers';

export async function testTransformersBasic() {
  try {
    console.log('Testing basic transformers.js functionality...');
    console.log('Environment config:', {
      allowRemoteModels: env.allowRemoteModels,
      allowLocalModels: env.allowLocalModels,
      useBrowserCache: env.useBrowserCache
    });

    // Try a very simple model first
    console.log('Attempting to load a simple sentiment analysis model...');
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    
    console.log('Basic pipeline creation successful!');
    const result = await classifier('This is a test');
    console.log('Basic inference result:', result);
    
    return { success: true, result };
  } catch (error: any) {
    console.error('Basic transformers test failed:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      cause: error?.cause
    });
    return { success: false, error: error?.message || 'Unknown error' };
  }
}