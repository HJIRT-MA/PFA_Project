import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '@tutorflow/shared';

interface AuthState {
  user: User | null;
  role: Role | null;
  favoritedTutorIds: string[];
  setUser: (user: User) => void;
  logout: () => void;
  setFavoritedTutorIds: (ids: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      favoritedTutorIds: [],
      setUser: (user) => set({ user, role: user.role }),
      logout: () => set({ user: null, role: null, favoritedTutorIds: [] }),
      setFavoritedTutorIds: (ids) => set({ favoritedTutorIds: ids }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
