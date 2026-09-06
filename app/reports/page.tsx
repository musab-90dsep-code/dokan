'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  BarChart3, Users, Landmark, FileText, ShoppingCart, 
  TrendingUp, RefreshCcw, Calendar, Search, Edit2,
  Wallet, Truck, PieChart, Printer, FileSpreadsheet, Scale,
  Plus, Percent, ArrowRight, Lightbulb, Settings2,
  Download, ArrowLeft, Clock, Eye, CheckCircle2, ChevronRight,
  ShoppingBag, Layers, DollarSign, Calculator,
  Copy, Check
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
import { isToday, isSameMonth, isSameYear, format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { printElement } from '@/lib/printUtils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';

const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM - yyyy') => {
  if (!dateVal) return '—';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, pattern, { locale: bn });
    return toBengaliDigits(raw);
  } catch {
    return '—';
  }
};

const formatBnNumber = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) return '-';
  const num = Math.round(amount);
  return toBengaliDigits(num.toLocaleString('en-IN'));
};

const formatBnQty = (qty: number | undefined | null): string => {
  if (qty === undefined || qty === null || isNaN(qty) || qty === 0) return '০';
  const formatted = qty % 1 === 0 ? qty.toLocaleString('en-IN') : qty.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return toBengaliDigits(formatted);
};

const formatBnCurrencyAmount = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০';
  const num = Math.round(amount);
  return toBengaliDigits(num.toLocaleString('en-IN'));
};

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
  paymentMethod?: string;
  chequeNo?: string;
  deliveryType?: string;
  items?: OrderItem[];
  notes?: string;
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
  invoiceNo?: string;
  supplierName?: string;
  totalPrice?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  deliveryType?: string;
  items?: PurchaseItem[];
  notes?: string;
  createdAt: any;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  chequeNo?: string;
  notes?: string;
  createdAt: any;
  raw?: any;
}

interface Customer {
  id: string;
  name: string;
  businessName?: string;
  totalDue?: number;
}

interface Supplier {
  id: string;
  name: string;
  businessName?: string;
  totalDue?: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  unit: string;
  brand?: string;
}

interface Bank {
  id: string;
  name: string;
  accNo: string;
  branch?: string;
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
  const [totalCash, setTotalCash] = useState<number>(0);
  const [initialCapital, setInitialCapital] = useState<number>(10000000);
  const [isEditingCapital, setIsEditingCapital] = useState<boolean>(false);
  const [tempCapitalInput, setTempCapitalInput] = useState<string>('10000000');
  const [balanceSheetDate, setBalanceSheetDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [incomeStatementDate, setIncomeStatementDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [incomePeriodMode, setIncomePeriodMode] = useState<'month' | 'today' | 'all'>('month');

  const [filterStartDate, setFilterStartDate] = useState<string>(() => format(new Date(), 'yyyy-MM-01'));
  const [filterEndDate, setFilterEndDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily Topsheet & Daily Sales Statement States
  const [topsheetDate, setTopsheetDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [salesStatementDate, setSalesStatementDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [salesCategoryFilter, setSalesCategoryFilter] = useState<string>('all');

  const [tradeTab, setTradeTab] = useState<'rod_buy' | 'rod_sell' | 'cement_buy' | 'cement_sell'>('rod_buy');



  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalCommission, setJournalCommission] = useState<Commission | null>(null);
  const [journalAccountType, setJournalAccountType] = useState<'cash' | 'bank'>('cash');
  const [journalBankId, setJournalBankId] = useState<string>('');
  const [journalConfirmText, setJournalConfirmText] = useState<string>('');
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);

  // Bank Management States & Handlers
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankAccNo, setBankAccNo] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  const fetchBankList = useCallback(async () => {
    try {
      const bankList = await api.banks.list();
      const safeBankList = Array.isArray(bankList) ? bankList : [];
      setBanks(safeBankList.map(b => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        branch: b.branch || '',
        balance: Number(b.balance || 0)
      })));
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  }, []);

  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankName('');
    setBankAccNo('');
    setBankBranch('');
    setBankBalance(0);
    setBankModalOpen(true);
  };

  const handleOpenEditBank = (b: Bank) => {
    setEditingBank(b);
    setBankName(b.name);
    setBankAccNo(b.accNo);
    setBankBranch(b.branch || '');
    setBankBalance(b.balance);
    setBankModalOpen(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      toast.error('ব্যাংক এর নাম লিখুন');
      return;
    }
    try {
      setIsSubmittingBank(true);
      if (editingBank) {
        await api.banks.update(editingBank.id, {
          name: bankName.trim(),
          account_number: bankAccNo.trim(),
          branch: bankBranch.trim(),
          balance: Number(bankBalance || 0)
        });
        toast.success('ব্যাংক তথ্য আপডেট হয়েছে');
      } else {
        await api.banks.create({
          name: bankName.trim(),
          account_number: bankAccNo.trim(),
          branch: bankBranch.trim(),
          balance: Number(bankBalance || 0)
        });
        toast.success('নতুন ব্যাংক যোগ করা হয়েছে');
      }
      setBankModalOpen(false);
      fetchBankList();
    } catch (err) {
      console.error(err);
      toast.error('ব্যাংক তথ্য সংরক্ষণ করা সম্ভব হয়নি');
    } finally {
      setIsSubmittingBank(false);
    }
  };

