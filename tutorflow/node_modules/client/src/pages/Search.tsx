import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TutorCard } from '@/components/TutorCard';
import type { TutorCardProps } from '@/components/TutorCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';

const SUBJECTS = ['Math', 'Physics', 'English', 'History', 'CS', 'French', 'Spanish', 'Biology', 'Chemistry', 'Economics'];

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [maxRate, setMaxRate] = useState([parseInt(searchParams.get('maxRate') || '100')]);
  const [minRating, setMinRating] = useState(parseFloat(searchParams.get('minRating') || '0'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'rating');

  // Debounce filters to update URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (maxRate[0] < 100) params.set('maxRate', maxRate[0].toString());
    if (minRating > 0) params.set('minRating', minRating.toString());
    if (sortBy !== 'rating') params.set('sortBy', sortBy);
    setSearchParams(params, { replace: true });
  }, [subject, maxRate, minRating, sortBy, setSearchParams]);

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
      <div className="bg-primary/5 border-b py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Find your perfect tutor</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with expert tutors for 1-on-1 lessons in any subject. 
            Accelerate your learning journey with personalized guidance.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-24 space-y-8 bg-card p-6 rounded-2xl border shadow-sm">
              <div>
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                  Filters
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Subject</Label>
                    <select 
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="">All subjects</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Max Hourly Rate</Label>
                      <span className="text-sm font-bold text-primary">${maxRate[0]}</span>
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
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Min Rating</Label>
                      <span className="text-sm font-bold text-primary">{minRating}+ Stars</span>
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
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Sort By</Label>
                    <select 
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
                      className="w-full text-muted-foreground hover:text-destructive" 
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
                <h3 className="text-xl font-bold">Search Results</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.total !== undefined ? `${data.total} qualified tutors found` : 'Searching...'}
                </p>
              </div>
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-4 bg-card border rounded-2xl p-4">
                    <Skeleton className="h-[180px] w-full rounded-xl" />
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="text-center py-20 bg-destructive/5 rounded-3xl border border-destructive/10">
                <p className="text-destructive font-semibold">Failed to load tutors.</p>
                <Button variant="link" onClick={() => window.location.reload()}>Try again</Button>
              </div>
            )}

            {data?.tutors && data.tutors.length === 0 && (
              <div className="text-center py-24 bg-card border rounded-3xl shadow-sm">
                <div className="w-20 h-20 mb-6 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">No tutors found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto px-6">
                  We couldn't find any tutors matching your filters. Try expanding your search or resetting filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-8 rounded-full px-8"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {data.tutors.map((tutor: TutorCardProps['tutor']) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
