import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Category, CurrencyCode, User } from '../types.ts';

interface AppContextValue {
  route: string;
  navigate: (to: string) => void;
  user: User | null;
  token: string | null;
  authLoading: boolean;
  setSession: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  signOut: () => Promise<void>;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(() => {
    return window.location.pathname + window.location.search;
  });
  // Session token held strictly in React state memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('GHS');
  const [selectedCountry, setSelectedCountry] = useState<string>('Ghana');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(path, { ...init, headers });
    },
    [token]
  );

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // Ignore transient network failures
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const setSession = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (
      newUser.preferred_currency === 'GHS' ||
      newUser.preferred_currency === 'USD' ||
      newUser.preferred_currency === 'GBP' ||
      newUser.preferred_currency === 'CAD'
    ) {
      setCurrency(newUser.preferred_currency);
    }
    if (newUser.country) {
      setSelectedCountry(newUser.country);
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    if (
      updated.preferred_currency === 'GHS' ||
      updated.preferred_currency === 'USD' ||
      updated.preferred_currency === 'GBP' ||
      updated.preferred_currency === 'CAD'
    ) {
      setCurrency(updated.preferred_currency);
    }
    if (updated.country) {
      setSelectedCountry(updated.country);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      setToken(null);
      setUser(null);
      setAuthLoading(false);
    }
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        user,
        token,
        authLoading,
        setSession,
        updateUser,
        signOut,
        currency,
        setCurrency,
        selectedCountry,
        setSelectedCountry,
        categories,
        refreshCategories,
        apiFetch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
