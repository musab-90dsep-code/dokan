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
import { bdLocationData } from '@/lib/bangladeshData';
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

import { useSearchParams } from 'next/navigation';

export default function PartyManagementPage({ type }: PartyManagementPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams ? searchParams.get('edit') : null;
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

  // Cascading Location Helpers
  const selectedDivisionObj = bdLocationData.find(d => d.name === formData.division) || bdLocationData[0];
  const availableDistricts = selectedDivisionObj ? selectedDivisionObj.districts : [];
  const selectedDistrictObj = availableDistricts.find(d => d.name === formData.district) || availableDistricts[0];
  const availableThanas = selectedDistrictObj ? selectedDistrictObj.thanas : [];

  const openEdit = useCallback((p: Party) => {
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
  }, [isCustomer]);

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
      return partyList;
    } catch (err) {
      console.error('Error fetching parties:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      const partyList = await fetchParties();
      if (ignore) return;
      if (editIdParam && partyList && partyList.length > 0) {
        const target = partyList.find((p) => String(p.id) === String(editIdParam));
        if (target) {
          openEdit(target);
          router.replace(isCustomer ? '/customers' : '/suppliers');
        }
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [fetchParties, editIdParam, openEdit, router, isCustomer]);

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
      <div className="space-y-5 font-bengali pb-10">
        
        {/* 1. TOP TITLE, BREADCRUMB & HEADER ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              হোম &gt; {isCustomer ? 'কাস্টমার' : 'সরবরাহকারী'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-blue-600 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>রিপোর্ট এক্সপোর্ট</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCustomer ? 'নতুন কাস্টমার' : 'নতুন সরবরাহকারী'}</span>
            </Button>
          </div>
        </div>

        {/* 2. 4 TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: সর্বমোট কাস্টমার */}
          <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">সর্বমোট কাস্টমার</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">সকল কাস্টমারের সংখ্যা</p>
            </div>
          </div>

          {/* CARD 2: সক্রিয় কাস্টমার */}
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">সক্রিয় কাস্টমার</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">লেনদেন করেছেন</p>
            </div>
          </div>

          {/* CARD 3: মোট বাকি */}
          <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">
              ৳
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">মোট বাকি</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                ৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">সকল কাস্টমারের বাকি</p>
            </div>
          </div>

          {/* CARD 4: এই মাসে নতুন */}
          <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">এই মাসে নতুন</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">নতুন যোগদান</p>
            </div>
          </div>

        </div>

        {/* 3. TABLE CONTAINER CARD */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                
                {/* Search Box */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="কাস্টমার নাম, মোবাইল, বা ইমেইল সার্চ করুন..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                  />
                </div>

                {/* Group Selector */}
                <Select value={filterType} onValueChange={(val) => setFilterType(val || 'সব')}>
                  <SelectTrigger className="w-36 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="সকল গ্রুপ" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs">
                    <SelectItem value="সব">সকল গ্রুপ</SelectItem>
                    <SelectItem value="খুচরা গ্রাহক">খুচরা ক্রেতা</SelectItem>
                    <SelectItem value="কন্ট্রাকটর">ঠিকাদার</SelectItem>
                    <SelectItem value="পাইকারি গ্রাহক">পাইকারি</SelectItem>
                  </SelectContent>
                </Select>

                {/* More Filters */}
                <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-white hover:bg-slate-50 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>আরো ফিল্টার</span>
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow className="text-xs text-slate-700 font-black">
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900 w-12">ক্রমিক</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">কাস্টমারের নাম</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">মোবাইল নম্বর</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">গ্রুপ</TableHead>
                    <TableHead className="py-3 px-4 text-right font-black text-slate-900">মোট বকেয়া</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">সর্বশেষ লেনদেন</TableHead>
                    <TableHead className="py-3 px-4 text-center font-black text-slate-900">স্ট্যাটাস</TableHead>
                    <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        কোনো তথ্য পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p, idx) => {
                      const isWholesale = p.customerType === 'পাইকারি গ্রাহক';
                      const isContractor = p.customerType === 'কন্ট্রাকটর';
                      return (
                        <TableRow
                          key={p.id}
                          onClick={() => router.push(isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-3.5 px-4 text-left text-slate-500 font-mono font-bold">
                            {toBnDigits(String(idx + 1).padStart(2, '0'))}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-200 flex-shrink-0">
                                {p.photoUrl ? (
                                  <img src={p.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  p.name?.charAt(0) || 'ক'
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{p.email || `${p.phone}@dokan.com`}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {toBnDigits(p.phone)}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <span className={cn(
                              "inline-block font-bold text-[11px] px-3 py-0.5 rounded-full",
                              isContractor
                                ? "bg-blue-100/80 text-blue-700"
                                : isWholesale
                                ? "bg-purple-100/80 text-purple-700"
                                : "bg-emerald-100/80 text-emerald-700"
                            )}>
                              {isContractor ? 'ঠিকাদার' : isWholesale ? 'পাইকারি' : 'খুচরা ক্রেতা'}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600">
                            ৳ {(p.totalDue || 0).toLocaleString('bn-BD')}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <p className="text-slate-700 font-medium text-[11px]">{p.joinedDate || '২০ মে, ২০২৪'}</p>
                            <p className="text-slate-400 font-medium text-[10px]">ইনভয়েস: INV-{p.id.slice(0, 4)}</p>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              সক্রিয়
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Button */}
                              <button
                                onClick={() => router.push(isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`)}
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
                                title="প্রোফাইল দেখুন"
                              >
                                👁️
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => openEdit(p)}
                                className="w-7 h-7 rounded-lg border border-blue-200 bg-blue-50/60 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                title="সম্পাদনা"
                              >
                                ✏️
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50/60 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                title="মুছুন"
                              >
                                🗑️
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
              <div>
                মোট <strong className="text-slate-900 font-bold">{toBnDigits(parties.length)}</strong> জন কাস্টমারের মধ্যে ১ থেকে {toBnDigits(filtered.length)} দেখানো হচ্ছে
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">«</Button>
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">‹</Button>
                <Button className="w-7 h-7 rounded-lg text-xs font-bold p-0 bg-blue-600 text-white">১</Button>
                <Button variant="outline" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 p-0 font-bold">২</Button>
                <Button variant="outline" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600 p-0 font-bold">৩</Button>
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">›</Button>
                <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">»</Button>
                <Select defaultValue="10">
                  <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs">
                    <SelectItem value="10">১০ / পেজ</SelectItem>
                    <SelectItem value="25">২৫ / পেজ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                          <SelectContent className="font-bengali text-xs">
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
                          onValueChange={(val: string | null) => {
                            const newDiv = val || 'ঢাকা';
                            const divObj = bdLocationData.find(d => d.name === newDiv);
                            const firstDist = divObj && divObj.districts.length > 0 ? divObj.districts[0].name : '';
                            const firstThana = divObj && divObj.districts.length > 0 && divObj.districts[0].thanas.length > 0 ? divObj.districts[0].thanas[0] : '';
                            setFormData({
                              ...formData,
                              division: newDiv,
                              district: firstDist,
                              thana: firstThana
                            });
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs max-h-56">
                            {bdLocationData.map(d => (
                              <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          জেলা (ঐচ্ছিক)
                        </Label>
                        <Select
                          value={formData.district}
                          onValueChange={(val: string | null) => {
                            const newDist = val || '';
                            const distObj = availableDistricts.find(d => d.name === newDist);
                            const firstThana = distObj && distObj.thanas.length > 0 ? distObj.thanas[0] : '';
                            setFormData({
                              ...formData,
                              district: newDist,
                              thana: firstThana
                            });
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="জেলা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs max-h-56">
                            {availableDistricts.map(dst => (
                              <SelectItem key={dst.name} value={dst.name}>{dst.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">থানা / এলাকা (ঐচ্ছিক)</Label>
                        {availableThanas.length > 0 ? (
                          <Select
                            value={formData.thana}
                            onValueChange={(val: string | null) =>
                              setFormData({ ...formData, thana: val || '' })
                            }
                          >
                            <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                              <SelectValue placeholder="থানা নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs max-h-56">
                              {availableThanas.map(th => (
                                <SelectItem key={th} value={th}>{th}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={formData.thana}
                            onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
                            placeholder="যেমন: মতিঝিল / তেজগাঁও"
                            className="rounded-xl h-10 bg-white border-slate-200"
                          />
                        )}
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
