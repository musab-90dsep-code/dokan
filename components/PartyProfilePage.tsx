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
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { PurchaseInvoiceMemo } from '@/components/PurchaseInvoiceMemo';
import { PaymentVoucherMemo } from '@/components/PaymentVoucherMemo';
import { SalesInvoiceDetailsView } from '@/components/SalesInvoiceDetailsView';
import { PurchaseInvoiceDetailsView } from '@/components/PurchaseInvoiceDetailsView';
import { PaymentVoucherDetailsView } from '@/components/PaymentVoucherDetailsView';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { printElement } from '@/lib/printUtils';

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
  idType?: string;
  nid?: string;
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
  orderId?: string;
  invoiceNo?: string;
  customerName?: string; 
  customerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierName?: string; 
  supplierId?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items?: any[];
  paymentMethod?: string;
  chequeNo?: string;
  bankName?: string;
  chequeStatus?: 'pending' | 'cleared' | 'bounced';
  note?: string;
  notes?: string;
  transactionType?: string;
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  laborCost?: number;
  previousBalance?: number;
  description?: string;
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
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<TransactionDoc | null>(null);

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
          idType: (p as any).id_type || 'NID',
          nid: (p as any).nid || '',
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
          orderId: t.invoice_no || String(t.id),
          invoiceNo: t.invoice_no || (isCustomer ? `INV-2026-${String(t.id).padStart(6, '0')}` : `PUR-2026-${String(t.id).padStart(6, '0')}`),
          customerName: t.party_name || p.name,
          customerId: String(p.id),
          customerPhone: p.phone || '',
          customerAddress: p.address || '',
          supplierName: t.party_name || p.name,
          supplierId: String(p.id),
          supplierPhone: p.phone || '',
          supplierAddress: p.address || '',
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          items: t.items || [],
          paymentMethod: t.payment_method || 'cash',
          chequeNo: t.cheque_number,
          bankName: t.cheque_bank,
          chequeStatus: t.cheque_status,
          note: t.notes || (t as any).description || '',
          notes: t.notes || (t as any).description || '',
          transactionType: t.transaction_type || (isCustomer ? 'sale' : 'purchase'),
          subtotal: Number(t.subtotal || t.total_amount || 0),
          discount: Number(t.discount || 0),
          shippingCost: Number((t as any).shipping_cost || 0),
          laborCost: Number((t as any).labor_cost || 0),
          createdAt: t.created_at || new Date().toISOString()
        })));
      } catch (err) {
        console.error('Error loading party profile:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id, isCustomer]);

  const totalBill = transactions.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
  const totalPaid = transactions.reduce((a, o) => a + Number(o.paidAmount || 0), 0);
  const totalDue = party?.totalDue !== undefined && party?.totalDue > 0 
    ? party.totalDue 
    : Math.max(0, (party?.openingBalance || 0) + totalBill - totalPaid);

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

      // Build rich item breakdown text with quantity, unit & rate
      const itemDesc = tx.items && tx.items.length > 0
        ? tx.items.map((it: any) => {
            const name = it.name || 'পণ্য';
            const qty = toBnDigits(it.quantity || 1);
            const unit = it.unit || 'টি';
            const price = it.price ? `@ ৳${toBnDigits(it.price.toLocaleString('en-IN'))}` : '';
            return `${name} (${qty} ${unit} ${price})`.trim();
          }).join(', ')
        : (isCustomer ? 'পণ্য বিক্রয় (চালান)' : 'পণ্য ক্রয় (চালান)');

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

        // Detailed Payment Method & Status Tag
        let pMethodLabel = 'নগদ';
        if (tx.paymentMethod === 'bank') pMethodLabel = 'ব্যাংক ট্রান্সফার';
        else if (tx.paymentMethod === 'cheque' || tx.chequeNo) {
          pMethodLabel = `চেক (${tx.bankName ? tx.bankName + ' - ' : ''}নম্বর: ${tx.chequeNo || '—'})`;
        } else if (tx.paymentMethod === 'bkash' || tx.paymentMethod === 'mobile') {
          pMethodLabel = 'বিকাশ / মোবাইল ব্যাংকিং';
        }

        const payDesc = isCustomer 
          ? `টাকা প্রাপ্তি / পেমেন্ট জমা [পদ্ধতি: ${pMethodLabel}] (চালান: ${invNo})`
          : `পেমেন্ট পরিশোধ [পদ্ধতি: ${pMethodLabel}] (চালান: ${invNo})`;

        entries.push({
          id: `${tx.id}-credit`,
          date: txDate,
          refNo: rcvNo,
          type: 'PAYMENT',
          description: payDesc,
          invoiceNo: '—',
          debit: 0,
          credit: creditVal,
          runningBalance: cumulativeBalance,
          paymentMethod: pMethodLabel,
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
      {/* ========================================================= */}
      {/* 🖨️ DEDICATED A4 PRINTABLE CUSTOMER PROFILE & LEDGER MEMO */}
      {/* ========================================================= */}
      <div id="printable-memo-wrapper" className="hidden print:block printable-memo font-bengali text-slate-900 text-xs p-2 space-y-4 leading-normal">
        
        {/* 1. SHOP BRANDING HEADER */}
        <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">মেসার্স রড & সিমেন্ট স্টোর</h1>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">রড, সিমেন্ট ও মানসম্পন্ন নির্মাণ সামগ্রী পাইকারী ও খুচরা বিক্রেতা</p>
            <p className="text-[11px] text-slate-600 font-medium">উত্তর বাড্ডা, প্রগতি সরণি, ঢাকা-১২১২ | মোবাইল: ০১৭০০-০০০০০০, ০১৮০০-০০০০০০</p>
          </div>
          <div className="text-right space-y-1">
            <div className="inline-block bg-slate-900 text-white font-bold text-xs px-3 py-1 rounded">
              {isCustomer ? 'গ্রাহক খতিয়ান ও প্রোফাইল' : 'সরবরাহকারী খতিয়ান ও প্রোফাইল'}
            </div>
            <p className="text-[11px] font-semibold text-slate-600">প্রিন্ট তারিখ: {formatBnDate(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        {/* 2. CUSTOMER DETAILED PROFILE BOX */}
        {party && (
          <div className="border border-slate-800 rounded-lg p-3 space-y-2 bg-slate-50/30">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
              <h2 className="text-sm font-black text-slate-900 uppercase">
                {isCustomer ? 'গ্রাহকের তথ্য (Customer Profile)' : 'সরবরাহকারীর তথ্য (Supplier Profile)'}
              </h2>
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                আইডি: {party.customerCode || party.supplierCode || `CUST-${String(party.id).padStart(6, '0')}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-slate-500 font-bold">নাম / প্রোপ্রাইটর: </span>
                <span className="font-black text-slate-900">{party.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">প্রতিষ্ঠানের নাম: </span>
                <span className="font-bold text-slate-900">{party.businessName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">মোবাইল নম্বর: </span>
                <span className="font-bold text-slate-900">{toBnDigits(party.phone)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">বিকল্প মোবাইল: </span>
                <span className="font-bold text-slate-900">{party.altPhone ? toBnDigits(party.altPhone) : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">ইমেইল ঠিকানা: </span>
                <span className="font-bold text-slate-900">{party.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">ক্যাটাগরি / ধরন: </span>
                <span className="font-bold text-slate-900">{party.customerType || party.supplyType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-bold">ঠিকানা: </span>
                <span className="font-bold text-slate-900">
                  {party.address || ''} {party.thana ? `, ${party.thana}` : ''} {party.district ? `, ${party.district}` : ''} {party.postcode ? `- ${toBnDigits(party.postcode)}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">NID / TIN: </span>
                <span className="font-bold text-slate-900">{party.nid || party.tinNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">যোগদানের তারিখ: </span>
                <span className="font-bold text-slate-900">{party.joinedDate ? formatBnDate(party.joinedDate, 'dd MMMM yyyy') : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">ক্রেডিট লিমিট: </span>
                <span className="font-bold text-slate-900">৳ {party.creditLimit ? toBnDigits(party.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">বিশেষ নোট: </span>
                <span className="font-bold text-slate-900">{party.note || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. FINANCIAL SUMMARY STATS CARDS */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="border border-slate-400 rounded-md p-1.5 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-600 block uppercase">প্রারম্ভিক বকেয়া</span>
            <span className="font-black text-slate-900 text-xs block mt-0.5">
              ৳ {toBnDigits((party?.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
            </span>
          </div>
          <div className="border border-slate-400 rounded-md p-1.5 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-600 block uppercase">মোট বিক্রি / ডেবিট</span>
            <span className="font-black text-slate-900 text-xs block mt-0.5">
              ৳ {toBnDigits(totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
            </span>
          </div>
          <div className="border border-slate-400 rounded-md p-1.5 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-600 block uppercase">মোট জমা / ক্রেডিট</span>
            <span className="font-black text-emerald-800 text-xs block mt-0.5">
              ৳ {toBnDigits(totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
            </span>
          </div>
          <div className="border-2 border-slate-900 rounded-md p-1.5 bg-slate-100">
            <span className="text-[10px] font-black text-slate-900 block uppercase">সর্বমোট বর্তমান জের (বকেয়া)</span>
            <span className="font-black text-rose-700 text-sm block mt-0.5">
              ৳ {toBnDigits((totalDue + (party?.openingBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
            </span>
          </div>
        </div>

        {/* 4. COMPLETE CHRONOLOGICAL LEDGER TABLE */}
        <div className="space-y-1 pt-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-400 pb-1">
            পূর্ণাঙ্গ হিসাব খতিয়ান (Complete Account Ledger)
          </h3>
          
          <table className="w-full border-collapse border border-slate-400 text-[11px] text-left">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400">
                <th className="border border-slate-400 p-1.5 text-center w-8">#</th>
                <th className="border border-slate-400 p-1.5 w-24">তারিখ</th>
                <th className="border border-slate-400 p-1.5 w-24">রেফারেন্স / ভাউচার</th>
                <th className="border border-slate-400 p-1.5">বিবরণ / মালামালের বিবরণ</th>
                <th className="border border-slate-400 p-1.5 text-right w-24">ডেবিট (৳)</th>
                <th className="border border-slate-400 p-1.5 text-right w-24">ক্রেডিট (৳)</th>
                <th className="border border-slate-400 p-1.5 text-right w-24">অবশিষ্ট জের (৳)</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length > 0 ? (
                ledgerEntries.map((entry, idx) => (
                  <tr key={entry.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-1.5 text-center font-bold">{toBnDigits(idx + 1)}</td>
                    <td className="border border-slate-300 p-1.5">{formatBnDate(entry.date, 'dd/MM/yyyy')}</td>
                    <td className="border border-slate-300 p-1.5 font-bold font-mono">{entry.refNo}</td>
                    <td className="border border-slate-300 p-1.5 font-medium">{entry.description}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold">
                      {entry.debit > 0 ? toBnDigits(entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '—'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-800">
                      {entry.credit > 0 ? toBnDigits(entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '—'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-black">
                      ৳ {toBnDigits(entry.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-4 font-bold text-slate-500">
                    কোনো লেনদেনের তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-800 text-xs">
                <td colSpan={4} className="border border-slate-400 p-2 text-right">সর্বমোট জের (Total):</td>
                <td className="border border-slate-400 p-2 text-right">
                  ৳ {toBnDigits(totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                </td>
                <td className="border border-slate-400 p-2 text-right text-emerald-800">
                  ৳ {toBnDigits(totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                </td>
                <td className="border border-slate-400 p-2 text-right font-black text-rose-700">
                  ৳ {toBnDigits((totalDue + (party?.openingBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 5. AUTHORIZATION & SIGNATURE FOOTER */}
        <div className="pt-10 flex items-center justify-between text-xs font-bold text-slate-800">
          <div className="text-center w-36 border-t border-slate-800 pt-1">
            গ্রাহকের স্বাক্ষর
          </div>
          <div className="text-center w-36 border-t border-slate-800 pt-1">
            প্রস্তুতকারীর স্বাক্ষর
          </div>
          <div className="text-center w-44 border-t-2 border-slate-900 pt-1 font-black">
            স্বত্বাধিকারী / কর্তৃপক্ষ স্বাক্ষর
          </div>
        </div>

        <div className="text-[10px] text-center text-slate-500 font-medium pt-2 border-t border-slate-300">
          * এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল খতিয়ান বিবরণী | মেসার্স রড & সিমেন্ট স্টোর
        </div>

      </div>

      <div className="space-y-4 font-bengali pb-12 print:hidden">
        
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
                        /* eslint-disable-next-line @next/next/no-img-element */
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
                        সক্রিয়
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
                    <span className="text-[11px] font-medium text-slate-400 block">{isCustomer ? 'গ্রাহক আইডি' : 'সরবরাহকারী আইডি'}</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {party.customerCode || `${isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'}-${toBnDigits(String(party.id).padStart(6, '0'))}`}
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
                    <span className="text-[11px] font-medium text-slate-400 block">বাকি বা ঋণের সীমা</span>
                    <span className="text-xs font-bold text-blue-600 block mt-0.5">
                      ৳ {party.creditLimit ? toBnDigits(party.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}
                    </span>
                  </div>
                </div>

                {/* 4. DUE & TOTAL SALES */}
                <div className="border-t lg:border-t-0 lg:border-l border-slate-200/80 px-4 lg:px-5 py-0.5 self-stretch flex flex-col justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">মোট বকেয়া</span>
                    <span className="text-xs font-black text-rose-600 block mt-0.5">
                      ৳ {toBnDigits(totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">{isCustomer ? 'মোট বিক্রয়' : 'মোট ক্রয়'}</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      ৳ {toBnDigits(totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
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
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2 cursor-pointer">
                    <Printer className="w-3 h-3 text-slate-500" />লেজার প্রিন্ট
                  </Button>
                  <Button onClick={handlePrintLedger} variant="outline" className="w-full h-7 border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 px-2 cursor-pointer">
                    <Download className="w-3 h-3 text-slate-500" />পিডিএফ ডাউনলোড
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. NAVIGATION TABS BAR */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto bg-white rounded-t-2xl px-3 pt-1 shadow-2xs print:hidden">
          <button
            onClick={() => setActiveMainTab('profile')}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
              activeMainTab === 'profile'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>প্রোফাইল তথ্য</span>
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
            <span>লেজার (খতিয়ান)</span>
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
            <span>{isCustomer ? 'বিক্রয় তালিকা' : 'ক্রয় তালিকা'}</span>
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
            <span>পেমেন্ট ও জমা</span>
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
            <span>ডকুমেন্টস ও ফাইল</span>
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
            <span>মন্তব্য ও নোটস</span>
          </button>
        </div>

        {/* 3. TAB 1: PROFILE TAB CONTENT */}
        {activeMainTab === 'profile' && party && (
          <div className="space-y-5">
            
            {/* 2-Column Grid of Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CARD 1: 👤 মৌলিক তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      মৌলিক তথ্য
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">{isCustomer ? 'গ্রাহকের নাম' : 'কোম্পানি / প্রতিনিধির নাম'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isCustomer ? 'গ্রাহক আইডি' : 'সরবরাহকারী আইডি'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerCode || `${isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'}-${toBnDigits(String(party.id).padStart(6, '0'))}`}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">ব্যবসার নাম</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.businessName || party.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{isCustomer ? 'গ্রাহকের ধরন' : 'সরবরাহের ধরন'}</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.customerType || (isCustomer ? 'খুচরা গ্রাহক' : 'রড')}</span>
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
                      <span className="text-slate-500 font-medium block">বিকল্প ফোন নম্বর</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.altPhone ? toBnDigits(party.altPhone) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: 📍 ঠিকানা ও অবস্থান তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      ঠিকানা ও অবস্থান তথ্য
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
                      <span className="text-slate-500 font-medium block">পোস্ট কোড</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.postcode ? toBnDigits(party.postcode) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: 💳 আর্থিক পলিসি ও হিসাব তথ্য */}
              <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      আর্থিক পলিসি ও হিসাব তথ্য
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">প্রারম্ভিক বকেয়া</span>
                      <span className="font-bold text-slate-900 block mt-0.5">৳ {party.openingBalance ? toBnDigits(party.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">কমিশন বা ছাড় (%)</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.discountPercent ? toBnDigits(party.discountPercent) + '%' : '০%'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">মোট বকেয়া</span>
                      <span className="font-black text-rose-600 block mt-0.5">৳ {toBnDigits(totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">টিন বা লাইসেন্স নম্বর</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.tinNumber || party.nid || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">বাকি বা ঋণের সীমা</span>
                      <span className="font-bold text-slate-900 block mt-0.5">৳ {party.creditLimit ? toBnDigits(party.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '০.০০'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">পরিশোধের মেয়াদ</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{party.creditDays ? toBnDigits(party.creditDays) + ' দিন' : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: 👥 অন্যান্য তথ্য */}
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

            {/* CARD 5: 📄 ডকুমেন্টস (Documents) */}
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

                <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-bold text-slate-500">কোনো ফাইল বা ডকুমেন্ট যুক্ত করা হয়নি</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={() => toast.info('ডকুমেন্ট আপলোড সুবিধা শীঘ্রই চালু হচ্ছে')}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <span>নতুন ডকুমেন্ট আপলোড করুন</span>
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* TAB 2: LEDGER (হিসাব) TAB CONTENT - MATCHES IMAGE EXACTLY */}
        {activeMainTab === 'ledger' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Bengali Date Range Picker */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                  />

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
                        const matchingTx = transactions.find(t => t.id === entry.orderId);

                        return (
                          <TableRow 
                            key={entry.id} 
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => {
                              if (matchingTx) {
                                setSelectedInvoiceTx(matchingTx);
                              } else {
                                const isPayment = entry.type === 'PAYMENT';
                                setSelectedInvoiceTx({
                                  id: entry.orderId || entry.refNo || entry.id,
                                  orderId: entry.refNo,
                                  invoiceNo: entry.invoiceNo || entry.refNo,
                                  customerName: party?.name || 'সম্মানিত গ্রাহক',
                                  customerPhone: party?.phone || '',
                                  customerAddress: party?.address || '',
                                  supplierName: party?.name || 'সরবরাহকারী',
                                  supplierPhone: party?.phone || '',
                                  supplierAddress: party?.address || '',
                                  totalAmount: entry.debit > 0 ? entry.debit : entry.credit,
                                  paidAmount: isPayment ? entry.credit : (entry.debit - (entry.dueAmount || 0)),
                                  dueAmount: isPayment ? 0 : (entry.dueAmount !== undefined ? entry.dueAmount : entry.debit),
                                  items: [],
                                  paymentMethod: entry.paymentMethod || 'cash',
                                  transactionType: isPayment ? 'payment' : (isCustomer ? 'sale' : 'purchase'),
                                  createdAt: entry.date,
                                  description: entry.description
                                });
                              }
                            }}
                          >
                            <TableCell className="py-3.5 px-4 text-left text-slate-700 font-medium">
                              {formatBnDate(entry.date, 'dd MMMM yyyy')}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left font-mono font-bold text-blue-600 hover:underline">
                              <span className="inline-flex items-center gap-1">
                                {isSale ? <FileText className="w-3.5 h-3.5 text-emerald-600" /> : <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                                <span>{entry.refNo}</span>
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-left text-slate-800 font-bold max-w-sm">
                              <div className="leading-snug">
                                {entry.description}
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-rose-600">
                              {entry.credit > 0 ? `৳ ${toBnDigits(entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : '—'}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-bold text-emerald-600">
                              {entry.debit > 0 ? `৳ ${toBnDigits(entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : '—'}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-black text-rose-600">
                              ৳ {toBnDigits(entry.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {isSale ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <FileText className="w-3 h-3 text-emerald-600" />
                                  <span>{isCustomer ? 'বিক্রি (চালান)' : 'ক্রয় (চালান)'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-blue-100/90 text-blue-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                  <span>জমা (পেমেন্ট)</span>
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
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Bengali Date Range Picker */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                  />

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
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* 1. FILTER CONTROL BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Left Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Bengali Date Range Picker */}
                  <BengaliDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder="তারিখ ফিল্টার"
                  />

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

        {/* TAB 5: DOCUMENTS (ডকুমেন্টস) TAB CONTENT */}
        {activeMainTab === 'documents' && (
          <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <CardContent className="p-6 sm:p-10">
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">কোনো ফাইল বা ডকুমেন্ট যুক্ত করা হয়নি</h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    আপনার গ্রাহক বা সরবরাহকারীর সংগে সম্পর্কিত যেকোনো ডকুমেন্টস (যেমন: NID, Trade License, TIN ইত্যাদি) এখানে নিরাপদে আপলোড করে রাখতে পারেন।
                  </p>
                </div>
                <label className="cursor-pointer pt-2">
                  <input
                    type="file"
                    className="hidden"
                    onChange={() => toast.info('ডকুমেন্ট আপলোড সুবিধা শীঘ্রই চালু হচ্ছে')}
                  />
                  <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs h-9 px-4">
                    <Plus className="w-4 h-4" />
                    <span>নতুন ডকুমেন্ট আপলোড করুন</span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 6: NOTES (নোটস) TAB CONTENT */}
        {activeMainTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Column 1: অভ্যন্তরীণ নোট */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">অভ্যন্তরীণ নোট</h3>
                  {party?.createdAt && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      যুক্ত করার তারিখ: {toBnDigits(party.createdAt.split('T')[0])}
                    </span>
                  )}
                </div>

                {party?.note && party.note.trim() ? (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-amber-950 leading-relaxed whitespace-pre-wrap">
                      {party.note}
                    </p>
                    <div className="border-t border-amber-200/60 pt-2 flex items-center justify-between text-[11px] text-amber-900/80 font-medium">
                      <span>নিবন্ধিত নোট</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    কোনো অভ্যন্তরীণ নোট যুক্ত করা হয়নি
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 2: কল ইতিহাস */}
            <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">কল ইতিহাস</h3>
                </div>

                <div className="py-12 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  কোনো কল ইতিহাস সংরক্ষণ করা নেই
                </div>
              </CardContent>
            </Card>

          </div>
        )}

      </div>

      {/* 📄 INVOICE & TRANSACTION DETAILS VIEW MODAL */}
      <Dialog open={!!selectedInvoiceTx} onOpenChange={open => !open && setSelectedInvoiceTx(null)}>
        <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-2xl font-bengali">
          {selectedInvoiceTx && (
            <div className="space-y-4">
              {(() => {
                const isPaymentTx = selectedInvoiceTx.transactionType === 'payment' || 
                  selectedInvoiceTx.transactionType === 'income' || 
                  selectedInvoiceTx.transactionType === 'expense' || 
                  (!selectedInvoiceTx.items?.length && (selectedInvoiceTx.paidAmount > 0 || (selectedInvoiceTx as any).credit > 0) && selectedInvoiceTx.dueAmount === 0);

                if (isPaymentTx) {
                  const voucherData = {
                    id: selectedInvoiceTx.id,
                    voucherNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || selectedInvoiceTx.id,
                    type: (isCustomer ? 'income' : 'expense') as 'income' | 'expense',
                    partyName: isCustomer ? (selectedInvoiceTx.customerName || party?.name || 'গ্রাহক') : (selectedInvoiceTx.supplierName || party?.name || 'সরবরাহকারী'),
                    partyPhone: party?.phone || '',
                    partyAddress: party?.address || '',
                    amount: selectedInvoiceTx.paidAmount || selectedInvoiceTx.totalAmount,
                    paidAmount: selectedInvoiceTx.paidAmount || selectedInvoiceTx.totalAmount,
                    paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                    bankName: selectedInvoiceTx.bankName,
                    chequeNo: selectedInvoiceTx.chequeNo,
                    description: selectedInvoiceTx.description || selectedInvoiceTx.note || 'পেমেন্ট ভাউচার',
                    createdAt: selectedInvoiceTx.createdAt
                  };

                  return (
                    <>
                      <PaymentVoucherDetailsView
                        voucher={voucherData}
                        onBack={() => setSelectedInvoiceTx(null)}
                        onPrint={() => printElement('party-printable-payment-voucher')}
                      />
                      <div id="party-printable-payment-voucher" className="hidden print:block">
                        <PaymentVoucherMemo
                          voucher={voucherData}
                          showPrintButton={false}
                        />
                      </div>
                    </>
                  );
                }

                if (isCustomer) {
                  const invoiceData = {
                    id: selectedInvoiceTx.id,
                    invoiceNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || `INV-${String(selectedInvoiceTx.id).slice(0, 6).toUpperCase()}`,
                    orderId: selectedInvoiceTx.orderId || selectedInvoiceTx.id,
                    customerName: selectedInvoiceTx.customerName || party?.name || 'সম্মানিত গ্রাহক',
                    customerPhone: party?.phone || '',
                    customerAddress: party?.address || '',
                    totalAmount: selectedInvoiceTx.totalAmount,
                    paidAmount: selectedInvoiceTx.paidAmount,
                    dueAmount: selectedInvoiceTx.dueAmount,
                    items: (selectedInvoiceTx.items || []).map((it: any) => ({
                      name: it.name || 'পণ্য',
                      quantity: Number(it.quantity || 1),
                      price: Number(it.price || it.rate || 0),
                      unit: it.unit || 'টি',
                      totalPrice: Number(it.totalPrice || (it.quantity * it.price) || 0)
                    })),
                    createdAt: selectedInvoiceTx.createdAt,
                    paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                    note: selectedInvoiceTx.note || selectedInvoiceTx.notes || '',
                    subtotal: selectedInvoiceTx.subtotal || selectedInvoiceTx.totalAmount,
                    discount: selectedInvoiceTx.discount || 0,
                    shippingCost: selectedInvoiceTx.shippingCost || 0,
                    laborCost: selectedInvoiceTx.laborCost || 0,
                    previousBalance: Number(party?.openingBalance || 0)
                  };

                  return (
                    <>
                      <SalesInvoiceDetailsView
                        invoice={invoiceData}
                        onBack={() => setSelectedInvoiceTx(null)}
                        onPrint={() => printElement('party-printable-invoice-memo')}
                      />
                      <div id="party-printable-invoice-memo" className="hidden print:block">
                        <InvoiceMemo
                          invoice={invoiceData as any}
                          showPrintButton={false}
                        />
                      </div>
                    </>
                  );
                }

                const purchaseData = {
                  id: selectedInvoiceTx.id,
                  invoiceNo: selectedInvoiceTx.orderId || selectedInvoiceTx.invoiceNo || `PUR-${String(selectedInvoiceTx.id).slice(0, 6).toUpperCase()}`,
                  orderId: selectedInvoiceTx.orderId || selectedInvoiceTx.id,
                  supplierName: selectedInvoiceTx.supplierName || party?.name || 'সরবরাহকারী',
                  supplierPhone: party?.phone || '',
                  supplierAddress: party?.address || '',
                  totalAmount: selectedInvoiceTx.totalAmount,
                  paidAmount: selectedInvoiceTx.paidAmount,
                  dueAmount: selectedInvoiceTx.dueAmount,
                  items: (selectedInvoiceTx.items || []).map((it: any) => ({
                    name: it.name || 'পণ্য',
                    quantity: Number(it.quantity || 1),
                    price: Number(it.price || it.rate || 0),
                    unit: it.unit || 'টি',
                    totalPrice: Number(it.totalPrice || (it.quantity * it.price) || 0)
                  })),
                  createdAt: selectedInvoiceTx.createdAt,
                  paymentMethod: selectedInvoiceTx.paymentMethod || 'cash',
                  paymentStatus: selectedInvoiceTx.dueAmount <= 0 ? 'paid' : (selectedInvoiceTx.paidAmount || 0) > 0 ? 'partial' : 'unpaid',
                  note: selectedInvoiceTx.note || selectedInvoiceTx.notes || ''
                };

                return (
                  <>
                    <PurchaseInvoiceDetailsView
                      invoice={purchaseData}
                      onBack={() => setSelectedInvoiceTx(null)}
                      onPrint={() => printElement('party-printable-purchase-memo')}
                    />
                    <div id="party-printable-purchase-memo" className="hidden print:block">
                      <PurchaseInvoiceMemo
                        invoice={purchaseData as any}
                        showPrintButton={false}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
