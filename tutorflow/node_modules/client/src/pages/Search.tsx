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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 space-y-8 shrink-0">
          <div>
            <h2 className="font-semibold text-lg mb-4">Filters</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">All subjects</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <Label>Max Hourly Rate</Label>
                  <span className="text-sm text-muted-foreground">${maxRate[0]}</span>
                </div>
                <Slider 
                  value={maxRate} 
                  onValueChange={(val) => setMaxRate(Array.isArray(val) ? val as number[] : [val as number])} 
                  max={100} 
                  step={5} 
                />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <Label>Minimum Rating</Label>
                  <span className="text-sm text-muted-foreground">{minRating} Stars</span>
                </div>
                <Slider 
                  value={[minRating]} 
                  onValueChange={(val) => setMinRating(Array.isArray(val) ? val[0] : (val as number))} 
                  max={5} 
                  step={0.5} 
                />
              </div>

              <div className="space-y-2 pt-4">
                <Label>Sort By</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setSubject('');
                    setMaxRate([100]);
                    setMinRating(0);
                    setSortBy('rating');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Find a Tutor</h1>
            <p className="text-muted-foreground">
              {data?.total !== undefined ? `${data.total} tutors found` : 'Searching...'}
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[125px] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-12 text-destructive">
              Failed to load tutors. Please try again later.
            </div>
          )}

          {data?.tutors && data.tutors.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No tutors found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any tutors matching your current filters. Try adjusting your search criteria or clearing filters.
              </p>
            </div>
          )}

          {data?.tutors && data.tutors.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.tutors.map((tutor: TutorCardProps['tutor']) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
