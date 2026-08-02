'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ArrowRight, Lock, Mail, User as UserIcon, Store, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { businessService } from '@/services/businessService';
import { useAuthStore } from '@/store/useAuthStore';

import { formatApiError } from '@/utils/error';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Grocery Store');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Register User
      await authService.register({ name, email, password });

      // 2. Login to get JWT Token
      const loginRes = await authService.login({ email, password });
      localStorage.setItem('token', loginRes.access_token);

      const user = await authService.getMe();

      // 3. Create Business Entity
      const biz = await businessService.createBusiness({
        business_name: businessName,
        business_type: businessType,
      });

      setAuth(loginRes.access_token, user, biz);
      router.push('/ai-discovery');
    } catch (err: any) {
      setError(formatApiError(err, 'Registration failed. Please check inputs.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4 selection:bg-[#C6FF00] selection:text-black">
      <div className="w-full max-w-md card-inspo p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20 shadow-[0_0_25px_rgba(198,255,0,0.2)] mb-3">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Quadstock Account</h1>
          <p className="text-xs text-[#8E8E8E] mt-1 font-mono">Register Store & Setup AI Management</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 flex items-center gap-3 text-[#FF5B5B] text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#555555] absolute left-4 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#555555] absolute left-4 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@supermarket.com"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#555555] absolute left-4 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1">
              Store / Business Name
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-[#555555] absolute left-4 top-3" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Metro Supermarket"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1">
              Business Category
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full bg-[#101010] border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6FF00]/50"
            >
              <option value="Grocery Store">Grocery Store</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Convenience Store">Convenience Store</option>
              <option value="Electronics & Retail">Electronics & Retail</option>
              <option value="Pharmacy & Health">Pharmacy & Health</option>
              <option value="Apparel & Fashion">Apparel & Fashion</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold text-xs rounded-2xl transition-all shadow-[0_4px_20px_rgba(198,255,0,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Registering Account...' : 'Continue to AI Discovery'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-black" />}
          </button>
        </form>

        <div className="text-center text-xs text-[#8E8E8E] pt-2 border-t border-white/5">
          Already registered?{' '}
          <Link href="/login" className="text-[#C6FF00] hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
