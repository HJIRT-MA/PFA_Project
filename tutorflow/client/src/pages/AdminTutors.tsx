import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdminTutors = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  const { data: tutors, isLoading } = useQuery({
    queryKey: ['adminTutors'],
    queryFn: async () => {
      // In a real app we would have endpoints for all statuses.
      // For now we just use the pending endpoint and mock the others or fetch all.
      // Since we only created /tutors/pending, we will focus on that.
      const res = await api.get('/api/admin/tutors/pending');
      return res.data.tutors;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/admin/tutors/${id}/approve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTutors'] })
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      await api.patch(`/api/admin/tutors/${id}/reject`, { reason });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTutors'] })
  });

  if (isLoading) return <div className="p-8 text-center">Loading tutors...</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Tutor Moderation</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pending ({tutors?.length || 0})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {tutors?.map((tutor: any) => (
            <Card key={tutor.userId}>
              <CardContent className="flex items-center p-6 gap-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={tutor.user.avatarUrl} />
                  <AvatarFallback>{tutor.user.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{tutor.user.email}</h3>
                  <div className="text-sm text-muted-foreground mb-2">
                    Applied on: {new Date(tutor.user.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {tutor.subjects.map((sub: string) => (
                      <Badge key={sub} variant="secondary">{sub}</Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-sm max-w-2xl">{tutor.bio}</p>
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveMutation.mutate(tutor.userId)}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      const reason = prompt('Reason for rejection:');
                      if (reason) rejectMutation.mutate({ id: tutor.userId, reason });
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tutors?.length === 0 && (
            <div className="text-center p-8 border rounded-lg text-muted-foreground bg-muted/20">
              No pending applications
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved">
          <div className="text-center p-8 text-muted-foreground">This list would show approved tutors.</div>
        </TabsContent>
        
        <TabsContent value="rejected">
          <div className="text-center p-8 text-muted-foreground">This list would show rejected tutors.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
