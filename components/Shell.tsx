'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { api, TransactionData } from '@/lib/api';
import { Button } from './ui/button';
import { HardHat, Search, Bell, Landmark, CheckCircle2, Calendar, FileText, ShoppingCart, ArrowRight, NotebookPen, Plus, Trash2, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export const formatBnDate = (dateVal: any, pattern: string = 'dd MMMM yyyy') => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, pattern, { locale: bn });
    return toBnDigits(raw);
  } catch {
    return '—';
  }
};

export interface ChequeItem {
  id: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDate?: string;
  amount: number;
  cashAmount?: number;
  status: 'pending' | 'cleared' | 'bounced';
  note?: string;
  createdAt?: any;
  clearedAt?: any;
}

export interface PendingOrderItem {
  id: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  items?: any[];
  createdAt?: any;
  invoiced?: boolean;
  stage?: string;
}

export interface HawlatItem {
  id: string;
  personName: string;
  amount: number;
  note: string;
  date: string;
  isSettled?: boolean;
  settledAt?: string;
  createdAt: string;
}

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Admin user context
  const [user, setUser] = useState<{ displayName: string; email: string; photoURL?: string } | null>({
    displayName: 'এডমিন ইউজার',
    email: 'admin@dokan.com'
  });
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChequeDrawer, setShowChequeDrawer] = useState(false);
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);
  const [showHawlatDrawer, setShowHawlatDrawer] = useState(false);
  const [hawlatItems, setHawlatItems] = useState<HawlatItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHawlat = localStorage.getItem('dokan_hawlat_items');
        return savedHawlat ? JSON.parse(savedHawlat) : [];
      } catch (e) {
        console.error('Error loading Hawlat items:', e);
      }
    }
    return [];
  });
  const [showAddHawlatForm, setShowAddHawlatForm] = useState(false);
  const [settlingHawlat, setSettlingHawlat] = useState<HawlatItem | null>(null);
  const [hawlatFilterTab, setHawlatFilterTab] = useState<'all' | 'pending' | 'settled'>('all');

  // Hawlat Form State
  const [hawlatPersonName, setHawlatPersonName] = useState('');
  const [hawlatAmount, setHawlatAmount] = useState('');
  const [hawlatNote, setHawlatNote] = useState('');
  const [hawlatDate, setHawlatDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const saveHawlatItems = (items: HawlatItem[]) => {
    setHawlatItems(items);
    try {
      localStorage.setItem('dokan_hawlat_items', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving Hawlat items:', e);
    }
  };

  const loadHawlats = useCallback(async () => {
    try {
      const apiHawlats = await api.hawlats.list();
      if (apiHawlats && apiHawlats.length > 0) {
        const formatted: HawlatItem[] = apiHawlats.map(h => ({
          id: String(h.id),
          personName: h.person_name || 'সাধারণ হাওলাত',
          amount: Number(h.amount || 0),
          note: h.note || '',
          date: h.date || format(new Date(), 'yyyy-MM-dd'),
          isSettled: !!h.is_settled,
          settledAt: h.settled_at || undefined,
          createdAt: h.created_at || new Date().toISOString()
        }));
        setHawlatItems(formatted);
        try {
          localStorage.setItem('dokan_hawlat_items', JSON.stringify(formatted));
        } catch {}
      }
    } catch (e) {
      console.error('Error fetching hawlats from API:', e);
    }
  }, []);

  const handleAddHawlat = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(hawlatAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    const payload = {
      person_name: hawlatPersonName.trim() || 'সাধারণ হাওলাত',
      amount: numAmount,
      note: hawlatNote.trim() || 'কোনো বিবরণ দেওয়া হয়নি',
      date: hawlatDate || format(new Date(), 'yyyy-MM-dd')
    };

    try {
      const created = await api.hawlats.create(payload);
      const newItem: HawlatItem = {
        id: String(created.id || 'hw_' + Date.now()),
        personName: created.person_name || payload.person_name,
        amount: Number(created.amount || payload.amount),
        note: created.note || payload.note,
        date: created.date || payload.date,
        isSettled: false,
        createdAt: created.created_at || new Date().toISOString()
      };
      const updated = [newItem, ...hawlatItems.filter(i => i.id !== newItem.id)];
      saveHawlatItems(updated);
      toast.success('হাওলাত নোট ডাটাবেজে সংরক্ষণ হয়েছে');
    } catch (err) {
      const newItem: HawlatItem = {
        id: 'hw_' + Date.now(),
        personName: payload.person_name,
        amount: payload.amount,
        note: payload.note,
        date: payload.date,
        isSettled: false,
        createdAt: new Date().toISOString()
      };
      const updated = [newItem, ...hawlatItems];
      saveHawlatItems(updated);
      toast.success('হাওলাত নোট যুক্ত করা হয়েছে');
    }

    // Reset form
    setHawlatPersonName('');
    setHawlatAmount('');
    setHawlatNote('');
    setHawlatDate(format(new Date(), 'yyyy-MM-dd'));
    setShowAddHawlatForm(false);
  };

  const handleSettleHawlat = async (item: HawlatItem) => {
    try {
      if (!item.id.startsWith('hw_')) {
        await api.hawlats.update(item.id, {
          is_settled: true,
          settled_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error settling hawlat via API:', err);
    }

    const updated = hawlatItems.map(h => 
      h.id === item.id 
        ? { ...h, isSettled: true, settledAt: new Date().toISOString() } 
        : h
    );
    saveHawlatItems(updated);
    toast.success(`৳ ${item.amount.toLocaleString('bn-BD')} টাকা হাওলাত পরিশোধ চিহ্নিত হয়েছে`);
    setSettlingHawlat(null);
  };

  const handleDeleteHawlat = async (id: string) => {
    try {
      if (!id.startsWith('hw_')) {
        await api.hawlats.delete(id);
      }
    } catch (err) {
      console.error('API Hawlat delete error:', err);
    }
    const updated = hawlatItems.filter(item => item.id !== id);
    saveHawlatItems(updated);
    toast.info('হাওলাত এন্ট্রি মুছে ফেলা হয়েছে');
  };

  const pendingHawlatItems = hawlatItems.filter(h => !h.isSettled);
  const settledHawlatItems = hawlatItems.filter(h => h.isSettled);
  const pendingHawlatAmount = pendingHawlatItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const settledHawlatAmount = settledHawlatItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const filteredHawlatItems = hawlatItems.filter(h => {
    if (hawlatFilterTab === 'pending') return !h.isSettled;
    if (hawlatFilterTab === 'settled') return !!h.isSettled;
    return true;
  });

  const loadChequesAndOrders = useCallback(async () => {
    try {
      const txs = await api.transactions.list();
      const safeTxs = Array.isArray(txs) ? txs : [];
      const chequeItems: ChequeItem[] = safeTxs
        .filter(t => 
          t.payment_method === 'cheque' || 
          t.payment_method === 'check' || 
          t.payment_method === 'split' || 
          !!t.cheque_number || 
          !!t.cheque_bank
        )
        .filter(t => t.cheque_status !== 'cleared' && t.cheque_status !== 'bounced')
        .map(t => ({
          id: String(t.id || t.invoice_no),
          invoiceId: t.invoice_no,
          customerName: t.party_name || 'অজ্ঞাত গ্রাহক',
          customerPhone: t.party_phone || '',
          bankName: t.cheque_bank || 'ব্যাংক',
          chequeNo: t.cheque_number || `CHQ-${t.id}`,
          chequeDate: t.cheque_due_date || (t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy') : ''),
          amount: t.paid_amount || t.total_amount || 0,
          status: t.cheque_status || 'pending',
          createdAt: t.created_at
        }));
      setCheques(chequeItems);

      const orderItems: PendingOrderItem[] = safeTxs
        .filter(t => t.transaction_type === 'sale')
        .map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || 'গ্রাহক',
          customerPhone: t.party_phone || '',
          totalAmount: t.total_amount,
          items: t.items || [],
          createdAt: t.created_at,
          invoiced: t.status === 'completed' || t.status === 'invoiced',
          stage: t.status || 'pending'
        }));
      setOrders(orderItems);
    } catch (e) {
      console.error('Error loading Shell data:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadChequesAndOrders();
      void loadHawlats();
    }, 0);

    const handleReload = () => {
      void loadChequesAndOrders();
      void loadHawlats();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('orderUpdated', handleReload);
      window.addEventListener('focus', handleReload);
    }

    const interval = setInterval(handleReload, 5000);

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('orderUpdated', handleReload);
        window.removeEventListener('focus', handleReload);
      }
      clearInterval(interval);
    };
  }, [loadChequesAndOrders, loadHawlats]);

  const pendingCheques = cheques.filter(c => c.status === 'pending');
  const pendingTotalAmount = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

  const pendingOrders = orders.filter(o => !o.invoiced && o.stage !== 'completed' && o.stage !== 'invoiced');
  const pendingOrdersTotal = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleClearCheque = async (cheque: ChequeItem) => {
    try {
      setClearingId(cheque.id);
      await api.transactions.update(cheque.id, {
        cheque_status: 'cleared'
      });
      toast.success(`চেক ক্যাশ হয়েছে: ৳${cheque.amount.toLocaleString('bn-BD')}`);
      loadChequesAndOrders();
    } catch (err) {
      toast.error('চেক ক্যাশ করতে সমস্যা হয়েছে');
    } finally {
      setClearingId(null);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white overflow-x-hidden">
      {/* Printed Subtle Pattern Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-70" />
      {/* Soft Printed Ambient Gradient Accents */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/15 via-amber-300/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-500/10 via-blue-400/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
          {/* Left: Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ইনভয়েস, কাস্টমার, বা পণ্য সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-bengali"
              />
            </div>
          </div>

          {/* Right: Quick Triggers & User Profile */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Pending Orders Drawer Trigger */}
            <button
              onClick={() => setShowOrdersDrawer(!showOrdersDrawer)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
              title="চালান অপেক্ষমাণ অর্ডারসমূহ"
            >
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              {pendingOrders.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-orange-600 text-white rounded-full min-w-[18px] shadow-xs">
                  {toBnDigits(pendingOrders.length)}
                </span>
              )}
            </button>

            {/* Hawlat Drawer Trigger */}
            <button
              onClick={() => setShowHawlatDrawer(!showHawlatDrawer)}
              className="relative p-2 px-2.5 text-slate-700 hover:text-slate-900 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all flex items-center gap-1.5 font-bengali font-semibold text-xs shadow-2xs"
              title="হাওলাত খাতা (নোট মেমো)"
            >
              <NotebookPen className="h-4.5 w-4.5 text-emerald-600" />
              <span className="hidden sm:inline text-slate-800 font-bold">হাওলাত</span>
              {hawlatItems.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(hawlatItems.length)}
                </span>
              )}
            </button>

            {/* Cheque Drawer Trigger */}
            <button
              onClick={() => setShowChequeDrawer(!showChequeDrawer)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
              title="চেক ব্যবস্থাপনা"
            >
              <Landmark className="h-5 w-5 text-indigo-600" />
              {pendingCheques.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-[18px]">
                  {toBnDigits(pendingCheques.length)}
                </span>
              )}
            </button>

            {/* User Avatar & Name */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/20">
                {user?.displayName?.charAt(0) || 'D'}
              </div>
              <div className="hidden md:block text-left font-bengali">
                <p className="text-xs font-bold text-slate-800">{user?.displayName || 'দোকান এডমিন'}</p>
                <p className="text-[10px] text-slate-500">{user?.email || 'admin@dokan.com'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container - Widescreen Optimized */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1700px] mx-auto">
          {children}
        </main>
      </div>

      {/* Cheque Management Drawer */}
      <AnimatePresence>
        {showChequeDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChequeDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">পেন্ডিং চেকসমূহ</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowChequeDrawer(false)} className="text-slate-400 hover:text-white">
                  বন্ধ করুন
                </Button>
              </div>

              <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl">
                <p className="text-xs text-indigo-300">মোট পেন্ডিং পরিমাণ</p>
                <p className="text-2xl font-black text-indigo-400">৳ {pendingTotalAmount.toLocaleString('bn-BD')}</p>
              </div>

              <div className="mt-6 flex-1 space-y-3">
                {pendingCheques.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 text-sm">কোন পেন্ডিং চেক নেই</p>
                ) : (
                  pendingCheques.map(cheque => (
                    <div key={cheque.id} className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{cheque.customerName}</p>
                          <p className="text-xs text-slate-400">{cheque.bankName} - {cheque.chequeNo}</p>
                        </div>
                        <span className="text-sm font-extrabold text-orange-400">৳{cheque.amount.toLocaleString('bn-BD')}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/40">
                        <span className="text-[11px] text-slate-400">{cheque.chequeDate ? `তারিখ: ${cheque.chequeDate}` : 'তারিখ নির্দিষ্ট নেই'}</span>
                        <Button
                          size="sm"
                          onClick={() => handleClearCheque(cheque)}
                          disabled={clearingId === cheque.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> ক্যাশ করুন
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pending Orders Management Drawer */}
      <AnimatePresence>
        {showOrdersDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrdersDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col font-bengali"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-white">চালান অপেক্ষমাণ অর্ডারসমূহ</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowOrdersDrawer(false)} className="text-slate-400 hover:text-white">
                  বন্ধ করুন
                </Button>
              </div>

              <div className="mt-4 p-3.5 bg-orange-950/40 border border-orange-800/40 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-orange-300 font-semibold">অপেক্ষমাণ অর্ডারের সংখ্যা</p>
                  <p className="text-xl font-black text-orange-400 mt-0.5">{toBnDigits(pendingOrders.length)} টি অর্ডার</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-orange-300 font-semibold">মোট বকেয়া বিল</p>
                  <p className="text-xl font-black text-orange-400 mt-0.5">৳ {pendingOrdersTotal.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="mt-6 flex-1 space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto" />
                    <p className="font-bold text-slate-400 text-base">সব অর্ডারের চালান সম্পন্ন হয়েছে!</p>
                    <p className="text-xs text-slate-600">বর্তমানে কোনো অপেক্ষমাণ অর্ডার নেই</p>
                  </div>
                ) : (
                  pendingOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setShowOrdersDrawer(false);
                        router.push(`/orders?id=${order.id}`);
                      }}
                      className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-orange-500/50 rounded-2xl space-y-2.5 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              #{toBnDigits(order.id.slice(0, 8).toUpperCase())}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              চালান বাকি
                            </span>
                          </div>
                          <p className="font-bold text-slate-100 text-base mt-1 group-hover:text-orange-400 transition-colors">
                            {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-xs text-slate-400 font-semibold">{toBnDigits(order.customerPhone)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-400 block">
                            ৳ {order.totalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            {formatBnDate(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs text-orange-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>বিবরণী ও চালান তৈরি করুন</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hawlat Note Tracker Drawer */}
      <AnimatePresence>
        {showHawlatDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHawlatDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 p-5 md:p-6 overflow-y-auto shadow-2xl flex flex-col font-bengali text-slate-100"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <NotebookPen className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      হাওলাত খাতা
                      <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        মেমো নোট
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">ব্যক্তিগত বা সাময়িক হাওলাতের হিসেব নোট</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowHawlatDrawer(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Informational Banner */}
              <div className="mt-4 p-3 bg-slate-800/80 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  এটি শুধুমাত্র একটি সাধারণ <span className="text-emerald-300 font-bold">হাওলাত নোট খাতা</span>। এখান থেকে টাকার কোনো হিসাব আপনার মূল ক্যাশ বা হিসাব খাতা (Cash / Accounting) থেকে ইন বা আউট হবে না।
                </p>
              </div>

              {/* Stats & Add Button Header */}
              <div className="mt-4 p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex gap-4 items-center">
                  <div>
                    <p className="text-[11px] text-amber-400 font-semibold">চলতি হাওলাত</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5">
                      ৳ {pendingHawlatAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <p className="text-[11px] text-emerald-400 font-semibold">পরিশোধিত</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">
                      ৳ {settledHawlatAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddHawlatForm(!showAddHawlatForm)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all"
                >
                  {showAddHawlatForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddHawlatForm ? 'ফর্ম বন্ধ করুন' : 'নতুন হাওলাত যোগ করুন'}
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setHawlatFilterTab('all')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'all' ? "bg-slate-700 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  সবগুলো ({toBnDigits(hawlatItems.length)})
                </button>
                <button
                  onClick={() => setHawlatFilterTab('pending')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'pending' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  চলতি ({toBnDigits(pendingHawlatItems.length)})
                </button>
                <button
                  onClick={() => setHawlatFilterTab('settled')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer",
                    hawlatFilterTab === 'settled' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  পরিশোধিত ({toBnDigits(settledHawlatItems.length)})
                </button>
              </div>

              {/* New Hawlat Entry Form */}
              <AnimatePresence>
                {showAddHawlatForm && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddHawlat}
                    className="mt-4 p-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-3 overflow-hidden shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> নতুন হাওলাত তথ্য লিখুন
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">ব্যক্তি / গ্রাহকের নাম</label>
                        <input
                          type="text"
                          placeholder="যেমন: রহিম ভাই / নোট"
                          value={hawlatPersonName}
                          onChange={(e) => setHawlatPersonName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">টাকার পরিমাণ (৳) *</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="০.০০"
                          value={hawlatAmount}
                          onChange={(e) => setHawlatAmount(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">তারিখ</label>
                        <input
                          type="date"
                          value={hawlatDate}
                          onChange={(e) => setHawlatDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 font-medium mb-1">নোট / বিবরণ</label>
                        <input
                          type="text"
                          placeholder="যেমন: জরুরি প্রয়োজনে দেয়া হলো"
                          value={hawlatNote}
                          onChange={(e) => setHawlatNote(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddHawlatForm(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        বাতিল
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4"
                      >
                        সংরক্ষণ করুন
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Hawlat List Table */}
              <div className="mt-5 flex-1 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  হাওলাত এন্ট্রি তালিকা
                </h4>

                {filteredHawlatItems.length === 0 ? (
                  <div className="text-center text-slate-500 py-16 space-y-3 bg-slate-800/40 border border-slate-800 rounded-2xl">
                    <NotebookPen className="w-12 h-12 text-slate-600/50 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">কোনো হাওলাত এন্ট্রি পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      &quot;নতুন হাওলাত যোগ করুন&quot; বাটনে ক্লিক করে নতুন নোট তৈরি করুন
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
                          <tr>
                            <th className="py-2.5 px-3">তারিখ</th>
                            <th className="py-2.5 px-3">ব্যক্তি ও বিবরণ</th>
                            <th className="py-2.5 px-3 text-right">পরিমাণ (৳)</th>
                            <th className="py-2.5 px-2 text-center">অবস্থা / অ্যাকশন</th>
                            <th className="py-2.5 px-1 text-center">মুছুন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-bengali">
                          {filteredHawlatItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/60 transition-colors group">
                              <td className="py-3 px-3 align-top font-sans text-[11px] text-slate-400 whitespace-nowrap">
                                {formatBnDate(item.date, 'dd/MM/yyyy')}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <p className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">
                                  {item.personName}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                  {item.note}
                                </p>
                              </td>
                              <td className="py-3 px-3 align-top text-right whitespace-nowrap font-black text-amber-400 text-sm">
                                ৳ {item.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-2 align-top text-center whitespace-nowrap">
                                {item.isSettled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    পরিশোধিত
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setSettlingHawlat(item)}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-emerald-600 text-amber-300 hover:text-white border border-amber-500/30 hover:border-emerald-500 rounded-lg transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    পরিশোধ করুন
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-1 align-top text-center">
                                <button
                                  onClick={() => handleDeleteHawlat(item.id)}
                                  title="মুছে ফেলুন"
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hawlat Settlement Confirmation Modal */}
      <AnimatePresence>
        {settlingHawlat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettlingHawlat(null)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-bengali"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full text-slate-100 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">হাওলাত পরিশোধ নিশ্চিতকরণ</h3>
                    <p className="text-xs text-slate-400">এই হাওলাতটি কি পরিশোধ করা হয়েছে?</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ব্যক্তি/গ্রাহক:</span>
                    <span className="font-bold text-white">{settlingHawlat.personName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">টাকার পরিমাণ:</span>
                    <span className="font-black text-amber-400">৳ {settlingHawlat.amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {settlingHawlat.note && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">বিবরণ:</span>
                      <span className="text-slate-300 truncate max-w-[180px]">{settlingHawlat.note}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  নিশ্চিত করলে এই এন্ট্রিটি &quot;<span className="text-emerald-400 font-bold">পরিশোধিত</span>&quot; হিসেবে চিহ্নিত হবে এবং পরবর্তীতে আর পরিশোধ বাটনটি আসবে না।
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettlingHawlat(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    বাতিল
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSettleHawlat(settlingHawlat)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 rounded-xl"
                  >
                    হ্যাঁ, পরিশোধিত নিশ্চিত করুন
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


