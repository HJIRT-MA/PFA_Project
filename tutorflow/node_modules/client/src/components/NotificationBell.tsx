import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const NotificationBell = () => {
  const navigate = useNavigate();
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
    const socket = getSocket();
    if (!socket) return;

    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
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
            notifications.slice(0, 10).map((n: any) => (
              <div 
                key={n.id} 
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${!n.readAt ? 'bg-primary/5' : ''}`}
                onClick={() => {
                  if (!n.readAt) markRead.mutate(n.id);
                  if (n.link) navigate(n.link);
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
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/notifications')}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
