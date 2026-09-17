'use client';

import { Shell } from '@/components/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { Building2, Phone, MapPin, Settings as SettingsIcon, Users, UserPlus, Shield, ShieldCheck, ShieldAlert, KeyRound, Edit2, Trash2, CheckCircle2, AlertCircle, Stamp, Globe, Printer, Sparkles, RotateCcw } from 'lucide-react';
import { api, ShopSettingsData, UserData } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { cn } from '@/lib/utils';
import { DEVELOPER_LOGO_BASE64 } from '@/lib/developerLogo';

export default function SettingsPage() {
  const { user: currentUser, token, isAdmin, canModifyData } = useAuth();

  // Shop Settings State
  const [shopSettings, setShopSettings] = useState<ShopSettingsData>({
    business_name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
    phone: '০১৭১২-০১৪২২৫',
    email: 'delowarteraders@gmail.com',
    address: '৩১০, চৌধুরী নিউ সুপার মার্কেট, বঙ্গবন্ধু সড়ক, গোপালগঞ্জ',
    currency: '৳',
    receipt_footer: 'আমাদের সাথে থাকার জন্য ধন্যবাদ!'
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Software Promo & Watermark State
  const [softwarePromo, setSoftwarePromo] = useState(() => {
    const defaults = {
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app',
      watermarkText: 'Hasanah Tech Solution • 01349345353',
      showWatermark: true,
      showFooter: true
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('softwarePromoInfo');
        if (saved) return { ...defaults, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaults;
  });
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  // User Management State
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    role: 'staff' as 'admin' | 'staff'
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // Load Settings
  useEffect(() => {
    api.settings.get().then(data => {
      setShopSettings(data);
      setSettingsLoading(false);
    }).catch(err => {
      console.error('Error loading settings:', err);
      setSettingsLoading(false);
    });
  }, []);

  // Load Users if Admin and authenticated
  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !token) return;
    try {
      setUsersLoading(true);
      const list = await api.auth.users.list();
      const raw = Array.isArray(list) ? list : [];
      // Filter out hidden developer user from UI list
      setUsersList(raw.filter(u => u.username !== 'developer' && u.role !== 'developer'));
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    let isMounted = true;
    if (isAdmin && token) {
      api.auth.users.list().then(list => {
        if (isMounted) {
          const raw = Array.isArray(list) ? list : [];
          setUsersList(raw.filter(u => u.username !== 'developer' && u.role !== 'developer'));
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isAdmin, token]);

  const handleSaveSettings = async () => {
    if (!canModifyData) {
      toast.error('ভিউয়ার একাউন্ট থেকে সেটিংস পরিবর্তন করার অনুমতি নেই');
      return;
    }
    try {
      setIsSavingSettings(true);
      if (shopSettings.id) {
        await api.settings.update(shopSettings.id, shopSettings);
      }
      toast.success('সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      toast.error('সেটিংস সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSavePromo = () => {
    if (!canModifyData) {
      toast.error('ভিউয়ার একাউন্ট থেকে সেটিংস পরিবর্তন করার অনুমতি নেই');
      return;
    }
    try {
      setIsSavingPromo(true);
      localStorage.setItem('softwarePromoInfo', JSON.stringify(softwarePromo));
      toast.success('সফটওয়্যার ব্র্যান্ডিং ও ওয়াটারমার্ক সেটিংস সংরক্ষিত হয়েছে');
    } catch (err) {
      toast.error('সেটিংস সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleResetPromo = () => {
    if (!canModifyData) {
      toast.error('ভিউয়ার একাউন্ট থেকে সেটিংস পরিবর্তন করার অনুমতি নেই');
      return;
    }
    const defaults = {
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app',
      watermarkText: 'Hasanah Tech Solution • 01349345353',
      showWatermark: true,
      showFooter: true
    };
    setSoftwarePromo(defaults);
    localStorage.setItem('softwarePromoInfo', JSON.stringify(defaults));
    toast.success('ডিফল্ট সেটিংসে ফিরিয়ে আনা হয়েছে');
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      phone: '',
      email: '',
      role: 'staff'
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserData) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '',
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      role: u.role === 'admin' || (u.role as string) === 'developer' ? 'admin' : 'staff'
    });
    setIsUserModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      toast.error('অনুগ্রহ করে ইউজারনেম দিন');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error('অনুগ্রহ করে পাসওয়ার্ড দিন');
      return;
    }

    try {
      setIsSubmittingUser(true);
      if (editingUser) {
        const payload: any = {
          username: formData.username,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.auth.users.update(editingUser.id, payload);
        toast.success(`ব্যবহারকারী "${formData.full_name || formData.username}" সফলভাবে আপডেট হয়েছে`);
      } else {
        await api.auth.users.create({
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role
        });
        toast.success(`নতুন ব্যবহারকারী "${formData.full_name || formData.username}" তৈরি হয়েছে`);
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'ব্যবহারকারী সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (currentUser?.id === userId) {
      toast.error('আপনি নিজের একাউন্ট ডিলিট করতে পারবেন না');
      return;
    }
    if (!confirm(`আপনি কি নিশ্চিতভাবে ব্যবহারকারী "${userName}" মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      setDeletingUserId(userId);
      await api.auth.users.delete(userId);
      toast.success('ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'ব্যবহারকারী মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'developer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            👑 অ্যাডমিন
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            👔 স্টাফ
          </span>
        );
    }
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-8 font-bengali pb-12">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-amber-600" />
            দোকান ও সিস্টেম সেটিংস
          </h2>
          <p className="text-slate-500 text-sm font-semibold mt-1">ব্যবসার পরিচিতি ও ব্যবহারকারী অ্যাকাউন্ট ব্যবস্থাপনা</p>
        </div>

        {/* 1. SHOP PROFILE CARD */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800">
              <Building2 className="w-5 h-5 text-amber-600" />
              প্রতিষ্ঠানের তথ্য ও মেমো সেটিংস
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-semibold">
              রশিদ ও ইনভয়েস প্রিন্টে প্রদর্শিত তথ্য
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700">দোকান/প্রতিষ্ঠানের নাম</Label>
                <Input
                  value={shopSettings.business_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, business_name: e.target.value })}
                  placeholder="দোকানের নাম"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700">মোবাইল নম্বর</Label>
                <Input
                  value={shopSettings.phone}
                  onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                  placeholder="মোবাইল নম্বর"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700">ইমেইল</Label>
                <Input
                  value={shopSettings.email || ''}
                  onChange={(e) => setShopSettings({ ...shopSettings, email: e.target.value })}
                  placeholder="ইমেইল এড্রেস"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700">টাকা সিম্বল (Currency)</Label>
                <Input
                  value={shopSettings.currency}
                  onChange={(e) => setShopSettings({ ...shopSettings, currency: e.target.value })}
                  placeholder="৳"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-xs text-slate-700">ঠিকানা</Label>
              <Input
                value={shopSettings.address || ''}
                onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                placeholder="দোকানের ঠিকানা"
                disabled={!canModifyData}
                className="font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-xs text-slate-700">রশিদ মেসেজ (Receipt Footer)</Label>
              <Input
                value={shopSettings.receipt_footer || ''}
                onChange={(e) => setShopSettings({ ...shopSettings, receipt_footer: e.target.value })}
                placeholder="ইনভয়েসের নিচে লেখা বার্তা"
                disabled={!canModifyData}
                className="font-bold rounded-xl"
              />
            </div>

            {canModifyData && (
              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSavingSettings}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 h-10 rounded-xl shadow-xs"
                >
                  {isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. SOFTWARE BRANDING & WATERMARK CARD */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800">
                <Stamp className="w-5 h-5 text-indigo-600" />
                সফটওয়্যার ব্র্যান্ডিং ও ওয়াটারমার্ক সেটিংস
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                সকল প্রকার প্রিন্ট মেমো, লেজার, ভাউচার ও প্রতিবেদনে ডেভেলপার ওয়াটারমার্ক ও পরিচিতি নিয়ন্ত্রণ
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs px-2.5 py-1 rounded-lg font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>মার্কেটিং ও ব্র্যান্ডিং টুল</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Developer Logo Badge Banner */}
            <div className="flex items-center gap-3.5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={DEVELOPER_LOGO_BASE64} 
                alt="Developer Logo" 
                className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-indigo-200/80 shadow-xs shrink-0" 
              />
              <div className="text-xs">
                <div className="font-black text-slate-900 flex items-center gap-2">
                  <span>অফিসিয়াল ডেভেলপার ব্র্যান্ডিং ও লোগো</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">সক্রিয়</span>
                </div>
                <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                  সকল প্রিন্ট মেমো, ভাউচার, লেজার, স্টক শিট ও রিপোর্টের ওয়াটারমার্ক এবং ফুটারে এই লোগো ও মার্কেটিং তথ্য প্রদর্শিত হবে।
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>ডেভেলপার / কোম্পানি নাম</span>
                </Label>
                <Input
                  value={softwarePromo.softwareCompany}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, softwareCompany: e.target.value })}
                  placeholder="Hasanah Tech Solution"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>হটলাইন / মোবাইল নম্বর</span>
                </Label>
                <Input
                  value={softwarePromo.softwarePhone}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, softwarePhone: e.target.value })}
                  placeholder="01349345353"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>ওয়েবসাইট ইউআরএল (ঐচ্ছিক)</span>
                </Label>
                <Input
                  value={softwarePromo.softwareWebsite}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, softwareWebsite: e.target.value })}
                  placeholder="www.hasanahtech.vercel.app"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Stamp className="w-3.5 h-3.5 text-slate-500" />
                  <span>ওয়াটারমার্ক টেক্সট</span>
                </Label>
                <Input
                  value={softwarePromo.watermarkText}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, watermarkText: e.target.value })}
                  placeholder="Hasanah Tech Solution • 01349345353"
                  disabled={!canModifyData}
                  className="font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Toggle switches / checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={softwarePromo.showWatermark}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, showWatermark: e.target.checked })}
                  disabled={!canModifyData}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">কাগজে কোনাকুনি ওয়াটারমার্ক ছাপ দেখান</span>
                  <span className="text-[11px] text-slate-500 font-medium">ইনভয়েস, লেজার ও রিপোর্টের মাঝখানে হালকা ছাপ থাকবে</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={softwarePromo.showFooter}
                  onChange={(e) => setSoftwarePromo({ ...softwarePromo, showFooter: e.target.checked })}
                  disabled={!canModifyData}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">পৃষ্ঠার নিচে ফুটার ব্র্যান্ডিং দেখান</span>
                  <span className="text-[11px] text-slate-500 font-medium">প্রিন্টের নিচে সফটওয়্যার ও হটলাইন তথ্যযুক্ত ফুটার থাকবে</span>
                </div>
              </label>
            </div>

            {/* Live Watermark Preview Box */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>প্রিন্ট লাইভ প্রিভিউ (A4 কাগজের সিমুলেশন)</span>
              </Label>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white overflow-hidden select-none min-h-[170px] flex flex-col justify-between shadow-2xs">
                
                {/* Diagonal Watermark simulation */}
                {softwarePromo.showWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="transform -rotate-12 text-center opacity-10 select-none flex flex-col items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={DEVELOPER_LOGO_BASE64}
                        alt="Watermark Logo"
                        className="w-14 h-14 object-contain mb-1 filter grayscale"
                      />
                      <p className="text-2xl sm:text-3xl font-black tracking-widest text-slate-900 uppercase">
                        {softwarePromo.softwareCompany || 'Hasanah Tech Solution'}
                      </p>
                      <p className="text-sm font-bold tracking-wider text-slate-900 mt-1 font-mono">
                        📞 {toBengaliDigits(softwarePromo.softwarePhone || '01349345353')} / {softwarePromo.softwarePhone || '01349345353'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dummy document skeleton */}
                <div className="space-y-2 opacity-35 relative z-0">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <div className="h-3 w-32 bg-slate-300 rounded"></div>
                    <div className="h-3 w-20 bg-slate-300 rounded"></div>
                  </div>
                  <div className="h-2.5 w-48 bg-slate-200 rounded"></div>
                  <div className="h-2.5 w-3/4 bg-slate-200 rounded"></div>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <div className="h-6 bg-slate-100 rounded border border-slate-200"></div>
                    <div className="h-6 bg-slate-100 rounded border border-slate-200"></div>
                    <div className="h-6 bg-slate-100 rounded border border-slate-200"></div>
                    <div className="h-6 bg-slate-100 rounded border border-slate-200"></div>
                  </div>
                </div>

                {/* Footer preview */}
                {softwarePromo.showFooter ? (
                  <div className="mt-4 pt-2 border-t border-dashed border-slate-300 flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-600 relative z-10 bg-white/80 backdrop-blur-xs gap-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={DEVELOPER_LOGO_BASE64}
                        alt="Logo"
                        className="w-5 h-5 object-contain rounded"
                      />
                      <span className="bg-slate-900 text-white text-[8px] px-1 py-0.5 rounded font-mono font-black uppercase">DEV</span>
                      <span>সফটওয়্যার পরিচালনায়: <strong className="text-slate-900">{softwarePromo.softwareCompany || 'Hasanah Tech Solution'}</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      {softwarePromo.softwareWebsite && (
                        <span>🌐 <strong className="text-slate-900 font-mono">{softwarePromo.softwareWebsite}</strong></span>
                      )}
                      <span>হটলাইন: <strong className="text-slate-900 font-mono">{toBengaliDigits(softwarePromo.softwarePhone || '01349345353')}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-[10px] text-slate-400 italic text-center">
                    (ফুটার ব্র্যান্ডিং বন্ধ আছে)
                  </div>
                )}
              </div>
            </div>

            {canModifyData && (
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPromo}
                  className="rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ডিফল্টে রিসেট</span>
                </Button>

                <Button 
                  onClick={handleSavePromo} 
                  disabled={isSavingPromo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-10 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingPromo ? 'সংরক্ষণ হচ্ছে...' : 'ব্র্যান্ডিং সেভ করুন'}</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. USER & ROLE MANAGEMENT */}
        {isAdmin && (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800">
                  <Users className="w-5 h-5 text-blue-600" />
                  ব্যবহারকারী ব্যবস্থাপনা (User Management)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                  অ্যাডমিন ও স্টাফ অ্যাকাউন্ট পরিচালনা
                </CardDescription>
              </div>

              <Button
                onClick={handleOpenAddUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ নতুন ব্যবহারকারী</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-6">ব্যবহারকারী / নাম</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4">ইউজারনেম</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4">রোল</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-4">মোবাইল</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs py-3 px-6 text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs font-semibold">
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        ব্যবহারকারীদের তালিকা লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : usersList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                        কোনো ব্যবহারকারী পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersList.map((u) => (
                      <TableRow key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 border border-slate-200">
                              {(u.full_name || u.username)[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-xs">{u.full_name || u.username}</p>
                              {u.email && <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-4 font-mono font-bold text-slate-700">
                          @{u.username}
                        </TableCell>

                        <TableCell className="py-3 px-4">
                          {getRoleBadge(u.role)}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-slate-600">
                          {u.phone ? toBengaliDigits(u.phone) : '—'}
                        </TableCell>

                        <TableCell className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditUser(u)}
                              className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-xs"
                              title="রোল বা পাসওয়ার্ড এডিট করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" /> এডিট
                            </Button>
                            {currentUser?.id !== u.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.full_name || u.username)}
                                disabled={deletingUserId === u.id}
                                className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-bold text-xs"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> মুছুন
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CREATE / EDIT USER MODAL */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white font-bengali">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              {editingUser ? <Edit2 className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
              <span>{editingUser ? 'ব্যবহারকারী আপডেট করুন' : 'নতুন ব্যবহারকারী যুক্ত করুন'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">পূর্ণ নাম (Full Name)</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="মোঃ দেলোয়ার হোসেন"
                className="font-bold text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">ইউজারনেম (Username) *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="staff_manager"
                  required
                  className="font-mono font-bold text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">রোল (Role) *</Label>
                <Select
                  value={formData.role === 'admin' ? 'admin' : 'staff'}
                  onValueChange={(val: any) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="font-bold text-xs rounded-xl h-9">
                    <SelectValue placeholder="রোল নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="admin">👑 অ্যাডমিন (Admin)</SelectItem>
                    <SelectItem value="staff">👔 স্টাফ (Staff)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {editingUser ? 'নতুন পাসওয়ার্ড (পরিবর্তন না করতে চাইলে খালি রাখুন)' : 'পাসওয়ার্ড (Password) *'}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'নতুন পাসওয়ার্ড দিন (ঐচ্ছিক)' : 'পাসওয়ার্ড দিন'}
                required={!editingUser}
                className="font-mono font-bold text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">মোবাইল নম্বর</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="০১৭১২-XXXXXX"
                  className="font-bold text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">ইমেইল</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="font-bold text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
              >
                {isSubmittingUser ? 'সংরক্ষণ হচ্ছে...' : editingUser ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
