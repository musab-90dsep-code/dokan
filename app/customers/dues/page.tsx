'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Receipt, Phone, MapPin, Search, Printer, FileDown, 
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Users, 
  Wallet, ChevronRight, Eye, RefreshCw, Filter, Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { generateLedgerEntries } from '@/components/PartyProfilePage';

interface CustomerDueItem {
  id: string;
  name: string;
  phone: string;
  address: string;
  businessName: string;
  dueAmount: number;
  advanceAmount: number;
  totalSales: number;
  totalPaid: number;
  invoiceCount: number;
  customerType?: string;
  joinedDate?: string;
}

const formatBnCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '০';
  const num = Math.round(Number(amount));
  return toBengaliDigits(num.toLocaleString('en-IN'));
};

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

export default function CustomerDuesPage() {
  const [customers, setCustomers] = useState<CustomerDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'due' | 'advance'>('due');
  const [sortBy, setSortBy] = useState<'due_desc' | 'due_asc' | 'name_asc'>('due_desc');

  const loadDuesData = async () => {
    try {
      setLoading(true);
      const partyList = await api.parties.list({ party_type: 'customer' });
      const transactions = await api.transactions.list().catch(() => []);

      // Build customer due records matching exact ledger logic
      const mapped: CustomerDueItem[] = partyList.map(c => {
        const cTransactions = transactions.filter(t => 
          String(t.party) === String(c.id) || 
          (t.party_name && String(t.party_name).trim().toLowerCase() === String(c.name).trim().toLowerCase())
        );

        const formattedTx = cTransactions.map(t => ({
          id: String(t.id || t.invoice_no),
          orderId: t.invoice_no || String(t.id),
          invoiceNo: t.invoice_no || `INV-2026-${String(t.id).padStart(6, '0')}`,
          customerName: t.party_name || c.name,
          customerId: String(c.id),
          customerPhone: c.phone || '',
          customerAddress: c.address || '',
          supplierName: t.party_name || c.name,
          supplierId: String(c.id),
          supplierPhone: c.phone || '',
          supplierAddress: c.address || '',
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
          transactionType: t.transaction_type || 'sale',
          subtotal: Number(t.subtotal || t.total_amount || 0),
          discount: Number(t.discount || 0),
          shippingCost: Number((t as any).shipping_cost || 0),
          laborCost: Number((t as any).labor_cost || 0),
          createdAt: t.created_at || (t as any).date || new Date().toISOString()
        }));

        const partyProfile = {
          id: String(c.id),
          name: c.name,
          openingBalance: Number(c.opening_balance || 0),
          createdAt: (c as any).created_at || '',
          joinedDate: c.joined_date
        };

        const ledger = generateLedgerEntries(partyProfile as any, formattedTx as any, true, false);
        const finalBalance = ledger.length > 0
          ? ledger[ledger.length - 1].runningBalance
          : Number(c.opening_balance || 0);

        let dueAmount = 0;
        let advanceAmount = 0;

        if (finalBalance > 0) {
          dueAmount = finalBalance;
        } else if (finalBalance < 0) {
          advanceAmount = Math.abs(finalBalance);
        }

        const salesTx = formattedTx.filter(t => t.transactionType === 'sale');
        const totalSales = salesTx.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
        const totalPaid = formattedTx.reduce((a, o) => a + Number(o.paidAmount || 0), 0);

        const addressParts = [
          c.address,
          (c as any).thana,
          (c as any).district
        ].filter(Boolean);
        const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : (c.address || '—');

        return {
          id: String(c.id),
          name: c.name,
          phone: c.phone || '00000000000',
          address: formattedAddress,
          businessName: c.business_name || '',
          dueAmount,
          advanceAmount,
          totalSales: totalSales || Number(c.total_sales || 0),
          totalPaid,
          invoiceCount: salesTx.length,
          customerType: c.customer_type || 'খুচরা গ্রাহক',
          joinedDate: c.joined_date
        };
      });

      setCustomers(mapped);
    } catch (e) {
      console.error('Error loading dues:', e);
      toast.error('বকেয়া তালিকা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      await loadDuesData();
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Separate due list and advance deposit list
  const dueCustomers = useMemo(() => {
    return customers.filter(c => c.dueAmount > 0);
  }, [customers]);

  const advanceCustomers = useMemo(() => {
    return customers.filter(c => c.advanceAmount > 0);
  }, [customers]);

  const totalDueSum = useMemo(() => {
    return dueCustomers.reduce((acc, c) => acc + c.dueAmount, 0);
  }, [dueCustomers]);

  const totalAdvanceSum = useMemo(() => {
    return advanceCustomers.reduce((acc, c) => acc + c.advanceAmount, 0);
  }, [advanceCustomers]);

  // Filtered & Sorted list for Screen Display
  const displayedCustomers = useMemo(() => {
    let list = customers;
    if (activeTab === 'due') {
      list = dueCustomers;
    } else if (activeTab === 'advance') {
      list = advanceCustomers;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'due_desc') return b.dueAmount - a.dueAmount;
      if (sortBy === 'due_asc') return a.dueAmount - b.dueAmount;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'bn');
      return 0;
    });
  }, [customers, dueCustomers, advanceCustomers, activeTab, searchQuery, sortBy]);

  const handlePrint = () => {
    printElement('customer-dues-printable-sheet');
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFFক্রমিক,নাম,ব্যবসা/প্রতিষ্ঠান,ঠিকানা,মোবাইল,বকেয়ার পরিমাণ (৳),অগ্রিম জমা (৳)\n";
    
    customers.forEach((c, idx) => {
      const name = `"${c.name.replace(/"/g, '""')}"`;
      const biz = `"${c.businessName.replace(/"/g, '""')}"`;
      const addr = `"${c.address.replace(/"/g, '""')}"`;
      const phone = `"${c.phone}"`;
      csvContent += `${idx + 1},${name},${biz},${addr},${phone},${c.dueAmount},${c.advanceAmount}\n`;
    });

    csvContent += `\n,,সর্বমোট বকেয়া,,,,${totalDueSum}\n`;
    csvContent += `,,সর্বমোট অগ্রিম জমা,,,,${totalAdvanceSum}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `মেসার্স_দেলোয়ার_এন্ড_ব্রাদার্স_বাকী_তালিকা_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ফাইল ডাউনলোড হয়েছে');
  };

  return (
    <Shell>
      {/* ========================================================================= */}
      {/* 🖥️ SCREEN VIEW: INTERACTIVE DASHBOARD & MANAGEMENT TABLE */}
      {/* ========================================================================= */}
      <div className="space-y-6 font-bengali print:hidden pb-12">
        
        {/* TOP BREADCRUMB & HEADER ACTION BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <Link href="/customers" className="hover:text-blue-600 transition-colors">কাস্টমার</Link>
              <span>&gt;</span>
              <span className="text-slate-700">বাকী ও জমার তালিকা</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
              <Receipt className="w-7 h-7 text-rose-600" /> গ্রাহকদের বাকী তালিকা
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              সকল কাস্টমারের বর্তমান বকেয়া ও অগ্রিম জমার হিসাব বিবরণী
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-slate-900/20 active:scale-95 transition-all text-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" /> তালিকা প্রিন্ট করুন
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-11 px-4 rounded-xl border-slate-300 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 mr-1.5 text-rose-600" /> পিডিএফ ডাউনলোড
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-11 px-4 rounded-xl border-slate-300 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> এক্সেল / সিএসভি
            </Button>

            <Button
              onClick={loadDuesData}
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-blue-600")} />
            </Button>
          </div>
        </div>

        {/* 4 TOP SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: মোট বাকি গ্রাহক */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-rose-200 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট বাকি গ্রাহক</p>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">
                  {toBengaliDigits(dueCustomers.length)} <span className="text-xs font-bold text-slate-400">জন</span>
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 2: সর্বমোট বাকি */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/70 text-rose-700 flex items-center justify-center font-bold flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">সর্বমোট পাওনা (বাকি)</p>
                <h3 className="text-2xl font-black text-rose-700 mt-0.5">
                  ৳ {formatBnCurrency(totalDueSum)}
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 3: অগ্রিম জমা গ্রাহক */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">অগ্রিম জমা গ্রাহক</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  {toBengaliDigits(advanceCustomers.length)} <span className="text-xs font-bold text-slate-400">জন</span>
                </h3>
              </div>
            </div>
          </Card>

          {/* CARD 4: সর্বমোট অগ্রিম জমা */}
          <Card className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট অগ্রিম জমা</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                  ৳ {formatBnCurrency(totalAdvanceSum)}
                </h3>
              </div>
            </div>
          </Card>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="গ্রাহকের নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-10 bg-slate-50/50 border-slate-200 text-xs font-bold w-full"
              />
            </div>

            {/* Segmented Tab Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('due')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'due' 
                    ? "bg-white text-rose-700 shadow-xs border border-rose-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                বাকি তালিকা ({toBengaliDigits(dueCustomers.length)})
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('advance')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'advance' 
                    ? "bg-white text-emerald-700 shadow-xs border border-emerald-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                অগ্রিম জমা ({toBengaliDigits(advanceCustomers.length)})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 md:flex-initial text-center",
                  activeTab === 'all' 
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                সব গ্রাহক ({toBengaliDigits(customers.length)})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full md:w-48 shrink-0">
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  <SelectItem value="due_desc">সর্বোচ্চ বাকি আগে</SelectItem>
                  <SelectItem value="due_asc">সর্বনিম্ন বাকি আগে</SelectItem>
                  <SelectItem value="name_asc">নাম অনুযায়ী (ক-ক্ষ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </Card>

        {/* DATA TABLE CONTAINER */}
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <TableRow>
                    <TableHead className="w-14 text-center font-black text-xs py-3.5">ক্র:</TableHead>
                    <TableHead className="font-black text-xs">গ্রাহকের নাম ও প্রতিষ্ঠান</TableHead>
                    <TableHead className="font-black text-xs">ঠিকানা</TableHead>
                    <TableHead className="font-black text-xs text-center">মোবাইল নম্বর</TableHead>
                    <TableHead className="font-black text-xs text-right">বকেয়া / জমার পরিমাণ</TableHead>
                    <TableHead className="w-24 text-center font-black text-xs">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold text-sm">
                        লোড হচ্ছে...
                      </TableCell>
                    </TableRow>
                  ) : displayedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Receipt className="w-10 h-10 mb-2 opacity-20" />
                          <p className="font-bold text-sm">কোনো রেকর্ড পাওয়া যায়নি</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedCustomers.map((c, idx) => (
                      <TableRow 
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors text-xs"
                      >
                        <TableCell className="text-center font-mono font-bold text-slate-600 py-3.5">
                          {toBengaliDigits(idx + 1)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-black text-slate-900 block text-[13px]">{c.name}</span>
                            {c.businessName && c.businessName !== c.name && (
                              <span className="text-[11px] text-slate-500 font-semibold block">{c.businessName}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 max-w-[200px] truncate" title={c.address}>
                          {c.address || '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-800">
                          {toBengaliDigits(c.phone)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">
                          {c.dueAmount > 0 ? (
                            <span className="text-rose-600">৳ {formatBnCurrency(c.dueAmount)}</span>
                          ) : c.advanceAmount > 0 ? (
                            <span className="text-emerald-600">৳ {formatBnCurrency(c.advanceAmount)} (জমা)</span>
                          ) : (
                            <span className="text-slate-400">০.০০</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link 
                            href={`/customers/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                          >
                            <Eye className="w-3 h-3" /> লেজার
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* TABLE SUMMARY FOOTER */}
            {!loading && displayedCustomers.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-700">
                <div>
                  মোট দেখানো হচ্ছে: <strong className="text-slate-900">{toBengaliDigits(displayedCustomers.length)}</strong> জন গ্রাহক
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    মোট বকেয়া: <strong className="text-rose-600">৳ {formatBnCurrency(displayedCustomers.reduce((a, b) => a + b.dueAmount, 0))}</strong>
                  </span>
                  {activeTab !== 'due' && (
                    <span>
                      মোট অগ্রিম জমা: <strong className="text-emerald-600">৳ {formatBnCurrency(displayedCustomers.reduce((a, b) => a + b.advanceAmount, 0))}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ========================================================================= */}
      {/* 🖨️ A4 PRINTABLE DUE LIST TEMPLATE (EXACT 1-TO-1 MATCH WITH USER PDF) */}
      {/* ========================================================================= */}
      <div 
        id="customer-dues-printable-sheet" 
        className="hidden print:block font-bengali text-black text-[13px] leading-tight p-2 space-y-6"
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        
        {/* ========================================================= */}
        {/* SECTION 1: বাকী তালিকা (DUE CUSTOMER LIST) */}
        {/* ========================================================= */}
        <div className="space-y-0">
          
          {/* HEADER BOX: মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা */}
          <div className="border border-black p-2.5 text-center bg-white space-y-1">
            <h1 className="text-lg font-black tracking-tight" style={{ fontSize: '18px', fontWeight: 900 }}>
              মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা
            </h1>
            <p className="text-xs font-bold" style={{ fontSize: '13px', fontWeight: 700 }}>
              বাকী তালিকা {formatBnDate(new Date(), 'dd MMMM - yyyy')}
            </p>
          </div>

          {/* TABLE: BAKI LIST */}
          <table 
            className="w-full border-collapse text-xs" 
            style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              border: '1px solid #000000',
              marginTop: '-1px'
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #000000', backgroundColor: '#ffffff' }}>
                <th style={{ width: '6%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                  ক্র:
                </th>
                <th style={{ width: '34%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 800 }}>
                  নাম
                </th>
                <th style={{ width: '24%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>
                  ঠিকানা
                </th>
                <th style={{ width: '18%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                  মোবাইল
                </th>
                <th style={{ width: '18%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>
                  টাকা
                </th>
              </tr>
            </thead>

            <tbody>
              {dueCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #000000', padding: '16px', textAlign: 'center', fontWeight: 700 }}>
                    বর্তমানে কোনো বকেয়া গ্রাহক নেই
                  </td>
                </tr>
              ) : (
                dueCustomers.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #000000', pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700 }}>
                      {toBengaliDigits(i + 1)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>
                      {c.name}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {c.address || '—'}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                      {toBengaliDigits(c.phone || '00000000000')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                      {formatBnCurrency(c.dueAmount)}
                    </td>
                  </tr>
                ))
              )}

              {/* TOTAL DUE FOOTER ROW */}
              <tr style={{ borderTop: '1px solid #000000', fontWeight: 900 }}>
                <td 
                  colSpan={4} 
                  style={{ 
                    border: '1px solid #000000', 
                    padding: '6px 8px', 
                    textAlign: 'center', 
                    fontWeight: 800,
                    fontSize: '13px'
                  }}
                >
                  মোট বাকি:
                </td>
                <td 
                  style={{ 
                    border: '1px solid #000000', 
                    padding: '6px 8px', 
                    textAlign: 'right', 
                    fontWeight: 900,
                    fontSize: '13px'
                  }}
                >
                  {formatBnCurrency(totalDueSum)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: অগ্রীম জমা আছে (ADVANCE DEPOSIT LIST) */}
        {/* ========================================================= */}
        {advanceCustomers.length > 0 && (
          <div className="space-y-0 pt-4" style={{ pageBreakBefore: dueCustomers.length > 25 ? 'always' : 'auto' }}>
            
            {/* HEADER BOX: অগ্রীম জমা আছে */}
            <div className="border border-black p-2.5 text-center bg-white space-y-1">
              <h2 className="text-base font-black tracking-tight" style={{ fontSize: '16px', fontWeight: 900 }}>
                মেসার্স দেলোয়ার এন্ড ব্রাদার্স গোপালগঞ্জ শাখা
              </h2>
              <p className="text-xs font-bold" style={{ fontSize: '13px', fontWeight: 700 }}>
                অগ্রীম জমা আছে
              </p>
            </div>

            {/* TABLE: ADVANCE LIST */}
            <table 
              className="w-full border-collapse text-xs" 
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                border: '1px solid #000000',
                marginTop: '-1px'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #000000', backgroundColor: '#ffffff' }}>
                  <th style={{ width: '6%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                    ক্র:
                  </th>
                  <th style={{ width: '34%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 800 }}>
                    নাম
                  </th>
                  <th style={{ width: '24%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>
                    ঠিকানা
                  </th>
                  <th style={{ width: '18%', border: '1px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 800 }}>
                    মোবাইল
                  </th>
                  <th style={{ width: '18%', border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>
                    টাকা
                  </th>
                </tr>
              </thead>

              <tbody>
                {advanceCustomers.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #000000', pageBreakInside: 'avoid' }}>
                    <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 700 }}>
                      {toBengaliDigits(i + 1)}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>
                      {c.name}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {c.address || '—'}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                      {toBengaliDigits(c.phone || '00000000000')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                      {formatBnCurrency(c.advanceAmount)}
                    </td>
                  </tr>
                ))}

                {/* TOTAL ADVANCE FOOTER ROW */}
                <tr style={{ borderTop: '1px solid #000000', fontWeight: 900 }}>
                  <td 
                    colSpan={4} 
                    style={{ 
                      border: '1px solid #000000', 
                      padding: '6px 8px', 
                      textAlign: 'center', 
                      fontWeight: 800,
                      fontSize: '13px'
                    }}
                  >
                    মোট অগ্রীম জমা আছে
                  </td>
                  <td 
                    style={{ 
                      border: '1px solid #000000', 
                      padding: '6px 8px', 
                      textAlign: 'right', 
                      fontWeight: 900,
                      fontSize: '13px'
                    }}
                  >
                    {formatBnCurrency(totalAdvanceSum)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </Shell>
  );
}

