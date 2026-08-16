'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { 
  Plus, Search, Edit, Edit2, Trash2, Phone, Building2, DollarSign,
  Receipt, Banknote, Calendar, Lightbulb, AlertCircle, X,
  Truck, Eye, Calculator, CheckCircle2, Package, Filter,
  ChevronUp, ChevronDown, RotateCcw, ArrowLeft, Printer, ArrowUpDown
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
import { PurchaseInvoiceMemo } from '@/components/PurchaseInvoiceMemo';
import { PurchaseInvoiceDetailsView } from '@/components/PurchaseInvoiceDetailsView';
import { BengaliDateRangePicker } from '@/components/ui/BengaliDateRangePicker';
import { BengaliDatePicker } from '@/components/ui/BengaliDatePicker';
import { printElement } from '@/lib/printUtils';
import { parseProductDetails } from '@/lib/bengaliUtils';

const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBengaliDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  return String(num).replace(/[0-9]/g, (digit) => bengaliNumerals[parseInt(digit, 10)]);
};

export interface PurchaseItem {
  id?: string;
  name: string;
  category?: string;
  brand?: string;
  mmSize?: string;
  unit: string;
  price: number;
  sellPrice?: number;
  quantity: number;
  discount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  businessName?: string;
  supplyType?: string;
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
  purchaseType?: 'rod' | 'cement';
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minBill, setMinBill] = useState('');
  const [maxBill, setMaxBill] = useState('');

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setFilterStatus('সব');
    setMinBill('');
    setMaxBill('');
  };
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoice | null>(null);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState<boolean>(false);

  // Form & Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'rod' | 'cement'>('rod');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
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
  const [itemAlertLimit, setItemAlertLimit] = useState<number>(0);
  const [itemUnit, setItemUnit] = useState<string>('কেজি');

  const handleAddLineItem = async () => {
    const nameToUse = selectedCascadingProduct?.name || (selectedProductId ? products.find(p => p.id === selectedProductId)?.name : '');
    if (!nameToUse) {
      toast.error('পণ্যের নাম প্রদান করুন');
      return;
    }

    const unitToUse = selectedCascadingProduct?.unit || itemUnit || 'পিস';
    const prodId = selectedCascadingProduct ? (selectedCascadingProduct.productId || `temp_${Date.now()}`) : (selectedProductId || `temp_${Date.now()}`);

    const newItem: PurchaseItem = {
      id: prodId,
      name: nameToUse,
      category: selectedCascadingProduct?.category,
      brand: selectedCascadingProduct?.brand,
      mmSize: selectedCascadingProduct?.mmSize,
      unit: unitToUse,
      price: itemPrice,
      sellPrice: itemSellPrice > 0 ? itemSellPrice : undefined,
      quantity: itemQty
    };

    setCart(prev => [...prev, newItem]);
    toast.success(`"${nameToUse}" ক্রয় কার্টে যুক্ত করা হয়েছে`);

    setItemQty(1);
    setItemPrice(0);
    setItemSellPrice(0);
  };

  const handleAddCategoryProductToCart = handleAddLineItem;
  
  // Category-Specific Purchase Defaults (Rod & Cement isolated from Sales)
  const handleSaveDefaultCharges = () => {
    if (typeof window === 'undefined') return;
    const key = `dokan_purchase_defaults_${purchaseType}`;
    const payload = {
      laborCost: Number(laborCost || 0),
      shippingCost: Number(shippingCost || 0)
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      const catLabel = purchaseType === 'rod' ? 'রড ও রিং' : 'সিমেন্ট';
      toast.success(`${catLabel} ক্রয়ের জন্য ডিফল্ট লেবার (৳${laborCost}) ও গাড়ি ভাড়া (৳${shippingCost}) সফলভাবে সেভ করা হয়েছে!`);
    } catch {
      toast.error('ডিফল্ট চার্জ সেভ করতে সমস্যা হয়েছে');
    }
  };

  // Billing & Payment Extension States
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFlat, setDiscountFlat] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [shippingPaymentStatus, setShippingPaymentStatus] = useState<'pending' | 'paid' | 'partial' | 'overpaid'>('pending');
  const [laborPaymentStatus, setLaborPaymentStatus] = useState<'pending' | 'paid' | 'partial' | 'overpaid'>('pending');
  const [previousShippingPaidAmount, setPreviousShippingPaidAmount] = useState<number>(0);
  const [previousLaborPaidAmount, setPreviousLaborPaidAmount] = useState<number>(0);
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
      setPurchases(purchaseList.map(p => {
        let meta: any = {};
        let userNote = p.notes || '';
        if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
          try {
            const firstLine = userNote.split('\n')[0];
            meta = JSON.parse(firstLine);
            userNote = userNote.substring(firstLine.length).trim();
          } catch {}
        }
        let detectedType: 'rod' | 'cement' = meta.purchaseType || 'rod';
        if (!meta.purchaseType) {
          const isCement = (p.items || []).some((it: any) => {
            const n = (it.product_name || '').toLowerCase();
            return n.includes('সিমেন্ট') || n.includes('cement') || it.unit === 'বস্তা' || it.unit === 'ব্যাগ';
          });
          if (isCement) detectedType = 'cement';
        }
        const pAny = p as any;
        return {
          id: String(p.id),
          purchaseId: p.invoice_no,
          purchaseType: detectedType,
          supplierName: p.party_name || meta.supplierName || 'সরবরাহকারী',
          supplierPhone: p.party_phone || meta.supplierPhone || '',
          supplierAddress: pAny.party_address || meta.supplierAddress || '',
          supplierId: String(p.party || ''),
          items: (p.items || []).map((i: any) => ({
            name: i.product_name,
            price: i.price,
            quantity: i.quantity,
            unit: i.unit || 'পিস',
            discount: i.discount || 0
          })),
          subtotal: p.subtotal || meta.subtotal,
          discount: p.discount !== undefined ? p.discount : (meta.discount || 0),
          shippingCost: pAny.shipping_cost !== undefined ? pAny.shipping_cost : (meta.shippingCost || 0),
          laborCost: pAny.labor_cost !== undefined ? pAny.labor_cost : (meta.laborCost || 0),
          transportCost: meta.transportCost || meta.shippingCost || pAny.shipping_cost || 0,
          totalAmount: p.total_amount,
          paidAmount: p.paid_amount,
          dueAmount: p.due_amount,
          paymentStatus: p.due_amount <= 0 ? 'পরিশোধিত' : (p.paid_amount || 0) > 0 ? 'আংশিক' : 'বকেয়া আছে',
          createdAt: p.created_at,
          vehicleNo: pAny.vehicle_no || meta.vehicleNo || '',
          driverName: pAny.driver_name || meta.driverName || '',
          driverPhone: pAny.driver_phone || meta.driverPhone || '',
          deliveryAddress: pAny.delivery_address || meta.deliveryAddress || '',
          preparedBy: meta.preparedBy || '',
          authorizedBy: meta.authorizedBy || '',
          receivedBy: meta.receivedBy || '',
          warehouse: meta.warehouse || '',
          previousSupplierDue: meta.previousSupplierDue || 0,
          paymentMethod: meta.paymentMethodName || p.payment_method || 'Cash',
          chequeNo: meta.chequeNo || '',
          chequeDate: meta.chequeDate || '',
          note: userNote || meta.userNote || ''
        };
      }));

      const partyList = await api.parties.list({ party_type: 'supplier' });
      setSuppliers(partyList.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        address: p.address || '',
        businessName: p.business_name || '',
        supplyType: p.supply_type || '',
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

      const bankList = await api.banks.list();
      setSavedBanks(bankList.map(b => ({
        id: String(b.id),
        name: b.name || b.bank_name || 'ব্যাংক',
        accNo: b.account_number || ''
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

  // Filtered suppliers based on selected Purchase Type (Rod vs Cement)
  const filteredSuppliersByPurchaseType = useMemo(() => {
    if (!purchaseType) return suppliers;

    const rodKeywords = ['rod', 'রড', 'bsrm', 'ksrm', 'aks', 'gph', 'baizid', 'anwar', 'metrocem', 'rsrm', 'ispat', 'steel', 'ইস্পাত', 'স্টীল'];
    const cementKeywords = ['cement', 'সিমেন্ট', 'shah', 'শাহ', 'seven rings', 'সেভেন রিংস', 'bashundhara', 'বসুন্ধরা', 'fresh', 'ফ্রেশ', 'crown', 'ক্রাউন', 'premier', 'প্রিমিয়ার', 'holcim', 'হোলসিম', 'akij', 'আকিজ'];

    return suppliers.filter(s => {
      const sType = (s.supplyType || '').toLowerCase();
      const bName = (s.businessName || '').toLowerCase();
      const sName = (s.name || '').toLowerCase();
      const fullText = `${sType} ${bName} ${sName}`;

      if (purchaseType === 'rod') {
        const isExplicitCementOnly = (sType === 'cement' || sType === 'সিমেন্ট' || cementKeywords.some(k => fullText.includes(k))) && 
                                    !rodKeywords.some(k => fullText.includes(k)) && 
                                    sType !== 'both' && sType !== 'উভয়' && sType !== 'উভয়';
        if (isExplicitCementOnly) return false;
        return true;
      }

      if (purchaseType === 'cement') {
        const isExplicitRodOnly = (sType === 'rod' || sType === 'রড' || rodKeywords.some(k => fullText.includes(k))) && 
                                  !cementKeywords.some(k => fullText.includes(k)) && 
                                  sType !== 'both' && sType !== 'উভয়' && sType !== 'উভয়';
        if (isExplicitRodOnly) return false;
        return true;
      }

      return true;
    });
  }, [suppliers, purchaseType]);

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

  // Auto-load category-specific purchase defaults when purchaseType changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `dokan_purchase_defaults_${purchaseType}`;
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLaborCost(Number(parsed.laborCost || 0));
          setShippingCost(Number(parsed.shippingCost || 0));
        } else {
          setLaborCost(0);
          setShippingCost(0);
        }
      } catch {
        setLaborCost(0);
        setShippingCost(0);
      }
    });
  }, [purchaseType]);

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

    if (typeof window !== 'undefined') {
      try {
        const key = `dokan_purchase_defaults_${purchaseType}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLaborCost(Number(parsed.laborCost || 0));
          setShippingCost(Number(parsed.shippingCost || 0));
        } else {
          setLaborCost(0);
          setShippingCost(0);
        }
      } catch {
        setLaborCost(0);
        setShippingCost(0);
      }
    }

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
    setEditingPurchaseId(null);
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
    setCart(prev => prev.map((i, idx) => {
      if (index !== undefined && idx === index) return { ...i, quantity: newQty };
      if (String(i.id) === String(id)) return { ...i, quantity: newQty };
      return i;
    }));
  };

  const handleUpdateCartPrice = (id: string | number, newPrice: number, index?: number) => {
    if (newPrice < 0) return;
    setCart(prev => prev.map((i, idx) => {
      if (index !== undefined && idx === index) return { ...i, price: newPrice };
      if (String(i.id) === String(id)) return { ...i, price: newPrice };
      return i;
    }));
  };

  const handleUpdateCartTotal = (id: string | number, newTotal: number, index?: number) => {
    if (newTotal < 0) return;
    setCart(prev => prev.map((i, idx) => {
      const isMatch = (index !== undefined && idx === index) || String(i.id) === String(id);
      if (!isMatch) return i;
      const qty = Number(i.quantity) || 1;
      const unitPrice = qty > 0 ? Math.round((newTotal / qty) * 100) / 100 : 0;
      return { ...i, price: unitPrice };
    }));
  };

  // Submit Purchase Invoice
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('অন্তত একটি পণ্য নির্বাচন করুন');
      return;
    }
    if (!selectedSupplier && (!isNewSupplier || (!newSupplierData.name.trim() && !newSupplierData.businessName.trim()))) {
      toast.error('কোম্পানি / সরবরাহকারী নির্বাচন করুন');
      return;
    }

    try {
      let finalSuppId = selectedSupplier?.id;
      if (isNewSupplier && (newSupplierData.name.trim() || newSupplierData.businessName.trim())) {
        const suppName = newSupplierData.name.trim() || newSupplierData.businessName.trim();
        const createdParty = await api.parties.create({
          party_type: 'supplier',
          supply_type: purchaseType === 'rod' ? 'রড' : 'সিমেন্ট',
          name: suppName,
          business_name: suppName,
          phone: newSupplierData.phone.trim(),
          address: newSupplierData.address.trim()
        });
        finalSuppId = String(createdParty.id);
      }

      const pmLower = (paymentMethod || 'cash').toLowerCase();
      let effectivePaymentMethod = 'cash';
      if (pmLower.includes('split')) effectivePaymentMethod = 'split';
      else if (pmLower.includes('bank')) effectivePaymentMethod = 'bank';
      else if (pmLower.includes('cheque') || pmLower.includes('check')) effectivePaymentMethod = 'cheque';
      else if (pmLower.includes('mobile') || pmLower.includes('bkash') || pmLower.includes('nagad')) effectivePaymentMethod = 'mobile_banking';

      const goodsTotal = Math.max(0, cartSubtotal - computedDiscount);
      const supplierDueAmount = paymentOption === 'now' ? Math.max(0, goodsTotal - paidAmount) : goodsTotal;

      const finalShipCost = Number(shippingCost || 0);
      const finalLabCost = Number(laborCost || 0);

      // Determine accurate shipping payment tracking on edit/create
      let finalShippingPaid = 0;
      let finalShippingStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
      if (editingPurchaseId) {
        finalShippingPaid = previousShippingPaidAmount;
        if (finalShippingPaid >= finalShipCost) {
          if (finalShippingPaid > finalShipCost) {
            finalShippingStatus = 'overpaid';
          } else {
            finalShippingStatus = finalShipCost > 0 ? 'paid' : 'pending';
          }
        } else {
          finalShippingStatus = finalShippingPaid > 0 ? 'partial' : 'pending';
        }
      } else {
        finalShippingPaid = shippingPaymentStatus === 'paid' ? finalShipCost : 0;
        finalShippingStatus = shippingPaymentStatus;
      }

      // Determine accurate labor payment tracking on edit/create
      let finalLaborPaid = 0;
      let finalLaborStatus: 'pending' | 'paid' | 'partial' | 'overpaid' = 'pending';
      if (editingPurchaseId) {
        finalLaborPaid = previousLaborPaidAmount;
        if (finalLaborPaid >= finalLabCost) {
          if (finalLaborPaid > finalLabCost) {
            finalLaborStatus = 'overpaid';
          } else {
            finalLaborStatus = finalLabCost > 0 ? 'paid' : 'pending';
          }
        } else {
          finalLaborStatus = finalLaborPaid > 0 ? 'partial' : 'pending';
        }
      } else {
        finalLaborPaid = laborPaymentStatus === 'paid' ? finalLabCost : 0;
        finalLaborStatus = laborPaymentStatus;
      }

      const purchaseMeta = {
        purchaseType: purchaseType || 'rod',
        paymentMethodName: paymentMethod,
        bankName: bankName || supplierBankName || selectedShopBank || '',
        accountNo: accountNo || supplierAccountNo || '',
        transactionRef: transactionRef || supplierTxnRef || '',
        selectedShopBank: selectedShopBank || '',
        supplierBankName: supplierBankName || '',
        supplierAccountNo: supplierAccountNo || '',
        supplierTxnRef: supplierTxnRef || '',
        chequeNo: chequeNo || '',
        chequeDate: chequeDate || '',
        vehicleNo: vehicleNo || '',
        driverName: driverName || '',
        driverPhone: driverPhone || '',
        deliveryAddress: deliveryAddress || '',
        preparedBy: preparedBy || '',
        authorizedBy: authorizedBy || '',
        receivedBy: receivedBy || '',
        warehouse: warehouse || '',
        shippingCost: finalShipCost,
        laborCost: finalLabCost,
        shippingStatus: finalShippingStatus,
        laborStatus: finalLaborStatus,
        shippingPaidAmount: finalShippingPaid,
        laborPaidAmount: finalLaborPaid,
        supplierDue: Math.round((Number(supplierDueAmount) || 0) * 100) / 100,
        discount: computedDiscount || 0,
        discountType: discountType,
        discountPercent: discountPercent,
        discountFlat: discountFlat,
        previousSupplierDue: selectedSupplierDue || 0,
        userNote: purchaseNote || ''
      };

      const finalNotesPayload = JSON.stringify(purchaseMeta) + (purchaseNote ? `\n${purchaseNote}` : '');

      const round2 = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

      const itemsPayload = cart.map(i => {
        const prodId = Number(i.id);
        return {
          product: !isNaN(prodId) && prodId > 0 ? prodId : undefined,
          product_name: i.name,
          quantity: i.quantity,
          price: Math.round((Number(i.price) || 0) * 100) / 100,
          sell_price: i.sellPrice && i.sellPrice > 0 ? Math.round(Number(i.sellPrice) * 100) / 100 : undefined,
          unit: i.unit,
          total: Math.round((Number(i.price) || 0) * Number(i.quantity || 0) * 100) / 100
        };
      });

      if (editingPurchaseId) {
        await api.transactions.update(editingPurchaseId, {
          party: finalSuppId ? Number(finalSuppId) : null,
          transaction_type: 'purchase',
          total_amount: round2(cartTotalAmount),
          paid_amount: round2(paidAmount),
          due_amount: round2(supplierDueAmount),
          payment_method: effectivePaymentMethod,
          items: itemsPayload,
          notes: finalNotesPayload
        });
        toast.success('ক্রয় ইনভয়েস সফলভাবে আপডেট করা হয়েছে!');
      } else {
        await api.transactions.create({
          party: finalSuppId ? Number(finalSuppId) : null,
          transaction_type: 'purchase',
          total_amount: round2(cartTotalAmount),
          paid_amount: round2(paidAmount),
          due_amount: round2(supplierDueAmount),
          payment_method: effectivePaymentMethod,
          items: itemsPayload,
          notes: finalNotesPayload
        });
        toast.success('ক্রয় ইনভয়েস সফলভাবে সংরক্ষিত হয়েছে!');
      }

      setIsCreateOpen(false);
      resetForm();
      loadPurchasesData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'ক্রয় ইনভয়েস সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const handleEditPurchase = (p: PurchaseInvoice) => {
    const pAny = p as any;
    setEditingPurchaseId(p.id);

    // Accurately determine purchaseType (cement vs rod)
    let pType: 'rod' | 'cement' = p.purchaseType || pAny.purchase_type || 'rod';
    if (!p.purchaseType && !pAny.purchase_type) {
      const isCement = (p.items || []).some((it: any) => {
        const n = (it.name || it.product_name || '').toLowerCase();
        return n.includes('সিমেন্ট') || n.includes('cement') || it.unit === 'বস্তা' || it.unit === 'ব্যাগ';
      });
      if (isCement) {
        pType = 'cement';
      } else {
        const supp = suppliers.find(s => s.id === p.supplierId);
        if (supp?.supplyType === 'সিমেন্ট') pType = 'cement';
      }
    }
    setPurchaseType(pType);

    setSelectedSupplier({ 
      id: p.supplierId || '', 
      name: p.supplierName || 'সরবরাহকারী', 
      businessName: p.supplierName,
      supplyType: pType === 'cement' ? 'সিমেন্ট' : 'রড'
    });
    setCart((p.items || []).map((i: any, idx: number) => ({
      id: String(i.product || i.id || `item_${idx}_${Date.now()}`),
      name: i.name || i.product_name,
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 0),
      unit: i.unit || 'পিস',
      discount: Number(i.discount || 0)
    })));
    let meta: any = {};
    if (pAny.notes && typeof pAny.notes === 'string' && pAny.notes.trim().startsWith('{')) {
      try {
        const firstLine = pAny.notes.split('\n')[0];
        meta = JSON.parse(firstLine);
      } catch {}
    }

    const shipPaid = meta.shippingPaidAmount !== undefined 
      ? Number(meta.shippingPaidAmount) 
      : (meta.shippingStatus === 'paid' ? Number(p.shippingCost || pAny.shipping_cost || 0) : 0);
    const labPaid = meta.laborPaidAmount !== undefined 
      ? Number(meta.laborPaidAmount) 
      : (meta.laborStatus === 'paid' ? Number(p.laborCost || pAny.labor_cost || 0) : 0);

    setPreviousShippingPaidAmount(shipPaid);
    setPreviousLaborPaidAmount(labPaid);
    setShippingPaymentStatus(meta.shippingStatus || (shipPaid > 0 ? 'paid' : 'pending'));
    setLaborPaymentStatus(meta.laborStatus || (labPaid > 0 ? 'paid' : 'pending'));

    setDiscountType('flat');
    setDiscountFlat(p.discount || 0);
    setShippingCost(p.shippingCost || pAny.shipping_cost || 0);
    setLaborCost(p.laborCost || pAny.labor_cost || 0);
    setVehicleNo(p.vehicleNo || pAny.vehicle_no || '');
    setDriverName(p.driverName || pAny.driver_name || '');
    setDriverPhone(p.driverPhone || pAny.driver_phone || '');
    setDeliveryAddress(p.deliveryAddress || pAny.delivery_address || '');
    setPreparedBy(pAny.preparedBy || pAny.operatorName || '');
    setAuthorizedBy(pAny.authorizedBy || '');
    setReceivedBy(pAny.receivedBy || '');
    setWarehouse(pAny.warehouse || 'Main');
    setPaymentOption(p.paidAmount > 0 ? 'now' : 'later');
    setPaidAmount(p.paidAmount || 0);
    setPaymentMethod(pAny.paymentMethod || pAny.payment_method || 'Cash');

    setIsCreateOpen(true);
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
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      p.supplierName.toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower) ||
      (p.supplierPhone && p.supplierPhone.includes(search)) ||
      (p.purchaseId && p.purchaseId.toLowerCase().includes(searchLower));

    let matchesDate = true;
    if (startDate || endDate) {
      const pDateStr = p.createdAt ? new Date(p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt).toISOString().split('T')[0] : '';
      if (startDate && pDateStr < startDate) matchesDate = false;
      if (endDate && pDateStr > endDate) matchesDate = false;
    }

    let matchesStatus = true;
    if (filterStatus === 'পরিশোধিত') {
      matchesStatus = p.paymentStatus === 'পরিশোধিত' || p.dueAmount === 0;
    } else if (filterStatus === 'বকেয়া আছে' || filterStatus === 'বাকি') {
      matchesStatus = p.dueAmount > 0;
    }

    let matchesAmount = true;
    const bill = p.totalAmount || 0;
    if (minBill && bill < parseFloat(minBill)) matchesAmount = false;
    if (maxBill && bill > parseFloat(maxBill)) matchesAmount = false;

    return Boolean(matchesSearch) && matchesDate && matchesStatus && matchesAmount;
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
      {selectedPurchase ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <PurchaseInvoiceDetailsView
            invoice={selectedPurchase}
            onBack={() => setSelectedPurchase(null)}
            onPrint={() => printElement('printable-memo-wrapper')}
            onDelete={(p) => handleDeletePurchase(p)}
          />

          {/* Hidden Print Container for iframe printing */}
          <div className="hidden print:block">
            <PurchaseInvoiceMemo
              invoice={selectedPurchase as any}
              type="purchase"
              showPrintButton={false}
            />
          </div>
        </div>
      ) : !isCreateOpen ? (
        <div className="space-y-6 font-bengali pb-10">
          
          {/* HEADER TOOLBAR MATCHING SALES INVOICES PAGE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-7 h-7 text-indigo-600" /> ক্রয় ইনভয়েস তালিকা
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">রড ও সিমেন্ট ক্রয়ের হিসাব, চালান ও সরবরাহকারীর পাওনা ব্যবস্থাপনা</p>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setIsTypeModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 rounded-md font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" /> + নতুন ক্রয় ইনভয়েস
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS MATCHING SALES INVOICES PAGE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'মোট ইনভয়েস ক্রয়', value: `৳ ${toBengaliDigits(totalPurchaseAmount.toLocaleString('en-IN'))}`, icon: Receipt, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
              { label: 'মোট ক্যাশ পরিশোধ', value: `৳ ${toBengaliDigits(totalPaidAmount.toLocaleString('en-IN'))}`, icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'মোট বকেয়া চালান', value: `৳ ${toBengaliDigits(totalDueAmount.toLocaleString('en-IN'))}`, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
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

          {/* COMPACT & EFFICIENT FILTER CARD MATCHING SALES INVOICES PAGE */}
          <Card className="border border-slate-200/80 shadow-xs rounded-md bg-white p-4 font-bengali space-y-3">
            {/* Top Row: Search + Date Range + Status Quick Pills + More Filter Toggle */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Unified Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ইনভয়েস নং, কোম্পানির নাম বা নম্বর..."
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
                  { id: 'সব', label: 'সব' },
                  { id: 'পরিশোধিত', label: 'পরিশোধিত' },
                  { id: 'বকেয়া আছে', label: 'বকেয়া' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterStatus(p.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap",
                      filterStatus === p.id
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

                {(search || startDate || endDate || filterStatus !== 'সব' || minBill || maxBill) && (
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
                {/* Bill Amount Range */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600">মোট বিল রেঞ্জ (৳)</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="সর্বনিম্ন (৳)"
                      value={minBill}
                      onChange={e => setMinBill(e.target.value)}
                      className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    />
                    <span className="text-slate-300 text-xs">-</span>
                    <Input
                      placeholder="সর্বোচ্চ (৳)"
                      value={maxBill}
                      onChange={e => setMaxBill(e.target.value)}
                      className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* PURCHASES DATA TABLE CARD MATCHING SALES INVOICES TABLE */}
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
                    <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4">কোম্পানি / সরবরাহকারী</TableHead>
                    <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                        <span>মোট বিল (৳)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                        <span>পরিশোধিত (৳)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-bengali text-slate-600 text-xs font-bold py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer select-none">
                        <span>কোম্পানির পাওনা (৳)</span>
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
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Receipt className="w-12 h-12 mb-3 opacity-20" />
                          <p className="font-bengali font-bold text-lg">কোনো ক্রয় ইনভয়েস পাওয়া যায়নি</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.map((p) => {
                    const invNo = p.purchaseId || p.id ? (p.id.startsWith('PUR') ? p.id : `PUR-${p.id.slice(-6).toUpperCase()}`) : 'PUR-000101';
                    return (
                      <TableRow 
                        key={p.id} 
                        onClick={() => setSelectedPurchase(p)}
                        className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors text-xs font-medium"
                      >
                        <TableCell className="text-center py-3.5 px-3">
                          <input type="checkbox" onClick={e => e.stopPropagation()} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 text-xs">{toBengaliDigits(invNo)}</div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-slate-600 font-medium">
                          {formatDate(p.createdAt)}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <div>
                            <p className="font-black text-slate-900 text-xs">{p.supplierName}</p>
                            {p.supplierPhone && <p className="text-[10px] text-slate-400 font-mono">{toBengaliDigits(p.supplierPhone)}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          ৳ {toBengaliDigits((p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                          ৳ {toBengaliDigits((p.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right font-mono font-black text-rose-600">
                          ৳ {toBengaliDigits((p.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-block border",
                            p.paymentStatus === 'পরিশোধিত' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            p.paymentStatus === 'আংশিক' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          )}>
                            {p.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            সম্পন্ন
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => setSelectedPurchase(p)} 
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="ইনভয়েস বিবরণী ও মেমো দেখুন"
                            >
                              <Eye className="w-4 h-4 text-indigo-600" />
                            </button>
                            <button 
                              onClick={() => handleEditPurchase(p)} 
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit className="w-4 h-4 text-amber-600" />
                            </button>
                            <button 
                              onClick={() => handleDeletePurchase(p)} 
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* CREATE / EDIT PURCHASE INVOICE IN-PAGE VIEW (Direct Page View, Framed Container) */
        <div className="space-y-4 animate-in fade-in duration-300 font-bengali">
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)]">
            
            {/* FRAME TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsCreateOpen(false); resetForm(); }}
                  className="w-9 h-9 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold shadow-xs flex-shrink-0 transition-colors"
                  title="তালিকায় ফিরে যান"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-md border flex items-center gap-1",
                      purchaseType === 'rod' ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {purchaseType === 'rod' ? '🏗️ রড ইনভয়েস (ROD)' : '🧱 সিমেন্ট ইনভয়েস (CEMENT)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newType = purchaseType === 'rod' ? 'cement' : 'rod';
                        setPurchaseType(newType);
                        setSelectedSupplier(null);
                        toast.info(`ইনভয়েস টাইপ "${newType === 'rod' ? 'রড' : 'সিমেন্ট'}" এ পরিবর্তন করা হয়েছে`);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      (টাইপ পরিবর্তন করুন)
                    </button>
                  </div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    {editingPurchaseId ? 'ক্রয় ইনভয়েস সম্পাদনা' : `নতুন ${purchaseType === 'rod' ? 'রড' : 'সিমেন্ট'} ক্রয় ইনভয়েস এন্ট্রি`}
                  </h1>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsCreateOpen(false); resetForm(); }}
                className="h-9 w-9 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </Button>
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
                        <Label className="text-xs font-bold text-slate-600">
                          Company / Supplier ({purchaseType === 'rod' ? 'রড সরবরাহকারী' : 'সিমেন্ট সরবরাহকারী'}) <span className="text-rose-500">*</span>
                        </Label>
                        {!isNewSupplier ? (
                          <SupplierSearchSelect
                            suppliers={filteredSuppliersByPurchaseType}
                            selectedSupplier={selectedSupplier}
                            onSelectSupplier={(supp) => setSelectedSupplier(supp)}
                            onAddNewClick={() => setIsNewSupplier(true)}
                            placeholder={purchaseType === 'rod' ? "রড সরবরাহকারী কোম্পানি খুঁজুন..." : "সিমেন্ট সরবরাহকারী কোম্পানি খুঁজুন..."}
                          />
                        ) : (
                          <div className="space-y-2">
                            <Input
                              required
                              placeholder="কোম্পানি / সরবরাহকারীর নাম"
                              value={newSupplierData.name || newSupplierData.businessName}
                              onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value, businessName: e.target.value })}
                              className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold"
                            />
                            <Input
                              placeholder="মোবাইল নম্বর (১১ ডিজিট)"
                              value={newSupplierData.phone}
                              maxLength={11}
                              onChange={e => setNewSupplierData({ ...newSupplierData, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 11) })}
                              className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold font-mono"
                            />
                          </div>
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
                        <Label className="text-xs font-bold text-slate-700">ক্রয়ের তারিখ <span className="text-rose-500">*</span></Label>
                        <BengaliDatePicker
                          value={purchaseDate || format(new Date(), 'yyyy-MM-dd')}
                          onChange={val => setPurchaseDate(val)}
                          placeholder="ক্রয়ের তারিখ"
                          className="w-full"
                        />
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
                      purchaseType={purchaseType}
                      onProductChange={(selected) => {
                        setSelectedCascadingProduct(selected);
                        setSelectedProductId(selected?.productId || '');
                      }}
                      showPriceField={true}
                      showTotalPriceField={true}
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
                            <TableHead className="font-black">পণ্যের নাম</TableHead>
                            <TableHead className="text-center font-black">ব্র্যান্ড</TableHead>
                            <TableHead className="text-center font-black">সাইজ</TableHead>
                            <TableHead className="text-center font-black">পরিমাণ</TableHead>
                            <TableHead className="text-right font-black">মোট ক্রয় মূল্য (৳)</TableHead>
                            <TableHead className="w-10 text-center font-black">🗑️</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400 font-semibold">
                                কার্ট খালি। উপর থেকে পণ্য নির্বাচন করে যোগ করুন।
                              </TableCell>
                            </TableRow>
                          ) : cart.map((item, idx) => {
                            const parsed = parseProductDetails(item);
                            const lineTotal = Math.round(item.price * item.quantity * 100) / 100;
                            return (
                              <TableRow key={item.id ? `${item.id}-${idx}` : `${item.name}-${idx}`} className="text-xs border-b border-slate-100">
                                <TableCell className="text-center font-bold text-slate-400">{toBengaliDigits(idx + 1)}</TableCell>
                                <TableCell className="font-bold text-slate-900">{parsed.categoryName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.brandName}</TableCell>
                                <TableCell className="text-center font-bold text-slate-700">{parsed.sizeName}</TableCell>
                                <TableCell className="text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button type="button" onClick={() => handleUpdateCartQty(item.id || idx, item.quantity - 1, idx)} className="w-6 h-6 rounded bg-slate-100 font-bold hover:bg-slate-200">-</button>
                                    <span className="font-bold min-w-[50px] text-center">{toBengaliDigits(item.quantity)} {item.unit}</span>
                                    <button type="button" onClick={() => handleUpdateCartQty(item.id || idx, item.quantity + 1, idx)} className="w-6 h-6 rounded bg-slate-100 font-bold hover:bg-slate-200">+</button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900">
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-slate-400 font-bold">৳</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={lineTotal}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          handleUpdateCartTotal(item.id || idx, isNaN(val) ? 0 : val, idx);
                                        }}
                                        className="w-28 h-8 text-right font-black text-indigo-700 bg-indigo-50/70 border-indigo-200 text-xs rounded-lg px-2 focus:bg-white"
                                        title="মোট মূল্য পরিবর্তন করলে সিস্টেম স্বয়ংক্রিয় ভাগ করে নিবে"
                                      />
                                    </div>
                                    {isLandedCostAuto && ((shippingCost || 0) + (laborCost || 0) > 0) && cartSubtotal > 0 && (
                                      <div className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md inline-block shadow-2xs">
                                        {(() => {
                                          const extraCharges = (shippingCost || 0) + (laborCost || 0);
                                          const extraPerUnit = (cartSubtotal > 0 && item.quantity > 0)
                                            ? (((item.price * item.quantity / cartSubtotal) * extraCharges) / item.quantity)
                                            : 0;
                                          const landedTotal = (item.price + extraPerUnit) * item.quantity;
                                          const displayLanded = landedTotal % 1 === 0 
                                            ? landedTotal.toLocaleString('en-IN')
                                            : landedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                          return `খরচসহ মোট: ৳${toBengaliDigits(displayLanded)}`;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <button type="button" onClick={() => handleRemoveCartItem(item.id, idx)} className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition-colors" title="আইটেম বাদ দিন">
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
                          maxLength={11}
                          onChange={e => setDriverPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                          placeholder="০১৭XXXXXXXX"
                          className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold font-mono"
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
                          <Label className="text-[11px] font-bold text-slate-600">Unloading Labor Charge (লেবার খরচ ৳)</Label>
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

                      {/* Category-Isolated Default Charges Saving Banner */}
                      <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bengali">
                        <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                          <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>ক্রয় ডিফল্ট চার্জ ({purchaseType === 'rod' ? 'রড ও রিং' : 'সিমেন্ট'}):</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveDefaultCharges}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 border border-indigo-500"
                          title="এই গাড়ি ভাড়া ও লেবার খরচ ভবিষ্যৎ ক্রয়ের জন্য ডিফল্ট সেভ রাখুন"
                        >
                          📌 {purchaseType === 'rod' ? 'রড ও রিং' : 'সিমেন্ট'} ক্রয়ের ডিফল্ট সেভ করুন
                        </button>
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

                          {/* BANK TRANSFER (SUPPLIER BANK DETAILS INPUTS) */}
                          {paymentMethod === 'Bank' && (
                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2.5 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-blue-900 flex items-center gap-1">
                                🏦 গ্রহীতা (সাপ্লায়ারের) ব্যাংক তথ্য
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">গ্রহীতা ব্যাংকের নাম</Label>
                                  <Input 
                                    placeholder="যেমন: ইসলামী ব্যাংক / ডাচ-বাংলা" 
                                    value={supplierBankName} 
                                    onChange={e => setSupplierBankName(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs font-bold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">গ্রহীতার অ্যাকাউন্ট নং / নাম</Label>
                                  <Input 
                                    placeholder="A/C No or Name" 
                                    value={supplierAccountNo} 
                                    onChange={e => setSupplierAccountNo(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs font-mono font-bold text-slate-800"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (অপশনাল)</Label>
                                  <Input 
                                    placeholder="Txn ID / Ref No" 
                                    value={supplierTxnRef} 
                                    onChange={e => setSupplierTxnRef(e.target.value)}
                                    className="h-8 rounded-lg bg-white text-xs font-mono font-bold text-slate-800"
                                  />
                                </div>
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

                        {(() => {
                          const goodsTotal = Math.max(0, cartSubtotal - cartTotalDiscount);
                          const goodsSupplierDue = paymentOption === 'now' ? Math.max(0, goodsTotal - paidAmount) : goodsTotal;
                          return (
                            <>
                              <div className="flex justify-between text-slate-700 font-bold pt-1">
                                <span>Purchase Total</span>
                                <span className="font-black text-slate-900">৳ {cartTotalAmount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                              </div>

                              <div className="flex justify-between text-rose-600 font-bold">
                                <span>Previous Supplier Due</span>
                                <span className="font-black">৳ {selectedSupplierDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {(() => {
                        const goodsTotal = Math.max(0, cartSubtotal - cartTotalDiscount);
                        const goodsSupplierDue = paymentOption === 'now' ? Math.max(0, goodsTotal - paidAmount) : goodsTotal;
                        return (
                          <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Grand Total (with Due)</span>
                              <span className="text-[10px] text-slate-400 font-bold">পণ্যের পাওনা + কোম্পানির পূর্বের পাওনা</span>
                            </div>
                            <span className="text-2xl font-black text-orange-600">৳ {(goodsSupplierDue + selectedSupplierDue).toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                          </div>
                        );
                      })()}
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

                    {(() => {
                      const goodsTotal = Math.max(0, cartSubtotal - cartTotalDiscount);
                      const goodsSupplierDue = paymentOption === 'now' ? Math.max(0, goodsTotal - paidAmount) : goodsTotal;
                      return (
                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                          <span className="font-bold text-slate-600">Remaining Supplier Due</span>
                          <span className="text-lg font-black text-rose-600">৳ {goodsSupplierDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

              </div>

            </div>
              {/* STICKY BOTTOM ACTION BAR INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-bengali flex-shrink-0 mt-6 rounded-b-md">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>💡 ফর্ম জমা দেওয়ার আগে তথ্য যাচাই করুন। ক্রয়ের মালামাল সরাসরি গুদামের স্টকে যোগ হবে।</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => { setIsCreateOpen(false); resetForm(); }}
                    className="rounded-md h-11 px-5 font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-11 px-6 font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all text-sm"
                  >
                    💾 ক্রয় চালান সম্পূর্ণ করুন ✓
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE INVOICE PRINT MEMO MODAL (MATCHING THE EXACT IMAGE DESIGN) */}
      <Dialog open={isPrintMemoOpen} onOpenChange={setIsPrintMemoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border-none shadow-2xl custom-scrollbar font-bengali">
          <div className="bg-slate-900 p-5 text-white flex justify-between items-center print:hidden rounded-t-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" /> ক্রয় ইনভয়েস ক্যাশ মেমো
              </DialogTitle>
              <p className="text-slate-400 font-mono text-xs mt-0.5">মেমো নং: #{selectedPurchase?.id?.toUpperCase()}</p>
            </DialogHeader>
            <div className="flex gap-2">
              <Button 
                onClick={() => printElement('printable-memo-wrapper')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-5 h-10 shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> মেমো প্রিন্ট করুন
              </Button>
            </div>
          </div>

          {selectedPurchase && (
            <div className="p-6 bg-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar print:max-h-none print:overflow-visible print:p-0 print:bg-white">
              <PurchaseInvoiceMemo invoice={selectedPurchase as any} type="purchase" showPrintButton={false} />
            </div>
          )}
          <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center print:hidden rounded-b-2xl">
            <div className="text-xs text-slate-500 font-bold">
              * ক্রয় চালান ও মেমো রেকর্ড কপি।
            </div>
            <Button variant="outline" onClick={() => setIsPrintMemoOpen(false)} className="rounded-xl font-bold text-slate-600 border-slate-200">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PURCHASE TYPE SELECTOR MODAL (ROD vs CEMENT) */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-bengali shadow-2xl">
          <DialogHeader className="text-center pb-2 border-b border-slate-100">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center justify-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> ক্রয় ইনভয়েস টাইপ নির্বাচন করুন
            </DialogTitle>
            <p className="text-slate-500 text-xs mt-1">
              আপনি কোন ধরনের পণ্য ক্রয়ের জন্য ইনভয়েস তৈরি করতে চান?
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3.5 py-4">
            {/* ROD OPTION */}
            <button
              type="button"
              onClick={() => {
                setPurchaseType('rod');
                resetForm();
                setIsTypeModalOpen(false);
                setIsCreateOpen(true);
              }}
              className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 hover:border-orange-500 transition-all text-left group flex items-center gap-4 shadow-2xs active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-md group-hover:scale-105 transition-transform">
                🏗️
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm group-hover:text-orange-700">রড ক্রয় ইনভয়েস (Rod)</h3>
                  <span className="text-[10px] font-black text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-md">রড + রিং</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-snug">
                  বিএসআরএম, কেএসআরএম ইত্যাদি। শুধুমাত্র <strong className="text-slate-700">রড সরবরাহকারী</strong> এবং আইটেমে <strong className="text-slate-700">রড ও রিং</strong> দেখাবে।
                </p>
              </div>
            </button>

            {/* CEMENT OPTION */}
            <button
              type="button"
              onClick={() => {
                setPurchaseType('cement');
                resetForm();
                setIsTypeModalOpen(false);
                setIsCreateOpen(true);
              }}
              className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-500 transition-all text-left group flex items-center gap-4 shadow-2xs active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-md group-hover:scale-105 transition-transform">
                🧱
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm group-hover:text-blue-700">সিমেন্ট ক্রয় ইনভয়েস (Cement)</h3>
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">সিমেন্ট</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-snug">
                  শাহ, সেভেন রিংস ইত্যাদি। শুধুমাত্র <strong className="text-slate-700">সিমেন্ট সরবরাহকারী</strong> এবং আইটেমে শুধুমাত্র <strong className="text-slate-700">সিমেন্ট</strong> দেখাবে।
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
