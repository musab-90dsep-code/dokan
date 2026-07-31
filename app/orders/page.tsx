'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Search, Eye, Printer, X, FileText, Receipt, Banknote, AlertCircle, Trash2, CheckCircle2, Plus, 
  ShoppingCart, User, Tag, ArrowRight, ShieldAlert, Clock, Truck, HardHat, Calendar, MapPin, PhoneCall, Building,
  Paperclip, HelpCircle, Bell, Info, Save, Package, MoreVertical, Pencil
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn, fixMiliName } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';

interface Product { 
  id: string; 
  name: string; 
  sellPrice: number; 
  stock: number; 
  unit: string; 
  category: string; 
  code?: string;
}

interface Customer { 
  id: string; 
  name: string; 
  phone?: string; 
  address?: string; 
  businessName?: string; 
}

interface OrderItem { 
  id: string; 
  name: string; 
  unit: string; 
  price: number; 
  quantity: number; 
  discount: number; 
  bundle?: number | string;
  series?: string;
  variant?: string;
}

interface Order { 
  id: string; 
  orderId?: string; 
  customerName: string; 
  customerPhone: string; 
  customerAddress?: string; 
  businessName?: string; 
  customerId?: string; 
  siteAddress?: string;
  siteContact?: string;
  totalAmount: number; 
  paidAmount: number; 
  dueAmount: number; 
  items: OrderItem[]; 
  stage: 'draft' | 'pending' | 'approved' | 'rejected';
  paymentStatus: string; 
  createdAt: any; 
  note?: string;
  transportCost?: number;
  laborCost?: number;
  vehicleNo?: string;
  driverInfo?: string;
  expectedPaymentDate?: string;
  invoiced?: boolean;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('সব');
  const [filterStatus, setFilterStatus] = useState('সব');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Invoice & Print Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState(false);
  const [orderToInvoice, setOrderToInvoice] = useState<Order | null>(null);
  const [invoicePaid, setInvoicePaid] = useState<number>(0);
  const [invoiceMethod, setInvoiceMethod] = useState<string>('Cash');
  const [bankName, setBankName] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');

  // Form States
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('পেন্ডিং');
  const [autoOrderId, setAutoOrderId] = useState<string>('');

  // Customer Selection States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '', businessName: '' });
  const [siteAddress, setSiteAddress] = useState('');
  const [siteContact, setSiteContact] = useState('');

  // Bank & Payment Details
  const [savedBanks, setSavedBanks] = useState<{ id: string; name: string; accNo: string }[]>([]);
  const [selectedShopBank, setSelectedShopBank] = useState('ডাচ-বাংলা ব্যাংক - 123.456.7890');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [senderAccountNo, setSenderAccountNo] = useState('');
  const [senderTxnRef, setSenderTxnRef] = useState('');

