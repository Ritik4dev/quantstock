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
  Settings,
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
  { name: 'Settings', href: '/settings', icon: Settings },
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
    <aside className="w-[280px] min-w-[280px] max-w-[280px] bg-[#101010] border-r border-white/5 flex flex-col h-screen sticky top-0 z-40">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C6FF00] to-[#6B8E00] flex items-center justify-center text-black shadow-[0_0_15px_rgba(198,255,0,0.2)] font-bold">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-white tracking-tight text-lg">QuantStock AI</h1>
          <p className="text-[11px] text-[#8E8E8E] font-medium tracking-wide">Retail Operating System</p>
        </div>
      </div>

      {/* Store Context Badge */}
      <div className="px-5 py-3.5 bg-[#151515]/60 border-b border-white/5">
        <div className="text-[10px] uppercase tracking-wider text-[#555555] font-bold mb-0.5">Active Business</div>
        <div className="text-xs font-semibold text-white truncate">
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
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#C6FF00]/12 to-transparent text-[#C6FF00] border-l-4 border-[#C6FF00] font-bold shadow-[0_0_15px_rgba(198,255,0,0.05)]'
                  : 'text-[#8E8E8E] hover:text-white hover:bg-white/[0.025] hover:border-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#C6FF00]' : 'text-[#8E8E8E]'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#C6FF00] shadow-[0_0_8px_#C6FF00]" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer & Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-[#FF5B5B] hover:bg-[#FF5B5B]/10 transition-colors border border-transparent hover:border-[#FF5B5B]/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
