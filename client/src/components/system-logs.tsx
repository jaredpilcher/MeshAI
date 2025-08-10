import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'model' | 'mesh';
  message: string;
}

interface SystemLogsProps {
  logs: LogEntry[];
}

export function SystemLogs({ logs }: SystemLogsProps) {
  const [logLevel, setLogLevel] = useState<string>("all");

  const filteredLogs = logs.filter(log => {
    if (logLevel === "all") return true;
    return log.level === logLevel;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-green-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'model': return 'text-chart-1';
      case 'mesh': return 'text-purple-400';
      default: return 'text-muted-foreground';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const clearLogs = () => {
    // This would need to be passed up to parent component
    console.log('Clear logs requested');
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${formatTime(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesh-nanollm-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>System Logs</CardTitle>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={clearLogs}
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
            <Button 
              onClick={exportLogs}
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Export
            </Button>
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="model">Model</SelectItem>
                <SelectItem value="mesh">Mesh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="bg-secondary rounded-xl p-4 h-64 font-mono text-sm">
          <div className="space-y-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-3 text-muted-foreground">
                  <span className="text-muted-foreground/70">[{formatTime(log.timestamp)}]</span>
                  <span className={getLevelColor(log.level)}>[{log.level.toUpperCase()}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No logs to display
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
