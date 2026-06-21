"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { initSocket, getSocket } from '@/lib/socket';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export const NotificationBell = ({ onOpenChat }: { onOpenChat?: () => void }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/notifications/me');
      return res.data;
    },
    refetchInterval: 60000
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.patch('/api/notifications/read-all');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    const onNotification = (newNotif: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (newNotif && newNotif.title) {
        toast(newNotif.title, { description: newNotif.body });
      }
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [queryClient]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <Popover>
      <PopoverTrigger className="relative inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-10 w-10">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-pulse-soft">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-elevated border-border/40 animate-fade-in-up overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map((n: any) => (
              <div 
                key={n.id} 
                className={`p-4 border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors duration-200 ${!n.readAt ? 'bg-primary/5' : ''}`}
                onClick={() => {
                  if (!n.readAt) markRead.mutate(n.id);
                  if (n.link) {
                    if (n.link.includes('chat=open') && onOpenChat) {
                      onOpenChat();
                    } else {
                      router.push(n.link);
                    }
                  }
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-sm">{n.title}</h4>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-primary mt-1" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                <div className="text-[10px] text-muted-foreground mt-2">
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t border-border/40">
          <Button variant="ghost" className="w-full text-xs" onClick={() => router.push('/notifications')}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
