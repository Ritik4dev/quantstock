'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Bell, User as UserIcon, ShieldCheck } from 'lucide-react';

export default function Header() {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-[#151C28]/80 backdrop-blur-md border-b border-[#222D3F] px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Live PostgreSQL Engine Connected
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-xl bg-[#1E2738] text-slate-400 hover:text-slate-200 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5" />
        </button>

        <div className="h-5 w-[1px] bg-[#222D3F]" />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-slate-200">{user?.name || 'Retail Manager'}</div>
            <div className="text-xs text-slate-400">{user?.email || 'authenticated'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
