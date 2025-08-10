import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, InferenceParams } from "@shared/schema";

interface InferenceInterfaceProps {
  messages: ChatMessage[];
  onLocalInference: (prompt: string, params: InferenceParams) => Promise<void>;
  onMeshInference: (prompt: string, params: InferenceParams) => Promise<void>;
  isGenerating: boolean;
  canRunLocal: boolean;
  canRunMesh: boolean;
}

export function InferenceInterface({
  messages,
  onLocalInference,
  onMeshInference,
  isGenerating,
  canRunLocal,
  canRunMesh
}: InferenceInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState([128]);
  const [temperature, setTemperature] = useState([0.7]);
  const [topP, setTopP] = useState([0.9]);

  const handleLocalRun = async () => {
    if (!prompt.trim() || !canRunLocal) return;
    
    const params: InferenceParams = {
      max_new_tokens: maxTokens[0],
      temperature: temperature[0],
      top_p: topP[0]
    };

    await onLocalInference(prompt, params);
    setPrompt("");
  };

  const handleMeshRun = async () => {
    if (!prompt.trim() || !canRunMesh) return;
    
    const params: InferenceParams = {
      max_new_tokens: maxTokens[0],
      temperature: temperature[0],
      top_p: topP[0]
    };

    await onMeshInference(prompt, params);
    setPrompt("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Inference</CardTitle>
          <div className="flex items-center space-x-4">
            <select className="bg-secondary border border-border rounded-lg px-3 py-1 text-sm">
              <option>Local + Mesh</option>
              <option>Local Only</option>
              <option>Mesh Only</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="xl:col-span-3 space-y-4">
            {/* Chat History */}
            <ScrollArea className="bg-secondary rounded-xl p-4 h-96">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-2xl px-4 py-3 max-w-xs lg:max-w-md ${
                      message.source === 'user' 
                        ? 'bg-gradient-to-r from-chart-1 to-blue-600 text-white rounded-br-md'
                        : message.source === 'local'
                        ? 'bg-secondary text-foreground rounded-bl-md'
                        : 'bg-gradient-to-r from-purple-800 to-pink-800 text-white rounded-bl-md'
                    }`}>
                      {message.source !== 'user' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            message.source === 'local' ? 'bg-green-500' : 'bg-purple-400 animate-pulse'
                          }`}></div>
                          <span className="text-xs opacity-75">
                            {message.source === 'local' ? `Local (${message.sourceInfo})` : `Mesh (${message.sourceInfo})`}
                          </span>
                        </div>
                      )}
                      <p className={`text-sm ${message.isStreaming ? 'streaming-cursor' : ''}`}>
                        {message.content}
                      </p>
                      <span className="text-xs opacity-75 block mt-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="space-y-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask a question or start a conversation..."
                className="resize-none"
                rows={3}
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>⌨️ Shift + Enter for new line</span>
                  <span>{prompt.length}/1000 characters</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleLocalRun}
                    disabled={isGenerating || !canRunLocal || !prompt.trim()}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    🖥️ Run Local
                  </Button>
                  <Button
                    onClick={handleMeshRun}
                    disabled={isGenerating || !canRunMesh || !prompt.trim()}
                    className="bg-purple-600 hover:bg-purple-500"
                  >
                    🌐 Ask Mesh
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Parameter Controls */}
          <div className="space-y-4">
            <h3 className="font-medium">Generation Parameters</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Max New Tokens</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    min={1}
                    max={512}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8">{maxTokens[0]}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Temperature</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={0}
                    max={2}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8">{temperature[0].toFixed(1)}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Top-p</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={topP}
                    onValueChange={setTopP}
                    min={0}
                    max={1}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8">{topP[0].toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="font-medium mb-3">Performance</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens/sec:</span>
                  <span className="font-mono text-chart-1">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory:</span>
                  <span className="font-mono text-green-400">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency:</span>
                  <span className="font-mono text-yellow-400">--</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
