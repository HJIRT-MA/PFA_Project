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
      <div className="container mx-auto max-w-5xl py-12 px-6">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your learning journey and upcoming sessions.</p>
        </header>
        
        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 font-bold">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg px-6 font-bold">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="grid gap-6">
            {upcoming.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📚</div>
                  <p className="font-medium text-lg text-foreground">No upcoming sessions</p>
                  <Button variant="link" onClick={() => navigate('/')}>Find a tutor to get started</Button>
                </CardContent>
              </Card>
            ) : (
              upcoming.map((session: any) => {
                const hoursUntil = differenceInHours(new Date(session.datetime), new Date());
                return (
                  <Card key={session.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={session.tutor.avatarUrl} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">{session.tutor.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-bold">{session.tutor.email.split('@')[0]}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {format(new Date(session.datetime), 'PPp')}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`rounded-full px-4 py-1 font-bold ${session.status === 'CONFIRMED' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}>
                        {session.status}
                      </Badge>
                    </CardHeader>
                    <CardFooter className="justify-between bg-muted/20 px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Amount Paid</span>
                        <span className="font-bold text-foreground">€{(session.amountCents / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {hoursUntil > 0 && hoursUntil < 24 && (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">Starts in {hoursUntil}h</span>
                        )}
                        <Button 
                          variant="secondary"
                          size="sm"
                          className="rounded-xl font-bold px-5"
                          onClick={() => navigate(`/session/${session.id}/room`)}
                        >
                          Join Room
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl font-bold px-5"
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

          <TabsContent value="past" className="grid gap-6">
            {past.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">No session history yet</CardContent></Card>
            ) : (
              past.map((session: any) => (
                <Card key={session.id} className="border-none shadow-sm rounded-2xl bg-white/50 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 grayscale-[0.5]">
                          <AvatarImage src={session.tutor.avatarUrl} />
                          <AvatarFallback>{session.tutor.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-bold">{session.tutor.email.split('@')[0]}</CardTitle>
                          <CardDescription>{format(new Date(session.datetime), 'PPp')}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-4">{session.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-3 px-6 py-4 border-t">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => navigate(`/review/${session.id}`)}>
                      Leave Review
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-destructive font-bold" onClick={() => setDisputeSessionId(session.id)}>
                      Open Dispute
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {disputeSessionId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black">Open a Dispute</CardTitle>
                <CardDescription>Tell us what went wrong with this session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Reason</Label>
                  <Select value={disputeReason} onValueChange={setDisputeReason}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Payment issue">Payment issue</SelectItem>
                      <SelectItem value="No-show">No-show</SelectItem>
                      <SelectItem value="Technical problem">Technical problem</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Details</Label>
                  <Textarea 
                    placeholder="Describe the issue in detail..." 
                    className="rounded-2xl min-h-[120px]"
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 pt-6 border-t p-6">
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setDisputeSessionId(null)}>Cancel</Button>
                <Button 
                  className="rounded-xl font-bold px-8"
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
  }

  if (user?.role === 'TUTOR') {
    const upcoming = data.filter((s: any) => s.status === 'CONFIRMED' && isFuture(new Date(s.datetime)));
    const pending = data.filter((s: any) => s.status === 'PENDING');
    const past = data.filter((s: any) => s.status === 'COMPLETED' || (s.status === 'CONFIRMED' && isPast(new Date(s.datetime))));
    
    const thisMonth = new Date().getMonth();
    const earnings = past.reduce((sum: number, s: any) => {
      if (new Date(s.datetime).getMonth() === thisMonth) return sum + s.amountCents;
      return sum;
    }, 0);

    return (
      <div className="container mx-auto max-w-5xl py-12 px-6">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Tutor Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your teaching schedule and track your growth.</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => navigate('/dashboard/tutor/stats')}
          >
            View Detailed Stats
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="md:col-span-2 border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] bg-primary text-primary-foreground rounded-[2rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </div>
            <CardHeader>
              <CardDescription className="text-primary-foreground/70 font-bold uppercase tracking-widest text-xs">Estimated Earnings</CardDescription>
              <CardTitle className="text-5xl font-black mt-2">€{(earnings / 100).toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium opacity-80">Total revenue for {format(new Date(), 'MMMM yyyy')}</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] flex flex-col justify-center items-center text-center p-6 bg-white">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4 text-primary text-2xl font-black">
              {pending.length}
            </div>
            <h3 className="font-black text-xl">New Requests</h3>
            <p className="text-sm text-muted-foreground font-medium mt-1">Pending your approval</p>
          </Card>
        </div>
        
        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 font-bold">Schedule</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg px-6 font-bold flex gap-2">
              Requests
              {pending.length > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg px-6 font-bold">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="grid gap-6">
            {upcoming.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📅</div>
                  <p className="font-medium text-lg text-foreground">No confirmed sessions</p>
                  <p className="text-sm">Once a student books and you accept, it will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              upcoming.map((session: any) => (
                <Card key={session.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={session.student.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{session.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold">{session.student.email.split('@')[0]}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          {format(new Date(session.datetime), 'PPp')} ({session.durationMin} mins)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="justify-between bg-muted/20 px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">You Earn</span>
                      <span className="font-bold text-foreground">€{(session.amountCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="secondary"
                        size="sm"
                        className="rounded-xl font-bold px-5"
                        onClick={() => navigate(`/session/${session.id}/room`)}
                      >
                        Start Session
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="grid gap-6">
            {pending.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">No pending requests</CardContent></Card>
            ) : (
              pending.map((session: any) => (
                <Card key={session.id} className="border-none shadow-[0_10px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden bg-white border-l-4 border-l-primary">
                  <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.student.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{session.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold">{session.student.email.split('@')[0]}</CardTitle>
                        <CardDescription className="font-medium text-primary">New booking request</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xl">€{(session.amountCents / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground font-bold">{session.durationMin} minutes</div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-0 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl font-bold">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                      {format(new Date(session.datetime), 'PPP')}
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl font-bold">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                      {format(new Date(session.datetime), 'p')}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-primary/5 px-6 py-4 flex gap-3">
                    <Button 
                      className="flex-1 rounded-xl font-black h-11"
                      onClick={() => acceptMutation.mutate(session.id)}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? 'Accepting...' : 'Accept Request'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-xl font-bold h-11 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      onClick={() => {
                        const reason = prompt('Reason for declining:');
                        if (reason) declineMutation.mutate({ id: session.id, reason });
                      }}
                      disabled={declineMutation.isPending}
                    >
                      Decline
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="grid gap-4">
            {past.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">No session history yet</CardContent></Card>
            ) : (
              past.map((session: any) => (
                <Card key={session.id} className="border-none shadow-sm rounded-2xl bg-white/50 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.student.avatarUrl} />
                        <AvatarFallback>{session.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-bold">{session.student.email.split('@')[0]}</CardTitle>
                        <CardDescription>{format(new Date(session.datetime), 'PPp')}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="rounded-full px-3 text-[10px] font-bold">{session.status}</Badge>
                      <span className="font-bold text-sm text-foreground">€{(session.amountCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
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