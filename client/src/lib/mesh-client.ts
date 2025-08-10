import { io, Socket } from 'socket.io-client';

interface MeshJob {
  id: string;
  prompt: string;
  params: any;
  messageId?: string;
}

interface MeshChunk {
  id: string;
  from: string;
  text: string;
  done: boolean;
  messageId?: string;
}

interface MeshClientOptions {
  onJob?: (job: MeshJob) => void;
  onChunk?: (chunk: MeshChunk) => void;
  onRoster?: (peers: string[]) => void;
  onLog?: (level: 'info' | 'warn' | 'error' | 'model' | 'mesh', message: string) => void;
}

export class MeshClient {
  private socket: Socket | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private iceServers: RTCIceServer[] = [];
  private room = 'global';

  constructor(private options: MeshClientOptions = {}) {
    this.initSocket();
    this.loadIceServers();
  }

  private async loadIceServers() {
    try {
      const response = await fetch('/api/ice');
      const data = await response.json();
      this.iceServers = data.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    } catch (error) {
      this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      this.options.onLog?.('warn', 'Failed to load ICE servers, using default');
    }
  }

  private initSocket() {
    this.socket = io('/', {
      path: '/socket.io/',
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.options.onLog?.('mesh', 'Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      this.options.onLog?.('mesh', 'Disconnected from signaling server');
      this.cleanup();
    });

    this.socket.on('roster', (peers: string[]) => {
      this.options.onRoster?.(peers.filter(id => id !== this.socket?.id));
      this.updatePeerConnections(peers);
    });

    this.socket.on('signal', ({ from, data }) => {
      this.handleSignal(from, data);
    });

    this.socket.on('job', (job: MeshJob) => {
      this.options.onJob?.(job);
    });

    this.socket.on('chunk', (chunk: MeshChunk) => {
      this.options.onChunk?.(chunk);
    });
  }

  private async updatePeerConnections(peerIds: string[]) {
    const myId = this.socket?.id;
    const targetPeers = new Set(peerIds.filter(id => id !== myId));
    
    // Remove old peers
    for (const [peerId, pc] of Array.from(this.peers.entries())) {
      if (!targetPeers.has(peerId)) {
        pc.close();
        this.peers.delete(peerId);
        this.dataChannels.delete(peerId);
      }
    }

    // Add new peers
    for (const peerId of Array.from(targetPeers)) {
      if (!this.peers.has(peerId)) {
        await this.createPeerConnection(peerId, true);
      }
    }
  }

  private async createPeerConnection(peerId: string, initiator: boolean) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('signal', {
          to: peerId,
          data: { candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peers.delete(peerId);
        this.dataChannels.delete(peerId);
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    if (initiator) {
      const dc = pc.createDataChannel('mesh');
      this.setupDataChannel(peerId, dc);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket?.emit('signal', {
        to: peerId,
        data: offer
      });
    }
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      this.options.onLog?.('mesh', `Data channel opened with peer ${peerId.slice(0, 6)}`);
    };

    dc.onclose = () => {
      this.options.onLog?.('mesh', `Data channel closed with peer ${peerId.slice(0, 6)}`);
      this.dataChannels.delete(peerId);
    };

    dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'job') {
          this.options.onJob?.(message.payload);
        } else if (message.type === 'chunk') {
          this.options.onChunk?.(message.payload);
        }
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };
  }

  private async handleSignal(from: string, data: any) {
    let pc = this.peers.get(from);
    
    if (!pc) {
      await this.createPeerConnection(from, false);
      pc = this.peers.get(from);
    }
    
    if (!pc) return;

    if (data.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket?.emit('signal', {
        to: from,
        data: answer
      });
    } else if (data.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data));
    } else if (data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  broadcastJob(job: MeshJob) {
    // Broadcast via socket.io to room
    this.socket?.emit('job', job);
    
    // Also send via data channels for redundancy
    const message = JSON.stringify({ type: 'job', payload: job });
    for (const [peerId, dc] of Array.from(this.dataChannels.entries())) {
      if (dc.readyState === 'open') {
        dc.send(message);
      }
    }
  }

  sendChunk(peerId: string, chunk: MeshChunk) {
    // Send via socket.io
    this.socket?.emit('chunk', { ...chunk, to: peerId });
    
    // Also send via data channel if available
    const dc = this.dataChannels.get(peerId);
    if (dc && dc.readyState === 'open') {
      const message = JSON.stringify({ type: 'chunk', payload: chunk });
      dc.send(message);
    }
  }

  joinRoom(room: string) {
    this.room = room;
    this.socket?.emit('join', { room });
  }

  getPeerCount(): number {
    return this.dataChannels.size;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private cleanup() {
    for (const pc of Array.from(this.peers.values())) {
      pc.close();
    }
    this.peers.clear();
    this.dataChannels.clear();
  }

  disconnect() {
    this.cleanup();
    this.socket?.disconnect();
  }
}
