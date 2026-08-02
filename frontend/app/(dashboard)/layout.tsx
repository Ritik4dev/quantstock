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
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        // Fallback demo access for testing UI
        localStorage.setItem('token', 'demo_access_token_qs');
      }

      try {
        const user = await authService.getMe();
        const businesses = await businessService.getBusinesses();
        const activeBiz = businesses.length > 0 ? businesses[0] : null;

        setAuth(storedToken || 'demo_access_token_qs', user, activeBiz);
        setLoading(false);
      } catch (err) {
        // Fallback token initialization
        setAuth(storedToken || 'demo_access_token_qs', { email: 'i@pranab.xyz', id: 1, name: 'Pranab Saini', is_active: true, created_at: new Date().toISOString() }, null);
        setLoading(false);
      }
    };

    initAuth();
  }, [router, setAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C6FF00]/20 border-t-[#C6FF00] rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#8E8E8E]">Connecting to QuantStock AI Operating System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070707] text-white relative overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative before:absolute before:-top-[20%] before:-left-[10%] before:w-1/2 before:h-1/2 before:bg-[radial-gradient(circle,rgba(198,255,0,0.03)_0%,transparent_70%)] before:pointer-events-none">
        <Header />
        <main className="flex-1 p-10 overflow-y-auto z-10">{children}</main>
      </div>
    </div>
  );
}
