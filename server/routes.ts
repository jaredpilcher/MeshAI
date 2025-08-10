import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Server as IOServer } from "socket.io";
import { storage } from "./storage";
import { insertMeshSessionSchema, type HFModel, type ModelManifest } from "@shared/schema";
import { z } from "zod";

// Curated models known to work with transformers.js
const CURATED_MODELS: HFModel[] = [
  { repo_id: "Xenova/tinyllama-1.1b-chat-v1.0", task: "text-generation", name: "TinyLlama 1.1B Chat" }
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
