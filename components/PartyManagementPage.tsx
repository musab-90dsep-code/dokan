'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shell } from '@/components/Shell';
import { api, PartyData } from '@/lib/api';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Building2,
  MoreVertical,
  Filter,
  DollarSign,
  Camera,
  Mail,
  Receipt,
  MapPin,
  X,
  ShieldCheck,
  Save
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export interface Party {
  id: string;
  name: string;
  businessName?: string;
  customerType?: string;
  supplyType?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  address: string;
  postcode?: string;
  idType?: string;
  nid?: string;
  tinNumber?: string;
  openingBalance?: number;
  creditLimit?: number;
  creditDays?: number;
  discountPercent?: number;
  joinedDate?: string;
  note?: string;
  photoUrl?: string;
  totalDue?: number;
  totalPurchase?: number;
}

interface PartyManagementPageProps {
  type: 'customer' | 'supplier';
}

export default function PartyManagementPage({ type }: PartyManagementPageProps) {
  const router = useRouter();
  const isCustomer = type === 'customer';

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('সব');
  const [filterDue, setFilterDue] = useState('সব');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, partyId: string) => {
    e.stopPropagation();
    if (openMenuId === partyId) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 96;
    const menuWidth = 176;

    const openAbove = rect.top > menuHeight + 10;
    const top = openAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.right - menuWidth));

    setMenuPos({ top, left });
    setOpenMenuId(partyId);
  };

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    customerType: 'খুচরা গ্রাহক',
    phone: '',
    altPhone: '',
    email: '',
    country: 'বাংলাদেশ',
    division: 'ঢাকা',
    district: 'ঢাকা',
    thana: '',
    address: '',
    postcode: '',
    idType: 'NID',
    nid: '',
    tinNumber: '',
    openingBalance: 0,
    creditLimit: 0,
    creditDays: 30,
    discountPercent: 0,
    joinedDate: new Date().toISOString().split('T')[0],
    note: '',
    photoUrl: ''
  });

  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.parties.list({ party_type: type });
      const safeData = Array.isArray(data) ? data : [];
      const partyList: Party[] = safeData.map((p) => ({
        id: String(p.id),
        name: p.name,
        businessName: p.business_name || '',
        customerType: p.customer_type || '',
        supplyType: p.supply_type || '',
        phone: p.phone,
        altPhone: p.alt_phone || '',
        email: p.email || '',
        country: p.country || 'বাংলাদেশ',
        division: p.division || 'ঢাকা',
        district: p.district || 'ঢাকা',
        thana: p.thana || '',
        address: p.address || '',
        postcode: p.postcode || '',
        idType: p.id_type || 'NID',
        nid: p.nid || '',
        tinNumber: p.tin_number || '',
        openingBalance: Number(p.opening_balance || 0),
        creditLimit: Number(p.credit_limit || 0),
        creditDays: p.credit_days || 30,
        discountPercent: Number(p.discount_percent || 0),
        joinedDate: p.joined_date || '',
        note: p.note || '',
        photoUrl: p.photo_url || '',
        totalDue: Number(p.total_due || 0),
        totalPurchase: Number(p.total_purchases || 0)
      }));
      setParties(partyList);
    } catch (err) {
      console.error('Error fetching parties:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    let ignore = false;
    api.parties.list({ party_type: type }).then((data) => {
      if (ignore) return;
      const safeData = Array.isArray(data) ? data : [];
      const partyList: Party[] = safeData.map((p) => ({
        id: String(p.id),
        name: p.name,
        businessName: p.business_name || '',
        customerType: p.customer_type || '',
        supplyType: p.supply_type || '',
        phone: p.phone,
        altPhone: p.alt_phone || '',
        email: p.email || '',
        country: p.country || 'বাংলাদেশ',
        division: p.division || 'ঢাকা',
        district: p.district || 'ঢাকা',
        thana: p.thana || '',
        address: p.address || '',
        postcode: p.postcode || '',
        idType: p.id_type || 'NID',
        nid: p.nid || '',
        tinNumber: p.tin_number || '',
        openingBalance: Number(p.opening_balance || 0),
        creditLimit: Number(p.credit_limit || 0),
        creditDays: p.credit_days || 30,
        discountPercent: Number(p.discount_percent || 0),
        joinedDate: p.joined_date || '',
        note: p.note || '',
        photoUrl: p.photo_url || '',
        totalDue: Number(p.total_due || 0),
        totalPurchase: Number(p.total_purchases || 0)
      }));
      setParties(partyList);
      setLoading(false);
    }).catch(err => {
      if (ignore) return;
      console.error('Error fetching parties:', err);
      setLoading(false);
    });
    return () => { ignore = true; };
  }, [type]);

  const resetForm = () => {
    setEditing(null);
    setFormData({
      businessName: '',
      name: '',
      customerType: isCustomer ? 'খুচরা গ্রাহক' : 'রড',
      phone: '',
      altPhone: '',
      email: '',
      country: 'বাংলাদেশ',
      division: 'ঢাকা',
      district: 'ঢাকা',
      thana: '',
      address: '',
      postcode: '',
      idType: isCustomer ? 'NID' : 'TIN',
      nid: '',
      tinNumber: '',
      openingBalance: 0,
      creditLimit: 0,
      creditDays: 30,
      discountPercent: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      note: '',
      photoUrl: ''
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (p: Party) => {
    setEditing(p);
    setFormData({
      businessName: p.businessName || '',
      name: p.name || '',
      customerType: p.customerType || p.supplyType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড'),
      phone: p.phone || '',
      altPhone: p.altPhone || '',
      email: p.email || '',
      country: p.country || 'বাংলাদেশ',
      division: p.division || 'ঢাকা',
      district: p.district || 'ঢাকা',
      thana: p.thana || '',
      address: p.address || '',
      postcode: p.postcode || '',
      idType: p.idType || (isCustomer ? 'NID' : 'TIN'),
      nid: p.nid || '',
      tinNumber: p.tinNumber || '',
      openingBalance: p.openingBalance || 0,
      creditLimit: p.creditLimit || 0,
      creditDays: p.creditDays || 30,
      discountPercent: p.discountPercent || 0,
      joinedDate: p.joinedDate || new Date().toISOString().split('T')[0],
      note: p.note || '',
      photoUrl: p.photoUrl || ''
    });
    setIsAddOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ছবি ফাইল সাইজ ২MB এর নিচে হতে হবে');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
        toast.success('ছবি আপলোড সম্পন্ন হয়েছে');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(isCustomer ? 'গ্রাহকের নাম পূরণ করুন' : 'কোম্পানি বা প্রতিনিধির নাম পূরণ করুন');
      return;
    }
    if (!formData.businessName.trim()) {
      toast.error('ব্যবসা / প্রতিষ্ঠানের নাম পূরণ করুন');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('মোবাইল নম্বর পূরণ করুন');
      return;
    }

    const payload: PartyData = {
      party_type: type,
      name: formData.name.trim(),
      business_name: formData.businessName.trim(),
      customer_type: formData.customerType,
      supply_type: formData.customerType,
      phone: formData.phone,
      alt_phone: formData.altPhone,
      email: formData.email,
      country: formData.country,
      division: formData.division,
      district: formData.district,
      thana: formData.thana,
      address: formData.address,
      postcode: formData.postcode,
      id_type: formData.idType,
      nid: formData.nid,
      tin_number: formData.tinNumber,
      opening_balance: Number(formData.openingBalance || 0),
      credit_limit: Number(formData.creditLimit || 0),
      credit_days: Number(formData.creditDays || 30),
      discount_percent: Number(formData.discountPercent || 0),
      total_due: editing ? (editing.totalDue || 0) : (Number(formData.openingBalance) || 0),
      joined_date: formData.joinedDate,
      note: formData.note,
      photo_url: formData.photoUrl
    };

    try {
      if (editing) {
        await api.parties.update(editing.id, payload);
        toast.success(isCustomer ? 'গ্রাহকের তথ্য আপডেট হয়েছে' : 'সরবরাহকারীর তথ্য আপডেট হয়েছে');
      } else {
        await api.parties.create(payload);
        toast.success(isCustomer ? 'নতুন গ্রাহক নিবন্ধিত হয়েছে' : 'নতুন সরবরাহকারী নিবন্ধিত হয়েছে');
      }
      setIsAddOpen(false);
      resetForm();
      fetchParties();
    } catch (err) {
      console.error(err);
      toast.error('তথ্য সংরক্ষণ করা সম্ভব হয়নি');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isCustomer ? 'এই গ্রাহকের তথ্য মুছে ফেলবেন?' : 'এই সরবরাহকারীর তথ্য মুছে ফেলবেন?')) return;
    try {
      await api.parties.delete(id);
      toast.success('তথ্য মুছে ফেলা হয়েছে');
      fetchParties();
    } catch {
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    }
  };

  const filtered = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.businessName && p.businessName.toLowerCase().includes(search.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      filterType === 'সব' ||
      (p.customerType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড')) === filterType;

    const matchesDue =
      filterDue === 'সব'
        ? true
        : filterDue === 'বকেয়া আছে'
        ? (p.totalDue || 0) > 0
        : (p.totalDue || 0) <= 0;

    return matchesSearch && matchesType && matchesDue;
  });

  const totalDue = parties.reduce((a, p) => a + (p.totalDue || 0), 0);

  return (
    <Shell>
      <div className="space-y-8 font-bengali">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-bengali flex items-center gap-3">
              {isCustomer ? (
                <>
                  <Users className="w-8 h-8 text-orange-600" /> গ্রাহক ব্যবস্থাপনা
                </>
              ) : (
                <>
                  <Building2 className="w-8 h-8 text-orange-600" /> কোম্পানি / সরবরাহকারী
                </>
              )}
            </h2>
            <p className="text-slate-500 font-bengali mt-1">
              {isCustomer
                ? 'রড ও সিমেন্ট ক্রয়কারী গ্রাহকদের তালিকা, প্রোফাইল ও বকেয়া হিসাব'
                : 'পণ্য সরবরাহকারী বা কোম্পানির তথ্য ও বকেয়া হিসাব'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isCustomer && (
              <Link href="/customers/dues">
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bengali h-12 px-5 rounded-xl font-bold transition-all"
                >
                  <Receipt className="w-5 h-5 mr-2" /> বকেয়া হিসাব
                </Button>
              </Link>
            )}
            <Button
              onClick={handleOpenAdd}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bengali h-12 px-6 rounded-xl font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              {isCustomer ? 'নতুন গ্রাহক যুক্ত করুন' : 'নতুন কোম্পানি যুক্ত করুন'}
            </Button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-indigo-100 bg-indigo-50/60 shadow-xs rounded-2xl transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-xs text-indigo-700">
                {isCustomer ? <Users className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 opacity-80">
                  {isCustomer ? 'মোট নিবন্ধিত গ্রাহক' : 'মোট সরবরাহকারী'}
                </p>
                <p className="text-2xl font-black text-indigo-700 mt-0.5">{toBnDigits(parties.length)} জন</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-100 bg-amber-50/60 shadow-xs rounded-2xl transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-xs text-amber-700">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 opacity-80">
                  {isCustomer ? 'পাইকারি গ্রাহক' : 'রড সরবরাহকারী'}
                </p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">
                  {toBnDigits(parties.filter((p) => (isCustomer ? p.customerType === 'পাইকারি গ্রাহক' : p.customerType === 'রড')).length)} জন
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-rose-100 bg-rose-50/60 shadow-xs rounded-2xl transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-xs text-rose-700">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 opacity-80">
                  {isCustomer ? 'মোট গ্রাহক বকেয়া' : 'কোম্পানির মোট বকেয়া'}
                </p>
                <p className="text-2xl font-black text-rose-700 mt-0.5">৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Table Card */}
        <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl bg-white overflow-visible">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <h3 className="font-black text-slate-800 text-base">
                {isCustomer ? 'গ্রাহকদের তালিকা' : 'সরবরাহকারীদের তালিকা'}
              </h3>

              {/* Type Filter Buttons */}
              <div className="flex flex-wrap items-center bg-slate-200/60 p-1 rounded-xl text-xs font-bold font-bengali">
                {(isCustomer
                  ? ['সব', 'খুচরা গ্রাহক', 'পাইকারি গ্রাহক', 'কন্ট্রাকটর']
                  : ['সব', 'রড', 'সিমেন্ট', 'অন্যান্য']
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold",
                      filterType === t
                        ? "bg-white text-orange-600 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Due Status Filter */}
              <Select value={filterDue} onValueChange={(v) => setFilterDue(v || 'সব')}>
                <SelectTrigger className="w-36 h-9 bg-white border-slate-200 text-xs font-bold rounded-xl font-bengali">
                  <SelectValue placeholder="বকেয়া ফিল্টার" />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs">
                  <SelectItem value="সব">সকল হিসাব</SelectItem>
                  <SelectItem value="বকেয়া আছে">বকেয়া আছে 🔴</SelectItem>
                  <SelectItem value="বকেয়া নেই">বকেয়া নেই 🟢</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="নাম, ফোন বা ঠিকানা দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-10 text-xs font-bengali"
              />
            </div>
          </div>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black py-4 px-6 uppercase">
                    {isCustomer ? 'গ্রাহকের নাম' : 'প্রতিনিধি / নাম'}
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black uppercase">
                    ব্যবসা / প্রতিষ্ঠান
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black uppercase">
                    যোগাযোগ
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">
                    ধরন
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black uppercase">
                    ঠিকানা
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">
                    বকেয়া
                  </TableHead>
                  <TableHead className="text-slate-500 text-[11px] tracking-widest font-black text-right py-4 px-6 uppercase">
                    অ্যাকশন
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-bold text-lg">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bold text-lg">কোনো তথ্য পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow
                        key={p.id}
                        onClick={() => router.push(isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`)}
                        className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-black text-sm flex items-center justify-center border border-orange-200 overflow-hidden">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                p.name?.charAt(0) || 'C'
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-base">{p.name || '—'}</p>
                              {p.email && <p className="text-[11px] text-slate-400">{p.email}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.businessName ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.businessName}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 w-fit px-2.5 py-1 rounded-md">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {toBnDigits(p.phone)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'px-3 py-1 rounded-lg text-[10px] font-black tracking-wider inline-block',
                              p.customerType === 'পাইকারি গ্রাহক'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : p.customerType === 'কন্ট্রাকটর'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            )}
                          >
                            {p.customerType || 'খুচরা গ্রাহক'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {p.address || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-black text-base px-3 py-1 rounded-lg inline-block',
                              (p.totalDue || 0) > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                            )}
                          >
                            ৳{(p.totalDue || 0).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-4 px-6">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => toggleMenu(e, p.id)}
                              className="h-9 w-9 text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 rounded-xl transition-all"
                              title="অপশনসমূহ"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>

                            {openMenuId === p.id && menuPos && createPortal(
                              <>
                                {/* Backdrop to close on click outside */}
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setMenuPos(null);
                                  }}
                                />

                                <div
                                  style={{
                                    position: 'fixed',
                                    top: `${menuPos.top}px`,
                                    left: `${menuPos.left}px`,
                                  }}
                                  className="w-44 rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 z-[9999] border border-slate-100 py-1.5 font-bengali text-xs animate-in fade-in-0 zoom-in-95 text-left"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPos(null);
                                      openEdit(p);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4 text-orange-500" />
                                    সম্পাদনা করুন
                                  </button>
                                  <div className="my-1 border-t border-slate-100" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPos(null);
                                      handleDelete(p.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                    মুছে ফেলুন
                                  </button>
                                </div>
                              </>,
                              document.body
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
      </div>

      {/* FULL 1:1 CUSTOMER REGISTRATION OVERLAY FORM */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto font-bengali">
            {/* FORM TOP TOOLBAR */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  {isCustomer ? <Users className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">
                    {isCustomer ? 'গ্রাহক ব্যবস্থাপনা (CUSTOMER MANAGEMENT)' : 'কোম্পানি / সরবরাহকারী ব্যবস্থাপনা (COMPANY MANAGEMENT)'}
                  </span>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {editing
                      ? isCustomer
                        ? 'গ্রাহকের তথ্য সম্পাদনা'
                        : 'কোম্পানির তথ্য সম্পাদনা'
                      : isCustomer
                      ? 'নতুন গ্রাহক যোগ করুন'
                      : 'নতুন কোম্পানি যোগ করুন'}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* --- LEFT COLUMN (WIDE ~75%) --- */}
                <div className="lg:col-span-9 space-y-5">
                  {/* STEP 1: ❶ প্রাথমিক তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ১
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        প্রাথমিক তথ্য (Basic Information)
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isCustomer ? 'গ্রাহকের নাম' : 'কোম্পানি / প্রতিনিধির নাম'} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={isCustomer ? 'যেমন: মোঃ আল-আমিন' : 'যেমন: BSRM / Seven Rings Steel Ltd'}
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          ব্যবসা / প্রতিষ্ঠানের নাম <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          placeholder="যেমন: আমিন বিল্ডার্স"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isCustomer ? 'গ্রাহকের ধরন (ঐচ্ছিক)' : 'সরবরাহের ধরন / বিভাগ (ঐচ্ছিক)'}
                        </Label>
                        <Select
                          value={formData.customerType}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, customerType: val || 'খুচরা গ্রাহক' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="ধরন নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="খুচরা গ্রাহক">খুচরা গ্রাহক (Retail)</SelectItem>
                            <SelectItem value="পাইকারি গ্রাহক">পাইকারি গ্রাহক (Wholesale)</SelectItem>
                            <SelectItem value="কন্ট্রাকটর">কন্ট্রাকটর / ডেভেলপার (Contractor)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700">
                            মোবাইল নম্বর <span className="text-rose-500">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, altPhone: prev.altPhone ? '' : '01' }))}
                            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                          >
                            + নম্বর যুক্ত করুন
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <Input
                              required
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="০১৭XXXXXXXX"
                              className="rounded-xl h-10 bg-white border-slate-200 pr-9"
                            />
                          </div>
                          {formData.altPhone !== undefined && (
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                              <Input
                                value={formData.altPhone}
                                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                                placeholder="বিকল্প ফোন নম্বর"
                                className="rounded-xl h-10 bg-white border-slate-200 pr-9"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">ইমেইল ঠিকানা (ঐচ্ছিক)</Label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="ইমেইল ঠিকানা লিখুন"
                            className="rounded-xl h-10 bg-white border-slate-200 pr-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: ❷ ঠিকানা তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ২
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        ঠিকানা তথ্য (Address Information - ঐচ্ছিক)
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          দেশ (ঐচ্ছিক)
                        </Label>
                        <Select
                          value={formData.country}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, country: val || 'বাংলাদেশ' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="বাংলাদেশ">বাংলাদেশ</SelectItem>
                            <SelectItem value="International">আন্তর্জাতিক</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          বিভাগ (ঐচ্ছিক)
                        </Label>
                        <Select
                          value={formData.division}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, division: val || 'ঢাকা' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ঢাকা">ঢাকা</SelectItem>
                            <SelectItem value="চট্টগ্রাম">চট্টগ্রাম</SelectItem>
                            <SelectItem value="খুলনা">খুলনা</SelectItem>
                            <SelectItem value="রাজশাহী">রাজশাহী</SelectItem>
                            <SelectItem value="সিলেট">সিলেট</SelectItem>
                            <SelectItem value="বরিশাল">বরিশাল</SelectItem>
                            <SelectItem value="রংপুর">রংপুর</SelectItem>
                            <SelectItem value="ময়মনসিংহ">ময়মনসিংহ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          জেলা (ঐচ্ছিক)
                        </Label>
                        <Select
                          value={formData.district}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, district: val || 'ঢাকা' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="জেলা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            <SelectItem value="ঢাকা">ঢাকা</SelectItem>
                            <SelectItem value="চট্টগ্রাম">চট্টগ্রাম</SelectItem>
                            <SelectItem value="গাজীপুর">গাজীপুর</SelectItem>
                            <SelectItem value="নারায়ণগঞ্জ">নারায়ণগঞ্জ</SelectItem>
                            <SelectItem value="গোপালগঞ্জ">গোপালগঞ্জ</SelectItem>
                            <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">থানা / এলাকা (ঐচ্ছিক)</Label>
                        <Input
                          value={formData.thana}
                          onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
                          placeholder="যেমন: মতিঝিল / তেজগাঁও"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          প্রধান ঠিকানা (ঐচ্ছিক)
                        </Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="যেমন: ৩১৮ দক্ষিণ যাত্রাবাড়ী, ঢাকা"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পোস্টকোড (ঐচ্ছিক)</Label>
                        <Input
                          value={formData.postcode}
                          onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                          placeholder="যেমন: ১২০৪"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: ❸ অতিরিক্ত তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ৩
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        অতিরিক্ত ও আর্থিক তথ্য (Financial & Info)
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পরিচয়পত্রের ধরন (ঐচ্ছিক)</Label>
                        <Select
                          value={formData.idType}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, idType: val || 'NID' })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NID">জাতীয় পরিচয়পত্র (NID)</SelectItem>
                            <SelectItem value="Trade License">ট্রেড লাইসেন্স (Trade License)</SelectItem>
                            <SelectItem value="TIN">টিন (TIN / Tax ID)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">আইডি / রেজিস্ট্রেশন নম্বর</Label>
                        <Input
                          value={formData.nid}
                          onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                          placeholder="আইডি / লাইসেন্স নম্বর লিখুন"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">TIN / VAT নম্বর</Label>
                        <Input
                          value={formData.tinNumber}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                          placeholder="টিন / ভ্যাট নম্বর লিখুন"
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">প্রারম্ভিক বকেয়া / পাওনা</Label>
                        <Input
                          type="number"
                          value={formData.openingBalance}
                          onChange={(e) =>
                            setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="৳ 0.00"
                          className="rounded-xl h-10 bg-white border-slate-200 font-black text-rose-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">ক্রেডিট সীমা (Credit Limit)</Label>
                        <Input
                          type="number"
                          value={formData.creditLimit}
                          onChange={(e) =>
                            setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="৳ 0.00"
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">স্পেশাল কমিশন / ছাড় (%)</Label>
                        <Input
                          type="number"
                          value={formData.discountPercent}
                          onChange={(e) =>
                            setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="% 0"
                          className="rounded-xl h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">যুক্ত হওয়ার তারিখ</Label>
                        <Input
                          type="date"
                          value={formData.joinedDate}
                          onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                          className="rounded-xl h-10 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label className="text-xs font-bold text-slate-700">বিশেষ নোট</Label>
                      <Input
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="গ্রাহক সম্পর্কিত যে কোনো বিশেষ নোট লিখুন..."
                        className="rounded-xl h-10 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* --- RIGHT COLUMN (NARROW SIDEBAR PANEL ~25%) --- */}
                <div className="lg:col-span-3 space-y-4">
                  {/* CARD 1: LOGO / PHOTO UPLOAD */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-center">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      {isCustomer ? 'গ্রাহকের ছবি / লোগো' : 'কোম্পানির লোগো / ছবি'}
                    </h2>

                    <div className="flex flex-col items-center gap-2.5">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border-2 border-orange-200 flex items-center justify-center shadow-inner group">
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Logo / Photo" className="w-full h-full object-cover" />
                        ) : isCustomer ? (
                          <Users className="w-9 h-9 text-slate-300" />
                        ) : (
                          <Building2 className="w-9 h-9 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-1.5 w-full">
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">
                          লোগো আপলোড করতে ক্লিক করুন
                          <br />
                          <span className="text-[8px] text-slate-300">জেপিজি, পিএনজি (সর্বোচ্চ ২এমবি)</span>
                        </p>

                        <label className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold transition-colors">
                          <Camera className="w-3.5 h-3.5" /> {formData.photoUrl ? 'ছবি পরিবর্তন' : 'ছবি আপলোড'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>

                        {formData.photoUrl && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                              className="text-[11px] text-rose-600 font-bold hover:underline"
                            >
                              ছবি মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: QUICK INFO */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs font-bold text-slate-700">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">দ্রুত তথ্য</h2>

                    <div className="space-y-2.5 pt-0.5 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">
                          {isCustomer ? 'গ্রাহক আইডি' : 'কোম্পানি আইডি'}
                        </span>
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {isCustomer ? 'CUST-8832' : 'SUPP-9821'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">স্ট্যাটাস</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">
                          সক্রিয় (ACTIVE)
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">
                          {isCustomer ? 'গ্রাহকের ধরন' : 'সরবরাহের ধরন'}
                        </span>
                        <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-2 py-0.5 rounded">
                          {formData.customerType || 'খুচরা গ্রাহক'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STICKY ACTION FOOTER BAR */}
              <div className="bg-white border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-3xl sticky bottom-0 z-40 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    💡 {isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণের পূর্বে সঠিকতা যাচাই করে নিন।' : 'কোম্পানির তথ্য সংরক্ষণের পূর্বে যাচাই করে নিন।'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-xl h-11 px-6 font-bold text-slate-600 border-slate-300 hover:bg-slate-100"
                  >
                    বাতিল
                  </Button>

                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-8 h-11 rounded-xl shadow-md active:scale-95 transition-all text-base"
                  >
                    <Save className="w-4 h-4 mr-2 inline" />{' '}
                    {isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণ করুন' : 'কোম্পানি সংরক্ষণ করুন'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
