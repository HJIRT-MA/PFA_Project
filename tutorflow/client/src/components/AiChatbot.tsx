"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export const AiChatbot = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi there! I am the TutorFlow AI Assistant. How can I help you today?'
        }
      ]);
    }
  }, [isOpen, messages.length]);

  if (!user) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Send only the necessary fields to the API
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.post('/api/ai/chat', { messages: apiMessages });
      
      setMessages([...newMessages, { role: 'assistant', content: response.data.message.content }]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-elevated transition-all duration-300 flex items-center justify-center ${
            isOpen 
              ? 'bg-muted hover:bg-muted-foreground/20 text-foreground rotate-90 scale-90' 
              : 'bg-gradient-to-br from-primary to-secondary hover:shadow-primary/40 hover:-translate-y-1 hover:scale-105'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6 text-white" />}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[500px] bg-card border border-border/40 rounded-2xl shadow-elevated flex flex-col z-[100] overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#0f1f3d] to-[#1a2f5a] text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold tracking-tight">TutorFlow AI</h3>
              <p className="text-[10px] text-blue-200/80 uppercase tracking-widest font-bold">Powered by Groq</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-background border border-border/50 text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-background border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background border-t border-border/40">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="min-h-[44px] max-h-32 py-3 px-4 resize-none rounded-xl border-border/50 focus-visible:ring-primary/20"
                rows={1}
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                className="h-11 w-11 rounded-xl shrink-0 shadow-sm transition-all" 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
