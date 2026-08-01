import { create } from 'zustand';
import { User, Business } from '@/types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  activeBusiness: Business | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User, business?: Business | null) => void;
  setActiveBusiness: (business: Business | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  activeBusiness: null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,

  setAuth: (token, user, business = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ token, user, activeBusiness: business, isAuthenticated: true });
  },

  setActiveBusiness: (business) => {
    set({ activeBusiness: business });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ token: null, user: null, activeBusiness: null, isAuthenticated: false });
  },
}));
