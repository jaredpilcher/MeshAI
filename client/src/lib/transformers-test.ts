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

    // The error shows network issues accessing HuggingFace
    // This indicates the Replit environment might have restrictions
    console.log('Network test: Checking HuggingFace accessibility...');
    
    // Test with a very small, well-known model
    console.log('Attempting to load a tiny model from Xenova...');
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      revision: 'main',
      cache_dir: './.cache',
    });
    
    console.log('Basic pipeline creation successful!');
    const result = await classifier('This is a test');
    console.log('Basic inference result:', result);
    
    return { success: true, result };
  } catch (error: any) {
    console.error('Basic transformers test failed:', error);
    console.error('Full error analysis:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
      cause: error?.cause
    });
    
    // Check if it's a network issue
    if (error?.message?.includes('DOCTYPE') || error?.message?.includes('JSON')) {
      console.error('DIAGNOSIS: Network connectivity issue - HuggingFace models cannot be downloaded');
      console.error('This is likely due to Replit environment restrictions or network policies');
      return { 
        success: false, 
        error: 'Network issue: Cannot download models from HuggingFace',
        diagnosis: 'NETWORK_RESTRICTED'
      };
    }
    
    return { success: false, error: error?.message || 'Unknown error' };
  }
}