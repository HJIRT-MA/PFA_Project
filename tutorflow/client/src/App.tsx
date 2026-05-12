import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { api } from './lib/api';

import { NotificationBell } from './components/NotificationBell';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(!!token);

  useEffect(() => {
    if (token) {
      // Temporarily set token in store so api interceptor picks it up
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-10">
        <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate('/')}>TutorFlow</h1>
        <div className="flex items-center gap-4">
          {user && <NotificationBell />}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
