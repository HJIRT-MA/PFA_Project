import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { initSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUserId?: string;
  defaultUserName?: string;
}

export const ChatDrawer = ({ open, onOpenChange, defaultUserId, defaultUserName }: ChatDrawerProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeUser, setActiveUser] = useState<{id: string, name: string} | null>(null);
  const [msgContent, setMsgContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convos } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/api/messages/conversations');
      return res.data.conversations;
    },
    enabled: open
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', activeUser?.id],
    queryFn: async () => {
      const res = await api.get(`/api/messages/${activeUser!.id}`);
      return res.data.messages;
    },
    enabled: !!activeUser && open
  });

  useEffect(() => {
    if (defaultUserId && defaultUserName) {
      setActiveUser({ id: defaultUserId, name: defaultUserName });
    }
  }, [defaultUserId, defaultUserName]);

  useEffect(() => {
    if (open) {
      const socket = initSocket();
      if (!socket) return;

      const onNewMsg = (msg: any) => {
        // Optimistically update conversations
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        
        if (activeUser && (msg.senderId === activeUser.id || msg.receiverId === activeUser.id)) {
          queryClient.setQueryData(['messages', activeUser.id], (old: any) => [...(old || []), msg]);
          if (msg.senderId === activeUser.id) {
            socket.emit('mark_read', { messageId: msg.id });
          }
        }
      };

      const onMsgRead = (msg: any) => {
        if (activeUser && msg.receiverId === activeUser.id) {
          queryClient.setQueryData(['messages', activeUser.id], (old: any) => 
            (old || []).map((m: any) => m.id === msg.id ? { ...m, readAt: msg.readAt } : m)
          );
        }
      };

      socket.on('new_message', onNewMsg);
      socket.on('message_saved', onNewMsg);
      socket.on('message_read', onMsgRead);

      return () => {
        socket.off('new_message', onNewMsg);
        socket.off('message_saved', onNewMsg);
        socket.off('message_read', onMsgRead);
      };
    }
  }, [open, activeUser, queryClient]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData]);

  const handleSend = () => {
    if (!msgContent.trim() || !activeUser) return;
    
    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', { receiverId: activeUser.id, content: msgContent.trim() });
      setMsgContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        {!activeUser ? (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Messages</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {!convos || convos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No conversations yet</div>
              ) : (
                <div className="flex flex-col">
                  {convos.map((conv: any) => (
                    <div 
                      key={conv.user.id} 
                      className="p-4 border-b hover:bg-muted/50 cursor-pointer flex items-center gap-3"
                      onClick={() => setActiveUser({ id: conv.user.id, name: conv.user.email.split('@')[0] })}
                    >
                      <Avatar>
                        <AvatarImage src={conv.user.avatarUrl} />
                        <AvatarFallback>{conv.user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium truncate">{conv.user.email.split('@')[0]}</h4>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-muted/20">
            <div className="p-4 border-b bg-background flex items-center gap-3">
              <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setActiveUser(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{activeUser.name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{activeUser.name}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesData?.map((msg: any) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMine && (
                        msg.readAt ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-background border-t">
              <div className="flex items-end gap-2">
                <Textarea 
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="min-h-[40px] max-h-32 py-3 resize-none"
                  rows={1}
                />
                <Button size="icon" className="shrink-0" onClick={handleSend} disabled={!msgContent.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground text-center mt-2">
                Press Enter to send, Shift+Enter for newline
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
