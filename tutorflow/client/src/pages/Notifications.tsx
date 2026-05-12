import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const Notifications = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications-full'],
    queryFn: async () => {
      const res = await api.get('/api/notifications/me?limit=50');
      return res.data;
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const notifications = data?.notifications || [];

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Notifications</h1>
        <Button variant="outline" onClick={() => navigate('/settings/notifications')}>
          Notification Settings
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center p-12 bg-muted/20 rounded-xl text-muted-foreground">
            You have no notifications.
          </div>
        ) : (
          notifications.map((n: any) => (
            <div key={n.id} className={`p-4 rounded-xl border flex justify-between gap-4 ${!n.readAt ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
              <div className="flex-1">
                <h3 className="font-semibold">{n.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                <div className="text-xs text-muted-foreground mt-3">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {n.link && (
                <div className="flex items-center">
                  <Button variant="secondary" size="sm" onClick={() => navigate(n.link)}>
                    View
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
