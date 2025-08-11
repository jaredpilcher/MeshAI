# Mesh NanoLLM - Distributed AI Inference

A cutting-edge browser-based distributed AI inference platform that enables real-time, client-side machine learning through WebRTC and transformers.js, with advanced error handling and robust model management.

## Getting Started (10 minutes)

### Prerequisites
- Node.js v20.x (or v22.x)
- npm installed

### Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment** (optional for basic testing)
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env to add API keys if testing real providers
   ```

3. **Start both client and server**
   ```bash
   npm run dev
   ```
   
   This will start:
   - **Client** on `http://localhost:5173` (frontend)
   - **Server** on `http://localhost:8787` (API backend)

4. **Test the setup**
   
   Health check:
   ```bash
   curl http://localhost:8787/api/health
   # Expected: {"ok":true}
   ```
   
   Test chat API:
   ```bash
   curl -X POST http://localhost:8787/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"messages":[{"role":"user","content":"ping"}],"provider":"stub"}'
   # Expected: {"content":"Stub reply: ping"}
   ```

5. **Open the app**
   
   Visit `http://localhost:5173` in your browser. Try the Chat Demo page to see the clean architecture in action.

## API Providers

The system supports multiple AI providers:

- **stub**: Local echo for development (no API key needed)
- **openai**: OpenAI GPT models (requires `OPENAI_API_KEY`)
- **openrouter**: OpenRouter API (requires `OPENROUTER_API_KEY`) 
- **hf**: Hugging Face Inference API (requires `HF_TOKEN`)

Add API keys to `server/.env` to test real providers:

```env
PORT=8787
OPENAI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
HF_TOKEN=your_token_here
```

## Project Structure

```
├── client/          # React frontend with Vite
├── server/          # Express API backend
├── shared/          # Shared TypeScript types
├── package.json     # Root workspace configuration
└── README.md       # This file
```

## Key Components

- **WebRTC mesh networking** for decentralized computing
- **Browser-based AI model inference** with comprehensive error detection
- **Dynamic model loading** with advanced network management
- **WebGPU accelerated machine learning**
- **Sophisticated model proxy and download system**

## Development

### Type checking
```bash
npm run typecheck
```

### Building for production
```bash
npm run build
```

### Starting production server
```bash
npm start
```

## Architecture

This is a clean, pluggable monorepo setup with:
- **Clean server architecture** with multiple AI provider support
- **Proper TypeScript project structure** with shared types
- **Working chat interface** demonstrating the architecture
- **Backward compatibility** with existing model infrastructure

The system is designed to be modular and extensible, with a focus on clean separation of concerns and maintainable code.