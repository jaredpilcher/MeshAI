// Debug tool to test actual network connectivity to HuggingFace
export async function debugNetworkConnectivity() {
  console.log('=== NETWORK CONNECTIVITY DEBUG ===');
  
  // Test 1: Direct fetch to HuggingFace
  try {
    console.log('Test 1: Direct fetch to huggingface.co...');
    const response = await fetch('https://huggingface.co', { 
      method: 'HEAD',
      mode: 'no-cors' 
    });
    console.log('✅ HuggingFace main site reachable');
  } catch (error) {
    console.error('❌ HuggingFace main site NOT reachable:', error);
  }

  // Test 2: Try to fetch a small model config file
  try {
    console.log('Test 2: Fetching TinyLlama config.json...');
    const configUrl = 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0/resolve/main/config.json';
    const response = await fetch(configUrl);
    const text = await response.text();
    
    if (text.includes('<!DOCTYPE')) {
      console.error('❌ Got HTML instead of JSON - network restriction confirmed');
      console.error('Response preview:', text.substring(0, 200));
    } else {
      console.log('✅ Successfully fetched model config');
      console.log('Config preview:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Failed to fetch model config:', error);
  }

  // Test 3: Try transformers.js offline check
  try {
    console.log('Test 3: Checking transformers.js environment...');
    const { env } = await import('@huggingface/transformers');
    console.log('Environment settings:', {
      allowRemoteModels: env.allowRemoteModels,
      allowLocalModels: env.allowLocalModels,
      useBrowserCache: env.useBrowserCache
    });
  } catch (error) {
    console.error('❌ Transformers.js environment error:', error);
  }

  console.log('=== END NETWORK DEBUG ===');
}

// Test if we can actually download any model file
export async function testActualModelDownload() {
  console.log('=== ACTUAL MODEL DOWNLOAD TEST ===');
  
  try {
    // Try to download the smallest possible model file
    const modelUrl = 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/tokenizer.json';
    console.log('Attempting to download tokenizer.json...');
    
    const response = await fetch(modelUrl);
    const content = await response.text();
    
    if (content.includes('<!DOCTYPE')) {
      console.error('❌ CONFIRMED: No actual model downloading possible');
      console.error('❌ Network returns HTML error pages instead of model files');
      console.error('❌ This proves browser-based AI inference is blocked');
      return false;
    } else {
      console.log('✅ Model file successfully downloaded!');
      console.log('File size:', content.length, 'bytes');
      return true;
    }
  } catch (error) {
    console.error('❌ Model download failed:', error);
    return false;
  }
}