"use client";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, differenceInHours, isPast, isFuture, subMonths } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';


const Dashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('upcoming');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [disputeSessionId, setDisputeSessionId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [declineSessionId, setDeclineSessionId] = useState<string | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);

  const statusMutation = useMutation({
    mutationFn: (newStatus: boolean) => api.patch('/api/tutors/me/profile', { isOnline: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorStats'] })
  });

  const handleToggleOnline = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    statusMutation.mutate(newStatus);
  };
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [nearestUpcomingDate, setNearestUpcomingDate] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!nearestUpcomingDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = nearestUpcomingDate.getTime() - now;
      if (distance < 0) {
        setTimeLeft('Started');
        clearInterval(interval);
        return;
      }
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [nearestUpcomingDate]);

  const disputeMutation = useMutation({
    mutationFn: () => api.post('/api/disputes', {
      sessionId: disputeSessionId,
      reason: disputeReason,
      description: disputeDescription
    }),
    onSuccess: () => {
      toast.success('Dispute opened successfully');
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

  const { data: tutorStats } = useQuery({
    queryKey: ['tutorStats'],
    queryFn: async () => {
      const res = await api.get('/api/tutors/me/stats');
      return res.data;
    },
    enabled: user?.role === 'TUTOR'
  });

  const { data: subscriptionsData } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await api.get('/api/subscriptions/me');
      return res.data.subscriptions;
    }
  });

  useEffect(() => {
    if (tutorStats?.isOnline !== undefined) {
      setIsOnline(tutorStats.isOnline);
    }
  }, [tutorStats?.isOnline]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/sessions/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.error(`Session cancelled (Refund: ${res.data.refundPercent}%)`, {
        duration: 4000
      });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/sessions/${id}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => api.patch(`/api/sessions/${id}/decline`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setDeclineSessionId(null);
      setDeclineReasonText('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to decline session.');
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentIntent = params.get('payment_intent');
      const redirectStatus = params.get('redirect_status');

      if (paymentIntent && redirectStatus === 'succeeded') {
        api.post('/api/sessions/verify-payment', { paymentIntentId: paymentIntent })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            window.history.replaceState({}, '', '/dashboard');
          })
          .catch(console.error);
      }
    }
  }, [queryClient]);

  if (isLoading || !data) return <div className="p-8 text-center">Loading dashboard...</div>;

  if (user?.role === 'STUDENT') {
    const upcoming = data.filter((s: any) => s.status !== 'CANCELLED' && s.status !== 'AWAITING_PAYMENT' && new Date(s.datetime).getTime() + s.durationMin * 60000 > new Date().getTime());
    const past = data.filter((s: any) => s.status === 'COMPLETED' || (s.status === 'CONFIRMED' && new Date(s.datetime).getTime() + s.durationMin * 60000 <= new Date().getTime())).reverse().slice(0, 20);

    const completedPast = data.filter((s: any) => s.status === 'COMPLETED');
    const totalHoursLearned = completedPast.reduce((sum: number, s: any) => sum + s.durationMin, 0) / 60;
    const thisMonth = new Date().getMonth();
    const sessionsThisMonth = completedPast.filter((s: any) => new Date(s.datetime).getMonth() === thisMonth).length;
    
    const subjectsCount: Record<string, number> = {};
    completedPast.forEach((s: any) => {
      s.tutor?.tutorProfile?.subjects?.forEach((sub: string) => {
        subjectsCount[sub] = (subjectsCount[sub] || 0) + 1;
      });
    });
    const favoriteSubject = Object.entries(subjectsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const uniqueTutors = Array.from(new Map(
      past.filter((s:any) => s.tutorId).map((s: any) => [s.tutorId, { ...s.tutor, id: s.tutorId }])
    ).values()) as any[];

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nearestUpcoming = upcoming
      .filter((s: any) => s.status === 'CONFIRMED' && new Date(s.datetime).getTime() + s.durationMin * 60000 > now.getTime() && new Date(s.datetime).getTime() < next24h.getTime())
      .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0];

    // Set nearest upcoming date once for the countdown hook
    if (nearestUpcoming && nearestUpcomingDate?.getTime() !== new Date(nearestUpcoming.datetime).getTime()) {
      setNearestUpcomingDate(new Date(nearestUpcoming.datetime));
    } else if (!nearestUpcoming && nearestUpcomingDate) {
      setNearestUpcomingDate(null);
    }

    return (
      <div className="container mx-auto max-w-5xl py-12 px-6">
        {nearestUpcoming && (
          <div className="mb-8 bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-orange-800 font-black text-xl flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                Session starting soon!
              </h3>
              <p className="text-orange-700 font-medium mt-1">Your session with {nearestUpcoming.tutor.email.split('@')[0]} starts in <span className="font-black">{timeLeft}</span></p>
            </div>
            <Button size="lg" className="rounded-xl font-black px-8 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => router.push(`/session/${nearestUpcoming.id}/room`)}>
              Join Room Now
            </Button>
          </div>
        )}

        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your learning journey and upcoming sessions.</p>
        </header>

        {/* Stats Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 bg-card flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-2xl font-black">⏱️</div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Hours</div>
              <div className="text-3xl font-black mt-1">{totalHoursLearned.toFixed(1)}</div>
            </div>
          </Card>
          <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 bg-card flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600 text-2xl font-black">📚</div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Favorite Subject</div>
              <div className="text-3xl font-black mt-1">{favoriteSubject}</div>
            </div>
          </Card>
          <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 bg-card flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 text-2xl font-black">🎯</div>
            <div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">This Month</div>
              <div className="text-3xl font-black mt-1">{sessionsThisMonth} <span className="text-sm text-muted-foreground">sessions</span></div>
            </div>
          </Card>
        </div>

        {/* Quick Re-Book */}
        {uniqueTutors.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-black mb-6">Your Tutors</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {uniqueTutors.map((t) => (
                <Card key={t.id} className="min-w-[250px] snap-start border-none shadow-[0_10px_30px_rgb(0,0,0,0.03)] rounded-3xl p-5 flex flex-col items-center text-center bg-card">
                  <Avatar className="h-16 w-16 mb-4">
                    <AvatarImage src={t.avatarUrl} />
                    <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">{t.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-lg mb-1">{t.email.split('@')[0]}</h3>
                  <p className="text-xs text-muted-foreground font-medium mb-5">{t.tutorProfile?.subjects?.[0] || 'Tutor'}</p>
                  <Button variant="outline" className="w-full rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5" onClick={() => router.push(`/tutors/${t.user?.id || t.id}`)}>
                    Book Again
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 font-bold">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg px-6 font-bold">History</TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-lg px-6 font-bold">Subscriptions</TabsTrigger>
            <TabsTrigger value="resources" className="rounded-lg px-6 font-bold">Resources & Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="grid gap-6">
            {upcoming.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📚</div>
                  <p className="font-medium text-lg text-foreground">No upcoming sessions</p>
                  <Button variant="link" onClick={() => router.push('/')}>Find a tutor to get started</Button>
                </CardContent>
              </Card>
            ) : (
              upcoming.map((session: any) => {
                const hoursUntil = differenceInHours(new Date(session.datetime), new Date());
                return (
                  <Card key={session.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all rounded-3xl overflow-hidden bg-card">
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
                        {session.status === 'PENDING' ? 'AWAITING TUTOR' : session.status}
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
                          onClick={() => router.push(`/session/${session.id}/room`)}
                        >
                          Join Room
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl font-bold px-5"
                          onClick={() => cancelMutation.mutate(session.id)}
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
                <Card key={session.id} className="border-none shadow-sm rounded-2xl bg-card/50 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
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
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => router.push(`/review/${session.id}`)}>
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

          <TabsContent value="resources" className="grid gap-6">
            {past.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">No past sessions to show resources for.</CardContent></Card>
            ) : (
              past.map((session: any) => (
                <Card key={session.id} className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
                  <CardHeader className="p-6 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={session.tutor.avatarUrl} />
                          <AvatarFallback>{session.tutor.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-bold">{session.tutor.email.split('@')[0]} - {format(new Date(session.datetime), 'PP')}</CardTitle>
                          <CardDescription>Session Resources & Chat Logs</CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl">
                        {expandedSessionId === session.id ? 'Collapse' : 'View'}
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedSessionId === session.id && (
                    <CardContent className="p-6">
                      <SessionResources sessionId={session.id} />
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="grid gap-6">
            {!subscriptionsData || subscriptionsData.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">You have no active subscriptions.</CardContent></Card>
            ) : (
              subscriptionsData.map((sub: any) => (
                <Card key={sub.id} className="border-none shadow-[0_10px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-card border-l-4 border-l-green-500">
                  <CardHeader className="p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={sub.tutor.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{sub.tutor.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold">{sub.tutor.email.split('@')[0]}</CardTitle>
                        <CardDescription className="text-primary font-medium">{sub.plan} Plan</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <Badge className="bg-green-500/10 text-green-700 font-black rounded-full px-4 mb-1">{sub.status}</Badge>
                        <div className="text-xs font-bold text-muted-foreground">Renews {format(new Date(sub.currentPeriodEnd), 'PP')}</div>
                      </div>
                      <Button 
                        onClick={() => router.push(`/tutors/${sub.tutorId}`)} 
                        className="rounded-xl font-bold shadow-sm"
                      >
                        Book Session
                      </Button>
                    </div>
                  </CardHeader>
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
                  <Select value={disputeReason} onValueChange={(val) => val && setDisputeReason(val)}>
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
    const upcoming = data.filter((s: any) => s.status === 'CONFIRMED' && new Date(s.datetime).getTime() + s.durationMin * 60000 > new Date().getTime());
    const pending = data.filter((s: any) => s.status === 'PENDING');
    const past = data.filter((s: any) => s.status === 'COMPLETED' || (s.status === 'CONFIRMED' && new Date(s.datetime).getTime() + s.durationMin * 60000 <= new Date().getTime())).reverse().slice(0, 20);
    
    const thisMonth = new Date().getMonth();
    const earnings = past.reduce((sum: number, s: any) => {
      if (new Date(s.datetime).getMonth() === thisMonth) return sum + s.amountCents;
      return sum;
    }, 0);

    // Generate mock chart data based on real earnings average or just static mock if no data
    const monthlyAverage = (earnings / 100) || 450;
    const chartData = Array.from({ length: 6 }).map((_, i) => ({
      name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
      revenue: i === 5 ? earnings / 100 : Math.floor(monthlyAverage * (0.8 + Math.random() * 0.4)),
    }));

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nearestUpcoming = upcoming
      .filter((s: any) => s.status === 'CONFIRMED' && new Date(s.datetime).getTime() + s.durationMin * 60000 > now.getTime() && new Date(s.datetime).getTime() < next24h.getTime())
      .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0];

    // Set nearest upcoming date once for the countdown hook
    if (nearestUpcoming && nearestUpcomingDate?.getTime() !== new Date(nearestUpcoming.datetime).getTime()) {
      setNearestUpcomingDate(new Date(nearestUpcoming.datetime));
    } else if (!nearestUpcoming && nearestUpcomingDate) {
      setNearestUpcomingDate(null);
    }

    return (
      <div className="container mx-auto max-w-5xl py-12 px-6">
        {nearestUpcoming && (
          <div className="mb-8 bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-orange-800 font-black text-xl flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                Session starting soon!
              </h3>
              <p className="text-orange-900 mt-1 font-medium">
                Your session with {nearestUpcoming.student.email.split('@')[0]} starts in <span className="font-black">{timeLeft || '...'}</span>
              </p>
            </div>
            <Button 
              className="rounded-xl font-bold bg-orange-600 hover:bg-orange-700 px-8"
              onClick={() => router.push(`/session/${nearestUpcoming.id}/room`)}
            >
              Join Room Now
            </Button>
          </div>
        )}

        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tight">Tutor Dashboard</h1>
              <Button 
                variant={isOnline ? "default" : "secondary"}
                className={`rounded-full h-8 px-4 font-bold text-xs ${isOnline ? 'bg-green-500 hover:bg-green-600' : 'text-muted-foreground'}`}
                onClick={handleToggleOnline}
                disabled={statusMutation.isPending}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-white' : 'bg-muted-foreground'}`} />
                {isOnline ? 'Online Now' : 'Offline'}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">Manage your teaching schedule and track your growth.</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => router.push('/dashboard/tutor/stats')}
          >
            View Detailed Stats
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Main Earnings Chart */}
          <Card className="md:col-span-3 border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] bg-card rounded-[2rem] p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <CardDescription className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Estimated Earnings (Last 6 Months)</CardDescription>
                <CardTitle className="text-4xl font-black mt-1">€{(earnings / 100).toFixed(2)} <span className="text-sm font-bold text-muted-foreground">this month</span></CardTitle>
              </div>
            </div>
            <div className="h-96 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`€${value}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <div className="flex flex-col gap-6">
            <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] flex flex-col justify-center items-center text-center p-6 bg-card flex-1">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-3 text-primary text-xl font-black">
                {pending.length}
              </div>
              <h3 className="font-black text-lg">New Requests</h3>
              <p className="text-xs text-muted-foreground font-medium mt-1">Pending approval</p>
            </Card>

            <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] flex flex-col justify-center items-center text-center p-6 bg-card flex-1">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-3 text-green-600 text-xl font-black">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="font-black text-lg">{tutorStats?.profileViews || 0} Views</h3>
              <p className="text-xs text-muted-foreground font-medium mt-1">Profile views</p>
            </Card>

            <Card className="border-none shadow-[0_20px_50px_rgb(0,0,0,0.04)] rounded-[2rem] flex flex-col justify-center items-center text-center p-6 bg-card flex-1">
              <div className="text-lg font-black text-foreground mb-1">
                {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'MMM do')}
              </div>
              <h3 className="font-bold text-sm">Next Payout</h3>
              <p className="text-xs text-muted-foreground font-medium mt-1">Stripe Transfer</p>
            </Card>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 font-bold">Schedule</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg px-6 font-bold flex gap-2">
              Requests
              {pending.length > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg px-6 font-bold">History</TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-lg px-6 font-bold flex gap-2">
              Subscribers
              {subscriptionsData?.length > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px]">{subscriptionsData.length}</Badge>}
            </TabsTrigger>
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
                <Card key={session.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-all rounded-3xl overflow-hidden bg-card">
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
                        onClick={() => router.push(`/session/${session.id}/room`)}
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
                <Card key={session.id} className="border-none shadow-[0_10px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden bg-card border-l-4 border-l-primary">
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
                      onClick={() => setDeclineSessionId(session.id)}
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
                <Card key={session.id} className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
                  <CardHeader className="p-6 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}>
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
                  </CardHeader>
                  {expandedSessionId === session.id && (
                    <CardContent className="p-6">
                      <SessionResources sessionId={session.id} isTutor={true} />
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="grid gap-6">
            {!subscriptionsData || subscriptionsData.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="py-16 text-center text-muted-foreground">You have no active subscribers.</CardContent></Card>
            ) : (
              subscriptionsData.map((sub: any) => (
                <Card key={sub.id} className="border-none shadow-[0_10px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-card border-l-4 border-l-green-500">
                  <CardHeader className="p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={sub.student.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{sub.student.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold">{sub.student.email.split('@')[0]}</CardTitle>
                        <CardDescription className="text-primary font-medium">{sub.plan} Plan</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-500/10 text-green-700 font-black rounded-full px-4 mb-1">{sub.status}</Badge>
                      <div className="text-xs font-bold text-muted-foreground">Renews {format(new Date(sub.currentPeriodEnd), 'PP')}</div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {declineSessionId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-destructive">Decline Session</CardTitle>
                <CardDescription>Please provide a reason for declining this request. The student will be notified and fully refunded.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Reason</Label>
                  <Textarea 
                    placeholder="E.g., I have a scheduling conflict..." 
                    className="rounded-2xl min-h-[120px]"
                    value={declineReasonText}
                    onChange={(e) => setDeclineReasonText(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 pt-6 border-t p-6">
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => { setDeclineSessionId(null); setDeclineReasonText(''); }}>Cancel</Button>
                <Button 
                  variant="destructive"
                  className="rounded-xl font-bold px-8"
                  onClick={() => declineMutation.mutate({ id: declineSessionId, reason: declineReasonText })} 
                  disabled={!declineReasonText.trim() || declineMutation.isPending}
                >
                  Confirm Decline
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return <div>Role not recognized</div>;
};

const SessionResources = ({ sessionId, isTutor }: { sessionId: string; isTutor?: boolean }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: resources } = useQuery({
    queryKey: ['resources', sessionId],
    queryFn: async () => (await api.get(`/api/sessions/${sessionId}/resources`)).data.resources
  });
  const { data: messages } = useQuery({
    queryKey: ['messages', sessionId],
    queryFn: async () => (await api.get(`/api/sessions/${sessionId}/messages`)).data.messages
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await api.post(`/api/sessions/${sessionId}/resources`, {
        title: file.name,
        url: uploadRes.data.url,
        type: 'pdf'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', sessionId] });
      setFile(null);
    }
  });

  const handleUpload = async () => {
    setUploading(true);
    await uploadMutation.mutateAsync();
    setUploading(false);
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm">Session Resources</h4>
          {isTutor && (
            <div className="flex items-center gap-2">
              <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button size="sm" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
            </div>
          )}
        </div>
        {resources?.length === 0 ? <p className="text-xs text-muted-foreground">No resources uploaded.</p> : (
          <div className="flex gap-3 flex-wrap">
            {resources?.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-xl text-sm font-bold hover:bg-primary/20">
                📄 {r.title}
              </a>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="font-bold text-sm mb-3">Chat Logs</h4>
        {messages?.length === 0 ? <p className="text-xs text-muted-foreground">No chat logs.</p> : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto bg-muted/20 p-4 rounded-2xl">
            {messages?.map((m: any) => (
              <div key={m.id} className="text-sm">
                <span className="font-bold">{m.sender?.email?.split('@')[0]}: </span>
                <span className="text-muted-foreground">{m.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
