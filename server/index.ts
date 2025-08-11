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

// Setup Vite for frontend serving
if (process.env.NODE_ENV === "development") {
  await setupVite(app);
} else {
  serveStatic(app);
}

// Start clean API server with frontend
app.listen(PORT, () => {
  console.log(`🚀 Clean API server with frontend running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Version info: http://localhost:${PORT}/api/version`);
});