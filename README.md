# Mesh NanoLLM

A distributed AI inference application with clean, pluggable architecture supporting multiple AI providers and WebRTC mesh networking.

## Getting Started

### Quick Setup (30 seconds)

```bash
# Install dependencies
npm install

# Start both client and server
npm run dev
```

Expected output:
- Client starts on http://localhost:5173
- Server starts on http://localhost:8787

### Test the Setup

1. **Health check**: `curl http://localhost:8787/api/health`
   - Expected: `{"ok":true}`

2. **Chat API**: 
   ```bash
   curl -X POST http://localhost:8787/api/chat \
   -H 'Content-Type: application/json' \
   -d '{"messages":[{"role":"user","content":"ping"}],"provider":"stub"}'
   ```
   - Expected: `{"content":"Stub reply: ping"}`

3. **UI Test**: Open http://localhost:5173/chat and send a message
   - Should show both user message and AI stub response

### API Providers

Copy `server/.env.example` to `server/.env` and add your API keys:

```bash
PORT=8787
OPENAI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here  
HF_TOKEN=your_token_here
```

### Architecture

```
├── client/          # React frontend (Vite, TailwindCSS)
├── server/          # Express API server  
├── shared/          # Shared TypeScript types
└── README.md        # This file
```

### Build for Production

```bash
npm run build
npm start
```

The client builds to static files, serve behind a reverse proxy routing `/api/*` to the server process.