// Comprehensive verification that models are actually downloading to browser
export class DownloadVerificationSystem {
  private downloadStartTime: number = 0;
  private bytesDownloaded: number = 0;
  private filesReceived: string[] = [];
  private networkRequests: any[] = [];

  constructor() {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0] as string;
      if (url.includes('huggingface.co') || url.includes('cdn-lfs.huggingface.co')) {
        console.log('🌐 NETWORK: Attempting to fetch model file:', url);
        this.networkRequests.push({ url, timestamp: Date.now(), type: 'fetch' });
        
        const response = await originalFetch(...args);
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        console.log('📊 RESPONSE HEADERS:', {
          status: response.status,
          contentType,
          contentLength: contentLength ? parseInt(contentLength) : 'unknown'
        });
        
        // Check if we got actual model data or HTML error
        if (contentType?.includes('text/html')) {
          console.error('❌ RECEIVED HTML INSTEAD OF MODEL DATA');
          console.error('❌ This proves model downloading is blocked');
        } else if (contentType?.includes('application/json') || contentType?.includes('application/octet-stream')) {
          console.log('✅ Received actual model file data');
          this.bytesDownloaded += parseInt(contentLength || '0');
        }
        
        return response;
      }
      return originalFetch(...args);
    };
  }

  startDownloadTracking() {
    this.downloadStartTime = Date.now();
    this.bytesDownloaded = 0;
    this.filesReceived = [];
    this.networkRequests = [];
    console.log('🔍 DOWNLOAD VERIFICATION: Starting comprehensive tracking...');
  }

  async verifyModelDownload(modelId: string): Promise<{
    actuallyDownloaded: boolean;
    timeTaken: number;
    bytesDownloaded: number;
    networkRequests: number;
    evidence: string[];
  }> {
    const evidence: string[] = [];
    const timeTaken = Date.now() - this.downloadStartTime;
    
    // Evidence 1: Time analysis
    if (timeTaken < 5000) {
      evidence.push(`⚠️  Download completed in ${timeTaken}ms - too fast for 1.1B parameter model`);
      evidence.push(`⚠️  Real model download should take 30+ seconds, not milliseconds`);
    }
    
    // Evidence 2: Bytes downloaded
    if (this.bytesDownloaded < 1000000) { // Less than 1MB
      evidence.push(`⚠️  Only ${this.bytesDownloaded} bytes downloaded - far too small for 1.1B model`);
      evidence.push(`⚠️  TinyLlama should be ~2.2GB, this is ${Math.round(this.bytesDownloaded/1000)}KB`);
    }
    
    // Evidence 3: Network requests analysis
    evidence.push(`📊 Network requests made: ${this.networkRequests.length}`);
    this.networkRequests.forEach(req => {
      evidence.push(`   - ${req.url.split('/').pop()}`);
    });
    
    // Evidence 4: Browser cache check
    try {
      const cacheSize = await this.estimateCacheSize();
      evidence.push(`💾 Browser cache size: ~${cacheSize}MB`);
      if (cacheSize < 100) {
        evidence.push(`⚠️  Cache too small for 1.1B model storage`);
      }
    } catch (e) {
      evidence.push(`❌ Could not access browser cache information`);
    }
    
    // Evidence 5: Memory usage
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      evidence.push(`🧠 JS Heap: ${Math.round(memInfo.usedJSHeapSize/1024/1024)}MB used`);
      if (memInfo.usedJSHeapSize < 100 * 1024 * 1024) { // Less than 100MB
        evidence.push(`⚠️  Memory usage too low for loaded 1.1B model`);
      }
    }
    
    const actuallyDownloaded = this.bytesDownloaded > 100000000 && timeTaken > 10000; // 100MB+ and 10+ seconds
    
    return {
      actuallyDownloaded,
      timeTaken,
      bytesDownloaded: this.bytesDownloaded,
      networkRequests: this.networkRequests.length,
      evidence
    };
  }

  private async estimateCacheSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return Math.round((estimate.usage || 0) / 1024 / 1024);
    }
    return 0;
  }

  logVerificationReport(result: any) {
    console.log('=== DOWNLOAD VERIFICATION REPORT ===');
    console.log(`Model actually downloaded: ${result.actuallyDownloaded ? '✅ YES' : '❌ NO'}`);
    console.log(`Time taken: ${result.timeTaken}ms`);
    console.log(`Bytes downloaded: ${result.bytesDownloaded}`);
    console.log(`Network requests: ${result.networkRequests}`);
    console.log('Evidence:');
    result.evidence.forEach((item: string) => console.log(`  ${item}`));
    console.log('=== END VERIFICATION REPORT ===');
  }
}

export const downloadVerifier = new DownloadVerificationSystem();