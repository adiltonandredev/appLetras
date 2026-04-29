import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@rl/types';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, role: null }),
    }),
    {
      name: 'rl-auth',
      partialize: (state) => ({ user: state.user, role: state.role }),
    }
  )
);
