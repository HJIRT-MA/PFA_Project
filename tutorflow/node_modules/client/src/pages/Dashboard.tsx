import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, differenceInHours, isPast, isFuture } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [disputeSessionId, setDisputeSessionId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState<string>('');

  const disputeMutation = useMutation({
    mutationFn: () => api.post('/api/disputes', {
      sessionId: disputeSessionId,
      reason: disputeReason,
      description: disputeDescription
    }),
    onSuccess: () => {
      alert('Dispute opened successfully');
      setDisputeSessionId(null);
      setDisputeReason('');
      setDisputeDescription('');
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/api/sessions/me');
      return res.data.sessions;
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/sessions/${id}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => api.patch(`/api/sessions/${id}/decline`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
  });

  if (isLoading || !data) return <div className="p-8 text-center">Loading dashboard...</div>;

  if (user?.role === 'STUDENT') {
    const upcoming = data.filter((s: any) => s.status !== 'CANCELLED' && isFuture(new Date(s.datetime)));
    const past = data.filter((s: any) => s.status === 'COMPLETED' || isPast(new Date(s.datetime)));

    return (
      <div className="container mx-auto max-w-5xl py-8">
        <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>
        
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming sessions</CardContent></Card>
            ) : (
              upcoming.map((session: any) => {
                const hoursUntil = differenceInHours(new Date(session.datetime), new Date());
                return (
                  <Card key={session.id}>
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.tutor.avatarUrl} />
                          <AvatarFallback>{session.tutor.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{session.tutor.email.split('@')[0]}</CardTitle>
                          <CardDescription>{format(new Date(session.datetime), 'PPp')} ({session.durationMin} mins)</CardDescription>
                        </div>
                      </div>
                      <Badge variant={session.status === 'CONFIRMED' ? 'default' : 'secondary'}>{session.status}</Badge>
                    </CardHeader>
                    <CardFooter className="justify-between border-t pt-4">
                      <span className="text-sm font-medium">Price: €{(session.amountCents / 100).toFixed(2)}</span>
                      <div className="flex items-center gap-4">
                        {hoursUntil > 0 && (
                          <span className="text-xs text-muted-foreground">In {hoursUntil} hours</span>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/session/${session.id}/room`}
                        >
                          Join Room
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            if (confirm(`Cancel this session? You will receive a ${hoursUntil > 24 ? '100%' : hoursUntil > 12 ? '50%' : '0%'} refund.`)) {
                              cancelMutation.mutate(session.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No past sessions</CardContent></Card>
            ) : (
              past.map((session: any) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.tutor.avatarUrl} />
                          <AvatarFallback>{session.tutor.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{session.tutor.email.split('@')[0]}</CardTitle>
                          <CardDescription>{format(new Date(session.datetime), 'PPp')}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">{session.status}</Badge>
                    </div>
                  <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/review/${session.id}`)}>
                      Leave Review
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDisputeSessionId(session.id)}>
                      Open Dispute
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {disputeSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Open a Dispute</CardTitle>
                <CardDescription>Tell us what went wrong with this session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={disputeReason} onValueChange={setDisputeReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payment issue">Payment issue</SelectItem>
                    <SelectItem value="No-show">No-show</SelectItem>
                    <SelectItem value="Technical problem">Technical problem</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea 
                  placeholder="Describe the issue in detail..." 
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  rows={4}
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" onClick={() => setDisputeSessionId(null)}>Cancel</Button>
                <Button 
                  onClick={() => disputeMutation.mutate()} 
                  disabled={!disputeReason || !disputeDescription || disputeMutation.isPending}
                >
                  Submit Dispute
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    );
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (user?.role === 'TUTOR') {
    const upcoming = data.filter((s: any) => s.status === 'CONFIRMED' && isFuture(new Date(s.datetime)));
    const past = data.filter((s: any) => s.status === 'COMPLETED' || (s.status === 'CONFIRMED' && isPast(new Date(s.datetime))));
    
    const thisMonth = new Date().getMonth();
    const earnings = past.reduce((sum: number, s: any) => {
      if (new Date(s.datetime).getMonth() === thisMonth) return sum + s.amountCents;
      return sum;
    }, 0);

    return (
      <div className="container mx-auto max-w-5xl py-8">
        <h1 className="text-3xl font-bold mb-8">Tutor Dashboard</h1>

        <div className="mb-8 p-6 bg-card border rounded-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-muted-foreground">Earnings this month</h2>
            <div className="text-4xl font-bold mt-1">€{(earnings / 100).toFixed(2)}</div>
          </div>
        </div>
        
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming & Requests</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming requests</CardContent></Card>
            ) : (
              upcoming.map((session: any) => (
                <Card key={session.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={session.student.avatarUrl} />
                        <AvatarFallback>{session.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{session.student.email.split('@')[0]}</CardTitle>
                        <CardDescription>{format(new Date(session.datetime), 'PPp')} ({session.durationMin} mins)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="justify-between border-t pt-4">
                    <span className="text-sm font-medium">Earn: €{(session.amountCents / 100).toFixed(2)}</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/session/${session.id}/room`}
                      >
                        Join Room
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Reason for declining:');
                          if (reason) declineMutation.mutate({ id: session.id, reason });
                        }}
                        disabled={declineMutation.isPending}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => acceptMutation.mutate(session.id)}
                        disabled={acceptMutation.isPending}
                      >
                        Accept
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No past sessions</CardContent></Card>
            ) : (
              past.map((session: any) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={session.student.avatarUrl} />
                        <AvatarFallback>{session.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{session.student.email.split('@')[0]}</CardTitle>
                        <CardDescription>{format(new Date(session.datetime), 'PPp')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return <div>Role not recognized</div>;
};
