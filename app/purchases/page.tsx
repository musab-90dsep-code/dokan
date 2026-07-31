'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Plus, Search, Edit2, Trash2, Phone, Building2, DollarSign,
  Receipt, Banknote, Calendar, Lightbulb, AlertCircle, X,
  Truck, Eye, Calculator, CheckCircle2, Package
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn, formatDualStock } from '@/lib/utils';
import { SupplierSearchSelect } from '@/components/SupplierSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';

export interface PurchaseItem {
  id?: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  discount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  businessName?: string;
  phone?: string;
  address?: string;
  totalDue?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  unit: string;
  alertThreshold: number;
}

export interface PurchaseInvoice {
  id: string;
  purchaseId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  businessName?: string;
  supplierId?: string;
  items: PurchaseItem[];
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  laborCost?: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  createdAt: any;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress?: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('সব');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoice | null>(null);

  // Form & Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', businessName: '', phone: '', address: '' });

  // Cart & Item Line Selector States
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCascadingProduct, setSelectedCascadingProduct] = useState<SelectedProductDetails | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemSellPrice, setItemSellPrice] = useState<number>(0);
  const [itemAlertLimit, setItemAlertLimit] = useState<number>(200);
  const [itemUnit, setItemUnit] = useState<string>('কেজি');

  const handleAddLineItem = async () => {
    const nameToUse = selectedCascadingProduct?.name || (selectedProductId ? products.find(p => p.id === selectedProductId)?.name : '');
    if (!nameToUse) {
      toast.error('পণ্যের নাম প্রদান করুন');
      return;
    }

    const unitToUse = selectedCascadingProduct?.unit || itemUnit || 'পিস';
    const prodId = selectedCascadingProduct?.productId || selectedProductId || `temp_${Date.now()}`;

    const newItem: PurchaseItem = {
      id: prodId,
      name: nameToUse,
      unit: unitToUse,
      price: itemPrice,
      quantity: itemQty
    };

    setCart(prev => [...prev, newItem]);
    toast.success(`"${nameToUse}" ক্রয় কার্টে যুক্ত করা হয়েছে`);

    setItemQty(1);
    setItemPrice(0);
    setItemSellPrice(0);
  };

  const handleAddCategoryProductToCart = handleAddLineItem;
  const handleSaveDefaultLabor = (amount: number) => {
    setLaborCost(amount);
  };

  // Billing & Payment Extension States
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFlat, setDiscountFlat] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [isLandedCostAuto, setIsLandedCostAuto] = useState<boolean>(true);

  const [paymentOption, setPaymentOption] = useState<'now' | 'later'>('now');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [bankName, setBankName] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [savedBanks, setSavedBanks] = useState<{ id: string; name: string; accNo: string }[]>([]);
  const [selectedShopBank, setSelectedShopBank] = useState<string>('ডাচ-বাংলা ব্যাংক - 123.456.7890');
  const [supplierBankName, setSupplierBankName] = useState<string>('');
  const [supplierAccountNo, setSupplierAccountNo] = useState<string>('');
  const [supplierTxnRef, setSupplierTxnRef] = useState<string>('');

  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [authorizedBy, setAuthorizedBy] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('Main');
  const [purchaseNote, setPurchaseNote] = useState<string>('');

  const loadPurchasesData = async () => {
    try {
      setLoading(true);
      const purchaseList = await api.transactions.list({ transaction_type: 'purchase' });
      setPurchases(purchaseList.map(p => ({
        id: String(p.id),
        purchaseId: p.invoice_no,
        supplierName: p.party_name || 'সরবরাহকারী',
        supplierPhone: p.party_phone || '',
        supplierId: String(p.party || ''),
        items: (p.items || []).map(i => ({
          name: i.product_name,
          price: i.price,
          quantity: i.quantity,
          unit: i.unit || 'পিস'
        })),
        subtotal: p.subtotal,
        discount: p.discount,
        totalAmount: p.total_amount,
        paidAmount: p.paid_amount,
        dueAmount: p.due_amount,
        paymentStatus: p.due_amount <= 0 ? 'paid' : 'unpaid',
        createdAt: p.created_at
      })));

      const partyList = await api.parties.list({ party_type: 'supplier' });
      setSuppliers(partyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        businessName: p.business_name || '',
        totalDue: Number(p.total_due || 0)
      })));

      const prodList = await api.inventory.list();
      setProducts(prodList.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || 'অন্যান্য',
        brand: p.brand || '',
        buyPrice: Number(p.purchase_price || 0),
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        alertThreshold: Number(p.min_stock || 10)
      })));
    } catch (err) {
      console.error('Error loading purchases page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadPurchasesData();
    })();
    return () => { ignore = true; };
  }, []);

  // Cart Calculations
  const cartSubtotal = cart.reduce((a, i) => a + (i.price * i.quantity), 0);
  const computedDiscount = discountType === 'percentage' 
    ? (cartSubtotal * (discountPercent || 0)) / 100 
    : (discountFlat || 0);
  const cartTotalDiscount = computedDiscount + cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0);
  const cartTotalAmount = Math.max(0, cartSubtotal - cartTotalDiscount + (shippingCost || 0) + (laborCost || 0));
  const cartDueAmount = paymentOption === 'now' ? Math.max(0, cartTotalAmount - paidAmount) : cartTotalAmount;

  // Existing Supplier Due Calculation
  const selectedSupplierDue = selectedSupplier 
    ? (selectedSupplier.totalDue || 0)
    : 0;

  const resetForm = () => {
    setSelectedSupplier(null);
    setIsNewSupplier(false);
    setNewSupplierData({ name: '', businessName: '', phone: '', address: '' });
    setCart([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setDiscountType('percentage');
    setDiscountPercent(0);
    setDiscountFlat(0);
    setShippingCost(0);
    const defLabor = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_default_labor_charge') || '0') || 0) : 0;
    setLaborCost(defLabor);
    setIsLandedCostAuto(true);
    setPaymentOption('now');
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryAddress('');
    setPreparedBy('');
    setAuthorizedBy('');
    setReceivedBy('');
    setWarehouse('Main');
    setPurchaseNote('');
  };

  const handleAddCartItem = () => {
    if (!selectedProductId) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = cart.findIndex(i => i.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += (itemQty || 1);
      if (itemPrice > 0) updated[existingIndex].price = itemPrice;
      setCart(updated);
    } else {
      setCart(prev => [...prev, {
        id: product.id,
        name: product.name,
        unit: product.unit || 'পিস',
        price: itemPrice > 0 ? itemPrice : (product.buyPrice || 0),
        quantity: itemQty || 1,
        discount: 0
      }]);
    }

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    toast.success('পণ্য কার্টে যুক্ত হয়েছে');
  };

  const handleRemoveCartItem = (id?: string) => {
    if (!id) return;
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateCartQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
  };

  // Submit Purchase Invoice
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('অন্তত একটি পণ্য নির্বাচন করুন');
      return;
    }
    if (!selectedSupplier && (!isNewSupplier || !newSupplierData.businessName.trim())) {
      toast.error('কোম্পানি / সরবরাহকারী নির্বাচন করুন');
      return;
    }

    try {
      let finalSuppId = selectedSupplier?.id;
      if (isNewSupplier && newSupplierData.name.trim()) {
        const createdParty = await api.parties.create({
          party_type: 'supplier',
          name: newSupplierData.name.trim(),
          business_name: newSupplierData.businessName.trim(),
          phone: newSupplierData.phone.trim(),
          address: newSupplierData.address.trim()
        });
        finalSuppId = String(createdParty.id);
      }

      await api.transactions.create({
        party: finalSuppId ? Number(finalSuppId) : null,
        transaction_type: 'purchase',
        total_amount: cartTotalAmount,
        paid_amount: paidAmount,
        due_amount: cartDueAmount,
        payment_method: paymentMethod.toLowerCase(),
        items: cart.map(i => ({
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
          unit: i.unit,
          total: i.price * i.quantity
        })),
        notes: purchaseNote
      });

      toast.success('ক্রয় ইনভয়েস সফলভাবে সংরক্ষিত হয়েছে!');
      setIsAddOpen(false);
      loadPurchasesData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'ক্রয় ইনভয়েস সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const handleDeletePurchase = async (p: PurchaseInvoice) => {
    if (!confirm(`আপনি কি নিশ্চিত যে ক্রয় ইনভয়েস #${p.id.slice(0, 8)} মুছে ফেলতে চান?`)) return;
    try {
      await api.transactions.delete(p.id);
      toast.success('ক্রয় ইনভয়েস মুছে ফেলা হয়েছে');
      loadPurchasesData();
    } catch {
      toast.error('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const matchSearch = p.supplierName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'সব' || p.paymentStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPurchaseAmount = purchases.reduce((a, p) => a + (p.totalAmount || 0), 0);
  const totalPaidAmount = purchases.reduce((a, p) => a + (p.paidAmount || 0), 0);
  const totalDueAmount = purchases.reduce((a, p) => a + (p.dueAmount || 0), 0);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
      const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
      return format(d, 'dd MMM yyyy');
    } catch { return '—'; }
  };

  return (
    <Shell>
      <div className="space-y-8 font-bengali">
        
        {/* HEADER TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-8 h-8 text-orange-500" /> ক্রয় ইনভয়েস (Purchases)
            </h1>
            <p className="text-slate-500 text-sm mt-1">রড ও সিমেন্ট ক্রয়ের হিসাব, চালান ও সরবরাহকারীর পাওনা ব্যবস্থাপনা</p>
          </div>

          <Button 
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="bg-orange-600 hover:bg-orange-700 text-white h-12 px-6 rounded-xl font-black text-base shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> নতুন ক্রয় ইনভয়েস
          </Button>
        </div>

        {/* METRIC OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-2 border-indigo-100 bg-indigo-50/60 rounded-2xl shadow-xs">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">মোট ক্রয় বিল</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">৳ {totalPurchaseAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Receipt className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-100 bg-emerald-50/60 rounded-2xl shadow-xs">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">পরিশোধিত</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">৳ {totalPaidAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Banknote className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-rose-100 bg-rose-50/60 rounded-2xl shadow-xs">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">কোম্পানির মোট পাওনা</p>
                <p className="text-2xl font-black text-rose-700 mt-1">৳ {totalDueAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PURCHASES TABLE CARD */}
        <Card className="border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl w-full sm:w-auto">
              {['সব', 'পরিশোধিত', 'আংশিক', 'বাকি'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterStatus === st ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="কোম্পানি বা চালান আইডি খুঁজুন..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-10 bg-white border-slate-200 text-xs font-bold"
              />
            </div>

          </div>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="text-[11px] uppercase tracking-wider">
                  <TableHead className="w-12 text-center font-black">#</TableHead>
                  <TableHead className="font-black">কোম্পানি / সরবরাহকারী</TableHead>
                  <TableHead className="text-center font-black">তারিখ</TableHead>
                  <TableHead className="text-right font-black">মোট বিল</TableHead>
                  <TableHead className="text-right font-black">পরিশোধিত</TableHead>
                  <TableHead className="text-right font-black">কোম্পানির পাওনা</TableHead>
                  <TableHead className="text-center font-black">স্ট্যাটাস</TableHead>
                  <TableHead className="text-center font-black w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">লোড হচ্ছে...</TableCell></TableRow>
                ) : filteredPurchases.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">কোনো ক্রয় ইনভয়েস পাওয়া যায়নি</TableCell></TableRow>
                ) : filteredPurchases.map((p, idx) => (
                  <TableRow 
                    key={p.id} 
                    onClick={() => setSelectedPurchase(p)}
                    className="border-b border-slate-100 hover:bg-orange-50/50 cursor-pointer transition-colors text-xs font-semibold"
                  >
                    <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-black text-slate-900 text-sm">{p.supplierName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">#{p.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-slate-600">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right font-black text-slate-900">৳ {(p.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">৳ {(p.paidAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-black text-rose-600">৳ {(p.dueAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block",
                        p.paymentStatus === 'পরিশোধিত' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.paymentStatus === 'আংশিক' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      )}>
                        {p.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }} 
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="ইনভয়েস দেখুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeletePurchase(p); }} 
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* FULL 1:1 SALES-INVOICE STYLE 7-STEP PURCHASE INVOICE FORM OVERLAY */}
      {isCreateOpen && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-slate-100 overflow-y-auto font-bengali flex flex-col justify-between">
          
          {/* HEADER BAR */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">
                  ক্রয় ইনভয়েস এন্ট্রি (NEW PURCHASE INVOICE)
                </span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  নতুন ক্রয় ইনভয়েস তৈরি করুন
                </h1>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => { setIsCreateOpen(false); resetForm(); }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN FORM GRID */}
          <form onSubmit={handlePurchaseSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT 9 COLUMNS: 7 STEPS */}
              <div className="lg:col-span-9 space-y-5">
                
                {/* STEP 1: Company / Supplier & Basics */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">1</span>
                        Company & Basics (কোম্পানি ও প্রাথমিক তথ্য)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewSupplier(!isNewSupplier);
                          setSelectedSupplier(null);
                        }}
                        className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                      >
                        {isNewSupplier ? '← তালিকা থেকে বাছুন' : '+ নতুন কোম্পানি এন্ট্রি করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Select Company / Supplier */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Company / Supplier <span className="text-rose-500">*</span></Label>
                        {!isNewSupplier ? (
                          <SupplierSearchSelect
                            suppliers={suppliers}
                            selectedSupplier={selectedSupplier}
                            onSelectSupplier={(supp) => setSelectedSupplier(supp)}
                            onAddNewClick={() => setIsNewSupplier(true)}
                            placeholder="কোম্পানি বা সরবরাহকারী খুঁজুন..."
                          />
                        ) : (
                          <Input
                            required
                            placeholder="কোম্পানির নাম"
                            value={newSupplierData.businessName}
                            onChange={e => setNewSupplierData({ ...newSupplierData, businessName: e.target.value })}
                            className="rounded-xl h-11 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        )}
                      </div>

                      {/* Invoice Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Purchase Invoice No</Label>
                        <Input
                          disabled
                          value="Auto (Will generate)"
                          className="rounded-xl h-11 bg-slate-100 border-slate-200 text-xs font-bold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      {/* Purchase Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Purchase Date <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={format(new Date(), 'yyyy-MM-dd')}
                            onChange={() => {}}
                            className="rounded-xl h-11 bg-slate-50 border-slate-200 text-xs font-bold pr-9"
                          />
                          <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Supplier Existing Due Alert Box */}
                    {selectedSupplier && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-bengali mt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900">{selectedSupplier.businessName || selectedSupplier.name}</span>
                            {selectedSupplier.phone && <span className="ml-2 text-slate-600 font-semibold">({selectedSupplier.phone})</span>}
                            {selectedSupplier.address && <p className="text-slate-500 text-[11px] font-semibold">{selectedSupplier.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-rose-600 font-bold block">কোম্পানির পূর্বের মোট পাওনা (Previous Supplier Due)</span>
                          <span className="font-black text-rose-700 text-base">৳ {selectedSupplierDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* STEP 2: Item Lines */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">2</span>
                        Item Lines (ক্রয়কৃত পণ্যসমূহ)
                      </Label>
                    </div>

                    {/* Step-by-Step Cascading Product Selector (Rod, Cement, Ring) */}
                    <CascadingProductSelector
                      products={products}
                      onProductChange={(selected) => {
                        setSelectedCascadingProduct(selected);
                        if (selected) {
                          if (selected.productId) setSelectedProductId(selected.productId);
                          if (selected.price > 0) setItemPrice(selected.price);
                          if (selected.sellPrice && selected.sellPrice > 0) setItemSellPrice(selected.sellPrice);
                        }
                      }}
                      showPriceField={true}
                      priceLabel="ক্রয় মূল্য (৳)"
                      itemPrice={itemPrice}
                      onPriceChange={setItemPrice}
                      showSellPriceField={true}
                      itemSellPrice={itemSellPrice}
                      onSellPriceChange={setItemSellPrice}
                      showAlertLimitField={true}
                      itemAlertLimit={itemAlertLimit}
                      onAlertLimitChange={setItemAlertLimit}
                      itemQty={itemQty}
                      onQtyChange={setItemQty}
                      itemUnit={itemUnit}
                      onUnitChange={setItemUnit}
                      onAddCartItem={handleAddLineItem}
                      buttonLabel="+ কার্টে পণ্য যোগ করুন"
                    />

                    {/* Table */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-10 text-center font-black">#</TableHead>
                            <TableHead className="font-black">Product</TableHead>
                            <TableHead className="text-center font-black">Series</TableHead>
                            <TableHead className="text-center font-black">Variant</TableHead>
                            <TableHead className="text-center font-black">Quantity</TableHead>
                            <TableHead className="text-right font-black">Unit Buy Price</TableHead>
                            <TableHead className="text-right font-black">Subtotal</TableHead>
                            <TableHead className="w-10 text-center font-black">🗑️</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400 font-semibold">
                                কার্ট খালি। উপর থেকে পণ্য নির্বাচন করে যোগ করুন।
                              </TableCell>
                            </TableRow>
                          ) : cart.map((item, idx) => (
                            <TableRow key={item.id} className="text-xs border-b border-slate-100">
                              <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                              <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                              <TableCell className="text-center text-slate-400">—</TableCell>
                              <TableCell className="text-center text-slate-400">—</TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <button type="button" onClick={() => handleUpdateCartQty(item.id!, item.quantity - 1)} className="w-6 h-6 rounded bg-slate-100 font-bold">-</button>
                                  <span className="font-bold">{item.quantity} {item.unit}</span>
                                  <button type="button" onClick={() => handleUpdateCartQty(item.id!, item.quantity + 1)} className="w-6 h-6 rounded bg-slate-100 font-bold">+</button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-600">
                                <div>
                                  <span className="font-bold text-slate-800">৳{item.price.toLocaleString()}</span>
                                  {isLandedCostAuto && ((shippingCost || 0) + (laborCost || 0) > 0) && cartSubtotal > 0 && (
                                    <div className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md mt-0.5 inline-block shadow-2xs">
                                      প্রকৃত কেনা: ৳{Math.round(
                                        item.price + (((item.price * item.quantity / cartSubtotal) * ((shippingCost || 0) + (laborCost || 0))) / item.quantity)
                                      ).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-900">৳{(item.price * item.quantity).toLocaleString()}</TableCell>
                              <TableCell className="text-center">
                                <button type="button" onClick={() => handleRemoveCartItem(item.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 3: Transport & Delivery Site */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">3</span>
                      Transport & Unloading Point (পরিবহন ও গুদামের তথ্য)
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">Vehicle / Truck No (গাড়ি নং)</Label>
                        <Input
                          value={vehicleNo}
                          onChange={e => setVehicleNo(e.target.value)}
                          placeholder="ঢাকা মেট্রো-ট ১১-৫৪৩২"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">Driver Name (ড্রাইভারের নাম)</Label>
                        <Input
                          value={driverName}
                          onChange={e => setDriverName(e.target.value)}
                          placeholder="মোঃ রফিক"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">Driver Phone (মোবাইল)</Label>
                        <Input
                          value={driverPhone}
                          onChange={e => setDriverPhone(e.target.value)}
                          placeholder="০১৭XXXXXXXX"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">Unloading Site / Warehouse</Label>
                        <Input
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          placeholder="প্রধান গুদাম / স্টক পয়েন্ট"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 4 & STEP 5 ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* STEP 4: Totals, Discount & Labor */}
                  <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">4</span>
                        Totals, Discount & Charges (মোট, ছাড় ও খরচ)
                      </Label>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Discount Type</Label>
                          <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                            <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs font-bold">
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="flat">Flat (৳)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Discount % / Amount</Label>
                          <Input 
                            type="number"
                            value={discountType === 'percentage' ? (discountPercent || '') : (discountFlat || '')}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              if (discountType === 'percentage') setDiscountPercent(val);
                              else setDiscountFlat(val);
                            }}
                            placeholder="0"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Calculated Discount</Label>
                          <Input 
                            disabled
                            value={`৳ ${computedDiscount.toLocaleString()}`}
                            className="rounded-xl h-10 bg-slate-100 border-slate-200 text-xs font-black text-emerald-600 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-bold text-slate-600">Unloading Labor Charge (লেবার খরচ ৳)</Label>
                            <button
                              type="button"
                              onClick={() => handleSaveDefaultLabor(laborCost || 0)}
                              className="text-[9px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                              title="বর্তমানে দেওয়া এই সংখ্যাটি সব সময় ডিফল্ট হিসেবে রাখতে এখানে ক্লিক করুন"
                            >
                              📌 ডিফল্ট সেভ করুন
                            </button>
                          </div>
                          <Input 
                            type="number"
                            value={laborCost || ''}
                            onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold text-amber-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Shipping / Freight (গাড়ি ভাড়া ৳)</Label>
                          <Input 
                            type="number"
                            value={shippingCost || ''}
                            onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>
                      </div>

                      {/* Auto Landed Cost Calculator Toggle Switch Banner */}
                      <div className="p-3.5 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                              <Calculator className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">Auto Landed Cost Calculator</p>
                              <p className="text-[10px] text-slate-500 font-semibold">গাড়ি ভাড়া ও লেবার খরচ কেনা দামে বন্টন করুন</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsLandedCostAuto(!isLandedCostAuto)}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                              isLandedCostAuto ? "bg-orange-600" : "bg-slate-300"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                                isLandedCostAuto ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {isLandedCostAuto ? (
                          <div className="text-[11px] text-orange-900 font-bold bg-white/90 p-2 rounded-lg border border-orange-200/80 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ক্যালকুলেটর চালু: গাড়ি ভাড়া (৳{(shippingCost || 0).toLocaleString()}) + লেবার (৳{(laborCost || 0).toLocaleString()}) কেনা দামে যোগ হবে।
                            </span>
                            <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">চালু (ON)</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 font-semibold bg-white/90 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                            <span>
                              ক্যালকুলেটর বন্ধ: গাড়ি ভাড়া ও লেবার খরচ কেনা দামে যুক্ত হবে না (কোম্পানি কেনা দাম অটুট থাকবে)।
                            </span>
                            <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">বন্ধ (OFF)</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* STEP 5: Register Payment */}
                  <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">5</span>
                        Register Payment (পেমেন্ট তথ্য)
                      </Label>

                      <div className="flex items-center gap-4 text-xs font-bold pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'now'}
                            onChange={() => setPaymentOption('now')}
                            className="accent-orange-600"
                          />
                          <span>● Record Payment Now</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'later'}
                            onChange={() => setPaymentOption('later')}
                            className="accent-orange-600"
                          />
                          <span>○ Record Later</span>
                        </label>
                      </div>

                      {paymentOption === 'now' && (
                        <div className="space-y-3 pt-1 font-bengali">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">Payment Method (পেমেন্ট মাধ্যম)</Label>
                              <Select value={paymentMethod} onValueChange={(val: string | null) => setPaymentMethod(val || 'Cash')}>
                                <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="font-bengali text-xs font-bold">
                                  <SelectItem value="Cash">💵 Cash (নগদ)</SelectItem>
                                  <SelectItem value="Bank">🏦 Bank Transfer (ব্যাংক)</SelectItem>
                                  <SelectItem value="BankToBank">🔄 Bank to Bank Transfer (ব্যাংক-টু-ব্যাংক)</SelectItem>
                                  <SelectItem value="Cheque">📄 Cheque (চেক)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">Paid Amount (পরিশোধিত ৳)</Label>
                              <Input 
                                type="number"
                                value={paidAmount || ''}
                                onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="rounded-xl h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600"
                              />
                            </div>
                          </div>

                          {/* BANK TRANSFER (SAVED SHOP BANK ACCOUNT SELECTOR) */}
                          {paymentMethod === 'Bank' && (
                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-blue-900 flex items-center gap-1">
                                🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                              </p>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-600">প্রেরকের ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
                                <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                  <SelectTrigger className="h-8 rounded-lg bg-white text-xs font-bold border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold">
                                    {savedBanks.length > 0 ? (
                                      savedBanks.map(b => (
                                        <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                          {b.name} - {b.accNo}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <>
                                        <SelectItem value="ডাচ-বাংলা ব্যাংক - 123.456.7890">ডাচ-বাংলা ব্যাংক (DBBL) - A/C: 123.456.7890</SelectItem>
                                        <SelectItem value="ইসলামী ব্যাংক - 2050.1234.5678">ইসলামী ব্যাংক (IBBL) - A/C: 2050.1234.5678</SelectItem>
                                        <SelectItem value="ব্র্যাক ব্যাংক - 1501.2039.4857">ব্র্যাক ব্যাংক (BRAC Bank) - A/C: 1501.2039.4857</SelectItem>
                                        <SelectItem value="সিটি ব্যাংক - 3101.9876.5432">সিটি ব্যাংক (City Bank) - A/C: 3101.9876.5432</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] font-bold text-slate-600">Txn / Ref No (অপশনাল)</Label>
                                <Input 
                                  placeholder="Txn ID" 
                                  value={transactionRef} 
                                  onChange={e => setTransactionRef(e.target.value)}
                                  className="h-8 rounded-lg bg-white text-xs font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {/* BANK TO BANK TRANSFER (SENDER SHOP SELECTOR + RECEIVER SUPPLIER INPUTS) */}
                          {paymentMethod === 'BankToBank' && (
                            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-indigo-900 flex items-center gap-1">
                                🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                              </p>
                              
                              {/* SENDER SHOP BANK */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-indigo-950 block">
                                  ১. প্রেরকের ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                                </Label>
                                <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                  <SelectTrigger className="h-8 rounded-lg bg-white text-xs font-bold border-indigo-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold">
                                    {savedBanks.length > 0 ? (
                                      savedBanks.map(b => (
                                        <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                          {b.name} - {b.accNo}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <>
                                        <SelectItem value="ডাচ-বাংলা ব্যাংক - 123.456.7890">ডাচ-বাংলা ব্যাংক (DBBL) - A/C: 123.456.7890</SelectItem>
                                        <SelectItem value="ইসলামী ব্যাংক - 2050.1234.5678">ইসলামী ব্যাংক (IBBL) - A/C: 2050.1234.5678</SelectItem>
                                        <SelectItem value="ব্র্যাক ব্যাংক - 1501.2039.4857">ব্র্যাক ব্যাংক (BRAC Bank) - A/C: 1501.2039.4857</SelectItem>
                                        <SelectItem value="সিটি ব্যাংক - 3101.9876.5432">সিটি ব্যাংক (City Bank) - A/C: 3101.9876.5432</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* RECEIVER SUPPLIER BANK INPUTS */}
                              <div className="space-y-2 pt-2 border-t border-indigo-100">
                                <Label className="text-[10px] font-bold text-slate-700 block">
                                  ২. গ্রহীতার ব্যাংক তথ্য (সাপ্লায়ারের ব্যাংক অ্যাকাউন্ট)
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">গ্রহীতা ব্যাংকের নাম</Label>
                                    <Input 
                                      placeholder="যেমন: ইসলামী ব্যাংক / ডাচ-বাংলা" 
                                      value={supplierBankName} 
                                      onChange={e => setSupplierBankName(e.target.value)}
                                      className="h-8 rounded-lg bg-white text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">গ্রহীতার অ্যাকাউন্ট নং / নাম</Label>
                                    <Input 
                                      placeholder="A/C No or Name" 
                                      value={supplierAccountNo} 
                                      onChange={e => setSupplierAccountNo(e.target.value)}
                                      className="h-8 rounded-lg bg-white text-xs font-mono"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                    <Input 
                                      placeholder="Txn ID / Ref No" 
                                      value={supplierTxnRef} 
                                      onChange={e => setSupplierTxnRef(e.target.value)}
                                      className="h-8 rounded-lg bg-white text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CHEQUE DETAILS */}
                          {paymentMethod === 'Cheque' && (
                            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-2 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-purple-900 flex items-center gap-1">
                                📄 চেকের বিবরণ
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">ব্যাংকের নাম</Label>
                                  <Input 
                                    placeholder="ব্যাংকের নাম" 
                                    value={bankName} 
                                    onChange={e => setBankName(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">চেক নম্বর</Label>
                                  <Input 
                                    placeholder="CQ-10023" 
                                    value={chequeNo} 
                                    onChange={e => setChequeNo(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">চেকের তারিখ</Label>
                                  <Input 
                                    type="date" 
                                    value={chequeDate} 
                                    onChange={e => setChequeDate(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* STEP 6 & STEP 7 ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* STEP 6: Signatures & Handled By */}
                  <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">6</span>
                        Signatures & Warehouse (কর্মকর্তা ও গুদাম)
                      </Label>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Prepared By</Label>
                          <Input 
                            value={preparedBy}
                            onChange={e => setPreparedBy(e.target.value)}
                            placeholder="Buyer Name"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Authorized By</Label>
                          <Input 
                            value={authorizedBy}
                            onChange={e => setAuthorizedBy(e.target.value)}
                            placeholder="Manager Name"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Received By</Label>
                          <Input 
                            value={receivedBy}
                            onChange={e => setReceivedBy(e.target.value)}
                            placeholder="Store Keeper"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Target Warehouse</Label>
                          <Select value={warehouse} onValueChange={(val: string | null) => setWarehouse(val || 'Main')}>
                            <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs font-bold">
                              <SelectItem value="Main">Main (প্রধান গুদাম)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* STEP 7: Notes (Optional) */}
                  <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">7</span>
                        Notes (Optional) (বিশেষ নির্দেশনার নোট)
                      </Label>

                      <textarea
                        rows={3}
                        value={purchaseNote}
                        onChange={e => setPurchaseNote(e.target.value)}
                        placeholder="Add any note or special instructions..."
                        className="w-full rounded-xl p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                      />
                    </CardContent>
                  </Card>

                </div>

              </div>

              {/* RIGHT 3 COLUMNS: SUMMARY SIDEBAR CARDS (Light Theme) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* CARD 1: PURCHASE INVOICE SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Purchase Summary</h3>
                      </div>
                      <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded border border-orange-200 uppercase tracking-widest">
                        DRAFT
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between text-slate-500">
                        <span>Company / Supplier</span>
                        <span className="font-bold text-slate-900">{selectedSupplier?.businessName || selectedSupplier?.name || 'UNSELECTED'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Contact Number</span>
                        <span className="font-bold text-slate-800">{selectedSupplier?.phone || '+880 1XXX XXXXXX'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Address</span>
                        <span className="font-bold text-slate-800 text-right max-w-[120px] truncate">{selectedSupplier?.address || 'No address provided'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                        <span>Purchase No</span>
                        <span className="font-bold text-slate-800">Auto (Will generate)</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Purchase Date</span>
                        <span className="font-bold text-slate-800">{format(new Date(), 'dd MMM yyyy')}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Invoice Type</span>
                        <span className="font-bold text-slate-800">PURCHASE</span>
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-slate-600">
                          <span>Items Subtotal</span>
                          <span className="font-bold text-slate-900">৳ {cartSubtotal.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {cartTotalDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span className="font-bold">- ৳ {cartTotalDiscount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        {shippingCost > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Shipping / Freight</span>
                            <span className="font-bold">+ ৳ {shippingCost.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        {laborCost > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>Unloading Labor Charge</span>
                            <span className="font-bold">+ ৳ {laborCost.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-700 font-bold pt-1">
                          <span>Purchase Total</span>
                          <span className="font-black text-slate-900">৳ {cartTotalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Previous Supplier Due</span>
                          <span className="font-black">৳ {selectedSupplierDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Grand Total (with Due)</span>
                          <span className="text-[10px] text-slate-400 font-bold">বিল + কোম্পানির পূর্বের পাওনা</span>
                        </div>
                        <span className="text-2xl font-black text-orange-600">৳ {(cartTotalAmount + selectedSupplierDue).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 2: PAYMENT SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Payment Summary</h3>
                      </div>
                    </div>

                    <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block">
                        {paidAmount > 0 ? `PAID: ৳ ${paidAmount.toLocaleString()}` : 'NO PAYMENT RECORDED'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-600">Remaining Supplier Due</span>
                      <span className="text-lg font-black text-rose-600">৳ {cartDueAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </form>

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 sticky bottom-0 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Lightbulb className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>Review purchase details before completing. Products stock will update automatically.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => { setIsCreateOpen(false); resetForm(); }}
                className="rounded-xl h-11 px-5 font-bold text-slate-600 border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                variant="secondary"
                onClick={handlePurchaseSubmit}
                className="rounded-xl h-11 px-5 font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                Save Draft
              </Button>
              <Button 
                type="submit" 
                onClick={handlePurchaseSubmit}
                className="rounded-xl h-11 px-6 font-black text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 active:scale-95 transition-all"
              >
                Complete Purchase Invoice ✓
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* VIEW PURCHASE DETAIL MODAL */}
      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl font-bengali">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black">ক্রয় ইনভয়েস বিস্তারিত</DialogTitle>
                  <p className="text-slate-400 font-mono text-sm mt-1">#{selectedPurchase?.id.toUpperCase()}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                  <Truck className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </DialogHeader>
          </div>

          {selectedPurchase && (
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">কোম্পানি</p><p className="font-black text-slate-800">{selectedPurchase.supplierName}</p></div>
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">তারিখ</p><p className="font-bold text-slate-700 text-sm">{formatDate(selectedPurchase.createdAt)}</p></div>
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">ফোন</p><p className="font-bold text-slate-700 text-sm">{selectedPurchase.supplierPhone || '—'}</p></div>
                <div>
                  <p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">স্ট্যাটাস</p>
                  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block",
                    selectedPurchase.paymentStatus === 'পরিশোধিত' ? 'bg-emerald-100 text-emerald-800' :
                    selectedPurchase.paymentStatus === 'আংশিক' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  )}>{selectedPurchase.paymentStatus}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-bold text-slate-600">পণ্য</th>
                      <th className="p-3 text-center font-bold text-slate-600">পরিমাণ</th>
                      <th className="p-3 text-right font-bold text-slate-600">ক্রয় মূল্য</th>
                      <th className="p-3 text-right font-bold text-slate-600">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items?.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{item.name}</td>
                        <td className="p-3 text-center text-slate-600 font-medium">{item.quantity} {item.unit}</td>
                        <td className="p-3 text-right text-slate-600 font-medium">৳{item.price?.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-800">৳{((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">মোট ক্রয় বিল</td>
                      <td className="p-3 text-right font-black text-slate-900 text-lg">৳{selectedPurchase.totalAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">পরিশোধিত</td>
                      <td className="p-3 text-right font-black text-emerald-600 text-lg">৳{selectedPurchase.paidAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">কোম্পানির পাওনা (বকেয়া)</td>
                      <td className="p-3 text-right font-black text-rose-600 text-lg">৳{selectedPurchase.dueAmount?.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Transport & Site Details Box if available */}
              {(selectedPurchase.vehicleNo || selectedPurchase.driverName || selectedPurchase.deliveryAddress) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-orange-50/60 border border-orange-200/80 rounded-2xl text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">গাড়ি / ট্রাক নম্বর</span>
                    <span className="font-black text-slate-900">{selectedPurchase.vehicleNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">ড্রাইভারের নাম ও ফোন</span>
                    <span className="font-bold text-slate-800">{selectedPurchase.driverName || '—'} {selectedPurchase.driverPhone ? `(${selectedPurchase.driverPhone})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">আনলোডিং সাইট / গুদাম</span>
                    <span className="font-bold text-slate-800">{selectedPurchase.deliveryAddress || selectedPurchase.supplierAddress || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedPurchase(null)} className="rounded-xl font-bold text-slate-500 border-slate-200">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
