'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  RotateCcw, Search, Plus, Package, User, DollarSign, FileText, X, 
  ShoppingCart, AlertCircle, Trash2, ArrowRight, CheckCircle2, RefreshCw, Calendar,
  Filter, ChevronUp, ChevronDown, ArrowLeft, Lightbulb
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';

interface ReturnEntry {
  id: string;
  customerName: string;
  customerId: string;
  totalReturnValue: number;
  totalNewTakenValue: number;
  netRefundValue: number;
  dueAdjusted: number;
  cashRefundPaid: number;
  returnedItems: ReturnItem[];
  newTakenItems: ReturnItem[];
  reason: string;
  createdAt: any;
}

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  sellPrice: number;
  stock: number;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalDue?: number;
}

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('সব');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minRefund, setMinRefund] = useState('');
  const [maxRefund, setMaxRefund] = useState('');

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterType('সব');
    setMinRefund('');
    setMaxRefund('');
  };
  
  // New Return Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [returnCart, setReturnCart] = useState<ReturnItem[]>([]);
  const [newTakenCart, setNewTakenCart] = useState<ReturnItem[]>([]);

  // Item selector helpers
  const [selectedCascadingReturnProduct, setSelectedCascadingReturnProduct] = useState<SelectedProductDetails | null>(null);
  const [returnProdId, setReturnProdId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnPrice, setReturnPrice] = useState(0);

  const [selectedCascadingNewProduct, setSelectedCascadingNewProduct] = useState<SelectedProductDetails | null>(null);
  const [newProdId, setNewProdId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  const [reason, setReason] = useState('');
  const [cashRefundInput, setCashRefundInput] = useState(0);

  const loadReturnsData = async () => {
    try {
      setLoading(true);
      const returnsList = await api.transactions.list({ transaction_type: 'sale_return' });
      const mappedReturns: ReturnEntry[] = returnsList.map(r => ({
        id: String(r.id),
        customerName: r.party_name || 'সাধারণ গ্রাহক',
        customerId: String(r.party || ''),
        totalReturnValue: r.total_amount,
        totalNewTakenValue: 0,
        netRefundValue: r.total_amount,
        dueAdjusted: r.due_amount,
        cashRefundPaid: r.paid_amount,
        returnedItems: (r.items || []).map(i => ({
          id: String(i.product || ''),
          name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          unit: i.unit || 'পিস'
        })),
        newTakenItems: [],
        reason: r.notes || 'পণ্য ফেরত',
        createdAt: r.created_at
      }));

      setReturns(mappedReturns);

      const partyList = await api.parties.list({ party_type: 'customer' });
      setCustomers(partyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        totalDue: Number(p.total_due || 0)
      })));

      const prodList = await api.inventory.list();
      setProducts(prodList.map(p => ({
        id: String(p.id),
        name: p.name,
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস'
      })));
    } catch (err) {
      console.error('Error loading returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadReturnsData();
    })();
    return () => { ignore = true; };
  }, []);

  const formatDate = (at: any) => {
    if (!at) return '';
    try {
      const date = at?.toDate ? at.toDate() : new Date(at);
      if (isNaN(date.getTime())) return '';
      return toBengaliDigits(format(date, 'dd MMM yyyy, hh:mm a', { locale: bn }));
    } catch {
      return '';
    }
  };

  // Add Item to Returned Items Cart
  const handleAddReturnItem = () => {
    const itemName = selectedCascadingReturnProduct?.name || products.find(p => p.id === returnProdId)?.name;
    if (!itemName) {
      toast.error('ফেরতকৃত পণ্য নির্বাচন করুন');
      return;
    }

    const itemUnitToUse = selectedCascadingReturnProduct?.unit || 'পিস';
    const itemId = selectedCascadingReturnProduct?.productId || returnProdId || String(Date.now());
    const finalPrice = returnPrice || selectedCascadingReturnProduct?.price || 0;

    const existingIdx = returnCart.findIndex(i => i.name === itemName);
    if (existingIdx > -1) {
      const updated = [...returnCart];
      updated[existingIdx].quantity += returnQty;
      updated[existingIdx].price = finalPrice;
      setReturnCart(updated);
    } else {
      setReturnCart([...returnCart, {
        id: itemId,
        name: itemName,
        quantity: returnQty,
        price: finalPrice,
        unit: itemUnitToUse
      }]);
    }
    setReturnProdId('');
    setReturnQty(1);
    setReturnPrice(0);
    setSelectedCascadingReturnProduct(null);
    toast.success('ফেরত পণ্য যোগ করা হয়েছে');
  };

  // Add Item to New Taken Items Cart
  const handleAddNewItem = () => {
    const itemName = selectedCascadingNewProduct?.name || products.find(p => p.id === newProdId)?.name;
    if (!itemName) {
      toast.error('নতুন নেওয়া পণ্য নির্বাচন করুন');
      return;
    }

    const itemUnitToUse = selectedCascadingNewProduct?.unit || products.find(p => p.id === newProdId)?.unit || 'পিস';
    const itemId = selectedCascadingNewProduct?.productId || newProdId || String(Date.now());
    const finalPrice = newPrice || selectedCascadingNewProduct?.price || 0;

    const stockAvailable = selectedCascadingNewProduct?.stock ?? products.find(p => p.id === newProdId)?.stock ?? 99999;
    if (newQty > stockAvailable) {
      toast.error(`স্টকে পর্যাপ্ত পণ্য নেই (মজুদ: ${stockAvailable})`);
      return;
    }

    const existingIdx = newTakenCart.findIndex(i => i.name === itemName);
    if (existingIdx > -1) {
      const updated = [...newTakenCart];
      updated[existingIdx].quantity += newQty;
      updated[existingIdx].price = finalPrice;
      setNewTakenCart(updated);
    } else {
      setNewTakenCart([...newTakenCart, {
        id: itemId,
        name: itemName,
        quantity: newQty,
        price: finalPrice,
        unit: itemUnitToUse
      }]);
    }
    setNewProdId('');
    setNewQty(1);
    setNewPrice(0);
    setSelectedCascadingNewProduct(null);
    toast.success('নতুন পণ্য যোগ করা হয়েছে');
  };

  // Financial Calculations
  const totalReturnedValue = returnCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalNewTakenValue = newTakenCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const netRefundValue = totalReturnedValue - totalNewTakenValue;

  const selectedCust = customers.find(c => c.id === selectedCustomerId);
  const currentDue = selectedCust?.totalDue || 0;
  const dueAdjusted = netRefundValue > 0 ? Math.min(currentDue, netRefundValue) : 0;
  const cashRefundPaid = netRefundValue > 0 ? (netRefundValue - dueAdjusted) : 0;
  const newCustomerDue = netRefundValue > 0 
    ? Math.max(0, currentDue - dueAdjusted)
    : currentDue + Math.abs(netRefundValue);

  // Submit Sales Return
  const handleSubmitReturnForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('কাস্টমার নির্বাচন করুন');
      return;
    }
    if (returnCart.length === 0) {
      toast.error('কমপক্ষে ১টি ফেরত পণ্য যুক্ত করুন');
      return;
    }

    try {
      // 1. Submit Sales Return for Returned Items (Stock IN)
      await api.transactions.create({
        party: Number(selectedCustomerId),
        transaction_type: 'sale_return',
        total_amount: totalReturnedValue,
        paid_amount: cashRefundPaid,
        due_amount: Math.max(0, totalReturnedValue - cashRefundPaid),
        items: returnCart.map(item => {
          const numId = Number(item.id);
          return {
            product: !isNaN(numId) && numId > 0 ? numId : null,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            total: item.price * item.quantity
          };
        }),
        notes: reason || 'পণ্য ফেরত'
      });

      // 2. If new items were taken, submit Sales Transaction for New Taken Items (Stock OUT)
      if (newTakenCart.length > 0) {
        await api.transactions.create({
          party: Number(selectedCustomerId),
          transaction_type: 'sale',
          total_amount: totalNewTakenValue,
          paid_amount: 0,
          due_amount: totalNewTakenValue,
          items: newTakenCart.map(item => {
            const numId = Number(item.id);
            return {
              product: !isNaN(numId) && numId > 0 ? numId : null,
              product_name: item.name,
              quantity: item.quantity,
              price: item.price,
              unit: item.unit,
              total: item.price * item.quantity
            };
          }),
          notes: `রিটার্ন এক্সচেঞ্জ ক্রয় (রিটার্ন: ${reason || 'পণ্য ফেরত'})`
        });
      }

      toast.success('বিক্রয় রিটার্ন ও স্টক সমন্বয় সফলভাবে সম্পন্ন হয়েছে!');
      setIsOpen(false);
      setSelectedCustomerId('');
      setReturnCart([]);
      setNewTakenCart([]);
      setReason('');
      setSelectedCascadingReturnProduct(null);
      setSelectedCascadingNewProduct(null);
      loadReturnsData();
    } catch (err: any) {
      console.error(err);
      toast.error('রিটার্ন সম্পন্ন করতে সমস্যা হয়েছে: ' + (err.message || err));
    }
  };

  const filteredReturns = returns.filter(r => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      r.customerName.toLowerCase().includes(searchLower) ||
      (r as any).customerPhone?.includes(search) ||
      r.returnedItems?.some(i => i.name.toLowerCase().includes(searchLower));

    let matchesDate = true;
    if (startDate || endDate) {
      const returnDateStr = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '';
      if (startDate && returnDateStr < startDate) matchesDate = false;
      if (endDate && returnDateStr > endDate) matchesDate = false;
    }

    let matchesType = true;
    if (filterType === 'ক্যাশ ফেরত') {
      matchesType = (r.cashRefundPaid || 0) > 0;
    } else if (filterType === 'বকেয়া কাটা') {
      matchesType = (r.dueAdjusted || 0) > 0;
    }

    let matchesAmount = true;
    const val = r.netRefundValue || r.totalReturnValue || 0;
    if (minRefund && val < parseFloat(minRefund)) matchesAmount = false;
    if (maxRefund && val > parseFloat(maxRefund)) matchesAmount = false;

    return Boolean(matchesSearch) && matchesDate && matchesType && matchesAmount;
  });

  const totalRefundAmountSum = returns.reduce((sum, r) => sum + (r.netRefundValue || r.totalReturnValue || 0), 0);

  return (
    <Shell>
      {!isOpen ? (
        <div className="space-y-5 animate-in fade-in duration-300 font-bengali pb-10">
          
          {/* Top Title & Header Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-7 h-7 text-blue-600" /> বিক্রয় ফেরত (Sales Return) ড্যাশবোর্ড
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">পণ্য ফেরত, স্টক পুনঃসংযোজন ও কাস্টমার বকেয়া সামঞ্জস্যের হিসাব</p>
            </div>
            
            <Button 
              onClick={() => setIsOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bengali h-10 px-5 rounded-md font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />নতুন বিক্রয় রিটার্ন তৈরি করুন
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-md flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">মোট সেলস রিটার্ন সংখ্যা</p>
                  <p className="text-xl font-black mt-0.5 text-slate-900">{returns.length} টি</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-md flex items-center justify-center bg-rose-50 text-rose-600 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">মোট ফেরত মূল্য (রিফান্ড / বকেয়া এডজাস্ট)</p>
                  <p className="text-xl font-black mt-0.5 text-rose-600">৳ {totalRefundAmountSum.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COMPACT & EFFICIENT FILTER CARD */}
          <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white p-4 font-bengali space-y-3">
            {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Unified Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="কাস্টমার নাম, ফোন বা ফেরতকৃত পণ্যের নাম দিয়ে খুঁজুন..."
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
                  title="রিটার্ন শুরুর তারিখ"
                />
                <span className="text-slate-300 text-xs font-bold">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28 cursor-pointer"
                  title="রিটার্ন শেষের তারিখ"
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

              {/* Quick Status / Refund Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {[
                  { id: 'সব', label: 'সব রিটার্ন' },
                  { id: 'ক্যাশ ফেরত', label: 'ক্যাশ ফেরত' },
                  { id: 'বকেয়া কাটা', label: 'বকেয়া কাটা' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterType(p.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                      filterType === p.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
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

                {(search || startDate || endDate || filterType !== 'সব' || minRefund || maxRefund) && (
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
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                {/* Refund Amount Range */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">ফেরত মূল্য রেঞ্জ (৳)</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="সর্বনিম্ন (৳)"
                      value={minRefund}
                      onChange={e => setMinRefund(e.target.value)}
                      className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    />
                    <span className="text-slate-300 text-xs">-</span>
                    <Input
                      placeholder="সর্বোচ্চ (৳)"
                      value={maxRefund}
                      onChange={e => setMaxRefund(e.target.value)}
                      className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Sales Returns Table */}
          <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white overflow-hidden">
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bengali text-slate-900 text-xs font-black py-3 px-4 uppercase">তারিখ</TableHead>
                    <TableHead className="font-bengali text-slate-900 text-xs font-black uppercase">কাস্টমারের নাম</TableHead>
                    <TableHead className="font-bengali text-slate-900 text-xs font-black uppercase">ফেরতকৃত পণ্য</TableHead>
                    <TableHead className="font-bengali text-slate-900 text-xs font-black uppercase">নতুন নেওয়া পণ্য</TableHead>
                    <TableHead className="font-bengali text-slate-900 text-xs font-black text-right uppercase">মোট ফেরত মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-900 text-xs font-black text-right py-3 px-4 uppercase">বকেয়া কর্তন / ক্যাশ ফেরত</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bold text-sm">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <RotateCcw className="w-10 h-10 mb-2 opacity-20" />
                          <p className="font-bold text-sm">কোনো বিক্রয় রিটার্ন রেকর্ড পাওয়া যায়নি</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredReturns.map(r => (
                    <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-3 px-4 text-xs text-slate-600 font-medium">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="font-black text-slate-900 text-xs">
                        {r.customerName}
                        {(r as any).customerPhone && <p className="text-[10px] text-slate-400 font-semibold">{(r as any).customerPhone}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {r.returnedItems?.map((item, idx) => (
                            <div key={idx} className="text-xs font-bold text-rose-700">
                              • {item.name} ({item.quantity} {item.unit})
                            </div>
                          )) || <span className="text-slate-400 text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {r.newTakenItems && r.newTakenItems.length > 0 ? (
                            r.newTakenItems.map((item, idx) => (
                              <div key={idx} className="text-xs font-bold text-emerald-700">
                                + {item.name} ({item.quantity} {item.unit})
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">কোনো পণ্য নেননি</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-600 text-sm">
                        ৳ {(r.totalReturnValue || r.netRefundValue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right py-3 px-4">
                        <div className="text-xs">
                          {r.dueAdjusted > 0 && (
                            <span className="block font-bold text-blue-700">বকেয়া কাটা: ৳ {r.dueAdjusted.toLocaleString()}</span>
                          )}
                          {r.cashRefundPaid > 0 && (
                            <span className="block font-bold text-rose-600">ক্যাশ ফেরত: ৳ {r.cashRefundPaid.toLocaleString()}</span>
                          )}
                          {r.dueAdjusted === 0 && r.cashRefundPaid === 0 && (
                            <span className="font-bold text-emerald-600">সমপরিমাণ অ্যাডজাস্ট</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      ) : (
        /* CREATE SALES RETURN IN-PAGE VIEW (Direct Page View, Framed Container) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">
                    SALES RETURN FORM (বিক্রয় ফেরত)
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    নতুন বিক্রয় রিটার্ন ও বকেয়া এডজাস্টমেন্ট
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* MAIN FORM CONTENT */}
            <form onSubmit={handleSubmitReturnForm} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT 8 COLUMNS: FORM STEPS */}
                <div className="lg:col-span-8 space-y-5">
                  
                  {/* STEP 1: Select Customer */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" /> ১. কাস্টমার নির্বাচন করুন (Customer)
                        </Label>
                        {selectedCust && (
                          <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-md border border-amber-200">
                            বর্তমান মোট বকেয়া: ৳ {(selectedCust.totalDue || 0).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600">কাস্টমার নির্বাচন করুন <span className="text-rose-500">*</span></Label>
                          <CustomerSearchSelect
                            customers={customers}
                            selectedCustomer={customers.find(c => c.id === selectedCustomerId) || null}
                            onSelectCustomer={(cust) => setSelectedCustomerId(cust ? cust.id : '')}
                            placeholder="কাস্টমার নির্বাচন করতে খুঁজুন..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600">রিটার্ন তারিখ</Label>
                          <Input
                            disabled
                            value={format(new Date(), 'dd MMMM yyyy, hh:mm a', { locale: bn })}
                            className="rounded-md h-10 bg-slate-100 border-slate-200 text-xs font-bold text-slate-600 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* STEP 2: Returned Products */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-rose-700 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-rose-600" /> ২. ফেরতকৃত পণ্য (Returned Products - স্টক পুনঃসংযোজিত হবে)
                      </Label>

                      {/* Step-by-Step Cascading Product Selector */}
                      <CascadingProductSelector
                        products={products}
                        onProductChange={(selected) => {
                          setSelectedCascadingReturnProduct(selected);
                          if (selected) {
                            if (selected.productId) setReturnProdId(selected.productId);
                            if (selected.price > 0) setReturnPrice(selected.price);
                          }
                        }}
                        showPriceField={true}
                        priceLabel="ফেরত একক দর (৳)"
                        itemPrice={returnPrice}
                        onPriceChange={setReturnPrice}
                        itemQty={returnQty}
                        onQtyChange={setReturnQty}
                        onAddCartItem={handleAddReturnItem}
                        buttonLabel="+ ফেরত যোগ করুন"
                      />

                      {/* Return Table */}
                      <div className="border border-slate-200 rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-rose-50/50 text-slate-700 text-xs">
                            <TableRow>
                              <TableHead className="font-bold">#</TableHead>
                              <TableHead className="font-bold">ফেরত পণ্যের নাম</TableHead>
                              <TableHead className="text-center font-bold">পরিমাণ</TableHead>
                              <TableHead className="text-right font-bold">একক দর</TableHead>
                              <TableHead className="text-right font-bold">মোট ফেরত মূল্য</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs font-bold">
                            {returnCart.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-slate-400 font-normal">
                                  কোনো ফেরত পণ্য যোগ করা হয়নি।
                                </TableCell>
                              </TableRow>
                            ) : (
                              returnCart.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50">
                                  <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                                  <TableCell className="font-black text-slate-900">{item.name}</TableCell>
                                  <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                                  <TableCell className="text-right">৳ {item.price.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-rose-600 font-black">
                                    ৳ {(item.quantity * item.price).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <button 
                                      type="button" 
                                      onClick={() => setReturnCart(returnCart.filter((_, i) => i !== idx))} 
                                      className="text-rose-500 hover:text-rose-700 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* STEP 3: Exchange Products (Optional) */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <Label className="text-xs uppercase tracking-wider font-black text-emerald-700 flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-emerald-600" /> ৩. এক্সচেঞ্জে নতুন নেওয়া পণ্য (অপশনাল)
                        </Label>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ফেরতের বদলে অন্য পণ্য নিলে যোগ করুন
                        </span>
                      </div>

                      {/* Cascading Item Line Selector */}
                      <CascadingProductSelector
                        products={products}
                        onlyInStock={true}
                        onProductChange={(selected) => {
                          setSelectedCascadingNewProduct(selected);
                          if (selected) {
                            if (selected.productId) setNewProdId(selected.productId);
                            if (selected.price > 0) setNewPrice(selected.price);
                          }
                        }}
                        showPriceField={true}
                        priceLabel="বিক্রয়/নতুন একক দর (৳)"
                        itemPrice={newPrice}
                        onPriceChange={setNewPrice}
                        itemQty={newQty}
                        onQtyChange={setNewQty}
                        onAddCartItem={handleAddNewItem}
                        buttonLabel="+ নতুন যোগ করুন"
                      />

                      {/* New Taken Table */}
                      <div className="border border-slate-200 rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-emerald-50/50 text-slate-700 text-xs">
                            <TableRow>
                              <TableHead className="font-bold">#</TableHead>
                              <TableHead className="font-bold">পণ্যের নাম</TableHead>
                              <TableHead className="text-center font-bold">পরিমাণ</TableHead>
                              <TableHead className="text-right font-bold">একক দর</TableHead>
                              <TableHead className="text-right font-bold">মোট মূল্য</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs font-bold">
                            {newTakenCart.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-slate-400 font-normal">
                                  কোনো নতুন পণ্য নিচ্ছেন না (শুধু ফেরত)।
                                </TableCell>
                              </TableRow>
                            ) : (
                              newTakenCart.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50">
                                  <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                                  <TableCell className="font-black text-slate-900">{item.name}</TableCell>
                                  <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                                  <TableCell className="text-right">৳ {item.price.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-emerald-600 font-black">
                                    ৳ {(item.quantity * item.price).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <button 
                                      type="button" 
                                      onClick={() => setNewTakenCart(newTakenCart.filter((_, i) => i !== idx))} 
                                      className="text-rose-500 hover:text-rose-700 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reason & Notes */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-2">
                      <Label className="text-xs font-bold text-slate-700">ফেরতের কারণ ও বিবরণ (Reason)</Label>
                      <Input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="যেমন: মালামাল ডেমেজ / কাস্টমারের অপছন্দ / সাইজ সমস্যা..."
                        className="bg-white border-slate-200 text-xs font-bold rounded-md h-10"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT 4 COLUMNS: SETTLEMENT & SUMMARY SIDEBAR */}
                <div className="lg:col-span-4 space-y-5">
                  
                  {/* Financial Breakdown Card */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 block">
                        📊 হিসাব ও এডজাস্টমেন্ট সামারি
                      </Label>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">ফেরত পণ্যের মোট মূল্য</span>
                          <span className="font-black text-rose-600">৳ {totalReturnedValue.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">নতুন নেওয়া পণ্যের মূল্য</span>
                          <span className="font-black text-emerald-600">৳ {totalNewTakenValue.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between py-2 border-b-2 border-slate-200 bg-slate-50 p-2 rounded-md">
                          <span className="font-black text-slate-900">নিট ফেরত মূল্য (Net Balance)</span>
                          <span className={cn("font-black text-base", netRefundValue >= 0 ? "text-rose-600" : "text-emerald-600")}>
                            ৳ {netRefundValue.toLocaleString()}
                          </span>
                        </div>

                        {/* DUE ADJUSTMENT NOTICE BOX */}
                        {netRefundValue > 0 && selectedCust && (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md space-y-2 text-xs">
                            <p className="font-bold text-amber-900 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-amber-600" /> অটোমেটিক বকেয়া সামঞ্জস্যতা
                            </p>
                            <div className="space-y-1 text-[11px] text-amber-800 font-medium">
                              {dueAdjusted > 0 ? (
                                <p className="font-bold text-blue-800">
                                  ✓ কাস্টমারের বকেয়া থেকে কাটা হবে (-): ৳ {dueAdjusted.toLocaleString()}
                                </p>
                              ) : (
                                <p className="font-semibold text-slate-700">• কাস্টমারের কোনো পূর্বের বকেয়া নেই</p>
                              )}

                              {cashRefundPaid > 0 ? (
                                <p className="font-black text-rose-700">
                                  💵 ক্যাশ রিফান্ড প্রদান করতে হবে: ৳ {cashRefundPaid.toLocaleString()}
                                </p>
                              ) : (
                                <p className="font-bold text-emerald-700">
                                  ✓ সম্পূর্ণ ফেরত মূল্য কাস্টমারের বকেয়া পরিশোধে সমন্বয় হয়েছে।
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                </div>

              </div>

              {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0 mt-6 rounded-b-md">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>💡 ফেরত পণ্যের স্টক স্বয়ংক্রিয়ভাবে গুদামে যুক্ত হবে।</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={returnCart.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-11 px-6 font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all text-sm"
                  >
                    💾 বিক্রয় রিটার্ন ও হিসাব সম্পন্ন করুন ✓
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
