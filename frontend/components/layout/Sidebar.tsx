'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  UploadCloud,
  BarChart3,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  Bot,
  FileText,
  Store,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'Suppliers', href: '/suppliers', icon: Users },
  { name: 'CSV Upload', href: '/upload', icon: UploadCloud },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Demand Forecast', href: '/forecast', icon: TrendingUp },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
  { name: 'Risk Scorecard', href: '/risk', icon: ShieldAlert },
  { name: 'AI Business Copilot', href: '/chat', icon: Bot },
  { name: 'Reports & Briefs', href: '/reports', icon: FileText },
  { name: 'AI Discovery', href: '/ai-discovery', icon: Store },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, activeBusiness } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#151C28] border-r border-[#222D3F] flex flex-col h-screen sticky top-0 z-40">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#222D3F] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-lg">Quadstock AI</h1>
          <p className="text-xs text-slate-400 font-medium">Retail Management</p>
        </div>
      </div>

      {/* Store Context Badge */}
      <div className="px-4 py-3 bg-[#0E1420] border-b border-[#222D3F]">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Active Business</div>
        <div className="text-sm font-medium text-slate-200 truncate">
          {activeBusiness ? activeBusiness.business_name : 'Retail Store Hub'}
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E2738]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer & Logout */}
      <div className="p-4 border-t border-[#222D3F]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
