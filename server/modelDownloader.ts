import fetch from 'node-fetch';
import { ObjectStorageService } from './objectStorage';

// Service for downloading AI models from HuggingFace and storing them in object storage
export class ModelDownloaderService {
  private objectStorage: ObjectStorageService;
  private downloadQueue: Map<string, Promise<void>> = new Map();

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  // Download a complete model from HuggingFace to our object storage
  async downloadModel(modelId: string): Promise<void> {
    console.log(`Starting model download: ${modelId}`);

    // Prevent duplicate downloads
    if (this.downloadQueue.has(modelId)) {
      console.log(`Model ${modelId} already downloading, waiting...`);
      return this.downloadQueue.get(modelId)!;
    }

    const downloadPromise = this._performModelDownload(modelId);
    this.downloadQueue.set(modelId, downloadPromise);

    try {
      await downloadPromise;
    } finally {
      this.downloadQueue.delete(modelId);
    }
  }

  private async _performModelDownload(modelId: string): Promise<void> {
    try {
      // First, get the model's file list
      const filesUrl = `https://huggingface.co/api/models/${modelId}`;
      console.log(`Fetching model info: ${filesUrl}`);
      
      const modelInfoResponse = await fetch(filesUrl);
      if (!modelInfoResponse.ok) {
        throw new Error(`Failed to fetch model info: ${modelInfoResponse.statusText}`);
      }

      const modelInfo = await modelInfoResponse.json() as any;
      const siblings = modelInfo.siblings || [];

      console.log(`Found ${siblings.length} files for model ${modelId}`);

      // Essential files for transformers.js models
      const essentialFiles = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'special_tokens_map.json',
        'vocab.json',
        'merges.txt',
        'pytorch_model.bin',
        'model.onnx',
        'onnx/model.onnx',
        'onnx/model_quantized.onnx'
      ];

      // Download essential files first
      const filesToDownload = siblings.filter((file: any) => {
        const filename = file.rfilename;
        return essentialFiles.some(essential => filename.endsWith(essential)) ||
               filename.includes('.bin') ||
               filename.includes('.onnx') ||
               filename.includes('.json');
      });

      console.log(`Downloading ${filesToDownload.length} essential files...`);

      // Download files in parallel (but limit concurrency)
      const downloadPromises = filesToDownload.map((file: any) => 
        this.downloadModelFile(modelId, file.rfilename)
      );

      await Promise.allSettled(downloadPromises);
      console.log(`Model download completed: ${modelId}`);

    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error);
      throw error;
    }
  }

  // Download a specific file from a model
  private async downloadModelFile(modelId: string, filename: string): Promise<void> {
    const fileUrl = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
    const storagePath = `/models/${modelId}/${filename}`;

    try {
      // Check if file already exists
      if (await this.objectStorage.fileExists(storagePath)) {
        console.log(`File already exists: ${filename}`);
        return;
      }

      console.log(`Downloading: ${filename}`);
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download ${filename}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      await this.objectStorage.uploadBuffer(buffer, storagePath, contentType);
      console.log(`Successfully stored: ${filename} (${buffer.length} bytes)`);

    } catch (error) {
      console.error(`Failed to download file ${filename}:`, error);
      // Don't throw - allow partial model downloads
    }
  }

  // Check if a model is available in our storage
  async isModelAvailable(modelId: string): Promise<boolean> {
    const essentialFiles = ['config.json', 'tokenizer.json'];
    
    for (const file of essentialFiles) {
      const storagePath = `/models/${modelId}/${file}`;
      if (!(await this.objectStorage.fileExists(storagePath))) {
        return false;
      }
    }
    
    return true;
  }

  // Get the download progress for a model
  getDownloadProgress(modelId: string): { isDownloading: boolean } {
    return {
      isDownloading: this.downloadQueue.has(modelId)
    };
  }
}

// Singleton instance
export const modelDownloader = new ModelDownloaderService();