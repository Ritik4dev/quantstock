'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

import { formatApiError } from '@/utils/error';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('token', res.access_token);
      const user = await authService.getMe();
      setAuth(res.access_token, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(formatApiError(err, 'Invalid email or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4 selection:bg-[#C6FF00] selection:text-black">
      <div className="w-full max-w-md card-inspo p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20 shadow-[0_0_25px_rgba(198,255,0,0.2)] mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quadstock AI Login</h1>
          <p className="text-xs text-[#8E8E8E] mt-1 font-mono">Retail Operating System</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 flex items-center gap-3 text-[#FF5B5B] text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@store.com"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#101010] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#C6FF00]/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#C6FF00] hover:bg-[#9DFF00] text-black font-bold text-xs rounded-2xl transition-all shadow-[0_4px_20px_rgba(198,255,0,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-black" />}
          </button>
        </form>

        <div className="text-center text-xs text-[#8E8E8E] pt-2 border-t border-white/5">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#C6FF00] hover:underline font-bold">
            Register Store
          </Link>
        </div>
      </div>
    </div>
  );
}
