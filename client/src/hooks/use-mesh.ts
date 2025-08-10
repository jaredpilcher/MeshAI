import { useState, useEffect, useCallback } from 'react';
import { MeshClient } from '@/lib/mesh-client';
import type { NetworkStats, PeerInfo } from '@shared/schema';

interface UseMeshOptions {
  onLog?: (level: 'info' | 'warn' | 'error' | 'model' | 'mesh', message: string) => void;
  onJob?: (job: any) => void;
  onChunk?: (chunk: any) => void;
}

export function useMesh({ onLog, onJob, onChunk }: UseMeshOptions) {
  const [meshClient, setMeshClient] = useState<MeshClient | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [acceptJobs, setAcceptJobs] = useState(false);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    connectedPeers: 0,
    jobsCompleted: 0,
    jobsReceived: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    const client = new MeshClient({
      onLog,
      onJob,
      onChunk,
      onRoster: (peerIds) => {
        setPeerCount(peerIds.length);
        setNetworkStats(prev => ({ ...prev, connectedPeers: peerIds.length }));
        
        // Convert peer IDs to PeerInfo objects
        const peerInfos: PeerInfo[] = peerIds.map(id => ({
          id,
          model: 'Unknown',
          load: Math.floor(Math.random() * 100),
          latency: Math.floor(Math.random() * 300 + 50),
          acceptsJobs: true
        }));
        setPeers(peerInfos);
      }
    });

    setMeshClient(client);
    setIsConnected(client.isConnected());

    return () => {
      client.disconnect();
    };
  }, [onLog, onJob, onChunk]);

  const broadcastJob = useCallback((job: any) => {
    if (meshClient) {
      meshClient.broadcastJob(job);
      setNetworkStats(prev => ({ ...prev, jobsCompleted: prev.jobsCompleted + 1 }));
    }
  }, [meshClient]);

  const joinRoom = useCallback((room: string) => {
    if (meshClient) {
      meshClient.joinRoom(room);
      onLog?.('mesh', `Joined room: ${room}`);
    }
  }, [meshClient, onLog]);

  return {
    peerCount,
    isConnected,
    acceptJobs,
    setAcceptJobs,
    peers,
    networkStats,
    broadcastJob,
    joinRoom
  };
}
