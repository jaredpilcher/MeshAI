import { useState, useEffect } from "react";
import { ModelLoader } from "@/components/model-loader";
import { InferenceInterface } from "@/components/inference-interface";
import { MeshNetwork } from "@/components/mesh-network";
import { SystemLogs } from "@/components/system-logs";
import { useMesh } from "@/hooks/use-mesh";
import { useTransformers } from "@/hooks/use-transformers";
// Network debugging removed - focusing only on real model downloading
import type { ChatMessage } from "@shared/schema";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'model' | 'mesh';
    message: string;
  }>>([]);

  const addLog = (level: 'info' | 'warn' | 'error' | 'model' | 'mesh', message: string) => {
    setLogs(prev => [...prev, { timestamp: new Date(), level, message }]);
  };

  const {
    acceleratorStatus,
    currentModel,
    modelStatus,
    loadModel,
    generateText,
    isGenerating
  } = useTransformers({
    onLog: addLog,
    onToken: (token: string, messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: msg.content + token }
          : msg
      ));
    },
    onGenerationComplete: (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));
    }
  });

  const {
    peerCount,
    networkStats,
    peers,
    isConnected,
    broadcastJob,
    acceptJobs,
    setAcceptJobs
  } = useMesh({
    onLog: addLog,
    onJob: async (job) => {
      if (acceptJobs && currentModel) {
        addLog('mesh', `Received job ${job.id} from peer`);
        // Handle job processing would go here
      }
    },
    onChunk: (chunk) => {
      // Handle incoming chunks from mesh peers
      const { messageId, text } = chunk;
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: msg.content + text }
          : msg
      ));
    }
  });

  const addMessage = (content: string, source: ChatMessage['source'], sourceInfo?: string): string => {
    const id = crypto.randomUUID();
    const message: ChatMessage = {
      id,
      content,
      source,
      sourceInfo,
      timestamp: new Date(),
      isStreaming: source !== 'user'
    };
    setMessages(prev => [...prev, message]);
    return id;
  };

  const handleLocalInference = async (prompt: string, params: any) => {
    addMessage(prompt, 'user');
    
    if (!currentModel) {
      addLog('error', 'No model loaded for local inference');
      return;
    }

    const messageId = addMessage('', 'local', currentModel.name);
    await generateText(prompt, params, messageId);
  };

  const handleMeshInference = async (prompt: string, params: any) => {
    addMessage(prompt, 'user');
    
    if (peerCount === 0) {
      addLog('warn', 'No peers available for mesh inference');
      return;
    }

    const messageId = addMessage('', 'mesh', `${peerCount} peers`);
    const jobId = crypto.randomUUID();
    
    broadcastJob({
      id: jobId,
      prompt,
      params,
      messageId
    });
  };

  useEffect(() => {
    addLog('info', 'Mesh NanoLLM initialized');
    addLog('info', `Accelerator: ${acceleratorStatus}`);
  }, [acceleratorStatus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-animated rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  🧠
                </div>
                <div>
                  <h1 className="text-xl font-bold">Mesh NanoLLM</h1>
                  <p className="text-xs text-muted-foreground">Distributed AI Inference</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="status-indicator text-chart-1">
                <span className="font-mono">{acceleratorStatus}</span>
              </div>
              
              <div className="status-indicator text-green-400">
                <span className="font-mono">Model: {modelStatus}</span>
              </div>
              
              <div className="status-indicator text-yellow-400">
                <span className="font-mono">Peers: {peerCount}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-muted-foreground">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        <ModelLoader
          currentModel={currentModel}
          onLoadModel={loadModel}
          acceptJobs={acceptJobs}
          onAcceptJobsChange={setAcceptJobs}
        />

        <InferenceInterface
          messages={messages}
          onLocalInference={handleLocalInference}
          onMeshInference={handleMeshInference}
          isGenerating={isGenerating}
          canRunLocal={!!currentModel}
          canRunMesh={peerCount > 0}
        />

        <MeshNetwork
          networkStats={networkStats}
          peers={peers}
          isConnected={isConnected}
        />

        <SystemLogs logs={logs} />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-card py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>🤗 Powered by Transformers.js v3.7.1</span>
              <span>•</span>
              <span>⚡ WebGPU + WASM</span>
              <span>•</span>
              <span>🔒 Privacy-First AI</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <a href="https://huggingface.co/docs/transformers.js" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="https://github.com/huggingface/transformers.js" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
