'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, AuthUserData } from '@/lib/api';

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface AuthContextType {
  user: AuthUserData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canCreateInvoice: boolean;
  canModifyData: boolean;
  login: (usernameOrPhone: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dokan_auth_token';
const USER_KEY = 'dokan_auth_user';

const DEFAULT_ADMIN: AuthUserData = {
  id: 1,
  username: 'admin',
  full_name: 'দোকান এডমিন',
  email: 'admin@dokan.com',
  phone: '01711000000',
  role: 'admin',
  role_display: 'অ্যাডমিন (Admin)',
  role_badge: '👑 অ্যাডমিন (সব ক্ষমতা)',
  is_superuser: true
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate from localStorage on client side after initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
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
    }, 0);
    return () => clearTimeout(timer);
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

  const switchDemoRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const password = `${targetRole}123`;
      await login(targetRole, password);
    } catch (e) {
      // Local fallback mock if backend network fails
      let mockUser: AuthUserData;
      if (targetRole === 'admin') {
        mockUser = {
          id: 1,
          username: 'admin',
          full_name: 'দোকান মালিক (এডমিন)',
          role: 'admin',
          role_display: 'অ্যাডমিন (Admin)',
          role_badge: '👑 অ্যাডমিন (সব ক্ষমতা)',
          is_superuser: true
        };
      } else if (targetRole === 'staff') {
        mockUser = {
          id: 2,
          username: 'staff',
          full_name: 'স্টাফ ম্যানেজার',
          role: 'staff',
          role_display: 'স্টাফ / ম্যানেজার',
          role_badge: '👔 স্টাফ (ইনভয়েস এডিট/ডিলিট বন্ধ)',
          is_superuser: false
        };
      } else {
        mockUser = {
          id: 3,
          username: 'viewer',
          full_name: 'রিপোর্ট ভিউয়ার',
          role: 'viewer',
          role_display: 'ভিউয়ার (Viewer)',
          role_badge: '👁️ ভিউয়ার (শুধুমাত্র দেখার অনুমতি)',
          is_superuser: false
        };
      }
      const fakeToken = `demo_${targetRole}_token`;
      setToken(fakeToken);
      setUser(mockUser);
      localStorage.setItem(TOKEN_KEY, fakeToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
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
  const role: UserRole = (user?.role as UserRole) || 'admin';
  const isAdmin = role === 'admin' || !!user?.is_superuser;
  const isStaff = role === 'staff';
  const isViewer = role === 'viewer';

  // Specific Permission Rules:
  // 1. Admin: Everything
  // 2. Staff: Can create invoices and edit non-invoices, but CANNOT edit or delete invoices!
  // 3. Viewer: Read-only, cannot edit or delete anything!
  const canEditInvoice = isAdmin;
  const canDeleteInvoice = isAdmin;
  const canCreateInvoice = isAdmin || isStaff;
  const canModifyData = isAdmin || isStaff;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        role,
        isAdmin,
        isStaff,
        isViewer,
        canEditInvoice,
        canDeleteInvoice,
        canCreateInvoice,
        canModifyData,
        login,
        logout,
        switchDemoRole,
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
