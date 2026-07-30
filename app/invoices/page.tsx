'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Search, Eye, Printer, X, FileText, Receipt, Banknote, AlertCircle, Plus, 
  ShoppingCart, User, Phone, Tag, CheckCircle2, DollarSign, Trash2, ArrowRight,
  Lightbulb, Calendar, Building, UserCheck, Percent, HelpCircle, Edit2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Product { 
  id: string; 
  name: string; 
  sellPrice: number; 
  stock: number; 
  unit: string; 
  category: string; 
}

interface Customer { 
  id: string; 
  name: string; 
  phone: string; 
  address: string; 
  businessName?: string;
  totalDue?: number;
}

interface OrderItem {
  id?: string;
  name: string;
  code?: string;
  price: number;
  quantity: number;
  unit: string;
  total: number;
  discount?: number;
  bundle?: number | string;
  weightKg?: number;
}

interface Invoice {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  businessName?: string;
  customerId?: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  vatTax?: number;
  shippingCost?: number;
  laborCost?: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  stage?: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: any;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress?: string;
  note?: string;
  paymentMethod?: string;
}

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convertOrderId = searchParams ? searchParams.get('convert') : null;
  const fromOrderId = convertOrderId;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allOrders, setAllOrders] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('সব');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [addPayment, setAddPayment] = useState(0);

  // Direct / Converted Invoice Creation Form States
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [convertedOrderId, setConvertedOrderId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '' });
  
  // Cart & Item Selector States
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Billing & Payment States
  const [invoicePaidAmount, setInvoicePaidAmount] = useState<number>(0);
  const [cashPaidAmount, setCashPaidAmount] = useState<number>(0);
  const [chequePaidAmount, setChequePaidAmount] = useState<number>(0);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>('Cash');
  const [invoiceNote, setInvoiceNote] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [savedBanks, setSavedBanks] = useState<{ id: string; name: string; accNo: string }[]>([]);
  const [selectedShopBank, setSelectedShopBank] = useState<string>('ডাচ-বাংলা ব্যাংক - 123.456.7890');
  const [senderBankName, setSenderBankName] = useState<string>('');
  const [senderAccountNo, setSenderAccountNo] = useState<string>('');
  const [senderTxnRef, setSenderTxnRef] = useState<string>('');

  // 1:1 Screenshot Extension States
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFlat, setDiscountFlat] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [paymentOption, setPaymentOption] = useState<'now' | 'later'>('now');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [authorizedBy, setAuthorizedBy] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('Main');

  // Rod & Cement Transport, Labor & Gate Pass States
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [laborCost, setLaborCost] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_default_labor_charge');
      return saved ? parseFloat(saved) || 0 : 0;
    }
    return 0;
  });
  const [isGatePassOpen, setIsGatePassOpen] = useState<boolean>(false);

  const handleSaveDefaultLabor = (amount: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dokan_default_labor_charge', amount.toString());
      toast.success(`ডিফল্ট লেবার খরচ ৳${amount.toLocaleString()} হিসেবে সেভ করা হয়েছে!`);
    }
  };

  const loadInvoicesData = async () => {
    try {
      setLoading(true);
      const sales = await api.transactions.list({ transaction_type: 'sale' });
      const mappedInvoices: Invoice[] = sales.map(s => ({
        id: String(s.id),
        orderId: s.invoice_no,
        customerName: s.party_name || 'গ্রাহক',
        customerPhone: s.party_phone || '',
        customerId: String(s.party || ''),
        items: (s.items || []).map(i => ({
          name: i.product_name,
          price: i.price,
          quantity: i.quantity,
          unit: i.unit || 'পিস',
          total: i.total
        })),
        subtotal: s.subtotal,
        discount: s.discount,
        vatTax: s.tax,
        totalAmount: s.total_amount,
        paidAmount: s.paid_amount,
        dueAmount: s.due_amount,
        paymentStatus: s.due_amount <= 0 ? 'paid' : s.paid_amount > 0 ? 'partial' : 'unpaid',
        stage: 'approved',
        createdAt: s.created_at
      }));
      setInvoices(mappedInvoices);
      setAllOrders(mappedInvoices);

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
        businessName: p.business_name || '',
        totalDue: Number(p.total_due || 0)
      })));
    } catch (err) {
      console.error('Error loading invoices page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoicesData();
  }, []);

  // Handle pre-filling form if arriving from /orders?fromOrder={id}
  useEffect(() => {
    if (fromOrderId && allOrders.length > 0 && customers.length >= 0 && convertedOrderId !== fromOrderId) {
      const targetOrder = allOrders.find(o => o.id === fromOrderId);
      if (targetOrder) {
        queueMicrotask(() => {
          setConvertedOrderId(targetOrder.id);
          
          // Find matching customer
          const cust = customers.find(c => c.id === targetOrder.customerId || c.name === targetOrder.customerName);
          if (cust) {
            setSelectedCustomer(cust);
            setIsNewCustomer(false);
          } else {
            setSelectedCustomer(null);
            setIsNewCustomer(true);
            setNewCustomerData({
              name: targetOrder.customerName || '',
              phone: targetOrder.customerPhone || '',
              address: ''
            });
          }

          // Set cart items
          setCart(targetOrder.items ? targetOrder.items.map(i => ({ ...i })) : []);
          setInvoicePaidAmount(targetOrder.totalAmount || 0);
          setInvoiceNote(targetOrder.note || '');
          setIsCreateInvoiceOpen(true);
          toast.info('বিক্রয় অর্ডারের তথ্য নিয়ে চালানের ফর্ম লোড হয়েছে।');
        });
      }
    }
  }, [fromOrderId, allOrders, customers, convertedOrderId]);

  const formatDate = (at: any) => {
    if (!at) return '';
    const date = new Date(at);
    return format(date, 'dd MMM yyyy, hh:mm a', { locale: bn });
  };

  // Cart Add Item
  const handleAddCartItem = () => {
    if (!selectedProductId) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    if (prod.stock < itemQty) {
      toast.error(`পর্যাপ্ত স্টক নেই (বর্তমান স্টক: ${prod.stock} ${prod.unit})`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === prod.id);
      if (existing) {
        const updatedQty = existing.quantity + itemQty;
        const updatedPrice = itemPrice || prod.sellPrice;
        return prev.map(i => i.id === prod.id ? { 
          ...i, 
          quantity: updatedQty, 
          price: updatedPrice, 
          discount: itemDiscount,
          total: updatedPrice * updatedQty
        } : i);
      }
      const initialPrice = itemPrice || prod.sellPrice;
      return [...prev, {
        id: prod.id,
        name: prod.name,
        unit: prod.unit || 'পিস',
        price: initialPrice,
        quantity: itemQty,
        discount: itemDiscount || 0,
        total: initialPrice * itemQty
      }];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    toast.success(`${prod.name} কার্টে যোগ করা হয়েছে`);
  };

  const handleRemoveCartItem = (id?: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateCartQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
  };

  // Cart Calculations matching 1:1 Screenshot
  const cartSubtotal = cart.reduce((a, i) => a + (i.price * i.quantity), 0);
  const computedDiscount = discountType === 'percentage' 
    ? (cartSubtotal * (discountPercent || 0)) / 100 
    : (discountFlat || 0);
  const cartTotalDiscount = computedDiscount + cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0);
  const cartTotalAmount = Math.max(0, cartSubtotal - cartTotalDiscount + (shippingCost || 0) + (laborCost || 0));

  // Total Paid considering Split payment or single payment
  const totalReceivedPayment = (cashPaidAmount > 0 || chequePaidAmount > 0)
    ? ((cashPaidAmount || 0) + (chequePaidAmount || 0))
    : (invoicePaidAmount || 0);

  const cartDueAmount = paymentOption === 'now' ? Math.max(0, cartTotalAmount - totalReceivedPayment) : cartTotalAmount;

  // Selected Customer Existing Due Calculation
  const selectedCustomerDue = selectedCustomer 
    ? allOrders
        .filter(o => o.customerId === selectedCustomer.id || o.customerName === selectedCustomer.name)
        .reduce((acc, o) => acc + (o.dueAmount || 0), 0)
    : 0;

  const resetCreateForm = () => {
    setEditingInvoiceId(null);
    setConvertedOrderId(null);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', address: '' });
    setCart([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
    setInvoicePaidAmount(0);
    setCashPaidAmount(0);
    setChequePaidAmount(0);
    setBankName('');
    setChequeNo('');
    setChequeDate('');
    setInvoicePaymentMethod('Cash');
    setInvoiceNote('');
    setDiscountType('percentage');
    setDiscountPercent(0);
    setDiscountFlat(0);
    setShippingCost(0);
    setPaymentOption('now');
    setPreparedBy('');
    setAuthorizedBy('');
    setReceivedBy('');
    setWarehouse('Main');
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryAddress('');
    const defLabor = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_default_labor_charge') || '0') || 0) : 0;
    setLaborCost(defLabor);
    if (fromOrderId) {
      router.replace('/invoices');
    }
  };

  // Open Edit Invoice Overlay
  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    const cust = customers.find(c => c.id === inv.customerId || c.name === inv.customerName);
    if (cust) {
      setSelectedCustomer(cust);
      setIsNewCustomer(false);
    } else {
      setSelectedCustomer(null);
      setIsNewCustomer(true);
      setNewCustomerData({
        name: inv.customerName || '',
        phone: inv.customerPhone || '',
        address: inv.customerAddress || ''
      });
    }

    setCart(inv.items ? inv.items.map(i => ({ ...i })) : []);
    setInvoicePaidAmount(inv.paidAmount || 0);
    setCashPaidAmount((inv as any).cashAmount || 0);
    setChequePaidAmount((inv as any).chequeAmount || 0);
    setBankName((inv as any).bankName || '');
    setChequeNo((inv as any).chequeNo || '');
    setChequeDate((inv as any).chequeDate || '');
    setInvoicePaymentMethod(inv.paymentMethod || 'Cash');
    setInvoiceNote(inv.note || '');
    setShippingCost(inv.shippingCost || 0);
    setLaborCost(inv.laborCost || 0);
    setVehicleNo(inv.vehicleNo || '');
    setDriverName(inv.driverName || '');
    setDriverPhone(inv.driverPhone || '');
    setDeliveryAddress(inv.deliveryAddress || inv.customerAddress || '');

    setSelectedInvoice(null);
    setIsCreateInvoiceOpen(true);
  };

  // Delete Invoice Handler with Firestore Transaction (Restores stock & adjusts customer balance)
  const handleDeleteInvoiceConfirm = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);
    try {
      await api.transactions.delete(deletingInvoice.id);
      toast.success('চালানটি সফলভাবে মুছে ফেলা হয়েছে এবং স্টক ফেরত দেয়া হয়েছে!');
      setIsDeleteDialogOpen(false);
      setDeletingInvoice(null);
      if (selectedInvoice?.id === deletingInvoice.id) {
        setSelectedInvoice(null);
      }
      loadInvoicesData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান মুছতে সমস্যা হয়েছে');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create, Convert, or Edit Invoice Handler
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
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
          address: newCustomerData.address.trim()
        });
        finalCustId = String(createdParty.id);
      }

      const finalPaidAmount = paymentOption === 'now' 
        ? ((cashPaidAmount || 0) + (chequePaidAmount || 0) > 0 ? ((cashPaidAmount || 0) + (chequePaidAmount || 0)) : (invoicePaidAmount || 0))
        : 0;

      const effectivePaymentMethod = (cashPaidAmount > 0 && chequePaidAmount > 0) ? 'split' : invoicePaymentMethod.toLowerCase();
      const hasCheque = effectivePaymentMethod === 'cheque' || effectivePaymentMethod === 'check' || effectivePaymentMethod === 'split' || chequePaidAmount > 0 || !!chequeNo;

      const chequePayload = hasCheque ? {
        cheque_number: chequeNo || `CHQ-${Math.floor(100000 + Math.random() * 900000)}`,
        cheque_bank: bankName || senderBankName || 'ব্যাংক',
        cheque_due_date: chequeDate || undefined,
        cheque_status: 'pending' as const
      } : {};

      if (editingInvoiceId) {
        await api.transactions.update(editingInvoiceId, {
          party: finalCustId ? Number(finalCustId) : null,
          total_amount: cartTotalAmount,
          paid_amount: finalPaidAmount,
          due_amount: cartDueAmount,
          payment_method: effectivePaymentMethod,
          ...chequePayload,
          items: cart.map(i => ({
            product_name: i.name,
            quantity: i.quantity,
            price: i.price,
            unit: i.unit,
            total: i.price * i.quantity
          })),
          notes: invoiceNote
        });
        toast.success('চালান সফলভাবে এডিট ও আপডেট করা হয়েছে!');
      } else {
        await api.transactions.create({
          party: finalCustId ? Number(finalCustId) : null,
          transaction_type: 'sale',
          total_amount: cartTotalAmount,
          paid_amount: finalPaidAmount,
          due_amount: cartDueAmount,
          payment_method: effectivePaymentMethod,
          ...chequePayload,
          items: cart.map(i => ({
            product_name: i.name,
            quantity: i.quantity,
            price: i.price,
            unit: i.unit,
            total: i.price * i.quantity
          })),
          notes: invoiceNote
        });
        toast.success(convertedOrderId ? 'বিক্রয় অর্ডার চালানে রূপান্তর করা হয়েছে!' : 'বিক্রয় চালান সফলভাবে সম্পন্ন হয়েছে!');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orderUpdated'));
      }

      resetCreateForm();
      setIsCreateInvoiceOpen(false);
      loadInvoicesData();
      router.replace('/invoices');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'চালান তৈরি/এডিট করতে সমস্যা হয়েছে');
    }
  };

  // Add Due Payment
  const handleAddPayment = async () => {
    if (!selectedInvoice || addPayment <= 0) return;
    const newPaid = (selectedInvoice.paidAmount || 0) + addPayment;
    const newDue = Math.max(0, selectedInvoice.totalAmount - newPaid);
    try {
      await api.transactions.update(selectedInvoice.id, {
        paid_amount: newPaid,
        due_amount: newDue
      });

      toast.success('বকেয়া পেমেন্ট আপডেট হয়েছে');
      setAddPayment(0);
      loadInvoicesData();
    } catch {
      toast.error('বকেয়া পেমেন্ট যোগ করতে সমস্যা হয়েছে');
    }
  };

  const filtered = invoices.filter(i =>
    (filterStatus === 'সব' || i.paymentStatus === filterStatus) &&
    (i.customerName.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSales = invoices.reduce((a, o) => a + o.totalAmount, 0);
  const totalPaid = invoices.reduce((a, o) => a + (o.paidAmount || 0), 0);
  const totalDue = invoices.reduce((a, o) => a + (o.dueAmount || 0), 0);

  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Title & Header Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-bengali flex items-center gap-2">
              <Receipt className="w-8 h-8 text-emerald-600" /> বিক্রয় চালান ও নগদ ক্যাশ ড্যাশবোর্ড
            </h2>
            <p className="text-slate-500 font-bengali mt-1">চুড়ান্ত চালানের তালিকা, নগদ প্রাপ্তি ও বকেয়া চালানের হিসাব</p>
          </div>
          
          <Button 
            onClick={() => { resetCreateForm(); setIsCreateInvoiceOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali h-12 px-6 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />সরাসরি চালান তৈরি করুন
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'মোট ইনভয়েস বিক্রয়', value: `৳ ${totalSales.toLocaleString()}`, icon: Receipt, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'মোট ক্যাশ প্রাপ্তি', value: `৳ ${totalPaid.toLocaleString()}`, icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'মোট বকেয়া চালান', value: `৳ ${totalDue.toLocaleString()}`, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((s, i) => (
            <Card key={i} className={cn("border-2 shadow-sm rounded-2xl transition-all hover:shadow-md", s.border, s.bg)}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm", s.color)}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500 font-bengali opacity-80">{s.label}</p>
                  <p className={cn("text-2xl font-black font-bengali mt-0.5", s.color)}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit border border-slate-100">
            {['সব', 'পরিশোধিত', 'আংশিক', 'বাকি'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn("px-5 py-2 rounded-xl text-[13px] font-black font-bengali transition-all",
                  filterStatus === s
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ক্রেতা বা ইনভয়েস আইডি..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 font-bengali rounded-xl h-11 shadow-sm"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <Card className="border-slate-100 shadow-xl shadow-slate-200/40 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black py-4 px-6 uppercase">ইনভয়েস #</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">তারিখ</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black uppercase">ক্রেতার নাম</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">মোট বিল</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">নগদ প্রাপ্তি</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right uppercase">বকেয়া</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-center uppercase">পেমেন্ট স্ট্যাটাস</TableHead>
                  <TableHead className="font-bengali text-slate-500 text-[11px] tracking-widest font-black text-right py-4 px-6 uppercase">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-400 font-bengali font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Receipt className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bengali font-bold text-lg">কোনো অনুমোদনকৃত চালান পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(inv => (
                  <TableRow 
                    key={inv.id} 
                    onClick={() => setSelectedInvoice(inv)}
                    className="border-b border-slate-50 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="py-4 px-6">
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-xs">#{inv.id.slice(0, 8).toUpperCase()}</span>
                    </TableCell>
                    <TableCell className="font-bengali text-xs font-semibold text-slate-500">{formatDate(inv.createdAt)}</TableCell>
                    <TableCell className="font-bengali font-black text-slate-800 text-sm">{inv.customerName}</TableCell>
                    <TableCell className="text-right font-bengali font-black text-slate-900 text-base">৳{inv.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bengali text-emerald-600 font-bold">৳{(inv.paidAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bengali text-rose-600 font-bold">৳{(inv.dueAmount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black font-bengali uppercase tracking-wider inline-block",
                        inv.paymentStatus === 'পরিশোধিত' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          inv.paymentStatus === 'আংশিক' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-rose-50 text-rose-700 border border-rose-100'
                      )}>{inv.paymentStatus}</span>
                    </TableCell>
                    <TableCell className="text-right py-4 px-6">
                      <div className="flex justify-end gap-1.5">
                        <Button size="icon" variant="outline" title="ইনভয়েস বিস্তারিত দেখুন" onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }} className="h-9 w-9 text-slate-500 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl transition-all">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" title="ইনভয়েস এডিট করুন" onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv); }} className="h-9 w-9 text-slate-500 border-slate-200 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-xl transition-all">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" title="ইনভয়েস মুছে ফেলুন" onClick={(e) => { e.stopPropagation(); setDeletingInvoice(inv); setIsDeleteDialogOpen(true); }} className="h-9 w-9 text-slate-500 border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" title="প্রিন্ট করুন" onClick={(e) => { e.stopPropagation(); window.print(); }} className="h-9 w-9 text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all">
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* CREATE / CONVERT INVOICE OVERLAY (1:1 Screenshot Exact Replica in Dokan Light Theme) */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 sm:left-[72px] z-[60] bg-slate-100 overflow-y-auto font-bengali flex flex-col justify-between">
          
          {/* TOP HEADER BAR */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">
                  INVOICE MANAGEMENT (ইনভয়েস ব্যবস্থাপনা)
                </span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingInvoiceId ? 'চালান সম্পাদনা করুন (Edit Sales Invoice)' : convertedOrderId ? 'বিক্রয় অর্ডার থেকে চালান তৈরি' : 'নতুন বিক্রয় ইনভয়েস তৈরি (Create Sales Invoice)'}
                </h1>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
              className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* MAIN FORM GRID */}
          <form onSubmit={handleCreateInvoiceSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT 9 COLUMNS: 7 STEPS */}
              <div className="lg:col-span-9 space-y-5">
                
                {/* STEP 1: Shop & Basics */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">1</span>
                        Shop & Basics (দোকান ও প্রাথমিক তথ্য)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomer(!isNewCustomer);
                          setSelectedCustomer(null);
                        }}
                        className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                      >
                        {isNewCustomer ? '← তালিকা থেকে বাছুন' : '+ নতুন কাস্টমার এন্ট্রি করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Select Shop / Customer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Select Shop / Customer <span className="text-rose-500">*</span></Label>
                        {!isNewCustomer ? (
                          <Select 
                            value={selectedCustomer?.id || ''} 
                            onValueChange={(val: string | null) => {
                              if (!val) return;
                              const cust = customers.find(c => c.id === val);
                              if (cust) setSelectedCustomer(cust);
                            }}
                          >
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200 font-bold text-xs">
                              <SelectValue placeholder="কাস্টমার / দোকান খুঁজুন..." />
                            </SelectTrigger>
                            <SelectContent className="font-bengali max-h-60 text-xs font-bold">
                              {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} {c.phone ? `(${c.phone})` : ''} {c.businessName ? `— ${c.businessName}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            required
                            placeholder="কাস্টমারের নাম"
                            value={newCustomerData.name}
                            onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                            className="rounded-xl h-11 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        )}
                      </div>

                      {/* Invoice Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Invoice Number</Label>
                        <Input
                          disabled
                          value="Auto (Will generate)"
                          className="rounded-xl h-11 bg-slate-100 border-slate-200 text-xs font-bold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Invoice Date <span className="text-rose-500">*</span></Label>
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

                    {/* Customer Existing Due Alert Box */}
                    {selectedCustomer && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-bengali mt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900">{selectedCustomer.name}</span>
                            {selectedCustomer.phone && <span className="ml-2 text-slate-600 font-semibold">({selectedCustomer.phone})</span>}
                            {selectedCustomer.address && <p className="text-slate-500 text-[11px] font-semibold">{selectedCustomer.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-rose-600 font-bold block">পূর্বের মোট বকেয়া (Previous Due)</span>
                          <span className="font-black text-rose-700 text-base">৳ {selectedCustomerDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
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
                        Item Lines (পণ্যসমূহ)
                      </Label>
                      <Button 
                        type="button"
                        onClick={handleAddCartItem}
                        size="sm" 
                        className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                      </Button>
                    </div>

                    {/* Add Product Line Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl items-end">
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-500">পণ্য নির্বাচন করুন</Label>
                        <Select 
                          value={selectedProductId} 
                          onValueChange={(val: string | null) => {
                            const v = val || '';
                            setSelectedProductId(v);
                            const p = products.find(prod => prod.id === v);
                            if (p) setItemPrice(p.sellPrice || 0);
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                            <SelectValue placeholder="পণ্য বাছুন..." />
                          </SelectTrigger>
                          <SelectContent className="font-bengali max-h-60 text-xs font-bold">
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                                {p.name} — ৳{p.sellPrice.toLocaleString()} (স্টক: {p.stock} {p.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-500">পরিমাণ</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={isNaN(itemQty) ? '' : itemQty} 
                          onChange={e => setItemQty(parseFloat(e.target.value) || 0)} 
                          className="rounded-xl h-10 bg-white text-center font-bold text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-500">একক মূল্য (৳)</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={isNaN(itemPrice) ? '' : itemPrice} 
                          onChange={e => setItemPrice(parseFloat(e.target.value) || 0)} 
                          className="rounded-xl h-10 bg-white text-center font-bold text-xs text-orange-600"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <Button 
                          type="button" 
                          onClick={handleAddCartItem} 
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white h-10 rounded-xl font-bold text-xs shadow-xs"
                        >
                          + যোগ করুন
                        </Button>
                      </div>
                    </div>

                    {/* Table matching screenshot columns */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-10 text-center font-black">#</TableHead>
                            <TableHead className="font-black">Product</TableHead>
                            <TableHead className="text-center font-black">Series</TableHead>
                            <TableHead className="text-center font-black">Variant</TableHead>
                            <TableHead className="text-center font-black">Quantity</TableHead>
                            <TableHead className="text-right font-black">Unit Price</TableHead>
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
                              <TableCell className="text-right font-medium text-slate-600">৳{item.price.toLocaleString()}</TableCell>
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

                {/* STEP 3: Transport & Delivery Details */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">3</span>
                      Transport & Delivery Site (পরিবহন ও সাইটের তথ্য)
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
                        <Label className="text-[11px] font-bold text-slate-600">Delivery Site (সাইট ঠিকানা)</Label>
                        <Input
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          placeholder="সাইট-২, উত্তরা, ঢাকা"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 4 & STEP 5 ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* STEP 4: Totals, Discount & Tax */}
                  <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-black flex items-center justify-center">4</span>
                        Totals, Discount & Tax (মোট, ছাড় ও খরচ)
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
                            <Label className="text-[11px] font-bold text-slate-600">Labor Charge (লেবার খরচ ৳)</Label>
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
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1 sm:col-span-1">
                                <Label className="text-[11px] font-bold text-slate-600">Payment Method (পেমেন্ট মাধ্যম)</Label>
                                <Select value={invoicePaymentMethod} onValueChange={(val: string | null) => setInvoicePaymentMethod(val || 'Cash')}>
                                  <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold">
                                    <SelectItem value="Cash">💵 Cash (একক নগদ)</SelectItem>
                                    <SelectItem value="Split">💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)</SelectItem>
                                    <SelectItem value="Cheque">📄 Cheque (একক চেক)</SelectItem>
                                    <SelectItem value="Bank">🏦 Bank Transfer (ব্যাংক)</SelectItem>
                                    <SelectItem value="BankToBank">🔄 Bank to Bank (ব্যাংক-টু-ব্যাংক)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {invoicePaymentMethod === 'Split' ? (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-700">নগদ জমার পরিমাণ (Cash ৳)</Label>
                                    <Input 
                                      type="number"
                                      value={cashPaidAmount || ''}
                                      onChange={e => setCashPaidAmount(parseFloat(e.target.value) || 0)}
                                      placeholder="যেমন: ১০,০০০"
                                      className="rounded-xl h-10 bg-emerald-50/70 border-emerald-300 text-xs font-black text-emerald-700"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-700">চেক জমার পরিমাণ (Cheque ৳)</Label>
                                    <Input 
                                      type="number"
                                      value={chequePaidAmount || ''}
                                      onChange={e => setChequePaidAmount(parseFloat(e.target.value) || 0)}
                                      placeholder="যেমন: ৭০,০০০"
                                      className="rounded-xl h-10 bg-purple-50/70 border-purple-300 text-xs font-black text-purple-700"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-[11px] font-bold text-slate-600">Paid Amount (পরিশোধিত ৳)</Label>
                                  <Input 
                                    type="number"
                                    value={invoicePaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setInvoicePaidAmount(val);
                                      if (invoicePaymentMethod === 'Cash') setCashPaidAmount(val);
                                      if (invoicePaymentMethod === 'Cheque') setChequePaidAmount(val);
                                    }}
                                    placeholder="0.00"
                                    className="rounded-xl h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Total Paid Display Banner for Split */}
                            {invoicePaymentMethod === 'Split' && (
                              <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold font-bengali">
                                <span className="text-slate-600">মোট প্রাপ্তি (নগদ ৳{cashPaidAmount.toLocaleString()} + চেক ৳{chequePaidAmount.toLocaleString()}):</span>
                                <span className="text-sm font-black text-emerald-700">৳{(cashPaidAmount + chequePaidAmount).toLocaleString()}</span>
                              </div>
                            )}

                            {/* BANK TRANSFER (SAVED BANK ACCOUNTS SELECTOR) */}
                            {invoicePaymentMethod === 'Bank' && (
                              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-blue-900 flex items-center gap-1">
                                  🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                                </p>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-600">গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
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

                            {/* BANK TO BANK TRANSFER (RECEIVER SAVED SELECTOR + SENDER CUSTOMER INPUTS) */}
                            {invoicePaymentMethod === 'BankToBank' && (
                              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                  🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                                </p>
                                
                                {/* RECEIVER SHOP BANK */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-indigo-950 block">
                                    ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
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

                                {/* SENDER CUSTOMER BANK INPUTS */}
                                <div className="space-y-2 pt-2 border-t border-indigo-100">
                                  <Label className="text-[10px] font-bold text-slate-700 block">
                                    ২. প্রেরকের ব্যাংক তথ্য (কাস্টমারের ব্যাংক অ্যাকাউন্ট)
                                  </Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                                      <Input 
                                        placeholder="যেমন: ইবিএল / প্রাইম ব্যাংক" 
                                        value={senderBankName} 
                                        onChange={e => setSenderBankName(e.target.value)}
                                        className="h-8 rounded-lg bg-white text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                                      <Input 
                                        placeholder="A/C No or Name" 
                                        value={senderAccountNo} 
                                        onChange={e => setSenderAccountNo(e.target.value)}
                                        className="h-8 rounded-lg bg-white text-xs font-mono"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                      <Input 
                                        placeholder="Txn ID / Ref No" 
                                        value={senderTxnRef} 
                                        onChange={e => setSenderTxnRef(e.target.value)}
                                        className="h-8 rounded-lg bg-white text-xs font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CHEQUE DETAILS (Show when method is Cheque or Split or chequePaidAmount > 0) */}
                            {(invoicePaymentMethod === 'Cheque' || invoicePaymentMethod === 'Split' || chequePaidAmount > 0) && (
                              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2 font-bengali text-xs animate-in fade-in-0 shadow-2xs">
                                <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                  📄 অভাঙানো চেকের বিস্তারিত (পেন্ডিং চেকের তালিকায় যুক্ত হবে)
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">ব্যাংকের নাম</Label>
                                    <Input 
                                      placeholder="যেমন: ডাচ বাংলা ব্যাংক" 
                                      value={bankName} 
                                      onChange={e => setBankName(e.target.value)}
                                      className="h-8 rounded-lg bg-white text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেক নম্বর</Label>
                                    <Input 
                                      placeholder="CQ-10023" 
                                      value={chequeNo} 
                                      onChange={e => setChequeNo(e.target.value)}
                                      className="h-8 rounded-lg bg-white text-xs font-mono"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেকের তারিখ</Label>
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
                        Signatures & Handled By (কর্মকর্তা ও গন্তব্য)
                      </Label>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Prepared By</Label>
                          <Input 
                            value={preparedBy}
                            onChange={e => setPreparedBy(e.target.value)}
                            placeholder="Invoicer Name"
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
                            placeholder="Customer Name"
                            className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">Warehouse</Label>
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
                        value={invoiceNote}
                        onChange={e => setInvoiceNote(e.target.value)}
                        placeholder="Add any note or special instructions..."
                        className="w-full rounded-xl p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                      />
                    </CardContent>
                  </Card>

                </div>

              </div>

              {/* RIGHT 3 COLUMNS: SUMMARY SIDEBAR CARDS (Light Theme) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* CARD 1: INVOICE SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Invoice Summary</h3>
                      </div>
                      <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded border border-orange-200 uppercase tracking-widest">
                        DRAFT
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between text-slate-500">
                        <span>Shop / Customer</span>
                        <span className="font-bold text-slate-900">{selectedCustomer?.name || 'UNSELECTED / WALK-IN'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Contact Number</span>
                        <span className="font-bold text-slate-800">{selectedCustomer?.phone || '+880 1XXX XXXXXX'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Address</span>
                        <span className="font-bold text-slate-800 text-right max-w-[120px] truncate">{selectedCustomer?.address || 'No address provided'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                        <span>Invoice Number</span>
                        <span className="font-bold text-slate-800">Auto (Will generate)</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Invoice Date</span>
                        <span className="font-bold text-slate-800">{format(new Date(), 'dd MMM yyyy')}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Invoice Type</span>
                        <span className="font-bold text-slate-800">SALE</span>
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
                            <span>Labor / Loading Charge</span>
                            <span className="font-bold">+ ৳ {laborCost.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-700 font-bold pt-1">
                          <span>Invoice Total</span>
                          <span className="font-black text-slate-900">৳ {cartTotalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Previous Shop Due</span>
                          <span className="font-black">৳ {selectedCustomerDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Grand Total (with Due)</span>
                          <span className="text-[10px] text-slate-400 font-bold">চালান + পূর্বের বকেয়া</span>
                        </div>
                        <span className="text-2xl font-black text-orange-600">৳ {(cartTotalAmount + selectedCustomerDue).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
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
                        {invoicePaidAmount > 0 ? `PAID: ৳ ${invoicePaidAmount.toLocaleString()}` : 'NO PAYMENT RECORDED'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-600">Remaining Total Due</span>
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
              <span>Review your details before saving. You can save as draft anytime.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                className="rounded-xl h-11 px-5 font-bold text-slate-600 border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                variant="secondary"
                onClick={handleCreateInvoiceSubmit}
                className="rounded-xl h-11 px-5 font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                Save Draft
              </Button>
              <Button 
                type="submit" 
                onClick={handleCreateInvoiceSubmit}
                className="rounded-xl h-11 px-6 font-black text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 active:scale-95 transition-all"
              >
                Complete Invoice ✓
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* VIEW INVOICE DETAIL MODAL */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-bengali text-2xl font-black">চালান (ইনভয়েস) বিস্তারিত</DialogTitle>
                  <p className="text-slate-400 font-mono text-sm mt-1">#{selectedInvoice?.id.toUpperCase()}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                  <Receipt className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </DialogHeader>
          </div>

          {selectedInvoice && (
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white font-bengali">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">ক্রেতা</p><p className="font-black text-slate-800">{selectedInvoice.customerName}</p></div>
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">তারিখ</p><p className="font-bold text-slate-700 text-sm">{formatDate(selectedInvoice.createdAt)}</p></div>
                <div><p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">ফোন</p><p className="font-bold text-slate-700 text-sm">{selectedInvoice.customerPhone || '—'}</p></div>
                <div>
                  <p className="text-slate-400 text-[11px] uppercase tracking-widest font-black mb-1">স্ট্যাটাস</p>
                  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block",
                    selectedInvoice.paymentStatus === 'পরিশোধিত' ? 'bg-emerald-100 text-emerald-800' :
                      selectedInvoice.paymentStatus === 'আংশিক' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                  )}>{selectedInvoice.paymentStatus}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-bold text-slate-600">পণ্য</th>
                      <th className="p-3 text-center font-bold text-slate-600">পরিমাণ</th>
                      <th className="p-3 text-right font-bold text-slate-600">মূল্য</th>
                      <th className="p-3 text-right font-bold text-slate-600">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((item, i) => (
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
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">মোট বিল</td>
                      <td className="p-3 text-right font-black text-slate-900 text-lg">৳{selectedInvoice.totalAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">নগদ প্রাপ্তি</td>
                      <td className="p-3 text-right font-black text-emerald-600 text-lg">৳{selectedInvoice.paidAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold text-slate-600">বকেয়া</td>
                      <td className="p-3 text-right font-black text-rose-600 text-lg">৳{selectedInvoice.dueAmount?.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Transport & Site Details Box if available */}
              {(selectedInvoice.vehicleNo || selectedInvoice.driverName || selectedInvoice.deliveryAddress) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-orange-50/60 border border-orange-200/80 rounded-2xl text-xs font-bengali">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">গাড়ি / ট্রাক নম্বর</span>
                    <span className="font-black text-slate-900">{selectedInvoice.vehicleNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">ড্রাইভারের নাম ও ফোন</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.driverName || '—'} {selectedInvoice.driverPhone ? `(${selectedInvoice.driverPhone})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">ডেলিভারি সাইটের ঠিকানা</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.deliveryAddress || selectedInvoice.customerAddress || '—'}</span>
                  </div>
                </div>
              )}

              {/* Add Payment Form */}
              {(selectedInvoice.dueAmount || 0) > 0 && (
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <p className="font-black text-emerald-900">বকেয়া আদায় করুন</p>
                  </div>
                  <div className="flex gap-3">
                    <Input type="number" value={addPayment} onChange={e => setAddPayment(parseFloat(e.target.value) || 0)} placeholder="পরিমাণ লিখুন" className="h-12 rounded-xl text-lg font-bold border-emerald-200 focus:border-emerald-500 bg-white" />
                    <Button onClick={handleAddPayment} className="bg-emerald-600 hover:bg-emerald-700 font-bengali rounded-xl h-12 px-6 font-black text-base shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                      পেমেন্ট জমা দিন
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsGatePassOpen(true)}
                className="font-bengali rounded-xl font-bold text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
              >
                🚛 গেট পাস
              </Button>
              {selectedInvoice && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleEditInvoice(selectedInvoice)}
                    className="font-bengali rounded-xl font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" /> এডিট করুন
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setDeletingInvoice(selectedInvoice); setIsDeleteDialogOpen(true); }}
                    className="font-bengali rounded-xl font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> মুছে ফেলুন
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="font-bengali rounded-xl font-bold text-slate-500 border-slate-200">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GATE PASS / DELIVERY CHALAN MODAL */}
      <Dialog open={isGatePassOpen} onOpenChange={setIsGatePassOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 bg-white font-bengali">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>মেসার্স রড & সিমেন্ট স্টোর</span>
                </DialogTitle>
                <p className="text-xs font-bold text-orange-600 tracking-wider uppercase mt-0.5">ডেলিভারি চালান / গেট পাস (Delivery Chalan & Gate Pass)</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg">#{selectedInvoice?.id.toUpperCase()}</span>
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="font-bold text-slate-400 text-[11px] block">কাস্টমার / দোকান</span>
                  <span className="font-black text-slate-900 text-sm">{selectedInvoice.customerName}</span>
                  <span className="block text-slate-500">{selectedInvoice.customerPhone}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 text-[11px] block">ডেলিভারি সাইটের ঠিকানা</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.deliveryAddress || selectedInvoice.customerAddress || 'প্রধান ঠিকানা'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 text-[11px] block">গাড়ি / ট্রাক নম্বর</span>
                  <span className="font-black text-orange-600">{selectedInvoice.vehicleNo || 'তথ্য দেওয়া হয়নি'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 text-[11px] block">ড্রাইভারের নাম ও মোবাইল</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.driverName || '—'} {selectedInvoice.driverPhone ? `(${selectedInvoice.driverPhone})` : ''}</span>
                </div>
              </div>

              {/* Items Table for Gate Pass */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow className="text-[11px]">
                      <TableHead className="w-12 text-center font-black">#</TableHead>
                      <TableHead className="font-black">পণ্যের নাম (Product)</TableHead>
                      <TableHead className="text-center font-black">পরিমাণ (Quantity)</TableHead>
                      <TableHead className="text-center font-black">একক (Unit)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-slate-100">
                        <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-black text-slate-800 text-sm">{item.name}</TableCell>
                        <TableCell className="text-center font-black text-orange-600 text-base">{item.quantity}</TableCell>
                        <TableCell className="text-center font-bold text-slate-600">{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[11px] font-bold text-slate-500">
                <div className="border-t border-slate-300 pt-2">প্রস্তুতকারীর স্বাক্ষর</div>
                <div className="border-t border-slate-300 pt-2">ড্রাইভারের স্বাক্ষর</div>
                <div className="border-t border-slate-300 pt-2">গ্রহীতার স্বাক্ষর</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsGatePassOpen(false)} className="rounded-xl font-bold">
              বন্ধ করুন
            </Button>
            <Button onClick={() => window.print()} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
              🖨️ গেট পাস প্রিন্ট করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE INVOICE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white font-bengali">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">
              চালানটি মুছে ফেলতে চান?
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              আপনি কি নিশ্চিত যে চালান <span className="font-mono font-bold text-slate-700">#{deletingInvoice?.id.slice(0, 8).toUpperCase()}</span> মুছে ফেলতে চান? 
              <br /><br />
              <strong className="text-rose-600 block">⚠️ সতর্কতা:</strong>
              চালানটি মুছে ফেললে পণ্যের স্টক পুনরায় গুদামে যুক্ত হবে এবং কাস্টমারের বকেয়া/মোট খরচ ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।
            </p>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
            <Button 
              variant="outline" 
              onClick={() => { setIsDeleteDialogOpen(false); setDeletingInvoice(null); }} 
              className="rounded-xl font-bold flex-1"
              disabled={isDeleting}
            >
              বাতিল
            </Button>
            <Button 
              onClick={handleDeleteInvoiceConfirm} 
              disabled={isDeleting}
              className="rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-white flex-1 shadow-md shadow-rose-600/20"
            >
              {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bengali font-bold text-slate-400">লোড হচ্ছে...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
