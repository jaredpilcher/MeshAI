import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NetworkStats, PeerInfo } from "@shared/schema";

interface MeshNetworkProps {
  networkStats: NetworkStats;
  peers: PeerInfo[];
  isConnected: boolean;
}

export function MeshNetwork({ networkStats, peers, isConnected }: MeshNetworkProps) {
  const [roomId, setRoomId] = useState("");

  const handleJoinRoom = () => {
    // Room joining logic would be implemented here
    console.log('Joining room:', roomId || 'global');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mesh Network</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'WebRTC Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Network Statistics */}
          <div className="space-y-4">
            <h3 className="font-medium">Network Statistics</h3>
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connected Peers:</span>
                <span className="font-mono text-chart-1">{networkStats.connectedPeers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jobs Completed:</span>
                <span className="font-mono text-green-400">{networkStats.jobsCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jobs Received:</span>
                <span className="font-mono text-purple-400">{networkStats.jobsReceived}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Response Time:</span>
                <span className="font-mono text-yellow-400">{networkStats.avgResponseTime.toFixed(1)}s</span>
              </div>
            </div>
          </div>
          
          {/* Active Peers */}
          <div className="space-y-4">
            <h3 className="font-medium">Active Peers</h3>
            <ScrollArea className="bg-secondary rounded-xl p-4 h-48">
              <div className="space-y-3">
                {peers.length > 0 ? (
                  peers.map((peer) => (
                    <div key={peer.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          peer.load < 50 ? 'bg-green-500' : peer.load < 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-mono text-sm">#{peer.id.slice(0, 6)}</div>
                          <div className="text-xs text-muted-foreground">{peer.model || 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Load: {peer.load}%</div>
                        <div className="text-xs text-muted-foreground">{peer.latency}ms</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No peers connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Network Actions */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleJoinRoom}
                variant="secondary"
              >
                📡 Join Room
              </Button>
              <Input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Room ID (default: global)"
                className="w-48 text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>🔒 P2P Encrypted</span>
              <span>•</span>
              <span>⚡ WebRTC</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
