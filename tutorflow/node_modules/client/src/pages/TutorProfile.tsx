import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, MessageCircle, Calendar as CalendarIcon, Clock } from 'lucide-react';
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

export const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
      navigate(`/checkout/${data.sessionId}`, { state: { clientSecret: data.clientSecret } });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to book session');
    }
  });

  const totalPrice = tutor && tutor.hourlyRate ? (tutor.hourlyRate * (duration / 60)).toFixed(2) : '0.00';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-10">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={tutor.avatarUrl || undefined} alt={tutor.name} />
              <AvatarFallback className="text-4xl">{tutor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <h1 className="text-4xl font-bold">{tutor.name}</h1>
              <div className="flex items-center text-muted-foreground mt-2 space-x-4">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1.5" />
                  <span className="font-semibold text-foreground text-lg mr-1">{tutor.averageRating.toFixed(1)}</span>
                  <span>({tutor.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>Usually responds in 1 hour</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {tutor.subjects.map((subject: string) => (
                  <Badge key={subject} variant="secondary" className="text-sm px-3 py-1">{subject}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Bio */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">About me</h2>
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
              {tutor.bio ? (
                <p className="whitespace-pre-wrap leading-relaxed">{tutor.bio}</p>
              ) : (
                <p className="italic">This tutor hasn't written a bio yet.</p>
              )}
            </div>
          </section>

          {/* Availability Grid */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Availability</h2>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(day => (
                <div key={day} className="flex flex-col gap-2">
                  <div className="text-center font-medium text-sm py-2 bg-muted rounded-md">{day}</div>
                  <div className="bg-primary/10 text-primary text-center text-xs py-3 rounded-md font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">Morn</div>
                  <div className="bg-muted text-muted-foreground text-center text-xs py-3 rounded-md cursor-not-allowed">Aft</div>
                  <div className="bg-primary/10 text-primary text-center text-xs py-3 rounded-md font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">Eve</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Select a slot to request a session. Times are shown in your local timezone.
            </p>
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Student Reviews</h2>
            {tutor.reviews && tutor.reviews.length > 0 ? (
              <div className="space-y-6">
                {tutor.reviews.map((review: any) => (
                  <div key={review.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-center mb-3">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={review.avatarUrl || undefined} />
                        <AvatarFallback>{review.studentName[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{review.studentName}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                          <div className="flex mr-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                            ))}
                          </div>
                          {new Date(review.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet.</p>
            )}
          </section>
        </div>

        {/* Sidebar Sticky Booking Card */}
        <div className="w-full md:w-80 shrink-0">
          <div className="sticky top-6 border rounded-xl p-6 bg-card shadow-sm">
            <div className="flex items-baseline mb-6">
              <span className="text-4xl font-bold">${tutor.hourlyRate}</span>
              <span className="text-muted-foreground ml-2">/ hour</span>
            </div>
            
            <div className="space-y-3">
              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 text-lg w-full">
                  Book a session
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Book a session with {tutor.name}</DialogTitle>
                    <DialogDescription>
                      Select a date, time, and duration for your tutoring session.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                        disabled={(d) => d < new Date()}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                        <Label>Duration</Label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
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

                  <DialogFooter className="flex-col sm:flex-col gap-2">
                    <div className="flex justify-between w-full font-medium pb-2 border-b">
                      <span>Total Price:</span>
                      <span>${totalPrice}</span>
                    </div>
                    <Button 
                      className="w-full mt-2" 
                      onClick={() => bookMutation.mutate()} 
                      disabled={bookMutation.isPending || !date}
                    >
                      {bookMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full h-12 text-lg group" onClick={() => setIsChatOpen(true)}>
                <MessageCircle className="w-5 h-5 mr-2 group-hover:text-primary transition-colors" />
                Send a message
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t text-sm text-center text-muted-foreground">
              You won't be charged yet.
            </div>
          </div>
        </div>

      </div>

      <ChatDrawer 
        open={isChatOpen} 
        onOpenChange={setIsChatOpen} 
        defaultUserId={tutor?.userId} 
        defaultUserName={tutor?.name} 
      />
    </div>
  );
};
