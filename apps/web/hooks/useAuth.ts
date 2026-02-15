// apps/web/hooks/useAuth.ts
'use client';

import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      localStorage.setItem('token', response.accessToken);
      set({
        user: response.user,
        token: response.accessToken,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(email, password, name);
      localStorage.setItem('token', response.accessToken);
      set({
        user: response.user,
        token: response.accessToken,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token });
  },
}));