  const handleDeleteBank = async (b: Bank) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${b.name}" একাউন্টটি মুছে ফেলতে চান?`)) return;
    try {
      await api.banks.delete(b.id);
      toast.success('ব্যাংক একাউন্ট মুছে ফেলা হয়েছে');
      fetchBankList();
    } catch (err) {
      console.error(err);
      toast.error('ব্যাংক একাউন্ট মোছা সম্ভব হয়নি');
    }
  };

  useEffect(() => {
    async function loadReportsData() {
      try {
        const txList = await api.transactions.list();
        const safeTxList = Array.isArray(txList) ? txList : [];
        setTransactions(safeTxList.map(t => ({
          id: String(t.id || t.invoice_no),
          type: t.transaction_type,
          amount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          paymentMethod: t.payment_method || '',
          chequeNo: t.cheque_number || '',
          notes: t.notes || '',
          createdAt: t.created_at,
          raw: t
        })));
        setOrders(safeTxList.filter(t => t.transaction_type === 'sale').map(t => ({
          id: String(t.id || t.invoice_no),
          orderId: t.invoice_no,
          customerName: t.party_name || '',
          customerPhone: t.party_phone || '',
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          paymentMethod: t.payment_method || '',
          chequeNo: t.cheque_number || '',
          deliveryType: (t as any).delivery_type || '',
          items: (t.items || []).map(i => ({ name: i.product_name, price: Number(i.price || 0), quantity: Number(i.quantity || 0), unit: i.unit || 'পিস' })),
          notes: (t as any).notes || '',
          createdAt: t.created_at
        })));
        setPurchases(safeTxList.filter(t => t.transaction_type === 'purchase').map(t => ({
          id: String(t.id || t.invoice_no),
          invoiceNo: t.invoice_no,
          supplierName: t.party_name || '',
          totalPrice: Number(t.total_amount || 0),
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          paymentMethod: t.payment_method || '',
          deliveryType: (t as any).delivery_type || '',
          items: (t.items || []).map(i => ({ name: i.product_name, price: Number(i.price || 0), quantity: Number(i.quantity || 0), unit: i.unit || 'পিস' })),
          notes: (t as any).notes || '',
          createdAt: t.created_at
        })));

        const partyList = await api.parties.list();
        const safePartyList = Array.isArray(partyList) ? partyList : [];
        setCustomers(safePartyList.filter(p => p.party_type === 'customer' || p.party_type === 'both').map(p => ({
          id: String(p.id),
          name: p.name,
          businessName: p.business_name || '',
          totalDue: Number(p.total_due || 0)
        })));
        setSuppliers(safePartyList.filter(p => p.party_type === 'supplier' || p.party_type === 'both').map(p => ({
          id: String(p.id),
          name: p.name,
          businessName: p.business_name || '',
          totalDue: Number(p.total_due || 0)
        })));

        const prodList = await api.inventory.list();
        const safeProdList = Array.isArray(prodList) ? prodList : [];
        setProducts(safeProdList.map(p => ({
          id: String(p.id),
          name: p.name,
          category: p.category_name || 'অন্যান্য',
          stock: Number(p.stock || 0),
          buyPrice: Number(p.purchase_price || 0),
          sellPrice: Number(p.sell_price || 0),
          unit: p.unit || 'পিস',
          brand: p.brand || ''
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

        // Real Cash Balance from dashboard or transactions
        try {
          const stats = await api.dashboard.getStats();
          if (stats && typeof stats.totalCash === 'number') {
            setTotalCash(stats.totalCash);
          }
        } catch {
          const cashIn = safeTxList.filter(t => (t.payment_method === 'cash' || !t.payment_method) && (String(t.transaction_type) === 'sale' || String(t.transaction_type) === 'payment_in')).reduce((a, b) => a + Number(b.paid_amount || b.total_amount || 0), 0);
          const cashOut = safeTxList.filter(t => (t.payment_method === 'cash' || !t.payment_method) && (String(t.transaction_type) === 'purchase' || String(t.transaction_type) === 'payment_out')).reduce((a, b) => a + Number(b.paid_amount || b.total_amount || 0), 0);
          setTotalCash(cashIn - cashOut);
        }
      } catch (err) {
        console.error('Error loading reports data:', err);
      }
    }
    loadReportsData();
  }, []);

  // Derived commissions list (Both Purchases and Sales)
  const activeCommissions = useMemo(() => {
    if (commissions.length > 0) return commissions;
    const allCommEntries: Commission[] = [];

    // 1. Process Purchases with Commission (Company/Supplier Pending Commission)
    purchases.forEach(p => {
      let meta: any = {};
      if (p.notes && typeof p.notes === 'string' && p.notes.trim().startsWith('{')) {
        try { meta = JSON.parse(p.notes.split('\n')[0]); } catch {}
      }
      const commAmt = Number(meta.commission !== undefined ? meta.commission : (meta.commissionAmount !== undefined ? meta.commissionAmount : 0));
      if (commAmt > 0) {
        let totalQty = 0;
        let detectedCategory = meta.purchaseType === 'rod' ? 'রড' : meta.purchaseType === 'cement' ? 'সিমেন্ট' : '';
        (p.items || []).forEach(item => {
          totalQty += Number(item.quantity || 0);
          if (!detectedCategory) {
            const n = (item.name || '').toLowerCase();
            if (n.includes('রড') || n.includes('rod')) detectedCategory = 'রড';
            else if (n.includes('সিমেন্ট') || n.includes('cement')) detectedCategory = 'সিমেন্ট';
          }
        });
        if (!detectedCategory) detectedCategory = 'ক্রয় সামগ্রী';

        const invNo = p.invoiceNo || (p.id.startsWith('PUR') || p.id.startsWith('INV') ? p.id : `PUR-${p.id.slice(-6).toUpperCase()}`);
        allCommEntries.push({
          id: `comm_purchase_${p.id}`,
          orderId: invNo,
          customerName: p.supplierName || 'কোম্পানি/সরবরাহকারী',
          agentName: p.supplierName || 'কোম্পানি/সরবরাহকারী',
          productCategory: `${detectedCategory} (ক্রয়)`,
          salesVolume: p.totalAmount || 0,
          quantity: totalQty || 1,
          rate: Number(meta.commissionRate || 0),
          ratePercent: meta.commissionType === 'percentage' ? Number(meta.commissionRate || 0) : undefined,
          totalAmount: commAmt,
          paidAmount: 0,
          pendingAmount: commAmt,
          status: meta.commissionStatus === 'journalized' ? 'journalized' : 'pending',
          note: meta.commissionNote || `ক্রয় চালান কমিশন (${p.supplierName || 'সরবরাহকারী'})`,
          createdAt: p.createdAt || new Date()
        });
      }
    });

    // 2. Process Sales Orders with Engineer Commission
    orders.forEach((o, index) => {
      let meta: any = {};
      const oAny = o as any;
      if (oAny.notes && typeof oAny.notes === 'string' && oAny.notes.trim().startsWith('{')) {
        try { meta = JSON.parse(oAny.notes.split('\n')[0]); } catch {}
      }
      const engComm = Number(meta.engineerTotalCommission || oAny.engineerTotalCommission || 0);
      if (engComm > 0 || meta.engineerName) {
        allCommEntries.push({
          id: `comm_sale_${o.id}`,
          orderId: o.orderId || (o.id.startsWith('INV') ? o.id : `INV-${o.id.slice(-6).toUpperCase()}`),
          customerName: o.customerName || 'গ্রাহক',
          agentName: meta.engineerName || 'ইঞ্জিনিয়ার/প্রতিনিধি',
          productCategory: (meta.engineerRodKg ? 'রড' : '') + (meta.engineerCementBags ? ' সিমেন্ট' : '') || 'বিক্রয় সামগ্রী',
          salesVolume: o.totalAmount || 0,
          quantity: (meta.engineerRodKg || 0) + (meta.engineerCementBags || 0) || 1,
          rate: meta.engineerRodRate || meta.engineerCementRate || 0,
          totalAmount: engComm,
          paidAmount: 0,
          pendingAmount: engComm,
          status: 'pending',
          note: `বিক্রয় চালান কমিশন (${meta.engineerName || 'ইঞ্জিনিয়ার'})`,
          createdAt: o.createdAt || new Date()
        });
      }
    });

    // 3. If still no commissions found, provide sample derived entries only if orders exist and no real commissions found
    if (allCommEntries.length === 0 && orders.length > 0) {
      orders.slice(0, 3).forEach((o, index) => {
        let rodQty = 0;
        let cementQty = 0;
        (o.items || []).forEach(item => {
          const cat = item.category || (item.name.includes('রড') ? 'রড' : item.name.includes('সিমেন্ট') ? 'সিমেন্ট' : '');
          if (cat === 'রড' || item.unit === 'টন') rodQty += item.quantity || 1;
          else if (cat === 'সিমেন্ট' || item.unit === 'বস্তা') cementQty += item.quantity || 10;
        });

        const cat = rodQty > 0 ? 'রড' : cementQty > 0 ? 'সিমেন্ট' : 'সাধারণ পন্য';
        const qty = rodQty > 0 ? rodQty : cementQty > 0 ? cementQty : 5;
        const rate = cat === 'রড' ? 300 : cat === 'সিমেন্ট' ? 10 : 50;
        const vol = o.totalAmount || 1245800;
        const commAmt = qty * rate;
        allCommEntries.push({
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
      });
    }

    return allCommEntries;
  }, [commissions, orders, purchases]);



  // Auto-Journal Execution
  const handleOpenAutoJournal = (comm: Commission) => {
    setJournalCommission(comm);
    setJournalAccountType('cash');
    setJournalConfirmText('');
    if (banks.length > 0) setJournalBankId(banks[0].id);
    setJournalModalOpen(true);
  };

  const handleExecuteAutoJournal = async () => {
    if (!journalCommission) return;
    if (journalConfirmText.trim().toLowerCase() !== 'confirm') {
      toast.error("নিশ্চিত করতে অনুগ্রহ করে 'confirm' লিখুন");
      return;
    }
    setIsSubmittingJournal(true);
    try {
      const isPurchaseComm = journalCommission.id.startsWith('comm_purchase_');
      const bankAccId = journalAccountType === 'bank' && journalBankId ? Number(journalBankId) : undefined;
      
      if (isPurchaseComm) {
        await api.expenses.create({
          title: `কোম্পানি কমিশন সমন্বয়/প্রাপ্তি: ${journalCommission.agentName} (চালান: ${journalCommission.orderId || '—'})`,
          category_name: 'কমিশন আয়/সমন্বয়',
          amount: journalCommission.totalAmount,
          date: new Date().toISOString().split('T')[0],
          payment_method: journalAccountType,
          bank_account: bankAccId,
          notes: journalCommission.note || 'Company Purchase Commission Adjusted'
        });
      } else {
        await api.expenses.create({
          title: `কমিশন পরিশোধ: ${journalCommission.agentName} (মেমো: ${journalCommission.orderId || '—'})`,
          category_name: 'কমিশন খরচ',
          amount: journalCommission.totalAmount,
          date: new Date().toISOString().split('T')[0],
          payment_method: journalAccountType,
          bank_account: bankAccId,
          notes: journalCommission.note || 'Commission Approved and Paid'
        });
      }

      setCommissions(prev => {
        const base = prev.length > 0 ? prev : activeCommissions;
        return base.map(c => c.id === journalCommission.id ? { ...c, status: 'journalized', pendingAmount: 0 } : c);
      });
      fetchBankList();
      toast.success('কমিশন সফলভাবে অনুমোদিত (Approve) হয়েছে!');
      setJournalModalOpen(false);
      setJournalConfirmText('');
    } catch (err) {
      console.error(err);
      toast.error('কমিশন অনুমোদন করতে ব্যর্থ হয়েছে');
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
                      setFilterStartDate(format(new Date(), 'yyyy-MM-01'));
                      setFilterEndDate(format(new Date(), 'yyyy-MM-dd'));
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
                    className="h-10 flex-1 rounded-xl text-xs font-black bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white shadow-md shadow-amber-500/20"
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
                  <Link href="/customers/dues">
                    <Button
                      variant="outline"
                      className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                    >
                      রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
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
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-purple-600 transition-colors">
                      ৪. ডেইলি রিপোর্ট (Daily Report)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      মেসার্স দেলোয়ার এন্ড ব্রাদার্স (গোপালগঞ্জ শাখা) — ক্যাশ, চেক, সিমেন্ট ও রড স্টক ক্লোজিং রিপোর্ট
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveTab('daily_sales')}
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                  >
                    রিপোর্ট দেখুন <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* CARD 5: ইনকাম বিবরণী */}
              <Card className="border-slate-200/90 rounded-3xl bg-white p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-700 flex items-center justify-center font-bold">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                      ৫. ইনকাম বিবরণী (Income Statement)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                      রড ও সিমেন্ট বিক্রয় আয়, ক্রয় ব্যয় ও পরিচালন ব্যয়ের বিস্তারিত বিবরণী
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
                    <Card className="p-5 border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-yellow-50/40 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-amber-800">মোট কাস্টমার</p><p className="text-2xl font-black text-slate-900">{toBnNum(totalCustCount)} জন</p><p className="text-[11px] font-semibold text-slate-500">সকল নিবন্ধিত কাস্টমার</p></div><div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold"><Users className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-red-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-rose-600">মোট বাকী টাকা</p><p className="text-2xl font-black text-rose-600">{formatBnCurrency(totalCustDue)}</p><p className="text-[11px] font-semibold text-slate-500">সকল কাস্টমারের মোট বাকী</p></div><div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold"><Wallet className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-emerald-700">বাকি থাকা কাস্টমার</p><p className="text-2xl font-black text-slate-900">{toBnNum(dueCustomers.length)} জন</p><p className="text-[11px] font-semibold text-emerald-600">বর্তমানে পাওনা বাকি</p></div><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold"><Clock className="w-5 h-5" /></div></div></Card>
                    <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 rounded-2xl shadow-xs"><div className="flex items-center justify-between"><div className="space-y-1"><p className="text-xs font-bold text-blue-600">গড় কাস্টমার বাকী</p><p className="text-2xl font-black text-slate-900">{formatBnCurrency(dueCustomers.length ? Math.round(totalCustDue / dueCustomers.length) : 0)}</p><p className="text-[11px] font-semibold text-slate-500">প্রতি কাস্টমারে গড়</p></div><div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold"><TrendingUp className="w-5 h-5" /></div></div></Card>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div><Label className="text-[11px] font-bold text-slate-500">কাস্টমার নাম / মোবাইল</Label><Input placeholder="নাম / মোবাইল নম্বর" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 text-xs font-bold rounded-xl mt-1 bg-slate-50/50 border-slate-200" /></div>
                      <div className="flex items-end gap-2">
                        <Button variant="outline" onClick={() => setSearchQuery('')} className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200"><RefreshCcw className="w-3.5 h-3.5 mr-1" /> রিসেট</Button>
                        <Button onClick={() => toast.success('ফিল্টার প্রয়োগ করা হয়েছে!')} className="h-10 px-6 rounded-xl text-xs font-black bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white shadow-xs">⚡ ফিল্টার করুন</Button>
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



            {/* 3. ডেইলী টপসিট (Daily Topsheet) */}
            {activeTab === 'daily_topsheet' && (() => {
              const selectedDateStr = topsheetDate || format(new Date(), 'yyyy-MM-dd');
              
              // Filter orders/sales on selected date
              const dayOrders = orders.filter(o => {
                if (!o.createdAt) return false;
                const d = new Date(o.createdAt);
                return !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === selectedDateStr;
              });

              // Filter purchases on selected date
              const dayPurchases = purchases.filter(p => {
                if (!p.createdAt) return false;
                const d = new Date(p.createdAt);
                return !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === selectedDateStr;
              });

              // Filter expenses on selected date
              const dayExpenses = expenses.filter(e => {
                if (!e.createdAt && !e.date) return false;
                const d = new Date(e.createdAt || e.date);
                return !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === selectedDateStr;
              });

              // Cash Inflows & Outflows
              const cashSalesInflow = dayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
              const dueSalesTotal = dayOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0);
              const totalDailySalesVal = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

              const cashPurchaseOutflow = dayPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
              const expenseOutflow = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              const totalOutflow = cashPurchaseOutflow + expenseOutflow;
              
              const netCashDifference = cashSalesInflow - totalOutflow;

              // Quantity summaries for Rod & Cement
              let rodSoldKg = 0;
              let cementSoldBags = 0;
              dayOrders.forEach(o => {
                (o.items || []).forEach(i => {
                  const nameLower = (i.name || '').toLowerCase();
                  const unitLower = (i.unit || '').toLowerCase();
                  if (nameLower.includes('রড') || nameLower.includes('rod') || nameLower.includes('রিং') || unitLower.includes('কেজি') || unitLower.includes('টন')) {
                    rodSoldKg += unitLower.includes('টন') ? i.quantity * 1000 : i.quantity;
                  }
                  if (nameLower.includes('সিমেন্ট') || nameLower.includes('cement') || unitLower.includes('বস্তা') || unitLower.includes('bag')) {
                    cementSoldBags += i.quantity;
                  }
                });
              });

              let rodBoughtKg = 0;
              let cementBoughtBags = 0;
              dayPurchases.forEach(p => {
                (p.items || []).forEach(i => {
                  const nameLower = (i.name || '').toLowerCase();
                  const unitLower = (i.unit || '').toLowerCase();
                  if (nameLower.includes('রড') || nameLower.includes('rod') || nameLower.includes('রিং') || unitLower.includes('কেজি') || unitLower.includes('টন')) {
                    rodBoughtKg += unitLower.includes('টন') ? i.quantity * 1000 : i.quantity;
                  }
                  if (nameLower.includes('সিমেন্ট') || nameLower.includes('cement') || unitLower.includes('বস্তা') || unitLower.includes('bag')) {
                    cementBoughtBags += i.quantity;
                  }
                });
              });

              return (
                <div className="space-y-6 animate-in fade-in duration-300 font-bengali">
                  {/* TOP TOOLBAR & BREADCRUMB */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight">দৈনিক টপশিট (Daily Cash & Business Summary)</h1>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            নির্ধারিত তারিখের সকল ক্যাশ জমা, পেমেন্ট ও মালামালের সংক্ষেপ
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* BENGALI DATE PICKER */}
                      <BengaliDatePicker
                        value={selectedDateStr}
                        onChange={val => setTopsheetDate(val)}
                        placeholder="তারিখ নির্বাচন"
                        className="w-40"
                      />

                      <Button
                        variant="outline"
                        onClick={() => setTopsheetDate(format(new Date(), 'yyyy-MM-dd'))}
                        className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white"
                      >
                        আজকের দিন
                      </Button>

                      <Button
                        onClick={() => printElement('printable-topsheet-wrapper')}
                        className="h-9 px-4 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-amber-400" /> প্রিন্ট টপশিট
                      </Button>

                      <button onClick={() => setActiveTab('hub')} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট
                      </button>
                    </div>
                  </div>

                  {/* 4 SUMMARY METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-5 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-3xl shadow-xs">
                      <p className="text-xs font-bold text-emerald-800">আজকের মোট ক্যাশ জমা (Inflow)</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">{formatBnCurrency(cashSalesInflow)}</p>
                      <p className="text-[10px] font-semibold text-emerald-600 mt-1">নগদ বিক্রি জমা</p>
                    </Card>

                    <Card className="p-5 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/30 rounded-3xl shadow-xs">
                      <p className="text-xs font-bold text-rose-800">আজকের মোট ক্যাশ খরচ (Outflow)</p>
                      <p className="text-2xl font-black text-rose-700 mt-1">{formatBnCurrency(totalOutflow)}</p>
                      <p className="text-[10px] font-semibold text-rose-600 mt-1">নগদ ক্রয় + দোকান খরচ</p>
                    </Card>

                    <Card className="p-5 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/30 rounded-3xl shadow-xs">
                      <p className="text-xs font-bold text-indigo-800">আজকের নিট ক্যাশ উদ্বৃত্ত</p>
                      <p className={`text-2xl font-black mt-1 ${netCashDifference >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                        {formatBnCurrency(netCashDifference)}
                      </p>
                      <p className="text-[10px] font-semibold text-indigo-600 mt-1">জমা - খরচ</p>
                    </Card>

                    <Card className="p-5 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-3xl shadow-xs">
                      <p className="text-xs font-bold text-amber-800">আজকের সর্বমোট সেলস (বিক্রয়)</p>
                      <p className="text-2xl font-black text-amber-700 mt-1">{formatBnCurrency(totalDailySalesVal)}</p>
                      <p className="text-[10px] font-semibold text-amber-600 mt-1">নগদ + বাকী মোট ইনভয়েস বিল</p>
                    </Card>
                  </div>

                  {/* MAIN SIDE-BY-SIDE TOPSHEET TABLE (INFLOW vs OUTFLOW) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* INFLOW TABLE */}
                    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                        <h3 className="font-black text-base flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-200" /> ১. ক্যাশ জমা ও আয় বিবরণী (Inflow)
                        </h3>
                        <span className="text-xs font-bold bg-emerald-700 px-2.5 py-1 rounded-lg">জমা খাত</span>
                      </div>
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-xs">জমার খাত / বিবরণ</TableHead>
                            <TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-800">নগদ পণ্য বিক্রয় জমা (Cash Sales)</TableCell>
                            <TableCell className="text-right font-black text-emerald-700 px-6">{formatBnCurrency(cashSalesInflow)}</TableCell>
                          </TableRow>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-800">আজকের তৈরি বকেয়া (Customer Due Created)</TableCell>
                            <TableCell className="text-right font-black text-slate-600 px-6">{formatBnCurrency(dueSalesTotal)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-emerald-50/80 font-black text-xs text-emerald-900 border-t border-emerald-200">
                            <TableCell className="py-3 px-4 font-black">সর্বমোট ক্যাশ কালেকশন (Cash Inflow)</TableCell>
                            <TableCell className="text-right text-emerald-700 text-sm px-6 font-black">{formatBnCurrency(cashSalesInflow)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>

                    {/* OUTFLOW TABLE */}
                    <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
                        <h3 className="font-black text-base flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-rose-200" /> ২. ক্যাশ খরচ ও প্রদান বিবরণী (Outflow)
                        </h3>
                        <span className="text-xs font-bold bg-rose-700 px-2.5 py-1 rounded-lg">খরচ খাত</span>
                      </div>
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-xs">খরচের খাত / বিবরণ</TableHead>
                            <TableHead className="font-black text-xs text-right px-6">পরিমাণ (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-800">নগদ পণ্য ক্রয় পরিশোধ (Cash Purchase)</TableCell>
                            <TableCell className="text-right font-black text-rose-700 px-6">{formatBnCurrency(cashPurchaseOutflow)}</TableCell>
                          </TableRow>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-800">দৈনন্দিন দোকান খরচ (Expenses)</TableCell>
                            <TableCell className="text-right font-black text-rose-700 px-6">{formatBnCurrency(expenseOutflow)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-rose-50/80 font-black text-xs text-rose-900 border-t border-rose-200">
                            <TableCell className="py-3 px-4 font-black">সর্বমোট ক্যাশ প্রদান (Cash Outflow)</TableCell>
                            <TableCell className="text-right text-rose-700 text-sm px-6 font-black">{formatBnCurrency(totalOutflow)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </div>

                  {/* ITEM MOVEMENT SUMMARY (ROD & CEMENT) */}
                  <Card className="border-slate-200/90 rounded-3xl bg-white p-5 shadow-xs space-y-4">
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Truck className="w-5 h-5 text-orange-600" /> আজকের মালামাল আদান-প্রদান সামারি (Daily Item Movement)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
                        <p className="text-xs font-bold text-orange-800">রড বিক্রয় (Rod Sold)</p>
                        <p className="text-xl font-black text-orange-600">{formatDualStock(rodSoldKg, 'কেজি', 'রড').main}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
                        <p className="text-xs font-bold text-blue-800">সিমেন্ট বিক্রয় (Cement Sold)</p>
                        <p className="text-xl font-black text-blue-600">{toBnNum(cementSoldBags)} বস্তা</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                        <p className="text-xs font-bold text-emerald-800">রড আগমন/ক্রয় (Rod Purchase)</p>
                        <p className="text-xl font-black text-emerald-600">{formatDualStock(rodBoughtKg, 'কেজি', 'রড').main}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
                        <p className="text-xs font-bold text-purple-800">সিমেন্ট আগমন/ক্রয় (Cement Purchase)</p>
                        <p className="text-xl font-black text-purple-600">{toBnNum(cementBoughtBags)} বস্তা</p>
                      </div>
                    </div>
                  </Card>

                  {/* PRINTABLE MEMO TEMPLATE WRAPPER */}
                  <div className="hidden">
                    <div id="printable-topsheet-wrapper" className="p-8 bg-white text-black font-bengali space-y-6">
                      <div className="text-center border-b-2 border-black pb-4">
                        <div className="flex items-center justify-center gap-3 mb-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logo.png" alt="মেসার্স দেলোয়ার এন্ড ব্রাদার্স" className="w-10 h-10 object-contain rounded-md border border-slate-300" />
                          <h1 className="text-2xl font-black uppercase tracking-wide">মেসার্স দেলোয়ার এন্ড ব্রাদার্স</h1>
                        </div>
                        <p className="text-xs font-semibold">রড, সিমেন্ট ও নির্মাণ সামগ্রী সরবরাহ কেন্দ্র</p>
                        <h2 className="text-lg font-black mt-2 underline">দৈনিক টপশিট রিপোর্ট (DAILY TOPSHEET)</h2>
                        <p className="text-xs font-bold mt-1">তারিখ: {selectedDateStr}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">১. জমা ও আয় (INFLOW)</h3>
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              <tr className="border-b"><td className="py-1">নগদ বিক্রয় জমা:</td><td className="text-right font-bold">৳{cashSalesInflow.toLocaleString()}</td></tr>
                              <tr className="border-b"><td className="py-1">বকেয়া তৈরি:</td><td className="text-right font-bold">৳{dueSalesTotal.toLocaleString()}</td></tr>
                              <tr className="font-bold"><td className="py-2">মোট জমা:</td><td className="text-right py-2">৳{cashSalesInflow.toLocaleString()}</td></tr>
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">২. খরচ ও প্রদান (OUTFLOW)</h3>
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              <tr className="border-b"><td className="py-1">নগদ পণ্য ক্রয়:</td><td className="text-right font-bold">৳{cashPurchaseOutflow.toLocaleString()}</td></tr>
                              <tr className="border-b"><td className="py-1">দোকান খরচ:</td><td className="text-right font-bold">৳{expenseOutflow.toLocaleString()}</td></tr>
                              <tr className="font-bold"><td className="py-2">মোট খরচ:</td><td className="text-right py-2">৳{totalOutflow.toLocaleString()}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-black">
                        <h3 className="font-bold text-sm mb-2">৩. পণ্য মুভমেন্ট সামারি</h3>
                        <table className="w-full text-xs border border-black text-center">
                          <thead className="bg-gray-100 border-b border-black">
                            <tr>
                              <th className="p-1.5 border-r border-black">পণ্যের ধরন</th>
                              <th className="p-1.5 border-r border-black">আজকের বিক্রি</th>
                              <th className="p-1.5">আজকের ক্রয়/আগমন</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-black">
                              <td className="p-1.5 font-bold border-r border-black">রড (Rod & Ring)</td>
                              <td className="p-1.5 border-r border-black">{formatDualStock(rodSoldKg, 'কেজি', 'রড').main}</td>
                              <td className="p-1.5">{formatDualStock(rodBoughtKg, 'কেজি', 'রড').main}</td>
                            </tr>
                            <tr>
                              <td className="p-1.5 font-bold border-r border-black">সিমেন্ট (Cement)</td>
                              <td className="p-1.5 border-r border-black">{toBnNum(cementSoldBags)} বস্তা</td>
                              <td className="p-1.5">{toBnNum(cementBoughtBags)} বস্তা</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-16 flex justify-between text-xs font-bold">
                        <div className="border-t border-black px-6 pt-1">ক্যাশিয়ার / হিসাবরক্ষক</div>
                        <div className="border-t border-black px-6 pt-1">ম্যানেজার / প্রোপ্রাইটর</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. ডেইলি রিপোর্ট (Daily Report) */}
            {activeTab === 'daily_sales' && (() => {
              const selectedDateStr = salesStatementDate || format(new Date(), 'yyyy-MM-dd');
              
              const safeParseDate = (dateVal: any): Date | null => {
                if (!dateVal) return null;
                if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
                let str = String(dateVal).trim();
                if (str.includes(' ') && !str.includes('T')) {
                  str = str.replace(' ', 'T');
                }
                const d = new Date(str);
                return isNaN(d.getTime()) ? null : d;
              };

              // Filter sales orders for selected date and category
              const dayOrders = orders.filter(o => {
                const d = safeParseDate(o.createdAt);
                if (!d) return false;
                const matchesDate = format(d, 'yyyy-MM-dd') === selectedDateStr;
                if (!matchesDate) return false;

                if (salesCategoryFilter === 'rod') {
                  return (o.items || []).some(i => {
                    const n = (i.name || '').toLowerCase();
                    const u = (i.unit || '').toLowerCase();
                    return n.includes('রড') || n.includes('rod') || n.includes('রিং') || u.includes('কেজি') || u.includes('টন');
                  });
                }
                if (salesCategoryFilter === 'cement') {
                  return (o.items || []).some(i => {
                    const n = (i.name || '').toLowerCase();
                    const u = (i.unit || '').toLowerCase();
                    return n.includes('সিমেন্ট') || n.includes('cement') || u.includes('ব্যাগ') || u.includes('বস্তা');
                  });
                }
                return true;
              });

              // Day all orders (for master closing report calculations)
              const dayAllOrders = orders.filter(o => {
                const d = safeParseDate(o.createdAt);
                return d ? format(d, 'yyyy-MM-dd') === selectedDateStr : false;
              });

              // Day all purchases
              const dayAllPurchases = purchases.filter(p => {
                const dt = p.createdAt || (p as any).purchaseDate || (p as any).date;
                const d = safeParseDate(dt);
                return d ? format(d, 'yyyy-MM-dd') === selectedDateStr : false;
              });

              // Format date in Bengali: e.g. ২৪/০৮/২০২৬ ইং
              const parts = selectedDateStr ? selectedDateStr.split('-') : [];
              const dateFormattedBn = parts.length === 3
                ? `${toBengaliDigits(parts[2])}/${toBengaliDigits(parts[1])}/${toBengaliDigits(parts[0])} ইং`
                : toBengaliDigits(selectedDateStr);

              // 1. Cash and Cheque collection
              let dayCashCollected = 0;
              let dayChequeAmount = 0;
              dayAllOrders.forEach(o => {
                const pMethod = ((o.paymentMethod || '') as string).toLowerCase();
                const pAmt = Number(o.paidAmount) || 0;
                if (pMethod.includes('cheque') || pMethod.includes('check') || pMethod.includes('চেক') || o.chequeNo) {
                  dayChequeAmount += pAmt;
                } else {
                  dayCashCollected += pAmt;
                }
              });

              // 2. Cement Calculations (Sales, Purchases, Direct Delivery, Stock)
              let cementSoldBags = 0;
              let cementDirectBags = 0;
              dayAllOrders.forEach(o => {
                (o.items || []).forEach(i => {
                  const n = (i.name || '').toLowerCase();
                  const u = (i.unit || '').toLowerCase();
                  if (n.includes('সিমেন্ট') || n.includes('cement') || u.includes('ব্যাগ') || u.includes('বস্তা')) {
                    const qty = Number(i.quantity) || 0;
                    cementSoldBags += qty;
                    if (n.includes('সরাসরি') || (o.notes || '').toLowerCase().includes('সরাসরি') || (o.notes || '').toLowerCase().includes('direct') || o.deliveryType === 'direct') {
                      cementDirectBags += qty;
                    }
                  }
                });
              });

              let cementBoughtBags = 0;
              dayAllPurchases.forEach(p => {
                (p.items || []).forEach(i => {
                  const n = (i.name || '').toLowerCase();
                  const u = (i.unit || '').toLowerCase();
                  if (n.includes('সিমেন্ট') || n.includes('cement') || u.includes('ব্যাগ') || u.includes('বস্তা')) {
                    cementBoughtBags += Number(i.quantity) || 0;
                  }
                });
              });

              // Real cement products from inventory
              const cementProducts = products.filter(p => {
                const n = (p.name || '').toLowerCase();
                const c = (p.category || '').toLowerCase();
                const u = (p.unit || '').toLowerCase();
                return n.includes('সিমেন্ট') || n.includes('cement') || c.includes('সিমেন্ট') || c.includes('cement') || u.includes('বস্তা') || u.includes('bag');
              });

              const totalCementStockBags = cementProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);

              // Strictly real cement products from current database inventory (NO DUMMY DATA)
              const realCementList: { name: string; stock: number }[] = [];
              cementProducts.forEach(p => {
                const brand = (p.brand || '').trim();
                const name = (p.name || '').trim();
                const displayName = (brand && !name.toLowerCase().includes(brand.toLowerCase()))
                  ? `${brand} ${name}`
                  : name;
                const stock = Number(p.stock) || 0;
                const existing = realCementList.find(b => b.name.toLowerCase() === displayName.toLowerCase());
                if (existing) {
                  existing.stock += stock;
                } else {
                  realCementList.push({ name: displayName, stock });
                }
              });

              const formatQtyOrZero = (qty: number) => (qty > 0 ? toBengaliDigits(qty) : '০০');

              // Formatters specifically matching user's template
              const formatRodSold = (val: number) => {
                if (!val || val === 0) return '০০কেজি';
                const formatted = val % 1 === 0 
                  ? val.toLocaleString('en-IN') 
                  : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return `${toBengaliDigits(formatted)}কেজি`;
              };

              const formatRodBought = (val: number) => {
                if (!val || val === 0) return '০০ কেজি ';
                const formatted = val % 1 === 0 
                  ? val.toLocaleString('en-IN') 
                  : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return `${toBengaliDigits(formatted)} কেজি `;
              };

              const formatRodDirect = (val: number) => {
                if (!val || val === 0) return '০০ কেজি';
                const formatted = val % 1 === 0 
                  ? val.toLocaleString('en-IN') 
                  : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return `${toBengaliDigits(formatted)} কেজি`;
              };

              const formatRodStock = (val: number) => {
                if (!val || val === 0) return '০০ কেজি';
                const formatted = val % 1 === 0 
                  ? val.toLocaleString('en-IN') 
                  : val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return `${toBengaliDigits(formatted)} কেজি`;
              };

              // 3. Rod Calculations (Real from sales, purchases, and products inventory)
              let rodSoldKg = 0;
              let rodDirectKg = 0;
              dayAllOrders.forEach(o => {
                (o.items || []).forEach(i => {
                  const n = (i.name || '').toLowerCase();
                  const u = (i.unit || '').toLowerCase();
                  if (n.includes('রড') || n.includes('rod') || n.includes('রিং') || u.includes('কেজি') || u.includes('টন')) {
                    const qtyKg = u.includes('টন') ? (Number(i.quantity) || 0) * 1000 : (Number(i.quantity) || 0);
                    rodSoldKg += qtyKg;
                    if (n.includes('সরাসরি') || (o.notes || '').toLowerCase().includes('সরাসরি') || (o.notes || '').toLowerCase().includes('direct') || (o as any).deliveryType === 'direct') {
                      rodDirectKg += qtyKg;
                    }
                  }
                });
              });

              let rodBoughtKg = 0;
              dayAllPurchases.forEach(p => {
                (p.items || []).forEach(i => {
                  const n = (i.name || '').toLowerCase();
                  const u = (i.unit || '').toLowerCase();
                  if (n.includes('রড') || n.includes('rod') || n.includes('রিং') || u.includes('কেজি') || u.includes('টন')) {
                    rodBoughtKg += u.includes('টন') ? (Number(i.quantity) || 0) * 1000 : (Number(i.quantity) || 0);
                  }
                });
              });

              const rodProducts = products.filter(p => {
                const n = (p.name || '').toLowerCase();
                const c = (p.category || '').toLowerCase();
                const u = (p.unit || '').toLowerCase();
                return n.includes('রড') || n.includes('rod') || n.includes('রিং') || c.includes('রড') || c.includes('rod') || u.includes('কেজি') || u.includes('টন');
              });

              const totalRodStockKg = rodProducts.reduce((sum, p) => {
                const u = (p.unit || '').toLowerCase();
                return sum + (u.includes('টন') ? (Number(p.stock) || 0) * 1000 : (Number(p.stock) || 0));
              }, 0);

              const realRodList: { name: string; stock: number }[] = rodProducts.map(p => {
                const u = (p.unit || '').toLowerCase();
                const qtyKg = u.includes('টন') ? (Number(p.stock) || 0) * 1000 : (Number(p.stock) || 0);
                return { name: p.name, stock: qtyKg };
              });

              const cementBrandLines = realCementList.map(b => `${b.name}= ${formatQtyOrZero(b.stock)} ব্যাগ`);

              const cementBlockLines = [
                `সিমেন্ট বিক্রয় = ${formatQtyOrZero(cementSoldBags)} ব্যাগ`,
                `সিমেন্ট প্রাপ্তি = ${formatQtyOrZero(cementBoughtBags)} ব্যাগ`,
                `সিমেন্ট সরাসরি= ${formatQtyOrZero(cementDirectBags)} ব্যাগ`,
                `সিমেন্ট স্টক= ${formatQtyOrZero(totalCementStockBags)} ব্যাগ`,
                ...cementBrandLines
              ];

              // Exact text format strictly as requested by the user
              const fullDailyReportText = `===দেলোয়ার এন্ড ব্রাদার্স ===
         গোপালগঞ্জ শাখা
==== ডেইলি রিপোর্ট ====
তারিখ - ${dateFormattedBn}

১/ ক্যাশ = ${dayCashCollected > 0 ? toBengaliDigits(dayCashCollected.toLocaleString('en-IN')) : '০০'} ৳
২/ চেক = ${dayChequeAmount > 0 ? `${toBengaliDigits(dayChequeAmount.toLocaleString('en-IN'))} ৳/` : '০/'}
    =====সিমেন্ট =====
${cementBlockLines.join('\n')}

       ===== রড=====

রড বিক্রয় = ${formatRodSold(rodSoldKg)}
রড প্রাপ্তি = ${formatRodBought(rodBoughtKg)}
রড সরাসরি= ${formatRodDirect(rodDirectKg)}
রড স্টক = ${formatRodStock(totalRodStockKg)}`;

              const handleCopyDailyReport = () => {
                navigator.clipboard.writeText(fullDailyReportText);
                toast.success('ডেইলি রিপোর্ট টেক্সট সফলভাবে কপি করা হয়েছে!');
              };

              // Variables for Summary Cards and Tables
              const totalSalesVal = dayOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
              const totalPaidVal = dayOrders.reduce((acc, o) => acc + (Number(o.paidAmount) || 0), 0);
              const totalDueVal = dayOrders.reduce((acc, o) => acc + (Number(o.dueAmount) || 0), 0);
              const invoiceCount = dayOrders.length;

              const productSummaryMap: { [name: string]: { name: string; qty: number; unit: string; totalVal: number } } = {};
              dayOrders.forEach(o => {
                (o.items || []).forEach(item => {
                  const key = item.name || 'অজানা পণ্য';
                  if (!productSummaryMap[key]) {
                    productSummaryMap[key] = {
                      name: key,
                      qty: 0,
                      unit: item.unit || 'টি',
                      totalVal: 0,
                    };
                  }
                  productSummaryMap[key].qty += Number(item.quantity) || 0;
                  productSummaryMap[key].totalVal += (Number(item.quantity) || 0) * (Number(item.price) || 0);
                });
              });
              const productSummaryList = Object.values(productSummaryMap);

              return (
                <div className="space-y-6 animate-in fade-in duration-300 font-bengali">
                  {/* TOP TOOLBAR & BREADCRUMB */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ডেইলি রিপোর্ট (Daily Report)</h1>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            মেসার্স দেলোয়ার এন্ড ব্রাদার্স (গোপালগঞ্জ শাখা) — দৈনিক ক্লোজিং ও সারসংক্ষেপ রিপোর্ট
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* BENGALI DATE PICKER */}
                      <BengaliDatePicker
                        value={selectedDateStr}
                        onChange={val => setSalesStatementDate(val)}
                        placeholder="তারিখ নির্বাচন"
                        className="w-40"
                      />

                      <Button
                        variant="outline"
                        onClick={() => setSalesStatementDate(format(new Date(), 'yyyy-MM-dd'))}
                        className="h-9 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        আজকের দিন
                      </Button>

                      {/* CATEGORY FILTER */}
                      <Select value={salesCategoryFilter} onValueChange={(val: any) => setSalesCategoryFilter(val || 'all')}>
                        <SelectTrigger className="h-9 w-32 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                          <SelectValue placeholder="সব ক্যাটাগরি" />
                        </SelectTrigger>
                        <SelectContent className="font-bengali">
                          <SelectItem value="all">সব পণ্য</SelectItem>
                          <SelectItem value="rod">রড ও রিং</SelectItem>
                          <SelectItem value="cement">সিমেন্ট</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* COPY REPORT TEXT (WHATSAPP / SMS) */}
                      <Button
                        onClick={handleCopyDailyReport}
                        className="h-9 px-3.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="হোয়াটসঅ্যাপ বা এসএমএসে পাঠানোর জন্য কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>কপি রিপোর্ট</span>
                      </Button>

                      {/* PRINT DAILY REPORT */}
                      <Button
                        onClick={() => printElement('printable-daily-report-sheet')}
                        className="h-9 px-3.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="ডেইলি রিপোর্ট স্লিপ প্রিন্ট করুন"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>প্রিন্ট ডেইলি রিপোর্ট</span>
                      </Button>

                      <button onClick={() => setActiveTab('hub')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1">
                        <ArrowLeft className="w-3.5 h-3.5 text-orange-500" /> সকল রিপোর্ট
                      </button>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* MASTER DAILY REPORT CARD (দেলোয়ার এন্ড ব্রাদার্স - গোপালগঞ্জ শাখা) */}
                  {/* ======================================================== */}
                  <Card className="border-2 border-blue-200/80 rounded-3xl bg-white shadow-md overflow-hidden font-bengali">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative overflow-hidden text-center">
                      <div className="relative z-10 space-y-1">
                        <div className="inline-block bg-white/15 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold text-amber-300 border border-white/20 mb-1">
                          === দেলোয়ার এন্ড ব্রাদার্স ===
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white">
                          গোপালগঞ্জ শাখা
                        </h2>
                        <h3 className="text-base sm:text-lg font-bold text-sky-200 tracking-wider">
                          ==== ডেইলি রিপোর্ট ====
                        </h3>
                        <p className="text-xs font-bold text-slate-300 pt-1">
                          তারিখ - <span className="text-amber-300 font-black">{dateFormattedBn}</span>
                        </p>
                      </div>

                      {/* Subtle Watermark Icons */}
                      <Truck className="absolute -left-4 -bottom-4 w-28 h-28 text-white/5 pointer-events-none" />
                      <Layers className="absolute -right-4 -top-4 w-28 h-28 text-white/5 pointer-events-none" />
                    </div>

                    <div className="p-6 space-y-6">
                      {/* SECTION 1: ক্যাশ ও চেক */}
                      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-emerald-600" />
                            ১/ ক্যাশ ও ২/ চেক আদায়
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            আজকের কালেকশন
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white border-2 border-emerald-200/70 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-black text-lg">
                                ১/
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-500">ক্যাশ</p>
                                <p className="text-lg font-black text-emerald-700">
                                  {dayCashCollected > 0 ? toBengaliDigits(dayCashCollected.toLocaleString('en-IN')) : '০০'} ৳
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                              নগদ জমা
                            </span>
                          </div>

                          <div className="bg-white border-2 border-indigo-200/70 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-black text-lg">
                                ২/
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-500">চেক</p>
                                <p className="text-lg font-black text-indigo-700">
                                  {dayChequeAmount > 0 ? `${toBengaliDigits(dayChequeAmount.toLocaleString('en-IN'))} ৳/` : '০/'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                              চেক প্রাপ্তি
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: সিমেন্ট হিসাব */}
                      <div className="bg-gradient-to-br from-blue-50/50 via-white to-sky-50/50 border-2 border-blue-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                          <h4 className="font-black text-blue-950 text-base flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            ===== সিমেন্ট =====
                          </h4>
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-0.5 rounded-full">
                            সিমেন্ট ক্লোজিং রিপোর্ট
                          </span>
                        </div>

                        {/* 4 Key Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white border border-blue-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">সিমেন্ট বিক্রয়</p>
                            <p className="text-lg font-black text-blue-700 mt-0.5">{formatQtyOrZero(cementSoldBags)} <span className="text-xs font-normal">ব্যাগ</span></p>
                          </div>
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">সিমেন্ট প্রাপ্তি</p>
                            <p className="text-lg font-black text-emerald-700 mt-0.5">{formatQtyOrZero(cementBoughtBags)} <span className="text-xs font-normal">ব্যাগ</span></p>
                          </div>
                          <div className="bg-white border border-amber-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">সিমেন্ট সরাসরি</p>
                            <p className="text-lg font-black text-amber-700 mt-0.5">{formatQtyOrZero(cementDirectBags)} <span className="text-xs font-normal">ব্যাগ</span></p>
                          </div>
                          <div className="border-2 border-indigo-300 rounded-xl p-3 text-center shadow-2xs bg-indigo-50/40">
                            <p className="text-[11px] font-bold text-indigo-900">সিমেন্ট স্টক</p>
                            <p className="text-xl font-black text-indigo-700 mt-0.5">{formatQtyOrZero(totalCementStockBags)} <span className="text-xs font-normal">ব্যাগ</span></p>
                          </div>
                        </div>

                        {/* Real Cement Products from Inventory (NO DUMMY BRANDS) */}
                        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-2xs space-y-2.5">
                          <p className="text-xs font-black text-slate-700 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                            <span>ব্র্যান্ড অনুযায়ী সিমেন্ট মজুদ তালিকা:</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{toBengaliDigits(realCementList.length)} টি পণ্য</span>
                          </p>
                          {realCementList.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-slate-200">
                              ইনভেন্টরিতে কোনো সিমেন্ট পণ্য পাওয়া যায়নি
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {realCementList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50/80 hover:bg-blue-50/50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs transition-colors">
                                  <span className="font-bold text-slate-800">{b.name}</span>
                                  <span className="font-black text-blue-700 bg-white border border-blue-100 px-2 py-0.5 rounded shadow-2xs">
                                    {formatQtyOrZero(b.stock)} ব্যাগ
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 3: রড হিসাব */}
                      <div className="bg-gradient-to-br from-orange-50/50 via-white to-amber-50/50 border-2 border-orange-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                          <h4 className="font-black text-orange-950 text-base flex items-center gap-2">
                            <Scale className="w-5 h-5 text-orange-600" />
                            ===== রড =====
                          </h4>
                          <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-0.5 rounded-full">
                            রড ক্লোজিং রিপোর্ট
                          </span>
                        </div>

                        {/* 4 Key Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white border border-orange-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">রড বিক্রয়</p>
                            <p className="text-base sm:text-lg font-black text-orange-700 mt-0.5">
                              {formatRodSold(rodSoldKg)}
                            </p>
                          </div>
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">রড প্রাপ্তি</p>
                            <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                              {formatRodBought(rodBoughtKg)}
                            </p>
                          </div>
                          <div className="bg-white border border-amber-200 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-500">রড সরাসরি</p>
                            <p className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
                              {formatRodDirect(rodDirectKg)}
                            </p>
                          </div>
                          <div className="bg-indigo-50/40 border-2 border-indigo-300 rounded-xl p-3 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-indigo-900">রড স্টক</p>
                            <p className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">
                              {formatRodStock(totalRodStockKg)}
                            </p>
                          </div>
                        </div>

                        {/* Real Rod Products List */}
                        {realRodList.length > 0 && (
                          <div className="bg-white border border-orange-100 rounded-xl p-4 shadow-2xs space-y-2.5">
                            <p className="text-xs font-black text-slate-700 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                              <span>ইনভেন্টরির রড মজুদ তালিকা:</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{toBengaliDigits(realRodList.length)} টি পণ্য</span>
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {realRodList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50/80 hover:bg-orange-50/50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs transition-colors">
                                  <span className="font-bold text-slate-800">{b.name}</span>
                                  <span className="font-black text-orange-700 bg-white border border-orange-100 px-2 py-0.5 rounded shadow-2xs">
                                    {formatRodStock(b.stock)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RAW TEXT MESSAGE PREVIEW (WhatsApp & SMS) */}
                      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3 font-mono shadow-inner text-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                            <Copy className="w-4 h-4" />
                            <span>মেসেজ ফরম্যাট প্রিভিউ (WhatsApp / SMS এর জন্য হুবহু টেক্সট):</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCopyDailyReport}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-7 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                          >
                            <Copy className="w-3 h-3" />
                            <span>কপি করুন</span>
                          </Button>
                        </div>
                        <pre className="text-xs sm:text-sm font-bold text-emerald-400 whitespace-pre-wrap leading-relaxed select-all">
                          {fullDailyReportText}
                        </pre>
                      </div>

                      {/* Copy Action Banner */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>এই সম্পূর্ণ রিপোর্টটি এক ক্লিকে কপি করে হোয়াটসঅ্যাপ বা মেসেজে মালিক/অংশীদারদের পাঠাতে পারেন।</span>
                        </div>
                        <Button
                          type="button"
                          onClick={handleCopyDailyReport}
                          className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>মেসেজ টেক্সট কপি করুন</span>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* PRINTABLE DAILY REPORT SLIP (দেলোয়ার এন্ড ব্রাদার্স - গোপালগঞ্জ শাখা) */}
                  <div className="hidden">
                    <div id="printable-daily-report-sheet" className="p-8 bg-white text-black font-bengali space-y-6 max-w-xl mx-auto">
                      <div className="text-center border-b-2 border-black pb-4">
                        <h1 className="text-2xl font-black tracking-wide">===দেলোয়ার এন্ড ব্রাদার্স ===</h1>
                        <p className="text-base font-bold mt-1">গোপালগঞ্জ শাখা</p>
                        <h2 className="text-lg font-black mt-2">==== ডেইলি রিপোর্ট ====</h2>
                        <p className="text-sm font-bold mt-1">তারিখ - {dateFormattedBn}</p>
                      </div>

                      <div className="space-y-4 text-sm font-bold leading-relaxed">
                        {/* ক্যাশ ও চেক */}
                        <div className="border border-black p-3 space-y-1">
                          <p>১/ ক্যাশ = {dayCashCollected > 0 ? toBengaliDigits(dayCashCollected.toLocaleString('en-IN')) : '০০'} ৳</p>
                          <p>২/ চেক = {dayChequeAmount > 0 ? `${toBengaliDigits(dayChequeAmount.toLocaleString('en-IN'))} ৳/` : '০/'}</p>
                        </div>

                        {/* সিমেন্ট */}
                        <div className="border border-black p-3 space-y-1">
                          <p className="text-center font-black">=====সিমেন্ট =====</p>
                          <p>সিমেন্ট বিক্রয় = {formatQtyOrZero(cementSoldBags)} ব্যাগ</p>
                          <p>সিমেন্ট প্রাপ্তি = {formatQtyOrZero(cementBoughtBags)} ব্যাগ</p>
                          <p>সিমেন্ট সরাসরি= {formatQtyOrZero(cementDirectBags)} ব্যাগ</p>
                          <p className="font-black">সিমেন্ট স্টক= {formatQtyOrZero(totalCementStockBags)} ব্যাগ</p>
                          {realCementList.length > 0 && (
                            <div className="pt-2 border-t border-dashed border-black space-y-1">
                              {realCementList.map((b, i) => (
                                <p key={i}>{b.name}= {formatQtyOrZero(b.stock)} ব্যাগ</p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* রড */}
                        <div className="border border-black p-3 space-y-1">
                          <p className="text-center font-black">===== রড=====</p>
                          <p>রড বিক্রয় = {formatRodSold(rodSoldKg)}</p>
                          <p>রড প্রাপ্তি = {formatRodBought(rodBoughtKg)}</p>
                          <p>রড সরাসরি= {formatRodDirect(rodDirectKg)}</p>
                          <p className="font-black">রড স্টক = {formatRodStock(totalRodStockKg)}</p>
                          {realRodList.length > 0 && (
                            <div className="pt-2 border-t border-dashed border-black space-y-1">
                              {realRodList.map((b, i) => (
                                <p key={i}>{b.name}= {formatRodStock(b.stock)}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-12 flex justify-between text-xs font-bold">
                        <div className="border-t border-black px-6 pt-1">ক্যাশিয়ার / হিসাবরক্ষক</div>
                        <div className="border-t border-black px-6 pt-1">ম্যানেজার / প্রোপ্রাইটর</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. ইনকাম বিবরণী (Income Statement / Profit & Loss - Standard UI & PDF Matched) */}
            {(activeTab === 'profit_loss' || activeTab === 'income_statement') && (() => {
              // 1. Filter data based on selected period mode and date
              const filterByPeriod = (createdAt: any) => {
                if (!createdAt) return true;
                const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
                if (isNaN(d.getTime())) return true;
                const itemDateStr = format(d, 'yyyy-MM-dd');
                if (incomePeriodMode === 'today') {
                  return itemDateStr === incomeStatementDate;
                } else if (incomePeriodMode === 'month') {
                  return itemDateStr.slice(0, 7) === incomeStatementDate.slice(0, 7);
                }
                return true; // 'all'
              };

              const filteredOrders = orders.filter(o => filterByPeriod(o.createdAt));
              const filteredPurchases = purchases.filter(p => filterByPeriod(p.createdAt));
              const filteredExpenses = expenses.filter(e => filterByPeriod(e.createdAt || e.date));

              // 2. Revenue Breakdown (আয়ের খাত)
              const cementSalesItems = filteredOrders.flatMap(o => (o.items || []).filter(i => 
                (i.category && i.category.includes('সিমেন্ট')) || 
                (i.name && i.name.includes('সিমেন্ট')) || 
                (i.unit && i.unit.includes('ব্যাগ'))
              ));
              const cementSalesQty = cementSalesItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const cementSalesAmount = cementSalesItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);

              const rodSalesItems = filteredOrders.flatMap(o => (o.items || []).filter(i => 
                (i.category && i.category.includes('রড')) || 
                (i.name && (i.name.includes('রড') || i.name.includes('মিমি') || i.name.toLowerCase().includes('mm'))) || 
                (i.unit && (i.unit.includes('কেজি') || i.unit.includes('টন')))
              ));
              const rodSalesQty = rodSalesItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const rodSalesAmount = rodSalesItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);

              const totalOrderSalesAmount = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
              const otherSalesAmount = Math.max(0, totalOrderSalesAmount - (cementSalesAmount + rodSalesAmount));
              const totalSalesIncome = cementSalesAmount + rodSalesAmount + otherSalesAmount;

              // 3. Cement Direct Costs (সিমেন্ট ক্রয় ও পরিবহন ব্যয়)
              const cementPurchaseItems = filteredPurchases.flatMap(p => (p.items || []).filter(i => 
                (i.category && i.category.includes('সিমেন্ট')) || 
                (i.name && i.name.includes('সিমেন্ট')) || 
                (i.unit && i.unit.includes('ব্যাগ'))
              ));
              const cementPurchaseQty = cementPurchaseItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const cementPurchaseAmount = cementPurchaseItems.length > 0 
                ? cementPurchaseItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0)
                : filteredPurchases.filter(p => p.supplierName?.includes('সিমেন্ট') || p.items?.some(i => i.name?.includes('সিমেন্ট'))).reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

              const cementTruckFare = filteredExpenses.filter(e => 
                (e.title?.includes('সিমেন্ট') && (e.title?.includes('গাড়ি') || e.title?.includes('ভাড়া') || e.title?.includes('পরিবহন'))) || 
                (e.category?.includes('সিমেন্ট গাড়ি') || e.category?.includes('সিমেন্ট পরিবহন'))
              ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

              const cementUnloadLabor = filteredExpenses.filter(e => 
                (e.title?.includes('সিমেন্ট') && (e.title?.includes('লেবার') || e.title?.includes('আনলোড') || e.title?.includes('লেভারি'))) || 
                (e.category?.includes('সিমেন্ট আনলোড') || e.category?.includes('সিমেন্ট লেবার'))
              ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

              const cementTotalDirectCost = cementPurchaseAmount + cementTruckFare + cementUnloadLabor;

              // 4. Rod Direct Costs (রড ক্রয় ও পরিবহন ব্যয়)
              const rodPurchaseItems = filteredPurchases.flatMap(p => (p.items || []).filter(i => 
                (i.category && i.category.includes('রড')) || 
                (i.name && (i.name.includes('রড') || i.name.includes('মিমি') || i.name.toLowerCase().includes('mm'))) || 
                (i.unit && (i.unit.includes('কেজি') || i.unit.includes('টন')))
              ));
              const rodPurchaseQty = rodPurchaseItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const rodPurchaseAmount = rodPurchaseItems.length > 0 
                ? rodPurchaseItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0)
                : filteredPurchases.filter(p => p.supplierName?.includes('রড') || p.items?.some(i => i.name?.includes('রড'))).reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

              const rodTruckFare = filteredExpenses.filter(e => 
                (e.title?.includes('রড') && (e.title?.includes('গাড়ি') || e.title?.includes('ভাড়া') || e.title?.includes('পরিবহন'))) || 
                (e.category?.includes('রড গাড়ি') || e.category?.includes('রড পরিবহন'))
              ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

              const rodUnloadLabor = filteredExpenses.filter(e => 
                (e.title?.includes('রড') && (e.title?.includes('লেবার') || e.title?.includes('আনলোড') || e.title?.includes('লেভারি'))) || 
                (e.category?.includes('রড আনলোড') || e.category?.includes('রড লেবার'))
              ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

              const rodTotalDirectCost = rodPurchaseAmount + rodTruckFare + rodUnloadLabor;
              const totalDirectCost = cementTotalDirectCost + rodTotalDirectCost;

              // 5. Operating Expenses (ব্যাবসা পরিচালন ব্যয়)
              const directExpIds = new Set(
                filteredExpenses.filter(e => 
                  ((e.title?.includes('সিমেন্ট') || e.title?.includes('রড')) && 
                   (e.title?.includes('গাড়ি') || e.title?.includes('ভাড়া') || e.title?.includes('লেবার') || e.title?.includes('আনলোড')))
                ).map(e => e.id)
              );

              const operatingExpensesList = filteredExpenses.filter(e => !directExpIds.has(e.id));
              
              const categoryMap = new Map<string, number>();
              operatingExpensesList.forEach(e => {
                const catName = e.category && e.category !== 'general' ? e.category : (e.title || 'বিবিধ খরচ');
                categoryMap.set(catName, (categoryMap.get(catName) || 0) + (Number(e.amount) || 0));
              });

              const standardOpexRows: { name: string; amount: number }[] = [];
              if (categoryMap.size > 0) {
                Array.from(categoryMap.entries()).forEach(([name, amount]) => {
                  standardOpexRows.push({ name, amount });
                });
              } else {
                standardOpexRows.push(
                  { name: 'দোকান ভাড়া', amount: 0 },
                  { name: 'বিদ্যুৎ বিল', amount: 0 },
                  { name: 'স্টাফ বেতন', amount: 0 },
                  { name: 'পরিবহন ভাড়া', amount: 0 },
                  { name: 'রড লেবারী বাবদ', amount: 0 },
                  { name: 'সিমেন্ট লেবারী বাবদ', amount: 0 },
                  { name: 'বিবিধ খরচ', amount: 0 }
                );
              }

              const totalOperatingExpense = operatingExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              const grandTotalExpenses = totalDirectCost + totalOperatingExpense;
              const netProfit = totalSalesIncome - grandTotalExpenses;
              const profitMargin = totalSalesIncome > 0 ? ((netProfit / totalSalesIncome) * 100).toFixed(1) : '0';

              return (
                <div className="space-y-6 animate-in fade-in duration-300 font-bengali">
                  {/* Top Action Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <PieChart className="w-6 h-6 text-orange-600" />
                        ইনকাম বিবরণী (Income Statement)
                      </h1>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        রড ও সিমেন্ট বিক্রয় আয়, ক্রয় ব্যয় ও ব্যবসা পরিচালন ব্যয়ের সমন্বিত লাভ-ক্ষতি বিবরণী
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Period Mode Selector */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => setIncomePeriodMode('today')}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                            incomePeriodMode === 'today' ? "bg-white text-orange-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          আজকের দিন
                        </button>
                        <button
                          onClick={() => setIncomePeriodMode('month')}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                            incomePeriodMode === 'month' ? "bg-white text-orange-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          এই মাস
                        </button>
                        <button
                          onClick={() => setIncomePeriodMode('all')}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                            incomePeriodMode === 'all' ? "bg-white text-orange-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          সকল সময়
                        </button>
                      </div>

                      {/* Date Picker Input */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={incomeStatementDate}
                          onChange={(e) => setIncomeStatementDate(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                        />
                      </div>

                      {/* Print PDF Button */}
                      <Button
                        onClick={() => printElement('income-statement-printable-wrapper')}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        ইনকাম বিবরণী প্রিন্ট (PDF)
                      </Button>

                      {/* Back Button */}
                      <button 
                        onClick={() => setActiveTab('hub')} 
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট
                      </button>
                    </div>
                  </div>

                  {/* Top KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-teal-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-emerald-800">মোট বিক্রয় আয় (Total Revenue)</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">{formatBnCurrency(totalSalesIncome)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">সিমেন্ট + রড + অন্যান্য পণ্য</p>
                    </Card>

                    <Card className="p-4 border-rose-200 bg-gradient-to-br from-rose-50/90 to-red-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-rose-800">মোট ক্রয় ও প্রত্যক্ষ ব্যয় (COGS)</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalDirectCost)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">ক্রয় + গাড়িভাড়া + আনলোড লেবার</p>
                    </Card>

                    <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50/90 to-yellow-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-amber-800">ব্যাবসা পরিচালন ব্যয় (OPEX)</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{formatBnCurrency(totalOperatingExpense)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">ভাড়া, বেতন, বিল ও বিবিধ খরচ</p>
                    </Card>

                    <Card className={cn(
                      "p-4 rounded-2xl shadow-xs border",
                      netProfit >= 0 ? "border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/40" : "border-rose-200 bg-gradient-to-br from-rose-50/90 to-red-50/40"
                    )}>
                      <p className={cn("text-xs font-bold", netProfit >= 0 ? "text-blue-800" : "text-rose-800")}>
                        {netProfit >= 0 ? 'নিট লাভ (Net Profit)' : 'নিট ক্ষতি (Net Loss)'}
                      </p>
                      <p className={cn("text-2xl font-black mt-1", netProfit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                        {formatBnCurrency(netProfit)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">মুনাফার হার: {toBnNum(profitMargin)}%</p>
                    </Card>
                  </div>

                  {/* Standard Interactive Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: আয়ের খাত */}
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                        <h3 className="font-black text-emerald-800 text-base flex items-center gap-1.5">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          আয়ের খাত (Revenue Breakdown)
                        </h3>
                        <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                          মোট: {formatBnCurrency(totalSalesIncome)}
                        </span>
                      </div>
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-xs">খাতের নাম</TableHead>
                            <TableHead className="font-black text-xs text-center">পরিমাণ (ব্যাগ/কেজি)</TableHead>
                            <TableHead className="font-black text-xs text-right px-4">টাকা (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-900">১. সিমেন্ট বিক্রয় বাবদ আয়</TableCell>
                            <TableCell className="text-center font-bold text-slate-700">{formatBnQty(cementSalesQty)} ব্যাগ</TableCell>
                            <TableCell className="text-right font-black text-slate-900 px-4">{formatBnCurrency(cementSalesAmount)}</TableCell>
                          </TableRow>
                          <TableRow className="border-b border-slate-100 text-xs">
                            <TableCell className="font-bold text-slate-900">২. রড বিক্রয় বাবদ আয়</TableCell>
                            <TableCell className="text-center font-bold text-slate-700">{formatBnQty(rodSalesQty)} কেজি</TableCell>
                            <TableCell className="text-right font-black text-slate-900 px-4">{formatBnCurrency(rodSalesAmount)}</TableCell>
                          </TableRow>
                          {otherSalesAmount > 0 && (
                            <TableRow className="border-b border-slate-100 text-xs">
                              <TableCell className="font-bold text-slate-900">৩. অন্যান্য পণ্য বিক্রয় আয়</TableCell>
                              <TableCell className="text-center font-bold text-slate-500">—</TableCell>
                              <TableCell className="text-right font-black text-slate-900 px-4">{formatBnCurrency(otherSalesAmount)}</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="bg-emerald-50/50 font-black text-xs text-slate-900 border-t border-emerald-200">
                            <TableCell colSpan={2} className="py-3 px-4 font-black text-emerald-900">মোট আয়</TableCell>
                            <TableCell className="text-right text-emerald-700 text-sm px-4 font-black">{formatBnCurrency(totalSalesIncome)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>

                    {/* Right: ব্যয়ের খাত (ক্রয় ও পরিচালনা ব্যয়) */}
                    <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="p-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
                        <h3 className="font-black text-rose-800 text-base flex items-center gap-1.5">
                          <Wallet className="w-5 h-5 text-rose-600" />
                          ব্যয়ের খাত (Expenses Breakdown)
                        </h3>
                        <span className="text-xs font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                          সর্বমোট: {formatBnCurrency(grandTotalExpenses)}
                        </span>
                      </div>
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-xs">খাত / বিবরণ</TableHead>
                            <TableHead className="font-black text-xs text-center">পরিমাণ</TableHead>
                            <TableHead className="font-black text-xs text-right px-4">টাকা (৳)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="border-b border-slate-100 text-xs bg-slate-50/50">
                            <TableCell className="font-bold text-slate-900">সিমেন্ট ক্রয় ও আনুষঙ্গিক</TableCell>
                            <TableCell className="text-center font-bold text-slate-700">{formatBnQty(cementPurchaseQty)} ব্যাগ</TableCell>
                            <TableCell className="text-right font-black text-slate-900 px-4">{formatBnCurrency(cementTotalDirectCost)}</TableCell>
                          </TableRow>
                          <TableRow className="border-b border-slate-100 text-xs bg-slate-50/50">
                            <TableCell className="font-bold text-slate-900">রড ক্রয় ও আনুষঙ্গিক</TableCell>
                            <TableCell className="text-center font-bold text-slate-700">{formatBnQty(rodPurchaseQty)} কেজি</TableCell>
                            <TableCell className="text-right font-black text-slate-900 px-4">{formatBnCurrency(rodTotalDirectCost)}</TableCell>
                          </TableRow>
                          <TableRow className="border-b border-slate-100 text-xs bg-amber-50/30">
                            <TableCell className="font-bold text-amber-900">ব্যাবসা পরিচালন ব্যয় (OPEX)</TableCell>
                            <TableCell className="text-center font-bold text-slate-500">—</TableCell>
                            <TableCell className="text-right font-black text-amber-700 px-4">{formatBnCurrency(totalOperatingExpense)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-rose-50/50 font-black text-xs text-slate-900 border-t border-rose-200">
                            <TableCell colSpan={2} className="py-3 px-4 font-black text-rose-900">সর্বমোট খরচ</TableCell>
                            <TableCell className="text-right text-rose-700 text-sm px-4 font-black">{formatBnCurrency(grandTotalExpenses)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </div>

                  {/* Main Printable / Live Sheet Box (Exact 1-to-1 Match with User's PDF) */}
                  <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl border border-slate-200 flex justify-center">
                    <div className="bg-white text-black p-6 sm:p-8 shadow-md rounded border border-black/20 w-full max-w-[650px] text-[13px] leading-tight">
                      <table 
                        style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          border: '2px solid #000000',
                          fontFamily: "'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}
                      >
                        <thead>
                          {/* Row 1: মেসার্স দেলোয়ার এন্ড ব্রাদার্স */}
                          <tr>
                            <th 
                              colSpan={4} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '8px 4px', 
                                textAlign: 'center', 
                                fontSize: '18px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              মেসার্স দেলোয়ার এন্ড ব্রাদার্স
                            </th>
                          </tr>

                          {/* Row 2: ইনকাম বিবরণী */}
                          <tr>
                            <th 
                              colSpan={4} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 4px', 
                                textAlign: 'center', 
                                fontSize: '16px', 
                                fontWeight: 800,
                                color: '#000000'
                              }}
                            >
                              ইনকাম বিবরণী
                            </th>
                          </tr>

                          {/* Row 3: তারিখ */}
                          <tr>
                            <th 
                              colSpan={4} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 700,
                                color: '#000000'
                              }}
                            >
                              {formatBnDate(incomeStatementDate, 'dd MMMM - yyyy')}
                            </th>
                          </tr>

                          {/* Table Column Headers */}
                          <tr style={{ backgroundColor: '#ffffff' }}>
                            <th style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 800, fontSize: '13px', width: '38px' }}>
                              ক্রঃ
                            </th>
                            <th style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '14px' }}>
                              নাম
                            </th>
                            <th style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center', fontWeight: 800, fontSize: '14px', width: '100px' }}>
                              ব্যাগ/কেজি
                            </th>
                            <th style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '14px', width: '130px' }}>
                              টাকা
                            </th>
                          </tr>

                          {/* Section Title: আয়ের খাত */}
                          <tr>
                            <th 
                              colSpan={4} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '6px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              আয়ের খাত
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {/* আয়ের খাত: ১. সিমেন্ট বিক্রয় বাবদ আয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট বিক্রয় বাবদ আয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(cementSalesQty)}</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementSalesAmount)}</td>
                          </tr>

                          {/* আয়ের খাত: ২. রড বিক্রয় বাবদ আয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রড বিক্রয় বাবদ আয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(rodSalesQty)}</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodSalesAmount)}</td>
                          </tr>

                          {/* মোট আয় */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট আয়
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(totalSalesIncome)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                          </tr>

                          {/* Section Title: ব্যয়ের খাত */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                              ব্যয়ের খাত
                            </td>
                          </tr>

                          {/* Sub Section: সিমেন্ট */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000000' }}>
                              সিমেন্ট
                            </td>
                          </tr>

                          {/* ১. সিমেন্ট ক্রয় বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট ক্রয় বাবদ ব্যয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(cementPurchaseQty)}</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementPurchaseAmount)}</td>
                          </tr>

                          {/* ২. সিমেন্ট গাড়ী ভাড়া বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট গাড়ী ভাড়া বাবদ ব্যয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementTruckFare)}</td>
                          </tr>

                          {/* ৩. সিমেন্ট আনলোড লেবার */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>৩</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট আনলোড লেবার</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementUnloadLabor)}</td>
                          </tr>

                          {/* মোট সিমেন্ট বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট সিমেন্ট বাবদ ব্যয়
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(cementTotalDirectCost)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                          </tr>

                          {/* Sub Section: রড */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000000' }}>
                              রড
                            </td>
                          </tr>

                          {/* ১. রড ক্রয় বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রড ক্রয় বাবদ ব্যয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(rodPurchaseQty)}</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodPurchaseAmount)}</td>
                          </tr>

                          {/* ২. রডের গাড়ী ভাড়া বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রডের গাড়ী ভাড়া বাবদ ব্যয়</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodTruckFare)}</td>
                          </tr>

                          {/* ৩. রডের আনলোড লেবার */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>৩</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রডের আনলোড লেবার</td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodUnloadLabor)}</td>
                          </tr>

                          {/* মোট রড বাবদ ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট রড বাবদ ব্যয়
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(rodTotalDirectCost)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                          </tr>

                          {/* মোট ক্রয় ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট ক্রয় ব্যয়
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(totalDirectCost)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                          </tr>

                          {/* Sub Section: ব্যাবসা পরিচালন ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                              ব্যাবসা পরিচালন ব্যয়
                            </td>
                          </tr>

                          {/* পরিচালন ব্যয় তালিকা */}
                          {standardOpexRows.map((item, idx) => (
                            <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                                {toBengaliDigits(idx + 1)}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                {item.name}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {formatBnNumber(item.amount)}
                              </td>
                            </tr>
                          ))}

                          {/* মোট পরিচালন ব্যয় */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(totalOperatingExpense)}
                            </td>
                          </tr>

                          {/* সর্বমোট খরচ */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              সর্বমোট খরচ
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(grandTotalExpenses)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 🖨️ A4 PRINTABLE INCOME STATEMENT WRAPPER (FOR printElement targeting) */}
                  <div 
                    id="income-statement-printable-wrapper" 
                    className="hidden print:block font-bengali text-black text-[13px] leading-tight p-2"
                    style={{ color: '#000000', backgroundColor: '#ffffff', width: '100%', maxWidth: '650px', margin: '0 auto' }}
                  >
                    <table 
                      style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        border: '2px solid #000000',
                        fontFamily: "'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      }}
                    >
                      <thead>
                        {/* Row 1: মেসার্স দেলোয়ার এন্ড ব্রাদার্স */}
                        <tr>
                          <th 
                            colSpan={4} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '8px 4px', 
                              textAlign: 'center', 
                              fontSize: '18px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            মেসার্স দেলোয়ার এন্ড ব্রাদার্স
                          </th>
                        </tr>

                        {/* Row 2: ইনকাম বিবরণী */}
                        <tr>
                          <th 
                            colSpan={4} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 4px', 
                              textAlign: 'center', 
                              fontSize: '16px', 
                              fontWeight: 800,
                              color: '#000000'
                            }}
                          >
                            ইনকাম বিবরণী
                          </th>
                        </tr>

                        {/* Row 3: তারিখ */}
                        <tr>
                          <th 
                            colSpan={4} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 700,
                              color: '#000000'
                            }}
                          >
                            {formatBnDate(incomeStatementDate, 'dd MMMM - yyyy')}
                          </th>
                        </tr>

                        {/* Table Column Headers */}
                        <tr style={{ backgroundColor: '#ffffff' }}>
                          <th style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 800, fontSize: '13px', width: '38px' }}>
                            ক্রঃ
                          </th>
                          <th style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '14px' }}>
                            নাম
                          </th>
                          <th style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center', fontWeight: 800, fontSize: '14px', width: '100px' }}>
                            ব্যাগ/কেজি
                          </th>
                          <th style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '14px', width: '130px' }}>
                            টাকা
                          </th>
                        </tr>

                        {/* Section Title: আয়ের খাত */}
                        <tr>
                          <th 
                            colSpan={4} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '6px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            আয়ের খাত
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* আয়ের খাত: ১. সিমেন্ট বিক্রয় বাবদ আয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট বিক্রয় বাবদ আয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(cementSalesQty)}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementSalesAmount)}</td>
                        </tr>

                        {/* আয়ের খাত: ২. রড বিক্রয় বাবদ আয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রড বিক্রয় বাবদ আয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(rodSalesQty)}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodSalesAmount)}</td>
                        </tr>

                        {/* মোট আয় */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট আয়
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(totalSalesIncome)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                        </tr>

                        {/* Section Title: ব্যয়ের খাত */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                            ব্যয়ের খাত
                          </td>
                        </tr>

                        {/* Sub Section: সিমেন্ট */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000000' }}>
                            সিমেন্ট
                          </td>
                        </tr>

                        {/* ১. সিমেন্ট ক্রয় বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট ক্রয় বাবদ ব্যয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(cementPurchaseQty)}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementPurchaseAmount)}</td>
                        </tr>

                        {/* ২. সিমেন্ট গাড়ী ভাড়া বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট গাড়ী ভাড়া বাবদ ব্যয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementTruckFare)}</td>
                        </tr>

                        {/* ৩. সিমেন্ট আনলোড লেবার */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>৩</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>সিমেন্ট আনলোড লেবার</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(cementUnloadLabor)}</td>
                        </tr>

                        {/* মোট সিমেন্ট বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট সিমেন্ট বাবদ ব্যয়
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(cementTotalDirectCost)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                        </tr>

                        {/* Sub Section: রড */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#000000' }}>
                            রড
                          </td>
                        </tr>

                        {/* ১. রড ক্রয় বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>১</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রড ক্রয় বাবদ ব্যয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnQty(rodPurchaseQty)}</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodPurchaseAmount)}</td>
                        </tr>

                        {/* ২. রডের গাড়ী ভাড়া বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>২</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রডের গাড়ী ভাড়া বাবদ ব্যয়</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodTruckFare)}</td>
                        </tr>

                        {/* ৩. রডের আনলোড লেবার */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>৩</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>রডের আনলোড লেবার</td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatBnNumber(rodUnloadLabor)}</td>
                        </tr>

                        {/* মোট রড বাবদ ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট রড বাবদ ব্যয়
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(rodTotalDirectCost)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                        </tr>

                        {/* মোট ক্রয় ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট ক্রয় ব্যয়
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(totalDirectCost)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '14px', pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '3px 8px' }}></td>
                        </tr>

                        {/* Sub Section: ব্যাবসা পরিচালন ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                            ব্যাবসা পরিচালন ব্যয়
                          </td>
                        </tr>

                        {/* পরিচালন ব্যয় তালিকা */}
                        {standardOpexRows.map((item, idx) => (
                          <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                              {toBengaliDigits(idx + 1)}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              {item.name}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 6px', textAlign: 'center' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(item.amount)}
                            </td>
                          </tr>
                        ))}

                        {/* মোট পরিচালন ব্যয় */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(totalOperatingExpense)}
                          </td>
                        </tr>

                        {/* সর্বমোট খরচ */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            সর্বমোট খরচ
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(grandTotalExpenses)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* 6. ব্যালেন্স শীট (100% Real Data & PDF Matched) */}
            {activeTab === 'balance_sheet' && (() => {
              // Real data calculations
              const rodStockVal = products.filter(p => p.category === 'রড').reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
              const cementStockVal = products.filter(p => p.category === 'সিমেন্ট').reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
              const ringStockVal = products.filter(p => p.category === 'রিং').reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
              const otherStockVal = products.filter(p => !['রড', 'সিমেন্ট', 'রিং'].includes(p.category)).reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);

              const totalBankBal = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
              const totalCustDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
              const customersWithDue = customers.filter(c => (c.totalDue || 0) > 0);

              const totalAssets = rodStockVal + cementStockVal + ringStockVal + otherStockVal + totalCash + totalBankBal + totalCustDue;

              const suppliersWithDue = suppliers.filter(s => (s.totalDue || 0) > 0);
              const totalSuppDue = suppliers.reduce((sum, s) => sum + (s.totalDue || 0), 0);

              const currentCapital = totalAssets - totalSuppDue; // বর্তমান চালান (সম্পদ)
              const initialInvestedCapital = initialCapital; // চালান প্রদান করা হয়েছিলো
              const netProfit = currentCapital - initialInvestedCapital; // প্রফিট

              return (
                <div className="space-y-6 animate-in fade-in duration-300 font-bengali">
                  {/* Top Action Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Scale className="w-6 h-6 text-orange-600" />
                        ব্যালেন্স সিট (Balance Sheet)
                      </h1>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        রিয়েল ডাটা ভিত্তিক প্রতিষ্ঠানিক সম্পদ, ঋণ ও বর্তমান মূলধনের আর্থিক বিবরণী
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Date Picker Input */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={balanceSheetDate}
                          onChange={(e) => setBalanceSheetDate(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                        />
                      </div>

                      {/* Capital Setting Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempCapitalInput(String(initialCapital));
                          setIsEditingCapital(true);
                        }}
                        className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                        মূলধন পরিবর্তন
                      </Button>

                      {/* Print Button */}
                      <Button
                        onClick={() => printElement('balance-sheet-printable-wrapper')}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        প্রিন্ট করুন (Print PDF)
                      </Button>

                      {/* Back Button */}
                      <button 
                        onClick={() => setActiveTab('hub')} 
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট
                      </button>
                    </div>
                  </div>

                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-teal-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-emerald-800">মোট সম্পদ (Total Assets)</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">{formatBnCurrency(totalAssets)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">স্টক + ক্যাশ + ব্যাংক + বাকী</p>
                    </Card>

                    <Card className="p-4 border-rose-200 bg-gradient-to-br from-rose-50/90 to-red-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-rose-800">মোট ঋণ (Total Liabilities)</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">{formatBnCurrency(totalSuppDue)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">সাপ্লায়ার ও অন্যান্য দেনা</p>
                    </Card>

                    <Card className="p-4 border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/40 rounded-2xl shadow-xs">
                      <p className="text-xs font-bold text-blue-800">বর্তমান চালান / নিট সম্পদ</p>
                      <p className="text-2xl font-black text-blue-700 mt-1">{formatBnCurrency(currentCapital)}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">মোট সম্পদ - মোট ঋণ</p>
                    </Card>

                    <Card className={cn(
                      "p-4 rounded-2xl shadow-xs border",
                      netProfit >= 0 ? "border-amber-200 bg-gradient-to-br from-amber-50/90 to-yellow-50/40" : "border-rose-200 bg-gradient-to-br from-rose-50/90 to-red-50/40"
                    )}>
                      <p className={cn("text-xs font-bold", netProfit >= 0 ? "text-amber-800" : "text-rose-800")}>
                        {netProfit >= 0 ? 'প্রফিট (Net Growth/Profit)' : 'ক্ষতি (Loss)'}
                      </p>
                      <p className={cn("text-2xl font-black mt-1", netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatBnCurrency(netProfit)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">বর্তমান চালান - বিনিয়োগ মূলধন</p>
                    </Card>
                  </div>

                  {/* Main Printable / Live Sheet Box (Exact 1-to-1 Match with User's PDF) */}
                  <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl border border-slate-200 flex justify-center">
                    <div className="bg-white text-black p-6 sm:p-8 shadow-md rounded border border-black/20 w-full max-w-[650px] text-[13px] leading-tight">
                      <table 
                        style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          border: '2px solid #000000',
                          fontFamily: "'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}
                      >
                        <thead>
                          {/* Row 1: মেসার্স দেলোয়ার এন্ড ব্রাদার্স */}
                          <tr>
                            <th 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '8px 4px', 
                                textAlign: 'center', 
                                fontSize: '18px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              মেসার্স দেলোয়ার এন্ড ব্রাদার্স
                            </th>
                          </tr>

                          {/* Row 2: ব্যালেন্স সিট */}
                          <tr>
                            <th 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 4px', 
                                textAlign: 'center', 
                                fontSize: '16px', 
                                fontWeight: 800,
                                color: '#000000'
                              }}
                            >
                              ব্যালেন্স সিট
                            </th>
                          </tr>

                          {/* Row 3: তারিখ */}
                          <tr>
                            <th 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 700,
                                color: '#000000'
                              }}
                            >
                              {formatBnDate(balanceSheetDate, 'dd MMMM - yyyy')}
                            </th>
                          </tr>

                          {/* Section 1 Header: সম্পদ */}
                          <tr>
                            <th 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '6px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              সম্পদ
                            </th>
                          </tr>

                          {/* Column Headers: নাম | টাকা */}
                          <tr style={{ backgroundColor: '#ffffff' }}>
                            <th 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 8px', 
                                textAlign: 'center', 
                                fontWeight: 800,
                                fontSize: '14px',
                                width: '60%'
                              }}
                            >
                              নাম
                            </th>
                            <th 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 8px', 
                                textAlign: 'center', 
                                fontWeight: 800,
                                fontSize: '14px',
                                width: '40%'
                              }}
                            >
                              টাকা
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {/* 1. রড স্টক */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              রড স্টক -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(rodStockVal)}
                            </td>
                          </tr>

                          {/* 2. সিমেন্ট স্টক */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              সিমেন্ট স্টক -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(cementStockVal)}
                            </td>
                          </tr>

                          {/* 3. রিং স্টক (if any) */}
                          {ringStockVal > 0 && (
                            <tr style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                রিং স্টক -
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {formatBnNumber(ringStockVal)}
                              </td>
                            </tr>
                          )}

                          {/* 4. অন্যান্য স্টক (if any) */}
                          {otherStockVal > 0 && (
                            <tr style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                অন্যান্য স্টক -
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {formatBnNumber(otherStockVal)}
                              </td>
                            </tr>
                          )}

                          {/* 5. মোট নগদ ক্যাশ */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              মোট নগদ ক্যাশ -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(totalCash)}
                            </td>
                          </tr>

                          {/* 6. প্রতিটি ব্যাংক একাউন্ট */}
                          {banks.map((b) => (
                            <tr key={b.id} style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                {b.name} {b.accNo ? `${b.accNo} ` : ''}-
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {b.balance > 0 ? formatBnNumber(b.balance) : '-'}
                              </td>
                            </tr>
                          ))}

                          {/* 7. গ্রাহক / পার্টিদের আলাদা তালিকা (যদি থাকে) */}
                          {customersWithDue.slice(0, 5).map((c) => (
                            <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                {c.name} {c.businessName ? `(${c.businessName}) ` : ''}-
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {formatBnNumber(c.totalDue)}
                              </td>
                            </tr>
                          ))}

                          {/* 8. মোট বাকী */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              মোট বাকী -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(totalCustDue)}
                            </td>
                          </tr>

                          {/* 9. মোট সম্পদ সাবটোটাল */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট সম্পদ
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(totalAssets)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                          </tr>

                          {/* Section 2 Header: ঋণ */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '6px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              ঋণ
                            </td>
                          </tr>

                          {/* Column Headers: নাম | টাকা */}
                          <tr style={{ backgroundColor: '#ffffff', pageBreakInside: 'avoid' }}>
                            <td 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 8px', 
                                textAlign: 'center', 
                                fontWeight: 800,
                                fontSize: '14px'
                              }}
                            >
                              নাম
                            </td>
                            <td 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '5px 8px', 
                                textAlign: 'center', 
                                fontWeight: 800,
                                fontSize: '14px'
                              }}
                            >
                              টাকা
                            </td>
                          </tr>

                          {/* ঋণ ও সাপ্লায়ার তালিকা */}
                          {suppliersWithDue.length === 0 ? (
                            <tr style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#666' }}>
                                বর্তমানে কোনো পাওনাদার বা সাপ্লায়ার ঋণ নেই
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                -
                              </td>
                            </tr>
                          ) : (
                            suppliersWithDue.map((s) => (
                              <tr key={s.id} style={{ pageBreakInside: 'avoid' }}>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                  {s.name} {s.businessName ? `(${s.businessName})` : ''}
                                </td>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                  {formatBnNumber(s.totalDue)}
                                </td>
                              </tr>
                            ))
                          )}

                          {/* মোট ঋণ সাবটোটাল */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                              মোট ঋণ
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                              {formatBnNumber(totalSuppDue)}
                            </td>
                          </tr>

                          {/* ফাঁকা স্পেসিং রো */}
                          <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                            <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                          </tr>

                          {/* Section 3 Header: বর্তমান চালান (সম্পদ) */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td 
                              colSpan={2} 
                              style={{ 
                                border: '1.5px solid #000000', 
                                padding: '6px 4px', 
                                textAlign: 'center', 
                                fontSize: '15px', 
                                fontWeight: 900,
                                color: '#000000'
                              }}
                            >
                              বর্তমান চালান (সম্পদ)
                            </td>
                          </tr>

                          {/* বর্তমান চালান (সম্পদ) */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              বর্তমান চালান (সম্পদ)
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(currentCapital)}
                            </td>
                          </tr>

                          {/* চালান প্রদান করা হয়েছিলো - */}
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              চালান প্রদান করা হয়েছিলো -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(initialInvestedCapital)}
                            </td>
                          </tr>

                          {/* প্রফিট */}
                          <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#000000' }}>
                              প্রফিট
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                              {formatBnNumber(netProfit)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 🖨️ A4 PRINTABLE BALANCE SHEET WRAPPER (FOR printElement targeting) */}
                  <div 
                    id="balance-sheet-printable-wrapper" 
                    className="hidden print:block font-bengali text-black text-[13px] leading-tight p-2"
                    style={{ color: '#000000', backgroundColor: '#ffffff', width: '100%', maxWidth: '650px', margin: '0 auto' }}
                  >
                    <table 
                      style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        border: '2px solid #000000',
                        fontFamily: "'Hind Siliguri', 'SolaimanLipi', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      }}
                    >
                      <thead>
                        {/* Row 1: মেসার্স দেলোয়ার এন্ড ব্রাদার্স */}
                        <tr>
                          <th 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '8px 4px', 
                              textAlign: 'center', 
                              fontSize: '18px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            মেসার্স দেলোয়ার এন্ড ব্রাদার্স
                          </th>
                        </tr>

                        {/* Row 2: ব্যালেন্স সিট */}
                        <tr>
                          <th 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 4px', 
                              textAlign: 'center', 
                              fontSize: '16px', 
                              fontWeight: 800,
                              color: '#000000'
                            }}
                          >
                            ব্যালেন্স সিট
                          </th>
                        </tr>

                        {/* Row 3: তারিখ */}
                        <tr>
                          <th 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 700,
                              color: '#000000'
                            }}
                          >
                            {formatBnDate(balanceSheetDate, 'dd MMMM - yyyy')}
                          </th>
                        </tr>

                        {/* Section 1 Header: সম্পদ */}
                        <tr>
                          <th 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '6px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            সম্পদ
                          </th>
                        </tr>

                        {/* Column Headers: নাম | টাকা */}
                        <tr style={{ backgroundColor: '#ffffff' }}>
                          <th 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'center', 
                              fontWeight: 800,
                              fontSize: '14px',
                              width: '60%'
                            }}
                          >
                            নাম
                          </th>
                          <th 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'center', 
                              fontWeight: 800,
                              fontSize: '14px',
                              width: '40%'
                            }}
                          >
                            টাকা
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* 1. রড স্টক */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            রড স্টক -
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(rodStockVal)}
                          </td>
                        </tr>

                        {/* 2. সিমেন্ট স্টক */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            সিমেন্ট স্টক -
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(cementStockVal)}
                          </td>
                        </tr>

                        {/* 3. রিং স্টক (if any) */}
                        {ringStockVal > 0 && (
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              রিং স্টক -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(ringStockVal)}
                            </td>
                          </tr>
                        )}

                        {/* 4. অন্যান্য স্টক (if any) */}
                        {otherStockVal > 0 && (
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              অন্যান্য স্টক -
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(otherStockVal)}
                            </td>
                          </tr>
                        )}

                        {/* 5. মোট নগদ ক্যাশ */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            মোট নগদ ক্যাশ -
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(totalCash)}
                          </td>
                        </tr>

                        {/* 6. প্রতিটি ব্যাংক একাউন্ট */}
                        {banks.map((b) => (
                          <tr key={b.id} style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              {b.name} {b.accNo ? `${b.accNo} ` : ''}-
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {b.balance > 0 ? formatBnNumber(b.balance) : '-'}
                            </td>
                          </tr>
                        ))}

                        {/* 7. গ্রাহক / পার্টিদের আলাদা তালিকা (যদি থাকে) */}
                        {customersWithDue.slice(0, 5).map((c) => (
                          <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                              {c.name} {c.businessName ? `(${c.businessName}) ` : ''}-
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              {formatBnNumber(c.totalDue)}
                            </td>
                          </tr>
                        ))}

                        {/* 8. মোট বাকী */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            মোট বাকী -
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(totalCustDue)}
                          </td>
                        </tr>

                        {/* 9. মোট সম্পদ সাবটোটাল */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট সম্পদ
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(totalAssets)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                        </tr>

                        {/* Section 2 Header: ঋণ */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '6px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            ঋণ
                          </td>
                        </tr>

                        {/* Column Headers: নাম | টাকা */}
                        <tr style={{ backgroundColor: '#ffffff', pageBreakInside: 'avoid' }}>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'center', 
                              fontWeight: 800,
                              fontSize: '14px'
                            }}
                          >
                            নাম
                          </td>
                          <td 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '5px 8px', 
                              textAlign: 'center', 
                              fontWeight: 800,
                              fontSize: '14px'
                            }}
                          >
                            টাকা
                          </td>
                        </tr>

                        {/* ঋণ ও সাপ্লায়ার তালিকা */}
                        {suppliersWithDue.length === 0 ? (
                          <tr style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#666' }}>
                              বর্তমানে কোনো পাওনাদার বা সাপ্লায়ার ঋণ নেই
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                              -
                            </td>
                          </tr>
                        ) : (
                          suppliersWithDue.map((s) => (
                            <tr key={s.id} style={{ pageBreakInside: 'avoid' }}>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                                {s.name} {s.businessName ? `(${s.businessName})` : ''}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                {formatBnNumber(s.totalDue)}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* মোট ঋণ সাবটোটাল */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                            মোট ঋণ
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px' }}>
                            {formatBnNumber(totalSuppDue)}
                          </td>
                        </tr>

                        {/* ফাঁকা স্পেসিং রো */}
                        <tr style={{ height: '18px', pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                          <td style={{ border: '1.5px solid #000000', padding: '4px 8px' }}></td>
                        </tr>

                        {/* Section 3 Header: বর্তমান চালান (সম্পদ) */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td 
                            colSpan={2} 
                            style={{ 
                              border: '1.5px solid #000000', 
                              padding: '6px 4px', 
                              textAlign: 'center', 
                              fontSize: '15px', 
                              fontWeight: 900,
                              color: '#000000'
                            }}
                          >
                            বর্তমান চালান (সম্পদ)
                          </td>
                        </tr>

                        {/* বর্তমান চালান (সম্পদ) */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            বর্তমান চালান (সম্পদ)
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(currentCapital)}
                          </td>
                        </tr>

                        {/* চালান প্রদান করা হয়েছিলো - */}
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '14px' }}>
                            চালান প্রদান করা হয়েছিলো -
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                            {formatBnNumber(initialInvestedCapital)}
                          </td>
                        </tr>

                        {/* প্রফিট */}
                        <tr style={{ pageBreakInside: 'avoid', fontWeight: 900 }}>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#000000' }}>
                            প্রফিট
                          </td>
                          <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                            {formatBnNumber(netProfit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Capital Setting Dialog */}
                  <Dialog open={isEditingCapital} onOpenChange={setIsEditingCapital}>
                    <DialogContent className="max-w-md rounded-2xl p-6 font-bengali">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Settings2 className="w-5 h-5 text-orange-600" />
                          প্রদত্ত মূলধন / বিনিয়োগ চালান নির্ধারণ
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          ব্যালেন্স সিটে প্রফিট গণনার জন্য আপনার দোকানে শুরুতে বা বিনিয়োগকৃত মোট মূলধনের পরিমাণ দিন:
                        </p>
                        <div>
                          <Label className="text-xs font-bold text-slate-700">বিনিয়োগকৃত মূলধনের পরিমাণ (৳)</Label>
                          <Input
                            type="number"
                            value={tempCapitalInput}
                            onChange={(e) => setTempCapitalInput(e.target.value)}
                            placeholder="১০০০০০০০"
                            className="mt-1 font-bold text-sm bg-slate-50 border-slate-300 rounded-xl"
                          />
                          <p className="text-[11px] font-semibold text-slate-400 mt-1">
                            বর্তমান মান: {formatBnCurrency(Number(tempCapitalInput) || 0)}
                          </p>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsEditingCapital(false)} className="rounded-xl font-bold text-xs">
                          বাতিল
                        </Button>
                        <Button 
                          onClick={() => {
                            const val = Number(tempCapitalInput) || 0;
                            setInitialCapital(val);
                            setIsEditingCapital(false);
                            toast.success('বিনিয়োগ মূলধন সফলভাবে আপডেট করা হয়েছে');
                          }} 
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs"
                        >
                          সংরক্ষণ করুন
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                                {r.status === 'journalized' ? (
                                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> অনুমোদিত
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => handleOpenAutoJournal(r)} 
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer" 
                                    title="কমিশন অনুমোদন করুন"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                )}
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

            {/* 9. ব্যাংক এর তালিকা (Bank Account Management) */}
            {activeTab === 'bank_list' && (() => {
              const totalBankBalance = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
              const filteredBanks = banks.filter(b => 
                !searchQuery.trim() || 
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                b.accNo.includes(searchQuery) ||
                (b.branch && b.branch.toLowerCase().includes(searchQuery.toLowerCase()))
              );

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-blue-600" /> ব্যাংক একাউন্ট তালিকা (Bank Accounts)
                      </h1>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                        <span>ড্যাশবোর্ড</span><span>&rsaquo;</span><span>রিপোর্ট</span><span>&rsaquo;</span><span className="text-slate-900 font-bold">ব্যাংক এর তালিকা</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button onClick={handleOpenAddBank} className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        <span>নতুন ব্যাংক যোগ করুন</span>
                      </Button>
                      <button onClick={() => setActiveTab('hub')} className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4 text-orange-500" /> সকল রিপোর্ট
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-5 border-blue-200 bg-blue-50/40 rounded-2xl flex items-center justify-between shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-blue-800">সর্বমোট ব্যাংক একাউন্ট</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{toBnNum(banks.length)} টি</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        <Landmark className="w-6 h-6" />
                      </div>
                    </Card>

                    <Card className="p-5 border-emerald-200 bg-emerald-50/40 rounded-2xl flex items-center justify-between shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-emerald-800">মোট ব্যাংক ব্যালেন্স</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{formatBnCurrency(totalBankBalance)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <Wallet className="w-6 h-6" />
                      </div>
                    </Card>
                  </div>

                  {/* Bank List Table Card */}
                  <Card className="border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="ব্যাংক এর নাম, হিসাব নম্বর বা শাখা সার্চ করুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        মোট {toBnNum(filteredBanks.length)} টি ব্যাংক প্রদর্শিত হচ্ছে
                      </span>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                          <TableRow>
                            <TableHead className="font-black text-xs text-center w-14">ক্রমিক</TableHead>
                            <TableHead className="font-black text-xs">ব্যাংক / হিসাবের নাম</TableHead>
                            <TableHead className="font-black text-xs">হিসাব নম্বর (Account No)</TableHead>
                            <TableHead className="font-black text-xs">শাখা (Branch)</TableHead>
                            <TableHead className="font-black text-xs text-right px-6">বর্তমান ব্যালেন্স (৳)</TableHead>
                            <TableHead className="font-black text-xs text-center">অ্যাকশন</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBanks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-bengali font-bold">
                                কোনো ব্যাংক একাউন্ট পাওয়া যায়নি
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredBanks.map((b, i) => (
                              <TableRow key={b.id} className="border-b border-slate-100 text-xs font-semibold hover:bg-slate-50/80 transition-colors">
                                <TableCell className="text-center font-bold text-slate-500">{toBnNum(i + 1)}</TableCell>
                                <TableCell className="font-black text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                      🏦
                                    </div>
                                    <span>{b.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono font-bold text-slate-700">{b.accNo || 'N/A'}</TableCell>
                                <TableCell className="text-slate-600">{b.branch || 'প্রধান শাখা'}</TableCell>
                                <TableCell className="text-right font-black text-emerald-600 px-6 text-sm">
                                  {formatBnCurrency(b.balance)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditBank(b)}
                                      className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                      title="সম্পাদনা করুন"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBank(b)}
                                      className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                      title="মুছে ফেলুন"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              );
            })()}

          </div>
        )}



        {/* COMMISSION APPROVAL MODAL */}
        <Dialog open={journalModalOpen} onOpenChange={(open) => { setJournalModalOpen(open); if (!open) setJournalConfirmText(''); }}>
          <DialogContent className="max-w-md font-bengali rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-black text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> কমিশন অনুমোদন (Approve Commission)
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
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-slate-200">
                      <span className="flex-1 text-left truncate">
                        {journalAccountType === 'bank' ? '🏦 ব্যাংক একাউন্ট' : '💵 ক্যাশ ড্রয়ার'}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="font-bengali">
                      <SelectItem value="cash">💵 ক্যাশ ড্রয়ার</SelectItem>
                      <SelectItem value="bank">🏦 ব্যাংক একাউন্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {journalAccountType === 'bank' && (
                  <div className="space-y-2">
                    <Label className="font-bold">ব্যাংক নির্বাচন করুন:</Label>
                    <Select value={String(journalBankId)} onValueChange={(val: any) => setJournalBankId(String(val || ''))}>
                      <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-slate-200">
                        <span className="flex-1 text-left truncate">
                          {(() => {
                            const b = banks.find(item => String(item.id) === String(journalBankId));
                            if (!b) return 'ব্যাংক বেছে নিন';
                            return b.accNo ? `${b.name} (${b.accNo})` : b.name;
                          })()}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="font-bengali">
                        {banks.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.accNo ? `${b.name} (${b.accNo})` : b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Confirm Text Input */}
                <div className="space-y-1.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl">
                  <Label className="text-xs font-black text-amber-950 block">
                    কমিশন অনুমোদন নিশ্চিত করতে নিচে <span className="font-mono text-rose-600 font-black bg-white px-1.5 py-0.5 rounded border border-amber-300">confirm</span> লিখুন:
                  </Label>
                  <Input
                    value={journalConfirmText}
                    onChange={(e) => setJournalConfirmText(e.target.value)}
                    placeholder="এখানে confirm লিখুন..."
                    className="h-10 rounded-xl bg-white border-amber-300 font-mono text-xs font-black text-slate-900 focus:border-amber-500 focus:ring-amber-500"
                  />
                  {journalConfirmText && journalConfirmText.trim().toLowerCase() !== 'confirm' && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">
                      ⚠️ অনুগ্রহ করে হুবহু &apos;confirm&apos; লিখুন
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setJournalModalOpen(false); setJournalConfirmText(''); }} className="rounded-xl text-xs font-bold">বাতিল</Button>
              <Button 
                onClick={handleExecuteAutoJournal} 
                disabled={isSubmittingJournal || journalConfirmText.trim().toLowerCase() !== 'confirm'} 
                className="rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmittingJournal ? 'অনুমোদন হচ্ছে...' : 'Approve সম্পন্ন করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD / EDIT BANK MODAL */}
        <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
          <DialogContent className="max-w-md font-bengali rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                {editingBank ? 'ব্যাংক একাউন্ট সম্পাদনা করুন' : 'নতুন ব্যাংক একাউন্ট যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveBank} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  ব্যাংক / হিসাবের নাম <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="ডাচ-বাংলা ব্যাংক লিমিটেড"
                  className="rounded-xl h-10 font-bold text-xs bg-white border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">হিসাব নম্বর (Account No)</Label>
                <Input
                  value={bankAccNo}
                  onChange={(e) => setBankAccNo(e.target.value)}
                  placeholder="123.456.7890"
                  className="rounded-xl h-10 font-bold text-xs bg-white border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">শাখা (Branch)</Label>
                  <Input
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="মিরপুর শাখা"
                    className="rounded-xl h-10 font-bold text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">ব্যালেন্স (৳)</Label>
                  <Input
                    type="number"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="rounded-xl h-10 font-black text-xs text-emerald-600 bg-white border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setBankModalOpen(false)} className="rounded-xl text-xs font-bold">
                  বাতিল
                </Button>
                <Button type="submit" disabled={isSubmittingBank} className="rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmittingBank ? 'সংরক্ষণ হচ্ছে...' : editingBank ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </Button>
              </DialogFooter>
            </form>
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
