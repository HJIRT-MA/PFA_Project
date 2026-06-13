"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, MessageCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ChatDrawer } from '@/components/ChatDrawer';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TutorProfile = () => {
  const { id } = useParams();
  const router = useRouter();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);

  const { data: tutor, isLoading, isError } = useQuery({
    queryKey: ['tutor', id],
    queryFn: async () => {
      const res = await api.get(`/api/tutors/${id}`);
      return res.data;
    }
  });

  // Track profile view with a ref guard to prevent double-counting in React Strict Mode
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      api.post(`/api/tutors/${id}/view`).catch(err => console.error('Failed to track view', err));
    }
  }, [id]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!date || !id) return;
      const [hours, minutes] = time.split(':');
      const datetime = new Date(date);
      datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const res = await api.post('/api/sessions', {
        tutorId: id,
        datetime: datetime.toISOString(),
        durationMin: duration
      });
      return res.data;
    },
    onSuccess: (data) => {
      setIsBookingOpen(false);
      router.push(`/checkout/${data.sessionId}`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to book session');
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="w-full md:w-80 shrink-0">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !tutor) {
    return <div className="text-center py-20 text-xl font-medium">Tutor not found</div>;
  }

  const totalPrice = tutor && tutor.hourlyRate ? (tutor.hourlyRate * (duration / 60)).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-6 py-16 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="relative">
              <Avatar className="h-40 w-40 border-4 border-background shadow-xl">
                <AvatarImage src={tutor.avatarUrl || undefined} alt={tutor.name} />
                <AvatarFallback className="text-5xl font-black bg-primary/10 text-primary">
                  {tutor.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-green-500 border-4 border-background" />
            </div>
            
            <div className="flex-1 text-center md:text-left pt-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">{tutor.name}</h1>
                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-none px-4 py-1 rounded-full font-bold">
                  Online now
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-muted-foreground">
                <div className="flex items-center bg-yellow-400/10 text-yellow-700 px-3 py-1.5 rounded-xl font-black">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500 mr-2" />
                  {tutor.averageRating.toFixed(1)}
                  <span className="text-sm font-bold ml-1 opacity-70">({tutor.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center font-bold">
                  <Clock className="w-5 h-5 mr-2 text-primary" />
                  Fast responder
                </div>
                <div className="flex items-center font-bold">
                  <Badge variant="outline" className="rounded-full px-4 border-primary/30 text-primary">
                    Verified Expert
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-8">
                {tutor.subjects.map((subject: string) => (
                  <Badge key={subject} className="bg-card shadow-sm text-foreground hover:bg-primary/5 transition-colors px-4 py-1.5 rounded-full font-bold border-none text-sm">
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content */}
          <div className="flex-1 space-y-12">
            {/* Bio */}
            <section className="bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-primary rounded-full" />
                About me
              </h2>
              <div className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {tutor.bio ? (
                  tutor.bio
                ) : (
                  <p className="italic opacity-60">This tutor hasn't written a biography yet.</p>
                )}
              </div>
            </section>

            {/* Availability */}
            <section className="bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Availability
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {DAYS.map(day => (
                  <div key={day} className="flex flex-col gap-2">
                    <div className="text-center font-bold text-xs uppercase tracking-widest py-3 bg-muted/30 rounded-2xl text-muted-foreground">{day}</div>
                    <div className="bg-primary/5 text-primary text-center text-[10px] font-black uppercase py-4 rounded-2xl cursor-pointer hover:bg-primary hover:text-white transition-all">Morn</div>
                    <div className="bg-muted/10 text-muted-foreground/30 text-center text-[10px] font-black uppercase py-4 rounded-2xl cursor-not-allowed">Aft</div>
                    <div className="bg-primary/5 text-primary text-center text-[10px] font-black uppercase py-4 rounded-2xl cursor-pointer hover:bg-primary hover:text-white transition-all">Eve</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Student Success Stories
              </h2>
              {tutor.reviews && tutor.reviews.length > 0 ? (
                <div className="grid gap-6">
                  {tutor.reviews.map((review: any) => (
                    <div key={review.id} className="bg-card p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border group hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Avatar className="h-12 w-12 mr-4 border-2 border-card shadow-sm">
                            <AvatarImage src={review.avatarUrl || undefined} />
                            <AvatarFallback className="bg-muted font-bold">{review.studentName[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-foreground">{review.studentName}</div>
                            <div className="text-xs text-muted-foreground font-medium">{new Date(review.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                          </div>
                        </div>
                        <div className="flex bg-yellow-400/10 px-3 py-1 rounded-full">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/20 p-12 rounded-3xl text-center">
                  <p className="text-muted-foreground font-medium">No reviews yet. Be the first to book a session!</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Sticky Booking Card */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-card border-none shadow-[0_20px_50px_rgb(0,0,0,0.08)] rounded-[2.5rem] p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <svg className="w-32 h-32 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                </div>

                <div className="relative">
                  <div className="flex items-baseline mb-8">
                    <span className="text-5xl font-black tracking-tight text-foreground">${tutor.hourlyRate}</span>
                    <span className="text-muted-foreground font-bold ml-2">/ hr</span>
                  </div>
                  
                  <div className="space-y-4">
                    <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                      <DialogTrigger render={
                        <Button className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-1" />
                      }>
                        Book Now
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-3xl font-black tracking-tight">Schedule Session</DialogTitle>
                          <DialogDescription className="font-medium">
                            Choose your preferred time for a 1-on-1 session.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-6">
                          <div className="flex justify-center bg-muted/20 rounded-3xl p-4">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              className="rounded-2xl bg-card border shadow-sm"
                              disabled={(d) => d < new Date()}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-1">Start Time</Label>
                              <select 
                                className="flex h-12 w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                              >
                                <option value="09:00">09:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="13:00">01:00 PM</option>
                                <option value="14:00">02:00 PM</option>
                                <option value="15:00">03:00 PM</option>
                                <option value="18:00">06:00 PM</option>
                                <option value="19:00">07:00 PM</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-1">Duration</Label>
                              <select 
                                className="flex h-12 w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                              >
                                <option value={30}>30 mins</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-col gap-4">
                          <div className="flex justify-between w-full font-black text-xl py-4 bg-primary/5 px-6 rounded-2xl">
                            <span className="text-muted-foreground text-sm uppercase self-center">Total</span>
                            <span>${totalPrice}</span>
                          </div>
                          <Button 
                            className="w-full h-14 rounded-2xl text-lg font-black" 
                            onClick={() => bookMutation.mutate()} 
                            disabled={bookMutation.isPending || !date}
                          >
                            {bookMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold group border-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all" onClick={() => setIsChatOpen(true)}>
                      <MessageCircle className="w-6 h-6 mr-3 text-primary group-hover:scale-110 transition-transform" />
                      Message
                    </Button>
                  </div>

                  <div className="mt-8 pt-8 border-t text-sm font-bold text-center text-muted-foreground/60 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                    Secure payment checkout
                  </div>
                </div>
              </div>

              {/* Stats / Quick Info */}
              <div className="bg-muted/30 p-8 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-card rounded-xl shadow-sm flex items-center justify-center text-primary">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-foreground">Top Rated</div>
                    <div className="text-xs text-muted-foreground font-bold">Consistently high marks</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-card rounded-xl shadow-sm flex items-center justify-center text-primary">
                    <MessageCircle className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-foreground">Active Chat</div>
                    <div className="text-xs text-muted-foreground font-bold">Responds within 10 mins</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ChatDrawer 
        open={isChatOpen} 
        onOpenChange={setIsChatOpen} 
        defaultUserId={tutor?.id} 
        defaultUserName={tutor?.name} 
      />
    </div>
  );
};

export default TutorProfile;
