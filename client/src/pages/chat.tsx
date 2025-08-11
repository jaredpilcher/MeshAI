// Basic chat interface as recommended in the feedback
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendChat } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ChatMessage } from '@shared/api-types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are a helpful AI assistant.' }
  ]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<'stub' | 'openai' | 'openrouter' | 'hf'>('stub');

  const chatMutation = useMutation({
    mutationFn: sendChat,
    onSuccess: (response) => {
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    chatMutation.mutate({
      messages: newMessages,
      provider
    });
  };

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>AI Chat - Clean Architecture Demo</CardTitle>
          <div className="flex gap-2">
            <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stub">Stub (Local)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="hf">Hugging Face</SelectItem>
              </SelectContent>
            </Select>
            {provider !== 'stub' && (
              <span className="text-sm text-muted-foreground py-2">
                API key required in server .env
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-96 overflow-y-auto space-y-2 border rounded p-4">
            {visibleMessages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 ml-8'
                    : 'bg-gray-100 dark:bg-gray-800 mr-8'
                }`}
              >
                <div className="font-semibold text-sm">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="bg-gray-100 dark:bg-gray-800 mr-8 p-3 rounded-lg">
                <div className="font-semibold text-sm">Assistant</div>
                <div className="text-gray-500">Thinking...</div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={chatMutation.isPending}
            />
            <Button onClick={handleSend} disabled={chatMutation.isPending || !input.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}