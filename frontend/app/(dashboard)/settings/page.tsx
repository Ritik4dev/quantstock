'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { whatsappService } from '@/services/whatsappService';
import { useAuthStore } from '@/store/useAuthStore';
import { Settings, Phone, MessageSquare, Bell, CheckCircle2, AlertCircle, Send, Shield, Store, Save, Zap, User as UserIcon, Mail } from 'lucide-react';
import { formatApiError } from '@/utils/error';

export default function SettingsPage() {
  const { user, activeBusiness, updateUser } = useAuthStore();
  
  // User Profile Form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // WhatsApp Alert Form state
  const [phone, setPhone] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Initialize User profile state
    if (user) {
      setUserName(user.name || '');
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
    }

    // Initialize WhatsApp config
    const config = whatsappService.getWhatsAppConfig();
    setPhone(config.phone || user?.phone || '');
    setEnabled(config.enabled);
  }, [user]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      // Update local auth store & localStorage
      updateUser({
        name: userName,
        email: userEmail,
        phone: userPhone,
      });

      // If WhatsApp phone is not set or matching, update WhatsApp config too
      if (userPhone) {
        setPhone(userPhone);
        whatsappService.saveWhatsAppConfig({ phone: userPhone, enabled });
      }
    },
    onSuccess: () => {
      setStatusMsg({
        type: 'success',
        text: 'User Profile (Name, Email, Phone) updated successfully!',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    },
    onError: (err: any) => {
      setStatusMsg({
        type: 'error',
        text: formatApiError(err, 'Failed to update user profile.'),
      });
    },
  });

  const saveWhatsAppMutation = useMutation({
    mutationFn: async () => {
      whatsappService.saveWhatsAppConfig({ phone, enabled });
      if (userPhone !== phone) {
        updateUser({ phone });
        setUserPhone(phone);
      }
    },
    onSuccess: () => {
      setStatusMsg({
        type: 'success',
        text: 'WhatsApp notification preferences saved successfully!',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    },
    onError: (err: any) => {
      setStatusMsg({
        type: 'error',
        text: formatApiError(err, 'Failed to save settings.'),
      });
    },
  });

  const [rawResponse, setRawResponse] = useState<any | null>(null);

  const testMessageMutation = useMutation({
    mutationFn: async () => {
      const targetPhone = phone.trim() || userPhone.trim();
      if (!targetPhone) {
        throw new Error('Please enter a WhatsApp phone number with country code first (e.g. 919876543210).');
      }
      return whatsappService.sendWhatsAppMessage({
        phone: targetPhone,
        msg: 'Welcome to QuantStock!',
      });
    },
    onSuccess: (data) => {
      setStatusMsg({
        type: data.success ? 'success' : 'error',
        text: data.success
          ? 'WhatsApp test message "Welcome to QuantStock!" sent successfully!'
          : (data.message || 'Failed to dispatch WhatsApp message.'),
      });
      setTimeout(() => setStatusMsg(null), 5000);
    },
    onError: (err: any) => {
      setStatusMsg({
        type: 'error',
        text: formatApiError(err, 'Failed to send WhatsApp test message. Check phone number and API connectivity.'),
      });
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C6FF00]/10 text-[#C6FF00] flex items-center justify-center border border-[#C6FF00]/20 shadow-[0_0_25px_rgba(198,255,0,0.15)]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Account & System Settings</h1>
            <p className="text-xs text-[#8E8E8E] mt-0.5">
              Manage your User Profile (Name, Email, Phone Number) and WhatsApp Alert Notification Integrations.
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono flex items-center gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-[#B7FF38]/10 text-[#B7FF38] border-[#B7FF38]/20'
              : 'bg-[#FF5B5B]/10 text-[#FF5B5B] border-[#FF5B5B]/20'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: User Profile & WhatsApp Alert Integration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: User Account Profile Settings */}
          <div className="card-inspo p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C6FF00]/10 rounded-xl text-[#C6FF00] border border-[#C6FF00]/20">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">User Account Profile</h2>
                  <p className="text-xs text-[#8E8E8E]">Update your personal account details</p>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProfileMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="manager@store.com"
                      className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                    Phone Number (WhatsApp Ready)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={userPhone}
                      onChange={(e) => {
                        setUserPhone(e.target.value);
                        setPhone(e.target.value);
                      }}
                      placeholder="e.g. 919876543210"
                      className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveProfileMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{saveProfileMutation.isPending ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: WhatsApp Warning Alert Integration */}
          <div className="card-inspo p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#B7FF38]/10 rounded-xl text-[#B7FF38] border border-[#B7FF38]/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">WhatsApp Warning Alert Integration</h2>
                  <p className="text-xs text-[#8E8E8E]">Automated WhatsApp warning notifications</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B7FF38]/10 text-[#B7FF38] border border-[#B7FF38]/20 font-mono">
                Live API
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                  WhatsApp Alert Target Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#555555] absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter WhatsApp phone number"
                    className="w-full bg-[#101010] border border-white/5 focus:border-[#C6FF00]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555555] focus:outline-none font-mono transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#101010] rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#C6FF00]" />
                  <div>
                    <div className="text-xs font-bold text-white">Enable WhatsApp Warning Alerts</div>
                    <div className="text-[11px] text-[#8E8E8E]">Auto-dispatch critical low stock & expiry warnings</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative border ${
                    enabled ? 'bg-[#C6FF00] border-[#C6FF00]' : 'bg-[#151515] border-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${
                      enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  testMessageMutation.mutate();
                }}
                disabled={testMessageMutation.isPending || (!phone.trim() && !userPhone.trim())}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#101010] border border-[#C6FF00]/40 hover:bg-[#C6FF00]/10 text-[#C6FF00] text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testMessageMutation.isPending ? 'Sending...' : 'Send Test WhatsApp Message'}</span>
              </button>

              <button
                type="button"
                onClick={() => saveWhatsAppMutation.mutate()}
                disabled={saveWhatsAppMutation.isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#9DFF00] text-black text-xs font-bold shadow-[0_4px_15px_rgba(198,255,0,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-black" />
                <span>{saveWhatsAppMutation.isPending ? 'Saving...' : 'Save WhatsApp Settings'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Store & Profile Info Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <div className="card-inspo p-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Store className="w-4 h-4 text-[#C6FF00]" />
              Store Information
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#101010] rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-bold">Store Name</span>
                <span className="text-white font-bold">{activeBusiness?.business_name || 'QuantStock Supermarket'}</span>
              </div>
              <div className="p-3 bg-[#101010] rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-bold">Category</span>
                <span className="text-[#C6FF00] font-mono font-bold">{activeBusiness?.business_type || 'Retail & Grocery'}</span>
              </div>
            </div>
          </div>

          <div className="card-inspo p-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#B7FF38]" />
              Current Active Account
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#101010] rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-bold">User Name</span>
                <span className="text-white font-bold">{userName || user?.name || 'Store Owner'}</span>
              </div>
              <div className="p-3 bg-[#101010] rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-bold">Email</span>
                <span className="text-white font-mono">{userEmail || user?.email || 'manager@quantstock.com'}</span>
              </div>
              <div className="p-3 bg-[#101010] rounded-xl border border-white/5">
                <span className="text-[#8E8E8E] block text-[10px] uppercase font-bold">Phone Number</span>
                <span className="text-[#C6FF00] font-mono font-bold">{userPhone || phone || 'Not configured'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