  // Cart & Item Selector States
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCascadingProduct, setSelectedCascadingProduct] = useState<SelectedProductDetails | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [bundleCount, setBundleCount] = useState<string>('');

  // Transport & Advance Logistics States
  const [transportCost, setTransportCost] = useState<number>(300);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverInfo, setDriverInfo] = useState('');
  const [advancePaid, setAdvancePaid] = useState<number>(5000);
  const [advanceMethod, setAdvanceMethod] = useState('Cash');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [orderNote, setOrderNote] = useState<string>('');

  // Reference ERP Form Screen-Matched States
  const [orderDate, setOrderDate] = useState('28/07/2026');
  const [deliveryDate, setDeliveryDate] = useState('31/07/2026');
  const [requiredDelivery, setRequiredDelivery] = useState('না');
  const [itemUnit, setItemUnit] = useState('বস্তা (Bag)');
  const [salesRepresentative, setSalesRepresentative] = useState('রাশেদ আহমেদ');
  const [referenceReceiver, setReferenceReceiver] = useState('মোঃ করিম উদ্দিন');
  const [deliveryAddressText, setDeliveryAddressText] = useState('বাড়ি নং-১২, রোড নং-৫, মিরপুর, ঢাকা-১২১৬');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [customerNoteText, setCustomerNoteText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [deliveryNoteText, setDeliveryNoteText] = useState('');
  const [vatRate, setVatRate] = useState(0);
  const [paymentMethodSelect, setPaymentMethodSelect] = useState('ক্যাশ');
  const [paymentReferenceNo, setPaymentReferenceNo] = useState('—');
  const [cashBankAccount, setCashBankAccount] = useState('নগদ ব্যাংক');

  const generateOrderCode = () => 'ORD-' + Math.floor(100000 + Math.random() * 900000);

  const loadOrdersData = async () => {
    try {
      setLoading(true);
      const sales = await api.transactions.list({ transaction_type: 'sale' });
      setOrders(sales.map(s => ({
        id: String(s.id),
        orderId: s.invoice_no,
        customerName: s.party_name || 'গ্রাহক',
        customerPhone: s.party_phone || '',
        customerId: String(s.party || ''),
        totalAmount: s.total_amount,
        paidAmount: s.paid_amount,
        dueAmount: s.due_amount,
        stage: s.status === 'completed' ? 'approved' : 'pending',
        invoiced: s.status === 'completed',
        paymentStatus: s.due_amount <= 0 ? 'paid' : 'unpaid',
        items: (s.items || []).map(i => ({
          id: String(i.id || Math.random()),
          name: fixMiliName(i.product_name),
          price: i.price,
          quantity: i.quantity,
          unit: i.unit || 'পিস',
          discount: 0
        })),
        createdAt: s.created_at
      })));

      const prodList = await api.inventory.list();
      setProducts(prodList.map(p => ({
        id: String(p.id),
        name: p.name,
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        category: p.category_name || 'অন্যান্য'
      })));

      const partyList = await api.parties.list({ party_type: 'customer' });
      setCustomers(partyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        businessName: p.business_name || ''
      })));

      const bankList = await api.banks.list();
      setSavedBanks(bankList.map(b => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || ''
      })));
    } catch (err) {
      console.error('Error loading orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toBnDigits = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadOrdersData();
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'create') {
        queueMicrotask(() => {
          setIsCreateOrderOpen(true);
        });
      }
      const targetId = params.get('id') || params.get('view');
      if (targetId && orders.length > 0) {
        const match = orders.find(o => String(o.id) === String(targetId) || o.orderId === targetId);
        if (match) {
          queueMicrotask(() => {
            setSelectedOrder(match);
          });
        }
      }
    }
  }, [orders]);

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, orderId: string) => {
    e.stopPropagation();
    if (openMenuId === orderId) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 130;
    const menuWidth = 180;

    const openAbove = rect.top > menuHeight + 10;
    const top = openAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.right - menuWidth));

    setMenuPos({ top, left });
    setOpenMenuId(orderId);
  };

  const handleOpenCreateModal = () => {
    setEditingOrderId(null);
    resetCreateForm();
    setAutoOrderId(generateOrderCode());
    setIsCreateOrderOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setAutoOrderId((order as any).orderId || order.id);
    setOrderStatus((order as any).status || 'পেন্ডিং');
    setOrderDate((order as any).orderDate || new Date().toISOString().split('T')[0]);
    
    const foundCust = customers.find(c => c.id === order.customerId);
    if (foundCust) {
      setSelectedCustomer(foundCust);
      setIsNewCustomer(false);
    } else {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
      setNewCustomerData({
        name: order.customerName || '',
        phone: order.customerPhone || '',
        address: order.customerAddress || '',
        businessName: ''
      });
    }

    setCart(order.items?.map(i => ({
      id: i.id || String(Date.now()),
      name: i.name || '',
      unit: i.unit || 'বস্তা',
      price: i.price || 0,
      quantity: i.quantity || 1,
      discount: i.discount || 0
    })) || []);

    setOrderNote(order.note || '');
    setIsCreateOrderOpen(true);
  };

  const formatDate = (at: any) => {
    if (!at) return '';
    const date = new Date(at);
    return format(date, 'dd MMM yyyy, hh:mm a', { locale: bn });
  };

  // Cart Add Item with Bundle/Piece option
  const handleAddCartItem = () => {
    const itemName = selectedCascadingProduct?.name || products.find(p => p.id === selectedProductId)?.name;
    if (!itemName) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }

    const itemUnitToUse = selectedCascadingProduct?.unit || 'বস্তা/কেজি';
    const itemId = selectedCascadingProduct?.productId || selectedProductId || String(Date.now());
    const finalPrice = selectedCascadingProduct?.price || 0;

    setCart(prev => {
      const existing = prev.find(i => i.name === itemName);
      if (existing) {
        return prev.map(i => i.name === itemName ? { 
          ...i, 
          quantity: i.quantity + itemQty, 
          price: finalPrice || i.price,
          discount: itemDiscount,
          bundle: bundleCount || i.bundle
        } : i);
      }
      return [...prev, {
        id: itemId,
        name: itemName,
        unit: itemUnitToUse,
        price: finalPrice,
        quantity: itemQty,
        discount: itemDiscount || 0,
        bundle: bundleCount || ''
      }];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setBundleCount('');
    toast.success(`${itemName} অর্ডারে যোগ করা হয়েছে`);
  };

  const handleRemoveCartItem = (id?: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateCartQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
  };

  // Rod & Cement Complete Cart Calculations
  const cartSubtotal = cart.reduce((a, i) => a + (i.price * i.quantity), 0);
  const cartTotalDiscount = cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0);
  const productTotal = Math.max(0, cartSubtotal - cartTotalDiscount);
  const cartGrandTotal = productTotal + (transportCost || 0) + (laborCost || 0);
  const cartDueAmount = Math.max(0, cartGrandTotal - (advancePaid || 0));

  const resetCreateForm = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', address: '', businessName: '' });
    setSiteAddress('');
    setSiteContact('');
    setCart([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setBundleCount('');
    setTransportCost(0);
    setLaborCost(0);
    setVehicleNo('');
    setDriverInfo('');
    setAdvancePaid(0);
    setAdvanceMethod('Cash');
    setExpectedPaymentDate('');
    setOrderNote('');
    setOrderStatus('পেন্ডিং');
    setAutoOrderId('');
  };

  // Create Order
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('অন্তত একটি পণ্য নির্বাচন করুন');
      return;
    }
    if (!selectedCustomer && (!isNewCustomer || !newCustomerData.name.trim())) {
      toast.error('কাস্টমার নির্বাচন করুন অথবা নাম পূরণ করুন');
      return;
    }

    try {
      let finalCustId = selectedCustomer?.id;
      if (isNewCustomer && newCustomerData.name.trim()) {
        const createdParty = await api.parties.create({
          party_type: 'customer',
          name: newCustomerData.name.trim(),
          phone: newCustomerData.phone.trim(),
          address: newCustomerData.address.trim(),
          business_name: newCustomerData.businessName.trim()
        });
        finalCustId = String(createdParty.id);
      }

      await api.transactions.create({
        party: finalCustId ? Number(finalCustId) : null,
        transaction_type: 'sale',
        status: 'pending',
        total_amount: cartGrandTotal,
        paid_amount: advancePaid,
        due_amount: cartDueAmount,
        payment_method: advanceMethod.toLowerCase(),
        items: cart.map(i => ({
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
          unit: i.unit,
          total: i.price * i.quantity
        })),
        notes: orderNote
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      toast.success('নতুন রড ও সিমেন্ট বিক্রয় অর্ডার সফলভাবে সংরক্ষিত হয়েছে!');
      resetCreateForm();
      setIsCreateOrderOpen(false);
      setEditingOrderId(null);
      loadOrdersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'অর্ডার তৈরি করতে সমস্যা হয়েছে');
    }
  };

  // Process Invoice ONLY for the selected single order
  const handleConfirmSingleOrderInvoice = async () => {
    if (!orderToInvoice) return;

    try {
      await api.transactions.update(orderToInvoice.id, {
        status: 'completed',
        paid_amount: invoicePaid,
        due_amount: Math.max(0, orderToInvoice.totalAmount - invoicePaid),
        payment_method: invoiceMethod.toLowerCase()
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      toast.success('চালান সফলভাবে সম্পন্ন হয়েছে! স্টক ও হিসাব আপডেট করা হয়েছে।');
      setIsInvoiceModalOpen(false);
      setOrderToInvoice(null);
      loadOrdersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই অর্ডারটি মুছে ফেলতে চান?')) return;
    try {
      await api.transactions.delete(id);
      toast.success('অর্ডার মুছে ফেলা হয়েছে');
      loadOrdersData();
    } catch {
      toast.error('সমস্যা হয়েছে');
    }
  };

  // Filter list
  const filtered = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'সব') return matchesSearch;
    if (filterStatus === 'অপেক্ষমাণ') return matchesSearch && !o.invoiced;
    if (filterStatus === 'সম্পন্ন') return matchesSearch && o.invoiced;
    return matchesSearch;
  });

  const pendingOrdersCount = orders.filter(o => !o.invoiced).length;
  const invoicedOrdersCount = orders.filter(o => o.invoiced).length;

  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-bengali flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-orange-500" /> বিক্রয় অর্ডার ইতিহাস
            </h2>
            <p className="text-slate-500 font-bengali mt-1">দোকানের সকল বিক্রয় অর্ডারের তালিকা ও চালান ব্যবস্থাপনা</p>
          </div>
          
          <Button 
            onClick={handleOpenCreateModal}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bengali h-12 px-6 rounded-2xl font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />নতুন অর্ডার তৈরি করুন
          </Button>
        </div>

        {/* Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-orange-100 bg-orange-50/50 shadow-sm rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-600 text-white shadow-md">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">চালান অপেক্ষমাণ অর্ডার</p>
                <p className="text-2xl font-black font-bengali text-orange-700 mt-0.5">{pendingOrdersCount} টি</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-100 bg-emerald-50/50 shadow-sm rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">চালান সম্পন্ন অর্ডার</p>
                <p className="text-2xl font-black font-bengali text-emerald-700 mt-0.5">{invoicedOrdersCount} টি</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 bg-white shadow-sm rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 text-white shadow-md">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali">সর্বমোট অর্ডার রেকার্ড</p>
                <p className="text-2xl font-black font-bengali text-slate-900 mt-0.5">{orders.length} টি</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit border border-slate-100">
            {['সব', 'অপেক্ষমাণ', 'সম্পন্ন'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn("px-5 py-2 rounded-xl text-[13px] font-black font-bengali transition-all",
                  filterStatus === s
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                )}
              >
                {s === 'সব' ? 'সব অর্ডার' : s === 'অপেক্ষমাণ' ? 'চালান অপেক্ষমাণ' : 'চালান সম্পন্ন'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ক্রেতার নাম বা আইডি..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 font-bengali rounded-xl h-11 shadow-sm"
            />
          </div>
        </div>

        {/* Order History Table */}
        <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black py-4 px-6 uppercase">অর্ডার #</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">তারিখ</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">ক্রেতার নাম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">আইটেম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">মোট বিল</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">চালান স্ট্যাটাস</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right py-4 px-6 uppercase">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 font-bengali font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bengali font-bold text-lg">কোনো অর্ডার পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(o => (
                  <TableRow 
                    key={o.id} 
                    onClick={() => setSelectedOrder(o)} 
                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <TableCell className="py-4 px-6">
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-xs">#{o.id.slice(0, 8).toUpperCase()}</span>
                    </TableCell>
                    <TableCell className="font-bengali text-xs font-semibold text-slate-500">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="font-bengali font-black text-slate-800 text-sm">{o.customerName}</TableCell>
                    <TableCell className="text-center font-bengali text-xs font-bold text-slate-600">{o.items?.length || 0} টি পণ্য</TableCell>
                    <TableCell className="text-right font-bengali font-black text-slate-900 text-base">৳{o.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-3 py-1 rounded-lg text-[11px] font-black font-bengali uppercase tracking-wider inline-block",
                        o.invoiced 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      )}>
                        {o.invoiced ? 'চালান সম্পন্ন ✓' : 'চালান অপেক্ষমাণ'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4 px-6" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => toggleMenu(e, o.id)}
                        className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* FULL SCREEN CREATE NEW SALES ORDER PAGE OVERLAY (1:1 REPLICA OF USER REFERENCE IMAGE) */}
      {isCreateOrderOpen && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-[#f8fafc] overflow-y-auto font-bengali p-6 sm:p-8">
          <form onSubmit={handleCreateOrderSubmit} className="max-w-7xl mx-auto space-y-6 pb-16">
            
            {/* TOP HEADER BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F97316] flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">নতুন বিক্রয় অর্ডার</h1>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">অর্ডার তৈরি করুন ও সংরক্ষণ করুন</p>
                </div>
              </div>

              <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-orange-800 font-bold">অর্ডার আইডি (স্বয়ংক্রিয়)</p>
                  <p className="text-sm font-mono font-black text-rose-600">{autoOrderId || 'SO-2026-000156'}</p>
                </div>
              </div>
            </div>

            {/* MAIN TWO-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* --- LEFT COLUMN (WIDE ~70%) --- */}
              <div className="lg:col-span-8 space-y-5">

                {/* 1. TOP BAR FILTERS ROW */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">• অর্ডার তারিখ</Label>
                    <Input 
                      type="text"
                      value={orderDate} 
                      onChange={e => setOrderDate(e.target.value)} 
                      className="rounded-xl h-10 border-slate-200 bg-white text-xs font-bold text-slate-800" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">• ডেলিভারি তারিখ</Label>
                    <Input 
                      type="text"
                      value={deliveryDate} 
                      onChange={e => setDeliveryDate(e.target.value)} 
                      className="rounded-xl h-10 border-slate-200 bg-white text-xs font-bold text-slate-800" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">• অর্ডার স্ট্যাটাস</Label>
                    <Select value={orderStatus} onValueChange={(v: string | null) => setOrderStatus(v || 'পেন্ডিং')}>
                      <SelectTrigger className="rounded-xl h-10 border-slate-200 bg-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-bengali">
                        <SelectItem value="পেন্ডিং">
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">পেন্ডিং</span>
                        </SelectItem>
                        <SelectItem value="প্রসেসিং">
                          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">প্রসেসিং</span>
                        </SelectItem>
                        <SelectItem value="সম্পন্ন">
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">সম্পন্ন</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">• প্রয়োজনীয় ডেলিভারি</Label>
                    <Select value={requiredDelivery} onValueChange={(v: string | null) => setRequiredDelivery(v || 'না')}>
                      <SelectTrigger className="rounded-xl h-10 border-slate-200 bg-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-bengali">
                        <SelectItem value="না">না</SelectItem>
                        <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 2. CUSTOMER SELECTION CARD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-600" /> কাস্টমার নির্বাচন করুন
                    </h2>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsNewCustomer(!isNewCustomer);
                        if (isNewCustomer) setSelectedCustomer(null);
                      }}
                      className="rounded-xl h-9 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    >
                      + নতুন কাস্টমার
                    </Button>
                  </div>

                  {!isNewCustomer ? (
                    <CustomerSearchSelect
                      customers={customers}
                      selectedCustomer={selectedCustomer}
                      onSelectCustomer={(cust) => setSelectedCustomer(cust)}
                      onAddNewClick={() => setIsNewCustomer(true)}
                      placeholder="কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        value={newCustomerData.name} 
                        onChange={e => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))} 
                        placeholder="কাস্টমার নাম *" 
                        className="rounded-xl h-11 border-slate-200 text-xs bg-white" 
                      />
                      <Input 
                        value={newCustomerData.phone} 
                        onChange={e => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))} 
                        placeholder="মোবাইল নম্বর" 
                        className="rounded-xl h-11 border-slate-200 text-xs bg-white" 
                      />
                    </div>
                  )}

                  {/* Selected Customer Stats Row */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bengali">
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 text-slate-400" /> মোবাইল নম্বর
                      </p>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedCustomer?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> ঠিকানা
                      </p>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedCustomer?.address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">ধরন</p>
                      {selectedCustomer ? (
                        <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                          নিয়মিত কাস্টমার
                        </span>
                      ) : (
                        <p className="font-bold text-slate-400 mt-0.5">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">বকেয়া</p>
                      <p className="font-black text-rose-600 mt-0.5">
                        {selectedCustomer ? `৳ ${((selectedCustomer as any)?.totalDue || 0).toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. PRODUCT ADDING CARD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" /> পণ্য যোগ করুন
                  </h2>

                  {/* Step-by-Step Cascading Product Selector (Rod, Cement, Ring) without Price Field */}
                  <CascadingProductSelector
                    products={products}
                    onProductChange={(selected) => {
                      setSelectedCascadingProduct(selected);
                      if (selected && selected.productId) {
                        setSelectedProductId(selected.productId);
                      }
                    }}
                    showPriceField={false}
                    itemQty={itemQty}
                    onQtyChange={setItemQty}
                    itemPrice={itemPrice}
                    onPriceChange={setItemPrice}
                    onAddCartItem={handleAddCartItem}
                  />

                  {/* 4. CART ITEMS TABLE */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-slate-800">অর্ডারে যোগ করা পণ্যসমূহ</h3>
                    
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                          <TableRow>
                            <TableHead className="w-10 text-center font-bold text-slate-700 text-[11px]">#</TableHead>
                            <TableHead className="font-bold text-slate-700 text-[11px]">পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-bold text-slate-700 text-[11px]">ইউনিট</TableHead>
                            <TableHead className="text-center font-bold text-slate-700 text-[11px]">পরিমাণ</TableHead>
                            <TableHead className="text-center font-bold text-slate-700 text-[11px]">স্টক উপলব্ধ</TableHead>
                            <TableHead className="text-center font-bold text-slate-700 text-[11px]">মন্তব্য</TableHead>
                            <TableHead className="w-16 text-center font-bold text-slate-700 text-[11px]">অ্যাকশন</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs font-bengali">
                          {cart.length > 0 ? (
                            cart.map((item, idx) => (
                              <TableRow key={item.id || idx} className="border-b border-slate-100">
                                <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                                <TableCell className="font-bold text-slate-900">
                                  <span className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-[10px]">
                                      {item.unit === 'কেজি' ? '🥢' : '🛢️'}
                                    </span>
                                    {item.name}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-slate-600">{item.unit || 'বস্তা'}</TableCell>
                                <TableCell className="text-center font-bold text-slate-900">{item.quantity}</TableCell>
                                <TableCell className="text-center">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {(item as any).stock || 0} {item.unit || 'বস্তা'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-slate-400">—</TableCell>
                                <TableCell className="text-center">
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveCartItem(item.id)}
                                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center mx-auto transition-colors"
                                    title="সরিয়ে ফেলুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                                কোনো পণ্য যোগ করা হয়নি। উপর থেকে পণ্য নির্বাচন করে &quot;+ যোগ করুন&quot; বাটনে ক্লিক করুন।
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Notice Info Box */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-800 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium">পণ্য তালিকা থেকে কোনো আইটেম অপসারণ করতে ডিলিট বাটনে ক্লিক করুন।</span>
                    </div>
                  </div>
                </div>

                {/* 5. NOTES & ATTACHMENT CARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      ✏️ অর্ডার নোট (ঐচ্ছিক)
                    </Label>
                    <textarea 
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      placeholder="অর্ডার সম্পর্কে কোনো বিশেষ নোট..." 
                      className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bengali resize-none"
                    />
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      📑 সংযুক্তি (ঐচ্ছিক)
                    </Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl h-24 flex flex-col items-center justify-center p-3 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">ফাইল সংযুক্ত করুন</p>
                      <p className="text-[10px] text-slate-400">বা এখানে ড্রপ করুন</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* --- RIGHT SIDEBAR (~30% ORDER SUMMARY) --- */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    📑 অর্ডার সারসংক্ষেপ
                  </h2>

                  <div className="space-y-3 text-xs">
                    {/* Stat 1 */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold">মোট আইটেম</p>
                        <p className="text-base font-black text-slate-900">{cart.length}</p>
                      </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold">মোট পরিমাণ</p>
                        <p className="text-base font-black text-slate-900">
                          {cart.reduce((a, i) => a + i.quantity, 0)}
                        </p>
                        {cart.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-semibold">
                            ( {cart.map(i => `${i.quantity} ${i.unit || ''}`).join(', ')} )
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold">মোট ওজন (রড)</p>
                        <p className="text-base font-black text-slate-900">
                          {cart.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, i) => a + i.quantity, 0)} কেজি
                        </p>
                      </div>
                    </div>

                    {/* Stat 4 */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold">ডেলিভারি তারিখ</p>
                        <p className="text-sm font-bold text-slate-900">{deliveryDate || '—'}</p>
                      </div>
                    </div>

                    {/* Stat 5 */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold">অর্ডার স্ট্যাটাস</p>
                        <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5">
                          {orderStatus || 'পেন্ডিং'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Yellow Tip Card */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1 text-amber-800">
                      💡 অর্ডার সংরক্ষণ করলে এটি পেন্ডিং থাকবে।
                    </p>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      অনুমোদন করার পরেই ইনভয়েসে এবং হিসাব খাতায় হিট হবে।
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* BOTTOM ACTION FOOTER BAR */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsCreateOrderOpen(false)}
                className="rounded-xl h-11 px-6 font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                ✕ বাতিল
              </Button>

              <Button 
                type="submit" 
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold h-11 px-6 rounded-xl shadow-md transition-all"
              >
                💾 অর্ডার সংরক্ষণ
              </Button>

              <Button 
                type="button" 
                onClick={handleCreateOrderSubmit}
                className="bg-[#059669] hover:bg-[#047857] text-white font-bold h-11 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                ✓ অর্ডার অনুমোদন করুন →
              </Button>
            </div>

          </form>
        </div>
      )}

      {/* DEDICATED SINGLE-ORDER INVOICING MODAL */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-6 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-bengali text-xl font-black flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" /> চালান তৈরি করুন (একক অর্ডার)
                  </DialogTitle>
                  <p className="text-slate-300 font-mono text-xs mt-1">অর্ডার #{orderToInvoice?.id.toUpperCase()}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </DialogHeader>
          </div>

          {orderToInvoice && (
            <div className="p-6 space-y-5 bg-white font-bengali max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">কাস্টমারের নাম:</span>
                  <span className="font-bold text-slate-900">{orderToInvoice.customerName}</span>
                </div>
                {orderToInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ফোন নম্বর:</span>
                    <span className="font-semibold text-slate-700">{orderToInvoice.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-emerald-200/60 pt-2 text-base">
                  <span className="font-bold text-slate-800">সর্বমোট ইনভয়েস বিল:</span>
                  <span className="font-black text-emerald-700 text-lg">৳ {orderToInvoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* ITEMS IN THIS ORDER ONLY */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="p-2.5 text-left font-bold text-slate-700">পণ্য</th>
                      <th className="p-2.5 text-center font-bold text-slate-700">পরিমাণ</th>
                      <th className="p-2.5 text-right font-bold text-slate-700">একক মূল্য</th>
                      <th className="p-2.5 text-right font-bold text-slate-700">মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderToInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                        <td className="p-2.5 text-center text-slate-600 font-medium">{item.quantity} {item.unit}</td>
                        <td className="p-2.5 text-right text-slate-600">৳{item.price?.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">৳{((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAYMENT INPUTS */}
              <div className="space-y-4 pt-1 font-bengali">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest font-black text-slate-600">পেমেন্ট মাধ্যম</Label>
                  <Select value={invoiceMethod} onValueChange={(val: string | null) => setInvoiceMethod(val || 'Cash')}>
                    <SelectTrigger className="rounded-xl h-11 bg-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-bengali font-bold">
                      <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                      <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার (Bank Transfer)</SelectItem>
                      <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার (Bank to Bank)</SelectItem>
                      <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest font-black text-slate-600">গ্রহণকৃত পরিমাণ (৳)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={invoicePaid}
                    onChange={e => setInvoicePaid(parseFloat(e.target.value) || 0)}
                    className="h-12 rounded-xl text-center text-xl font-black text-emerald-600 bg-emerald-50/50"
                  />
                </div>

                {/* BANK TRANSFER (SAVED ACCOUNT SELECTOR) */}
                {invoiceMethod === 'Bank' && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                    </p>
                    <div className="space-y-1 text-xs">
                      <Label className="text-[11px] font-bold text-slate-600">গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
                      <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-bold border-slate-200">
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
                      <Label className="text-[11px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (অপশনাল)</Label>
                      <Input 
                        placeholder="Txn ID / Ref No" 
                        value={transactionRef} 
                        onChange={e => setTransactionRef(e.target.value)}
                        className="h-9 rounded-lg bg-white mt-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* BANK TO BANK TRANSFER (RECEIVER SAVED SELECTOR + SENDER CUSTOMER INPUTS) */}
                {invoiceMethod === 'BankToBank' && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                    </p>
                    
                    {/* RECEIVER (SHOP) ACCOUNT */}
                    <div className="space-y-1 text-xs">
                      <Label className="text-[11px] font-bold text-indigo-950 block">
                        ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                      </Label>
                      <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-bold border-indigo-200">
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

                    {/* SENDER (CUSTOMER) BANK INPUTS */}
                    <div className="space-y-2 pt-2 border-t border-indigo-100">
                      <Label className="text-[11px] font-bold text-slate-700 block">
                        ২. প্রেরকের ব্যাংক তথ্য (কাস্টমারের ব্যাংক অ্যাকাউন্ট)
                      </Label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                          <Input 
                            placeholder="যেমন: ইবিএল / প্রাইম ব্যাংক" 
                            value={senderBankName} 
                            onChange={e => setSenderBankName(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                          <Input 
                            placeholder="A/C No or Name" 
                            value={senderAccountNo} 
                            onChange={e => setSenderAccountNo(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                          <Input 
                            placeholder="Txn ID / Ref No" 
                            value={senderTxnRef} 
                            onChange={e => setSenderTxnRef(e.target.value)}
                            className="h-9 rounded-lg bg-white mt-0.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHEQUE SPECIFIC FIELDS */}
                {invoiceMethod === 'Cheque' && (
                  <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-3 font-bengali animate-in fade-in-0">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      📄 চেকের বিবরণ
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-600">ব্যাংকের নাম</Label>
                        <Input 
                          placeholder="ব্যাংকের নাম" 
                          value={bankName} 
                          onChange={e => setBankName(e.target.value)}
                          className="h-9 rounded-lg bg-white mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-slate-600">চেক নম্বর</Label>
                        <Input 
                          placeholder="চেক নং (e.g. CQ-10293)" 
                          value={chequeNo} 
                          onChange={e => setChequeNo(e.target.value)}
                          className="h-9 rounded-lg bg-white mt-1 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[11px] font-bold text-slate-600">চেকের তারিখ / মেয়াদ</Label>
                        <Input 
                          type="date" 
                          value={chequeDate} 
                          onChange={e => setChequeDate(e.target.value)}
                          className="h-9 rounded-lg bg-white mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {orderToInvoice.totalAmount - invoicePaid > 0 ? (
                  <p className="text-xs text-rose-600 font-bold text-center">কাস্টমারের বকেয়া খাতায় যুক্ত হবে: ৳ {(orderToInvoice.totalAmount - invoicePaid).toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-emerald-600 font-bold text-center">পরিশোধিত ✓ (কোনো বকেয়া থাকবে না)</p>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInvoiceModalOpen(false)} 
                  className="rounded-xl h-12 font-bold text-slate-600 border-slate-200"
                >
                  বাতিল
                </Button>
                <Button 
                  type="button" 
                  onClick={handleConfirmSingleOrderInvoice} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-base"
                >
                  চালান সম্পন্ন করুন ✓
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 1:1 REPLICA ERP ORDER DETAIL VIEW OVERLAY */}
      {selectedOrder && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-[#f8fafc] overflow-y-auto font-bengali p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6 pb-16">
            
            {/* TOP HEADER BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
                >
                  ← অর্ডার তালিকায় ফিরে যান
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">অর্ডার বিস্তারিত</h1>
                  <span className="bg-orange-50 text-orange-600 font-mono text-sm font-black px-3 py-1 rounded-lg border border-orange-200">
                    {(selectedOrder as any).orderId || selectedOrder.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                    {selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'Pending Approval'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  অর্ডার তৈরি হয়েছে: {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const orderToEdit = selectedOrder;
                    setSelectedOrder(null);
                    handleEditOrder(orderToEdit);
                  }}
                  className="rounded-xl h-10 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> এডিট করুন
                </Button>

                <Button 
                  onClick={() => {
                    router.push(`/invoices?fromOrder=${selectedOrder.id}`);
                  }}
                  className="rounded-xl h-10 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve করুন
                </Button>

                <Button 
                  onClick={() => setIsPrintMemoOpen(true)}
                  className="rounded-xl h-10 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> প্রিন্ট (অর্ডার)
                </Button>

                <Button 
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="rounded-xl h-10 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> বাতিল করুন
                </Button>
              </div>
            </div>

            {/* PROGRESS STEPPER BAR */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="grid grid-cols-5 gap-2 relative text-center">
                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">অর্ডার তৈরি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 border-2 border-amber-400 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">অ্যাপ্রুভাল অপেক্ষায়</p>
                    <p className="text-[10px] text-amber-600 font-bold">{(selectedOrder as any).status || 'পেন্ডিং'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2", selectedOrder.invoiced ? "bg-emerald-100 text-emerald-600 border-emerald-500" : "bg-slate-100 text-slate-400 border-slate-200")}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">ইনভয়েস তৈরি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedOrder.invoiced ? 'সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 border-2 border-slate-200 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">ডেলিভারি</p>
                    <p className="text-[10px] text-slate-400 font-semibold">—</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 border-2 border-slate-200 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">সম্পন্ন</p>
                    <p className="text-[10px] text-slate-400 font-semibold">—</p>
                  </div>
                </div>

                <div className="absolute top-5 left-12 right-12 h-0.5 border-t-2 border-dashed border-slate-200 z-0" />
              </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-6">

                {/* Customer & Order Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Customer Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User className="w-4 h-4 text-blue-600" /> কাস্টমার তথ্য
                    </h2>

                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">কাস্টমারের নাম</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-base font-black text-slate-900">{selectedOrder.customerName || 'সাধারণ ক্রেতা'}</p>
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Regular</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-slate-400" /> মোবাইল নম্বর
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.customerPhone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> ঠিকানা
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.customerAddress || '—'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">বকেয়া ব্যালেন্স</p>
                          <p className="text-sm font-black text-rose-600 mt-0.5">
                            ৳ {((customers.find(c => c.id === selectedOrder.customerId) as any)?.totalDue || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">মোট বিল</p>
                          <p className="text-sm font-black text-emerald-600 mt-0.5">
                            ৳ {selectedOrder.totalAmount?.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div>
                          <p className="text-slate-400">তৈরি সময়</p>
                          <p className="font-bold text-slate-700 mt-0.5">{formatDate(selectedOrder.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">চালান স্ট্যাটাস</p>
                          <p className="font-bold text-emerald-600 mt-0.5">{selectedOrder.invoiced ? 'চালান সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText className="w-4 h-4 text-blue-600" /> অর্ডার তথ্য
                    </h2>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার আইডি</p>
                        <p className="font-mono font-black text-slate-900 mt-0.5">
                          {(selectedOrder as any).orderId || selectedOrder.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার তারিখ</p>
                        <p className="font-bold text-slate-900 mt-0.5">{(selectedOrder as any).orderDate || formatDate(selectedOrder.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">ডেলিভারি তারিখ</p>
                        <p className="font-bold text-slate-900 mt-0.5">{(selectedOrder as any).deliveryDate || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">অর্ডার স্ট্যাটাস</p>
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                          {(selectedOrder as any).status || (selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'পেন্ডিং')}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">মোট আইটেম</p>
                        <p className="font-bold text-slate-900 mt-0.5">{selectedOrder.items?.length || 0} টি</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">সর্বমোট বিল</p>
                        <p className="font-black text-emerald-600 mt-0.5">৳ {selectedOrder.totalAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Ordered Items Table */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    📦 অর্ডারকৃত পণ্যের তালিকা
                  </h2>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="w-10 text-center font-bold text-slate-700 text-[11px]">#</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[11px]">পণ্যের নাম</TableHead>
                          <TableHead className="text-center font-bold text-slate-700 text-[11px]">ইউনিট</TableHead>
                          <TableHead className="text-center font-bold text-slate-700 text-[11px]">পরিমাণ</TableHead>
                          <TableHead className="text-right font-bold text-slate-700 text-[11px]">একক মূল্য</TableHead>
                          <TableHead className="text-right font-bold text-slate-700 text-[11px]">মোট মূল্য</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {selectedOrder.items?.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-slate-100">
                            <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-900">
                              <span className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-[10px]">
                                  {item.unit === 'কেজি' ? '🥢' : '🛢️'}
                                </span>
                                {item.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-slate-600">{item.unit || 'বস্তা'}</TableCell>
                            <TableCell className="text-center font-bold text-slate-900">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-slate-700">৳ {item.price?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-black text-slate-900">৳ {(item.price * item.quantity).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl grid grid-cols-3 gap-4 text-xs font-bengali">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট আইটেম</p>
                        <p className="text-base font-black text-slate-900">{selectedOrder.items?.length || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট সিমেন্ট</p>
                        <p className="text-base font-black text-slate-900">
                          {selectedOrder.items?.filter(i => i.unit?.includes('বস্তা') || i.name?.includes('সিমেন্ট')).reduce((a, b) => a + b.quantity, 0)} Bag
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">মোট রড</p>
                        <p className="text-base font-black text-slate-900">
                          {selectedOrder.items?.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, b) => a + b.quantity, 0)} Kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note & Attachment */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    ✏️ অর্ডার নোট
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {selectedOrder.note || 'কোনো বিষয় দ্রষ্টব্য নোট দেওয়া হয়নি।'}
                  </p>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN */}
              <div className="lg:col-span-4 space-y-6">

                {/* Quick Actions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    ⚡ দ্রুত কার্যক্রম
                  </h2>

                  <div className="space-y-2">
                    {!selectedOrder.invoiced && (
                      <Button 
                        onClick={() => router.push(`/invoices?fromOrder=${selectedOrder.id}`)}
                        className="w-full justify-start bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs h-10 rounded-xl border border-emerald-200/80"
                      >
                        ✓ অর্ডার অনুমোদন / চালান তৈরি করুন
                      </Button>
                    )}
                    <Button 
                      onClick={() => setIsPrintMemoOpen(true)}
                      className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs h-10 rounded-xl border border-purple-200/80"
                    >
                      🖨️ অর্ডার ক্যাশ মেমো প্রিন্ট করুন
                    </Button>
                    <Button 
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setSelectedOrder(null);
                        handleEditOrder(orderToEdit);
                      }}
                      className="w-full justify-start bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs h-10 rounded-xl border border-cyan-200/80"
                    >
                      ✏️ অর্ডার এডিট করুন
                    </Button>
                    <Button 
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="w-full justify-start bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs h-10 rounded-xl border border-rose-200/80"
                    >
                      ✕ অর্ডার বাতিল করুন
                    </Button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    📊 অর্ডার সংক্ষিপ্ত বিবরণ
                  </h2>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট আইটেম</span>
                      <span className="font-bold text-slate-900">{selectedOrder.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট পরিমাণ (আইটেমস)</span>
                      <span className="font-bold text-slate-900">{selectedOrder.items?.reduce((a, b) => a + b.quantity, 0) || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট সিমেন্ট (ব্যাগ)</span>
                      <span className="font-bold text-slate-900">
                        {selectedOrder.items?.filter(i => i.unit?.includes('বস্তা') || i.name?.includes('সিমেন্ট')).reduce((a, b) => a + b.quantity, 0)} Bag
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">মোট রড (কেজি)</span>
                      <span className="font-bold text-slate-900">
                        {selectedOrder.items?.filter(i => i.unit?.includes('কেজি') || i.name?.includes('রড')).reduce((a, b) => a + b.quantity, 0)} Kg
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">চালান স্ট্যাটাস</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", selectedOrder.invoiced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                        {selectedOrder.invoiced ? 'চালান সম্পন্ন' : 'অপেক্ষমাণ'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">সর্বমোট বিল</span>
                      <span className="font-black text-emerald-600">৳ {selectedOrder.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 font-bengali">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    🕒 অর্ডার কার্যক্রম (Timeline)
                  </h2>

                  <div className="space-y-4 text-xs pl-2 relative border-l-2 border-slate-100 ml-2">
                    <div className="relative pl-4">
                      <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      <p className="font-bold text-slate-900">অর্ডার তৈরি হয়েছে</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                    </div>

                    <div className="relative pl-4">
                      <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
                      <p className="font-bold text-slate-900">পণ্য যোগ করা হয়েছে ({selectedOrder.items?.length || 0} টি আইটেম)</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                    </div>

                    <div className="relative pl-4">
                      <div className={cn("absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white", selectedOrder.invoiced ? "bg-emerald-500" : "bg-amber-500")} />
                      <p className="font-bold text-slate-900">{selectedOrder.invoiced ? 'চালান সম্পন্ন হয়েছে' : 'অনুমোদনের জন্য পেন্ডিং'}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{selectedOrder.invoiced ? 'সম্পন্ন ✓' : 'অপেক্ষমাণ'}</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* PRINT MEMO MODAL */}
      <Dialog open={isPrintMemoOpen} onOpenChange={setIsPrintMemoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl custom-scrollbar font-bengali">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white flex justify-between items-center print:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" /> অর্ডার ক্যাশ মেমোর খসড়া ও পিন্ট
              </DialogTitle>
              <p className="text-slate-400 font-mono text-xs mt-0.5">অর্ডার #{selectedOrder?.id?.toUpperCase()}</p>
            </DialogHeader>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.print()}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl px-4 h-10 shadow-md"
              >
                <Printer className="w-4 h-4 mr-2" /> প্রিন্ট মেমো
              </Button>
            </div>
          </div>

          {selectedOrder && (
            <div className="p-6 bg-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div id="printable-memo-wrapper" className="bg-white p-2 rounded-xl shadow-sm">
                <InvoiceMemo invoice={selectedOrder as any} />
              </div>
            </div>
          )}
          <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center print:hidden">
            <div className="text-xs text-slate-500 font-bold">
              * এটি বিক্রয় অর্ডারের ক্যাশ মেমো কপি।
            </div>
            <Button variant="outline" onClick={() => setIsPrintMemoOpen(false)} className="rounded-xl font-bold text-slate-600 border-slate-200">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 3-DOT FLOATING PORTAL MENU */}
      {openMenuId && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setOpenMenuId(null); setMenuPos(null); }} />
          <div
            style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
            className="fixed z-[9999] w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 font-bengali animate-in fade-in-0 zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const targetOrder = orders.find(o => o.id === openMenuId);
              if (!targetOrder) return null;
              return (
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      setMenuPos(null);
                      handleEditOrder(targetOrder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> এডিট করুন
                  </button>

                  {!targetOrder.invoiced && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        router.push(`/invoices?fromOrder=${targetOrder.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> চালান তৈরি করুন
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      setMenuPos(null);
                      handleDeleteOrder(targetOrder.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ডিলেট করুন
                  </button>
                </div>
              );
            })()}
          </div>
        </>,
        document.body
      )}
    </Shell>
  );
}

