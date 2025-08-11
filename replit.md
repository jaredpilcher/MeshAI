# Overview

Mesh NanoLLM is a distributed AI inference application that enables browser-based machine learning using transformers.js with WebRTC mesh networking for peer-to-peer computation. The system features a clean architectural foundation with multiple AI provider support and robust model serving capabilities.

# Recent Changes (January 11, 2025)

**Complete Architectural Overhaul Implemented**
- Created clean, pluggable API server with multiple AI provider support (OpenAI, OpenRouter, Hugging Face, local stub)
- Implemented proper TypeScript project structure with shared types and references
- Added basic chat interface demonstrating the new architecture
- Fixed server TypeScript issues and improved error handling
- Maintained backward compatibility with existing model serving infrastructure

**Bulletproof Monorepo Setup Completed (Latest)**
- Built clean API-only server in `server/index.ts` running on port 5000 with Vite integration
- All verification checklist items working: health check, version info, chat stub API
- Added missing `.env.example` file for API key configuration
- Created comprehensive README with quickstart instructions
- Client configured to use relative API paths for seamless integration
- TypeScript project references properly configured for monorepo structure

**Model Loading Workflow Fixed (January 11, 2025)**
- Implemented complete model download/poll/load workflow as requested
- Added missing `/api/manifest` endpoint with curated lightweight models
- Added `/api/models/:id/download` and `/api/models/:id/status` endpoints
- Fixed "Get Random Model" button with real-time progress feedback
- Configured transformers.js for browser-based AI inference with server proxy
- UI now shows clear status progression: Fetching → Preparing → Downloading → Loading → Ready

# User Preferences

Preferred communication style: Simple, everyday language.
Architecture preference: Clean, minimal, pluggable design with proper separation of concerns.

# System Architecture

## Clean Server Architecture (New)
- **Core Server**: Minimal Express.js server on port 8787 with CORS and proper error handling
- **Pluggable AI Providers**: Support for OpenAI, OpenRouter, Hugging Face, and local stub responses
- **API Design**: RESTful endpoints (`/api/chat`, `/api/health`) with Zod validation
- **Model Serving**: Enhanced model proxy system for browser-based AI with proper fallbacks

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for dark theme
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **AI Processing**: Hugging Face transformers.js running in Web Workers for non-blocking inference

## Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Real-time Communication**: Socket.IO for signaling server functionality
- **WebRTC Coordination**: Acts as signaling server for browser-to-browser mesh networking
- **API Design**: RESTful endpoints for model manifests, health checks, and mesh session management
- **Development Setup**: Hot reload with Vite integration in development mode

## TypeScript Architecture
- **Shared Types**: Centralized API types in `shared/api-types.ts` with proper project references
- **Client Types**: Comprehensive TypeScript configuration with path aliases
- **Server Types**: Strict typing with Zod validation for API endpoints
- **Project Structure**: Proper monorepo-style organization with client/server/shared separation

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless driver for cloud database connectivity
- **Schema**: Tables for users, mesh sessions, and inference jobs with proper relationships
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **In-Memory Fallback**: Memory storage implementation for development/testing

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL storage
- **User System**: Basic username/password authentication with hashed passwords
- **Peer Identification**: UUID-based peer identification for mesh network participants
- **Room-based Access**: Global and custom room support for network segmentation

## External Dependencies

### AI and Machine Learning
- **Hugging Face Transformers**: Browser-based model execution with transformers.js
- **Model Repository**: Curated set of lightweight models optimized for browser inference
- **Acceleration**: WebGPU for hardware acceleration with WASM/CPU fallback

### Real-time Communication
- **WebRTC**: Peer-to-peer communication for distributed inference
- **STUN Servers**: Google STUN servers for NAT traversal
- **Socket.IO**: WebSocket-based signaling for mesh coordination

### Database and Cloud Services
- **Neon Database**: Serverless PostgreSQL for production deployment
- **Drizzle Kit**: Database migrations and schema management
- **Environment Configuration**: DATABASE_URL for database connection management

### Development and Build Tools
- **Vite**: Frontend build tool with HMR and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production deployment
- **Replit Integration**: Development environment plugins and deployment support

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter and JetBrains Mono for typography