'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ShieldCheck, Lock, User as UserIcon, Eye, EyeOff, 
  ArrowRight, CheckCircle2, AlertCircle, Sparkles, Building2, Store
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoRole, isAuthenticated, user, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const success = await login(username.trim(), password);
      if (success) {
        toast.success('স্বাগতম! সফলভাবে লগইন হয়েছে।');
        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!');
      toast.error(err.message || 'লগইন ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await switchDemoRole(role);
      toast.success(`${role === 'admin' ? '👑 অ্যাডমিন' : role === 'staff' ? '👔 স্টাফ' : '👁️ ভিউয়ার'} হিসেবে লগইন সম্পন্ন হয়েছে!`);
      router.push('/');
    } catch (e: any) {
      setErrorMessage(e.message || 'লগইন করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbf8f3] via-[#f7f2ea] to-[#eee5d8] text-slate-800 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-white font-bengali">
      {/* Decorative background lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand presentation */}
        <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-bold shadow-xs backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>আধুনিক ক্লাউড ব্যবসা সমাধান</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              মেসার্স দেলোয়ার এন্ড ব্রাদার্স
            </h1>
            <p className="text-sm font-semibold text-amber-800">
              রড ও সিমেন্ট ইআরপি এবং ডিজিটাল ব্যবসা ব্যবস্থাপনা
            </p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0">
            নিরাপদ ও দ্রুত লেনদেন, নির্ভুল স্টক শিট, স্বয়ংক্রিয় বাকি হিসাব ও ৩-স্তর বিশিষ্ট রোল ভিত্তিক প্রবেশাধিকার।
          </p>

          {/* Feature highlights */}
          <div className="space-y-2.5 pt-2 max-w-sm mx-auto lg:mx-0 text-left">
            <div className="flex items-center gap-3 p-2.5 bg-white/70 backdrop-blur-xs rounded-xl border border-amber-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-xs">
                👑
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">অ্যাডমিন (Admin)</p>
                <p className="text-[11px] text-slate-500 font-medium">সম্পূর্ণ নিয়ন্ত্রণ ও সব কাজের অনুমতি</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/70 backdrop-blur-xs rounded-xl border border-amber-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-xs">
                👔
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">স্টাফ (Staff)</p>
                <p className="text-[11px] text-slate-500 font-medium">ইনভয়েস তৈরি ও সব কাজ (এডিট/ডিলিট বন্ধ)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/70 backdrop-blur-xs rounded-xl border border-amber-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-xs">
                👁️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">ভিউয়ার (Viewer)</p>
                <p className="text-[11px] text-slate-500 font-medium">শুধুমাত্র সব রিপোর্ট ও ইনভয়েস দেখার অনুমতি</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Box */}
        <div className="lg:col-span-7">
          <div className="bg-white/90 backdrop-blur-md border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">সিস্টেমে লগইন করুন</h2>
                <p className="text-xs text-slate-500 mt-0.5">আপনার ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5 font-bold animate-in fade-in-0 duration-150">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">ইউজারনেম অথবা মোবাইল নম্বর</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    required
                    placeholder="admin / staff / viewer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">পাসওয়ার্ড</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-slate-50/50 border-slate-200 focus:bg-white text-xs h-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    লগইন হচ্ছে...
                  </span>
                ) : (
                  <>
                    <span>লগইন করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-3">
                এক ক্লিকে ডেমো টেস্ট লগইন (Quick Demo Switch)
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin('admin')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-amber-300 bg-amber-50/60 hover:bg-amber-100/80 text-amber-900 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">👑</span>
                  <span className="text-[11px] font-bold mt-1">অ্যাডমিন</span>
                  <span className="text-[9px] text-amber-700">সব ক্ষমতা</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin('staff')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">👔</span>
                  <span className="text-[11px] font-bold mt-1">স্টাফ</span>
                  <span className="text-[9px] text-blue-700">এডিট/ডিলিট বন্ধ</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin('viewer')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">👁️</span>
                  <span className="text-[11px] font-bold mt-1">ভিউয়ার</span>
                  <span className="text-[9px] text-emerald-700">শুধু রিড-অনলি</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
