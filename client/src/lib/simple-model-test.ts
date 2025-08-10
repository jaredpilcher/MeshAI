// Simple direct test to prove model downloading issue
export async function proveModelDownloadIssue() {
  console.log('=== DEFINITIVE MODEL DOWNLOAD TEST ===');
  
  try {
    // Test 1: Direct config.json fetch
    console.log('📋 Test 1: Fetching TinyLlama config.json directly...');
    const configUrl = 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0/resolve/main/config.json';
    
    const startTime = Date.now();
    const response = await fetch(configUrl);
    const content = await response.text();
    const timeTaken = Date.now() - startTime;
    
    console.log(`⏱️  Fetch took: ${timeTaken}ms`);
    console.log(`📏 Content length: ${content.length} characters`);
    console.log(`🔍 Content type: ${response.headers.get('content-type')}`);
    
    if (content.includes('<!DOCTYPE')) {
      console.error('❌ PROOF: Got HTML error page instead of JSON model config');
      console.error('❌ First 200 chars:', content.substring(0, 200));
      console.error('❌ This definitively proves model downloading is BLOCKED');
      return { 
        success: false, 
        proof: 'HTML_INSTEAD_OF_JSON',
        evidence: `Got ${content.length} chars of HTML instead of model config`
      };
    } else {
      console.log('✅ Successfully got JSON config');
      try {
        const config = JSON.parse(content);
        console.log('✅ Valid JSON model config received:', Object.keys(config));
        return { 
          success: true, 
          proof: 'VALID_CONFIG_RECEIVED',
          evidence: `Got valid ${content.length} char JSON config`
        };
      } catch (parseError) {
        console.error('❌ Content is not valid JSON:', parseError);
        return { 
          success: false, 
          proof: 'INVALID_JSON',
          evidence: `Got ${content.length} chars but not valid JSON`
        };
      }
    }
  } catch (error) {
    console.error('❌ Network error during direct test:', error);
    return { 
      success: false, 
      proof: 'NETWORK_ERROR',
      evidence: `Network error: ${error}`
    };
  }
}

// Test if transformers.js can actually load any model
export async function testTransformersModelLoading() {
  console.log('=== TRANSFORMERS.JS MODEL LOADING TEST ===');
  
  try {
    const { pipeline } = await import('@huggingface/transformers');
    
    console.log('🤖 Attempting to load smallest possible model...');
    const startTime = Date.now();
    
    // Try the absolute smallest model possible
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      revision: 'main',
      progress_callback: (progress: any) => {
        console.log(`📥 Progress: ${progress.file} - ${Math.round(progress.progress || 0)}%`);
      }
    });
    
    const timeTaken = Date.now() - startTime;
    console.log(`⏱️  Model loading took: ${timeTaken}ms`);
    
    // Test inference
    const result = await classifier('This is a test');
    console.log('✅ Inference result:', result);
    
    return {
      success: true,
      timeTaken,
      result: 'Model loaded and inference successful'
    };
    
  } catch (error: any) {
    console.error('❌ Transformers.js loading failed:', error);
    
    if (error?.message?.includes('DOCTYPE')) {
      console.error('❌ PROOF: Got HTML instead of model files');
      return {
        success: false,
        proof: 'HTML_INSTEAD_OF_MODEL_FILES',
        error: error.message
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}