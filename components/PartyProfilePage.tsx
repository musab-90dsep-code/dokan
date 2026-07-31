'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Phone, MapPin, Building2, Receipt, Download, Printer, FileSpreadsheet,
  CreditCard, ChevronLeft, ChevronRight, Filter, Calendar, RotateCcw,
  MoreVertical, ChevronFirst, ChevronLast, Mail, FileText,
  FilePlus, Edit3, UserCheck, MessageSquare, X, Truck, Users, Trash2,
  Plus, CheckCircle2, Clock, AlertCircle, Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export interface PartyProfile {
  id: string; 
  name: string; 
  phone: string; 
  altPhone?: string;
  address: string; 
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  postcode?: string;
  businessName?: string;
  email?: string;
  customerCode?: string;
  supplierCode?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  discountPercent?: number;
  tinNumber?: string;
  referencePerson?: string;
  joinedDate?: string;
  photoUrl?: string;
  customerType?: string;
  supplyType?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  totalDue?: number;
  totalSales?: number;
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
  account?: string;
}

export default function PartyProfilePage({ id, type }: { id: string; type: 'customer' | 'supplier' }) {
  const router = useRouter();
  const isCustomer = type === 'customer';

  const [party, setParty] = useState<PartyProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeMainTab, setActiveMainTab] = useState<'profile' | 'ledger' | 'sales' | 'payments' | 'documents' | 'notes'>('profile');

  // Payment Form Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionDoc | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');

  // Ledger Filter States
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
          altPhone: (p as any).alt_phone || '',
          address: p.address || '',
          country: (p as any).country || 'বাংলাদেশ',
          division: (p as any).division || 'ঢাকা',
          district: (p as any).district || 'ঢাকা',
          thana: (p as any).thana || '',
          postcode: (p as any).postcode || '',
          businessName: p.business_name || p.name,
          email: p.email || '',
          customerCode: (p as any).customer_code || `CUST-${String(p.id).padStart(6, '0')}`,
          supplierCode: (p as any).supplier_code || `SUP-${String(p.id).padStart(6, '0')}`,
          creditLimit: Number(p.credit_limit || 0),
          creditDays: p.credit_days || 30,
          openingBalance: Number(p.opening_balance || 0),
          discountPercent: Number(p.discount_percent || 0),
          tinNumber: (p as any).tin_number || (p as any).vat_tin || '',
          referencePerson: (p as any).reference_person || '',
          joinedDate: p.joined_date || (p as any).created_at || '',
          photoUrl: p.photo_url || '',
          customerType: p.customer_type || 'খুচরা গ্রাহক',
          supplyType: p.supply_type || '',
          note: p.note || '',
          createdBy: (p as any).created_by || 'এডমিন ইউজার',
          createdAt: (p as any).created_at || '',
          updatedAt: (p as any).updated_at || '',
          totalDue: Number(p.total_due || 0),
          totalSales: Number(p.total_sales || 0)
        });

        const txList = await api.transactions.list({ party: Number(id) });
        setTransactions(txList.map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || p.name,
          customerId: String(p.id),
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
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

  const totalBill = transactions.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
  const totalPaid = transactions.reduce((a, o) => a + Number(o.paidAmount || 0), 0);
  const totalDue = Math.max(0, totalBill - totalPaid);

  const formatBnDate = (dateVal: Date | string | undefined | null, pattern: string = 'dd MMMM yyyy') => {
    if (!dateVal) return '—';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      if (isNaN(d.getTime())) return String(dateVal);
      const raw = format(d, pattern, { locale: bn });
      return toBnDigits(raw);
    } catch {
      return '—';
    }
  };

  const handlePrintLedger = () => window.print();

  const handleDownloadCSV = () => {
    if (!party) return;
    let csvContent = "\uFEFFতারিখ,রেফারেন্স/আইডি,ধরণ,বিবরণ,চালান নং,ডেবিট/বিল (৳),ক্রেডিট/জমা (৳),অবশিষ্ট জের (৳),পেমেন্ট পদ্ধতি\n";
    ledgerEntries.forEach(entry => {
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

  const openGeneralPaymentModal = useCallback(() => {
    router.push(isCustomer 
      ? `/transactions?type=income&action=create&party=${id}` 
      : `/transactions?type=expense&action=create&party=${id}`
    );
  }, [router, isCustomer, id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        openGeneralPaymentModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openGeneralPaymentModal]);

  const handleDeleteParty = async () => {
    if (!confirm('আপনি কি নিশ্চিত যে এই গ্রাহককে মুছে ফেলতে চান?')) return;
    try {
      await api.parties.delete(id);
      toast.success('গ্রাহক সফলভাবে মুছে ফেলা হয়েছে');
      router.push(isCustomer ? '/customers' : '/suppliers');
    } catch {
      toast.error('গ্রাহক মুছতে সমস্যা হয়েছে');
    }
  };

  // Generate Chronological Ledger Entries
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

      const debitVal = Number(tx.totalAmount || 0);
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
        dueAmount: Number(tx.dueAmount || 0)
      });

      const creditVal = Number(tx.paidAmount || 0);
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
          dueAmount: Number(tx.dueAmount || 0)
        });
      }
    });

    return entries;
  };

  const ledgerEntries = generateLedger();

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

  return (
    <Shell>
      {/* Printable Header */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-slate-900 pb-4 font-bengali">
        <h1 className="text-3xl font-black text-slate-900">মেসার্স রড & সিমেন্ট স্টোর</h1>
        <p className="text-sm text-slate-600 mt-1">রড, সিমেন্ট ও নির্মাণ সামগ্রী | {isCustomer ? 'গ্রাহক প্রোফাইল ও লেজার' : 'কোম্পানি খতিয়ান'}</p>
        <div className="mt-3 bg-slate-100 p-2 rounded text-center border border-slate-300">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest">
            {party?.businessName || party?.name} ({party?.customerCode || 'CUST-0001'})
          </h2>
          <p className="text-xs text-slate-500">তারিখ: {formatBnDate(new Date(), 'dd MMMM yyyy')}</p>
        </div>
      </div>

      <div className="space-y-4 font-bengali pb-12">
        
        {/* TOP BACK NAVIGATION BAR */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>পিছনে ফিরে যান</span>
            </button>

            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              <Link href={isCustomer ? "/customers" : "/suppliers"} className="hover:text-blue-600 transition-colors">
                {isCustomer ? 'গ্রাহক তালিকা' : 'সাপ্লায়ার তালিকা'}
              </Link>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-slate-700 font-bold">{party?.businessName || party?.name}</span>
            </div>
          </div>

          <Button
            onClick={openGeneralPaymentModal}
            className={cn(
              "h-9 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95",
              isCustomer 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isCustomer ? '+ পেমেন্ট গ্রহণ' : '+ পেমেন্ট প্রদান'}</span>
          </Button>
        </div>

        {/* 1. TOP HEADER CARD - ULTRA COMPACT HEIGHT */}
        {party && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden print:hidden">
            <CardContent className="py-2.5 px-4 sm:px-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-0">
                
                {/* 1. PROFILE & CONTACT */}
                <div className="flex items-center gap-3 pr-4 lg:pr-5 py-0.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#F1E8FF] text-[#8B5CF6] font-bold text-xl flex items-center justify-center border border-[#E9D8FF]">
                      {party.photoUrl ? (
                        <img src={party.photoUrl} alt={party.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{(party.businessName || party.name)[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {party.businessName || party.name}
                      </h2>
                      <span className="inline-block bg-emerald-100/70 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        সক্রিয় গ্রাহক
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {toBnDigits(party.phone)}
                      </span>
                      {party.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {party.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {party.address || `${party.thana ? party.thana + ', ' : ''}${party.district || 'ঢাকা'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CLIENT ID */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">গ্রাহক আইডি</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {party.customerCode || `CUST-${String(party.id).padStart(6, '0')}`}
                    </span>
                  </div>
                </div>

                {/* 3. JOIN DATE & CREDIT LIMIT */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">যোগদানের তারিখ</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {party.joinedDate ? formatBnDate(party.joinedDate, 'dd MMMM yyyy') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">ক্রেডিট লিমিট</span>
                    <span className="text-xs font-bold text-blue-600 block mt-0.5">
                      ৳ {party.creditLimit ? party.creditLimit.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '০.০০'}
                    </span>
                  </div>
                </div>

                {/* 4. DUE & TOTAL SALES */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">বকেয়া (Due)</span>
                    <span className="text-xs font-black text-rose-600 block mt-0.5">
                      ৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">মোট বিক্রয়</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      ৳ {totalBill.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 5. ACTION BUTTONS 2x2 GRID FOR COMPACT HEIGHT */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 pl-0 lg:pl-5 py-0.5 grid grid-cols-2 gap-1.5 min-w-[240px]">
                  <Button
                    onClick={() => router.push(isCustomer ? `/customers?edit=${id}` : `/suppliers?edit=${id}`)}
                    className="w-full h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-2xs flex items-center justify-center gap-1 px-2 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />সম্পাদনা
                  </Button>
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2">
                    <Printer className="w-3 h-3 text-slate-500" />প্রিন্ট
                  </Button>
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2">
                    <Download className="w-3 h-3 text-slate-500" />PDF
                  </Button>
                  <Button onClick={handleDeleteParty} variant="outline" className="w-full h-7 border-rose-200 text-rose-600 font-bold text-[10px] rounded-lg hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center gap-1 px-2">
                    <Trash2 className="w-3 h-3 text-rose-500" />মুছুন
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. NAVIGATION TABS BAR - MATCHES USER SCREENSHOT */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto bg-white px-4 rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveMainTab('profile')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'profile'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>প্রোফাইল</span>
          </button>

          <button
            onClick={() => setActiveMainTab('ledger')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'ledger'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Receipt className="w-4 h-4" />
            <span>লেজার (হিসাব)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('sales')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'sales'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>বিক্রি</span>
          </button>

          <button
            onClick={() => setActiveMainTab('payments')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'payments'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>পেমেন্ট</span>
          </button>

          <button
            onClick={() => setActiveMainTab('documents')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'documents'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FilePlus className="w-4 h-4" />
            <span>ডকুমেন্টস</span>
          </button>

          <button
            onClick={() => setActiveMainTab('notes')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'notes'
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>নোটস</span>
          </button>
        </div>

        {/* 3. TAB 1: PROFILE TAB CONTENT - MATCHES IMAGE EXACTLY */}
        {activeMainTab === 'profile' && party && (
          <div className="space-y-5">
            
            {/* 2-Column Grid of Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CARD 1: 👤 মৌলিক তথ্য (Basic Information) */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      মৌলিক তথ্য (Basic Information)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">গ্রাহকের নাম</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">গ্রাহক আইডি</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerCode || `CUST-${String(party.id).padStart(6, '0')}`}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">ব্যবসার নাম</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.businessName || party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">গ্রাহক টাইপ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerType || 'খুচরা গ্রাহক'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">যোগাযোগের নম্বর</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{toBnDigits(party.phone)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">যোগদানের তারিখ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.joinedDate ? formatBnDate(party.joinedDate, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বিকল্প ফোন</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.altPhone ? toBnDigits(party.altPhone) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: 📍 ঠিকানা (Address Information) */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      ঠিকানা (Address Information)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">দেশ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.country || 'বাংলাদেশ'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">পূর্ণ ঠিকানা</span>
                      <span className="font-bold text-slate-900 block mt-0.5 leading-relaxed">{party.address || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বিভাগ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.division || 'ঢাকা'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">জেলা</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.district || 'ঢাকা'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">থানা</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.thana || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">পোস্টকোড</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.postcode ? toBnDigits(party.postcode) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: 💳 আর্থিক তথ্য (Financial Information) */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      আর্থিক তথ্য (Financial Information)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">ওপেনিং ব্যালেন্স</span>
                      <span className="font-bold text-slate-900 block mt-0.5">৳ {party.openingBalance ? party.openingBalance.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '০.০০'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">কমিশন (%)</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.discountPercent ? party.discountPercent + '%' : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বকেয়া (Due)</span>
                      <span className="font-black text-rose-600 block mt-0.5">৳ {totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">VAT / TIN</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.tinNumber || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">ক্রেডিট লিমিট</span>
                      <span className="font-bold text-slate-900 block mt-0.5">৳ {party.creditLimit ? party.creditLimit.toLocaleString('bn-BD', { minimumFractionDigits: 2 }) : '০.০০'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">পেমেন্ট মেয়াদ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.creditDays ? toBnDigits(party.creditDays) + ' দিন' : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: 👥 অন্যান্য তথ্য (Other Information) */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      অন্যান্য তথ্য (Other Information)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">রেফারেন্স ব্যক্তি</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.referencePerson || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">তৈরির তারিখ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.createdAt ? formatBnDate(party.createdAt, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">নোট</span>
                      <span className="font-bold text-slate-900 block mt-0.5 leading-relaxed">{party.note || 'কোনো বিশেষ নোট নেই'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">সর্বশেষ আপডেট</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.updatedAt ? formatBnDate(party.updatedAt, 'dd MMMM yyyy') : '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">এন্ট্রি করেছেন</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.createdBy || 'এডমিন ইউজার'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* CARD 5: 📄 ডকুমেন্টস (Documents) - MATCHES USER IMAGE */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    ডকুমেন্টস (Documents)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">trade_license.pdf</p>
                      <p className="text-[11px] text-slate-400 font-medium">245 KB</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">nid_card.jpg</p>
                      <p className="text-[11px] text-slate-400 font-medium">1.2 MB</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">tin_certificate.pdf</p>
                      <p className="text-[11px] text-slate-400 font-medium">312 KB</p>
                    </div>
                  </div>

                  <button className="p-3.5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 text-xs font-bold transition-all min-h-[58px]">
                    <Plus className="w-4 h-4" />
                    <span>নতুন ডকুমেন্ট আপলোড</span>
                  </button>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* TAB 2: LEDGER (হিসাব) TAB CONTENT - MATCHES IMAGE EXACTLY */}
        {activeMainTab === 'ledger' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Date Range Picker Pill */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                    <span className="text-slate-400 font-normal">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                  </div>

                  {/* Transaction Type Select */}
                  <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                    <SelectTrigger className="w-40 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="সব লেনদেন" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="all">সব লেনদেন</SelectItem>
                      <SelectItem value="sale">বিক্রি</SelectItem>
                      <SelectItem value="receive">পেমেন্ট</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={ledgerSearch}
                      onChange={e => setLedgerSearch(e.target.value)}
                      placeholder="বিবরণ খুঁজুন..."
                      className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Right Filter Button */}
                <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-white hover:bg-slate-50 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>ফিল্টার</span>
                </Button>
              </div>

              {/* 2. LEDGER TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">ভাউচার / ইনভয়েস</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">বিবরণ</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ডেবিট (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ক্রেডিট (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">ব্যালেন্স (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">ধরণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {paginatedEntries.length > 0 ? (
                      paginatedEntries.map(entry => {
                        const isSale = entry.type === 'SALE' || entry.type === 'PURCHASE';
                        return (
                          <TableRow key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                              {formatBnDate(entry.date, 'dd MMMM yyyy')}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline cursor-pointer">
                              {entry.refNo}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold max-w-xs truncate">
                              {entry.description}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600">
                              {entry.credit > 0 ? `৳ ${entry.credit.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                              {entry.debit > 0 ? `৳ ${entry.debit.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-black text-rose-600">
                              ৳ {entry.runningBalance.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {isSale ? (
                                <span className="inline-block bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  বিক্রি
                                </span>
                              ) : (
                                <span className="inline-block bg-blue-100/80 text-blue-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  পেমেন্ট
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          কোনো লেনদেনের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(filteredLedgerEntries.length)}</strong>টি লেনদেন দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={validCurrentPage === 1}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={validCurrentPage === 1}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    ‹
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(pNum => (
                    <Button
                      key={pNum}
                      variant={validCurrentPage === pNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pNum)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold p-0",
                        validCurrentPage === pNum
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {toBnDigits(pNum)}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validCurrentPage === totalPages}
                    className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600"
                  >
                    »
                  </Button>

                  <Select value={String(itemsPerPage)} onValueChange={val => setItemsPerPage(Number(val))}>
                    <SelectTrigger className="w-24 h-7 rounded-lg border-slate-200 text-xs font-bold ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="10">১০ / পেজ</SelectItem>
                      <SelectItem value="25">২৫ / পেজ</SelectItem>
                      <SelectItem value="50">৫০ / পেজ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* TAB 3: SALES (বিক্রি) TAB CONTENT - MATCHES IMAGE 1 EXACTLY */}
        {activeMainTab === 'sales' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Date Range Picker Pill */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                    <span className="text-slate-400 font-normal">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                  </div>

                  {/* Status Filter Dropdown */}
                  <Select defaultValue="all">
                    <SelectTrigger className="w-36 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="সব স্ট্যাটাস" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                      <SelectItem value="paid">পরিশোধিত</SelectItem>
                      <SelectItem value="due">বকেয়া</SelectItem>
                      <SelectItem value="partial">আংশিক পরিশোধিত</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search Input Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="ইনভয়েস / গ্রাহক / বিবরণ খুঁজুন..."
                      className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>

                  {/* Filter Button */}
                  <Button variant="outline" className="h-9 px-3.5 border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-white hover:bg-slate-50 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>ফিল্টার</span>
                  </Button>
                </div>

                {/* Right Action Button: + নতুন বিক্রি */}
                <Link href="/pos">
                  <Button className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>নতুন বিক্রি</span>
                  </Button>
                </Link>
              </div>

              {/* 2. SALES TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">ইনভয়েস নং</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">পণ্যর ধরণ</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">মোট পরিমাণ (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">প্রাপ্তি (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">বকেয়া (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">স্ট্যাটাস</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {transactions.length > 0 ? (
                      transactions.map(t => {
                        const due = t.dueAmount || (t.totalAmount - (t.paidAmount || 0));
                        const isPaid = due <= 0;
                        const isPartial = !isPaid && (t.paidAmount || 0) > 0;
                        return (
                          <TableRow key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline cursor-pointer">
                              INV-{t.id.slice(0, 6).toUpperCase()}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                              {formatBnDate(t.createdAt, 'dd MMMM yyyy')}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold">
                              সিমেন্ট / রড
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                              ৳ {t.totalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-slate-900">
                              ৳ {(t.paidAmount || 0).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600">
                              ৳ {due.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {isPaid ? (
                                <span className="inline-block bg-emerald-100/80 text-emerald-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  পরিশোধিত
                                </span>
                              ) : isPartial ? (
                                <span className="inline-block bg-yellow-100/80 text-yellow-800 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  আংশিক পরিশোধিত
                                </span>
                              ) : (
                                <span className="inline-block bg-amber-100/80 text-amber-700 font-bold text-[11px] px-3 py-0.5 rounded-full">
                                  বকেয়া
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              <button className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                                👁️
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                          কোনো বিক্রি চালানের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(transactions.length)}</strong>টি ইনভয়েস দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">«</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">‹</Button>
                  <Button className="w-7 h-7 rounded-lg text-xs font-bold p-0 bg-blue-600 text-white">১</Button>
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
        )}

        {/* TAB 4: PAYMENTS (পেমেন্ট) TAB CONTENT - MATCHES IMAGE 2 EXACTLY */}
        {activeMainTab === 'payments' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Date Range Picker Pill */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                    <span className="text-slate-400 font-normal">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-28"
                    />
                  </div>

                  {/* Payment Method Select */}
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="সব পেমেন্ট মেথড" />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs">
                      <SelectItem value="all">সব পেমেন্ট মেথড</SelectItem>
                      <SelectItem value="cash">ক্যাশ</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search Input Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="রেফারেন্স / বিবরণ খুঁজুন..."
                      className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Right Action Button: + টাকা গ্রহণ */}
                <Button onClick={openGeneralPaymentModal} className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>টাকা গ্রহণ</span>
                </Button>
              </div>

              {/* 2. PAYMENTS TABLE */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow className="text-xs text-slate-700 font-black">
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">রসিদ নং</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">পেমেন্ট মেথড</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">অ্যাকাউন্ট</TableHead>
                      <TableHead className="py-3 px-4 text-right font-black text-slate-900">টাকা (৳)</TableHead>
                      <TableHead className="py-3 px-4 text-left font-black text-slate-900">বিবরণ</TableHead>
                      <TableHead className="py-3 px-4 text-center font-black text-slate-900">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800 divide-y divide-slate-100">
                    {ledgerEntries.filter(e => e.type === 'PAYMENT').length > 0 ? (
                      ledgerEntries.filter(e => e.type === 'PAYMENT').map(p => (
                        <TableRow key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline cursor-pointer">
                            {p.refNo}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {formatBnDate(p.date, 'dd MMMM yyyy')}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold">
                            {p.paymentMethod || 'ক্যাশ'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-600 font-medium">
                            {p.account || '—'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                            ৳ {p.credit.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                            {p.description || 'ক্যাশ পেমেন্ট'}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            <button className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                              👁️
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          কোনো পেমেন্টের রেকর্ড পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 3. PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
                <div>
                  মোট <strong className="text-slate-900 font-bold">{toBnDigits(ledgerEntries.filter(e => e.type === 'PAYMENT').length)}</strong>টি লেনদেন দেখানো হচ্ছে
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">«</Button>
                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg border-slate-200 text-xs text-slate-600">‹</Button>
                  <Button className="w-7 h-7 rounded-lg text-xs font-bold p-0 bg-blue-600 text-white">১</Button>
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
        )}

        {/* TAB 5: DOCUMENTS (ডকুমেন্টস) TAB CONTENT - MATCHES IMAGE 1 EXACTLY */}
        {activeMainTab === 'documents' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Document 1: trade_license.pdf */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:shadow-xs transition-all relative">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-black text-xs shadow-2xs">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">trade_license.pdf</h4>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">Trade License</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-2">আপলোড: ১৬ মে ২০২৪</p>
                      <p className="text-[11px] text-slate-400 font-medium">সাইজ: 245 KB</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      👁️
                    </button>
                  </div>
                </div>

                {/* Document 2: nid_card.jpg */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:shadow-xs transition-all relative">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[10px] shadow-2xs">
                      IMG
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">nid_card.jpg</h4>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">National ID Card</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-2">আপলোড: ১৬ মে ২০২৪</p>
                      <p className="text-[11px] text-slate-400 font-medium">সাইজ: 1.2 MB</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      👁️
                    </button>
                  </div>
                </div>

                {/* Document 3: tin_certificate.pdf */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:shadow-xs transition-all relative">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-black text-xs shadow-2xs">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">tin_certificate.pdf</h4>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">TIN Certificate</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-2">আপলোড: ১৬ মে ২০২৪</p>
                      <p className="text-[11px] text-slate-400 font-medium">সাইজ: 312 KB</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors">
                      👁️
                    </button>
                  </div>
                </div>

                {/* Upload Box (Dashed Blue Border) */}
                <div className="border-2 border-dashed border-blue-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/40 transition-all space-y-2 bg-blue-50/10 min-h-[190px]">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-blue-600">নতুন ডকুমেন্ট আপলোড করুন</h4>
                  <p className="text-[10px] text-slate-400 font-medium">PDF, JPG, PNG (সর্বোচ্চ 5MB)</p>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 6: NOTES (নোটস) TAB CONTENT - MATCHES IMAGE 2 EXACTLY */}
        {activeMainTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Column 1: অভ্যন্তরীণ নোট */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">অভ্যন্তরীণ নোট</h3>

                {/* Note Card 1 */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-amber-950 leading-relaxed">
                    এই গ্রাহক নিয়মিত এবং ভালো মানের পেমেন্ট করে থাকেন। বিশেষ ছাড় দেওয়া যেতে পারে।
                  </p>
                  <div className="border-t border-amber-200/60 pt-2 flex items-center justify-between text-[11px] text-amber-900/80 font-medium">
                    <span>এডমিন ইউজার | ১০ মে ২০২৪, ১১:৩০ AM</span>
                    <div className="flex items-center gap-2">
                      <button className="text-slate-500 hover:text-slate-800 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button className="text-rose-500 hover:text-rose-700 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note Card 2 */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-amber-950 leading-relaxed">
                    নতুন প্রকল্পে ৫০ ব্যাগ সিমেন্ট সরবরাহ করতে হবে।
                  </p>
                  <div className="border-t border-amber-200/60 pt-2 flex items-center justify-between text-[11px] text-amber-900/80 font-medium">
                    <span>এডমিন ইউজার | ০২ মে ২০২৪, ০৩:১৫ PM</span>
                    <div className="flex items-center gap-2">
                      <button className="text-slate-500 hover:text-slate-800 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button className="text-rose-500 hover:text-rose-700 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add Note Button */}
                <Button variant="outline" className="h-9 px-4 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-xl flex items-center gap-1.5 mt-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>নতুন নোট যোগ করুন</span>
                </Button>
              </CardContent>
            </Card>

            {/* Column 2: কল ইতিহাস */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">কল ইতিহাস</h3>

                {/* Call Logs Table */}
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                      <TableRow className="text-xs text-slate-700 font-black">
                        <TableHead className="py-3 px-4 text-left font-black text-slate-900">তারিখ ও সময়</TableHead>
                        <TableHead className="py-3 px-4 text-left font-black text-slate-900">কথোপকথনের বিষয়</TableHead>
                        <TableHead className="py-3 px-4 text-left font-black text-slate-900">কথা বলেছেন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                      <TableRow className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3 px-4 text-slate-600">১০ মে ২০২৪, ১১:৩০ AM</TableCell>
                        <TableCell className="py-3 px-4 font-bold text-slate-900">ইনভয়েস ও পেমেন্ট সম্পর্কে কথা</TableCell>
                        <TableCell className="py-3 px-4 text-slate-600">এডমিন</TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3 px-4 text-slate-600">০৪ মে ২০২৪, ০৩:৫৫ PM</TableCell>
                        <TableCell className="py-3 px-4 font-bold text-slate-900">পেমেন্ট কনফার্ম</TableCell>
                        <TableCell className="py-3 px-4 text-slate-600">এডমিন</TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3 px-4 text-slate-600">০২ মে ২০২৪, ০৫:১০ PM</TableCell>
                        <TableCell className="py-3 px-4 font-bold text-slate-900">নতুন অর্ডার</TableCell>
                        <TableCell className="py-3 px-4 text-slate-600">এডমিন</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Add Call Log Button */}
                <Button variant="outline" className="h-9 px-4 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-xl flex items-center gap-1.5 mt-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>নতুন কল লগ যোগ করুন</span>
                </Button>
              </CardContent>
            </Card>

          </div>
        )}

      </div>
    </Shell>
  );
}
