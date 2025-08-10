import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Server as IOServer } from "socket.io";
import { storage } from "./storage";
import { insertMeshSessionSchema, type HFModel, type ModelManifest } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { modelDownloader } from "./modelDownloader";

// Curated models known to work with transformers.js
const CURATED_MODELS: HFModel[] = [
  { repo_id: "Xenova/tinyllama-1.1b-chat-v1.0", task: "text-generation", name: "TinyLlama 1.1B Chat" }
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const objectStorageService = new ObjectStorageService();

  // Add comprehensive request logging for debugging model file loading
  app.use((req, res, next) => {
    // Log ALL requests to debug what's happening
    if (!req.originalUrl.startsWith("/api/ice") && !req.originalUrl.includes("vite") && !req.originalUrl.includes("@")) {
      console.log(`🌐 REQUEST: ${req.method} ${req.originalUrl}`);
      if (req.originalUrl.startsWith("/models")) {
        console.log(`  Headers:`, Object.keys(req.headers).map(k => `${k}: ${req.headers[k]}`).join(', '));
        console.log(`  User-Agent:`, req.headers['user-agent']?.substring(0, 50) + '...');
      }
    }
    next();
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Model manifest endpoint
  app.get("/api/manifest", async (_req, res) => {
    try {
      // Randomize order
      const models = [...CURATED_MODELS].sort(() => Math.random() - 0.5);
      const manifest: ModelManifest = { models };
      res.json(manifest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch model manifest" });
    }
  });

  // ICE servers for WebRTC
  app.get("/api/ice", (_req, res) => {
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    res.json({ iceServers });
  });

  // Mesh session management
  app.post("/api/mesh/sessions", async (req, res) => {
    try {
      const sessionData = insertMeshSessionSchema.parse(req.body);
      const session = await storage.createMeshSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create mesh session" });
      }
    }
  });

  app.get("/api/mesh/sessions/:room", async (req, res) => {
    try {
      const room = req.params.room || "global";
      const sessions = await storage.getActiveSessions(room);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Model serving routes - serve models from our storage to bypass network restrictions
  app.get("/models/*", async (req, res) => {
    try {
      // Extract full path after /models/ 
      const fullPath = (req.params as any)[0]; // Everything after /models/
      
      console.log(`🔄 Serving model file from path: ${fullPath}`);
      console.log(`📂 Full URL: ${req.originalUrl}`);
      console.log(`📋 Accept header: ${req.headers.accept}`);
      
      // Find the file in our model storage
      const file = await objectStorageService.searchModelFile(`models/${fullPath}`);
      if (!file) {
        console.log(`❌ File not found: models/${fullPath}`);
        return res.status(404).json({ error: "Model file not found" });
      }
      
      console.log(`✅ File found, serving: ${file.name}`);
      
      // Add additional debugging for response
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(data) {
        console.log(`📤 Sending response for ${fullPath}: ${typeof data} (${data?.length || 'unknown'} bytes)`);
        return originalSend.call(this, data);
      };
      
      res.json = function(data) {
        console.log(`📤 Sending JSON response for ${fullPath}:`, data);
        return originalJson.call(this, data);
      };
      
      await objectStorageService.downloadFile(file, res);
    } catch (error) {
      console.error("❌ Error serving model file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Model file not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Download model to our storage
  app.post("/api/models/:modelId/download", async (req, res) => {
    try {
      const modelId = req.params.modelId;
      console.log(`Starting download for model: ${modelId}`);
      
      // Check if model is already available
      if (await modelDownloader.isModelAvailable(modelId)) {
        return res.json({ 
          status: "already_available", 
          message: "Model is already downloaded and ready" 
        });
      }
      
      // Start download (async)
      modelDownloader.downloadModel(modelId).catch(err => {
        console.error(`Background download failed for ${modelId}:`, err);
      });
      
      res.json({ 
        status: "downloading", 
        message: "Model download started" 
      });
    } catch (error) {
      console.error("Error starting model download:", error);
      res.status(500).json({ error: "Failed to start model download" });
    }
  });

  // Check model download status
  app.get("/api/models/:modelId/status", async (req, res) => {
    try {
      const modelId = req.params.modelId;
      const isAvailable = await modelDownloader.isModelAvailable(modelId);
      const progress = modelDownloader.getDownloadProgress(modelId);
      
      res.json({
        modelId,
        isAvailable,
        isDownloading: progress.isDownloading,
        status: isAvailable ? "ready" : progress.isDownloading ? "downloading" : "not_downloaded"
      });
    } catch (error) {
      console.error("Error checking model status:", error);
      res.status(500).json({ error: "Failed to check model status" });
    }
  });

  // Model files listing endpoint for debugging
  app.get("/api/models/:modelId/files", async (req, res) => {
    try {
      const modelId = req.params.modelId;
      console.log(`📁 Listing files for model: ${modelId}`);
      
      const files = await objectStorageService.listModelFiles(`models/${modelId}`);
      console.log(`📁 Found files:`, files.map(f => f.name));
      
      res.json({ 
        modelId, 
        files: files.map(f => ({
          name: f.name.split('/').pop(),
          path: f.name,
          size: f.metadata?.size || 0
        }))
      });
    } catch (error) {
      console.error("Error listing model files:", error);
      res.status(500).json({ error: "Failed to list model files" });
    }
  });

  // Socket.IO setup for WebRTC signaling
  const io = new IOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/socket.io/"
  });

  // Track rooms and peers
  const rooms = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    let currentRoom = "global";
    let peerId = socket.id;

    const joinRoom = (room: string) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        const roomPeers = rooms.get(currentRoom);
        if (roomPeers) {
          roomPeers.delete(peerId);
          if (roomPeers.size === 0) {
            rooms.delete(currentRoom);
          }
        }
      }

      currentRoom = room;
      socket.join(room);
      
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room)!.add(peerId);

      // Notify room about roster update
      const peers = Array.from(rooms.get(room) || []);
      io.to(room).emit("roster", peers);
    };

    // Join default room
    joinRoom("global");

    // Handle room changes
    socket.on("join", ({ room }) => {
      joinRoom(room || "global");
    });

    // WebRTC signaling
    socket.on("signal", ({ to, data }) => {
      io.to(to).emit("signal", { from: socket.id, data });
    });

    // Job broadcasting for mesh inference
    socket.on("job", ({ id, prompt, params }) => {
      socket.to(currentRoom).emit("job", { 
        id, 
        from: socket.id, 
        prompt, 
        params 
      });
    });

    // Stream chunks back to requester
    socket.on("chunk", ({ id, to, text, done }) => {
      io.to(to).emit("chunk", { 
        id, 
        from: socket.id, 
        text, 
        done: !!done 
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      if (currentRoom) {
        const roomPeers = rooms.get(currentRoom);
        if (roomPeers) {
          roomPeers.delete(peerId);
          if (roomPeers.size === 0) {
            rooms.delete(currentRoom);
          } else {
            const peers = Array.from(roomPeers);
            io.to(currentRoom).emit("roster", peers);
          }
        }
      }
    });
  });

  return httpServer;
}
