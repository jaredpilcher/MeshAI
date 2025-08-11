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

// Model download and status endpoints
app.post('/api/models/:modelId/download', async (req, res) => {
  const { modelId } = req.params;
  console.log('Download request for model:', modelId);
  
  try {
    // For now, simulate immediate availability for TinyLlama and other models
    // In a real implementation, this would trigger actual model downloading
    console.log(`Initiating download for model: ${modelId}`);
    res.json({ 
      success: true, 
      message: `Download initiated for ${modelId}`,
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

// Serve model files (for transformers.js local mode)
app.get('/models/*', async (req, res) => {
  const modelPath = req.path.replace('/models/', '');
  console.log('Model file request:', modelPath);
  
  try {
    // For browser transformers.js, models are served from HuggingFace CDN
    // This endpoint acknowledges the request but redirects to CDN
    res.redirect(`https://huggingface.co/${modelPath.split('/').slice(0, 2).join('/')}/resolve/main/${modelPath.split('/').slice(2).join('/')}`);
  } catch (e: any) {
    console.error('Model file serve error:', e);
    res.status(404).json({ error: 'Model file not found' });
  }
});

// Start clean API server with frontend
const server = app.listen(PORT, () => {
  console.log(`🚀 Clean API server with frontend running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Version info: http://localhost:${PORT}/api/version`);
});

// Setup Vite for frontend serving after server creation
if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}