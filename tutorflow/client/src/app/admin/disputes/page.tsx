"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const AdminDisputes = () => {
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: async () => {
      const res = await api.get('/api/disputes/admin');
      return res.data.disputes;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string, status: string, resolution?: string }) => {
      await api.patch(`/api/disputes/admin/${id}`, { status, resolution });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminDisputes'] })
  });

  if (isLoading) return <div className="p-8 text-center">Loading disputes...</div>;

  const openDisputes = disputes?.filter((d: any) => d.status === 'OPEN') || [];
  const underReview = disputes?.filter((d: any) => d.status === 'UNDER_REVIEW') || [];
  const resolved = disputes?.filter((d: any) => d.status === 'RESOLVED') || [];

  const Column = ({ title, items }: { title: string, items: any[] }) => (
    <div className="bg-muted/30 p-4 rounded-xl flex flex-col gap-4 min-h-[500px]">
      <div className="font-bold flex justify-between items-center">
        {title}
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.map(d => (
        <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Badge variant={d.status === 'OPEN' ? 'destructive' : d.status === 'RESOLVED' ? 'default' : 'secondary'}>
                {d.reason}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm line-clamp-3">{d.description}</p>
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              By: {d.opener.email.split('@')[0]}
            </div>

            <div className="flex gap-2 pt-2">
              <Select 
                value={d.status} 
                onValueChange={(val) => {
                  let resolution = undefined;
                  if (val === 'RESOLVED') resolution = prompt('Enter resolution details (e.g., Refund issued):');
                  updateMutation.mutate({ id: d.id, status: val, resolution: resolution || undefined });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 h-full">
      <h1 className="text-3xl font-bold mb-8">Dispute Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Column title="Open" items={openDisputes} />
        <Column title="Under Review" items={underReview} />
        <Column title="Resolved" items={resolved} />
      </div>
    </div>
  );
};

export default AdminDisputes;
