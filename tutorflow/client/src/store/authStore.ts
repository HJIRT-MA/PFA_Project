import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '@tutorflow/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  favoritedTutorIds: string[];
  setUser: (user: User, token: string) => void;
  logout: () => void;
  setFavoritedTutorIds: (ids: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      favoritedTutorIds: [],
      setUser: (user, token) => set({ user, token, role: user.role }),
      logout: () => set({ user: null, token: null, role: null, favoritedTutorIds: [] }),
      setFavoritedTutorIds: (ids) => set({ favoritedTutorIds: ids }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
