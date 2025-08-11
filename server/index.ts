import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { z } from 'zod';
import { setupVite, serveStatic } from './vite';

const app = express();
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

const PORT = Number(process.env.PORT || 8787);

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Version endpoint for deploy verification
app.get('/api/version', (_req, res) => res.json({ 
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  providers: ['openai', 'openrouter', 'hf', 'stub']
}));

// Simple chat endpoint with pluggable providers
const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['system','user','assistant']), content: z.string() })),
  provider: z.enum(['openai', 'openrouter', 'hf', 'stub']).default('stub'),
  model: z.string().optional()
});

app.post('/api/chat', async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { messages, provider, model } = parsed.data;

  try {
    if (provider === 'stub') {
      // Deterministic local echo for dev
      const last = messages.filter(m => m.role === 'user').pop()?.content ?? '';
      return res.json({ content: `Stub reply: ${last.slice(0, 120)}` });
    }

    if (provider === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages
        })
      });
      const json = await resp.json() as any;
      return res.json({ content: json.choices?.[0]?.message?.content ?? '' });
    }

    if (provider === 'openrouter') {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/jaredpilcher/MeshAI',
          'X-Title': 'MeshAI'
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-4o-mini',
          messages
        })
      });
      const json = await resp.json() as any;
      return res.json({ content: json.choices?.[0]?.message?.content ?? '' });
    }

    if (provider === 'hf') {
      // Works with HF Inference API for small instruct models
      const m = model || 'mistralai/Mistral-7B-Instruct-v0.2';
      const resp = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: messages.map(m => `${m.role}: ${m.content}`).join('\n') })
      });
      const json = await resp.json() as any;
      const text = Array.isArray(json) ? (json[0]?.generated_text ?? '') : (json.generated_text ?? JSON.stringify(json));
      return res.json({ content: text });
    }

    return res.status(400).json({ error: 'Unknown provider' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
});

// Chat-only model allowlist - ONLY instruction/chat-tuned models (removing base models)
const CURATED_CHAT_MODELS = [
  { repo_id: "Xenova/tinyllama-1.1b-chat-v1.0", task: "text-generation", name: "TinyLlama 1.1B Chat", description: "Instruction-tuned chat model", size: "~1.1GB" },
  { repo_id: "Xenova/DialoGPT-medium", task: "text-generation", name: "DialoGPT Medium", description: "Conversational chat model", size: "~1.2GB" },
  { repo_id: "Xenova/DialoGPT-small", task: "text-generation", name: "DialoGPT Small", description: "Lightweight conversational model", size: "~500MB" }
];

const CHAT_MODEL_ALLOWLIST = new Set(CURATED_CHAT_MODELS.map(m => m.repo_id));

// Model manifest endpoint - returns only chat-capable models
app.get('/api/manifest', async (_req, res) => {
  console.log('Manifest request received');
  
  try {
    console.log(`[Manifest] Returning ${CURATED_CHAT_MODELS.length} chat-only models`);
    res.json({ models: CURATED_CHAT_MODELS });
  } catch (e: any) {
    console.error('Manifest error:', e);
    res.status(500).json({ error: e?.message ?? 'Failed to load manifest' });
  }
});

// Model download - strictly enforces chat-only allowlist
app.post('/api/models/:modelId/download', async (req, res) => {
  const { modelId } = req.params;
  console.log('Download request for model:', modelId);
  
  try {
    // Enforce chat-only policy - reject non-allowlisted models
    if (!CHAT_MODEL_ALLOWLIST.has(modelId)) {
      console.log(`❌ Model ${modelId} rejected - not in chat-only allowlist`);
      return res.status(403).json({ 
        error: "Model not allowed (chat-only policy)",
        allowedModels: Array.from(CHAT_MODEL_ALLOWLIST)
      });
    }
    
    console.log(`✅ Model ${modelId} approved for download`);
    console.log(`Initiating download for chat model: ${modelId}`);
    res.json({ 
      success: true, 
      message: `Download initiated for chat model ${modelId}`,
      modelId 
    });
  } catch (e: any) {
    console.error('Download error:', e);
    res.status(500).json({ error: e?.message ?? 'Download failed' });
  }
});

app.get('/api/models/:modelId/status', async (req, res) => {
  const { modelId } = req.params;
  console.log('Status check for model:', modelId);
  
  try {
    // For browser-based models, they're available immediately after download request
    // In a real implementation, this would check actual download progress
    const isAvailable = true; // Browser models are served from CDN
    const isDownloading = false;
    
    console.log(`Model ${modelId} status: available=${isAvailable}, downloading=${isDownloading}`);
    
    res.json({
      modelId,
      isAvailable,
      isDownloading,
      progress: isAvailable ? 100 : 0,
      message: isAvailable ? 'Model ready for loading' : 'Preparing model...'
    });
  } catch (e: any) {
    console.error('Status check error:', e);
    res.status(500).json({ error: e?.message ?? 'Status check failed' });
  }
});

// Serve model files (for transformers.js local mode) - proxy instead of redirect
app.get('/models/*', async (req, res) => {
  const modelPath = req.path.replace('/models/', '');
  console.log('Model file request:', modelPath);
  
  try {
    // Build HuggingFace URL
    const pathParts = modelPath.split('/');
    const repoId = pathParts.slice(0, 2).join('/');
    const filePath = pathParts.slice(2).join('/');
    const hfUrl = `https://huggingface.co/${repoId}/resolve/main/${filePath}`;
    
    console.log(`Proxying model file: ${hfUrl}`);
    
    // Fetch from HuggingFace and stream directly to client
    const response = await fetch(hfUrl);
    
    if (!response.ok) {
      console.error(`HF fetch failed: ${response.status} ${response.statusText}`);
      return res.status(404).json({ error: 'Model file not found' });
    }
    
    // Copy headers from HuggingFace response
    response.headers.forEach((value, key) => {
      if (['content-type', 'content-length', 'cache-control', 'etag'].includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });
    
    // Stream the response body using Node.js streams
    if (response.body) {
      // Convert Web ReadableStream to Node.js readable
      const nodeReader = response.body as any;
      nodeReader.pipe(res);
    } else {
      res.end();
    }
    
  } catch (e: any) {
    console.error('Model file serve error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Model file serve error' });
    }
  }
});

// Setup Vite for frontend serving BEFORE starting server
if (process.env.NODE_ENV === "development") {
  const server = await new Promise<any>((resolve) => {
    const httpServer = app.listen(PORT, () => {
      console.log(`🚀 Clean API server with frontend running on port ${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Version info: http://localhost:${PORT}/api/version`);
      resolve(httpServer);
    });
  });
  
  await setupVite(app, server);
} else {
  serveStatic(app);
  app.listen(PORT, () => {
    console.log(`🚀 Clean API server with frontend running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Version info: http://localhost:${PORT}/api/version`);
  });
}