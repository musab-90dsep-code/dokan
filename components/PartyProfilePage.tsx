'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api, PartyData, TransactionData } from '@/lib/api';
import { 
  Phone, MapPin, Building2, Receipt, Download, Printer, FileSpreadsheet,
  CreditCard, ChevronLeft, ChevronRight, Filter, Calendar, RotateCcw,
  MoreVertical, ChevronFirst, ChevronLast, Mail, FileText,
  FilePlus, Edit3, UserCheck, MessageSquare, X, Truck, Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

export interface PartyProfile {
  id: string; 
  name: string; 
  phone: string; 
  address: string; 
  businessName?: string;
  email?: string;
  customerCode?: string;
  supplierCode?: string;
  creditLimit?: number;
  creditDays?: number;
  joinedDate?: string;
  photoUrl?: string;
  customerType?: string;
  supplyType?: string;
  note?: string;
  totalDue?: number;
}

export interface TransactionDoc {
  id: string; 
  customerName?: string; 
  customerId?: string;
  supplierName?: string;
  supplierId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items?: any[];
  paymentMethod?: string;
  chequeNo?: string;
  bankName?: string;
  chequeStatus?: 'pending' | 'cleared' | 'bounced';
  note?: string;
  createdAt: any;
}

export interface LedgerEntry {
  id: string;
  date: Date;
  refNo: string;
  type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'CHEQUE_PENDING' | 'CHEQUE_CLEARED' | 'ADJUSTMENT' | 'RETURN';
  description: string;
  invoiceNo?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMethod: string;
  chequeNo?: string;
  bankName?: string;
  chequeStatus?: string;
  isBold?: boolean;
  orderId?: string;
  dueAmount?: number;
}

export default function PartyProfilePage({ id, type }: { id: string; type: 'customer' | 'supplier' }) {
  const isCustomer = type === 'customer';

  const [party, setParty] = useState<PartyProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionDoc | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  // Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'sale' | 'receive' | 'payment' | 'adjustment' | 'return'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const p = await api.parties.get(id);
        setParty({
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          address: p.address || '',
          businessName: p.business_name || '',
          email: p.email || '',
          creditLimit: Number(p.credit_limit || 0),
          creditDays: p.credit_days || 30,
          joinedDate: p.joined_date || '',
          photoUrl: p.photo_url || '',
          customerType: p.customer_type || '',
          supplyType: p.supply_type || '',
          note: p.note || '',
          totalDue: Number(p.total_due || 0)
        });

        const txList = await api.transactions.list({ party: Number(id) });
        setTransactions(txList.map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || p.name,
          customerId: String(p.id),
          totalAmount: t.total_amount,
          paidAmount: t.paid_amount,
          dueAmount: t.due_amount,
          items: t.items || [],
          paymentMethod: t.payment_method || 'cash',
          chequeNo: t.cheque_number,
          bankName: t.cheque_bank,
          chequeStatus: t.cheque_status,
          createdAt: t.created_at || new Date().toISOString()
        })));
      } catch (err) {
        console.error('Error loading party profile:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  const totalBill = transactions.reduce((a, o) => a + (o.totalAmount || 0), 0);
  const totalPaid = transactions.reduce((a, o) => a + (o.paidAmount || 0), 0);
  const totalDue = transactions.reduce((a, o) => a + (o.dueAmount || 0), 0);

  // Aging Analysis Calculation
  const now = new Date();
  let age0to30 = 0;
  let age31to60 = 0;
  let age61to90 = 0;
  let age90plus = 0;

  transactions.forEach(o => {
    if ((o.dueAmount || 0) > 0) {
      const oDate = new Date(o.createdAt || 0);
      const days = Math.abs(differenceInDays(now, oDate));
      if (days <= 30) age0to30 += o.dueAmount;
      else if (days <= 60) age31to60 += o.dueAmount;
      else if (days <= 90) age61to90 += o.dueAmount;
      else age90plus += o.dueAmount;
    }
  });

  // Generate Chronological Detailed Ledger Entries with Running Balance
  const generateLedger = (): LedgerEntry[] => {
    const entries: LedgerEntry[] = [];
    let cumulativeBalance = 0;

    const sorted = [...transactions].sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const db = new Date(b.createdAt || 0);
      return da.getTime() - db.getTime();
    });

    sorted.forEach(tx => {
      const txDate = new Date(tx.createdAt || Date.now());
      const invPrefix = isCustomer ? 'INV-2026-' : 'PUR-2026-';
      const invNo = `${invPrefix}${tx.id.slice(0, 5).toUpperCase()}`;

      const itemDesc = tx.items && tx.items.length > 0
        ? tx.items.map((it: any) => `${it.name} (${it.quantity} ${it.unit || ''})`).join(', ')
        : (isCustomer ? 'পণ্য বিক্রয়' : 'পণ্য ক্রয়');

      const debitVal = tx.totalAmount || 0;
      cumulativeBalance += debitVal;

      entries.push({
        id: `${tx.id}-bill`,
        date: txDate,
        refNo: invNo,
        type: isCustomer ? 'SALE' : 'PURCHASE',
        description: itemDesc,
        invoiceNo: invNo,
        debit: debitVal,
        credit: 0,
        runningBalance: cumulativeBalance,
        paymentMethod: '—',
        orderId: tx.id,
        dueAmount: tx.dueAmount
      });

      const creditVal = tx.paidAmount || 0;
      if (creditVal > 0) {
        cumulativeBalance -= creditVal;
        const rcvPrefix = isCustomer ? 'RCV-2026-' : 'PAY-2026-';
        const rcvNo = `${rcvPrefix}${tx.id.slice(0, 5).toUpperCase()}`;
        entries.push({
          id: `${tx.id}-credit`,
          date: txDate,
          refNo: rcvNo,
          type: 'PAYMENT',
          description: isCustomer ? `নগদ প্রাপ্তি (চালান ${invNo})` : `পেমেন্ট পরিশোধ (চালান ${invNo})`,
          invoiceNo: '—',
          debit: 0,
          credit: creditVal,
          runningBalance: cumulativeBalance,
          paymentMethod: 'নগদ',
          orderId: tx.id,
          dueAmount: tx.dueAmount
        });
      }
    });

    return entries;
  };

  const ledgerEntries = generateLedger();

  // Filtered Ledger Entries
  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      const matchRef = entry.refNo.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      const matchInv = (entry.invoiceNo || '').toLowerCase().includes(q);
      if (!matchRef && !matchDesc && !matchInv) return false;
    }

    if (activeTab === 'sale' && (entry.type !== 'SALE' && entry.type !== 'PURCHASE')) return false;
    if (activeTab === 'receive' && entry.type !== 'PAYMENT') return false;
    if (activeTab === 'payment' && entry.type !== 'PAYMENT') return false;
    if (activeTab === 'adjustment' && entry.type !== 'ADJUSTMENT') return false;
    if (activeTab === 'return' && entry.type !== 'RETURN') return false;

    if (txnTypeFilter === 'sale' && (entry.type !== 'SALE' && entry.type !== 'PURCHASE')) return false;
    if (txnTypeFilter === 'payment' && entry.type !== 'PAYMENT') return false;
    if (txnTypeFilter === 'due' && !(entry.dueAmount && entry.dueAmount > 0)) return false;

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (entry.date < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (entry.date > e) return false;
    }

    return true;
  });

  const validCurrentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredLedgerEntries.length / itemsPerPage)));
  const totalPages = Math.max(1, Math.ceil(filteredLedgerEntries.length / itemsPerPage));
  const paginatedEntries = filteredLedgerEntries.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const formatDate = (date: Date) => format(date, 'dd মিই yyyy, hh:mm a', { locale: bn });

  const handlePrintLedger = () => window.print();

  const handleDownloadCSV = () => {
    if (!party) return;
    let csvContent = "\uFEFFতারিখ,রেফারেন্স/আইডি,ধরণ,বিবরণ,চালান নং,ডেবিট/বিল (৳),ক্রেডিট/জমা (৳),অবশিষ্ট জের (৳),পেমেন্ট পদ্ধতি\n";
    filteredLedgerEntries.forEach(entry => {
      const dStr = format(entry.date, 'yyyy-MM-dd HH:mm');
      const typeStr = entry.type === 'SALE' || entry.type === 'PURCHASE' ? 'চালান' : 'রশিদ';
      const desc = `"${entry.description.replace(/"/g, '""')}"`;
      csvContent += `${dStr},${entry.refNo},${typeStr},${desc},${entry.invoiceNo || '—'},${entry.debit},${entry.credit},${entry.runningBalance},${entry.paymentMethod || '—'}\n`;
    });
    
    csvContent += `\n,,সর্বমোট হিসাব,,,,${totalBill},${totalPaid},${totalDue}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${party.businessName || party.name}_লেজার_খতিয়ান.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ফাইল ডাউনলোড হয়েছে');
  };

  const openGeneralPaymentModal = () => {
    const dueTxs = transactions.filter(o => (o.dueAmount || 0) > 0);
    if (dueTxs.length > 0) {
      setSelectedTx(dueTxs[0]);
      setPayAmount(dueTxs[0].dueAmount || 0);
    } else if (transactions.length > 0) {
      setSelectedTx(transactions[0]);
      setPayAmount(0);
    } else {
      toast.error('পেমেন্ট দেওয়ার মতো কোনো ইনভয়েস পাওয়া যায়নি');
      return;
    }
    setIsPayOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedTx || payAmount <= 0) return;
    const newPaid = (selectedTx.paidAmount || 0) + payAmount;
    const newDue = selectedTx.totalAmount - newPaid;
    try {
      await api.transactions.update(selectedTx.id, {
        paid_amount: newPaid,
        due_amount: Math.max(0, newDue),
        status: newDue <= 0 ? 'completed' : 'pending',
      });
      toast.success('পেমেন্ট আপডেট হয়েছে');
      setIsPayOpen(false);
      setPayAmount(0);
      // Reload page transactions
      const txList = await api.transactions.list({ party: Number(id) });
      setTransactions(txList.map(t => ({
        id: String(t.id || t.invoice_no),
        customerName: t.party_name || party?.name,
        customerId: String(id),
        totalAmount: t.total_amount,
        paidAmount: t.paid_amount,
        dueAmount: t.due_amount,
        items: t.items || [],
        paymentMethod: t.payment_method || 'cash',
        chequeNo: t.cheque_number,
        bankName: t.cheque_bank,
        chequeStatus: t.cheque_status,
        createdAt: t.created_at || new Date().toISOString()
      })));
    } catch { toast.error('পেমেন্ট আপডেট করতে সমস্যা হয়েছে'); }
  };

  if (!party && !loading) {
    return (
      <Shell>
        <div className="text-center py-20 font-bengali">
          <p className="text-slate-500 text-lg font-bold">তথ্য পাওয়া যায়নি</p>
          <Link href={isCustomer ? "/customers" : "/suppliers"}>
            <Button className="mt-4 rounded-xl font-bold">ফিরে যান</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const countBill = ledgerEntries.filter(e => e.type === 'SALE' || e.type === 'PURCHASE').length;
  const countPayment = ledgerEntries.filter(e => e.type === 'PAYMENT').length;

  return (
    <Shell>
      {/* Printable Header */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-slate-900 pb-4 font-bengali">
        <h1 className="text-3xl font-black text-slate-900">মেসার্স রড & সিমেন্ট স্টোর</h1>
        <p className="text-sm text-slate-600 mt-1">রড, সিমেন্ট ও নির্মাণ সামগ্রী | {isCustomer ? 'গ্রাহক খতিয়ান' : 'কোম্পানি খতিয়ান'}</p>
        <div className="mt-3 bg-slate-100 p-2 rounded text-center border border-slate-300">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest">
            {isCustomer ? 'গ্রাহক লেজার' : 'কোম্পানি লেজার'}: {party?.businessName || party?.name}
          </h2>
          <p className="text-xs text-slate-500">তারিখ: {format(new Date(), 'dd MMMM yyyy', { locale: bn })}</p>
        </div>
      </div>

      <div className="space-y-5 font-bengali">
        
        {/* 1. TOP HEADER & BREADCRUMB */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {isCustomer ? <Users className="w-7 h-7 text-orange-600" /> : <Building2 className="w-7 h-7 text-orange-600" />}
              {isCustomer ? 'গ্রাহক লেজার' : 'কোম্পানি / সরবরাহকারী লেজার'}
            </h1>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1">
              <Link href="/" className="hover:text-slate-600">ড্যাশবোর্ড</Link>
              <span>›</span>
              <Link href={isCustomer ? "/customers" : "/suppliers"} className="hover:text-slate-600">
                {isCustomer ? 'বিক্রয়' : 'ক্রয়'}
              </Link>
              <span>›</span>
              <span className="text-slate-600 font-bold">{isCustomer ? 'গ্রাহক লেজার' : 'কোম্পানি খতিয়ান'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handlePrintLedger} variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50">
              <Printer className="w-4 h-4 mr-1.5 text-slate-500" />প্রিন্ট
            </Button>
            <Button onClick={handlePrintLedger} variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50">
              <Download className="w-4 h-4 mr-1.5 text-slate-500" />PDF
            </Button>
            <Button onClick={handleDownloadCSV} variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50">
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />CSV এক্সপোর্ট
            </Button>
            <Button 
              onClick={openGeneralPaymentModal} 
              className="h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md shadow-orange-600/20 active:scale-95 transition-all"
            >
              <CreditCard className="w-4 h-4 mr-1.5" />{isCustomer ? 'পেমেন্ট গ্রহণ (F9)' : 'পেমেন্ট পরিশোধ (F9)'}
            </Button>
            <Link href={isCustomer ? "/customers" : "/suppliers"}>
              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 hover:text-rose-600 font-bold bg-white hover:bg-rose-50 transition-all">
                <X className="w-4 h-4 mr-1 text-rose-500" />বন্ধ করুন
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. OVERVIEW PROFILE CARD */}
        {party && (
          <Card className="bg-white border-slate-200/80 rounded-3xl shadow-xs overflow-hidden print:border print:shadow-none">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left Profile Info */}
                <div className="lg:col-span-5 flex items-start gap-4">
                  <div className="w-20 h-20 rounded-full bg-orange-500 text-white font-black text-3xl flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
                    {party.photoUrl ? (
                      <img src={party.photoUrl} alt={party.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(party.businessName || party.name)[0]?.toUpperCase()}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{party.businessName || party.name}</h2>
                    {party.businessName && party.name && (
                      <p className="text-xs font-bold text-slate-500">প্রতিনিধি: {party.name}</p>
                    )}
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      {party.address || '—'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {party.phone && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          <Phone className="w-3 h-3 text-slate-400" />{party.phone}
                        </span>
                      )}
                      {party.email && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          <Mail className="w-3 h-3 text-slate-400" />{party.email}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs pt-1">
                      <span className="text-slate-500 font-semibold">
                        {isCustomer ? 'গ্রাহক কোড:' : 'কোম্পানি কোড:'} <strong className="text-slate-800">{party.customerCode || party.supplierCode || (isCustomer ? 'CUS-0001' : 'SUP-0001')}</strong>
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md text-[10px]">সক্রিয়া</span>
                    </div>
                  </div>
                </div>

                {/* Middle Credit Info */}
                <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ক্রেডিট লিমিট</span>
                      <button className="text-[11px] font-bold text-slate-500 hover:text-orange-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">সীমা পরিবর্তন</button>
                    </div>
                    <p className="text-xl font-black text-slate-900 mt-0.5">৳ {(party.creditLimit || 50000).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 font-semibold block">ক্রেডিট সময়</span>
                      <span className="font-bold text-slate-800">{party.creditDays || 30} দিন</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">যোগদানের তারিখ</span>
                      <span className="font-bold text-slate-800">{party.joinedDate || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Current Due Highlight Box */}
                <div className="lg:col-span-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 space-y-2">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {isCustomer ? 'বর্তমান বকেয়া (Due)' : 'কোম্পানির পাওনা (Supplier Due)'}
                    </span>
                    <p className="text-3xl font-black text-rose-600 mt-0.5">৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-rose-200/50">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>{isCustomer ? 'মোট বিক্রি' : 'মোট ক্রয়'}</span>
                      <span className="text-slate-900">৳ {totalBill.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>মোট পরিশোধ</span>
                      <span className="text-emerald-600">৳ {totalPaid.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* MAIN PAGE LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT 9 COLUMNS SECTION */}
          <div className="lg:col-span-9 space-y-5">
            
            {/* 3. 4 METRIC CARDS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{isCustomer ? 'মোট চালান' : 'মোট ক্রয় ইনভয়েস'}</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{transactions.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">মোট পরিশোধ</p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">৳ {totalPaid.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{isCustomer ? 'বর্তমান বকেয়া' : 'কোম্পানির পাওনা'}</p>
                    <p className="text-2xl font-black text-rose-600 mt-0.5">৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">সর্বশেষ লেনদেন</p>
                    <p className="text-lg font-black text-slate-800 mt-0.5">
                      {ledgerEntries.length > 0 ? format(ledgerEntries[ledgerEntries.length - 1].date, 'dd মিই yyyy', { locale: bn }) : '—'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4. TRANSACTION PILL TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
              {[
                { id: 'all', label: `সব লেনদেন (${ledgerEntries.length})` },
                { id: 'sale', label: `চালান (${countBill})` },
                { id: 'receive', label: `রশিদ / পরিশোধ (${countPayment})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 5. FILTER TOOLBAR BAR */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                <div className="md:col-span-4 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">তারিখ পরিসর</span>
                  <div className="flex items-center gap-1.5 w-full bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="01/06/2026"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">-</span>
                    <input
                      type="text"
                      placeholder="25/06/2026"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">লেনদেনের ধরন</span>
                  <Select value={txnTypeFilter} onValueChange={(val: string | null) => setTxnTypeFilter(val || 'all')}>
                    <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-slate-50 border-slate-200">
                      <SelectValue placeholder="সব" />
                    </SelectTrigger>
                    <SelectContent className="text-xs font-bold">
                      <SelectItem value="all">সব</SelectItem>
                      <SelectItem value="sale">চালান</SelectItem>
                      <SelectItem value="payment">পেমেন্ট</SelectItem>
                      <SelectItem value="due">বকেয়া চালান</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 flex items-center gap-2">
                  <Input
                    placeholder="মেমো / রেফারেন্স দিয়ে খুঁজুন..."
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    className="h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                  <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-bold border-slate-200 bg-white hover:bg-slate-50">
                    <Filter className="w-3.5 h-3.5 mr-1" />ফিল্টার
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => { setStartDate(''); setEndDate(''); setTxnTypeFilter('all'); setLedgerSearch(''); setActiveTab('all'); }}
                    className="h-9 w-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>

              </div>
            </div>

            {/* 6. TRANSACTION TABLE CARD */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden print:border print:shadow-none">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-slate-700 text-xs font-black py-3.5 px-4 whitespace-nowrap">তারিখ ও সময়</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black whitespace-nowrap">লেনদেন নং</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black whitespace-nowrap">ধরন</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black min-w-[200px]">মেমো / বিবরণ</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black whitespace-nowrap">চালান নং</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black text-right whitespace-nowrap">ডেবিট (৳)</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black text-right whitespace-nowrap">ক্রেডিট (৳)</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black text-right whitespace-nowrap px-4">ব্যালেন্স (৳)</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black whitespace-nowrap">পেমেন্ট পদ্ধতি</TableHead>
                      <TableHead className="text-slate-700 text-xs font-black text-center whitespace-nowrap print:hidden">কর্ম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-16 text-slate-400 font-bold">লোড হচ্ছে...</TableCell></TableRow>
                    ) : filteredLedgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16 text-slate-400 font-bold">
                          কোনো লেনদেন পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : paginatedEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-xs">
                        <TableCell className="py-3 px-4 font-semibold text-slate-500 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>

                        <TableCell className="font-bold text-slate-800 whitespace-nowrap">
                          {entry.refNo}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {entry.type === 'SALE' || entry.type === 'PURCHASE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">
                              চালান
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">
                              পরিশোধ
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-700">
                          {entry.description}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-600 whitespace-nowrap">
                          {entry.invoiceNo || '—'}
                        </TableCell>

                        <TableCell className="text-right font-black text-rose-600 whitespace-nowrap">
                          {entry.debit > 0 ? entry.debit.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '—'}
                        </TableCell>

                        <TableCell className="text-right font-black text-emerald-600 whitespace-nowrap">
                          {entry.credit > 0 ? entry.credit.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '—'}
                        </TableCell>

                        <TableCell className="text-right py-3 px-4 font-black text-rose-600 whitespace-nowrap">
                          {entry.runningBalance.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-600 whitespace-nowrap">
                          {entry.paymentMethod || '—'}
                        </TableCell>

                        <TableCell className="text-center print:hidden">
                          <button className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              {/* PAGINATION FOOTER */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
                <div className="font-bold text-slate-600">
                  মোট <span className="text-slate-900 font-black">{filteredLedgerEntries.length}</span> টি লেনদেন
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronFirst className="w-4 h-4" />
                  </button>

                  <button
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center",
                        validCurrentPage === page
                          ? "bg-orange-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLast className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <span>প্রতি পেজে</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-8 rounded-lg border border-slate-200 text-xs font-bold px-2 bg-white text-slate-800"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </Card>

          </div>

          {/* RIGHT 3 COLUMNS SIDEBAR */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Widget 1: Aging Analysis */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-800 tracking-tight">
                  বকেয়ার বয়স অনুযায়ী বিশ্লেষণ
                </h3>

                <div className="flex flex-col items-center justify-center py-2 relative">
                  <div className="w-32 h-32 rounded-full border-8 border-rose-500 border-t-emerald-500 border-r-amber-500 border-b-blue-500 flex flex-col items-center justify-center text-center p-2 bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">মোট বকেয়া</span>
                    <span className="text-sm font-black text-slate-900 mt-0.5">৳ {totalDue > 0 ? totalDue.toLocaleString() : '0'}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-bold border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      0 - 30 দিন
                    </span>
                    <span className="text-slate-900">৳ {age0to30 > 0 ? age0to30.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '0.00'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block"></span>
                      31 - 60 দিন
                    </span>
                    <span className="text-slate-900">৳ {age31to60 > 0 ? age31to60.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '0.00'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      61 - 90 দিন
                    </span>
                    <span className="text-slate-900">৳ {age61to90 > 0 ? age61to90.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '0.00'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      90+ দিন
                    </span>
                    <span className="text-slate-900">৳ {age90plus > 0 ? age90plus.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '0.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Widget 2: Quick Actions */}
            <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-800 tracking-tight">
                  দ্রুত কার্যক্রম
                </h3>

                <div className="space-y-1.5 text-xs font-bold">
                  <Link href={isCustomer ? "/pos" : "/purchases"} className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <FilePlus className="w-4 h-4 text-emerald-600" />
                    <span>{isCustomer ? 'নতুন বিক্রি চালান তৈরি করুন' : 'নতুন ক্রয় ইনভয়েস তৈরি করুন'}</span>
                  </Link>

                  <button onClick={openGeneralPaymentModal} className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors text-left">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span>{isCustomer ? 'পেমেন্ট গ্রহণ করুন' : 'পেমেন্ট পরিশোধ করুন'}</span>
                  </button>

                  <Link href={isCustomer ? "/customers" : "/suppliers"} className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>{isCustomer ? 'গ্রাহক তালিকা' : 'কোম্পানি তালিকা'}</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Widget 3: Note Card */}
            <Card className="bg-amber-50/70 border border-amber-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-4 space-y-1.5">
                <h3 className="text-xs font-black text-amber-900 tracking-tight flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  নোট
                </h3>
                <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                  {party?.note || 'যে কোনো বিশেষ চুক্তি বা ছাড় আলোচনার নোট এখানে দেখতে পাবেন।'}
                </p>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* PAYMENT MODAL */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md rounded-3xl font-bengali p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-bengali text-xl font-black text-slate-900">
                  {isCustomer ? 'টাকা জমা নিন (Payment Receive)' : 'পেমেন্ট পরিশোধ (Supplier Payment)'}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isCustomer ? 'গ্রাহকের কাছ থেকে বকেয়া টাকা গ্রহণের বিস্তারিত' : 'সরবরাহকারীকে পাওনা টাকা পরিশোধের বিস্তারিত'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-1">
              <p className="text-rose-600 font-bengali text-xs font-bold uppercase tracking-wider">
                {isCustomer ? 'গ্রাহকের বর্তমান মোট বকেয়া' : 'কোম্পানির বর্তমান মোট পাওনা'}
              </p>
              <p className="text-3xl font-black text-rose-700 font-bengali">৳ {totalDue.toLocaleString()}</p>
            </div>

            {transactions.filter(o => (o.dueAmount || 0) > 0).length > 0 && (
              <div className="space-y-1">
                <Label className="font-bengali text-xs font-bold text-slate-700">যে ইনভয়েসের টাকা দিচ্ছেন</Label>
                <Select 
                  value={selectedTx?.id} 
                  onValueChange={(val: string | null) => {
                    const target = transactions.find(o => o.id === val);
                    if (target) {
                      setSelectedTx(target);
                      setPayAmount(target.dueAmount || 0);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-white font-bold text-xs border-slate-200">
                    <SelectValue placeholder="ইনভয়েস বাছুন" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 font-bengali">
                    {transactions.filter(o => (o.dueAmount || 0) > 0).map(o => (
                      <SelectItem key={o.id} value={o.id} className="text-xs font-bold">
                        #{o.id.slice(0, 8).toUpperCase()} - বকেয়া ৳{o.dueAmount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-bengali text-xs font-bold text-slate-700">টাকার পরিমাণ (৳) <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                value={payAmount || ''}
                onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="text-2xl font-black h-13 rounded-2xl text-center font-bengali text-emerald-600 focus:border-emerald-500 bg-slate-50/50"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsPayOpen(false)} className="flex-1 font-bengali h-11 rounded-xl font-bold text-slate-600">
              বাতিল
            </Button>
            <Button onClick={handlePaymentSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700 font-bengali h-11 rounded-xl font-black text-white shadow-md shadow-orange-600/20 active:scale-95 transition-all">
              <CreditCard className="w-4 h-4 mr-1.5" /> পেমেন্ট সংরক্ষণ করুন ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
