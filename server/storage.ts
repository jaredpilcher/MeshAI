import { type User, type InsertUser, type MeshSession, type InsertMeshSession, type InferenceJob, type InsertInferenceJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Mesh session management
  createMeshSession(session: InsertMeshSession): Promise<MeshSession>;
  getMeshSession(peerId: string): Promise<MeshSession | undefined>;
  updateMeshSession(peerId: string, updates: Partial<Omit<MeshSession, 'lastSeen'>>): Promise<MeshSession | undefined>;
  deleteMeshSession(peerId: string): Promise<void>;
  getActiveSessions(room?: string): Promise<MeshSession[]>;
  
  // Inference job management
  createInferenceJob(job: InsertInferenceJob): Promise<InferenceJob>;
  updateInferenceJob(id: string, updates: Partial<InferenceJob>): Promise<InferenceJob | undefined>;
  getInferenceJob(id: string): Promise<InferenceJob | undefined>;
  getJobsByRequester(requesterId: string): Promise<InferenceJob[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private meshSessions: Map<string, MeshSession>;
  private inferenceJobs: Map<string, InferenceJob>;

  constructor() {
    this.users = new Map();
    this.meshSessions = new Map();
    this.inferenceJobs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createMeshSession(session: InsertMeshSession): Promise<MeshSession> {
    const id = randomUUID();
    const now = new Date();
    const meshSession: MeshSession = {
      ...session,
      id,
      room: session.room || "global",
      connectedAt: now,
      lastSeen: now,
    };
    this.meshSessions.set(session.peerId, meshSession);
    return meshSession;
  }

  async getMeshSession(peerId: string): Promise<MeshSession | undefined> {
    return this.meshSessions.get(peerId);
  }

  async updateMeshSession(peerId: string, updates: Partial<Omit<MeshSession, 'lastSeen'>>): Promise<MeshSession | undefined> {
    const session = this.meshSessions.get(peerId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, lastSeen: new Date() };
    this.meshSessions.set(peerId, updatedSession);
    return updatedSession;
  }

  async deleteMeshSession(peerId: string): Promise<void> {
    this.meshSessions.delete(peerId);
  }

  async getActiveSessions(room = "global"): Promise<MeshSession[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Array.from(this.meshSessions.values()).filter(
      (session) => session.room === room && session.lastSeen && session.lastSeen > fiveMinutesAgo
    );
  }

  async createInferenceJob(job: InsertInferenceJob): Promise<InferenceJob> {
    const id = randomUUID();
    const inferenceJob: InferenceJob = {
      ...job,
      id,
      status: job.status || "pending",
      createdAt: new Date(),
      completedAt: null,
    };
    this.inferenceJobs.set(id, inferenceJob);
    return inferenceJob;
  }

  async updateInferenceJob(id: string, updates: Partial<InferenceJob>): Promise<InferenceJob | undefined> {
    const job = this.inferenceJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    if (updates.status === "completed" || updates.status === "failed") {
      updatedJob.completedAt = new Date();
    }
    this.inferenceJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getInferenceJob(id: string): Promise<InferenceJob | undefined> {
    return this.inferenceJobs.get(id);
  }

  async getJobsByRequester(requesterId: string): Promise<InferenceJob[]> {
    return Array.from(this.inferenceJobs.values()).filter(
      (job) => job.requesterId === requesterId
    );
  }
}

export const storage = new MemStorage();
