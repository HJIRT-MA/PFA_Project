"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TutorCard } from '@/components/TutorCard';
import { Loader2, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchFavorites = async () => {
      try {
        const res = await api.get('/api/users/me/favorites');
        setFavorites(res.data.favorites || []);
      } catch (error) {
        console.error('Failed to fetch favorites', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user, router]);

  const handleFavoriteToggle = (id: string, isFavorited: boolean) => {
    if (!isFavorited) {
      setFavorites(prev => prev.filter(t => t.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-500">
          <Heart className="w-6 h-6 fill-rose-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">My Favorite Tutors</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Tutors you've saved for easy access.</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[40vh] shadow-sm">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Heart className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No favorites yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You haven't saved any tutors yet. Browse the marketplace and click the heart icon to save your favorite tutors here.
          </p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            Find Tutors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map(tutor => (
            <TutorCard 
              key={tutor.id} 
              tutor={tutor} 
              isFavorited={true}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
