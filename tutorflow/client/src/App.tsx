import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { api } from './lib/api';

import { NotificationBell } from './components/NotificationBell';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { User, LogOut, LayoutDashboard, Settings } from 'lucide-react';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(!!token);

  useEffect(() => {
    if (token) {
      useAuthStore.setState({ token });
      api.get('/api/auth/me')
        .then(res => {
          setUser(res.data.user, token);
          searchParams.delete('token');
          setSearchParams(searchParams);
          setIsInitializing(false);
        })
        .catch(() => {
          useAuthStore.getState().logout();
          setIsInitializing(false);
          navigate('/login');
        });
    }
  }, [token]);

  if (isInitializing) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased relative">
      <header className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-background/70 backdrop-blur-xl z-50 border-primary/10 shadow-sm">
        <div className="flex items-center gap-10">
          <h1 
            className="text-2xl font-black tracking-tight text-primary cursor-pointer hover:opacity-80 transition-all active:scale-95" 
            onClick={() => navigate('/')}
          >
            TutorFlow
          </h1>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Find Tutors
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="h-6 w-[1px] bg-border mx-1" />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 border-2 border-primary/10 hover:border-primary/30 transition-all overflow-hidden">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.email} />
                      <AvatarFallback className="bg-primary/5 text-primary font-bold">
                        {user.email.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 rounded-3xl border-none shadow-2xl mt-2 mr-4 overflow-hidden" align="end">
                  <div className="p-4 border-b mb-2">
                    <p className="text-sm font-black text-foreground truncate">{user.email}</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">{user.role}</p>
                  </div>
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-xl font-bold h-11 gap-3 hover:bg-primary/5 hover:text-primary transition-all" 
                      onClick={() => navigate('/dashboard')}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-xl font-bold h-11 gap-3 hover:bg-primary/5 hover:text-primary transition-all" 
                      onClick={() => navigate('/settings/notifications')}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Button>
                    <div className="h-px bg-border my-1 mx-2" />
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-xl font-bold h-11 gap-3 text-destructive hover:bg-destructive/5 hover:text-destructive transition-all" 
                      onClick={() => logout()}
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="rounded-xl font-bold px-6" onClick={() => navigate('/login')}>Login</Button>
              <Button className="rounded-xl font-black px-6 shadow-lg shadow-primary/20" onClick={() => navigate('/register')}>Sign up</Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-12 bg-muted/20 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm font-bold text-muted-foreground/60 tracking-tight text-center">© 2026 TutorFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
