'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  BarChart3, Users, Landmark, FileText, ShoppingCart, 
  TrendingUp, RefreshCcw, Calendar, Search, Edit2,
  Wallet, Truck, PieChart, Printer, FileSpreadsheet, Scale,
  Plus, Percent, ArrowRight, Lightbulb, Settings2,
  Download, ArrowLeft, Clock, Eye, CheckCircle2, ChevronRight,
  ShoppingBag, Layers, DollarSign, Calculator
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn, fixMiliName, toBnNum, formatBnCurrency, formatDualStock } from '@/lib/utils';
import { isToday, isSameMonth, isSameYear } from 'date-fns';

interface OrderItem {
  id?: string;
  name: string;
  code?: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  bundle?: number | string;
  category?: string;
}

interface Order {
  id: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items?: OrderItem[];
  createdAt: any;
}

interface PurchaseItem {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  category?: string;
}

interface Purchase {
  id: string;
  supplierName?: string;
  totalPrice?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  items?: PurchaseItem[];
  createdAt: any;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  createdAt: any;
}

interface Customer {
  id: string;
  name: string;
  totalDue?: number;
}

interface Supplier {
  id: string;
  name: string;
  totalDue?: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  sellPrice: number;
  unit: string;
}

interface Bank {
  id: string;
  name: string;
  accNo: string;
  balance: number;
}

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  vendor?: string;
  status: string;
  createdAt: any;
}

interface Commission {
  id: string;
  orderId?: string;
  customerName?: string;
  agentName?: string;
  productCategory?: string;
  salesVolume?: number;
  quantity?: number;
  rate?: number;
  ratePercent?: number;
  totalAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
  status: 'new' | 'partial' | 'overdue' | 'delayed' | 'journalized' | 'pending';
  daysAgo?: number;
  journalTransactionId?: string;
  note?: string;
  createdAt: any;
}

function MasterReportsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;
  
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const activeTab = selectedTab ?? (tabParam || 'hub');
  const setActiveTab = (tab: string) => setSelectedTab(tab);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  const [filterStartDate, setFilterStartDate] = useState<string>('01/05/2026');
  const [filterEndDate, setFilterEndDate] = useState<string>('28/05/2026');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tradeTab, setTradeTab] = useState<'rod_buy' | 'rod_sell' | 'cement_buy' | 'cement_sell'>('rod_buy');

  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [commAgentName, setCommAgentName] = useState('');
  const [commRate, setCommRate] = useState<number>(0);
  const [commTotal, setCommTotal] = useState<number>(0);
  const [commNote, setCommNote] = useState('');

  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalCommission, setJournalCommission] = useState<Commission | null>(null);
  const [journalAccountType, setJournalAccountType] = useState<'cash' | 'bank'>('cash');
  const [journalBankId, setJournalBankId] = useState<string>('');
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);

  useEffect(() => {
    async function loadReportsData() {
      try {
        const txList = await api.transactions.list();
        const safeTxList = Array.isArray(txList) ? txList : [];
        setTransactions(safeTxList.map(t => ({
          id: String(t.id || t.invoice_no),
          type: t.transaction_type,
          amount: t.total_amount,
          createdAt: t.created_at
        })));
        setOrders(safeTxList.filter(t => t.transaction_type === 'sale').map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || '',
          customerPhone: t.party_phone || '',
          totalAmount: t.total_amount,
          paidAmount: t.paid_amount,
          dueAmount: t.due_amount,
          items: (t.items || []).map(i => ({ name: i.product_name, price: i.price, quantity: i.quantity, unit: i.unit || 'পিস' })),
          createdAt: t.created_at
        })));
        setPurchases(safeTxList.filter(t => t.transaction_type === 'purchase').map(t => ({
          id: String(t.id || t.invoice_no),
          supplierName: t.party_name || '',
          totalPrice: t.total_amount,
          totalAmount: t.total_amount,
          paidAmount: t.paid_amount,
          dueAmount: t.due_amount,
          items: (t.items || []).map(i => ({ name: i.product_name, price: i.price, quantity: i.quantity, unit: i.unit || 'পিস' })),
          createdAt: t.created_at
        })));

        const partyList = await api.parties.list();
        const safePartyList = Array.isArray(partyList) ? partyList : [];
        setCustomers(safePartyList.filter(p => p.party_type === 'customer' || p.party_type === 'both').map(p => ({
          id: String(p.id),
          name: p.name,
          totalDue: Number(p.total_due || 0)
        })));
        setSuppliers(safePartyList.filter(p => p.party_type === 'supplier' || p.party_type === 'both').map(p => ({
          id: String(p.id),
          name: p.name,
          totalDue: Number(p.total_due || 0)
        })));

        const prodList = await api.inventory.list();
        const safeProdList = Array.isArray(prodList) ? prodList : [];
        setProducts(safeProdList.map(p => ({
          id: String(p.id),
          name: p.name,
          category: p.category_name || 'অন্যান্য',
          stock: Number(p.stock || 0),
          sellPrice: Number(p.sell_price || 0),
          unit: p.unit || 'পিস'
        })));

        const bankList = await api.banks.list();
        const safeBankList = Array.isArray(bankList) ? bankList : [];
        setBanks(safeBankList.map(b => ({
          id: String(b.id),
          name: b.name,
          accNo: b.account_number || '',
          balance: Number(b.balance || 0)
        })));

        const expList = await api.expenses.list();
        const safeExpList = Array.isArray(expList) ? expList : [];
        setExpenses(safeExpList.map(e => ({
          id: String(e.id),
          title: e.title,
          category: e.category_name || 'general',
          amount: Number(e.amount || 0),
          date: e.date || '',
          status: 'পরিশোধিত',
          createdAt: e.date
        })));
      } catch (err) {
        console.error('Error loading reports data:', err);
      }
    }
    loadReportsData();
  }, []);

  // Derived commissions list
  const activeCommissions = useMemo(() => {
    if (commissions.length > 0) return commissions;
    if (orders.length === 0) return [];
    const autoCommEntries: Commission[] = [];
    orders.forEach((o, index) => {
      let rodQty = 0;
      let cementQty = 0;
      (o.items || []).forEach(item => {
        const cat = item.category || (item.name.includes('রড') ? 'রড' : item.name.includes('সিমেন্ট') ? 'সিমেন্ট' : '');
        if (cat === 'রড' || item.unit === 'টন') rodQty += item.quantity || 1;
        else if (cat === 'সিমেন্ট' || item.unit === 'বস্তা') cementQty += item.quantity || 10;
      });

      if (rodQty > 0 || cementQty > 0 || index < 5) {
        const cat = rodQty > 0 ? 'রড' : cementQty > 0 ? 'সিমেন্ট' : 'সাধারণ পন্য';
        const qty = rodQty > 0 ? rodQty : cementQty > 0 ? cementQty : 5;
        const rate = cat === 'রড' ? 300 : cat === 'সিমেন্ট' ? 10 : 50;
        const vol = o.totalAmount || 1245800;
        const commAmt = qty * rate;
        autoCommEntries.push({
          id: `comm_${o.id}`,
          orderId: o.orderId || `INV-2026-${o.id.slice(-5)}`,
          customerName: o.customerName || 'সম্মানিত কাস্টমার',
          agentName: index % 2 === 0 ? 'রফিকুল ইসলাম' : 'শাহীন রহমান',
          productCategory: cat,
          salesVolume: vol,
          quantity: qty,
          rate: rate,
          ratePercent: 2.0,
          totalAmount: commAmt,
          paidAmount: index % 2 === 0 ? Math.round(commAmt * 0.6) : 0,
          pendingAmount: index % 2 === 0 ? Math.round(commAmt * 0.4) : commAmt,
          status: index % 3 === 0 ? 'journalized' : 'pending',
          note: `${cat} বিক্রয়ের উপর কমিশন`,
          createdAt: o.createdAt || new Date()
        });
      }
    });
    return autoCommEntries;
  }, [commissions, orders]);

  // Edit Commission
  const handleOpenEditCommission = (comm: Commission) => {
    setEditingCommission(comm);
    setCommAgentName(comm.agentName || '');
    setCommRate(comm.rate || 0);
    setCommTotal(comm.totalAmount || 0);
    setCommNote(comm.note || '');
    setCommissionModalOpen(true);
  };

  const handleSaveCommission = async () => {
    if (!editingCommission) return;
    try {
      const updatedData = {
        agentName: commAgentName,
        rate: Number(commRate),
        totalAmount: Number(commTotal),
        note: commNote
      };
      
      setCommissions(prev => prev.map(c => c.id === editingCommission.id ? { ...c, ...updatedData } : c));
      toast.success('কমিশনের তথ্য সফলভাবে আপডেট হয়েছে!');
      setCommissionModalOpen(false);
    } catch (err) {
      toast.error('কমিশন আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Auto-Journal Execution
  const handleOpenAutoJournal = (comm: Commission) => {
    setJournalCommission(comm);
    setJournalAccountType('cash');
    if (banks.length > 0) setJournalBankId(banks[0].id);
    setJournalModalOpen(true);
  };

  const handleExecuteAutoJournal = async () => {
    if (!journalCommission) return;
    setIsSubmittingJournal(true);
    try {
      await api.expenses.create({
        title: `কমিশন পরিশোধ: ${journalCommission.agentName} (মেমো: ${journalCommission.orderId || '—'})`,
        category_name: 'কমিশন খরচ',
        amount: journalCommission.totalAmount,
        date: new Date().toISOString().split('T')[0],
        payment_method: journalAccountType,
        notes: journalCommission.note || 'Auto Journalized Commission'
      });

      setCommissions(prev => prev.map(c => c.id === journalCommission.id ? { ...c, status: 'journalized' } : c));
      toast.success('অটো-জার্নাল এন্ট্রি সফলভাবে সম্পন্ন হয়েছে!');
      setJournalModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('অটো-জার্নাল সম্পন্ন করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmittingJournal(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bengali pb-12">
        
        {/* CONDITIONAL TOP HEADER & TOOLBAR: SHOW LANDING HEADER ONLY FOR HUB */}
        {activeTab === 'hub' ? (
          <>
            {/* TOP HEADER TITLE BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  রিপোর্ট সমূহ
                </h1>
                <p className="text-slate-500 font-semibold text-xs mt-1">
                  আপনার ব্যবসার সকল গুরুত্বপূর্ণ রিপোর্ট এখান থেকে দেখুন
                </p>
              </div>

              {/* TOP RIGHT ACTION BUTTONS */}
              <div className="flex items-center gap-2.5">
                <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-xs">
                  <Settings2 className="w-4 h-4 mr-1.5 text-slate-600" /> রিপোর্ট কাস্টমাইজ
                </Button>
                <Button onClick={() => window.print()} className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md">
                  <Download className="w-4 h-4 mr-1.5 text-amber-400" /> এক্সপোর্ট ∨
                </Button>
              </div>
            </div>

            {/* TOP FILTER TOOLBAR CARD */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-slate-500">তারিখ নির্বাচন করুন</Label>
                  <div className="relative mt-1">
                    <Input
                      type="text"
                      value={`${filterStartDate} - ${filterEndDate}`}
                      onChange={e => setFilterStartDate(e.target.value)}
                      className="h-10 text-xs font-bold rounded-xl pr-9 bg-slate-50/50 border-slate-200"
                    />
                    <Calendar className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-500">শাখা</Label>
                  <Select value={filterBranch} onValueChange={(val: any) => setFilterBranch(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="সব শাখা" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali">
                      <SelectItem value="all">সব শাখা</SelectItem>
                      <SelectItem value="main">প্রধান শাখা</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-500">পণ্য</Label>
                  <Select value={filterProduct} onValueChange={(val: any) => setFilterProduct(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="সব পণ্য" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali">
                      <SelectItem value="all">সব পণ্য</SelectItem>
                      <SelectItem value="rod">রড (Rod)</SelectItem>
                      <SelectItem value="cement">সিমেন্ট (Cement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-500">কাস্টমার</Label>
                  <Select value={filterCustomer} onValueChange={(val: any) => setFilterCustomer(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="সব কাস্টমার" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali">
                      <SelectItem value="all">সব কাস্টমার</SelectItem>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStartDate('01/05/2026');
                      setFilterEndDate('28/05/2026');
                      setFilterBranch('all');
                      setFilterProduct('all');
                      setFilterCustomer('all');
                    }}
                    className="h-10 flex-1 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 mr-1 text-slate-500" /> ফিল্টার রিসেট
                  </Button>

                  <Button
                    onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')}
                    className="h-10 flex-1 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
                  >
                    🎯 প্রয়োগ করুন
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* MAIN DISPLAY: HUB OR SPECIFIC SUB-REPORT VIEW */}
        {activeTab === 'hub' ? (
          <div className="space-y-8">
            
            {/* 8 REPORT CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* CARD 1: বাকি কাস্টমারের তালিকা */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ১. বাকি কাস্টমারের তালিকা
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      যে সকল কাস্টমারের পাওনা আছে তালিকা ও বিবরণ দেখুন
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('due_customers')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 2: ব্যাংক এর তালিকা */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ২. ব্যাংক এর তালিকা
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      সকল ব্যাংক একাউন্টের বিবরণ ও ব্যালেন্স দেখুন
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('bank_list')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 3: ডেইলী টপসিট */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৩. ডেইলী টপসিট
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      প্রতিটি একাউন্ট এর ব্যালেন্স সহ ডেইলী টপসিট দেখুন
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('daily_topsheet')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 4: ডেইলী সেলস স্টীট */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center font-bold">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৪. ডেইলী সেলস স্টীট
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      ডেইলী সেলস এর বিবরণ কাস্টমারের ব্যালেন্স সহ
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('daily_sales')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 5: প্রফিট এবং লস */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-700 flex items-center justify-center font-bold">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৫. প্রফিট এবং লস
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      সব / সিমেন্ট / রড অনুযায়ী প্রফিট এবং লস রিপোর্ট
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('profit_loss')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 6: ব্যালেন্স স্টীট */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center font-bold">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৬. ব্যালেন্স স্টীট
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      সম্পূর্ণ ব্যালেন্স স্টীট ( Assets, Liabilities & Equity )
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('balance_sheet')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 7: রড সিমেন্ট ক্রয় বিক্রয় স্টীট */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100/80 text-pink-700 flex items-center justify-center font-bold">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৭. রড সিমেন্ট ক্রয় বিক্রয় স্টীট
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      রড ও সিমেন্ট এর ক্রয় বিক্রয়ের বিস্তারিত রিপোর্ট
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('trade_register')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 8: পেন্ডিং কমিশন তালিকা */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৮. পেন্ডিং কমিশন তালিকা
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      অটো জেনারেট কমিশন তালিকা এডিট ও ম্যানেজ করুন
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('commissions')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

            </div>

          </div>
        ) : (

          /* DETAILED SUB-REPORT VIEW */
          <div className="space-y-6">

            {/* 1. বাকী কাস্টমারের তালিকা */}
            {activeTab === 'due_customers' && (() => {
              const dueCustomers = customers.filter(c => (c.totalDue || 0) > 0);
              const totalCustCount = customers.length;
              const totalCustDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">বাকী কাস্টমারের তালিকা</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">বাকী কাস্টমারের তালিকা</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট গ্রিডে ফিরে যান
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-amber-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-orange-600">মোট কাস্টমার</p><p className="text-2xl font-black text-slate-900">{toBnNum(totalCustCount)} জন</p><p className="text-[11px] font-semibold text-slate-500">সকল নিবন্ধিত কাস্টমার</p></div><div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold"><Users className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-red-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-rose-600">মোট বাকী টাকা</p><p className="text-2xl font-black text-rose-600">{formatBnCurrency(totalCustDue)}</p><p className="text-[11px] font-semibold text-slate-500">সকল কাস্টমারের মোট বাকী</p></div><div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold"><Wallet className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">বাকি থাকা কাস্টমার</p><p className="text-2xl font-black text-slate-900">{toBnNum(dueCustomers.length)} জন</p><p className="text-[11px] font-semibold text-emerald-600">বর্তমানে পাওনা বাকি</p></div><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold"><Clock className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-600">গড় কাস্টমার বাকী</p><p className="text-2xl font-black text-slate-900">{formatBnCurrency(dueCustomers.length ? Math.round(totalCustDue / dueCustomers.length) : 0)}</p><p className="text-[11px] font-semibold text-slate-500">প্রতি কাস্টমারে গড়</p></div><div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold"><TrendingUp className="w-5 h-5" /></div></div></Card>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div><Label className="text-[11px] font-bold text-slate-500">কাস্টমার নাম / মোবাইল</Label><Input placeholder="নাম / মোবাইল নম্বর" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                      <div className="flex items-end gap-2">
                        <Button variant="outline" onClick={() => setSearchQuery('')} className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                        <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Button variant="outline" onClick={() => window.print()} className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-slate-100"><Printer className="w-4 h-4 mr-1.5" /> প্রিন্ট</Button>
                      </div>
                    </div>
                  </div>

                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                          <TableHead className="font-black text-xs">কাস্টমার কোড</TableHead>
                          <TableHead className="font-black text-xs">কাস্টমার নাম</TableHead>
                          <TableHead className="font-black text-xs text-right">বাকী (৳)</TableHead>
                          <TableHead className="font-black text-xs text-center">স্ট্যাটাস</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dueCustomers.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 font-bengali">কোনো কাস্টমারের বাকী নেই</TableCell></TableRow>
                        ) : dueCustomers
                          .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((c, index) => (
                          <TableRow key={c.id} className="border-b border-slate-100">
                            <TableCell className="text-center font-bold text-xs">{toBnNum(index + 1)}</TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-600">CUS-{toBnNum(c.id.padStart(4, '0'))}</TableCell>
                            <TableCell className="font-black text-slate-900 text-sm">{c.name}</TableCell>
                            <TableCell className="text-right font-black text-rose-600 text-sm">{formatBnCurrency(c.totalDue || 0)}</TableCell>
                            <TableCell className="text-center"><span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200 inline-block">পাওনা বাকী</span></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              );
            })()}

            {/* 2. ব্যাংক এর তালিকা */}
            {activeTab === 'bank_list' && (() => {
              const totalBankCount = banks.length;
              const totalBankBal = banks.reduce((sum, b) => sum + (b.balance || 0), 0);

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">ব্যাংক এর তালিকা</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">ব্যাংক এর তালিকা</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট গ্রিড
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-600">মোট ব্যাংক অ্যাকাউন্ট</p><p className="text-2xl font-black text-slate-900">{toBnNum(totalBankCount)} টি</p><p className="text-[11px] font-semibold text-slate-500">সক্রিয় ব্যাংক একাউন্ট</p></div><div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold"><Landmark className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">মোট ব্যাংক ব্যালেন্স</p><p className="text-2xl font-black text-emerald-600">{formatBnCurrency(totalBankBal)}</p><p className="text-[11px] font-semibold text-slate-500">সকল ব্যাংকের মোট জমা</p></div><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold"><Wallet className="w-5 h-5" /></div></div></Card>
                  </div>

                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                          <TableHead className="font-black text-xs">ব্যাংকের নাম</TableHead>
                          <TableHead className="font-black text-xs">অ্যাকাউন্ট নং</TableHead>
                          <TableHead className="font-black text-xs text-right">বর্তমান ব্যালেন্স (৳)</TableHead>
                          <TableHead className="font-black text-xs text-center">স্ট্যাটাস</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banks.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 font-bengali">কোনো ব্যাংক একাউন্ট যুক্ত করা হয়নি</TableCell></TableRow>
                        ) : banks.map((b, idx) => (
                          <TableRow key={b.id} className="border-b border-slate-100 font-semibold text-xs">
                            <TableCell className="text-center font-bold text-slate-500">{toBnNum(idx + 1)}</TableCell>
                            <TableCell className="font-black text-slate-900 text-sm">{b.name}</TableCell>
                            <TableCell className="font-bold text-slate-600">{toBnNum(b.accNo)}</TableCell>
                            <TableCell className="text-right font-black text-slate-900 text-sm">{formatBnCurrency(b.balance || 0)}</TableCell>
                            <TableCell className="text-center"><span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 inline-block">সক্রিয়</span></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                      <span>মোট:</span>
                      <span className="text-emerald-600 text-sm">{formatBnCurrency(totalBankBal)}</span>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* 3. ডেইলী টপসিট */}
            {activeTab === 'daily_topsheet' && (() => {
              const totalBankBal = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
              const totalCustDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
              const totalSuppDue = suppliers.reduce((sum, s) => sum + (s.totalDue || 0), 0);
              const totalStockVal = products.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0);
              const totalAssets = totalBankBal + totalCustDue + totalStockVal;
              const netProfitLoss = orders.reduce((s, o) => s + o.totalAmount, 0) - purchases.reduce((s, p) => s + (p.totalAmount || 0), 0) - expenses.reduce((s, e) => s + e.amount, 0);

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">ডেইলী টপসিট</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">ডেইলী টপসিট</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => window.print()} className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200"><Printer className="w-4 h-4 mr-1" /> প্রিন্ট</Button>
                      <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট সম্পদ</p><p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(totalAssets)}</p></Card>
                    <Card className="p-5 border-rose-200 bg-rose-50/40 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট দায় (সাপ্লায়ার)</p><p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalSuppDue)}</p></Card>
                    <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl"><p className="text-xs font-bold text-blue-800">মোট কাস্টমার পাওনা</p><p className="text-2xl font-black text-blue-600 mt-1">{formatBnCurrency(totalCustDue)}</p></Card>
                    <Card className="p-5 border-teal-200 bg-teal-50/40 rounded-2xl"><p className="text-xs font-bold text-teal-800">নিট লাভ/ক্ষতি</p><p className="text-2xl font-black text-teal-600 mt-1">{formatBnCurrency(netProfitLoss)}</p></Card>
                  </div>

                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs">অ্যাকাউন্ট কোড</TableHead>
                          <TableHead className="font-black text-xs">অ্যাকাউন্ট নাম</TableHead>
                          <TableHead className="font-black text-xs text-right px-6">শেষ ব্যালেন্স (৳)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="bg-slate-100/80 font-black text-xs text-slate-900"><TableCell colSpan={3} className="py-2.5 px-4">সম্পদ (Assets)</TableCell></TableRow>
                        <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1020</TableCell><TableCell className="font-bold text-slate-900">ব্যাংক ব্যালেন্স</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">{formatBnCurrency(totalBankBal)}</TableCell></TableRow>
                        <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1030</TableCell><TableCell className="font-bold text-slate-900">কাস্টমারের পাওনা</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">{formatBnCurrency(totalCustDue)}</TableCell></TableRow>
                        <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1040</TableCell><TableCell className="font-bold text-slate-900">স্টক (পণ্য)</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">{formatBnCurrency(totalStockVal)}</TableCell></TableRow>

                        <TableRow className="bg-slate-100/80 font-black text-xs text-slate-900"><TableCell colSpan={3} className="py-2.5 px-4">দায় (Liabilities)</TableCell></TableRow>
                        <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">2010</TableCell><TableCell className="font-bold text-slate-900">সাপ্লায়ারের পাওনা</TableCell><TableCell className="text-right font-bold text-rose-600 px-6">{formatBnCurrency(totalSuppDue)}</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              );
            })()}

            {/* 4. ডেইলী সেলস স্টেটমেন্ট */}
            {activeTab === 'daily_sales' && (() => {
              const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
              const totalDue = orders.reduce((sum, o) => sum + (o.dueAmount || 0), 0);
              const invoiceCount = orders.length;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">ডেইলী সেলস স্টেটমেন্ট</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">ডেইলী সেলস স্টেটমেন্ট</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => window.print()} className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200"><Printer className="w-4 h-4 mr-1" /> প্রিন্ট</Button>
                      <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট বিক্রয়</p><p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(totalSales)}</p></Card>
                    <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl"><p className="text-xs font-bold text-blue-800">মোট আদায়</p><p className="text-2xl font-black text-blue-600 mt-1">{formatBnCurrency(totalPaid)}</p></Card>
                    <Card className="p-5 border-rose-200 bg-rose-50/40 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট বাকী</p><p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalDue)}</p></Card>
                    <Card className="p-5 border-purple-200 bg-purple-50/40 rounded-2xl"><p className="text-xs font-bold text-purple-800">মোট ইনভয়েস সংখ্যা</p><p className="text-2xl font-black text-purple-600 mt-1">{toBnNum(invoiceCount)} টি</p></Card>
                  </div>

                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                          <TableHead className="font-black text-xs">ইনভয়েস নং</TableHead>
                          <TableHead className="font-black text-xs">কাস্টমারের নাম</TableHead>
                          <TableHead className="font-black text-xs text-right">বিক্রয় পরিমাণ (৳)</TableHead>
                          <TableHead className="font-black text-xs text-right">আদায় (৳)</TableHead>
                          <TableHead className="font-black text-xs text-right px-6">বাকী (৳)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 font-bengali">কোনো বিক্রয় ভাউচার নেই</TableCell></TableRow>
                        ) : orders.map((s, idx) => (
                          <TableRow key={s.id} className="border-b border-slate-100 text-xs">
                            <TableCell className="text-center font-bold text-slate-500">{toBnNum(idx + 1)}</TableCell>
                            <TableCell className="font-bold text-slate-800">INV-{toBnNum(s.id)}</TableCell>
                            <TableCell className="font-black text-slate-900">{s.customerName || 'সাধারণ কাস্টমার'}</TableCell>
                            <TableCell className="text-right font-bold">{formatBnCurrency(s.totalAmount)}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatBnCurrency(s.paidAmount)}</TableCell>
                            <TableCell className="text-right font-black text-rose-600 px-6">{formatBnCurrency(s.dueAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                      <span>মোট:</span>
                      <div className="flex gap-6">
                        <span className="text-emerald-600">{formatBnCurrency(totalSales)}</span>
                        <span className="text-blue-600">{formatBnCurrency(totalPaid)}</span>
                        <span className="text-rose-600">{formatBnCurrency(totalDue)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* 5. প্রফিট এবং লস স্টেটমেন্ট */}
            {activeTab === 'profit_loss' && (() => {
              const salesIncome = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const purchasesExp = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
              const operatingExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              const totalExpense = purchasesExp + operatingExp;
              const netProfit = salesIncome - totalExpense;
              const profitPercent = salesIncome > 0 ? ((netProfit / salesIncome) * 100).toFixed(1) : '0';

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">প্রফিট এবং লস স্টেটমেন্ট</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">প্রফিট এবং লস স্টেটমেন্ট</span>
                      </div>
                    </div>

                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1">
                      <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট আয়</p><p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(salesIncome)}</p></Card>
                    <Card className="p-4 border-rose-200 bg-rose-50/30 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট ব্যয়</p><p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalExpense)}</p></Card>
                    <Card className="p-4 border-blue-200 bg-blue-50/30 rounded-2xl"><p className="text-xs font-bold text-blue-800">নিট লাভ</p><p className="text-2xl font-black text-blue-600 mt-1">{formatBnCurrency(netProfit)}</p></Card>
                    <Card className="p-4 border-amber-200 bg-amber-50/30 rounded-2xl"><p className="text-xs font-bold text-amber-800">লাভের হার</p><p className="text-2xl font-black text-amber-600 mt-1">{toBnNum(profitPercent)}%</p></Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-emerald-700 text-base">আয় (Income)</h3></div>
                      <Table>
                        <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">খাতের নাম</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">মোট পন্য বিক্রয়</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(salesIncome)}</TableCell></TableRow>
                          <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell className="py-3 px-4 font-black">মোট আয়</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6 font-black">{formatBnCurrency(salesIncome)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </Card>

                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-rose-700 text-base">ব্যয় (Expense)</h3></div>
                      <Table>
                        <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">খাতের নাম</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">পণ্য ক্রয় ব্যয়</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(purchasesExp)}</TableCell></TableRow>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">অন্যান্য পরিচালনা খরচ</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(operatingExp)}</TableCell></TableRow>
                          <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell className="py-3 px-4 font-black">মোট ব্যয়</TableCell><TableCell className="text-right text-rose-700 text-sm px-6 font-black">{formatBnCurrency(totalExpense)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                </div>
              );
            })()}

            {/* 6. ব্যালেন্স শীট */}
            {activeTab === 'balance_sheet' && (() => {
              const totalBankBal = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
              const totalCustDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
              const totalStockVal = products.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0);
              const totalAssets = totalBankBal + totalCustDue + totalStockVal;
              const totalSuppDue = suppliers.reduce((sum, s) => sum + (s.totalDue || 0), 0);
              const totalEquity = totalAssets - totalSuppDue;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">ব্যালেন্স শীট</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">ব্যালেন্স শীট</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => window.print()} className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white"><Printer className="w-4 h-4 mr-1.5 text-emerald-600" /> প্রিন্ট</Button>
                      <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট সম্পদ (Assets)</p><p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(totalAssets)}</p></Card>
                    <Card className="p-4 border-rose-200 bg-rose-50/30 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট দায় (Liabilities)</p><p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalSuppDue)}</p></Card>
                    <Card className="p-4 border-purple-200 bg-purple-50/30 rounded-2xl"><p className="text-xs font-bold text-purple-800">নিট সম্পত্তি (Equity)</p><p className="text-2xl font-black text-purple-600 mt-1">{formatBnCurrency(totalEquity)}</p></Card>
                    <Card className="p-4 border-slate-200 bg-slate-50/50 rounded-2xl"><p className="text-xs font-bold text-slate-600">মোট সম্পদ সমতুল্য</p><p className="text-2xl font-black text-slate-900 mt-1">{formatBnCurrency(totalAssets)}</p></Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-emerald-700 text-base">সম্পদ (Assets)</h3></div>
                      <Table>
                        <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">হিসাবের নাম</TableHead><TableHead className="font-black text-xs text-center">হিসাব কোড</TableHead><TableHead className="font-black text-xs text-right px-6">ব্যালেন্স (৳)</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">ব্যাংক একাউন্ট ব্যালেন্স</TableCell><TableCell className="text-center font-bold text-slate-500">1020</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(totalBankBal)}</TableCell></TableRow>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">গ্রাহকের পাওনা (কাস্টমার বাকি)</TableCell><TableCell className="text-center font-bold text-slate-500">1030</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(totalCustDue)}</TableCell></TableRow>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">স্টক পণ্যের মূল্যায়ন</TableCell><TableCell className="text-center font-bold text-slate-500">1050</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(totalStockVal)}</TableCell></TableRow>
                          <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell colSpan={2} className="py-3 px-4 font-black">মোট সম্পদ</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6 font-black">{formatBnCurrency(totalAssets)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </Card>

                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-rose-700 text-base">দায় (Liabilities)</h3></div>
                      <Table>
                        <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">হিসাবের নাম</TableHead><TableHead className="font-black text-xs text-center">হিসাব কোড</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">সাপ্লায়ারের পাওনা (দেনাদার)</TableCell><TableCell className="text-center font-bold text-slate-500">2010</TableCell><TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(totalSuppDue)}</TableCell></TableRow>
                          <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell colSpan={2} className="py-3 px-4 font-black">মোট দায়</TableCell><TableCell className="text-right text-rose-700 text-sm px-6 font-black">{formatBnCurrency(totalSuppDue)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                </div>
              );
            })()}

            {/* 7. রড সিমেন্ট ক্রয় বিক্রয় স্টীট */}
            {activeTab === 'trade_register' && (() => {
              const totalPurchasesAmt = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
              const totalSalesAmt = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const totalProfitAmt = totalSalesAmt - totalPurchasesAmt;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">রড সিমেন্ট ক্রয় বিক্রয় স্টীট</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">রড সিমেন্ট ক্রয় বিক্রয় স্টেটমেন্ট</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-800">মোট ক্রয়</p><p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(totalPurchasesAmt)}</p></div><div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold"><ShoppingCart className="w-6 h-6" /></div></Card>
                    <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-blue-800">মোট বিক্রয়</p><p className="text-2xl font-black text-blue-600 mt-1">{formatBnCurrency(totalSalesAmt)}</p></div><div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold"><ShoppingBag className="w-6 h-6" /></div></Card>
                    <Card className="p-5 border-amber-200 bg-amber-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-amber-800">মোট আনুমানিক লাভ</p><p className="text-2xl font-black text-amber-600 mt-1">{formatBnCurrency(totalProfitAmt)}</p></div><div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold"><BarChart3 className="w-6 h-6" /></div></Card>
                  </div>

                  <div className="flex border-b border-slate-200 gap-4 text-xs font-black">
                    <button onClick={() => setTradeTab('rod_buy')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'rod_buy' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>ক্রয় রিপোর্ট</button>
                    <button onClick={() => setTradeTab('rod_sell')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'rod_sell' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>বিক্রয় রিপোর্ট</button>
                  </div>

                  <div className="space-y-4">
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                          <TableRow>
                            <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                            <TableHead className="font-black text-xs">ভাউচার নং</TableHead>
                            <TableHead className="font-black text-xs">নাম</TableHead>
                            <TableHead className="font-black text-xs text-right px-6">মোট (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(tradeTab === 'rod_buy' ? purchases : orders).length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-bengali">কোনো রেকর্ড পাওয়া যায়নি</TableCell></TableRow>
                          ) : (tradeTab === 'rod_buy' ? purchases : orders).map((r: any, i) => (
                            <TableRow key={r.id} className="border-b border-slate-100 text-xs font-semibold">
                              <TableCell className="text-center font-bold text-slate-500">{toBnNum(i + 1)}</TableCell>
                              <TableCell className="font-bold text-slate-800">MEMO-{toBnNum(r.id)}</TableCell>
                              <TableCell className="font-black text-slate-900">{r.supplierName || r.customerName || 'সাধারণ কাস্টমার/সাপ্লায়ার'}</TableCell>
                              <TableCell className="text-right font-black text-slate-900 px-6">{formatBnCurrency(r.totalAmount || r.totalPrice || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                </div>
              );
            })()}

            {/* 8. পেন্ডিং কমিশন তালিকা */}
            {activeTab === 'commissions' && (() => {
              const totalPendingComm = activeCommissions.reduce((sum, c) => sum + (c.pendingAmount || 0), 0);

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">পেন্ডিং কমিশন তালিকা</h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">পেন্ডিং কমিশন তালিকা</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => setActiveTab('hub')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">মোট পেন্ডিং কমিশন</p><p className="text-2xl font-black text-slate-900">{formatBnCurrency(totalPendingComm)}</p><p className="text-[10px] font-semibold text-slate-500">সকল পেন্ডিং কমিশনের মোট পরিমাণ</p></div><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0"><Wallet className="w-5 h-5" /></div></div></Card>
                    <Card className="p-4 border-amber-200 bg-amber-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-amber-700">মোট ভাউচার কমিশন সংখ্যা</p><p className="text-2xl font-black text-slate-900">{toBnNum(activeCommissions.length)} টি</p><p className="text-[10px] font-semibold text-slate-500">অটো জেনারেট সংখ্যা</p></div><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0"><Calendar className="w-5 h-5" /></div></div></Card>
                  </div>

                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs text-center w-14">ক্রমিক</TableHead>
                          <TableHead className="font-black text-xs">ইনভয়েস নং</TableHead>
                          <TableHead className="font-black text-xs">কাস্টমার / প্রতিনিধি</TableHead>
                          <TableHead className="font-black text-xs">পণ্য</TableHead>
                          <TableHead className="font-black text-xs text-right">কমিশন পরিমাণ (৳)</TableHead>
                          <TableHead className="font-black text-xs text-right">পেন্ডিং (৳)</TableHead>
                          <TableHead className="font-black text-xs text-center">স্ট্যাটাস</TableHead>
                          <TableHead className="font-black text-xs text-center">অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeCommissions.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400 font-bengali">কোনো কমিশন ডাটা পাওয়া যায়নি</TableCell></TableRow>
                        ) : activeCommissions.map((r, i) => (
                          <TableRow key={r.id} className="border-b border-slate-100 text-xs font-semibold">
                            <TableCell className="text-center font-bold text-slate-500">{toBnNum(i + 1)}</TableCell>
                            <TableCell className="font-bold text-slate-800">{r.orderId}</TableCell>
                            <TableCell className="font-black text-slate-900">{r.agentName || r.customerName}</TableCell>
                            <TableCell className="text-slate-700">{r.productCategory}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">{formatBnCurrency(r.totalAmount)}</TableCell>
                            <TableCell className="text-right font-black text-rose-600">{formatBnCurrency(r.pendingAmount || 0)}</TableCell>
                            <TableCell className="text-center"><span className={cn("px-2.5 py-0.5 rounded-lg text-[10px] font-black border inline-block", r.status === 'journalized' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>{r.status === 'journalized' ? 'পরিশোধিত' : 'পেন্ডিং'}</span></TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleOpenEditCommission(r)} className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="এডিট"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleOpenAutoJournal(r)} className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="অটো জার্নাল"><DollarSign className="w-3.5 h-3.5" /></button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              );
            })()}

          </div>
        )}

        {/* EDIT COMMISSION MODAL */}
        <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
          <DialogContent className="max-w-md font-bengali rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" /> কমিশনের তথ্য এডিট করুন
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">এজেন্টের নাম</Label>
                <Input value={commAgentName} onChange={e => setCommAgentName(e.target.value)} className="mt-1 font-bold text-xs rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700">রেট (৳)</Label>
                  <Input type="number" value={commRate} onChange={e => setCommRate(Number(e.target.value))} className="mt-1 font-bold text-xs rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">মোট কমিশন (৳)</Label>
                  <Input type="number" value={commTotal} onChange={e => setCommTotal(Number(e.target.value))} className="mt-1 font-black text-xs rounded-xl text-emerald-600" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommissionModalOpen(false)} className="rounded-xl text-xs font-bold">বাতিল</Button>
              <Button onClick={handleSaveCommission} className="rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">সেভ করুন</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AUTO-JOURNAL MODAL */}
        <Dialog open={journalModalOpen} onOpenChange={setJournalModalOpen}>
          <DialogContent className="max-w-md font-bengali rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-black text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" /> অটো জার্নাল নিশ্চিতকরণ
              </DialogTitle>
            </DialogHeader>
            {journalCommission && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">প্রতিনিধি:</span><span className="font-bold text-slate-900">{journalCommission.agentName}</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t"><span className="font-bold">কমিশন:</span><span className="font-black text-emerald-600">৳ {journalCommission.totalAmount.toLocaleString()}</span></div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">টাকা কাটার মাধ্যম:</Label>
                  <Select value={journalAccountType} onValueChange={(v: any) => setJournalAccountType(v)}>
                    <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue placeholder="একাউন্ট টাইপ" /></SelectTrigger>
                    <SelectContent className="font-bengali">
                      <SelectItem value="cash">💵 ক্যাশ ড্রয়ার</SelectItem>
                      <SelectItem value="bank">🏦 ব্যাংক একাউন্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {journalAccountType === 'bank' && (
                  <div className="space-y-2">
                    <Label className="font-bold">ব্যাংক নির্বাচন করুন:</Label>
                    <Select value={journalBankId} onValueChange={(val: any) => setJournalBankId(val || '')}>
                      <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue placeholder="ব্যাংক বেছে নিন" /></SelectTrigger>
                      <SelectContent className="font-bengali">
                        {banks.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name} ({b.accNo}) - ৳ {b.balance.toLocaleString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setJournalModalOpen(false)} className="rounded-xl text-xs font-bold">বাতিল</Button>
              <Button onClick={handleExecuteAutoJournal} disabled={isSubmittingJournal} className="rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmittingJournal ? 'জার্নাল হচ্ছে...' : 'অটো জার্নাল সম্পন্ন করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Shell>
  );
}

export default function MasterReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bengali font-bold text-slate-500">লোড হচ্ছে...</div>}>
      <MasterReportsContent />
    </Suspense>
  );
}
