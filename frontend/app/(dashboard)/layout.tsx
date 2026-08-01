'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/authService';
import { businessService } from '@/services/businessService';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setAuth, isAuthenticated, token, setActiveBusiness } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        router.push('/login');
        return;
      }

      try {
        const user = await authService.getMe();
        const businesses = await businessService.getBusinesses();
        const activeBiz = businesses.length > 0 ? businesses[0] : null;

        setAuth(storedToken, user, activeBiz);
        setLoading(false);
      } catch (err) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    };

    initAuth();
  }, [router, setAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Connecting to Quadstock Backend Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F17]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
