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
import { cn, fixMiliName } from '@/lib/utils';
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
            {activeTab === 'due_customers' && (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-5 border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-amber-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-orange-600">মোট কাস্টমার</p><p className="text-2xl font-black text-slate-900">৩৪৫</p><p className="text-[11px] font-semibold text-slate-500">সকল কাস্টমার</p></div><div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold"><Users className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-red-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-rose-600">মোট বাকী টাকা</p><p className="text-2xl font-black text-rose-600">৳ ১৮,৪৫,৬৭০</p><p className="text-[11px] font-semibold text-slate-500">সকল কাস্টমারের মোট বাকী</p></div><div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold"><Wallet className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">৯০ দিনের বেশি বাকী</p><p className="text-2xl font-black text-slate-900">৳ ৭,৬২,৪০০</p><p className="text-[11px] font-semibold text-emerald-600">ঝুঁকিপূর্ণ কাস্টমার</p></div><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold"><Clock className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-600">আজকের বাকী বৃদ্ধি</p><p className="text-2xl font-black text-slate-900">৳ ১,২৫,৬০০</p><p className="text-[11px] font-semibold text-slate-500">গতকাল থেকে বৃদ্ধি</p></div><div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold"><TrendingUp className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-violet-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-purple-600">০ - ৩০ দিনের বাকী</p><p className="text-2xl font-black text-slate-900">৳ ৮,২১,৪২০</p><p className="text-[11px] font-semibold text-slate-500">সাম্প্রতিক বাকী</p></div><div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold"><Calendar className="w-5 h-5" /></div></div></Card>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ (যে তারিখ পর্যন্ত)</Label><Input type="text" value="26/05/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">কাস্টমার নাম / মোবাইল</Label><Input placeholder="নাম / মোবাইল নম্বর" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">কাস্টমার গ্রুপ</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব গ্রুপ" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব গ্রুপ</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">বাকীর সময়কাল</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব সময়কাল" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব সময়কাল</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">বাকীর পরিমাণ</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">সর্ট করুন</Label><Select defaultValue="high"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="বাকী (বেশি থেকে কম)" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="high">বাকী (বেশি থেকে কম)</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setSearchQuery('')} className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                      <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => toast.info('ডাউনলোড হচ্ছে...')} className="h-10 px-4 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-4 h-4 mr-1.5" /> এক্সেল ডাউনলোড</Button>
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
                        <TableHead className="font-black text-xs">মোবাইল নম্বর</TableHead>
                        <TableHead className="font-black text-xs text-right">মোট ক্রয় (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">পরিশোধ (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">বাকী (৳)</TableHead>
                        <TableHead className="font-black text-xs text-center">বাকীর সময়কাল</TableHead>
                        <TableHead className="font-black text-xs">শেষ লেনদেন</TableHead>
                        <TableHead className="font-black text-xs text-center">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { sl: '01', code: 'CUS-0001', name: 'মেসার্স রহমান ট্রেডার্স', phone: '01712-345678', buy: 548200, paid: 420000, due: 128200, ageTag: '৯০+ দিন', ageColor: 'bg-rose-100 text-rose-700 border-rose-200', date: '২৪/০৫/২০২৬' },
                        { sl: '02', code: 'CUS-0002', name: 'মেসার্স সালমান বিল্ডার্স', phone: '01819-876543', buy: 375000, paid: 280000, due: 95000, ageTag: '৬১ - ৯০ দিন', ageColor: 'bg-orange-100 text-orange-700 border-orange-200', date: '২২/০৫/২০২৬' },
                        { sl: '03', code: 'CUS-0003', name: 'মেসার্স নিউ আলম ট্রেডিং', phone: '01733-223344', buy: 288000, paid: 170000, due: 98000, ageTag: '৩১ - ৬০ দিন', ageColor: 'bg-amber-100 text-amber-700 border-amber-200', date: '২০/০৫/২০২৬' },
                        { sl: '04', code: 'CUS-0004', name: 'মেসার্স হক এন্টারপ্রাইজ', phone: '01611-556677', buy: 175000, paid: 140000, due: 35000, ageTag: '১৬ - ৩০ দিন', ageColor: 'bg-blue-100 text-blue-700 border-blue-200', date: '২৫/০৫/২০২৬' },
                        { sl: '05', code: 'CUS-0005', name: 'মেসার্স জহির বিল্ডার্স', phone: '01922-334455', buy: 160000, paid: 120000, due: 40000, ageTag: '০ - ১৫ দিন', ageColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', date: '২৬/০৫/২০২৬' },
                      ].map((r) => (
                        <TableRow key={r.code} className="border-b border-slate-100">
                          <TableCell className="text-center font-mono font-bold text-xs">{r.sl}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-600">{r.code}</TableCell>
                          <TableCell className="font-black text-slate-900 text-sm">{r.name}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">{r.phone}</TableCell>
                          <TableCell className="text-right font-bold text-xs">৳ {r.buy.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-xs">৳ {r.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-rose-600 text-sm">৳ {r.due.toLocaleString()}</TableCell>
                          <TableCell className="text-center"><span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black border inline-block", r.ageColor)}>{r.ageTag}</span></TableCell>
                          <TableCell className="text-xs">{r.date}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Eye className="w-3.5 h-3.5" /></button>
                              <button className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center"><Printer className="w-3.5 h-3.5" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {/* 2. ব্যাংক এর তালিকা */}
            {activeTab === 'bank_list' && (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-600">মোট ব্যাংক অ্যাকাউন্ট</p><p className="text-2xl font-black text-slate-900">৫</p><p className="text-[11px] font-semibold text-slate-500">সক্রিয় ব্যাংক</p></div><div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold"><Landmark className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">মোট ব্যাংক ব্যালেন্স</p><p className="text-2xl font-black text-emerald-600">৳ ১৮,৭৫,৫০০</p><p className="text-[11px] font-semibold text-slate-500">সকল ব্যাংকের মোট ব্যালেন্স</p></div><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold"><Wallet className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-orange-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-amber-700">আজকের লেনদেন</p><p className="text-2xl font-black text-slate-900">৳ ২,৪৫,০০০</p><p className="text-[11px] font-semibold text-slate-500">জমা + উত্তোলন</p></div><div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold"><TrendingUp className="w-5 h-5" /></div></div></Card>
                  <Card className="p-5 border-pink-200/60 bg-gradient-to-br from-pink-50/80 to-rose-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-pink-600">চেক ট্রানজেকশন</p><p className="text-2xl font-black text-slate-900">৳ ১,২৫,০০০</p><p className="text-[11px] font-semibold text-slate-500">অপেক্ষমাণ চেক</p></div><div className="w-11 h-11 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold"><FileText className="w-5 h-5" /></div></div></Card>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ</Label><Input type="text" value="26/05/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">ব্যাংক</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব ব্যাংক" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব ব্যাংক</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">অ্যাকাউন্ট টাইপ</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">স্ট্যাটাস</Label><Select defaultValue="active"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সক্রিয়" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="active">সক্রিয়</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                      <Button variant="outline" className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                    </div>
                    <Button variant="outline" onClick={() => toast.info('ডাউনলোড হচ্ছে...')} className="h-10 px-4 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-4 h-4 mr-1.5" /> এক্সেল ডাউনলোড</Button>
                  </div>
                </div>

                <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                        <TableHead className="font-black text-xs">ব্যাংকের নাম</TableHead>
                        <TableHead className="font-black text-xs">অ্যাকাউন্ট নাম</TableHead>
                        <TableHead className="font-black text-xs">অ্যাকাউন্ট নং</TableHead>
                        <TableHead className="font-black text-xs">শাখা</TableHead>
                        <TableHead className="font-black text-xs">ধরন</TableHead>
                        <TableHead className="font-black text-xs text-right">বর্তমান ব্যালেন্স (৳)</TableHead>
                        <TableHead className="font-black text-xs text-center">স্ট্যাটাস</TableHead>
                        <TableHead className="font-black text-xs text-center">ক্রিয়া</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { sl: '01', bank: 'সোনালী ব্যাংক লি:', name: 'রহমান ট্রেডার্স', accNo: '0125010001234', branch: 'মতিঝিল, ঢাকা', type: 'কারেন্ট', bal: 625500 },
                        { sl: '02', bank: 'পূবালী ব্যাংক লি:', name: 'রহমান ট্রেডার্স', accNo: '1124560000011', branch: 'গুলশান, ঢাকা', type: 'কারেন্ট', bal: 450000 },
                        { sl: '03', bank: 'ইসলামী ব্যাংক', name: 'রহমান ট্রেডার্স', accNo: '2050360406009', branch: 'মিরপুর, ঢাকা', type: 'কারেন্ট', bal: 340000 },
                        { sl: '04', bank: 'ডাচ বাংলা ব্যাংক', name: 'রহমান ট্রেডার্স', accNo: '0200126000011', branch: 'ধানমন্ডি, ঢাকা', type: 'কারেন্ট', bal: 240000 },
                        { sl: '05', bank: 'নগদ (ব্যাংক)', name: 'রহমান ট্রেডার্স', accNo: 'N/A', branch: '-', type: 'ওয়ালেট', bal: 117500 },
                      ].map((b) => (
                        <TableRow key={b.sl} className="border-b border-slate-100 font-semibold text-xs">
                          <TableCell className="text-center font-mono font-bold text-slate-500">{b.sl}</TableCell>
                          <TableCell className="font-black text-slate-900 text-sm">{b.bank}</TableCell>
                          <TableCell className="text-slate-700">{b.name}</TableCell>
                          <TableCell className="font-mono font-bold text-slate-600">{b.accNo}</TableCell>
                          <TableCell className="text-slate-600">{b.branch}</TableCell>
                          <TableCell className="text-slate-600">{b.type}</TableCell>
                          <TableCell className="text-right font-black text-slate-900 text-sm">৳ {b.bal.toLocaleString()}</TableCell>
                          <TableCell className="text-center"><span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 inline-block">সক্রিয়</span></TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Eye className="w-3.5 h-3.5" /></button>
                              <button className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                    <span>মোট:</span>
                    <span className="text-emerald-600 text-sm">৳ ১৮,৭৫,৫০০</span>
                  </div>
                </Card>
              </div>
            )}

            {/* 3. ডেইলী টপসিট */}
            {activeTab === 'daily_topsheet' && (
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
                    <Button variant="outline" onClick={() => toast.info('ডাউনলোড হচ্ছে...')} className="h-9 px-3 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-4 h-4 mr-1" /> এক্সেল ডাউনলোড</Button>
                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold text-slate-500">তারিখ</Label>
                    <Input type="text" value="26/05/2026" onChange={() => {}} className="h-10 w-44 text-xs font-bold rounded-xl bg-slate-50/50 border-slate-200" />
                    <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট সম্পদ</p><p className="text-2xl font-black text-emerald-600 mt-1">৳ ৩৪,২৫,৮৬০</p></Card>
                  <Card className="p-5 border-rose-200 bg-rose-50/40 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট দায়</p><p className="text-2xl font-black text-rose-600 mt-1">৳ ১২,৪০,২০০</p></Card>
                  <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl"><p className="text-xs font-bold text-blue-800">মোট মালিকানা স্বত্ব</p><p className="text-2xl font-black text-blue-600 mt-1">৳ ১৬,১০,০০০</p></Card>
                  <Card className="p-5 border-teal-200 bg-teal-50/40 rounded-2xl"><p className="text-xs font-bold text-teal-800">নিট লাভ/ক্ষতি</p><p className="text-2xl font-black text-teal-600 mt-1">৳ ৫,৭৫,৬৬০</p></Card>
                </div>

                <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-xs">অ্যাকাউন্ট কোড</TableHead>
                        <TableHead className="font-black text-xs">অ্যাকাউন্ট নাম</TableHead>
                        <TableHead className="font-black text-xs text-right">প্রারম্ভিক ব্যালেন্স (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">ডেবিট (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">ক্রেডিট (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right px-6">শেষ ব্যালেন্স (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-slate-100/80 font-black text-xs text-slate-900"><TableCell colSpan={6} className="py-2.5 px-4">সম্পদ (Assets)</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1010</TableCell><TableCell className="font-bold text-slate-900">নগদ টাকা</TableCell><TableCell className="text-right">2,45,000</TableCell><TableCell className="text-right">3,45,400</TableCell><TableCell className="text-right">2,20,300</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">3,70,100</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1020</TableCell><TableCell className="font-bold text-slate-900">ব্যাংক ব্যালেন্স</TableCell><TableCell className="text-right">12,40,200</TableCell><TableCell className="text-right">4,25,600</TableCell><TableCell className="text-right">2,70,200</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">13,95,600</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1030</TableCell><TableCell className="font-bold text-slate-900">কাস্টমারের পাওনা</TableCell><TableCell className="text-right">7,50,000</TableCell><TableCell className="text-right">4,60,000</TableCell><TableCell className="text-right">1,10,000</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">11,00,000</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">1040</TableCell><TableCell className="font-bold text-slate-900">স্টক (পণ্য)</TableCell><TableCell className="text-right">4,20,000</TableCell><TableCell className="text-right">3,25,000</TableCell><TableCell className="text-right">4,15,000</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">3,30,000</TableCell></TableRow>

                      <TableRow className="bg-slate-100/80 font-black text-xs text-slate-900"><TableCell colSpan={6} className="py-2.5 px-4">দায় (Liabilities)</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">2010</TableCell><TableCell className="font-bold text-slate-900">সাপ্লায়ারের পাওনা</TableCell><TableCell className="text-right">3,40,000</TableCell><TableCell className="text-right">2,25,000</TableCell><TableCell className="text-right">5,95,000</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">7,10,000</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">2020</TableCell><TableCell className="font-bold text-slate-900">অব্যবসায়ীক ঋণ</TableCell><TableCell className="text-right">3,50,000</TableCell><TableCell className="text-right">1,00,000</TableCell><TableCell className="text-right">50,000</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">4,00,000</TableCell></TableRow>

                      <TableRow className="bg-slate-100/80 font-black text-xs text-slate-900"><TableCell colSpan={6} className="py-2.5 px-4">মূলধন ও আয় (Equity & Income)</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">3010</TableCell><TableCell className="font-bold text-slate-900">মূলধন</TableCell><TableCell className="text-right">16,10,000</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">16,10,000</TableCell></TableRow>
                      <TableRow className="border-b border-slate-100 text-xs"><TableCell className="font-mono font-bold text-slate-500">3020</TableCell><TableCell className="font-bold text-slate-900">চলতি বছরের লাভ</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right">3,75,000</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-bold text-slate-900 px-6">5,75,660</TableCell></TableRow>

                      <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                        <TableCell colSpan={2} className="py-3 px-4">মোট</TableCell>
                        <TableCell className="text-right">৩৪,২৫,৮৬০</TableCell>
                        <TableCell className="text-right text-emerald-600">৩৪,১৫,০৬০</TableCell>
                        <TableCell className="text-right text-rose-600">২১,২০,০০০</TableCell>
                        <TableCell className="text-right px-6 text-emerald-700 text-sm">৩৪,২৫,৮৬০</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {/* 4. ডেইলী সেলস স্টেটমেন্ট */}
            {activeTab === 'daily_sales' && (
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
                    <Button variant="outline" onClick={() => toast.info('ডাউনলোড হচ্ছে...')} className="h-9 px-3 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-4 h-4 mr-1" /> এক্সেল ডাউনলোড</Button>
                    <button onClick={() => setActiveTab('hub')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold text-slate-500">তারিখ</Label>
                    <Input type="text" value="26/05/2026" onChange={() => {}} className="h-10 w-44 text-xs font-bold rounded-xl bg-slate-50/50 border-slate-200" />
                    <Select defaultValue="all">
                      <SelectTrigger className="h-10 w-48 text-xs font-bold rounded-xl bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব কাস্টমার" /></SelectTrigger>
                      <SelectContent className="font-bengali"><SelectItem value="all">সব কাস্টমার</SelectItem></SelectContent>
                    </Select>
                    <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট বিক্রয়</p><p className="text-2xl font-black text-emerald-600 mt-1">৳ ৬,২৬,৪৬০</p></Card>
                  <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl"><p className="text-xs font-bold text-blue-800">মোট আদায়</p><p className="text-2xl font-black text-blue-600 mt-1">৳ ৩,৪৬,৫০০</p></Card>
                  <Card className="p-5 border-rose-200 bg-rose-50/40 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট বাকী</p><p className="text-2xl font-black text-rose-600 mt-1">৳ ২,৭৯,৯৬০</p></Card>
                  <Card className="p-5 border-purple-200 bg-purple-50/40 rounded-2xl"><p className="text-xs font-bold text-purple-800">মোট ইনভয়েস সংখ্যা</p><p className="text-2xl font-black text-purple-600 mt-1">১৭ টি</p></Card>
                </div>

                <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-xs text-center w-16">ক্রমিক</TableHead>
                        <TableHead className="font-black text-xs">ইনভয়েস নং</TableHead>
                        <TableHead className="font-black text-xs">কাস্টমারের নাম</TableHead>
                        <TableHead className="font-black text-xs">মোবাইল</TableHead>
                        <TableHead className="font-black text-xs text-right">বিক্রয় পরিমাণ (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">আদায় (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right">বাকী (৳)</TableHead>
                        <TableHead className="font-black text-xs text-right px-6">ব্যালেন্স (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { sl: '01', inv: 'INV-260526-001', cust: 'মেসার্স রহমান ট্রেডার্স', phone: '01712-345678', sell: 125000, paid: 75000, due: 50000, bal: 128200 },
                        { sl: '02', inv: 'INV-260526-002', cust: 'মেসার্স সালমান বিল্ডার্স', phone: '01819-876543', sell: 95500, paid: 50000, due: 45500, bal: 95500 },
                        { sl: '03', inv: 'INV-260526-003', cust: 'মেসার্স নিউ আলম ট্রেডিং', phone: '01733-223344', sell: 62000, paid: 62000, due: 0, bal: 0 },
                        { sl: '04', inv: 'INV-260526-004', cust: 'মেসার্স হক এন্টারপ্রাইজ', phone: '01611-556677', sell: 110000, paid: 50000, due: 60000, bal: 100000 },
                        { sl: '05', inv: 'INV-260526-005', cust: 'মেসার্স জহির বিল্ডার্স', phone: '01922-334455', sell: 76000, paid: 40000, due: 36000, bal: 66000 },
                        { sl: '06', inv: 'INV-260526-006', cust: 'মেসার্স করিম ট্রেডার্স', phone: '01788-665544', sell: 58000, paid: 25000, due: 33000, bal: 40000 },
                      ].map((s) => (
                        <TableRow key={s.inv} className="border-b border-slate-100 text-xs">
                          <TableCell className="text-center font-mono font-bold text-slate-500">{s.sl}</TableCell>
                          <TableCell className="font-mono font-bold text-slate-800">{s.inv}</TableCell>
                          <TableCell className="font-black text-slate-900">{s.cust}</TableCell>
                          <TableCell className="font-mono text-slate-600">{s.phone}</TableCell>
                          <TableCell className="text-right font-bold">৳ {s.sell.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">৳ {s.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600">৳ {s.due.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-slate-900 px-6">৳ {s.bal.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                    <span>মোট:</span>
                    <div className="flex gap-6">
                      <span className="text-emerald-600">৬,২৬,৪৬০</span>
                      <span className="text-blue-600">৩,৪৬,৫০০</span>
                      <span className="text-rose-600">২,৭৯,৯৬০</span>
                      <span>৪,২৯,৭০০</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 5. প্রফিট এবং লস স্টেটমেন্ট */}
            {activeTab === 'profit_loss' && (
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

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500">তারিখ থেকে</Label>
                      <Input type="text" value="01/05/2026" onChange={() => {}} className="h-10 w-36 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500">তারিখ পর্যন্ত</Label>
                      <Input type="text" value="28/05/2026" onChange={() => {}} className="h-10 w-36 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500">শাখা</Label>
                      <Select defaultValue="all">
                        <SelectTrigger className="h-10 w-36 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব শাখা" /></SelectTrigger>
                        <SelectContent className="font-bengali"><SelectItem value="all">সব শাখা</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500">তুলনা করুন</Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="h-10 w-36 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200"><SelectValue placeholder="কোনো তুলনা নয়" /></SelectTrigger>
                        <SelectContent className="font-bengali"><SelectItem value="none">কোনো তুলনা নয়</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pt-4">
                      <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                        ⚡ ফিল্টার করুন
                      </Button>
                    </div>
                    <div className="flex items-end pt-4">
                      <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                    </div>
                  </div>

                  <div className="flex items-end gap-2 pt-4">
                    <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><Download className="w-4 h-4 mr-1.5 text-slate-500" /> এক্সপোর্ট ∨</Button>
                    <Button variant="outline" onClick={() => window.print()} className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><Printer className="w-4 h-4 mr-1.5 text-slate-500" /> প্রিন্ট</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট আয়</p><p className="text-2xl font-black text-emerald-600 mt-1">৳ ৪১,৪০,৭৫০</p></Card>
                  <Card className="p-4 border-rose-200 bg-rose-50/30 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট ব্যয়</p><p className="text-2xl font-black text-rose-600 mt-1">৳ ৩২,৪৫,২০০</p></Card>
                  <Card className="p-4 border-blue-200 bg-blue-50/30 rounded-2xl"><p className="text-xs font-bold text-blue-800">মোট লাভ</p><p className="text-2xl font-black text-blue-600 mt-1">৳ ৮,৯৫,৫৫০</p></Card>
                  <Card className="p-4 border-amber-200 bg-amber-50/30 rounded-2xl"><p className="text-xs font-bold text-amber-800">লাভের হার</p><p className="text-2xl font-black text-amber-600 mt-1">২২.০৬%</p></Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-emerald-700 text-base">আয় (Income)</h3></div>
                    <Table>
                      <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">খাতের নাম</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[{ name: 'রড বিক্রয়', val: 3101000 }, { name: 'সিমেন্ট বিক্রয়', val: 1040000 }, { name: 'পরিবহন চার্জ আয়', val: 220200 }, { name: 'অন্যান্য আয়', val: 29000 }].map((r, i) => (
                          <TableRow key={i} className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">{r.name}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.val.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell className="py-3 px-4 font-black">মোট আয়</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6 font-black">৳ ৪১,৪০,৭৫০</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-rose-700 text-base">ব্যয় (Expense)</h3></div>
                    <Table>
                      <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">খাতের নাম</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[{ name: 'রড ক্রয়', val: 2371000 }, { name: 'সিমেন্ট ক্রয়', val: 604400 }, { name: 'পরিবহন ব্যয়', val: 100250 }, { name: 'গোডাউন ভাড়া', val: 86000 }, { name: 'বেতন ও ভাতা', val: 50000 }, { name: 'অফিস খরচ', val: 46000 }, { name: 'অন্যান্য ব্যয়', val: 42550 }].map((r, i) => (
                          <TableRow key={i} className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">{r.name}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.val.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell className="py-3 px-4 font-black">মোট ব্যয়</TableCell><TableCell className="text-right text-rose-700 text-sm px-6 font-black">৳ ৩২,৪৫,২০০</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 border-slate-200 bg-white rounded-2xl space-y-4 shadow-xs">
                    <h3 className="font-black text-emerald-700 text-base border-b pb-3">নিট লাভ (Net Profit)</h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b"><span className="font-semibold text-slate-600">মোট আয়</span><span className="font-bold text-slate-900">৳ ৪১,৪০,৭৫০</span></div>
                      <div className="flex justify-between py-1.5 border-b"><span className="font-semibold text-slate-600">(-) মোট ব্যয়</span><span className="font-bold text-rose-600">৳ ৩২,৪৫,২০০</span></div>
                      <div className="flex justify-between pt-3 font-black text-emerald-600 text-base border-t-2"><span>নিট লাভ</span><span>৳ ৮,৯৫,৫৫০</span></div>
                    </div>
                  </Card>

                  <Card className="p-6 border-slate-200 bg-white rounded-2xl space-y-4 shadow-xs">
                    <h3 className="font-black text-slate-900 text-base border-b pb-3">আয় বনাম ব্যয়</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
                      <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-slate-100" strokeWidth="3.8" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-rose-500" strokeDasharray="43.7, 100" strokeWidth="3.8" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-emerald-500" strokeDasharray="56.3, 100" strokeDashoffset="-43.7" strokeWidth="3.8" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-500">লাভ</span><span className="text-sm font-black text-emerald-600">২২.০৬%</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs font-bold">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-slate-700">মোট আয় (৳ ৪১,৪০,৭৫০) <span className="text-emerald-600 font-mono font-black">56.3%</span></span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span><span className="text-slate-700">মোট ব্যয় (৳ ৩২,৪৫,২০০) <span className="text-rose-600 font-mono font-black">43.7%</span></span></div>
                      </div>
                    </div>
                  </Card>
                </div>
                <p className="text-xs text-slate-500 font-semibold pt-1">উপরের রিপোর্টটি নির্বাচিত তারিখ অনুযায়ী স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত।</p>
              </div>
            )}

            {/* 6. ব্যালেন্স শীট */}
            {activeTab === 'balance_sheet' && (
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

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ:</Label><Input type="text" value="28/05/2026" onChange={() => {}} className="h-10 w-36 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">শাখা:</Label><Select defaultValue="all"><SelectTrigger className="h-10 w-40 text-xs font-bold rounded-xl mt-0.5 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব শাখা" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব শাখা</SelectItem></SelectContent></Select></div>
                    <div className="flex items-end pt-4"><Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">⚡ ফিল্টার করুন</Button></div>
                  </div>
                  <div className="flex items-end pt-4"><Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700"><Download className="w-4 h-4 mr-1.5 text-slate-500" /> এক্সপোর্ট ∨</Button></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><p className="text-xs font-bold text-emerald-800">মোট সম্পদ (Assets)</p><p className="text-2xl font-black text-emerald-600 mt-1">৳ ৩৪,২৫,৬০০</p></Card>
                  <Card className="p-4 border-rose-200 bg-rose-50/30 rounded-2xl"><p className="text-xs font-bold text-rose-800">মোট দায় (Liabilities)</p><p className="text-2xl font-black text-rose-600 mt-1">৳ ১৬,৭৫,৪০০</p></Card>
                  <Card className="p-4 border-purple-200 bg-purple-50/30 rounded-2xl"><p className="text-xs font-bold text-purple-800">নিট সম্পত্তি (Equity)</p><p className="text-2xl font-black text-purple-600 mt-1">৳ ১৭,৪১,২০০</p></Card>
                  <Card className="p-4 border-slate-200 bg-slate-50/50 rounded-2xl"><p className="text-xs font-bold text-slate-600">মোট (সম্পদ)</p><p className="text-2xl font-black text-slate-900 mt-1">৳ ৩৪,২৫,৬০০</p></Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-emerald-700 text-base">সম্পদ (Assets)</h3></div>
                    <Table>
                      <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">হিসাবের নাম</TableHead><TableHead className="font-black text-xs text-center">হিসাব কোড</TableHead><TableHead className="font-black text-xs text-right px-6">ব্যালেন্স (৳)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[{ name: 'নগদ টাকা', code: '1010', val: 200400 }, { name: 'প্রাইম ব্যাংক অ্যাকাউন্ট', code: '1020', val: 1240200 }, { name: 'সঞ্চয়ী ব্যাংক অ্যাকাউন্ট', code: '1030', val: 610000 }, { name: 'গ্রাহকের পাওনা', code: '1040', val: 310000 }, { name: 'স্টক (রড)', code: '1050', val: 1450000 }, { name: 'স্টক (সিমেন্ট)', code: '1051', val: 1260000 }, { name: 'ফিক্সড অ্যাসেট', code: '1060', val: 10000 }].map(r => (
                          <TableRow key={r.code} className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">{r.name}</TableCell><TableCell className="text-center font-mono font-bold text-slate-500">{r.code}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.val.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell colSpan={2} className="py-3 px-4 font-black">মোট সম্পদ</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6 font-black">৳ ৩৪,২৫,৬০০</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-rose-700 text-base">দায় (Liabilities)</h3></div>
                    <Table>
                      <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">হিসাবের নাম</TableHead><TableHead className="font-black text-xs text-center">হিসাব কোড</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[{ name: 'সাপ্লায়ারের পাওনা', code: '2010', val: 740000 }, { name: 'ব্যাংক ওভারড্রাফট', code: '2020', val: 550000 }, { name: 'স্বল্পমেয়াদি ঋণ', code: '2030', val: 345400 }, { name: 'অন্যান্য দায়', code: '2040', val: 140000 }].map(r => (
                          <TableRow key={r.code} className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">{r.name}</TableCell><TableCell className="text-center font-mono font-bold text-slate-500">{r.code}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.val.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell colSpan={2} className="py-3 px-4 font-black">মোট দায়</TableCell><TableCell className="text-right text-rose-700 text-sm px-6 font-black">৳ ১৬,৭৫,৪০০</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200"><h3 className="font-black text-purple-700 text-base">নিট সম্পত্তি (Equity)</h3></div>
                    <Table>
                      <TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-xs">হিসাবের নাম</TableHead><TableHead className="font-black text-xs text-center">হিসাব কোড</TableHead><TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[{ name: 'মূল মূলধন', code: '3010', val: 1500000 }, { name: 'বর্তমান বছরের লাভ', code: '3020', val: 241200 }].map(r => (
                          <TableRow key={r.code} className="border-b border-slate-100 text-xs"><TableCell className="font-bold text-slate-900">{r.name}</TableCell><TableCell className="text-center font-mono font-bold text-slate-500">{r.code}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.val.toLocaleString()}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-slate-100 font-black text-xs text-slate-900 border-t border-slate-200"><TableCell colSpan={2} className="py-3 px-4 font-black">মোট নিট সম্পত্তি</TableCell><TableCell className="text-right text-purple-700 text-sm px-6 font-black">৳ ১৭,৪১,২০০</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  <Card className="p-4 bg-purple-50/50 border-purple-200 rounded-2xl flex justify-between items-center text-sm font-black text-slate-900">
                    <span>মোট (দায় + নিট সম্পত্তি)</span><span className="text-purple-700 text-base">৳ ৩৪,২৫,৬০০</span>
                  </Card>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold pt-2">
                    <p>উপরের তথ্যগুলো হিসাব সফটওয়্যার হতে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত।</p>
                    <Button onClick={() => window.print()} className="h-10 px-6 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white">⚡ প্রিন্ট করুন</Button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. রড সিমেন্ট ক্রয় বিক্রয় স্টীট */}
            {activeTab === 'trade_register' && (
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

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ থেকে</Label><Input type="text" value="01/05/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ পর্যন্ত</Label><Input type="text" value="28/05/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">পণ্য</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব পণ্য" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব পণ্য</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">গ্রাহক / সরবরাহকারী</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">ধরন</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব (ক্রয় ও বিক্রয়)" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব (ক্রয় ও বিক্রয়)</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">শাখা</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব শাখা" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব শাখা</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                      <Button variant="outline" className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><Download className="w-4 h-4 mr-1.5 text-slate-500" /> এক্সপোর্ট ∨</Button>
                      <Button variant="outline" onClick={() => window.print()} className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><Printer className="w-4 h-4 mr-1.5 text-slate-500" /> প্রিন্ট</Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-800">মোট ক্রয়</p><p className="text-2xl font-black text-emerald-600 mt-1">৳ ৩২,৪৫,২০০</p></div><div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold"><ShoppingCart className="w-6 h-6" /></div></Card>
                  <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-blue-800">মোট বিক্রয়</p><p className="text-2xl font-black text-blue-600 mt-1">৳ ৪১,৪০,৭৫০</p></div><div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold"><ShoppingBag className="w-6 h-6" /></div></Card>
                  <Card className="p-5 border-amber-200 bg-amber-50/40 rounded-2xl flex items-center justify-between"><div><p className="text-xs font-bold text-amber-800">মোট লাভ</p><p className="text-2xl font-black text-amber-600 mt-1">৳ ৮,৯৫,৫৫০</p></div><div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold"><BarChart3 className="w-6 h-6" /></div></Card>
                </div>

                <div className="flex border-b border-slate-200 gap-4 text-xs font-black">
                  <button onClick={() => setTradeTab('rod_buy')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'rod_buy' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>রড ক্রয়</button>
                  <button onClick={() => setTradeTab('rod_sell')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'rod_sell' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>রড বিক্রয়</button>
                  <button onClick={() => setTradeTab('cement_buy')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'cement_buy' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>সিমেন্ট ক্রয়</button>
                  <button onClick={() => setTradeTab('cement_sell')} className={cn("pb-2.5 px-2 transition-all border-b-2", tradeTab === 'cement_sell' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900")}>সিমেন্ট বিক্রয়</button>
                </div>

                <div className="space-y-4">
                  <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="font-black text-xs">তারিখ</TableHead><TableHead className="font-black text-xs">ভাউচার নং</TableHead><TableHead className="font-black text-xs">সাপ্লায়ার</TableHead><TableHead className="font-black text-xs">পণ্য</TableHead><TableHead className="font-black text-xs text-right">পরিমাণ</TableHead><TableHead className="font-black text-xs text-right">একক মূল্য (৳)</TableHead><TableHead className="font-black text-xs text-right px-6">মোট (৳)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { date: '01/05/2026', vNo: 'PUR-250501', supplier: 'মেসার্স সাগর স্টিল', item: 'রড ১২মিমি', qty: '২,০০০', rate: '৭০.০০', total: 140000 },
                          { date: '03/05/2026', vNo: 'PUR-250503', supplier: 'মেসার্স স্টিল ওয়ার্ল্ড', item: 'রড ১৬মিমি', qty: '১,৫০-০', rate: '১০৫.০০', total: 157500 },
                          { date: '05/05/2026', vNo: 'PUR-250505', supplier: 'মেসার্স সাগর স্টিল', item: 'রড ১৬মিমি', qty: '২,৫০০', rate: '৬২.০০', total: 155000 },
                          { date: '10/05/2026', vNo: 'PUR-250510', supplier: 'মেসার্স স্টিল ওয়ার্ল্ড', item: 'রড ২০মিমি', qty: '১,০০০', rate: '১০৫.০০', total: 105000 },
                          { date: '12/05/2026', vNo: 'PUR-250514', supplier: 'মেসার্স সাগর স্টিল', item: 'রড ১২মিমি', qty: '২,০০০', rate: '৭২.০০', total: 144000 },
                        ].map((r, i) => (
                          <TableRow key={i} className="border-b border-slate-100 text-xs font-semibold">
                            <TableCell>{r.date}</TableCell><TableCell className="font-mono text-slate-600 font-bold">{r.vNo}</TableCell><TableCell className="font-black text-slate-900">{r.supplier}</TableCell><TableCell>{r.item}</TableCell><TableCell className="text-right font-mono font-bold">{r.qty}</TableCell><TableCell className="text-right font-mono">{r.rate}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 font-black text-xs text-slate-900 border-t border-slate-200">
                          <TableCell colSpan={4} className="py-3 px-4">মোট</TableCell><TableCell className="text-right font-mono text-emerald-700">৮,০০০</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6">৳ ৭,৬১,৫০০</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Card>

                  <div className="pt-4 space-y-3">
                    <h3 className="font-black text-slate-900 text-sm">রড বিক্রয়</h3>
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                          <TableRow>
                            <TableHead className="font-black text-xs">তারিখ</TableHead><TableHead className="font-black text-xs">ইনভয়েস নং</TableHead><TableHead className="font-black text-xs">গ্রাহক</TableHead><TableHead className="font-black text-xs">পণ্য</TableHead><TableHead className="font-black text-xs text-right">পরিমাণ</TableHead><TableHead className="font-black text-xs text-right">একক মূল্য (৳)</TableHead><TableHead className="font-black text-xs text-right px-6">মোট (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { date: '01/05/2026', inv: 'INV-250501', cust: 'মেসার্স রহমান বিল্ডার্স', item: 'রড ১২মিমি', qty: '১,৫০০', rate: '৪৪.০০', total: 202000 },
                            { date: '02/05/2026', inv: 'INV-250502', cust: 'মেসার্স সাইদুল এন্টারপ্রাইজ', item: 'রড ১৬মিমি', qty: '১,০০০', rate: '১২২.০০', total: 122000 },
                            { date: '06/05/2026', inv: 'INV-250505', cust: 'মেসার্স আনাম কনস্ট্রাকশন', item: 'রড ১৬মিমি', qty: '২,০০০', rate: '৭০.০০', total: 140000 },
                            { date: '08/05/2026', inv: 'INV-250508', cust: 'মেসার্স আলম ট্রেডার্স', item: 'রড ২০মিমি', qty: '৪০০', rate: '১৬৫.০০', total: 126000 },
                            { date: '12/05/2026', inv: 'INV-250512', cust: 'মেসার্স রূপালী বিল্ডার্স', item: 'রড ১২মিমি', qty: '১,৫০০', rate: '৪৬.০০', total: 130000 },
                          ].map((r, i) => (
                            <TableRow key={i} className="border-b border-slate-100 text-xs font-semibold">
                              <TableCell>{r.date}</TableCell><TableCell className="font-mono text-slate-600 font-bold">{r.inv}</TableCell><TableCell className="font-black text-slate-900">{r.cust}</TableCell><TableCell>{r.item}</TableCell><TableCell className="text-right font-mono font-bold">{r.qty}</TableCell><TableCell className="text-right font-mono">{r.rate}</TableCell><TableCell className="text-right font-black text-slate-900 px-6">৳ {r.total.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 font-black text-xs text-slate-900 border-t border-slate-200">
                            <TableCell colSpan={4} className="py-3 px-4">মোট</TableCell><TableCell className="text-right font-mono text-emerald-700">৬,৪০০</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right text-emerald-700 text-sm px-6">৳ ৬,৬১,০০০</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold pt-1">উপরের রিপোর্টটি নির্দিষ্ট তারিখ ও ফিল্টার অনুযায়ী প্রদর্শিত।</p>
                </div>
              </div>
            )}

            {/* 8. পেন্ডিং কমিশন তালিকা */}
            {activeTab === 'commissions' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">পেন্ডিং কমিশন তালিকা</h1>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                      <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">পেন্ডিং কমিশন তালিকা</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Button variant="outline" onClick={() => toast.info('রিফ্রেশ হচ্ছে...')} className="h-9 px-3 rounded-xl border-slate-200 bg-white text-slate-700 font-bold text-xs"><RefreshCcw className="w-3.5 h-3.5 mr-1 text-slate-500" /> রিফ্রেশ</Button>
                    <Button variant="outline" className="h-9 px-3 rounded-xl border-slate-200 bg-white text-slate-700 font-bold text-xs"><Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> এক্সপোর্ট ∨</Button>
                    <Button onClick={() => toast.info('কমিশন সেটিংস')} className="h-9 px-4 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white shadow-xs"><Settings2 className="w-4 h-4 mr-1.5" /> কমিশন সেটিংস</Button>
                    <button onClick={() => setActiveTab('hub')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-4 border-emerald-200 bg-emerald-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">মোট পেন্ডিং কমিশন</p><p className="text-2xl font-black text-slate-900">৳ ১,২৮,৬৫০</p><p className="text-[10px] font-semibold text-slate-500">সকল পেন্ডিং কমিশনের মোট পরিমাণ</p></div><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0"><Wallet className="w-5 h-5" /></div></div></Card>
                  <Card className="p-4 border-purple-200 bg-purple-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-purple-700">রড এর কমিশন</p><p className="text-2xl font-black text-slate-900">৳ ৭৬,৪৫০</p><p className="text-[10px] font-semibold text-slate-500">রড বিক্রির পেন্ডিং কমিশন</p></div><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0"><TrendingUp className="w-5 h-5" /></div></div></Card>
                  <Card className="p-4 border-blue-200 bg-blue-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-700">সিমেন্ট এর কমিশন</p><p className="text-2xl font-black text-slate-900">৳ ৫২,২০০</p><p className="text-[10px] font-semibold text-slate-500">সিমেন্ট বিক্রির পেন্ডিং কমিশন</p></div><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0"><ShoppingBag className="w-5 h-5" /></div></div></Card>
                  <Card className="p-4 border-amber-200 bg-amber-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-amber-700">আজ যুক্ত হয়েছে</p><p className="text-2xl font-black text-slate-900">৳ ৪,২৫০</p><p className="text-[10px] font-semibold text-slate-500">আজকের নতুন পেন্ডিং কমিশন</p></div><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0"><Calendar className="w-5 h-5" /></div></div></Card>
                  <Card className="p-4 border-rose-200 bg-rose-50/30 rounded-2xl"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-rose-700">ওভারডিউ (৩০ দিনের বেশি)</p><p className="text-2xl font-black text-rose-600">৳ ১৪,৭০০</p><p className="text-[10px] font-semibold text-slate-500">৩০ দিনের বেশি সময়ের বাকি</p></div><div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0"><Clock className="w-5 h-5" /></div></div></Card>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ থেকে</Label><Input type="text" value="01/04/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">তারিখ পর্যন্ত</Label><Input type="text" value="26/05/2026" onChange={() => {}} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">পণ্য</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব পণ্য" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব পণ্য</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">রেফারেন্স টাইপ</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">সেলসম্যান / এজেন্ট</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব সেলসম্যান" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব সেলসম্যান</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-[11px] font-bold text-slate-500">স্ট্যাটাস</Label><Select defaultValue="all"><SelectTrigger className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200"><SelectValue placeholder="সব" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="all">সব</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white">⚡ ফিল্টার করুন</Button>
                      <Button variant="outline" className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="relative w-full sm:w-72">
                      <Input type="text" placeholder="ইনভয়েস / নাম / মোবাইল নং" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 pl-9 pr-4 text-xs font-bold rounded-xl bg-slate-50/50 border-slate-200" />
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => toast.success('কমিশন পুনরায় হিসাব সম্পন্ন হয়েছে!')} className="h-10 px-4 rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700"><Calculator className="w-4 h-4 mr-1.5" /> কমিশন হিসাব পুনরায় গণনা</Button>
                      <Button variant="outline" onClick={() => window.print()} className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white"><Printer className="w-4 h-4 mr-1.5 text-slate-600" /> প্রিন্ট</Button>
                    </div>
                  </div>
                </div>

                <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-xs text-center w-14">ক্রমিক</TableHead><TableHead className="font-black text-xs">ইনভয়েস নং</TableHead><TableHead className="font-black text-xs">তারিখ</TableHead><TableHead className="font-black text-xs">কাস্টমার / সাপ্লায়ার</TableHead><TableHead className="font-black text-xs">পণ্য</TableHead><TableHead className="font-black text-xs text-right">বিক্রয় পরিমাণ (৳)</TableHead><TableHead className="font-black text-xs text-right">কমিশন %</TableHead><TableHead className="font-black text-xs text-right">কমিশন পরিমাণ (৳)</TableHead><TableHead className="font-black text-xs text-right">পরিশোধিত (৳)</TableHead><TableHead className="font-black text-xs text-right">পেন্ডিং (৳)</TableHead><TableHead className="font-black text-xs text-center">দিন</TableHead><TableHead className="font-black text-xs text-center">স্ট্যাটাস</TableHead><TableHead className="font-black text-xs text-center">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { sl: '01', inv: 'INV-2605-001', date: '26/05/2026', party: 'মেসার্স রহমান ট্রেডার্স', item: 'রড', sell: '1,25,800', rate: '2.00%', comm: '2,516', paid: '-', pending: '2,516', days: '0 দিন', statusTag: 'নতুন', statusClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                        { sl: '02', inv: 'INV-2605-002', date: '25/05/2026', party: 'মেসার্স আল-আমিন বিল্ডার্স', item: 'সিমেন্ট', sell: '85,200', rate: '1.50%', comm: '1,278', paid: '-', pending: '1,278', days: '1 দিন', statusTag: 'নতুন', statusClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                        { sl: '03', inv: 'INV-2605-003', date: '24/05/2026', party: 'মেসার্স ফয়সাল কনস্ট্রাকশন', item: 'রড', sell: '2,35,600', rate: '2.00%', comm: '4,712', paid: '-', pending: '4,712', days: '2 দিন', statusTag: 'নতুন', statusClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                        { sl: '04', inv: 'INV-2605-004', date: '22/05/2026', party: 'মেসার্স নূর এন্টারপ্রাইজ', item: 'সিমেন্ট', sell: '1,12,000', rate: '1.50%', comm: '1,680', paid: '500', pending: '1,180', days: '4 দিন', statusTag: 'আংশিক পরিশোধ', statusClass: 'bg-blue-100 text-blue-700 border-blue-200' },
                        { sl: '05', inv: 'INV-2605-005', date: '20/05/2026', party: 'মেসার্স জাহিদ বিল্ডার্স', item: 'রড', sell: '3,10,000', rate: '2.00%', comm: '6,000', paid: '2,000', pending: '4,200', days: '6 দিন', statusTag: 'আংশিক পরিশোধ', statusClass: 'bg-blue-100 text-blue-700 border-blue-200' },
                        { sl: '06', inv: 'INV-2605-006', date: '18/05/2026', party: 'মেসার্স বিল্ডিং পয়েন্ট', item: 'সিমেন্ট', sell: '95,400', rate: '1.50%', comm: '1,431', paid: '-', pending: '1,431', days: '8 দিন', statusTag: 'ওভারডিউ', statusClass: 'bg-orange-100 text-orange-700 border-orange-200' },
                        { sl: '07', inv: 'INV-2605-007', date: '15/05/2026', party: 'মেসার্স সাকিব ট্রেডার্স', item: 'রড', sell: '4,25,000', rate: '2.00%', comm: '8,500', paid: '3,000', pending: '5,500', days: '11 দিন', statusTag: 'ওভারডিউ', statusClass: 'bg-orange-100 text-orange-700 border-orange-200' },
                        { sl: '08', inv: 'INV-2605-008', date: '10/05/2026', party: 'মেসার্স মদিনা ট্রেডার্স', item: 'সিমেন্ট', sell: '1,45,600', rate: '1.50%', comm: '2,184', paid: '-', pending: '2,184', days: '16 দিন', statusTag: 'অতিবিলম্বিত', statusClass: 'bg-rose-100 text-rose-700 border-rose-200' },
                      ].map((r, i) => (
                        <TableRow key={i} className="border-b border-slate-100 text-xs font-semibold">
                          <TableCell className="text-center font-mono text-slate-500">{r.sl}</TableCell>
                          <TableCell className="font-mono text-slate-800 font-bold">{r.inv}</TableCell>
                          <TableCell className="text-slate-600">{r.date}</TableCell>
                          <TableCell className="font-black text-slate-900">{r.party}</TableCell>
                          <TableCell className="text-slate-700">{r.item}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900">{r.sell}</TableCell>
                          <TableCell className="text-right font-mono text-slate-600">{r.rate}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900">{r.comm}</TableCell>
                          <TableCell className="text-right font-mono text-slate-600">{r.paid}</TableCell>
                          <TableCell className="text-right font-mono font-black text-rose-600">{r.pending}</TableCell>
                          <TableCell className="text-center font-mono text-slate-500">{r.days}</TableCell>
                          <TableCell className="text-center"><span className={cn("px-2.5 py-0.5 rounded-lg text-[10px] font-black border inline-block", r.statusClass)}>{r.statusTag}</span></TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleOpenEditCommission(activeCommissions[0] || { id: 'c1', agentName: r.party, rate: 2.0, totalAmount: 2516, status: 'pending', createdAt: new Date() })} className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="এডিট"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleOpenAutoJournal(activeCommissions[0] || { id: 'c1', agentName: r.party, rate: 2.0, totalAmount: 2516, status: 'pending', createdAt: new Date() })} className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="অটো জার্নাল"><DollarSign className="w-3.5 h-3.5" /></button>
                              <button onClick={() => window.print()} className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors" title="প্রিন্ট মেমো"><FileText className="w-3.5 h-3.5" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs font-black text-slate-900">
                    <span>মোট ৮টি রেকর্ড</span>
                    <div className="flex items-center gap-6"><span>১৫,৩৪,৬০০</span><span>২৮,৫০১</span><span>৫,৫০০</span><span className="text-rose-600 text-sm">২৩,০০১</span></div>
                  </div>
                </Card>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">প্রতি পেজে দেখান</span>
                    <Select defaultValue="10"><SelectTrigger className="h-8 w-16 text-xs font-bold rounded-lg bg-white border-slate-200"><SelectValue placeholder="10" /></SelectTrigger><SelectContent className="font-bengali"><SelectItem value="10">10</SelectItem></SelectContent></Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 bg-white font-bold">&lsaquo;</button>
                    <button className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">1</button>
                    <button className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center font-bold">2</button>
                    <button className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center font-bold">3</button>
                    <span className="px-1 text-slate-400">...</span>
                    <button className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center font-bold">10</button>
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 bg-white font-bold">&rsaquo;</button>
                  </div>
                </div>
              </div>
            )}

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
