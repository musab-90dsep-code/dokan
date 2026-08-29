'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, AuthUserData } from '@/lib/api';

export type UserRole = 'developer' | 'admin' | 'staff';

export interface AuthContextType {
  user: AuthUserData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  isDeveloper: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canCreateInvoice: boolean;
  canModifyData: boolean;
  login: (usernameOrPhone: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dokan_auth_token';
const USER_KEY = 'dokan_auth_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate from localStorage on client side after initial mount and sync with backend
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          
          // Verify with backend silently
          try {
            const freshUser = await api.auth.me();
            if (freshUser) {
              setUser(freshUser);
              localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            }
          } catch (e: any) {
            // If token invalid, clear state
            if (e?.message?.includes('Invalid token') || e?.message?.includes('401')) {
              setToken(null);
              setUser(null);
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          }
        } else {
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Error reading auth from localStorage:', e);
        setToken(null);
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Route Protection: Redirect to /login if unauthenticated
  useEffect(() => {
    if (!isInitialized) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [isInitialized, user, pathname, router]);

  const login = async (usernameOrPhone: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(usernameOrPhone, password);
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout().catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setIsLoading(false);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.me();
      if (userData) {
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  };

  // Determine computed role
  const role: UserRole = (user?.role as UserRole) || (user?.is_superuser ? 'developer' : 'admin');
  const isDeveloper = role === 'developer' || !!user?.is_superuser;
  const isAdmin = role === 'admin' || isDeveloper;
  const isStaff = role === 'staff' && !isAdmin && !isDeveloper;
  const isViewer = isStaff; // staff has view-only access

  // Specific Permission Rules:
  // 1. Developer (সর্বোচ্চ অ্যাক্সেস): Full access, can edit and delete invoices.
  // 2. Admin (অ্যাডমিন): Can create invoices, manage customers/suppliers/products/expenses/settings, but CANNOT edit or delete invoices.
  // 3. Staff (স্টাফ): View-only across the system, cannot create, edit, or delete anything.
  const canEditInvoice = isDeveloper;
  const canDeleteInvoice = isDeveloper;
  const canCreateInvoice = isAdmin || isDeveloper;
  const canModifyData = isAdmin || isDeveloper;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        role,
        isDeveloper,
        isAdmin,
        isStaff,
        isViewer,
        canEditInvoice,
        canDeleteInvoice,
        canCreateInvoice,
        canModifyData,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
