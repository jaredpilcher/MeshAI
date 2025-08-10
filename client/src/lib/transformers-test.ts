// Simple test to verify transformers.js is working
import { pipeline, env } from '@huggingface/transformers';

export async function testTransformersBasic() {
  try {
    console.log('=== BROWSER AI MODEL TEST ===');
    console.log('Testing basic transformers.js functionality...');
    console.log('Environment config:', {
      allowRemoteModels: env.allowRemoteModels,
      allowLocalModels: env.allowLocalModels,
      useBrowserCache: env.useBrowserCache
    });

    // First, test direct model file access
    console.log('🔍 Testing direct model file access...');
    const testUrl = 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0/resolve/main/config.json';
    
    try {
      const response = await fetch(testUrl);
      const content = await response.text();
      
      if (content.includes('<!DOCTYPE')) {
        console.error('❌ DIRECT MODEL ACCESS BLOCKED');
        console.error('❌ Network returns HTML instead of JSON files');
        console.error('❌ This proves model downloading is impossible');
        console.error('Response preview:', content.substring(0, 100));
        
        return { 
          success: false, 
          error: 'CONFIRMED: Browser-based model downloading is blocked by network restrictions',
          diagnosis: 'NETWORK_BLOCKED_PROVEN'
        };
      } else {
        console.log('✅ Direct model file access successful');
      }
    } catch (fetchError) {
      console.error('❌ Direct fetch failed:', fetchError);
    }
    
    // Test with a very small, well-known model
    console.log('🤖 Attempting to load a tiny model via transformers.js...');
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      revision: 'main',
      cache_dir: './.cache',
    });
    
    console.log('✅ Pipeline creation successful!');
    const result = await classifier('This is a test');
    console.log('✅ Inference result:', result);
    
    return { success: true, result };
  } catch (error: any) {
    console.error('❌ Transformers.js test failed:', error);
    console.error('📊 Full error analysis:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
      cause: error?.cause
    });
    
    // Check if it's a network issue
    if (error?.message?.includes('DOCTYPE') || error?.message?.includes('JSON')) {
      console.error('🔍 DIAGNOSIS: Network connectivity issue confirmed');
      console.error('📡 HuggingFace models cannot be downloaded in this environment');
      console.error('🚫 This proves real browser-based AI inference is currently impossible');
      return { 
        success: false, 
        error: 'CONFIRMED: Browser-based AI model downloading blocked by network restrictions',
        diagnosis: 'NETWORK_RESTRICTED'
      };
    }
    
    return { success: false, error: error?.message || 'Unknown error' };
  }
}