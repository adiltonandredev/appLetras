import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { User, UserRole } from '@rl/types';

interface AuthState {
  user: User | null;
  role: UserRole;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setSession: (session: Session) => void;
  setLoading: (v: boolean) => void;
  clearAuth: () => void;
  /** @deprecated use clearAuth */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: 'padrao',
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => set({ user: null, role: 'padrao', session: null }),
      logout: () => set({ user: null, role: 'padrao', session: null }),
    }),
    {
      name: 'auth-storage',
      // Use default memory storage — SecureStore handles Supabase tokens separately
      partialize: (state) => ({ role: state.role }),
    }
  )
);
