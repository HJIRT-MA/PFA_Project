"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, Suspense } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { usePathname, useRouter } from 'next/navigation';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuthStore();
  const [isHydrating, setIsHydrating] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Attempt to fetch the user session on load
    api.get('/api/auth/me')
      .then(res => {
        setUser(res.data.user);
      })
      .catch((err) => {
        // If 401, they are not logged in.
        const currentUser = useAuthStore.getState().user;
        if (err.response?.status === 401 && currentUser) {
          logout();
        }
      })
      .finally(() => {
        setIsHydrating(false);
      });
  }, [setUser, logout]); // Removed 'user' from deps to prevent infinite loop

  const isPublicRoute = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!isHydrating && !user && !isPublicRoute) {
      router.push('/login');
    }
  }, [isHydrating, user, isPublicRoute, router]);

  // Prevent rendering protected pages until we know who the user is or while redirecting
  if (isHydrating || (!user && !isPublicRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <h2 className="text-2xl font-black tracking-tight text-gradient">TutorFlow</h2>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
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
        <AuthProvider>
          <div className="min-h-screen flex flex-col font-sans antialiased relative">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
