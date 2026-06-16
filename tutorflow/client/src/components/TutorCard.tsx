"use client";

import { Star, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface TutorCardProps {
  tutor: {
    id: string;
    name: string;
    avatarUrl: string | null;
    subjects: string[];
    hourlyRate: number;
    averageRating: number;
    reviewCount: number;
  };
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
}

import { useRouter } from 'next/navigation';

/* Deterministic color from tutor name — keeps it consistent across renders */
const TUTOR_COLORS = [
  { from: '#1e3a5f', to: '#7c3aed' },
  { from: '#0f766e', to: '#2563eb' },
  { from: '#9333ea', to: '#ec4899' },
  { from: '#b91c1c', to: '#f59e0b' },
  { from: '#1d4ed8', to: '#06b6d4' },
  { from: '#059669', to: '#2dd4bf' },
  { from: '#7c3aed', to: '#f43f5e' },
  { from: '#0369a1', to: '#8b5cf6' },
];

function getTutorColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TUTOR_COLORS[Math.abs(hash) % TUTOR_COLORS.length];
}

export const TutorCard = ({ tutor, isFavorited: initialIsFavorited = false, onFavoriteToggle }: TutorCardProps) => {
  const router = useRouter();
  const { user, favoritedTutorIds, setFavoritedTutorIds } = useAuthStore();
  const color = getTutorColor(tutor.name);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || favoritedTutorIds?.includes(tutor.id) || false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIsFavorited === false && favoritedTutorIds) {
      setIsFavorited(favoritedTutorIds.includes(tutor.id));
    }
  }, [favoritedTutorIds, tutor.id, initialIsFavorited]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    
    setIsLoading(true);
    try {
      const newState = !isFavorited;
      if (newState) {
        await api.post(`/api/tutors/${tutor.id}/favorite`).catch((e: any) => {
          if (e.response?.status !== 400) throw e;
        });
        if (favoritedTutorIds) setFavoritedTutorIds([...favoritedTutorIds, tutor.id]);
      } else {
        await api.delete(`/api/tutors/${tutor.id}/favorite`).catch((e: any) => {
          if (e.response?.status !== 404) throw e;
        });
        if (favoritedTutorIds) setFavoritedTutorIds(favoritedTutorIds.filter(id => id !== tutor.id));
      }
      setIsFavorited(newState);
      if (onFavoriteToggle) {
        onFavoriteToggle(tutor.id, newState);
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="group h-full flex flex-col border border-border/30 shadow-card hover:shadow-elevated transition-all duration-500 rounded-2xl overflow-hidden bg-card hover:-translate-y-1.5">
      {/* Colored header banner */}
      <div
        className="relative h-28 transition-all duration-500 group-hover:h-32"
        style={{
          background: `linear-gradient(135deg, ${color.from}dd 0%, ${color.to}bb 100%)`,
        }}
      >
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), 
                            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)`,
        }} />
        
        {/* Favorite Button */}
        {user?.role !== 'TUTOR' && (
          <button 
            onClick={handleFavoriteClick}
            disabled={isLoading}
          className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
            isFavorited 
              ? 'bg-white shadow-lg scale-105' 
              : 'bg-white/20 hover:bg-white/40 border border-white/30'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart 
            className={`w-5 h-5 transition-all duration-300 ${
              isFavorited ? 'fill-rose-500 text-rose-500' : 'text-white'
            }`} 
          />
        </button>
        )}
      </div>
      
      <div className="px-6 -mt-12 flex-1 flex flex-col relative z-10">
        <div className="relative mb-4 inline-block">
          <Avatar className="h-[88px] w-[88px] border-[3px] border-card shadow-lg ring-2 ring-black/5 group-hover:ring-primary/20 transition-all duration-300">
            <AvatarImage src={tutor.avatarUrl || undefined} alt={tutor.name} />
            <AvatarFallback
              className="text-white font-bold text-xl"
              style={{
                background: `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`,
              }}
            >
              {tutor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors duration-300">{tutor.name}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-amber-700 font-bold text-xs">{tutor.averageRating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-xs">({tutor.reviewCount} reviews)</span>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tutor.subjects.slice(0, 3).map((subject) => (
            <Badge 
              key={subject} 
              variant="secondary" 
              className="border-none px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 text-white/90 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${color.from}cc 0%, ${color.to}99 100%)`,
              }}
            >
              {subject}
            </Badge>
          ))}
          {tutor.subjects.length > 3 && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium border-border/40 text-muted-foreground">
              +{tutor.subjects.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      <CardFooter className="px-6 py-5 flex items-center justify-between mt-auto bg-muted/20 border-t border-border/15">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">Hourly Rate</span>
          <div className="font-black text-2xl text-foreground mt-0.5">
            ${tutor.hourlyRate}<span className="text-sm font-medium text-muted-foreground">/hr</span>
          </div>
        </div>
        <Button 
          className="rounded-xl px-6 font-bold shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-white"
          style={{
            background: `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`,
          }}
          onClick={() => router.push(`/tutors/${tutor.id}`)}
        >
          View Profile
        </Button>
      </CardFooter>
    </Card>
  );
};
