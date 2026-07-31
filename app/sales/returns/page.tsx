'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  RotateCcw, Search, Plus, Package, User, DollarSign, FileText, X, 
  ShoppingCart, AlertCircle, Trash2, ArrowRight, CheckCircle2, RefreshCw, Calendar
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
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';

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
  
  // New Return Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [returnCart, setReturnCart] = useState<ReturnItem[]>([]);
  const [newTakenCart, setNewTakenCart] = useState<ReturnItem[]>([]);

  // Item selector helpers
  const [returnProdId, setReturnProdId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnPrice, setReturnPrice] = useState(0);

  const [newProdId, setNewProdId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  const [reason, setReason] = useState('');
  const [cashRefundInput, setCashRefundInput] = useState(0);

  const loadReturnsData = async () => {
    try {
      setLoading(true);
      const partyList = await api.parties.list({ party_type: 'customer' });
      const safePartyList = Array.isArray(partyList) ? partyList : [];
      setCustomers(safePartyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        totalDue: Number(p.total_due || 0)
      })));

      const prodList = await api.inventory.list();
      const safeProdList = Array.isArray(prodList) ? prodList : [];
      setProducts(safeProdList.map(p => ({
        id: String(p.id),
        name: p.name,
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস'
      })));

      const returnTxList = await api.transactions.list({ transaction_type: 'sale_return' });
      const safeReturnTxList = Array.isArray(returnTxList) ? returnTxList : [];
      setReturns(safeReturnTxList.map(r => ({
        id: String(r.id),
        customerName: r.party_name || 'গ্রাহক',
        customerId: String(r.party || ''),
        totalReturnValue: r.total_amount,
        totalNewTakenValue: 0,
        netRefundValue: r.total_amount,
        dueAdjusted: 0,
        cashRefundPaid: r.paid_amount,
        returnedItems: (r.items || []).map(i => ({
          id: String(i.id),
          name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          unit: i.unit || 'পিস'
        })),
        newTakenItems: [],
        reason: 'পণ্য ফেরত',
        createdAt: r.created_at
      })));
    } catch (err) {
      console.error('Error loading sales returns:', err);
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
    const date = at.toDate ? at.toDate() : new Date(at);
    return format(date, 'dd MMM yyyy, hh:mm a', { locale: bn });
  };

  // Add Item to Returned Items Cart
  const handleAddReturnItem = () => {
    if (!returnProdId) {
      toast.error('ফেরতকৃত পণ্য নির্বাচন করুন');
      return;
    }
    const prod = products.find(p => p.id === returnProdId);
    if (!prod) return;

    const existingIdx = returnCart.findIndex(i => i.id === prod.id);
    if (existingIdx > -1) {
      const updated = [...returnCart];
      updated[existingIdx].quantity += returnQty;
      setReturnCart(updated);
    } else {
      setReturnCart([...returnCart, {
        id: prod.id,
        name: prod.name,
        quantity: returnQty,
        price: returnPrice || prod.sellPrice || 0,
        unit: prod.unit || 'বস্তা'
      }]);
    }
    setReturnProdId('');
    setReturnQty(1);
    setReturnPrice(0);
    toast.success('ফেরত পণ্য যোগ করা হয়েছে');
  };

  // Add Item to New Taken Items Cart
  const handleAddNewItem = () => {
    if (!newProdId) {
      toast.error('নতুন নেওয়া পণ্য নির্বাচন করুন');
      return;
    }
    const prod = products.find(p => p.id === newProdId);
    if (!prod) return;

    if (newQty > prod.stock) {
      toast.error(`স্টকে পর্যাপ্ত পণ্য নেই (মজুদ: ${prod.stock})`);
      return;
    }

    const existingIdx = newTakenCart.findIndex(i => i.id === prod.id);
    if (existingIdx > -1) {
      const updated = [...newTakenCart];
      updated[existingIdx].quantity += newQty;
      setNewTakenCart(updated);
    } else {
      setNewTakenCart([...newTakenCart, {
        id: prod.id,
        name: prod.name,
        quantity: newQty,
        price: newPrice || prod.sellPrice || 0,
        unit: prod.unit || 'বস্তা'
      }]);
    }
    setNewProdId('');
    setNewQty(1);
    setNewPrice(0);
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
      await api.transactions.create({
        party: Number(selectedCustomerId),
        transaction_type: 'sale_return',
        total_amount: totalReturnedValue,
        paid_amount: cashRefundPaid,
        due_amount: Math.max(0, totalReturnedValue - cashRefundPaid),
        items: returnCart.map(item => ({
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        notes: reason || 'পণ্য ফেরত'
      });

      toast.success('বিক্রয় রিটার্ন সফলভাবে সম্পন্ন হয়েছে!');
      setIsOpen(false);
      setSelectedCustomerId('');
      setReturnCart([]);
      setNewTakenCart([]);
      setReason('');
      loadReturnsData();
    } catch (err: any) {
      console.error(err);
      toast.error('রিটার্ন সম্পন্ন করতে সমস্যা হয়েছে: ' + (err.message || err));
    }
  };

  const filteredReturns = returns.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase()) || 
    r.returnedItems?.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRefundAmountSum = returns.reduce((sum, r) => sum + (r.netRefundValue || r.totalReturnValue || 0), 0);

  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bengali">
        
        {/* Top Title & Header Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-8 h-8 text-orange-600" /> বিক্রয় ফেরত (Sales Return) ড্যাশবোর্ড
            </h2>
            <p className="text-slate-500 mt-1">পণ্য ফেরত, স্টক পুনঃসংযোজন ও কাস্টমার বকেয়া সামঞ্জস্যের হিসাব</p>
          </div>
          
          <Button 
            onClick={() => setIsOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bengali h-12 px-6 rounded-2xl font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />নতুন বিক্রয় রিটার্ন তৈরি করুন
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2 border-slate-100 shadow-sm rounded-2xl bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-700 shadow-sm">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 opacity-80">মোট সেলস রিটার্ন সংখ্যা</p>
                <p className="text-2xl font-black mt-0.5 text-indigo-700">{returns.length} টি</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-slate-100 shadow-sm rounded-2xl bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-700 shadow-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 opacity-80">মোট ফেরত মূল্য (রিফান্ড / বকেয়া এডজাস্ট)</p>
                <p className="text-2xl font-black mt-0.5 text-rose-700">৳ {totalRefundAmountSum.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="কাস্টমার বা পণ্যের নাম দিয়ে খুঁজুন..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 font-bengali rounded-xl h-11 shadow-sm"
            />
          </div>
        </div>

        {/* Sales Returns Table */}
        <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black py-4 px-6 uppercase">তারিখ</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">কাস্টমারের নাম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">ফেরতকৃত পণ্য</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">নতুন নেওয়া পণ্য</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">মোট ফেরত মূল্য</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right py-4 px-6 uppercase">বকেয়া কর্তন / ক্যাশ ফেরত</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <RotateCcw className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bold text-lg">কোনো বিক্রয় রিটার্ন রেকর্ড পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.map(r => (
                  <TableRow key={r.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <TableCell className="py-4 px-6 text-xs text-slate-500 font-semibold">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="font-black text-slate-900 text-sm">
                      {r.customerName}
                      {(r as any).customerPhone && <p className="text-[11px] text-slate-400 font-semibold">{(r as any).customerPhone}</p>}
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
                    <TableCell className="text-right font-black text-rose-600 text-base">
                      ৳ {(r.totalReturnValue || r.netRefundValue || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right py-4 px-6">
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

      {/* SALES INVOICE-STYLE SALES RETURN OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-slate-100 overflow-y-auto font-bengali flex flex-col justify-between">
          
          {/* TOP HEADER BAR */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold shadow-xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">
                  SALES RETURN FORM (বিক্রয় ফেরত ফর্ম)
                </span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  পণ্য ফেরত ও বকেয়া এডজাস্টমেন্ট
                </h1>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* MAIN FORM GRID */}
          <form onSubmit={handleSubmitReturnForm} className="p-4 md:p-6 w-full space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT 8 COLUMNS: RETURN & EXCHANGE PRODUCT SECTIONS */}
              <div className="lg:col-span-8 space-y-5">
                
                {/* STEP 1: Customer Selection & Details */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">1</span>
                      কাস্টমার নির্বাচন (Select Customer)
                    </Label>

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
                          className="rounded-xl h-11 bg-slate-100 border-slate-200 text-xs font-bold text-slate-600 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Customer Current Due Alert Box */}
                    {selectedCust && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900">{selectedCust.name}</span>
                            {selectedCust.phone && <span className="ml-2 text-slate-600 font-semibold">({selectedCust.phone})</span>}
                            {selectedCust.address && <p className="text-slate-500 text-[11px] font-semibold">{selectedCust.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-rose-600 font-bold block">বর্তমান বকেয়া (Current Due)</span>
                          <span className="font-black text-rose-700 text-base">৳ {(selectedCust.totalDue || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* STEP 2: Returned Products (ফেরতকৃত পণ্য) */}
                <Card className="bg-white border-rose-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-rose-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[11px] font-black flex items-center justify-center">2</span>
                      ফেরতকৃত পণ্য (Returned Products - স্টক পুনঃসংযোজিত হবে)
                    </Label>

                    {/* Product Selector Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-rose-50/40 p-3.5 rounded-xl border border-rose-100">
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">পণ্য নির্বাচন করুন</Label>
                        <Select 
                          value={returnProdId} 
                          onValueChange={(val: string | null) => {
                            if (!val) return;
                            setReturnProdId(val);
                            const prod = products.find(p => p.id === val);
                            if (prod) setReturnPrice(prod.sellPrice || 0);
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                            <SelectValue placeholder="ফেরত পণ্য নির্বাচন করুন..." />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs font-bold max-h-60">
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (দর: ৳{p.sellPrice})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">পরিমাণ</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={returnQty} 
                          onChange={e => setReturnQty(parseFloat(e.target.value) || 1)} 
                          className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">একক দর (৳)</Label>
                        <Input 
                          type="number" 
                          value={returnPrice} 
                          onChange={e => setReturnPrice(parseFloat(e.target.value) || 0)} 
                          className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold text-right"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Button 
                          type="button" 
                          onClick={handleAddReturnItem}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 font-bold text-xs"
                        >
                          + ফেরত যোগ
                        </Button>
                      </div>
                    </div>

                    {/* Returned Cart Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-12 text-center font-bold">#</TableHead>
                            <TableHead className="font-bold">ফেরত পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-bold">পরিমাণ</TableHead>
                            <TableHead className="text-right font-bold">একক মূল্য</TableHead>
                            <TableHead className="text-right font-bold">মোট ফেরত মূল্য</TableHead>
                            <TableHead className="w-12 text-center font-bold"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {returnCart.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-slate-400 font-semibold">
                                কোনো ফেরত পণ্য যোগ করা হয়নি।
                              </TableCell>
                            </TableRow>
                          ) : (
                            returnCart.map((item, idx) => (
                              <TableRow key={idx} className="border-b border-slate-100">
                                <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                                <TableCell className="font-bold text-slate-900">{item.name}</TableCell>
                                <TableCell className="text-center font-bold text-rose-700">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-right font-semibold text-slate-700">৳ {item.price.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-black text-rose-600">৳ {(item.price * item.quantity).toLocaleString()}</TableCell>
                                <TableCell className="text-center">
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

                {/* STEP 3: New Taken Products (নতুন নেওয়া পণ্য - অপশনাল) */}
                <Card className="bg-white border-emerald-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-emerald-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-black flex items-center justify-center">3</span>
                      নতুন নেওয়া পণ্য / এক্সচেঞ্জ (New Products Taken - স্টক থেকে কমবে)
                    </Label>

                    {/* Product Selector Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">পণ্য নির্বাচন করুন</Label>
                        <Select 
                          value={newProdId} 
                          onValueChange={(val: string | null) => {
                            if (!val) return;
                            setNewProdId(val);
                            const prod = products.find(p => p.id === val);
                            if (prod) setNewPrice(prod.sellPrice || 0);
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                            <SelectValue placeholder="নতুন পণ্য নির্বাচন করুন..." />
                          </SelectTrigger>
                          <SelectContent className="font-bengali text-xs font-bold max-h-60">
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (স্টক: {p.stock}, দর: ৳{p.sellPrice})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">পরিমাণ</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={newQty} 
                          onChange={e => setNewQty(parseFloat(e.target.value) || 1)} 
                          className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">একক দর (৳)</Label>
                        <Input 
                          type="number" 
                          value={newPrice} 
                          onChange={e => setNewPrice(parseFloat(e.target.value) || 0)} 
                          className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold text-right"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Button 
                          type="button" 
                          onClick={handleAddNewItem}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs"
                        >
                          + নতুন যোগ
                        </Button>
                      </div>
                    </div>

                    {/* New Taken Cart Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-12 text-center font-bold">#</TableHead>
                            <TableHead className="font-bold">নতুন নেওয়া পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-bold">পরিমাণ</TableHead>
                            <TableHead className="text-right font-bold">একক মূল্য</TableHead>
                            <TableHead className="text-right font-bold">মোট মূল্য</TableHead>
                            <TableHead className="w-12 text-center font-bold"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {newTakenCart.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-slate-400 font-semibold">
                                কোনো নতুন পণ্য নিচ্ছেন না (শুধু ফেরত)।
                              </TableCell>
                            </TableRow>
                          ) : (
                            newTakenCart.map((item, idx) => (
                              <TableRow key={idx} className="border-b border-slate-100">
                                <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                                <TableCell className="font-bold text-slate-900">{item.name}</TableCell>
                                <TableCell className="text-center font-bold text-emerald-700">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-right font-semibold text-slate-700">৳ {item.price.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-black text-emerald-600">৳ {(item.price * item.quantity).toLocaleString()}</TableCell>
                                <TableCell className="text-center">
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

                {/* STEP 4: Reason & Notes */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">4</span>
                      ফেরতের কারণ ও বিবরণ (Reason)
                    </Label>
                    <Input 
                      value={reason} 
                      onChange={e => setReason(e.target.value)} 
                      placeholder="যেমন: পণ্য নষ্ট ছিল / মানসম্মত নয়" 
                      className="rounded-xl h-11 bg-slate-50 border-slate-200 text-xs font-semibold"
                    />
                  </CardContent>
                </Card>

              </div>

              {/* RIGHT 4 COLUMNS: SETTLEMENT & SUMMARY SIDEBAR */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* Financial Breakdown Card */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
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

                      <div className="flex justify-between py-2 border-b-2 border-slate-200 bg-slate-50 p-2 rounded-xl">
                        <span className="font-black text-slate-900">নিট ফেরত মূল্য (Net Balance)</span>
                        <span className={cn("font-black text-base", netRefundValue >= 0 ? "text-rose-600" : "text-emerald-600")}>
                          ৳ {netRefundValue.toLocaleString()}
                        </span>
                      </div>

                      {/* DUE ADJUSTMENT NOTICE BOX */}
                      {netRefundValue > 0 && selectedCust && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
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

                    <Button 
                      type="submit" 
                      disabled={returnCart.length === 0}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12 font-black shadow-lg shadow-orange-600/20 active:scale-95 transition-all text-sm mt-3"
                    >
                      💾 বিক্রয় রিটার্ন ও হিসাব সম্পন্ন করুন
                    </Button>
                  </CardContent>
                </Card>

              </div>

            </div>
          </form>
        </div>
      )}
    </Shell>
  );
}
