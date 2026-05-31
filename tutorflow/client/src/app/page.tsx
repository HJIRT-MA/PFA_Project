"use client";
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TutorCard } from '@/components/TutorCard';
import type { TutorCardProps } from '@/components/TutorCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';

const SUBJECTS = ['Math', 'Physics', 'English', 'History', 'CS', 'French', 'Spanish', 'Biology', 'Chemistry', 'Economics'];

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [maxRate, setMaxRate] = useState([parseInt(searchParams.get('maxRate') || '100')]);
  const [minRating, setMinRating] = useState(parseFloat(searchParams.get('minRating') || '0'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'rating');

  // Debounce filters to update URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (subject) params.set('subject', subject);
    else params.delete('subject');
    
    if (maxRate[0] < 100) params.set('maxRate', maxRate[0].toString());
    else params.delete('maxRate');
    
    if (minRating > 0) params.set('minRating', minRating.toString());
    else params.delete('minRating');
    
    if (sortBy !== 'rating') params.set('sortBy', sortBy);
    else params.delete('sortBy');
    
    const newQuery = params.toString();
    const currentQuery = new URLSearchParams(window.location.search).toString();
    
    if (newQuery !== currentQuery) {
      const query = newQuery ? `?${newQuery}` : '';
      router.replace(`${pathname}${query}`, { scroll: false });
    }
  }, [subject, maxRate, minRating, sortBy, pathname, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tutors', subject, maxRate[0], minRating, sortBy],
    queryFn: async () => {
      const res = await api.get('/api/tutors', {
        params: {
          subject: subject || undefined,
          maxRate: maxRate[0] === 100 ? undefined : maxRate[0],
          minRating: minRating === 0 ? undefined : minRating,
          sortBy
        }
      });
      return res.data;
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2f5a 40%, #3b1c3a 100%)' }}>
        {/* Decorative floating orbs */}
        <div className="absolute top-8 left-[10%] w-80 h-80 rounded-full bg-blue-500/15 blur-3xl animate-float pointer-events-none" />
        <div className="absolute -bottom-20 right-[5%] w-96 h-96 rounded-full bg-rose-500/10 blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative container mx-auto px-6 py-20 md:py-28 text-center">
          <div className="animate-fade-in-up">
            <p className="text-sm font-semibold tracking-widest uppercase text-blue-300/80 mb-4">Trusted by 1,000+ students</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-[1.1] text-white">
              Find your <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-rose-300 bg-clip-text text-transparent">perfect tutor</span>
            </h1>
            <p className="text-base md:text-lg text-blue-200/60 max-w-xl mx-auto leading-relaxed">
              Connect with expert tutors for 1-on-1 lessons in any subject. 
              Accelerate your learning journey with personalized guidance.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="w-10 h-10 rounded-full border-2 border-[#1a2f5a] overflow-hidden relative shadow-lg">
                    <img src={`/avatars/${num}.png`} alt={`Tutor ${num}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
                <span className="text-blue-200/60 text-xs ml-1">4.9 avg rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sliding Marquee */}
        <div className="relative mt-8 mb-12 flex overflow-hidden w-full opacity-80">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0f1f3d] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#3b1c3a] to-transparent z-10" />
          <div className="flex animate-marquee whitespace-nowrap min-w-max gap-4 items-center">
            {/* Repeat the content twice for seamless infinite scrolling */}
            {[1, 2].map((set) => (
              <div key={set} className="flex gap-4 items-center px-2">
                {[1, 2, 3, 4, 1, 2].map((num, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pr-6 pl-2 py-2 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      <img src={`/avatars/${num}.png`} alt="Tutor" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-white text-sm font-bold">Tutor {['Sarah', 'Michael', 'Emma', 'David', 'Sarah', 'Michael'][i]}</span>
                      <span className="text-blue-200/60 text-xs">{['Math', 'Physics', 'English', 'CS', 'Math', 'Physics'][i]} Expert</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-20 bg-card rounded-2xl border border-border/30 shadow-card overflow-hidden">
              <div className="p-6 space-y-8">
                <h2 className="font-bold text-lg flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                  </div>
                  Filters
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70">Subject</Label>
                    <select 
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-border/50 bg-background/80 px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all duration-200 cursor-pointer"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="">All subjects</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70">Max Hourly Rate</Label>
                      <span className="text-sm font-bold text-primary tabular-nums">${maxRate[0]}</span>
                    </div>
                    <Slider 
                      value={maxRate} 
                      onValueChange={(val) => setMaxRate(Array.isArray(val) ? val as number[] : [val as number])} 
                      max={100} 
                      step={5} 
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70">Min Rating</Label>
                      <span className="text-sm font-bold text-primary tabular-nums">{minRating}+ Stars</span>
                    </div>
                    <Slider 
                      value={[minRating]} 
                      onValueChange={(val) => setMinRating(Array.isArray(val) ? val[0] : (val as number))} 
                      max={5} 
                      step={0.5} 
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70">Sort By</Label>
                    <select 
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-border/50 bg-background/80 px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all duration-200 cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="rating">Highest Rating</option>
                      <option value="reviews">Most Reviews</option>
                      <option value="price">Lowest Price</option>
                    </select>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      variant="ghost" 
                      className="w-full text-muted-foreground hover:text-destructive rounded-xl transition-all duration-200" 
                      onClick={() => {
                        setSubject('');
                        setMaxRate([100]);
                        setMinRating(0);
                        setSortBy('rating');
                      }}
                    >
                      Reset All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-1">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Search Results</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.total !== undefined ? `${data.total} qualified tutors found` : 'Searching...'}
                </p>
              </div>
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-4 bg-card border border-border/30 rounded-2xl p-4 shadow-card">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <div className="space-y-3 px-2">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="text-center py-20 bg-destructive/5 rounded-2xl border border-destructive/10 shadow-card">
                <p className="text-destructive font-semibold">Failed to load tutors.</p>
                <Button variant="link" className="mt-2" onClick={() => window.location.reload()}>Try again</Button>
              </div>
            )}

            {data?.tutors && data.tutors.length === 0 && (
              <div className="text-center py-24 bg-card border border-border/30 rounded-2xl shadow-card animate-fade-in-up">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">No tutors found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto px-6 text-sm leading-relaxed">
                  We couldn't find any tutors matching your filters. Try expanding your search or resetting filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-8 rounded-xl px-8 border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200"
                  onClick={() => {
                    setSubject('');
                    setMaxRate([100]);
                    setMinRating(0);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {data?.tutors && data.tutors.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
                {data.tutors.map((tutor: TutorCardProps['tutor'], index: number) => (
                  <div key={tutor.id} className={`animate-fade-in-up stagger-${Math.min(index + 1, 9)}`}>
                    <TutorCard tutor={tutor} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
