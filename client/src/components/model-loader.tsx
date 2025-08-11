import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HFModel } from "@shared/schema";

interface ModelLoaderProps {
  currentModel: HFModel | null;
  onLoadModel: (model: HFModel) => Promise<void>;
  acceptJobs: boolean;
  onAcceptJobsChange: (accept: boolean) => void;
}

export function ModelLoader({ currentModel, onLoadModel, acceptJobs, onAcceptJobsChange }: ModelLoaderProps) {
  const [customRepo, setCustomRepo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uiState, setUiState] = useState('Ready');

  const handleLoadRandom = async () => {
    setIsLoading(true);
    setUiState('Fetching manifest…');
    
    try {
      console.log('Starting getRandomAndLoad workflow');
      const response = await fetch('/api/manifest');
      const manifest = await response.json();
      
      if (!manifest?.models?.length) {
        throw new Error('No models in manifest');
      }
      
      // Filter for chat-capable models (text-generation or text2text-generation)
      const isChatCapable = (m: any) => 
        m.task === 'text-generation' || m.task === 'text2text-generation';
      
      const chatCapableModels = manifest.models.filter(isChatCapable);
      console.log('[ModelPicker] chatOnly count:', chatCapableModels.length);
      
      if (!chatCapableModels.length) {
        throw new Error('No chat-capable models found');
      }
      
      const randomModel = chatCapableModels[Math.floor(Math.random() * chatCapableModels.length)];
      console.log('[ModelPicker] selected', randomModel.repo_id, randomModel.task, randomModel.name);
      setUiState(`Preparing ${randomModel.name}…`);

      // 1) Ask server to ensure it's downloaded/available
      console.log('Starting download for model:', randomModel.repo_id);
      const downloadResponse = await fetch(`/api/models/${encodeURIComponent(randomModel.repo_id)}/download`, { 
        method: 'POST' 
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.statusText}`);
      }

      // 2) Poll status until ready
      setUiState('Downloading model files…');
      let ready = false;
      for (let i = 0; i < 120; i++) { // up to ~2 minutes
        console.log(`Polling model status, attempt ${i + 1}`);
        const statusResponse = await fetch(`/api/models/${encodeURIComponent(randomModel.repo_id)}/status`);
        
        if (!statusResponse.ok) {
          console.warn('Status check failed:', statusResponse.statusText);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        
        const status = await statusResponse.json();
        console.log('Model status:', status);
        
        if (status.isAvailable) { 
          ready = true; 
          break; 
        }
        
        setUiState(`Downloading… ${status.isDownloading ? 'in progress' : 'queued'}`);
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!ready) {
        throw new Error('Model not ready in time');
      }

      // 3) Load into the worker
      setUiState('Loading into WebGPU…');
      console.log('Loading model into worker:', randomModel);
      await onLoadModel(randomModel);
      setUiState(`Ready: ${randomModel.name}`);
      
    } catch (error: any) {
      console.error('Failed to load random model:', error);
      setUiState(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCustom = async () => {
    if (!customRepo.trim()) return;
    
    setIsLoading(true);
    try {
      const model: HFModel = {
        repo_id: customRepo.trim(),
        task: "text-generation",
        name: customRepo.trim()
      };
      await onLoadModel(model);
      setCustomRepo("");
    } catch (error) {
      console.error('Failed to load custom model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Model Configuration</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-chart-1 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Hugging Face Transformers.js v3.7.1</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Model Selection</Label>
              <Button 
                onClick={handleLoadRandom}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-chart-1 to-blue-600 hover:from-chart-1/80 hover:to-blue-600/80"
              >
                {isLoading ? '⏳' : '🎲'} Load Random Model
              </Button>
              <div className="text-sm text-muted-foreground mt-2 min-h-[20px]">
                {uiState}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Custom Model Repository</Label>
              <div className="flex space-x-3">
                <Input
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  placeholder="e.g., Xenova/distilgpt2"
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  onClick={handleLoadCustom}
                  disabled={isLoading || !customRepo.trim()}
                  variant="secondary"
                >
                  Load
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Model Information</Label>
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                {currentModel ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repository:</span>
                      <span className="font-mono text-chart-1">{currentModel.repo_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Task:</span>
                      <span className="text-green-400">{currentModel.task}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-yellow-400">Ready</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No model loaded
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="accept-jobs"
                checked={acceptJobs}
                onCheckedChange={onAcceptJobsChange}
              />
              <Label htmlFor="accept-jobs" className="text-sm">
                Accept computation jobs from mesh peers
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
