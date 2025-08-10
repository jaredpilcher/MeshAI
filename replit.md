# Overview

Mesh NanoLLM is a distributed AI inference application that enables browser-based machine learning using transformers.js with WebRTC mesh networking for peer-to-peer computation. The system allows users to run AI models locally in their browser with WebGPU acceleration (fallback to WASM/CPU) and participate in a distributed mesh network where peers can share computational tasks. Users can either run inference locally or broadcast jobs to the mesh network for collaborative processing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

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