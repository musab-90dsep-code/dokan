'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { api, TransactionData } from '@/lib/api';
import { Button } from './ui/button';
import { HardHat, Search, Bell, Landmark, CheckCircle2, Calendar, FileText, ShoppingCart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

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

export function Shell({ children }: { children: ReactNode }) {
  // Admin user context
  const [user, setUser] = useState<{ displayName: string; email: string; photoURL?: string } | null>({
    displayName: 'এডমিন ইউজার',
    email: 'admin@dokan.com'
  });
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChequeDrawer, setShowChequeDrawer] = useState(false);
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);
  const [cheques, setCheques] = useState<ChequeItem[]>([]);
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadChequesAndOrders = async () => {
    try {
      const txs = await api.transactions.list();
      const safeTxs = Array.isArray(txs) ? txs : [];
      const chequeItems: ChequeItem[] = safeTxs
        .filter(t => t.payment_method === 'cheque' || t.cheque_number)
        .map(t => ({
          id: String(t.id || t.invoice_no),
          invoiceId: t.invoice_no,
          customerName: t.party_name || 'অজ্ঞাত গ্রাহক',
          customerPhone: t.party_phone || '',
          bankName: t.cheque_bank || 'ব্যাংক',
          chequeNo: t.cheque_number || '-',
          chequeDate: t.cheque_due_date || '',
          amount: t.total_amount || 0,
          status: t.cheque_status || 'pending',
          createdAt: t.created_at
        }));
      setCheques(chequeItems);

      const orderItems: PendingOrderItem[] = safeTxs
        .filter(t => t.transaction_type === 'sale')
        .slice(0, 10)
        .map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || 'গ্রাহক',
          customerPhone: t.party_phone || '',
          totalAmount: t.total_amount,
          items: t.items || [],
          createdAt: t.created_at,
          invoiced: t.status === 'completed',
          stage: t.status
        }));
      setOrders(orderItems);
    } catch (e) {
      console.error('Error loading Shell data:', e);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const txs = await api.transactions.list();
        if (ignore) return;
        const safeTxs = Array.isArray(txs) ? txs : [];
        const chequeItems: ChequeItem[] = safeTxs
          .filter(t => t.payment_method === 'cheque' || t.cheque_number)
          .map(t => ({
            id: String(t.id || t.invoice_no),
            invoiceId: t.invoice_no,
            customerName: t.party_name || 'অজ্ঞাত গ্রাহক',
            customerPhone: t.party_phone || '',
            bankName: t.cheque_bank || 'ব্যাংক',
            chequeNo: t.cheque_number || '-',
            chequeDate: t.cheque_due_date || '',
            amount: t.total_amount || 0,
            status: t.cheque_status || 'pending',
            createdAt: t.created_at
          }));
        setCheques(chequeItems);

        const orderItems: PendingOrderItem[] = safeTxs
          .filter(t => t.transaction_type === 'sale')
          .slice(0, 10)
          .map(t => ({
            id: String(t.id || t.invoice_no),
            customerName: t.party_name || 'গ্রাহক',
            customerPhone: t.party_phone || '',
            totalAmount: t.total_amount,
            items: t.items || [],
            createdAt: t.created_at,
            invoiced: t.status === 'completed',
            stage: t.status
          }));
        setOrders(orderItems);
      } catch (e) {
        console.error('Error loading Shell data:', e);
      }
    }
    init();
    return () => { ignore = true; };
  }, []);

  const pendingCheques = cheques.filter(c => c.status === 'pending');
  const pendingTotalAmount = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

  const pendingOrders = orders.filter(o => !o.invoiced && o.stage !== 'approved');
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
            {/* Cheque Drawer Trigger */}
            <button
              onClick={() => setShowChequeDrawer(!showChequeDrawer)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
              title="চেক ব্যবস্থাপনা"
            >
              <Landmark className="h-5 w-5 text-indigo-600" />
              {pendingCheques.length > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-[18px]">
                  {pendingCheques.length}
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
    </div>
  );
}
