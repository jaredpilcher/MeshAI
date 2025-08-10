import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const meshSessions = pgTable("mesh_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  peerId: text("peer_id").notNull(),
  room: text("room").notNull().default("global"),
  model: text("model"),
  acceptJobs: boolean("accept_jobs").default(false),
  connectedAt: timestamp("connected_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const inferenceJobs = pgTable("inference_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(),
  solverId: varchar("solver_id"),
  prompt: text("prompt").notNull(),
  response: text("response"),
  parameters: jsonb("parameters"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMeshSessionSchema = createInsertSchema(meshSessions).omit({
  id: true,
  connectedAt: true,
  lastSeen: true,
});

export const insertInferenceJobSchema = createInsertSchema(inferenceJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MeshSession = typeof meshSessions.$inferSelect;
export type InsertMeshSession = z.infer<typeof insertMeshSessionSchema>;
export type InferenceJob = typeof inferenceJobs.$inferSelect;
export type InsertInferenceJob = z.infer<typeof insertInferenceJobSchema>;

// Client-side types for transformers.js
export interface HFModel {
  repo_id: string;
  task: string;
  name: string;
}

export interface ModelManifest {
  models: HFModel[];
}

export interface InferenceParams {
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  source: 'user' | 'local' | 'mesh';
  sourceInfo?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface PeerInfo {
  id: string;
  model?: string;
  load: number;
  latency: number;
  acceptsJobs: boolean;
}

export interface NetworkStats {
  connectedPeers: number;
  jobsCompleted: number;
  jobsReceived: number;
  avgResponseTime: number;
}
