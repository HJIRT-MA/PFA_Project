"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const { user, setUser, logout } = useAuthStore();
  const token = searchParams.get('token');
  const [isInitializing, setIsInitializing] = useState(true);

  const isPublicRoute = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (token) {
      useAuthStore.setState({ token });
      api.get('/api/auth/me')
        .then(res => {
          setUser(res.data.user, token);
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete('token');
          const newUrl = window.location.pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
          window.history.replaceState({}, '', newUrl);
          setIsInitializing(false);
        })
        .catch(() => {
          logout();
          setIsInitializing(false);
          router.push('/login');
        });
    } else {
      const currentToken = useAuthStore.getState().token;
      if (currentToken) {
         api.get('/api/auth/me')
          .then(res => {
             setUser(res.data.user, currentToken);
             setIsInitializing(false);
          })
          .catch(() => {
             logout();
             setIsInitializing(false);
          });
      } else {
        setIsInitializing(false);
      }
    }
  }, [token, router, setUser, logout]); 

  const hasToken = useAuthStore(state => state.token);

  useEffect(() => {
    if (!isInitializing) {
      if (!hasToken || !user) {
        if (!isPublicRoute) {
          router.replace('/login');
        }
      } else {
        if (isPublicRoute) {
          router.replace('/');
        }
      }
    }
  }, [isInitializing, hasToken, user, isPublicRoute, router]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <h2 className="text-2xl font-black tracking-tight text-gradient">TutorFlow</h2>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Prevent rendering children if not authenticated on a protected route
  if (!hasToken || !user) {
    if (!isPublicRoute) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in-up">
            <h2 className="text-2xl font-black tracking-tight text-gradient">TutorFlow</h2>
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      );
    }
  } else {
    // Prevent rendering login/register if already authenticated
    if (isPublicRoute) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in-up">
            <h2 className="text-2xl font-black tracking-tight text-gradient">TutorFlow</h2>
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in-up">
            <h2 className="text-2xl font-black tracking-tight text-gradient">TutorFlow</h2>
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      }>
        <AuthInitializer>
          <div className="min-h-screen flex flex-col font-sans antialiased relative">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthInitializer>
      </Suspense>
    </QueryClientProvider>
  );
}
