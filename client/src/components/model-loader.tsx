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

  const handleLoadRandom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/manifest');
      const manifest = await response.json();
      const randomModel = manifest.models[Math.floor(Math.random() * manifest.models.length)];
      await onLoadModel(randomModel);
    } catch (error) {
      console.error('Failed to load random model:', error);
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
                🎲 Load Random Model
              </Button>
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
