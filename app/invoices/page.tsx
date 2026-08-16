'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Search, Eye, Printer, X, FileText, Receipt, Banknote, AlertCircle, Plus, 
  ShoppingCart, User, Phone, Tag, CheckCircle2, DollarSign, Trash2, ArrowRight, ArrowLeft,
  Lightbulb, Calendar, Building, UserCheck, Percent, HelpCircle, Edit2, Filter, ChevronUp, ChevronDown, RotateCcw, Zap, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, startOfDay, endOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { toBengaliDigits, parseProductDetails } from '@/lib/bengaliUtils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { CascadingProductSelector, SelectedProductDetails } from '@/components/CascadingProductSelector';
import { InvoiceMemo } from '@/components/InvoiceMemo';
import { SalesInvoiceDetailsView } from '@/components/SalesInvoiceDetailsView';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { printElement } from '@/lib/printUtils';

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
  phone?: string; 
  address?: string; 
  businessName?: string;
  totalDue?: number;
  due?: number;
  balance?: number;
  previousDue?: number;
  openingBalance?: number;
}

interface OrderItem {
  id?: string;
  name: string;
  code?: string;
  category?: string;
  brand?: string;
  mmSize?: string;
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
  paymentMethodName?: string;
  bankName?: string;
  accountNo?: string;
  transactionRef?: string;
  receiverShopBank?: string;
  senderBankName?: string;
  senderAccountNo?: string;
  senderTxnRef?: string;
  chequeNo?: string;
  chequeDate?: string;
  chargeCalcMode?: 'rate' | 'manual';
  rodLaborRate?: number;
  rodShippingRate?: number;
  rodLaborCost?: number;
  rodShippingCost?: number;
  rodRingTotalKg?: number;
  cementLaborRate?: number;
  cementShippingRate?: number;
  cementLaborCost?: number;
  cementShippingCost?: number;
  cementTotalBags?: number;
}

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convertOrderId = searchParams ? (searchParams.get('fromOrder') || searchParams.get('convert')) : null;
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

  // Image-Matched Filter States
  const [filterInvoiceNo, setFilterInvoiceNo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterSalesPerson, setFilterSalesPerson] = useState('all');
  const [filterInvoiceType, setFilterInvoiceType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStageStatus, setFilterStageStatus] = useState('all');
  const [minBill, setMinBill] = useState('');
  const [maxBill, setMaxBill] = useState('');
  const [minDue, setMinDue] = useState('');
  const [maxDue, setMaxDue] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isQuickFilterExpanded, setIsQuickFilterExpanded] = useState(true);

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
  const [selectedCascadingProduct, setSelectedCascadingProduct] = useState<SelectedProductDetails | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Billing & Payment States
  const [invoicePaidAmount, setInvoicePaidAmount] = useState<number>(0);
  const [cashPaidAmount, setCashPaidAmount] = useState<number>(0);
  const [chequePaidAmount, setChequePaidAmount] = useState<number>(0);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>('Cash');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
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
  const [manualShippingCost, setManualShippingCost] = useState<number>(0);
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
  
  // Rate-based vs manual extra charge states
  const [chargeCalcMode, setChargeCalcMode] = useState<'rate' | 'manual'>('rate');
  const [rodLaborRate, setRodLaborRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_labor_rate');
      return saved ? parseFloat(saved) || 0 : 0;
    }
    return 0;
  });
  const [rodShippingRate, setRodShippingRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_rod_shipping_rate');
      return saved ? parseFloat(saved) || 0 : 0;
    }
    return 0;
  });
  const [cementLaborRate, setCementLaborRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_labor_rate');
      return saved ? parseFloat(saved) || 0 : 0;
    }
    return 0;
  });
  const [cementShippingRate, setCementShippingRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dokan_sales_cement_shipping_rate');
      return saved ? parseFloat(saved) || 0 : 0;
    }
    return 0;
  });

  const [manualLaborCost, setManualLaborCost] = useState<number>(0);
  const [isGatePassOpen, setIsGatePassOpen] = useState<boolean>(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState<boolean>(false);
  const [invoiceViewMode, setInvoiceViewMode] = useState<'details' | 'memo'>('details');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleSaveDefaultCharges = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dokan_sales_rod_labor_rate', (rodLaborRate || 0).toString());
      localStorage.setItem('dokan_sales_rod_shipping_rate', (rodShippingRate || 0).toString());
      localStorage.setItem('dokan_sales_cement_labor_rate', (cementLaborRate || 0).toString());
      localStorage.setItem('dokan_sales_cement_shipping_rate', (cementShippingRate || 0).toString());
      toast.success(`ডিফল্ট রেট সেভ করা হয়েছে (রড: লেবার ৳${rodLaborRate}/কেজি, ভাড়া ৳${rodShippingRate}/কেজি | সিমেন্ট: লেবার ৳${cementLaborRate}/বস্তা, ভাড়া ৳${cementShippingRate}/বস্তা)`);
    }
  };

  const loadInvoicesData = async () => {
    try {
      setLoading(true);
      const sales = await api.transactions.list({ transaction_type: 'sale' });
      const mappedInvoices: Invoice[] = sales.map(s => {
        let meta: any = {};
        let cleanNote = s.notes || '';
        if (s.notes) {
          try {
            if (s.notes.trim().startsWith('{')) {
              const idx = s.notes.indexOf('\n');
              const jsonStr = idx !== -1 ? s.notes.substring(0, idx) : s.notes;
              meta = JSON.parse(jsonStr);
              cleanNote = meta.userNote !== undefined ? meta.userNote : (idx !== -1 ? s.notes.substring(idx + 1) : '');
            }
          } catch {
            meta = {};
          }
        }

        return {
          id: String(s.id),
          orderId: s.invoice_no,
          customerName: s.party_name || 'গ্রাহক',
          customerPhone: s.party_phone || '',
          customerId: String(s.party || ''),
          items: (s.items || []).map(i => ({
            id: String(i.product || ''),
            name: i.product_name,
            price: i.price,
            quantity: i.quantity,
            unit: i.unit || 'পিস',
            total: i.total
          })),
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || meta.discountFlat || 0),
          vatTax: Number(s.tax || 0),
          shippingCost: Number(meta.transportCost || meta.shippingCost || 0),
          laborCost: Number(meta.laborCost || 0),
          totalAmount: Number(s.total_amount || 0),
          paidAmount: Number(s.paid_amount || 0),
          dueAmount: Number(s.due_amount || 0),
          paymentStatus: s.due_amount <= 0 ? 'পরিশোধিত' : (s.paid_amount || 0) > 0 ? 'আংশিক' : 'বাকি',
          stage: 'approved',
          createdAt: s.created_at,
          vehicleNo: meta.vehicleNo || '',
          driverName: meta.driverName || '',
          driverPhone: meta.driverPhone || '',
          deliveryAddress: meta.deliveryAddress || '',
          note: cleanNote,
          paymentMethod: s.payment_method || 'cash',
          paymentMethodName: meta.paymentMethodName || s.payment_method || 'cash',
          bankName: meta.bankName || s.cheque_bank || '',
          accountNo: meta.accountNo || '',
          transactionRef: meta.transactionRef || '',
          receiverShopBank: meta.receiverShopBank || meta.selectedShopBank || '',
          senderBankName: meta.senderBankName || '',
          senderAccountNo: meta.senderAccountNo || '',
          senderTxnRef: meta.senderTxnRef || '',
          chequeNo: meta.chequeNo || s.cheque_number || '',
          chequeDate: meta.chequeDate || (s.cheque_due_date ? String(s.cheque_due_date) : ''),
          cashPaidAmount: Number(meta.cashPaidAmount || 0),
          chequePaidAmount: Number(meta.chequePaidAmount || 0),
          chargeCalcMode: meta.chargeCalcMode,
          rodLaborRate: meta.rodLaborRate !== undefined ? Number(meta.rodLaborRate) : undefined,
          rodShippingRate: meta.rodShippingRate !== undefined ? Number(meta.rodShippingRate) : undefined,
          rodLaborCost: meta.rodLaborCost !== undefined ? Number(meta.rodLaborCost) : undefined,
          rodShippingCost: meta.rodShippingCost !== undefined ? Number(meta.rodShippingCost) : undefined,
          rodRingTotalKg: meta.rodRingTotalKg !== undefined ? Number(meta.rodRingTotalKg) : undefined,
          cementLaborRate: meta.cementLaborRate !== undefined ? Number(meta.cementLaborRate) : undefined,
          cementShippingRate: meta.cementShippingRate !== undefined ? Number(meta.cementShippingRate) : undefined,
          cementLaborCost: meta.cementLaborCost !== undefined ? Number(meta.cementLaborCost) : undefined,
          cementShippingCost: meta.cementShippingCost !== undefined ? Number(meta.cementShippingCost) : undefined,
          cementTotalBags: meta.cementTotalBags !== undefined ? Number(meta.cementTotalBags) : undefined
        };
      });
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
      setCustomers(partyList.map(p => {
        const d = Number(p.total_due !== undefined ? p.total_due : (p.opening_balance || 0));
        return {
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          address: p.address || '',
          businessName: p.business_name || '',
          totalDue: d,
          due: d,
          balance: d,
          previousDue: d,
          openingBalance: Number(p.opening_balance || 0)
        };
      }));

      const bankList = await api.banks.list();
      setSavedBanks(bankList.map(b => ({
        id: String(b.id),
        name: b.name || b.bank_name || 'ব্যাংক',
        accNo: b.account_number || ''
      })));
    } catch (err) {
      console.error('Error loading invoices page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadInvoicesData();
    })();
    return () => { ignore = true; };
  }, []);

  // Handle pre-filling form if arriving from /orders with ?fromOrder={id}
  useEffect(() => {
    if (fromOrderId && convertedOrderId !== fromOrderId) {
      let isSubscribed = true;
      (async () => {
        try {
          let targetOrder = allOrders.find(o => o.id === fromOrderId);
          if (!targetOrder) {
            const raw = await api.transactions.get(fromOrderId);
            if (raw && isSubscribed) {
              targetOrder = {
                id: String(raw.id),
                orderId: raw.invoice_no,
                customerName: raw.party_name || 'গ্রাহক',
                customerPhone: raw.party_phone || '',
                customerId: String(raw.party || ''),
                items: (raw.items || []).map(i => ({
                  id: String(i.product || ''),
                  name: i.product_name,
                  price: i.price,
                  quantity: i.quantity,
                  unit: i.unit || 'পিস',
                  total: i.total
                })),
                totalAmount: raw.total_amount,
                paidAmount: raw.paid_amount,
                dueAmount: raw.due_amount,
                paymentStatus: raw.due_amount <= 0 ? 'paid' : raw.paid_amount > 0 ? 'partial' : 'unpaid',
                createdAt: raw.created_at,
                note: raw.notes
              };
            }
          }

          if (targetOrder && isSubscribed) {
            setConvertedOrderId(targetOrder.id);
            
            // Find matching customer
            const cust = customers.find(c => c.id === targetOrder!.customerId || c.name === targetOrder!.customerName);
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
            setInvoicePaidAmount(targetOrder.paidAmount || targetOrder.totalAmount || 0);
            setInvoiceNote(targetOrder.note || '');
            setIsCreateInvoiceOpen(true);
            toast.info('বিক্রয় অর্ডারের তথ্য নিয়ে চালানের ফর্ম লোড হয়েছে।');
          }
        } catch (e) {
          console.error('Error fetching order for conversion:', e);
        }
      })();

      return () => {
        isSubscribed = false;
      };
    }
  }, [fromOrderId, allOrders, customers, convertedOrderId]);

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

  // Cart Add Item
  const handleAddCartItem = () => {
    const itemName = selectedCascadingProduct?.name || products.find(p => p.id === selectedProductId)?.name;
    if (!itemName) {
      toast.error('পণ্য নির্বাচন করুন');
      return;
    }

    const foundProd = products.find(p => p.id === (selectedCascadingProduct?.productId || selectedProductId) || p.name === itemName);
    const availableStock = Number(foundProd?.stock ?? selectedCascadingProduct?.stock ?? 0);

    if (availableStock <= 0) {
      toast.error('⚠️ পণ্যটি স্টকে নেই! বিক্রয় চালানে কেবল স্টকে থাকা পণ্য যোগ করা যাবে।');
      return;
    }

    const requestedQty = Number(itemQty) || 1;
    const existing = cart.find(i => i.name === itemName || (foundProd && String(i.id) === String(foundProd.id)));
    const currentInCart = existing ? Number(existing.quantity) : 0;

    if (currentInCart + requestedQty > availableStock) {
      toast.error(`⚠️ স্টকে মাত্র ${availableStock} ${foundProd?.unit || 'পিস'} রয়েছে! (কার্টে ইতিমধ্যে আছে: ${currentInCart} ${foundProd?.unit || 'পিস'}), এর বেশি যোগ করা সম্ভব নয়।`);
      return;
    }

    const itemUnitToUse = selectedCascadingProduct?.unit || foundProd?.unit || 'পিস';
    const itemId = selectedCascadingProduct?.productId || selectedProductId || foundProd?.id || String(Date.now());
    const finalPrice = itemPrice || selectedCascadingProduct?.price || foundProd?.sellPrice || 0;

    setCart(prev => {
      const existingItem = prev.find(i => i.name === itemName || String(i.id) === String(itemId));
      if (existingItem) {
        const updatedQty = existingItem.quantity + requestedQty;
        return prev.map(i => (i.name === itemName || String(i.id) === String(itemId)) ? { 
          ...i, 
          quantity: updatedQty, 
          price: finalPrice, 
          discount: itemDiscount,
          total: finalPrice * updatedQty
        } : i);
      }
      return [...prev, {
        id: itemId,
        name: itemName,
        category: selectedCascadingProduct?.category || (foundProd as any)?.category,
        brand: selectedCascadingProduct?.brand || (foundProd as any)?.brand,
        mmSize: selectedCascadingProduct?.mmSize,
        unit: itemUnitToUse,
        price: finalPrice,
        quantity: requestedQty,
        discount: itemDiscount || 0,
        total: finalPrice * requestedQty
      }];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
    setItemDiscount(0);
  };

  const handleRemoveCartItem = (id?: string | number, index?: number) => {
    if (index !== undefined) {
      setCart(prev => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (id === undefined || id === null) return;
    setCart(prev => prev.filter(i => String(i.id) !== String(id)));
  };

  const handleUpdateCartQty = (id: string | number, newQty: number, index?: number) => {
    if (newQty < 1) return;
    const targetItem = cart.find((i, idx) => index !== undefined ? idx === index : String(i.id) === String(id));
    if (targetItem) {
      const foundProd = products.find(p => p.id === String(targetItem.id) || p.name === targetItem.name);
      const availableStock = Number(foundProd?.stock || 0);
      if (availableStock > 0 && newQty > availableStock) {
        toast.error(`⚠️ স্টকে মাত্র ${availableStock} ${targetItem.unit || 'পিস'} রয়েছে, এর বেশি বিক্রি করা সম্ভব নয়!`);
        newQty = availableStock;
      }
    }
    setCart(prev => prev.map((i, idx) => {
      if (index !== undefined && idx === index) return { ...i, quantity: newQty, total: (i.price || 0) * newQty };
      if (String(i.id) === String(id)) return { ...i, quantity: newQty, total: (i.price || 0) * newQty };
      return i;
    }));
  };

  // Helper to prevent floating point precision issues in DecimalField API validation
  const round2 = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

  // Category-specific quantity calculations (Rod/Ring in KG, Cement in Bags)
  const rodRingTotalKg = useMemo(() => {
    return round2(cart.reduce((sum, item) => {
      const parsed = parseProductDetails(item);
      const isRod = parsed.categoryName === 'রড' || item.category === 'রড' || (item.unit || '').includes('কেজি') || (item.unit || '').includes('টন') || (item.name || '').includes('রড') || (item.name || '').includes('মিলি');
      const isRing = parsed.categoryName === 'রিং' || item.category === 'রিং' || (item.name || '').includes('রিং');
      if (isRod || isRing) {
        const isTon = (item.unit || '').toLowerCase().includes('ton') || (item.unit || '').includes('টন');
        return sum + (Number(item.quantity) || 0) * (isTon ? 1000 : 1);
      }
      return sum;
    }, 0));
  }, [cart]);

  const cementTotalBags = useMemo(() => {
    return round2(cart.reduce((sum, item) => {
      const parsed = parseProductDetails(item);
      const isCement = parsed.categoryName === 'সিমেন্ট' || item.category === 'সিমেন্ট' || (item.unit || '').includes('বস্তা') || (item.unit || '').includes('ব্যাগ') || (item.name || '').includes('সিমেন্ট');
      if (isCement) {
        return sum + (Number(item.quantity) || 0);
      }
      return sum;
    }, 0));
  }, [cart]);

  const rodLaborTotal = round2(rodRingTotalKg * (rodLaborRate || 0));
  const rodShippingTotal = round2(rodRingTotalKg * (rodShippingRate || 0));
  const cementLaborTotal = round2(cementTotalBags * (cementLaborRate || 0));
  const cementShippingTotal = round2(cementTotalBags * (cementShippingRate || 0));

  const laborCost = chargeCalcMode === 'rate' ? round2(rodLaborTotal + cementLaborTotal) : manualLaborCost;
  const shippingCost = chargeCalcMode === 'rate' ? round2(rodShippingTotal + cementShippingTotal) : manualShippingCost;

  // Cart Calculations matching 1:1 Screenshot
  const cartSubtotal = round2(cart.reduce((a, i) => a + (i.price * i.quantity), 0));
  const computedDiscount = discountType === 'percentage' 
    ? round2((cartSubtotal * (discountPercent || 0)) / 100) 
    : round2(discountFlat || 0);
  const cartTotalDiscount = round2(computedDiscount + cart.reduce((a, i) => a + ((i.discount || 0) * i.quantity), 0));
  const cartTotalAmount = round2(Math.max(0, cartSubtotal - cartTotalDiscount + (shippingCost || 0) + (laborCost || 0)));

  // Total Paid considering Split payment or single payment
  const totalReceivedPayment = round2((cashPaidAmount > 0 || chequePaidAmount > 0)
    ? ((cashPaidAmount || 0) + (chequePaidAmount || 0))
    : (invoicePaidAmount || 0));

  const cartDueAmount = round2(paymentOption === 'now' ? Math.max(0, cartTotalAmount - totalReceivedPayment) : cartTotalAmount);

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
    setPaymentOption('now');
    setPreparedBy('');
    setAuthorizedBy('');
    setReceivedBy('');
    setWarehouse('Main');
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryAddress('');
    
    // Load default per-unit rates from localStorage
    const defRodLab = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_sales_rod_labor_rate') || '0') || 0) : 0;
    const defRodShip = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_sales_rod_shipping_rate') || '0') || 0) : 0;
    const defCemLab = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_sales_cement_labor_rate') || '0') || 0) : 0;
    const defCemShip = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem('dokan_sales_cement_shipping_rate') || '0') || 0) : 0;
    setRodLaborRate(defRodLab);
    setRodShippingRate(defRodShip);
    setCementLaborRate(defCemLab);
    setCementShippingRate(defCemShip);
    setChargeCalcMode('rate');
    setManualLaborCost(0);
    setManualShippingCost(0);

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
    setManualShippingCost(inv.shippingCost || 0);
    setManualLaborCost(inv.laborCost || 0);
    setVehicleNo(inv.vehicleNo || '');
    setDriverName(inv.driverName || '');
    setDriverPhone(inv.driverPhone || '');
    setDeliveryAddress(inv.deliveryAddress || inv.customerAddress || '');

    const invAny = inv as any;
    if (invAny.rodLaborRate !== undefined) setRodLaborRate(Number(invAny.rodLaborRate || 0));
    if (invAny.rodShippingRate !== undefined) setRodShippingRate(Number(invAny.rodShippingRate || 0));
    if (invAny.cementLaborRate !== undefined) setCementLaborRate(Number(invAny.cementLaborRate || 0));
    if (invAny.cementShippingRate !== undefined) setCementShippingRate(Number(invAny.cementShippingRate || 0));
    if (invAny.chargeCalcMode) setChargeCalcMode(invAny.chargeCalcMode);

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

      let effectivePaymentMethod = 'cash';
      if ((cashPaidAmount || 0) > 0 && (chequePaidAmount || 0) > 0) {
        effectivePaymentMethod = 'split';
      } else {
        const pmLower = (invoicePaymentMethod || 'cash').toLowerCase();
        if (pmLower.includes('split')) effectivePaymentMethod = 'split';
        else if (pmLower.includes('bank')) effectivePaymentMethod = 'bank';
        else if (pmLower.includes('cheque') || pmLower.includes('check')) effectivePaymentMethod = 'cheque';
        else if (pmLower.includes('mobile') || pmLower.includes('bkash') || pmLower.includes('nagad')) effectivePaymentMethod = 'mobile_banking';
        else effectivePaymentMethod = 'cash';
      }

      const hasCheque = effectivePaymentMethod === 'cheque' || effectivePaymentMethod === 'split' || (chequePaidAmount || 0) > 0 || !!chequeNo;

      const chequePayload = hasCheque ? {
        cheque_number: chequeNo || 'CHQ-PAYMENT',
        cheque_bank: bankName || senderBankName || 'ব্যাংক',
        cheque_due_date: chequeDate || undefined,
        cheque_status: 'pending' as const
      } : {};

      const logisticsMeta = {
        discountType,
        discountPercent: Number(discountPercent || 0),
        discountFlat: Number(discountFlat || 0),
        chargeCalcMode,
        rodLaborRate: Number(rodLaborRate || 0),
        rodShippingRate: Number(rodShippingRate || 0),
        rodLaborCost: Number(rodLaborTotal || 0),
        rodShippingCost: Number(rodShippingTotal || 0),
        rodRingTotalKg: Number(rodRingTotalKg || 0),
        cementLaborRate: Number(cementLaborRate || 0),
        cementShippingRate: Number(cementShippingRate || 0),
        cementLaborCost: Number(cementLaborTotal || 0),
        cementShippingCost: Number(cementShippingTotal || 0),
        cementTotalBags: Number(cementTotalBags || 0),
        laborCost: Number(laborCost || 0),
        transportCost: Number(shippingCost || 0),
        shippingCost: Number(shippingCost || 0),
        vehicleNo: vehicleNo || '',
        driverName: driverName || '',
        driverPhone: driverPhone || '',
        deliveryAddress: deliveryAddress || '',
        paymentMethodName: invoicePaymentMethod,
        bankName: bankName || senderBankName || selectedShopBank || '',
        accountNo: accountNo || senderAccountNo || '',
        transactionRef: transactionRef || senderTxnRef || '',
        receiverShopBank: selectedShopBank || '',
        senderBankName: senderBankName || '',
        senderAccountNo: senderAccountNo || '',
        senderTxnRef: senderTxnRef || '',
        chequeNo: chequeNo || '',
        chequeDate: chequeDate || '',
        cashPaidAmount: Number(cashPaidAmount || 0),
        chequePaidAmount: Number(chequePaidAmount || 0),
        previousBalance: selectedCustomer ? Number((selectedCustomer as any).totalDue || (selectedCustomer as any).due || (selectedCustomer as any).balance || (selectedCustomer as any).previousDue || (selectedCustomer as any).openingBalance || 0) : 0,
        userNote: invoiceNote || ''
      };

      const finalNotesPayload = JSON.stringify(logisticsMeta) + (invoiceNote ? `\n${invoiceNote}` : '');

      const safeSubtotal = round2(cartSubtotal);
      const safeDiscount = round2(cartTotalDiscount);
      const safeTotalAmount = round2(cartTotalAmount);
      const safePaidAmount = round2(finalPaidAmount);
      const safeDueAmount = round2(cartDueAmount);

      if (editingInvoiceId) {
        await api.transactions.update(editingInvoiceId, {
          party: finalCustId ? Number(finalCustId) : null,
          subtotal: safeSubtotal,
          discount: safeDiscount,
          total_amount: safeTotalAmount,
          paid_amount: safePaidAmount,
          due_amount: safeDueAmount,
          payment_method: effectivePaymentMethod,
          ...chequePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: round2(i.price),
              unit: i.unit,
              total: round2(i.price * i.quantity)
            };
          }),
          notes: finalNotesPayload
        });
        toast.success('চালান সফলভাবে এডিট ও আপডেট করা হয়েছে!');
      } else {
        await api.transactions.create({
          party: finalCustId ? Number(finalCustId) : null,
          transaction_type: 'sale',
          subtotal: safeSubtotal,
          discount: safeDiscount,
          total_amount: safeTotalAmount,
          paid_amount: safePaidAmount,
          due_amount: safeDueAmount,
          payment_method: effectivePaymentMethod,
          ...chequePayload,
          items: cart.map(i => {
            const prodId = Number(i.id);
            return {
              product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
              product_name: i.name,
              quantity: i.quantity,
              price: round2(i.price),
              unit: i.unit,
              total: round2(i.price * i.quantity)
            };
          }),
          notes: finalNotesPayload
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

  const parseInvoiceDate = (at: any): Date | null => {
    if (!at) return null;
    try {
      const d = at?.toDate ? at.toDate() : new Date(at);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const handleResetFilters = () => {
    setFilterInvoiceNo('');
    setFilterCustomer('all');
    setStartDate('');
    setEndDate('');
    setFilterPaymentStatus('all');
    setFilterPaymentMethod('all');
    setFilterSalesPerson('all');
    setFilterInvoiceType('all');
    setFilterBranch('all');
    setFilterStageStatus('all');
    setMinBill('');
    setMaxBill('');
    setMinDue('');
    setMaxDue('');
    setQuickFilter('all');
    setSearch('');
  };

  const filtered = invoices.filter(item => {
    // 1. Invoice No / Search
    const q = (filterInvoiceNo || search).trim().toLowerCase();
    if (q) {
      const idMatch = item.id?.toLowerCase().includes(q);
      const orderIdMatch = item.orderId?.toLowerCase().includes(q);
      const custMatch = item.customerName?.toLowerCase().includes(q);
      const phoneMatch = item.customerPhone?.includes(q);
      if (!idMatch && !orderIdMatch && !custMatch && !phoneMatch) return false;
    }

    // 2. Customer
    if (filterCustomer !== 'all') {
      const matchesCustId = item.customerId && String(item.customerId) === filterCustomer;
      const matchesCustName = item.customerName === filterCustomer;
      if (!matchesCustId && !matchesCustName) return false;
    }

    // 3. Date Range (Start / End)
    const itemDate = parseInvoiceDate(item.createdAt);
    if (startDate && itemDate) {
      if (itemDate < startOfDay(new Date(startDate))) return false;
    }
    if (endDate && itemDate) {
      if (itemDate > endOfDay(new Date(endDate))) return false;
    }

    // 4. Payment Status
    if (filterPaymentStatus !== 'all') {
      const isPaid = item.dueAmount <= 0 || item.paymentStatus === 'paid' || item.paymentStatus === 'পরিশোধিত';
      const isPartial = (item.paidAmount || 0) > 0 && item.dueAmount > 0;
      const isUnpaid = (item.paidAmount || 0) === 0 && item.dueAmount > 0;

      if (filterPaymentStatus === 'paid' && !isPaid) return false;
      if (filterPaymentStatus === 'partial' && !isPartial) return false;
      if (filterPaymentStatus === 'unpaid' && !isUnpaid) return false;
    }

    // 5. Payment Method
    if (filterPaymentMethod !== 'all') {
      const method = (item.paymentMethod || 'cash').toLowerCase();
      if (!method.includes(filterPaymentMethod)) return false;
    }

    // 6. Min/Max Bill
    if (minBill !== '' && Number(minBill) > 0 && item.totalAmount < Number(minBill)) return false;
    if (maxBill !== '' && Number(maxBill) > 0 && item.totalAmount > Number(maxBill)) return false;

    // 7. Min/Max Due
    if (minDue !== '' && Number(minDue) > 0 && item.dueAmount < Number(minDue)) return false;
    if (maxDue !== '' && Number(maxDue) > 0 && item.dueAmount > Number(maxDue)) return false;

    // 8. Quick Filter Pills
    if (quickFilter !== 'all') {
      if (quickFilter === 'today' && itemDate && !isToday(itemDate)) return false;
      if (quickFilter === 'yesterday' && itemDate && !isYesterday(itemDate)) return false;
      if (quickFilter === 'this_week' && itemDate && !isSameWeek(itemDate, new Date())) return false;
      if (quickFilter === 'this_month' && itemDate && !isSameMonth(itemDate, new Date())) return false;

      const isPaid = item.dueAmount <= 0 || item.paymentStatus === 'paid' || item.paymentStatus === 'পরিশোধিত';
      const isPartial = (item.paidAmount || 0) > 0 && item.dueAmount > 0;
      const isUnpaid = (item.paidAmount || 0) === 0 && item.dueAmount > 0;

      if (quickFilter === 'unpaid' && !isUnpaid) return false;
      if (quickFilter === 'partial' && !isPartial) return false;
      if (quickFilter === 'paid' && !isPaid) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedInvoices = filtered.slice(startIndex, endIndex);

  const totalSales = invoices.reduce((a, o) => a + o.totalAmount, 0);
  const totalPaid = invoices.reduce((a, o) => a + (o.paidAmount || 0), 0);
  const totalDue = invoices.reduce((a, o) => a + (o.dueAmount || 0), 0);

  return (
    <Shell>
      {selectedInvoice ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <SalesInvoiceDetailsView
            invoice={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
            onEdit={(inv) => {
              const current = selectedInvoice;
              setSelectedInvoice(null);
              handleEditInvoice(current || inv);
            }}
            onPrint={() => printElement('printable-memo-wrapper')}
          />

          {/* Hidden Print Container for iframe printing */}
          <div className="hidden print:block">
            <InvoiceMemo
              invoice={{
                ...selectedInvoice,
                transportCost: selectedInvoice.shippingCost || 0
              } as any}
              showPrintButton={false}
            />
          </div>
        </div>
      ) : !isCreateInvoiceOpen ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bengali h-12 px-6 rounded-md font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />সরাসরি চালান তৈরি করুন
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'মোট ইনভয়েস বিক্রয়', value: `৳ ${toBengaliDigits(totalSales.toLocaleString('en-IN'))}`, icon: Receipt, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'মোট ক্যাশ প্রাপ্তি', value: `৳ ${toBengaliDigits(totalPaid.toLocaleString('en-IN'))}`, icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'মোট বকেয়া চালান', value: `৳ ${toBengaliDigits(totalDue.toLocaleString('en-IN'))}`, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((s, i) => (
            <Card key={i} className={cn("border-2 shadow-sm rounded-md transition-all hover:shadow-md", s.border, s.bg)}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-md flex items-center justify-center bg-white shadow-sm", s.color)}>
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

        {/* COMPACT & EFFICIENT FILTER CARD */}
        <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
          {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Unified Search Box (Invoice No, Customer Name, Phone) */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ইনভয়েস নং, কাস্টমার নাম বা নম্বর..."
                value={search}
                onChange={e => { setSearch(e.target.value); setFilterInvoiceNo(e.target.value); }}
                className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button 
                  onClick={() => { setSearch(''); setFilterInvoiceNo(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bengali Date Range Filter */}
            <BengaliDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              placeholder="তারিখ ফিল্টার"
              compact={false}
            />

            {/* Quick Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'all', label: 'সব' },
                { id: 'paid', label: 'পরিশোধিত' },
                { id: 'partial', label: 'আংশিক' },
                { id: 'unpaid', label: 'বাকি' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilterPaymentStatus(p.id);
                    setQuickFilter(p.id);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                    (filterPaymentStatus === p.id || quickFilter === p.id)
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
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
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>আরও ফিল্টার</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {(search || filterInvoiceNo || filterCustomer !== 'all' || startDate || endDate || filterPaymentStatus !== 'all' || filterPaymentMethod !== 'all' || minBill || maxBill || minDue || maxDue || quickFilter !== 'all') && (
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

          {/* Secondary Collapsible Drawer: Advanced Options (Payment Method, Amount Ranges) */}
          {isFilterExpanded && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম</Label>
                <Select value={filterPaymentMethod} onValueChange={(val) => setFilterPaymentMethod(val || 'all')}>
                  <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="সব মাধ্যম" />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="all">সব মাধ্যম</SelectItem>
                    <SelectItem value="cash">নগদ</SelectItem>
                    <SelectItem value="bank">ব্যাংক</SelectItem>
                    <SelectItem value="cheque">চেক</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Time Pills */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">সময়সূচী</Label>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'today', label: 'আজ' },
                    { id: 'yesterday', label: 'গতকাল' },
                    { id: 'this_week', label: 'এই সপ্তাহ' },
                    { id: 'this_month', label: 'এই মাস' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setQuickFilter(quickFilter === t.id ? 'all' : t.id)}
                      className={cn(
                        "px-2 py-1.5 rounded-md text-[11px] font-bold transition-all border flex-1 text-center whitespace-nowrap",
                        quickFilter === t.id
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">মোট বিল (৳)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="সর্বনিম্ন"
                    value={minBill}
                    onChange={e => setMinBill(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    placeholder="সর্বোচ্চ"
                    value={maxBill}
                    onChange={e => setMaxBill(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Due Range */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">বকেয়া পরিমাণ (৳)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="সর্বনিম্ন"
                    value={minDue}
                    onChange={e => setMinDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    placeholder="সর্বোচ্চ"
                    value={maxDue}
                    onChange={e => setMaxDue(e.target.value)}
                    className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 3: INVOICES DATA TABLE */}
        <Card className="border border-slate-200/80 shadow-md rounded-md bg-white overflow-hidden">
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center py-4 px-3">
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                      <span>ইনভয়েস নং</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">
                    <div className="flex items-center gap-1 cursor-pointer select-none">
                      <span>তারিখ ও সময়</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">কাস্টমার নাম</TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>মোট বিল (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>নগদ প্রাপ্তি (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                      <span>বকেয়া (৳)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                      <span>পেমেন্ট স্ট্যাটাস</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-pointer select-none">
                      <span>স্ট্যাটাস</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-6 text-center">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-20 text-slate-400 font-bengali font-bold text-lg">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Receipt className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-bengali font-bold text-lg">কোনো ইনভয়েস/চালান পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedInvoices.map(inv => {
                  const isPaid = inv.dueAmount <= 0 || inv.paymentStatus === 'paid' || inv.paymentStatus === 'পরিশোধিত';
                  const isPartial = (inv.paidAmount || 0) > 0 && inv.dueAmount > 0;
                  const isUnpaid = (inv.paidAmount || 0) === 0 && inv.dueAmount > 0;

                  return (
                    <TableRow
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <TableCell className="text-center py-4 px-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-sm text-xs">
                          #{toBengaliDigits(inv.orderId || inv.id.slice(0, 8).toUpperCase())}
                        </span>
                      </TableCell>
                      <TableCell className="font-bengali text-xs font-medium text-slate-600">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="font-bengali text-slate-800 py-4 px-4">
                        <p className="font-bold text-sm text-slate-900">{inv.customerName}</p>
                        {inv.customerPhone && (
                          <p className="text-xs text-slate-400 font-sans mt-0.5">{inv.customerPhone}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-slate-900 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.totalAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-emerald-600 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.paidAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-rose-600 text-sm py-4 px-4">
                        ৳{toBengaliDigits((inv.dueAmount || 0).toLocaleString('en-IN'))}
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <span className={cn(
                          "px-3 py-1 rounded-md text-xs font-bold font-bengali border inline-block",
                          isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          isPartial ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক' : 'বাকি'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        <span className="bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-md text-xs font-bengali inline-block">
                          সেল
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button size="icon" variant="ghost" title="ইনভয়েস বিস্তারিত দেখুন" onClick={() => setSelectedInvoice(inv)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="ইনভয়েস এডিট করুন" onClick={() => handleEditInvoice(inv)} className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="ইনভয়েস মুছে ফেলুন" onClick={() => { setDeletingInvoice(inv); setIsDeleteDialogOpen(true); }} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="প্রিন্ট করুন" onClick={() => window.print()} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* PAGINATION FOOTER NAVBAR */}
          {filtered.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 font-bengali text-xs font-semibold">
              <div className="text-slate-600 flex items-center gap-2">
                <span>
                  মোট <strong className="text-slate-900 font-bold">{toBengaliDigits(filtered.length)}</strong> টি ইনভয়েসের মধ্যে <strong className="text-slate-900 font-bold">{toBengaliDigits(startIndex + 1)}</strong> - <strong className="text-slate-900 font-bold">{toBengaliDigits(endIndex)}</strong> টি দেখানো হচ্ছে
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>প্রতি পেজে:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-md bg-white border border-slate-200 px-2 font-bold text-xs text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={10}>১০ টি</option>
                    <option value={20}>২০ টি</option>
                    <option value={50}>৫০ টি</option>
                    <option value={100}>১০০ টি</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> আগের পেজ
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-md text-xs font-bold transition-all border",
                                currentPage === page
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              {toBengaliDigits(page)}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 px-2.5 rounded-md text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    পরের পেজ <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      ) : (
        /* CREATE / CONVERT INVOICE IN-PAGE VIEW (Direct Page View, No Popup Overlay) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                  className="w-9 h-9 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase block">
                    ইনভয়েস ব্যবস্থাপনা
                  </span>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editingInvoiceId ? 'চালান সম্পাদনা করুন' : convertedOrderId ? 'বিক্রয় অর্ডার থেকে চালান তৈরি' : 'নতুন বিক্রয় ইনভয়েস তৈরি করুন'}
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* MAIN FORM GRID INSIDE FRAME */}
            <form onSubmit={handleCreateInvoiceSubmit} className="p-4 md:p-6 w-full space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT 9 COLUMNS: 7 STEPS */}
                <div className="lg:col-span-9 space-y-5">
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">১</span>
                        দোকান ও প্রাথমিক তথ্য
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomer(!isNewCustomer);
                          setSelectedCustomer(null);
                        }}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        {isNewCustomer ? '← তালিকা থেকে বাছুন' : '+ নতুন কাস্টমার এন্ট্রি করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Select Shop / Customer */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">কাস্টমার / দোকান নির্বাচন করুন <span className="text-rose-500">*</span></Label>
                        {!isNewCustomer ? (
                          <CustomerSearchSelect
                            customers={customers}
                            selectedCustomer={selectedCustomer}
                            onSelectCustomer={(cust) => setSelectedCustomer(cust)}
                            onAddNewClick={() => setIsNewCustomer(true)}
                            placeholder="কাস্টমার / দোকান সার্চ করুন..."
                          />
                        ) : (
                          <div className="space-y-2">
                            <Input
                              required
                              placeholder="কাস্টমারের নাম"
                              value={newCustomerData.name}
                              onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                            />
                            <Input
                              placeholder="মোবাইল নম্বর (১১ ডিজিট)"
                              value={newCustomerData.phone}
                              maxLength={11}
                              onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 11) })}
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Invoice Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">ইনভয়েস নম্বর</Label>
                        <Input
                          disabled
                          value="স্বয়ংক্রিয় (অটো জেনারেট)"
                          className="rounded-md h-11 bg-slate-100 border-slate-200 text-xs font-bold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">ইনভয়েস তারিখ <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={invoiceDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}
                            onChange={e => setInvoiceDate(e.target.value)}
                            className="rounded-md h-11 bg-slate-50 border-slate-200 text-xs font-bold font-bengali pr-9"
                          />
                          <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Customer Existing Due Alert Box */}
                    {selectedCustomer && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-md flex items-center justify-between text-xs font-bengali mt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900">{selectedCustomer.name}</span>
                            {selectedCustomer.phone && <span className="ml-2 text-slate-600 font-semibold">({toBengaliDigits(selectedCustomer.phone)})</span>}
                            {selectedCustomer.address && <p className="text-slate-500 text-[11px] font-semibold">{selectedCustomer.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-rose-600 font-bold block">পূর্বের মোট বকেয়া</span>
                          <span className="font-black text-rose-700 text-base">৳ {toBengaliDigits(selectedCustomerDue.toLocaleString('en-IN'))}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* STEP 2: Item Lines */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">২</span>
                        পণ্যসমূহ (আইটেম লাইন)
                      </Label>
                      <Button 
                        type="button"
                        onClick={handleAddCartItem}
                        size="sm" 
                        className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> নতুন সারি যোগ
                      </Button>
                    </div>

                    {/* Step-by-Step Cascading Product Selector (Rod, Cement, Ring) */}
                    <CascadingProductSelector
                      products={products}
                      onlyInStock={true}
                      onProductChange={(selected) => {
                        setSelectedCascadingProduct(selected);
                        if (selected && selected.productId) {
                          setSelectedProductId(selected.productId);
                        }
                      }}
                      showPriceField={true}
                      itemQty={itemQty}
                      onQtyChange={setItemQty}
                      itemPrice={itemPrice}
                      onPriceChange={setItemPrice}
                      onAddCartItem={handleAddCartItem}
                    />

                    {/* Table matching screenshot columns */}
                    <div className="border border-slate-200 rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[11px]">
                            <TableHead className="w-10 text-center font-black">#</TableHead>
                            <TableHead className="font-black">পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-black">ব্র্যান্ড</TableHead>
                            <TableHead className="text-center font-black">সাইজ</TableHead>
                            <TableHead className="text-center font-black">পরিমাণ</TableHead>
                            <TableHead className="text-right font-black">একক মূল্য</TableHead>
                            <TableHead className="text-right font-black">মোট মূল্য</TableHead>
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
                          ) : cart.map((item, idx) => {
                            const parsed = parseProductDetails(item);
                            return (
                              <TableRow key={item.id ? `${item.id}-${idx}` : `${item.name}-${idx}`} className="text-xs border-b border-slate-100">
                                <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                                <TableCell className="font-bold text-slate-900">{parsed.categoryName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.brandName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.sizeName}</TableCell>
                                <TableCell className="text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button type="button" onClick={() => handleUpdateCartQty(item.id || idx, item.quantity - 1, idx)} className="w-6 h-6 rounded-sm bg-slate-100 font-bold hover:bg-slate-200">-</button>
                                    <span className="font-bold">{toBengaliDigits(item.quantity)} {item.unit}</span>
                                    <button type="button" onClick={() => handleUpdateCartQty(item.id || idx, item.quantity + 1, idx)} className="w-6 h-6 rounded-sm bg-slate-100 font-bold hover:bg-slate-200">+</button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-600">৳{toBengaliDigits((item.price || 0).toLocaleString('en-IN'))}</TableCell>
                                <TableCell className="text-right font-black text-slate-900">৳{toBengaliDigits(((item.price || 0) * item.quantity).toLocaleString('en-IN'))}</TableCell>
                                <TableCell className="text-center">
                                  <button type="button" onClick={() => handleRemoveCartItem(item.id, idx)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm cursor-pointer transition-colors" title="আইটেম বাদ দিন">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 3: Transport & Delivery Details */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৩</span>
                      পরিবহন ও সাইটের তথ্য
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">গাড়ির নম্বর / ট্রাক নং</Label>
                        <Input
                          value={vehicleNo}
                          onChange={e => setVehicleNo(e.target.value)}
                          placeholder="ঢাকা মেট্রো-ট ১১-৫৪৩২"
                          className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">ড্রাইভারের নাম</Label>
                        <Input
                          value={driverName}
                          onChange={e => setDriverName(e.target.value)}
                          placeholder="মোঃ রফিক"
                          className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">ড্রাইভারের মোবাইল নম্বর</Label>
                        <Input
                          value={driverPhone}
                          maxLength={11}
                          onChange={e => setDriverPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                          placeholder="০১৭XXXXXXXX"
                          className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-600">ডেলিভারি সাইট ঠিকানা</Label>
                        <Input
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          placeholder="সাইট-২, উত্তরা, ঢাকা"
                          className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 4 & STEP 5 ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* STEP 4: Totals, Discount & Tax */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৪</span>
                        মোট বিল, ছাড় ও অতিরিক্ত খরচ
                      </Label>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">ছাড়ের ধরণ</Label>
                          <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                            <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali">
                              <SelectValue>
                                {discountType === 'percentage' ? 'শতকরা (%)' : 'ফ্ল্যাট (৳)'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs font-bold">
                              <SelectItem value="percentage">শতকরা (%)</SelectItem>
                              <SelectItem value="flat">ফ্ল্যাট (৳)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">ছাড়ের পরিমাণ (% / ৳)</Label>
                          <Input 
                            type="number"
                            value={discountType === 'percentage' ? (discountPercent || '') : (discountFlat || '')}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              if (discountType === 'percentage') setDiscountPercent(val);
                              else setDiscountFlat(val);
                            }}
                            placeholder="০"
                            className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">হিসাবকৃত মোট ছাড়</Label>
                          <Input 
                            disabled
                            value={`৳ ${toBengaliDigits(computedDiscount.toLocaleString('en-IN'))}`}
                            className="rounded-md h-10 bg-slate-100 border-slate-200 text-xs font-black text-emerald-600 cursor-not-allowed font-bengali"
                          />
                        </div>
                      </div>

                      {/* Calculation Mode Toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs gap-2">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                            <input 
                              type="radio" 
                              name="chargeCalcMode" 
                              checked={chargeCalcMode === 'rate'}
                              onChange={() => setChargeCalcMode('rate')}
                              className="accent-emerald-600"
                            />
                            <span>প্রতি ইউনিট রেট অনুযায়ী (রড কেজি ও সিমেন্ট বস্তা)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                            <input 
                              type="radio" 
                              name="chargeCalcMode" 
                              checked={chargeCalcMode === 'manual'}
                              onChange={() => setChargeCalcMode('manual')}
                              className="accent-emerald-600"
                            />
                            <span>সরাসরি মোট টাকা (ম্যানুয়াল)</span>
                          </label>
                        </div>
                        {chargeCalcMode === 'rate' && (
                          <button
                            type="button"
                            onClick={handleSaveDefaultCharges}
                            className="text-[10px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-sm border border-amber-300 transition-colors cursor-pointer font-bengali self-start sm:self-auto"
                            title="বর্তমানে দেওয়া রেটগুলো সব সময় ডিফল্ট হিসেবে রাখতে এখানে ক্লিক করুন"
                          >
                            📌 ডিফল্ট রেট সেভ করুন
                          </button>
                        )}
                      </div>

                      {chargeCalcMode === 'rate' ? (
                        <div className="space-y-3 font-bengali">
                          {/* Rod & Ring Rate Box */}
                          {(rodRingTotalKg > 0 || (rodRingTotalKg === 0 && cementTotalBags === 0)) && (
                            <div className="bg-sky-50/60 border border-sky-200 rounded-md p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-sky-900 flex items-center gap-1.5">
                                  🔹 রড ও রিং খরচ (কেজি হিসেবে)
                                </span>
                                <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                  মোট ওজন: {toBengaliDigits(rodRingTotalKg.toLocaleString('en-IN'))} কেজি
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-600">লেবার রেট (৳/কেজি)</Label>
                                  <div className="relative">
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={rodLaborRate || ''}
                                      onChange={e => setRodLaborRate(parseFloat(e.target.value) || 0)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-sky-300 text-xs font-bold text-amber-700 font-bengali pr-20"
                                    />
                                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-500 font-bengali">
                                      = ৳{toBengaliDigits(rodLaborTotal.toLocaleString('en-IN'))}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-600">গাড়ি ভাড়া রেট (৳/কেজি)</Label>
                                  <div className="relative">
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={rodShippingRate || ''}
                                      onChange={e => setRodShippingRate(parseFloat(e.target.value) || 0)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-sky-300 text-xs font-bold text-sky-700 font-bengali pr-20"
                                    />
                                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-500 font-bengali">
                                      = ৳{toBengaliDigits(rodShippingTotal.toLocaleString('en-IN'))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Cement Rate Box */}
                          {(cementTotalBags > 0 || (rodRingTotalKg === 0 && cementTotalBags === 0)) && (
                            <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-amber-900 flex items-center gap-1.5">
                                  🔸 সিমেন্ট খরচ (বস্তা হিসেবে)
                                </span>
                                <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                  মোট পরিমাণ: {toBengaliDigits(cementTotalBags.toLocaleString('en-IN'))} বস্তা
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-600">লেবার রেট (৳/বস্তা)</Label>
                                  <div className="relative">
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={cementLaborRate || ''}
                                      onChange={e => setCementLaborRate(parseFloat(e.target.value) || 0)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-amber-300 text-xs font-bold text-amber-700 font-bengali pr-20"
                                    />
                                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-500 font-bengali">
                                      = ৳{toBengaliDigits(cementLaborTotal.toLocaleString('en-IN'))}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-600">গাড়ি ভাড়া রেট (৳/বস্তা)</Label>
                                  <div className="relative">
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={cementShippingRate || ''}
                                      onChange={e => setCementShippingRate(parseFloat(e.target.value) || 0)}
                                      placeholder="০.০০"
                                      className="rounded-md h-9 bg-white border-amber-300 text-xs font-bold text-amber-800 font-bengali pr-20"
                                    />
                                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-500 font-bengali">
                                      = ৳{toBengaliDigits(cementShippingTotal.toLocaleString('en-IN'))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 font-bengali">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-600">লেবার খরচ (৳)</Label>
                            <Input 
                              type="number"
                              value={manualLaborCost || ''}
                              onChange={e => setManualLaborCost(parseFloat(e.target.value) || 0)}
                              placeholder="০"
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold text-amber-600 font-bengali"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-600">গাড়ি ভাড়া (৳)</Label>
                            <Input 
                              type="number"
                              value={manualShippingCost || ''}
                              onChange={e => setManualShippingCost(parseFloat(e.target.value) || 0)}
                              placeholder="০"
                              className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* STEP 5: Register Payment */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-4">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5 font-bengali">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৫</span>
                        পেমেন্ট এন্ট্রি বিবরণ
                      </Label>

                      <div className="flex items-center gap-4 text-xs font-bold pt-1 font-bengali">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'now'}
                            onChange={() => setPaymentOption('now')}
                            className="accent-emerald-600"
                          />
                          <span>● এখনই পেমেন্ট জমা নিবেন</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="radio" 
                            name="paymentOption" 
                            checked={paymentOption === 'later'}
                            onChange={() => setPaymentOption('later')}
                            className="accent-emerald-600"
                          />
                          <span>○ পরে পেমেন্ট রেকর্ড করবেন</span>
                        </label>
                      </div>

                      {paymentOption === 'now' && (
                        <div className="space-y-3 pt-1 font-bengali">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                              <div className="space-y-1 sm:col-span-1 min-w-0">
                                <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম</Label>
                                <Select value={invoicePaymentMethod} onValueChange={(val: string | null) => setInvoicePaymentMethod(val || 'Cash')}>
                                  <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali w-full overflow-hidden">
                                    <SelectValue>
                                      {invoicePaymentMethod === 'Cash' ? '💵 নগদ (Cash)' :
                                       invoicePaymentMethod === 'Split' ? '💵+📄 নগদ ও চেক (স্প্লিট)' :
                                       invoicePaymentMethod === 'Cheque' ? '📄 চেক (Cheque)' :
                                       invoicePaymentMethod === 'Bank' ? '🏦 ব্যাংক ট্রান্সফার' :
                                       invoicePaymentMethod === 'BankToBank' ? '🔄 ব্যাংক-টু-ব্যাংক' : '💵 নগদ (Cash)'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold">
                                    <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                                    <SelectItem value="Split">💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)</SelectItem>
                                    <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                                    <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার</SelectItem>
                                    <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {invoicePaymentMethod === 'Split' ? (
                                <>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[11px] font-bold text-slate-700 truncate block">নগদ জমার পরিমাণ (৳)</Label>
                                    <Input 
                                      type="number"
                                      value={cashPaidAmount || ''}
                                      onChange={e => setCashPaidAmount(parseFloat(e.target.value) || 0)}
                                      placeholder="যেমন: ১০,০০০"
                                      className="rounded-md h-10 bg-emerald-50/70 border-emerald-300 text-xs font-black text-emerald-700 font-bengali w-full"
                                    />
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[11px] font-bold text-slate-700 truncate block">চেক জমার পরিমাণ (৳)</Label>
                                    <Input 
                                      type="number"
                                      value={chequePaidAmount || ''}
                                      onChange={e => setChequePaidAmount(parseFloat(e.target.value) || 0)}
                                      placeholder="যেমন: ৭০,০০০"
                                      className="rounded-md h-10 bg-purple-50/70 border-purple-300 text-xs font-black text-purple-700 font-bengali w-full"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-[11px] font-bold text-slate-600">পরিশোধিত জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="number"
                                    value={invoicePaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setInvoicePaidAmount(val);
                                      if (invoicePaymentMethod === 'Cash') setCashPaidAmount(val);
                                      if (invoicePaymentMethod === 'Cheque') setChequePaidAmount(val);
                                    }}
                                    placeholder="০.০০"
                                    className="rounded-md h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600 font-bengali"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Total Paid Display Banner for Split */}
                            {invoicePaymentMethod === 'Split' && (
                              <div className="p-2.5 bg-slate-100/80 rounded-md border border-slate-200 flex items-center justify-between text-xs font-bold font-bengali">
                                <span className="text-slate-600">মোট প্রাপ্তি (নগদ ৳{toBengaliDigits(cashPaidAmount.toLocaleString('en-IN'))} + চেক ৳{toBengaliDigits(chequePaidAmount.toLocaleString('en-IN'))}):</span>
                                <span className="text-sm font-black text-emerald-700">৳{toBengaliDigits((cashPaidAmount + chequePaidAmount).toLocaleString('en-IN'))}</span>
                              </div>
                            )}

                            {/* BANK TRANSFER (SAVED BANK ACCOUNTS SELECTOR) */}
                            {invoicePaymentMethod === 'Bank' && (
                              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-blue-900 flex items-center gap-1">
                                  🏦 সেভ করা দোকান ব্যাংক অ্যাকাউন্ট
                                </p>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-600">গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকান)</Label>
                                  <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                    <SelectTrigger className="h-8 rounded-md bg-white text-xs font-bold border-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="font-bengali text-xs font-bold">
                                      {savedBanks.length > 0 ? (
                                        savedBanks.map(b => (
                                          <SelectItem key={b.id} value={`${b.name} (${b.accNo})`}>
                                            {b.name} {b.accNo ? `- ${b.accNo}` : ''}
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
                                  <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (অপশনাল)</Label>
                                  <Input 
                                    placeholder="Txn ID" 
                                    value={transactionRef} 
                                    onChange={e => setTransactionRef(e.target.value)}
                                    className="h-8 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                              </div>
                            )}

                            {/* BANK TO BANK TRANSFER (RECEIVER SAVED SELECTOR + SENDER CUSTOMER INPUTS) */}
                            {invoicePaymentMethod === 'BankToBank' && (
                              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-md space-y-3 font-bengali text-xs animate-in fade-in-0">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                  🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                                </p>
                                
                                {/* RECEIVER SHOP BANK */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-indigo-950 block">
                                    ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                                  </Label>
                                  <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                    <SelectTrigger className="h-8 rounded-md bg-white text-xs font-bold border-indigo-200">
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
                                        className="h-8 rounded-md bg-white text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                                      <Input 
                                        placeholder="A/C No or Name" 
                                        value={senderAccountNo} 
                                        onChange={e => setSenderAccountNo(e.target.value)}
                                        className="h-8 rounded-md bg-white text-xs font-mono"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                      <Input 
                                        placeholder="Txn ID / Ref No" 
                                        value={senderTxnRef} 
                                        onChange={e => setSenderTxnRef(e.target.value)}
                                        className="h-8 rounded-md bg-white text-xs font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CHEQUE DETAILS (Show when method is Cheque or Split or chequePaidAmount > 0) */}
                            {(invoicePaymentMethod === 'Cheque' || invoicePaymentMethod === 'Split' || chequePaidAmount > 0) && (
                              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0 shadow-2xs">
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
                                      className="h-8 rounded-md bg-white text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেক নম্বর</Label>
                                    <Input 
                                      placeholder="CQ-10023" 
                                      value={chequeNo} 
                                      onChange={e => setChequeNo(e.target.value)} 
                                      className="h-8 rounded-md bg-white text-xs font-mono" 
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-purple-900">চেকের তারিখ</Label>
                                    <BengaliDatePicker 
                                      value={chequeDate} 
                                      onChange={val => setChequeDate(val)} 
                                      placeholder="তারিখ নির্বাচন" 
                                      className="w-full" 
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
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৬</span>
                        কর্মকর্তা ও গোডাউন নির্ধারণ
                      </Label>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">ইনভয়েস প্রস্তুতকারী</Label>
                          <Input 
                            value={preparedBy}
                            onChange={e => setPreparedBy(e.target.value)}
                            placeholder="প্রস্তুতকারীর নাম"
                            className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">অনুমোদনকারী কর্মকর্তা</Label>
                          <Input 
                            value={authorizedBy}
                            onChange={e => setAuthorizedBy(e.target.value)}
                            placeholder="ম্যানেজারের নাম"
                            className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">পণ্য গ্রহণকারী</Label>
                          <Input 
                            value={receivedBy}
                            onChange={e => setReceivedBy(e.target.value)}
                            placeholder="গ্রহীতার নাম"
                            className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-600">গোডাউন / ওয়্যারহাউজ</Label>
                          <Select value={warehouse} onValueChange={(val: string | null) => setWarehouse(val || 'Main')}>
                            <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-bengali text-xs font-bold">
                              <SelectItem value="Main">প্রধান গোডাউন</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* STEP 7: Notes (Optional) */}
                  <Card className="bg-white border-slate-200/80 rounded-md shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 text-[11px] font-black flex items-center justify-center">৭</span>
                        বিশেষ নির্দেশনার নোট (ঐচ্ছিক)
                      </Label>

                      <textarea
                        rows={3}
                        value={invoiceNote}
                        onChange={e => setInvoiceNote(e.target.value)}
                        placeholder="যে কোনো বিশেষ নির্দেশনার নোট লিখুন..."
                        className="w-full rounded-md p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </CardContent>
                  </Card>

                </div>

              </div>

              {/* RIGHT 3 COLUMNS: SUMMARY SIDEBAR CARDS (Light Theme) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* CARD 1: INVOICE SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-4 font-bengali">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">ইনভয়েস সারসংক্ষেপ</h3>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-sm border border-emerald-200 uppercase tracking-widest">
                        ড্রাফট
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between text-slate-500">
                        <span>কাস্টমার / দোকান</span>
                        <span className="font-bold text-slate-900">{selectedCustomer?.name || 'সাধারণ ক্রেতা'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>মোবাইল নম্বর</span>
                        <span className="font-bold text-slate-800">{selectedCustomer?.phone ? toBengaliDigits(selectedCustomer.phone) : '—'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>ঠিকানা</span>
                        <span className="font-bold text-slate-800 text-right max-w-[120px] truncate">{selectedCustomer?.address || 'ঠিকানা দেওয়া হয়নি'}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                        <span>ইনভয়েস নম্বর</span>
                        <span className="font-bold text-slate-800">স্বয়ংক্রিয় (অটো)</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>ইনভয়েস তারিখ</span>
                        <span className="font-bold text-slate-800">{invoiceDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>চালানের ধরণ</span>
                        <span className="font-bold text-slate-800">বিক্রয়</span>
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্যের মোট মূল্য</span>
                          <span className="font-bold text-slate-900">৳ {toBengaliDigits(cartSubtotal.toLocaleString('en-IN'))}</span>
                        </div>

                        {cartTotalDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>মোট ছাড়</span>
                            <span className="font-bold">- ৳ {toBengaliDigits(cartTotalDiscount.toLocaleString('en-IN'))}</span>
                          </div>
                        )}

                        {shippingCost > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>গাড়ি ভাড়া</span>
                            <span className="font-bold">+ ৳ {toBengaliDigits(shippingCost.toLocaleString('en-IN'))}</span>
                          </div>
                        )}

                        {laborCost > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>লেবার খরচ</span>
                            <span className="font-bold">+ ৳ {toBengaliDigits(laborCost.toLocaleString('en-IN'))}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-700 font-bold pt-1">
                          <span>সর্বমোট ইনভয়েস বিল</span>
                          <span className="font-black text-slate-900">৳ {toBengaliDigits(cartTotalAmount.toLocaleString('en-IN'))}</span>
                        </div>

                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>পূর্বের বকেয়া</span>
                          <span className="font-black">৳ {toBengaliDigits(selectedCustomerDue.toLocaleString('en-IN'))}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">সর্বমোট প্রদেয় বিল (বকেয়াসহ)</span>
                          <span className="text-[10px] text-slate-400 font-bold">চালান + পূর্বের বকেয়া</span>
                        </div>
                        <span className="text-2xl font-black text-orange-600">৳ {toBengaliDigits((cartTotalAmount + selectedCustomerDue).toLocaleString('en-IN'))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 2: PAYMENT SUMMARY */}
                <Card className="bg-white border-slate-200/80 rounded-md shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-3 font-bengali">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">পেমেন্ট সারসংক্ষেপ</h3>
                      </div>
                    </div>

                    <div className="text-center py-2 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block">
                        {invoicePaidAmount > 0 ? `জমা: ৳ ${toBengaliDigits(invoicePaidAmount.toLocaleString('en-IN'))}` : 'কোনো পেমেন্ট দেওয়া হয়নি'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-600">সর্বশেষ অবশিষ্ট বকেয়া</span>
                      <span className="text-lg font-black text-rose-600">৳ {toBengaliDigits(cartDueAmount.toLocaleString('en-IN'))}</span>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
          <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>সংরক্ষণের পূর্বে সব তথ্য পুনরায় পরীক্ষা করে নিন।</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => { setIsCreateInvoiceOpen(false); resetCreateForm(); }}
                className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                বাতিল করুন
              </Button>
              <Button 
                type="submit" 
                onClick={handleCreateInvoiceSubmit}
                className="rounded-md h-11 px-6 font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                চালান সম্পূর্ণ করুন ✓
              </Button>
            </div>
          </div>
          </form>
        </div>
      </div>
      )}

 

      {/* GATE PASS / DELIVERY CHALAN MODAL */}
      <Dialog open={isGatePassOpen} onOpenChange={setIsGatePassOpen}>
        <DialogContent className="max-w-2xl rounded-md p-6 bg-white font-bengali">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>মেসার্স রড & সিমেন্ট স্টোর</span>
                </DialogTitle>
                <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase mt-0.5">ডেলিভারি চালান / গেট পাস (Delivery Chalan & Gate Pass)</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-sm">#{(selectedInvoice as any)?.id?.toUpperCase() || ''}</span>
            </div>
          </DialogHeader>

          {(() => {
            const currentInvoice = selectedInvoice as Invoice | null;
            if (!currentInvoice) return null;
            return (
              <div id="gate-pass-printable-wrapper" className="space-y-4 py-3 text-xs">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">কাস্টমার / দোকান</span>
                    <span className="font-black text-slate-900 text-sm">{currentInvoice.customerName}</span>
                    <span className="block text-slate-500">{currentInvoice.customerPhone}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">ডেলিভারি সাইটের ঠিকানা</span>
                    <span className="font-bold text-slate-800">{currentInvoice.deliveryAddress || currentInvoice.customerAddress || 'প্রধান ঠিকানা'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">গাড়ি / ট্রাক নম্বর</span>
                    <span className="font-black text-emerald-600">{currentInvoice.vehicleNo || 'তথ্য দেওয়া হয়নি'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 text-[11px] block">ড্রাইভারের নাম ও মোবাইল</span>
                    <span className="font-bold text-slate-800">{currentInvoice.driverName || '—'} {currentInvoice.driverPhone ? `(${currentInvoice.driverPhone})` : ''}</span>
                  </div>
                </div>

                {/* Items Table for Gate Pass */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
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
                      {currentInvoice.items?.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-100">
                          <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-black text-slate-800 text-sm">{item.name}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600 text-base">{item.quantity}</TableCell>
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
            );
          })()}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsGatePassOpen(false)} className="rounded-md font-bold">
              বন্ধ করুন
            </Button>
            <Button onClick={() => printElement('gate-pass-printable-wrapper')} className="rounded-md font-bold bg-slate-900 text-white hover:bg-slate-800">
              🖨️ গেট পাস প্রিন্ট করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE INVOICE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-md p-6 bg-white font-bengali">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
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
              className="rounded-md font-bold flex-1"
              disabled={isDeleting}
            >
              বাতিল
            </Button>
            <Button 
              onClick={handleDeleteInvoiceConfirm} 
              disabled={isDeleting}
              className="rounded-md font-black bg-rose-600 hover:bg-rose-700 text-white flex-1 shadow-md shadow-rose-600/20"
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
