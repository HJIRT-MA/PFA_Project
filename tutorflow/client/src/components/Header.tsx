"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { NotificationBell } from './NotificationBell';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { LogOut, LayoutDashboard, Settings, MessageCircle, Moon, Sun, Heart } from 'lucide-react';
import { ChatDrawer } from './ChatDrawer';

export function Header() {
  const { user, logout, setFavoritedTutorIds } = useAuthStore();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkSet = localStorage.getItem('theme') === 'dark' || 
                        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkSet);
      if (isDarkSet) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (user && user.role === 'STUDENT') {
      api.get('/api/users/me/favorites').then(res => {
        const ids = res.data.favorites.map((t: any) => t.id);
        setFavoritedTutorIds(ids);
      }).catch(err => console.error('Failed to fetch favorites', err));
    }
  }, [user, setFavoritedTutorIds]);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="px-6 py-3 border-b border-border/40 flex justify-between items-center sticky top-0 glass z-50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-10">
        <h1 
          className="text-2xl font-black tracking-tight text-gradient cursor-pointer hover:opacity-80 transition-all duration-200 active:scale-95" 
          onClick={() => router.push('/')}
        >
          TutorFlow
        </h1>
        <nav className="hidden md:flex items-center gap-8">
           {user && (
            <Link href="/welcome" className="relative text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 group flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:animate-pulse-soft transition-all" />
              Home
              <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {user && (
             <Link href="/" className="relative text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 group flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary group-hover:animate-pulse-soft transition-all" />
            Find Tutors
            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
          </Link>
          )}
        
       
          {user && (
            <Link href="/dashboard" className="relative text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 group flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:animate-pulse-soft transition-all" />
              Dashboard
              <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {user && user.role === 'STUDENT' && (
            <Link href="/dashboard/favorites" className="relative text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 group flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 group-hover:animate-pulse-soft transition-all" />
              Favorites
              <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {user && user.role === 'TUTOR' && (
            <Link href={`/tutors/${user.id}`} className="relative text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 group flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:animate-pulse-soft transition-all" />
                Profile
              <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
        </nav>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-full transition-colors duration-200 mr-1" onClick={toggleDarkMode}>
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        {user ? (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary rounded-full transition-colors duration-200" onClick={() => setIsChatOpen(true)}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            <NotificationBell onOpenChat={() => setIsChatOpen(true)} />
            <div className="h-6 w-px bg-border/50 mx-1" />
            
            <Popover>
              <PopoverTrigger className="relative h-10 w-10 rounded-full p-0 border-2 border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden ring-2 ring-primary/10 hover:ring-primary/25 hover:scale-105">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.email} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10 text-primary font-bold">
                      {user.email.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 rounded-2xl shadow-elevated mt-2 mr-4 overflow-hidden border-border/40 animate-fade-in-up" align="end">
                <div className="p-4 border-b border-border/40 mb-2">
                  <p className="text-sm font-bold text-foreground truncate">{user.email}</p>
                  <p className="text-[10px] font-bold text-gradient uppercase tracking-widest mt-1">{user.role}</p>
                </div>
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl font-semibold h-11 gap-3 hover:bg-primary/5 hover:text-primary transition-all duration-200" 
                    onClick={() => router.push('/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                  {user.role === 'STUDENT' && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-xl font-semibold h-11 gap-3 hover:bg-primary/5 hover:text-primary transition-all duration-200" 
                      onClick={() => router.push('/dashboard/favorites')}
                    >
                      <Heart className="w-4 h-4" />
                      Favorites
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl font-semibold h-11 gap-3 hover:bg-primary/5 hover:text-primary transition-all duration-200" 
                    onClick={() => router.push(user.role === 'TUTOR' ? '/settings/profile' : '/settings/notifications')}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <div className="h-px bg-border/40 my-1 mx-2" />
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl font-semibold h-11 gap-3 text-destructive hover:bg-destructive/5 hover:text-destructive transition-all duration-200"
                    onClick={async () => {
                      try {
                        await api.post('/api/auth/logout');
                      } catch (e) {
                        console.error('Logout API error:', e);
                      }
                      logout();
                      router.push('/login');
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-xl font-semibold px-6 hover:bg-primary/5 transition-all duration-200" onClick={() => router.push('/login')}>Login</Button>
            <Button className="rounded-xl font-bold px-6 shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 transition-all duration-300" onClick={() => router.push('/register')}>Sign up</Button>
          </div>
        )}
      </div>

      <ChatDrawer 
        open={isChatOpen} 
        onOpenChange={setIsChatOpen} 
      />
    </header>
  );
}
