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
  Save,
  Calendar,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
  Lightbulb
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minDue, setMinDue] = useState('');
  const [maxDue, setMaxDue] = useState('');
  const [filterDivision, setFilterDivision] = useState('সব');

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterType('সব');
    setFilterDue('সব');
    setMinDue('');
    setMaxDue('');
    setFilterDivision('সব');
  };

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
    if (isCustomer && !formData.businessName.trim()) {
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
      business_name: isCustomer ? formData.businessName.trim() : (formData.businessName.trim() || formData.name.trim()),
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
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(searchLower) ||
      p.phone?.includes(search) ||
      (p.businessName && p.businessName.toLowerCase().includes(searchLower)) ||
      (p.address && p.address.toLowerCase().includes(searchLower)) ||
      (p.email && p.email.toLowerCase().includes(searchLower));

    const matchesType =
      filterType === 'সব' ||
      (p.customerType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড')) === filterType;

    const matchesDue =
      filterDue === 'সব'
        ? true
        : filterDue === 'বকেয়া আছে'
        ? (p.totalDue || 0) > 0
        : (p.totalDue || 0) <= 0;

    let matchesDate = true;
    if (startDate || endDate) {
      const partyDate = p.joinedDate || '';
      if (startDate && partyDate < startDate) matchesDate = false;
      if (endDate && partyDate > endDate) matchesDate = false;
    }

    let matchesDueAmount = true;
    const dueVal = p.totalDue || 0;
    if (minDue && dueVal < parseFloat(minDue)) matchesDueAmount = false;
    if (maxDue && dueVal > parseFloat(maxDue)) matchesDueAmount = false;

    let matchesDivision = true;
    if (filterDivision !== 'সব' && p.division !== filterDivision) {
      matchesDivision = false;
    }

    return Boolean(matchesSearch) && matchesType && matchesDue && matchesDate && matchesDueAmount && matchesDivision;
  });

  const totalDue = parties.reduce((a, p) => a + (p.totalDue || 0), 0);

  return (
    <Shell>
      {!isAddOpen ? (
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
            <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-blue-600 bg-white hover:bg-slate-50 font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>রিপোর্ট এক্সপোর্ট</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCustomer ? 'নতুন কাস্টমার' : 'নতুন সরবরাহকারী'}</span>
            </Button>
          </div>
        </div>

        {/* 2. 4 TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: সর্বমোট কাস্টমার/সরবরাহকারী */}
          <div className="bg-white border border-blue-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isCustomer ? 'সর্বমোট কাস্টমার' : 'সর্বমোট সরবরাহকারী'}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isCustomer ? 'সকল কাস্টমারের সংখ্যা' : 'সকল সরবরাহকারীর সংখ্যা'}</p>
            </div>
          </div>

          {/* CARD 2: সক্রিয় কাস্টমার/সরবরাহকারী */}
          <div className="bg-white border border-emerald-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{isCustomer ? 'সক্রিয় কাস্টমার' : 'সক্রিয় সরবরাহকারী'}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {toBnDigits(parties.length)} <span className="text-xs font-medium text-slate-500">জন</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">লেনদেন করেছেন</p>
            </div>
          </div>

          {/* CARD 3: মোট বাকি */}
          <div className="bg-white border border-amber-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">
              ৳
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">মোট বাকি</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                ৳ {toBnDigits(totalDue.toLocaleString('en-IN'))}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isCustomer ? 'সকল কাস্টমারের বাকি' : 'সকল পাওয়া পাওনা'}</p>
            </div>
          </div>

          {/* CARD 4: এই মাসে নতুন */}
          <div className="bg-white border border-rose-100 rounded-md p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
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

        {/* COMPACT & EFFICIENT FILTER CARD */}
        <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
          {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Unified Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={isCustomer ? "কাস্টমার নাম, মোবাইল, বা ইমেইল দিয়ে খুঁজুন..." : "কোম্পানি বা সরবরাহকারীর নাম, ফোন দিয়ে খুঁজুন..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range (Start & End) in 1 Compact Block */}
            <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-md border border-slate-200/80">
              <Calendar className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28 cursor-pointer"
                title="যোগদানের শুরুর তারিখ"
              />
              <span className="text-slate-300 text-xs font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28 cursor-pointer"
                title="যোগদানের শেষের তারিখ"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-slate-400 hover:text-rose-600 px-1"
                  title="তারিখ ফিল্টার মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status/Due Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'সব', label: isCustomer ? 'সব কাস্টমার' : 'সব সরবরাহকারী' },
                { id: 'বকেয়া আছে', label: 'বকেয়া আছে' },
                { id: 'পরিশোধিত', label: 'হিসাব পরিষ্কার' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterDue(p.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                    filterDue === p.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* More Filters Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-10 px-3.5 rounded-md border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>আরও ফিল্টার</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {(search || startDate || endDate || filterType !== 'সব' || filterDue !== 'সব' || minDue || maxDue || filterDivision !== 'সব') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 px-2.5 rounded-md text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1"
                  title="ফিল্টার রিসেট করুন"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Secondary Collapsible Drawer */}
          {isFilterExpanded && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
              
              {/* Type Selector */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">শ্রেণী / ধরন</Label>
                <Select value={filterType} onValueChange={(val) => setFilterType(val || 'সব')}>
                  <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-200 rounded-md text-xs font-bold">
                    <SelectValue placeholder="সকল ধরন" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="সব">সকল ধরন</SelectItem>
                    {isCustomer ? (
                      <>
                        <SelectItem value="খুচরা গ্রাহক">খুচরা ক্রেতা</SelectItem>
                        <SelectItem value="কন্ট্রাকটর">ঠিকাদার</SelectItem>
                        <SelectItem value="পাইকারি গ্রাহক">পাইকারি</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="রড">রড</SelectItem>
                        <SelectItem value="সিমেন্ট">সিমেন্ট</SelectItem>
                        <SelectItem value="রড ও সিমেন্ট">রড ও সিমেন্ট</SelectItem>
                        <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Division Selector */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বিভাগ</Label>
                <Select value={filterDivision} onValueChange={(val) => setFilterDivision(val || 'সব')}>
                  <SelectTrigger className="w-full h-9 bg-slate-50/50 border-slate-200 rounded-md text-xs font-bold">
                    <SelectValue placeholder="সকল বিভাগ" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="সব">সকল বিভাগ</SelectItem>
                    {Object.keys(bdLocationData).map((div) => (
                      <SelectItem key={div} value={div}>{div}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বকেয়া পরিমাণ (৳)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="সর্বনিম্ন"
                    value={minDue}
                    onChange={e => setMinDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    placeholder="সর্বোচ্চ"
                    value={maxDue}
                    onChange={e => setMaxDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

            </div>
          )}
        </Card>

        {/* 3. TABLE CONTAINER CARD */}
        <Card className="bg-white border border-slate-200/80 rounded-md shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Table */}
            <div className="border border-slate-200/80 rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow className="text-xs text-slate-700 font-black">
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900 w-12">ক্রমিক</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">{isCustomer ? 'কাস্টমারের নাম' : 'কোম্পানি / সরবরাহকারী'}</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">মোবাইল নম্বর</TableHead>
                    <TableHead className="py-3 px-4 text-left font-black text-slate-900">{isCustomer ? 'গ্রুপ' : 'সরবরাহের ধরন'}</TableHead>
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
                      const suppType = p.customerType || p.supplyType || 'রড';
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
                            {isCustomer ? (
                              <span className={cn(
                                "inline-block font-bold text-[11px] px-3 py-0.5 rounded-md",
                                isContractor
                                  ? "bg-blue-100/80 text-blue-700"
                                  : isWholesale
                                  ? "bg-purple-100/80 text-purple-700"
                                  : "bg-emerald-100/80 text-emerald-700"
                              )}>
                                {isContractor ? 'ঠিকাদার' : isWholesale ? 'পাইকারি' : 'খুচরা ক্রেতা'}
                              </span>
                            ) : (
                              <span className={cn(
                                "inline-block font-bold text-[11px] px-3 py-0.5 rounded-md",
                                suppType === 'সিমেন্ট'
                                  ? "bg-cyan-100/80 text-cyan-700"
                                  : suppType === 'রড ও সিমেন্ট'
                                  ? "bg-purple-100/80 text-purple-700"
                                  : suppType === 'অন্যান্য'
                                  ? "bg-slate-100/80 text-slate-700"
                                  : "bg-amber-100/80 text-amber-800"
                              )}>
                                {suppType}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600">
                            ৳ {toBnDigits((p.totalDue || 0).toLocaleString('en-IN'))}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left">
                            <p className="text-slate-700 font-medium text-[11px]">{p.joinedDate || '২০ মে, ২০২৪'}</p>
                            <p className="text-slate-400 font-medium text-[10px]">ইনভয়েস: INV-{p.id.slice(0, 4)}</p>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              সক্রিয়
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Button */}
                              <button
                                onClick={() => router.push(isCustomer ? `/customers/${p.id}` : `/suppliers/${p.id}`)}
                                className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
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
                মোট <strong className="text-slate-900 font-bold">{toBnDigits(parties.length)}</strong> জন {isCustomer ? 'কাস্টমারের' : 'সরবরাহকারীর'} মধ্যে ১ থেকে {toBnDigits(filtered.length)} দেখানো হচ্ছে
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
      ) : (
        /* CREATE / EDIT CUSTOMER IN-PAGE VIEW (Direct Page View, Framed Container) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsAddOpen(false); resetForm(); }}
                  className="w-9 h-9 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">
                    {isCustomer ? 'কাস্টমার ব্যবস্থাপনা' : 'সরবরাহকারী ব্যবস্থাপনা'}
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editing
                      ? isCustomer ? 'গ্রাহকের তথ্য সম্পাদনা করুন' : 'সরবরাহকারীর তথ্য সম্পাদনা করুন'
                      : isCustomer ? 'নতুন গ্রাহক যোগ করুন' : 'নতুন কোম্পানি / সরবরাহকারী যোগ করুন'}
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsAddOpen(false); resetForm(); }}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* MAIN FORM GRID INSIDE FRAME */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- LEFT COLUMN (WIDE ~75%) --- */}
                <div className="lg:col-span-9 space-y-5">
                  
                  {/* STEP 1: ❶ প্রাথমিক তথ্য */}
                  <div className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ১
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        প্রাথমিক তথ্য (Basic Information)
                      </h2>
                    </div>

                    <div className={cn("grid grid-cols-1 gap-3 text-xs font-bold text-slate-700", isCustomer ? "md:grid-cols-3" : "md:grid-cols-2")}>
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

                      {isCustomer && (
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
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">
                          {isCustomer ? 'গ্রাহকের ধরন (ঐচ্ছিক)' : 'সরবরাহের ধরন / ক্যাটাগরি (ঐচ্ছিক)'}
                        </Label>
                        <Select
                          value={formData.customerType}
                          onValueChange={(val: string | null) =>
                            setFormData({ ...formData, customerType: val || (isCustomer ? 'খুচরা গ্রাহক' : 'রড') })
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold">
                            <SelectValue placeholder="ধরন নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {isCustomer ? (
                              <>
                                <SelectItem value="খুচরা গ্রাহক">খুচরা গ্রাহক (Retail)</SelectItem>
                                <SelectItem value="পাইকারি গ্রাহক">পাইকারি গ্রাহক (Wholesale)</SelectItem>
                                <SelectItem value="কন্ট্রাকটর">কন্ট্রাকটর / ডেভেলপার (Contractor)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="রড">🧱 রড (Rod Supplier)</SelectItem>
                                <SelectItem value="সিমেন্ট">🏗️ সিমেন্ট (Cement Supplier)</SelectItem>
                                <SelectItem value="রড ও সিমেন্ট">🏢 রড ও সিমেন্ট (Rod & Cement)</SelectItem>
                                <SelectItem value="অন্যান্য">📦 অন্যান্য (General Supplier)</SelectItem>
                              </>
                            )}
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
                              className="rounded-md h-10 bg-white border-slate-200 pr-9"
                            />
                          </div>
                          {formData.altPhone !== undefined && (
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                              <Input
                                value={formData.altPhone}
                                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                                placeholder="বিকল্প ফোন নম্বর"
                                className="rounded-md h-10 bg-white border-slate-200 pr-9"
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
                          <SelectTrigger className="rounded-md h-10 bg-white border-slate-200">
                            <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {bdLocationData.map((d) => (
                              <SelectItem key={d.name} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">জেলা</Label>
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
                          <SelectTrigger className="rounded-md h-10 bg-white border-slate-200">
                            <SelectValue placeholder="জেলা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {availableDistricts.map((dst) => (
                              <SelectItem key={dst.name} value={dst.name}>
                                {dst.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">উপজেলা / থানা</Label>
                        <Select
                          value={formData.thana}
                          onValueChange={(val: string | null) => setFormData({ ...formData, thana: val || '' })}
                        >
                          <SelectTrigger className="rounded-md h-10 bg-white border-slate-200">
                            <SelectValue placeholder="থানা নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            {availableThanas.map((th) => (
                              <SelectItem key={th} value={th}>
                                {th}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs font-bold text-slate-700">বিস্তারিত ঠিকানা (বিল্ডিং / রোড / এলাকা)</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="যেমন: বাসা #৪৫, রোড #০২, সেক্টর #১০, উত্তরা"
                          className="rounded-md h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পোস্ট কোড</Label>
                        <Input
                          value={formData.postcode}
                          onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                          placeholder="১২৩০"
                          className="rounded-md h-10 bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 4: ❹ আর্থিক ও পলিসি নির্ধারণ */}
                  <div className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        ৪
                      </span>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        আর্থিক পলিসি ও পরিচয়পত্র (Financial & Identification)
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">পরিচয়পত্রের ধরন</Label>
                        <Select
                          value={formData.idType}
                          onValueChange={(val: string | null) => setFormData({ ...formData, idType: val || 'NID' })}
                        >
                          <SelectTrigger className="rounded-md h-10 bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs">
                            <SelectItem value="NID">জাতীয় পরিচয়পত্র (NID)</SelectItem>
                            <SelectItem value="Passport">পাসপোর্ট</SelectItem>
                            <SelectItem value="TradeLicense">ট্রেড লাইসেন্স</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">আইডি নম্বর (NID / Trade License)</Label>
                        <Input
                          value={formData.nid}
                          onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                          placeholder="১২৩৪৫৬৭৮৯০"
                          className="rounded-md h-10 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">ই-টিন (e-TIN) নম্বর</Label>
                        <Input
                          value={formData.tinNumber}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                          placeholder="টিন নম্বর..."
                          className="rounded-md h-10 bg-white border-slate-200"
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
                          className="rounded-md h-10 bg-white border-slate-200 font-black text-rose-600"
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
                          className="rounded-md h-10 bg-white border-slate-200 font-bold"
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
                          className="rounded-md h-10 bg-white border-slate-200 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">যুক্ত হওয়ার তারিখ</Label>
                        <Input
                          type="date"
                          value={formData.joinedDate}
                          onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                          className="rounded-md h-10 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label className="text-xs font-bold text-slate-700">বিশেষ নোট</Label>
                      <Input
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="গ্রাহক সম্পর্কিত যে কোনো বিশেষ নোট লিখুন..."
                        className="rounded-md h-10 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* --- RIGHT COLUMN (NARROW SIDEBAR PANEL ~25%) --- */}
                <div className="lg:col-span-3 space-y-4">
                  {/* CARD 1: LOGO / PHOTO UPLOAD */}
                  <div className="bg-white p-4 rounded-md border border-slate-200 shadow-xs space-y-3 text-center">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      {isCustomer ? 'গ্রাহকের ছবি / লোগো' : 'কোম্পানির লোগো / ছবি'}
                    </h2>

                    <div className="flex flex-col items-center gap-2.5">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden bg-slate-50 border-2 border-blue-200 flex items-center justify-center shadow-inner group">
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

                        <label className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-colors">
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

              {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0 mt-6 rounded-b-md">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    💡 {isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণের পূর্বে সঠিকতা যাচাই করে নিন।' : 'কোম্পানির তথ্য সংরক্ষণের পূর্বে যাচাই করে নিন।'}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsAddOpen(false); resetForm(); }}
                    className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>

                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 h-11 rounded-md shadow-md shadow-blue-600/20 active:scale-95 transition-all text-sm"
                  >
                    <Save className="w-4 h-4 mr-2 inline" />
                    {isCustomer ? 'গ্রাহকের তথ্য সংরক্ষণ করুন' : 'সরবরাহকারী সংরক্ষণ করুন'}
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
