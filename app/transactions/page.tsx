'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import {
  Plus, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, Wallet,
  TrendingUp, TrendingDown, RefreshCcw, Landmark, CreditCard, ArrowLeftRight,
  Receipt, Calendar, DollarSign, AlertCircle, CheckCircle2, Printer, UploadCloud, X,
  Building2, User, Phone, ShieldCheck, FileText, Check, ArrowLeft, Eye, Edit2,
  FileSpreadsheet, FileDown, Clock, PieChart, ChevronLeft, ChevronRight, Lightbulb, PlusCircle,
  ChevronUp, ChevronDown, RotateCcw, MoreVertical
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { SupplierSearchSelect } from '@/components/SupplierSearchSelect';
import { toast } from 'sonner';
import { format, isToday, isSameMonth } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toBengaliDigits } from '@/lib/bengaliUtils';
import { PaymentVoucherDetailsView } from '@/components/PaymentVoucherDetailsView';
import { PaymentVoucherMemo } from '@/components/PaymentVoucherMemo';
import { printElement } from '@/lib/printUtils';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'contra';
  amount: number;
  category: string;
  description: string;
  accountType?: 'cash' | 'bank';
  bankId?: string;
  paymentId?: string;
  partyName?: string;
  partyPhone?: string;
  partyAddress?: string;
  businessName?: string;
  invoiceNo?: string;
  referenceNo?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankName?: string;
  accountNo?: string;
  chequeNo?: string;
  chequeDate?: string;
  transactionType?: string;
  transactionRef?: string;
  discountAmount?: number;
  previousBalance?: number;
  operatorName?: string;
  receiverName?: string;
  status?: 'Completed' | 'Pending' | 'Bounced' | 'Recorded';
  createdAt: any;
  raw?: any;
}

interface Bank {
  id: string;
  name: string;
  accNo: string;
  balance: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  businessName?: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  businessName?: string;
}

interface OrderInvoice {
  id: string;
  orderId?: string;
  purchaseId?: string;
  customerName?: string;
  supplierName?: string;
  customerPhone?: string;
  supplierPhone?: string;
  totalAmount?: number;
  totalPrice?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?: string;
  createdAt: any;
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const partyParam = searchParams ? searchParams.get('party') : null;
  const filterParam = searchParams ? searchParams.get('filter') : null;
  const typeParam = searchParams ? searchParams.get('type') : null;
  const actionParam = searchParams ? searchParams.get('action') : null;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<OrderInvoice[]>([]);
  const [purchases, setPurchases] = useState<OrderInvoice[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'contra'>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterInvoiceNo, setFilterInvoiceNo] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(partyParam || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const [selectedTxnForView, setSelectedTxnForView] = useState<Transaction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Close open action menu on outside click or scroll or resize
  useEffect(() => {
    const handleClose = () => {
      setOpenMenuId(null);
      setMenuPos(null);
    };
    if (openMenuId) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('click', handleClose);
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [openMenuId]);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200; // flip upward if not enough space at bottom

    setOpenMenuId(id);
    setMenuPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.right - 176,
      openUp
    });
  };

  // Modals
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPrintMemoOpen, setIsPrintMemoOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [isMakePaymentOpen, setIsMakePaymentOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);

  // Add Money (টাকা যোগ) State
  const [addMoneyCategory, setAddMoneyCategory] = useState('ক্যাশে জমা (Add Cash)');
  const [addMoneyAmount, setAddMoneyAmount] = useState<number>(0);
  const [addMoneyMethod, setAddMoneyMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [addMoneyBankId, setAddMoneyBankId] = useState<string>('');
  const [addMoneyNote, setAddMoneyNote] = useState<string>('');
  const [addMoneyDate, setAddMoneyDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Form States for Direct Add
  const [txnType, setTxnType] = useState<'income' | 'expense' | 'contra'>('income');
  const [paymentType, setPaymentType] = useState<'income' | 'expense'>('income');
  const [autoPaymentId, setAutoPaymentId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>('বিক্রি প্রাপ্তি');
  const [description, setDescription] = useState<string>('');
  const [accountType, setAccountType] = useState<'cash' | 'bank'>('cash');
  const [bankId, setBankId] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedPartyObj, setSelectedPartyObj] = useState<any>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  // Collect/Pay State
  const [selectedInvoice, setSelectedInvoice] = useState<OrderInvoice | null>(null);

  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [cashPaidAmount, setCashPaidAmount] = useState<number>(0);
  const [chequePaidAmount, setChequePaidAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Bank & Cheque Detailed States (Exact replica of Invoice Register Payment)
  const [selectedShopBank, setSelectedShopBank] = useState<string>('ডাচ-বাংলা ব্যাংক - 123.456.7890');
  const [senderBankName, setSenderBankName] = useState<string>('');
  const [senderAccountNo, setSenderAccountNo] = useState<string>('');
  const [senderTxnRef, setSenderTxnRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [bankTxnType, setBankTxnType] = useState<string>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [accountHolderName, setAccountHolderName] = useState<string>('');

  const [newBank, setNewBank] = useState({ name: '', accNo: '', initialBalance: 0 });

  const defaultBankOptions = [
    { value: 'ডাচ-বাংলা ব্যাংক - 123.456.7890', label: 'ডাচ-বাংলা ব্যাংক (DBBL) - A/C: 123.456.7890' },
    { value: 'ইসলামী ব্যাংক - 2050.1234.5678', label: 'ইসলামী ব্যাংক (IBBL) - A/C: 2050.1234.5678' },
    { value: 'ব্র্যাক ব্যাংক - 1501.2039.4857', label: 'ব্র্যাক ব্যাংক (BRAC Bank) - A/C: 1501.2039.4857' },
    { value: 'সিটি ব্যাংক - 3101.9876.5432', label: 'সিটি ব্যাংক (City Bank) - A/C: 3101.9876.5432' },
    { value: 'সোনালী ব্যাংক - 4402.1122.3344', label: 'সোনালী ব্যাংক (Sonali Bank) - A/C: 4402.1122.3344' }
  ];

  const dbBankOptions = banks.map(b => {
    const name = b.name || 'ব্যাংক অ্যাকাউন্ট';
    const acc = b.accNo || '';
    const val = acc ? `${name} - ${acc}` : name;
    return {
      value: val,
      label: acc ? `🏦 ${name} - A/C: ${toBengaliDigits(acc)}` : `🏦 ${name}`
    };
  });

  const availableBankOptions = dbBankOptions.length > 0 ? dbBankOptions : defaultBankOptions;

  const loadAllTransactionsData = useCallback(async () => {
    try {
      setLoading(true);
      const [txList, partyList, bankList, orderList, purchaseList] = await Promise.all([
        api.transactions.list().catch(() => []),
        api.parties.list().catch(() => []),
        api.banks.list().catch(() => []),
        api.transactions.list({ transaction_type: 'sale' }).catch(() => []),
        api.transactions.list({ transaction_type: 'purchase' }).catch(() => [])
      ]);

      const safeTxList = Array.isArray(txList) ? txList : [];
      const safePartyList = Array.isArray(partyList) ? partyList : [];
      const safeBankList = Array.isArray(bankList) ? bankList : [];
      const safeOrderList = Array.isArray(orderList) ? orderList : [];
      const safePurchaseList = Array.isArray(purchaseList) ? purchaseList : [];

      setBanks(safeBankList.map((b: any) => ({
        id: String(b.id),
        name: b.name || b.bank_name || 'ব্যাংক',
        accNo: b.account_number || b.accNo || '',
        balance: Number(b.balance || b.current_balance || 0)
      })));

      // Party Lookups
      const partyMapById = new Map<string, any>();
      const partyMapByName = new Map<string, any>();
      safePartyList.forEach((p: any) => {
        const idStr = String(p.id);
        partyMapById.set(idStr, p);
        if (p.name) partyMapByName.set(String(p.name).trim().toLowerCase(), p);
        if (p.business_name) partyMapByName.set(String(p.business_name).trim().toLowerCase(), p);
      });

      // Invoice Lookups (sales & purchases)
      const invoiceMap = new Map<string, any>();
      [...safeOrderList, ...safePurchaseList].forEach((inv: any) => {
        const invNo = inv.invoice_no || inv.order_id || inv.purchase_id || `INV-${inv.id}`;
        if (invNo) invoiceMap.set(String(invNo).trim().toLowerCase(), inv);
        if (inv.id) invoiceMap.set(String(inv.id), inv);
      });

      // EXCLUDE ALL INVOICES (sale, purchase, sale_return, purchase_return)
      const paymentOnlyList = safeTxList.filter(t => 
        t.transaction_type !== 'sale' && 
        t.transaction_type !== 'purchase' && 
        t.transaction_type !== 'sale_return' && 
        t.transaction_type !== 'purchase_return'
      );

      setTransactions(paymentOnlyList.map(t => {
        let meta: any = {};
        let userNote = t.notes || '';
        if (userNote && typeof userNote === 'string' && userNote.trim().startsWith('{')) {
          try {
            const firstLine = userNote.split('\n')[0];
            meta = JSON.parse(firstLine);
            userNote = meta.userNote !== undefined ? meta.userNote : userNote.substring(firstLine.length).trim();
          } catch {}
        }

        const rawNoteStr = String(t.notes || '');
        const isAddMoney = meta.isAddMoney === true || 
                           meta.category === 'টাকা যোগ' || 
                           rawNoteStr.includes('[টাকা যোগ') ||
                           (t.transaction_type as string) === 'contra';

        let txnType: 'income' | 'expense' | 'contra' = 'income';
        let categoryName = 'পেমেন্ট গ্রহণ';
        
        if (isAddMoney) {
          txnType = 'contra';
          categoryName = 'টাকা যোগ';
        } else if (t.transaction_type === 'payment_out') {
          txnType = 'expense';
          categoryName = 'পেমেন্ট প্রদান';
        } else if (t.transaction_type === 'payment_in') {
          txnType = 'income';
          categoryName = 'পেমেন্ট গ্রহণ';
        } else {
          txnType = 'contra';
          categoryName = 'টাকা যোগ';
        }

        const invNoStr = t.invoice_no || meta.invoiceNo || '';
        const linkedInvoice = invNoStr ? invoiceMap.get(String(invNoStr).trim().toLowerCase()) : null;

        const rawT = t as any;
        const partyIdKey = String(rawT.party_id || (rawT.party && typeof rawT.party === 'object' ? rawT.party.id : '') || meta.partyId || '');
        const rawPartyName = rawT.party_name || (rawT.party && typeof rawT.party === 'object' ? rawT.party.name : '') || meta.partyName || '';
        const partyNameKey = String(rawPartyName).trim().toLowerCase();

        const matchedParty = partyMapById.get(partyIdKey) || 
                             (partyNameKey ? partyMapByName.get(partyNameKey) : null) || 
                             (typeof rawT.party === 'object' ? rawT.party : null) ||
                             (linkedInvoice ? (linkedInvoice.party || linkedInvoice) : null);

        let addMoneyPartyName = 'দোকান ক্যাশ / মূলধন';
        if (isAddMoney) {
          if (meta.addMoneyCategory) {
            addMoneyPartyName = meta.addMoneyCategory;
          } else if (rawNoteStr.includes('[টাকা যোগ - ')) {
            const match = rawNoteStr.match(/\[টাকা যোগ - ([^\]]+)\]/);
            if (match && match[1]) {
              addMoneyPartyName = match[1];
            }
          }
        }

        const resolvedPartyName = isAddMoney
          ? addMoneyPartyName
          : (rawPartyName && rawPartyName !== 'কাস্টমার' && rawPartyName !== 'সরবরাহকারী')
            ? rawPartyName
            : (matchedParty?.name || matchedParty?.business_name || matchedParty?.customer_name || matchedParty?.customerName || linkedInvoice?.customerName || linkedInvoice?.customer_name || linkedInvoice?.supplierName || linkedInvoice?.supplier_name || meta.partyName || (txnType === 'expense' ? 'সরবরাহকারী' : 'কাস্টমার'));

        const resolvedPartyPhone = rawT.party_phone || (rawT.party && typeof rawT.party === 'object' ? rawT.party.phone : '') || matchedParty?.phone || matchedParty?.customerPhone || matchedParty?.customer_phone || linkedInvoice?.customerPhone || linkedInvoice?.customer_phone || linkedInvoice?.supplierPhone || meta.partyPhone || meta.phone || '';

        const resolvedPartyAddress = rawT.party_address || (rawT.party && typeof rawT.party === 'object' ? rawT.party.address : '') || matchedParty?.address || matchedParty?.customerAddress || matchedParty?.customer_address || linkedInvoice?.customerAddress || linkedInvoice?.customer_address || linkedInvoice?.supplierAddress || meta.partyAddress || meta.address || '';

        const resolvedBusinessName = rawT.business_name || (rawT.party && typeof rawT.party === 'object' ? rawT.party.business_name : '') || matchedParty?.business_name || matchedParty?.businessName || meta.businessName || '';

        const resolvedPreviousBalance = Number(
          rawT.previous_balance !== undefined ? rawT.previous_balance :
          rawT.previous_due !== undefined ? rawT.previous_due :
          matchedParty?.total_due !== undefined ? matchedParty?.total_due :
          matchedParty?.due !== undefined ? matchedParty?.due :
          matchedParty?.balance !== undefined ? matchedParty?.balance :
          meta.previousBalance !== undefined ? meta.previousBalance :
          meta.previousDue !== undefined ? meta.previousDue :
          0
        );

        return {
          id: String(rawT.id),
          paymentId: rawT.invoice_no || meta.paymentId || `PAY-${rawT.id}`,
          type: txnType,
          amount: Number(rawT.paid_amount || rawT.total_amount || meta.amount || 0),
          category: rawT.category || categoryName,
          description: userNote || rawT.notes || categoryName,
          partyName: resolvedPartyName,
          partyPhone: resolvedPartyPhone,
          partyAddress: resolvedPartyAddress,
          businessName: resolvedBusinessName,
          invoiceNo: rawT.invoice_no || meta.invoiceNo || '—',
          referenceNo: rawT.reference_no || meta.referenceNo || userNote || '—',
          paymentMethod: meta.paymentMethodName || rawT.payment_method || (rawT.account_type === 'bank' ? 'Bank' : 'Cash'),
          discountAmount: Number(rawT.discount || rawT.discount_amount || meta.discountAmount || 0),
          previousBalance: resolvedPreviousBalance,
          bankName: (t as any).bank_name || (t as any).bank_account_name || meta.bankName || meta.selectedShopBank || '',
          accountNo: (t as any).account_number || meta.accountNo || meta.supplierAccountNo || '',
          chequeNo: (t as any).cheque_no || meta.chequeNo || '',
          chequeDate: (t as any).cheque_date || meta.chequeDate || '',
          transactionRef: (t as any).transaction_ref || meta.transactionRef || meta.supplierTxnRef || '',
          operatorName: (t as any).operator_name || (t as any).prepared_by || meta.preparedBy || meta.operatorName || 'ক্যাশিয়ার',
          status: (t.status === 'completed' || !t.status) ? 'Completed' : t.status === 'pending' ? 'Pending' : t.status === 'bounced' ? 'Bounced' : 'Completed',
          createdAt: t.created_at,
          raw: t
        };
      }));

      setBanks(safeBankList.map((b: any) => ({
        id: String(b.id),
        name: b.name,
        accNo: b.account_number || '',
        balance: Number(b.balance || 0)
      })));

      const loadedCusts = safePartyList.filter((p: any) => p.party_type === 'customer' || p.party_type === 'both').map((p: any) => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        businessName: p.business_name
      }));
      const loadedSupps = safePartyList.filter((p: any) => p.party_type === 'supplier' || p.party_type === 'both').map((p: any) => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        businessName: p.business_name
      }));

      setCustomers(loadedCusts);
      setSuppliers(loadedSupps);
      return { loadedCusts, loadedSupps };
    } catch (err) {
      console.error('Error loading transactions page:', err);
      return { loadedCusts: [], loadedSupps: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Open Create Payment Form Overlay
  const handleOpenAddForm = useCallback((
    type: 'income' | 'expense', 
    targetPartyId?: string,
    customCusts?: Customer[],
    customSupps?: Supplier[]
  ) => {
    setEditingTransactionId(null);
    setPaymentType(type);
    setAutoPaymentId(`PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
    const pId = targetPartyId || partyParam || '';
    setSelectedPartyId(pId);
    if (pId) {
      const partyList = type === 'income' ? (customCusts || customers) : (customSupps || suppliers);
      const found = partyList.find(c => String(c.id) === String(pId));
      if (found) {
        setSelectedParty(found);
        setAccountHolderName(found.name);
      }
    } else {
      setSelectedParty(null);
    }
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setPaidAmount(0);
    setDiscountAmount(0);
    setReferenceNo(`REF-${Math.floor(100 + Math.random() * 900)}`);
    setPaymentNote('');
    if (type === 'income') {
      const defaultBank = availableBankOptions[0]?.value || 'ডাচ-বাংলা ব্যাংক - 123.456.7890';
      setSelectedShopBank(defaultBank);
      setBankName(defaultBank);
    } else {
      setSelectedShopBank('');
      setBankName('');
    }
    setTransactionRef('');
    setIsAddOpen(true);
  }, [partyParam, customers, suppliers, availableBankOptions]);

  // Edit Existing Transaction
  const handleEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    const type = t.type === 'expense' ? 'expense' : 'income';
    setPaymentType(type);
    setAutoPaymentId(t.paymentId || `PAY-${t.id}`);
    
    const partyList = type === 'income' ? customers : suppliers;
    const foundParty = partyList.find(p => p.name === t.partyName || String(p.id) === String(t.raw?.party || t.raw?.party_id));
    if (foundParty) {
      setSelectedPartyId(foundParty.id);
      setSelectedParty(foundParty);
      setAccountHolderName(foundParty.name);
    } else {
      setSelectedPartyId('');
      setSelectedParty(t.partyName ? { id: '', name: t.partyName, phone: t.partyPhone || '', address: t.partyAddress || '' } : null);
    }

    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setPaidAmount(t.amount || 0);
    setDiscountAmount(t.discountAmount || 0);
    setReferenceNo(t.referenceNo !== '—' ? (t.referenceNo || '') : '');
    setPaymentNote(t.description !== t.category ? (t.description || '') : '');
    setPaymentMethod(t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash'));
    if (type === 'income') {
      setSelectedShopBank(t.bankName || availableBankOptions[0]?.value || 'ডাচ-বাংলা ব্যাংক - 123.456.7890');
      setBankName(t.bankName || availableBankOptions[0]?.value || 'ডাচ-বাংলা ব্যাংক - 123.456.7890');
    } else {
      setSelectedShopBank('');
      setBankName(t.bankName || '');
    }
    setChequeNo(t.chequeNo || '');
    setChequeDate(t.chequeDate || '');
    setTransactionRef(t.transactionRef || '');
    setIsAddOpen(true);
  };

  const handleCreateAddMoneySubmit = async () => {
    if (addMoneyAmount <= 0) {
      toast.error('টাকার পরিমাণ প্রদান করুন');
      return;
    }

    const metaJson = JSON.stringify({
      isAddMoney: true,
      category: 'টাকা যোগ',
      addMoneyCategory: addMoneyCategory,
      partyName: addMoneyCategory,
      userNote: addMoneyNote || ''
    });

    try {
      await api.transactions.create({
        party_name: addMoneyCategory,
        transaction_type: 'payment_in',
        total_amount: addMoneyAmount,
        paid_amount: addMoneyAmount,
        due_amount: 0,
        payment_method: (addMoneyMethod.toLowerCase().includes('bank') ? 'bank' : addMoneyMethod.toLowerCase().includes('cheque') ? 'cheque' : addMoneyMethod.toLowerCase()),
        cheque_bank: addMoneyMethod === 'Bank' ? banks.find(b => b.id === addMoneyBankId)?.name : '',
        notes: metaJson + '\n' + `[টাকা যোগ - ${addMoneyCategory}] ${addMoneyNote}`
      });

      toast.success('টাকা সফলভাবে যোগ করা হয়েছে!');
      setIsAddMoneyOpen(false);
      setAddMoneyAmount(0);
      setAddMoneyNote('');
      loadAllTransactionsData();
    } catch (err: any) {
      toast.error('টাকা যোগ করতে সমস্যা হয়েছে');
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      const { loadedCusts, loadedSupps } = await loadAllTransactionsData();
      if (ignore) return;
      if (typeParam === 'income' || typeParam === 'expense' || typeParam === 'contra') {
        setActiveTab(typeParam);
      }
      if (typeParam === 'contra' || actionParam === 'create') {
        if (typeParam === 'contra') {
          setIsAddMoneyOpen(true);
        } else {
          const mode = typeParam === 'expense' ? 'expense' : 'income';
          handleOpenAddForm(mode, partyParam || undefined, loadedCusts, loadedSupps);
        }
      }
    }
    init();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam, actionParam, partyParam, loadAllTransactionsData]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setActiveTab('all');
    setFilterCustomer('all');
    setFilterInvoiceNo('');
    setFilterMethod('all');
    setFilterStatus('all');
    setMinAmount('');
    setMaxAmount('');
    toast.info('ফিল্টার রিসেট করা হয়েছে');
  };

  // Update Party Selection
  const handleSelectParty = (partyId: string) => {
    setSelectedPartyId(partyId);
    if (paymentType === 'income') {
      const cust = customers.find(c => c.id === partyId) || null;
      setSelectedParty(cust);
      if (cust) setAccountHolderName(cust.name);
    } else {
      const supp = suppliers.find(s => s.id === partyId) || null;
      setSelectedParty(supp);
      if (supp) setAccountHolderName(supp.name);
    }
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
  };

  // Update Invoice Selection
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const invList = paymentType === 'income' ? orders : purchases;
    const inv = invList.find(i => i.id === invId) || null;
    setSelectedInvoice(inv);
    if (inv) {
      setPaidAmount(inv.dueAmount || inv.totalAmount || 0);
    }
  };

  // Submit Payment Form
  const handleSubmitPaymentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      toast.error(paymentType === 'income' ? 'কাস্টমার নির্বাচন করুন' : 'সাপ্লায়ার নির্বাচন করুন');
      return;
    }
    if (paidAmount <= 0) {
      toast.error('পরিশোধিত পরিমাণ সঠিকভাবে ইনপুট দিন');
      return;
    }

    const partyObj: any = selectedParty;
    const metaJson = JSON.stringify({
      partyId: partyObj.id,
      partyName: partyObj.name,
      partyPhone: partyObj.phone || '',
      partyAddress: partyObj.address || '',
      businessName: partyObj.businessName || partyObj.business_name || '',
      invoiceNo: selectedInvoice?.orderId || selectedInvoice?.purchaseId || selectedInvoice?.id || selectedInvoiceId || '',
      referenceNo: referenceNo || '',
      paymentMethodName: paymentMethod,
      bankName: (paymentType === 'income' ? (selectedShopBank || bankName) : bankName) || '',
      accountNo: senderAccountNo || '',
      chequeNo: chequeNo || '',
      chequeDate: chequeDate || '',
      transactionRef: transactionRef || '',
      discountAmount: discountAmount || 0,
      previousBalance: partyObj.totalDue || partyObj.due || partyObj.balance || 0,
      userNote: paymentNote || ''
    });

    try {
      if (editingTransactionId) {
        await api.transactions.update(editingTransactionId, {
          party: Number(partyObj.id) || partyObj.id,
          party_name: partyObj.name,
          party_phone: partyObj.phone || '',
          party_address: partyObj.address || '',
          invoice_no: selectedInvoice?.orderId || selectedInvoice?.purchaseId || selectedInvoice?.id || referenceNo || '',
          transaction_type: paymentType === 'income' ? 'payment_in' : 'payment_out',
          total_amount: paidAmount,
          paid_amount: paidAmount,
          discount: discountAmount || 0,
          due_amount: 0,
          payment_method: (paymentMethod.toLowerCase().includes('bank') ? 'bank' : paymentMethod.toLowerCase().includes('cheque') ? 'cheque' : 'cash'),
          notes: metaJson + '\n' + (paymentNote || '')
        } as any);
        toast.success('পেমেন্ট সফলভাবে আপডেট করা হয়েছে');
      } else {
        await api.transactions.create({
          party: Number(partyObj.id) || partyObj.id,
          party_name: partyObj.name,
          party_phone: partyObj.phone || '',
          party_address: partyObj.address || '',
          invoice_no: selectedInvoice?.orderId || selectedInvoice?.purchaseId || selectedInvoice?.id || referenceNo || '',
          transaction_type: paymentType === 'income' ? 'payment_in' : 'payment_out',
          total_amount: paidAmount,
          paid_amount: paidAmount,
          discount: discountAmount || 0,
          due_amount: 0,
          payment_method: (paymentMethod.toLowerCase().includes('bank') ? 'bank' : paymentMethod.toLowerCase().includes('cheque') ? 'cheque' : 'cash'),
          notes: metaJson + '\n' + (paymentNote || '')
        } as any);
        toast.success('পেমেন্ট সফলভাবে সংরক্ষণ করা হয়েছে');
      }

      setEditingTransactionId(null);
      setIsAddTxnOpen(false);
      setIsAddOpen(false);
      loadAllTransactionsData();
    } catch (err: any) {
      console.error(err);
      toast.error('পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || err));
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.name || !newBank.accNo) {
      toast.error('অনুগ্রহ করে সব তথ্য দিন');
      return;
    }
    try {
      await api.banks.create({
        name: newBank.name,
        account_number: newBank.accNo,
        balance: newBank.initialBalance
      });
      toast.success('ব্যাংক অ্যাকাউন্ট যোগ করা হয়েছে');
      setNewBank({ name: '', accNo: '', initialBalance: 0 });
      setIsAddBankOpen(false);
      loadAllTransactionsData();
    } catch {
      toast.error('ব্যাংক যোগ করা সম্ভব হয়নি');
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?')) return;
    try {
      await api.transactions.delete(t.id);
      toast.success('লেনদেন মুছে ফেলা হয়েছে');
      loadAllTransactionsData();
    } catch (err) {
      console.error(err);
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    }
  };

  const formatDate = (at: any) => {
    if (!at) return '—';
    try {
      const date = new Date(at);
      const formatted = format(date, 'dd/MM/yyyy hh:mm a', { locale: bn });
      return toBengaliDigits(formatted);
    } catch {
      return '—';
    }
  };

  // 100% DYNAMIC PAYMENT-ONLY FILTERING
  const filteredTransactions = transactions.filter(t => {
    // 1. Unified Search (Party Name, Phone, Payment ID, Invoice No, Reference, Category)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      t.partyName?.toLowerCase().includes(searchLower) ||
      t.partyPhone?.includes(searchQuery) ||
      t.paymentId?.toLowerCase().includes(searchLower) ||
      t.invoiceNo?.toLowerCase().includes(searchLower) ||
      t.referenceNo?.toLowerCase().includes(searchLower) ||
      t.category?.toLowerCase().includes(searchLower);

    // 2. Active Tab / Type Filter (all, income/payment_in, expense/payment_out, contra/taka_jog)
    let matchesTab = true;
    if (activeTab === 'income') {
      matchesTab = (t.type === 'income' || t.category === 'পেমেন্ট গ্রহণ') && t.type !== 'contra' && t.category !== 'টাকা যোগ';
    } else if (activeTab === 'expense') {
      matchesTab = t.type === 'expense' || t.category === 'পেমেন্ট প্রদান';
    } else if (activeTab === 'contra') {
      matchesTab = t.category === 'টাকা যোগ' || t.type === 'contra';
    }

    // 3. Customer / Party Filter
    let matchesParty = true;
    if (filterCustomer !== 'all' && t.partyName !== filterCustomer) matchesParty = false;

    // 4. Payment Method Filter
    let matchesMethod = true;
    if (filterMethod !== 'all' && (t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash')) !== filterMethod) matchesMethod = false;

    // 5. Status Filter
    let matchesStatus = true;
    if (filterStatus !== 'all' && (t.status || 'Completed') !== filterStatus) matchesStatus = false;

    // 6. Date Range Filter
    let matchesDate = true;
    if (startDate || endDate) {
      const txDateStr = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '';
      if (startDate && txDateStr < startDate) matchesDate = false;
      if (endDate && txDateStr > endDate) matchesDate = false;
    }

    // 7. Amount Range Filter
    let matchesAmount = true;
    const amt = t.amount || 0;
    if (minAmount && amt < parseFloat(minAmount)) matchesAmount = false;
    if (maxAmount && amt > parseFloat(maxAmount)) matchesAmount = false;

    return Boolean(matchesSearch) && matchesTab && matchesParty && matchesMethod && matchesStatus && matchesDate && matchesAmount;
  });

  // 100% DYNAMIC REAL STATS CALCULATIONS (NO DUMMY DATA!)
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  
  const todayIncomes = incomeTransactions.filter(t => {
    const d = new Date(t.createdAt);
    return isToday(d);
  });
  const todayTotalAmount = todayIncomes.reduce((a, t) => a + (t.amount || 0), 0);
  const todayTotalCount = todayIncomes.length;

  const monthIncomes = incomeTransactions.filter(t => {
    const d = new Date(t.createdAt);
    return isSameMonth(d, new Date());
  });
  const monthTotalAmount = monthIncomes.reduce((a, t) => a + (t.amount || 0), 0);
  const monthTotalCount = monthIncomes.length;

  const grandTotalIncomeAmount = incomeTransactions.reduce((a, t) => a + (t.amount || 0), 0);
  const grandTotalIncomeCount = incomeTransactions.length;

  const totalDuesReceivable = customers.reduce((a, c) => a + (Number((c as any).totalDue) || 0), 0);
  const dueCustomersCount = customers.filter(c => Number((c as any).totalDue || 0) > 0).length;

  // Today's Collection Breakdown Cards (Real Data)
  const todayCashAmount = todayIncomes.filter(t => t.paymentMethod === 'Cash' || t.accountType === 'cash').reduce((a, t) => a + (t.amount || 0), 0);
  const todayBankAmount = todayIncomes.filter(t => t.paymentMethod === 'Bank' || t.accountType === 'bank').reduce((a, t) => a + (t.amount || 0), 0);
  const todayCheckAmount = todayIncomes.filter(t => t.paymentMethod === 'Check').reduce((a, t) => a + (t.amount || 0), 0);

  const pendingCheckAmount = incomeTransactions.filter(t => t.paymentMethod === 'Check' && t.status === 'Pending').reduce((a, t) => a + (t.amount || 0), 0);
  const bouncedCheckAmount = incomeTransactions.filter(t => t.paymentMethod === 'Check' && t.status === 'Bounced').reduce((a, t) => a + (t.amount || 0), 0);

  // Form Calculations
  const availableInvoices = paymentType === 'income' 
    ? orders.filter(o => !selectedPartyId || o.customerName === selectedPartyObj?.name)
    : purchases.filter(p => !selectedPartyId || p.supplierName === selectedPartyObj?.name);

  const totalInvoiceAmount = (selectedInvoice ? (selectedInvoice.totalAmount || 0) : (selectedParty?.totalDue || 0)) || 0;
  const previousPaidAmount = (selectedInvoice ? (selectedInvoice.paidAmount || 0) : 0) || 0;
  const currentPaymentAmount = paidAmount || 0;
  const safeDiscount = discountAmount || 0;
  const remainingDue = Math.max(0, totalInvoiceAmount - (previousPaidAmount + currentPaymentAmount + safeDiscount));

  return (
    <Shell>
      {selectedTxnForView ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <PaymentVoucherDetailsView
            voucher={selectedTxnForView}
            onBack={() => setSelectedTxnForView(null)}
            onPrint={() => printElement('printable-memo-wrapper')}
            onDelete={(tx) => {
              setSelectedTxnForView(null);
              handleDelete(tx);
            }}
          />

          {/* Hidden Print Container for iframe printing */}
          <div className="hidden print:block">
            <PaymentVoucherMemo
              voucher={selectedTxnForView}
              showPrintButton={false}
            />
          </div>
        </div>
      ) : !isAddOpen ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bengali">
          
          {/* TOP BREADCRUMB & PAGE TITLE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                পেমেন্ট ইতিহাস
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">হোম &gt; পেমেন্ট ইতিহাস</p>
            </div>

            {/* TOP ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button 
                onClick={() => setIsAddMoneyOpen(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-xs"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> + টাকা যোগ করুন
              </Button>

              <Button 
                onClick={() => handleOpenAddForm('income')} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs"
              >
                <ArrowUpRight className="w-4 h-4 mr-1.5" /> + পেমেন্ট গ্রহণ
              </Button>

              <Button 
                onClick={() => handleOpenAddForm('expense')} 
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all text-xs"
              >
                <ArrowDownRight className="w-4 h-4 mr-1.5" /> - পেমেন্ট প্রদান
              </Button>

              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <FileDown className="w-4 h-4 mr-1.5 text-rose-500" /> পিডিএফ ডাউনলোড
              </Button>

              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> এক্সেল এক্সপোর্ট
              </Button>

              <Button variant="outline" onClick={() => window.print()} className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 bg-white font-bold text-xs">
                <Printer className="w-4 h-4 mr-1.5 text-blue-600" /> প্রিন্ট
              </Button>
            </div>
          </div>

          {/* TOP 4 REAL STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* CARD 1: আজকের আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">আজকের আদায়</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-0.5">৳ {toBengaliDigits(todayTotalAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(todayTotalCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 2: এই মাসের আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">এই মাসের আদায়</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-0.5">৳ {toBengaliDigits(monthTotalAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(monthTotalCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 3: মোট আদায় */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-purple-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট আদায়</p>
                  <h3 className="text-2xl font-black text-purple-700 mt-0.5">৳ {toBengaliDigits(grandTotalIncomeAmount.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(grandTotalIncomeCount)} টি পেমেন্ট</p>
                </div>
              </div>
            </Card>

            {/* CARD 4: বকেয়া আদায়যোগ্য */}
            <Card className="bg-white border-2 border-slate-100/80 rounded-2xl p-5 shadow-xs hover:border-amber-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">বকেয়া আদায়যোগ্য</p>
                  <h3 className="text-2xl font-black text-rose-600 mt-0.5">৳ {toBengaliDigits(totalDuesReceivable.toLocaleString('bn-BD'))}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">মোট {toBengaliDigits(dueCustomersCount)} জন কাস্টমার</p>
                </div>
              </div>
            </Card>

          </div>

          {/* MAIN CONTENT GRID (LEFT 75% FILTERS & TABLE + RIGHT 25% SIDEBAR) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT 9 COLUMNS: FILTER CARD & PAYMENT HISTORY TABLE */}
            <div className="lg:col-span-9 space-y-5">
              
              {/* COMPACT & EFFICIENT FILTER CARD */}
              <Card className="border border-slate-200/80 shadow-2xs rounded-md bg-white p-4 font-bengali space-y-3">
                {/* Top Row: Search + Date Range + Type Quick Pills + More Filter Toggle */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  
                  {/* Unified Search Box */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="কাস্টমার/সাপ্লায়ার, ফোন বা লেনদেন আইডি দিয়ে খুঁজুন..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-md bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
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
                      title="শুরুর তারিখ"
                    />
                    <span className="text-slate-300 text-xs font-bold">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28 cursor-pointer"
                      title="শেষের তারিখ"
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

                  {/* Transaction Type Filter Dropdown */}
                  <div className="w-full sm:w-44 shrink-0">
                    <Select value={activeTab} onValueChange={(val: string | null) => setActiveTab((val as any) || 'all')}>
                      <SelectTrigger className="rounded-md h-10 bg-slate-50/80 border-slate-200 text-xs font-bold text-slate-800">
                        <SelectValue placeholder="সব লেনদেন" />
                      </SelectTrigger>
                      <SelectContent className="font-bengali">
                        <SelectItem value="all" className="text-xs font-bold">সব লেনদেন</SelectItem>
                        <SelectItem value="income" className="text-xs font-bold text-emerald-600">পেমেন্ট গ্রহণ (জমা)</SelectItem>
                        <SelectItem value="expense" className="text-xs font-bold text-rose-600">পেমেন্ট প্রদান (খরচ)</SelectItem>
                        <SelectItem value="contra" className="text-xs font-bold text-blue-600">টাকা যোগ</SelectItem>
                      </SelectContent>
                    </Select>
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

                    {(searchQuery || startDate || endDate || activeTab !== 'all' || filterCustomer !== 'all' || filterMethod !== 'all' || filterStatus !== 'all' || minAmount || maxAmount) && (
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
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
                    {/* Customer Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">কাস্টমার / পার্টি</Label>
                      <Select value={filterCustomer} onValueChange={(val: string | null) => setFilterCustomer(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue placeholder="সব পার্টি" />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold max-h-60 z-[99999]">
                          <SelectItem value="all">সব কাস্টমার/পার্টি</SelectItem>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Method Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট পদ্ধতি</Label>
                      <Select value={filterMethod} onValueChange={(val: string | null) => setFilterMethod(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                          <SelectItem value="all">সব মাধ্যম</SelectItem>
                          <SelectItem value="Cash">নগদ (Cash)</SelectItem>
                          <SelectItem value="Bank">ব্যাংক (Bank)</SelectItem>
                          <SelectItem value="Check">চেক (Cheque)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">স্ট্যাটাস</Label>
                      <Select value={filterStatus} onValueChange={(val: string | null) => setFilterStatus(val || 'all')}>
                        <SelectTrigger className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                          <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                          <SelectItem value="Completed">সম্পন্ন (Completed)</SelectItem>
                          <SelectItem value="Pending">অপেক্ষমাণ (Pending)</SelectItem>
                          <SelectItem value="Bounced">প্রত্যাখ্যাত (Bounced)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600">টাকার পরিমাণ (৳)</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder="সর্বনিম্ন (৳)"
                          value={minAmount}
                          onChange={e => setMinAmount(e.target.value)}
                          className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                        />
                        <span className="text-slate-300 text-xs">-</span>
                        <Input
                          placeholder="সর্বোচ্চ (৳)"
                          value={maxAmount}
                          onChange={e => setMaxAmount(e.target.value)}
                          className="rounded-md h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* PAYMENT LIST TABLE CARD */}
              <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs overflow-hidden font-bengali">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base">পেমেন্ট ও দেনা-পাওনা লেনদেন তালিকা</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    মোট {toBengaliDigits(filteredTransactions.length)} টি লেনদেন
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black py-3.5 px-4 uppercase">লেনদেন আইডি</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">তারিখ</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">প্রকার</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">কাস্টমার / সরবরাহকারী</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">পেমেন্ট মাধ্যম</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black text-right uppercase">পরিমাণ (৳)</TableHead>
                        <TableHead className="font-slate-700 text-[11px] tracking-wider font-black uppercase">নোট / রেফারেন্স</TableHead>
                        <TableHead className="w-16 text-center font-slate-700 text-[11px] tracking-wider font-black py-3.5 px-4 uppercase">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-16 text-slate-400 font-bold text-sm">লোড হচ্ছে...</TableCell></TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Receipt className="w-10 h-10 mb-2 opacity-20" />
                              <p className="font-bold text-sm">কোনো পেমেন্ট বা লেনদেনের রেকর্ড পাওয়া যায়নি</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredTransactions.map((t, idx) => {
                        const method = t.paymentMethod || (t.accountType === 'bank' ? 'Bank' : 'Cash');
                        const isContra = t.type === 'contra' || t.category === 'টাকা যোগ';
                        const isIncome = (t.type === 'income' || t.category === 'পেমেন্ট গ্রহণ') && !isContra;
                        const isExpense = t.type === 'expense' || t.category === 'পেমেন্ট প্রদান';

                        return (
                          <TableRow 
                            key={t.id} 
                            onClick={() => setSelectedTxnForView(t)}
                            className="border-b border-slate-100 hover:bg-slate-50/90 transition-colors text-xs cursor-pointer group"
                          >
                            <TableCell className="py-3.5 px-4 font-mono font-black text-slate-800">
                              {toBengaliDigits(t.paymentId || `PAY-2026-${(100145 - idx)}`)}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-600">
                              {formatDate(t.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-md text-[11px] border",
                                isIncome && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                isExpense && "bg-orange-50 text-orange-700 border-orange-200",
                                isContra && "bg-blue-50 text-blue-700 border-blue-200"
                              )}>
                                {isIncome && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                                {isExpense && <ArrowDownRight className="w-3 h-3 text-orange-600" />}
                                {isContra && <PlusCircle className="w-3 h-3 text-blue-600" />}
                                <span>{isContra ? 'টাকা যোগ' : (t.category || (isIncome ? 'পেমেন্ট গ্রহণ' : 'পেমেন্ট প্রদান'))}</span>
                              </span>
                            </TableCell>
                            <TableCell className="font-black text-slate-900">
                              {t.partyName || 'সাধারণ পার্টি'}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[11px]",
                                method === 'Cash' && "bg-slate-50 text-slate-700 border-slate-200",
                                method === 'Bank' && "bg-blue-50 text-blue-700 border-blue-200",
                                method === 'Check' && "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {method === 'Cash' && '💵 নগদ'}
                                {method === 'Bank' && '🏦 ব্যাংক'}
                                {method === 'Check' && '📄 চেক'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-900 text-sm">
                              <span className={isIncome ? "text-emerald-700" : isExpense ? "text-orange-700" : "text-blue-700"}>
                                {isIncome ? '+' : isExpense ? '-' : '+'} ৳ {toBengaliDigits((t.amount || 0).toLocaleString('bn-BD'))}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-slate-500 max-w-[150px] truncate" title={t.referenceNo || t.description}>
                              {toBengaliDigits(t.referenceNo || t.description || '—')}
                            </TableCell>
                            
                            {/* 3-DOT ACTION MENU BUTTON */}
                            <TableCell className="text-center py-3 px-4" onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleToggleMenu(e, t.id)}
                                className={cn(
                                  "h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors",
                                  openMenuId === t.id && "bg-slate-100 text-slate-900"
                                )}
                                title="মেনু"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* TABLE FOOTER WITH PAGINATION */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-semibold">
                    মোট {toBengaliDigits(filteredTransactions.length)} টি রেকর্ড দেখানো হচ্ছে
                  </span>

                  <div className="flex items-center gap-1 font-bold">
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">«</button>
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">&lt;</button>
                    <button className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-lg">১</button>
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">২</button>
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">৩</button>
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">&gt;</button>
                    <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">»</button>
                  </div>
                </div>
              </Card>

              {/* FLOATING FIXED 3-DOT ACTION MENU (NEVER CLIPPED BY FRAME/CARD/OVERFLOW) */}
              {openMenuId && menuPos && (() => {
                const activeMenuTxn = transactions.find(t => t.id === openMenuId);
                if (!activeMenuTxn) return null;
                return (
                  <div 
                    style={{
                      position: 'fixed',
                      top: `${menuPos.top}px`,
                      left: `${Math.max(10, menuPos.left)}px`,
                      transform: menuPos.openUp ? 'translateY(-100%)' : 'none',
                      zIndex: 99999
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-44 bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 animate-in fade-in-50 zoom-in-95 duration-100 font-bengali text-xs"
                  >
                    {/* 1. View / বিস্তারিত দেখুন */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        setSelectedTxnForView(activeMenuTxn);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-bold transition-colors text-left"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>বিস্তারিত দেখুন</span>
                    </button>

                    {/* 2. Edit / সম্পাদনা */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        handleEditTransaction(activeMenuTxn);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-colors text-left"
                    >
                      <Edit2 className="w-4 h-4 text-emerald-600" />
                      <span>সম্পাদনা করুন</span>
                    </button>

                    {/* 3. Print / প্রিন্ট */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        setSelectedTxnForView(activeMenuTxn);
                        setTimeout(() => {
                          printElement('printable-memo-wrapper');
                        }, 300);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-bold transition-colors text-left"
                    >
                      <Printer className="w-4 h-4 text-purple-600" />
                      <span>প্রিন্ট ভাউচার</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* 4. Delete / মুছে ফেলুন */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setMenuPos(null);
                        handleDelete(activeMenuTxn);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  </div>
                );
              })()}

            </div>

            {/* RIGHT 3 COLUMNS: TODAY'S COLLECTION BREAKDOWN & REPORT SHORTCUTS */}
            <div className="lg:col-span-3 space-y-5">
              
              {/* CARD 1: আজকের সংগ্রহ */}
              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
                <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  আজকের সংগ্রহ ({toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))})
                </Label>

                <div className="space-y-3 text-xs">
                  <h3 className="text-2xl font-black text-slate-900">
                    ৳ {toBengaliDigits(todayTotalAmount.toLocaleString('bn-BD'))}
                  </h3>

                  <div className="space-y-2 pt-2 border-t border-slate-100 font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ক্যাশ</span>
                      <span className="font-bold text-emerald-600">৳ {toBengaliDigits(todayCashAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ব্যাংক</span>
                      <span className="font-bold text-blue-600">৳ {toBengaliDigits(todayBankAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">চেক</span>
                      <span className="font-bold text-amber-600">৳ {toBengaliDigits(todayCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="border-b border-dashed border-slate-200 my-1"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">পেন্ডিং চেক</span>
                      <span className="font-bold text-amber-600">৳ {toBengaliDigits(pendingCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">বাউন্স চেক</span>
                      <span className="font-bold text-rose-600">৳ {toBengaliDigits(bouncedCheckAmount.toLocaleString('bn-BD'))}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* CARD 2: রিপোর্ট শর্টকাট */}
              <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3">
                <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  রিপোর্ট শর্টকাট
                </Label>

                <div className="space-y-2 text-xs font-bold">
                  {[
                    'পেমেন্ট সারাংশ রিপোর্ট',
                    'কাস্টমার ভিত্তিক আদায় রিপোর্ট',
                    'পেমেন্ট পদ্ধতি রিপোর্ট',
                    'পেন্ডিং চেক রিপোর্ট',
                    'বাউন্স চেক রিপোর্ট'
                  ].map((report, idx) => (
                    <a 
                      key={idx}
                      href="/reports/sales" 
                      className="p-2.5 bg-slate-50 hover:bg-orange-50/60 rounded-xl flex items-center gap-2 text-slate-700 hover:text-orange-600 transition-colors border border-slate-100"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-500" />
                      <span>{report}</span>
                    </a>
                  ))}
                </div>
              </Card>

              {/* CARD 3: দ্রষ্টব্য (NOTICE CARD) */}
              <Card className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2 text-amber-900 text-xs">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Lightbulb className="w-4 h-4 text-amber-600" /> দ্রষ্টব্য
                </p>
                <p className="text-[11px] font-medium text-amber-800">
                  এখানে সর্বশেষ পেমেন্টগুলো দেখানো হচ্ছে। আরো বিস্তারিত দেখতে রিপোর্ট ব্যবহার করুন।
                </p>
              </Card>

            </div>

          </div>
        </div>
        ) : (
          /* IN-PAGE FRAMED PAYMENT FORM VIEW */
          <div className="w-full bg-slate-100 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden flex flex-col min-h-[calc(100vh-100px)] font-bengali animate-in fade-in duration-300">
            
            {/* FRAMED TOP HEADER BAR */}
            <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex items-center justify-between shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-md h-9 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span>তালিকায় ফিরে যান</span>
                </Button>

                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingTransactionId
                      ? (paymentType === 'income' ? 'পেমেন্ট গ্রহণ সম্পাদনা' : 'পেমেন্ট প্রদান সম্পাদনা')
                      : (paymentType === 'income' ? 'নতুন পেমেন্ট গ্রহণ এন্ট্রি' : 'নতুন পেমেন্ট প্রদান এন্ট্রি')}
                  </h1>
                  
                  {/* PAYMENT ID BADGE */}
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    আইডি: {toBengaliDigits(autoPaymentId)}
                  </span>

                  {/* STATUS BADGE */}
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold">
                    {editingTransactionId ? 'সম্পাদনা মোড' : 'নতুন খসড়া'}
                  </span>
                </div>
              </div>

              {/* TOP RIGHT CLOSE & RECEIPT PREVIEW */}
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  onClick={() => setIsPrintMemoOpen(true)}
                  variant="outline"
                  className="rounded-md h-9 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 font-bold text-xs"
                >
                  <Printer className="w-4 h-4 mr-1.5 text-blue-600" /> রসিদ প্রি-ভিউ
                </Button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors ml-2"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE FORM BODY & STICKY FOOTER */}
            <form onSubmit={handleSubmitPaymentForm} className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="p-4 md:p-6 w-full space-y-6 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT 8 COLUMNS: CUSTOMER / PAYMENT / BANK / ATTACHMENT CARDS */}
                  <div className="lg:col-span-8 space-y-5">
                    
                    {/* CARD 1: CUSTOMER / SUPPLIER INFO */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          {paymentType === 'income' ? 'কাস্টমার তথ্য' : 'সাপ্লায়ার তথ্য'}
                        </Label>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                          
                          {/* Searchable Customer / Supplier Selection */}
                          <div className="sm:col-span-5 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">
                              {paymentType === 'income' ? 'কাস্টমার নির্বাচন করুন (সার্চ করুন) *' : 'সাপ্লায়ার নির্বাচন করুন (সার্চ করুন) *'}
                            </Label>
                            {paymentType === 'income' ? (
                              <CustomerSearchSelect
                                customers={customers}
                                selectedCustomer={selectedParty}
                                onSelectCustomer={(cust) => {
                                  handleSelectParty(cust ? cust.id : '');
                                }}
                                placeholder="কাস্টমারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                              />
                            ) : (
                              <SupplierSearchSelect
                                suppliers={suppliers}
                                selectedSupplier={selectedParty}
                                onSelectSupplier={(supp) => {
                                  handleSelectParty(supp ? supp.id : '');
                                }}
                                placeholder="সাপ্লায়ারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                              />
                            )}
                          </div>

                          {/* Customer Name */}
                          <div className="sm:col-span-3 space-y-1">
                            <Label className="text-xs font-bold text-slate-500">
                              {paymentType === 'income' ? 'কাস্টমার নাম' : 'সাপ্লায়ার নাম'}
                            </Label>
                            <p className="text-sm font-black text-slate-900 pt-1.5">
                              {selectedParty?.name || '—'}
                            </p>
                          </div>

                          {/* Mobile Number */}
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-xs font-bold text-slate-500">মোবাইল নম্বর</Label>
                            <p className="text-sm font-bold text-slate-700 font-mono pt-1.5">
                              {toBengaliDigits(selectedParty?.phone || '—')}
                            </p>
                          </div>

                          {/* Due Balance */}
                          <div className="sm:col-span-2 space-y-1 text-right">
                            <Label className="text-xs font-bold text-slate-500">বকেয়া পরিমাণ</Label>
                            <p className="text-base font-black text-rose-600 pt-1">
                              ৳ {toBengaliDigits((selectedParty?.totalDue || 0).toLocaleString('bn-BD'))}
                            </p>
                          </div>

                          {/* Sales Invoice Select (Optional) */}
                          <div className="sm:col-span-12 space-y-1.5 pt-2 border-t border-slate-100">
                            <Label className="text-xs font-bold text-slate-600">
                              {paymentType === 'income' ? 'বিক্রয় ইনভয়েস (ঐচ্ছিক)' : 'ক্রয় ইনভয়েস (ঐচ্ছিক)'}
                            </Label>
                            <Select value={selectedInvoiceId} onValueChange={(val: string | null) => { if (val) handleSelectInvoice(val); }}>
                              <SelectTrigger className="rounded-md h-10 bg-slate-50/50 border-slate-200 font-bold text-xs">
                                <SelectValue placeholder="ইনভয়েস নির্বাচন করুন..." />
                              </SelectTrigger>
                              <SelectContent className="font-bengali text-xs font-bold max-h-60 z-[99999]">
                                {availableInvoices.map(inv => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {toBengaliDigits(`INV-2026-${inv.id.slice(-6)}`)} — ৳ {toBengaliDigits((inv.totalAmount || 0).toLocaleString('bn-BD'))} (বকেয়া: ৳{toBengaliDigits((inv.dueAmount || 0).toLocaleString('bn-BD'))})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                        </div>
                      </CardContent>
                    </Card>

                    {/* CARD 2: PAYMENT INFO */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          পেমেন্ট এন্ট্রি বিবরণ
                        </Label>

                        <div className="space-y-3 pt-1 font-bengali">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            
                            {/* Payment Date */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট তারিখ *</Label>
                              <Input 
                                type="text"
                                value={paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}
                                onChange={e => setPaymentDate(e.target.value)}
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                              />
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">পেমেন্ট মাধ্যম *</Label>
                              <Select value={paymentMethod} onValueChange={(val: string | null) => setPaymentMethod(val || 'Cash')}>
                                <SelectTrigger className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali">
                                  <SelectValue>
                                    {paymentMethod === 'Cash' ? '💵 নগদ (Cash)' :
                                     paymentMethod === 'Split' ? '💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)' :
                                     paymentMethod === 'Cheque' || paymentMethod === 'Check' ? '📄 চেক (Cheque)' :
                                     paymentMethod === 'Bank' ? '🏦 ব্যাংক ট্রান্সফার' :
                                     paymentMethod === 'BankToBank' ? '🔄 ব্যাংক-টু-ব্যাংক' : '💵 নগদ (Cash)'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                  <SelectItem value="Cash">💵 নগদ (Cash)</SelectItem>
                                  <SelectItem value="Split">💵+📄 নগদ ও চেক (স্প্লিট পেমেন্ট)</SelectItem>
                                  <SelectItem value="Cheque">📄 চেক (Cheque)</SelectItem>
                                  <SelectItem value="Bank">🏦 ব্যাংক ট্রান্সফার</SelectItem>
                                  <SelectItem value="BankToBank">🔄 ব্যাংক-টু-ব্যাংক</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {paymentMethod === 'Split' ? (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-700">নগদ জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="number"
                                    value={cashPaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setCashPaidAmount(val);
                                      setPaidAmount(val + chequePaidAmount);
                                    }}
                                    placeholder="যেমন: ১০,০০০"
                                    className="rounded-md h-10 bg-emerald-50/70 border-emerald-300 text-xs font-black text-emerald-700 font-bengali"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-slate-700">চেক জমার পরিমাণ (৳)</Label>
                                  <Input 
                                    type="number"
                                    value={chequePaidAmount || ''}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setChequePaidAmount(val);
                                      setPaidAmount(cashPaidAmount + val);
                                    }}
                                    placeholder="যেমন: ৭০,০০০"
                                    className="rounded-md h-10 bg-purple-50/70 border-purple-300 text-xs font-black text-purple-700 font-bengali"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-600">
                                  {paymentType === 'income' ? 'পরিশোধিত জমার পরিমাণ (৳) *' : 'পরিশোধিত প্রদেয় পরিমাণ (৳) *'}
                                </Label>
                                <Input 
                                  type="number"
                                  value={paidAmount || ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setPaidAmount(val);
                                    if (paymentMethod === 'Cash') setCashPaidAmount(val);
                                    if (paymentMethod === 'Cheque' || paymentMethod === 'Check') setChequePaidAmount(val);
                                  }}
                                  placeholder="০.০০"
                                  className="rounded-md h-10 bg-emerald-50/60 border-emerald-200 text-xs font-black text-emerald-600 font-bengali"
                                />
                              </div>
                            )}
                            </div>

                          {/* Extra Row: Discount, Reference, Note */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">ছাড় / অ্যাডজাস্টমেন্ট (ঐচ্ছিক)</Label>
                              <Input 
                                type="number"
                                value={discountAmount || ''}
                                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                placeholder="০"
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-bold font-bengali"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">রেফারেন্স নং (ঐচ্ছিক)</Label>
                              <Input 
                                value={referenceNo}
                                onChange={e => setReferenceNo(e.target.value)}
                                placeholder="যেমন: REF-102"
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-mono font-bold"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-600">নোট (ঐচ্ছিক)</Label>
                              <Input 
                                value={paymentNote}
                                onChange={e => setPaymentNote(e.target.value)}
                                placeholder="পেমেন্টের বিস্তারিত নোট..."
                                className="rounded-md h-10 bg-slate-50 border-slate-200 text-xs font-medium font-bengali"
                              />
                            </div>
                          </div>

                          {/* BANK DETAILS */}
                          {paymentMethod === 'Bank' && (
                            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-blue-900 flex items-center gap-1">
                                🏦 ব্যাংক ট্রান্সফার তথ্য
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">
                                    {paymentType === 'income' 
                                      ? 'দোকানের ব্যাংক অ্যাকাউন্ট নির্বাচন করুন *' 
                                      : 'প্রাপক / সাপ্লায়ারের ব্যাংক ও অ্যাকাউন্ট নম্বর *'}
                                  </Label>
                                  {paymentType === 'income' ? (
                                    <Select 
                                      value={selectedShopBank || bankName || availableBankOptions[0]?.value} 
                                      onValueChange={(val: string | null) => {
                                        const selectedVal = val || '';
                                        setSelectedShopBank(selectedVal);
                                        setBankName(selectedVal);
                                      }}
                                    >
                                      <SelectTrigger className="h-9 rounded-md bg-white text-xs font-bold border-blue-200">
                                        <SelectValue placeholder="দোকানের ব্যাংক অ্যাকাউন্ট নির্বাচন করুন..." />
                                      </SelectTrigger>
                                      <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                        {availableBankOptions.map((b) => (
                                          <SelectItem key={b.value} value={b.value}>
                                            {b.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input 
                                      placeholder="যেমন: প্রাপক ব্যাংক নাম, শাখা ও অ্যাকাউন্ট নং" 
                                      value={bankName} 
                                      onChange={e => {
                                        setBankName(e.target.value);
                                        setSelectedShopBank(e.target.value);
                                      }}
                                      className="h-9 rounded-md bg-white text-xs font-bengali"
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি (ঐচ্ছিক)</Label>
                                  <Input 
                                    placeholder="যেমন: TXN-123456" 
                                    value={transactionRef} 
                                    onChange={e => setTransactionRef(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* BANK TO BANK TRANSFER DETAILS */}
                          {paymentMethod === 'BankToBank' && (
                            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-md space-y-3 font-bengali text-xs animate-in fade-in-0">
                              <p className="font-bold text-indigo-900 flex items-center gap-1">
                                🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার বিস্তারিত
                              </p>
                              
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-indigo-950 block">
                                  ১. গ্রহীতার ব্যাংক অ্যাকাউন্ট (দোকানের সেভ করা অ্যাকাউন্ট)
                                </Label>
                                <Select value={selectedShopBank} onValueChange={(val: string | null) => setSelectedShopBank(val || '')}>
                                  <SelectTrigger className="h-9 rounded-md bg-white text-xs font-bold border-indigo-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-bengali text-xs font-bold z-[99999]">
                                    <SelectItem value="ডাচ-বাংলা ব্যাংক - 123.456.7890">ডাচ-বাংলা ব্যাংক (DBBL) - A/C: 123.456.7890</SelectItem>
                                    <SelectItem value="ইসলামী ব্যাংক - 2050.1234.5678">ইসলামী ব্যাংক (IBBL) - A/C: 2050.1234.5678</SelectItem>
                                    <SelectItem value="ব্র্যাক ব্যাংক - 1501.2039.4857">ব্র্যাক ব্যাংক (BRAC Bank) - A/C: 1501.2039.4857</SelectItem>
                                    <SelectItem value="সিটি ব্যাংক - 3101.9876.5432">সিটি ব্যাংক (City Bank) - A/C: 3101.9876.5432</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-indigo-100">
                                <Label className="text-[10px] font-bold text-slate-700 block">
                                  ২. প্রেরকের ব্যাংক তথ্য
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">প্রেরক ব্যাংকের নাম</Label>
                                    <Input 
                                      placeholder="যেমন: ইবিএল / প্রাইম ব্যাংক" 
                                      value={senderBankName} 
                                      onChange={e => setSenderBankName(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-bengali"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-bold text-slate-600">প্রেরকের অ্যাকাউন্ট নং / নাম</Label>
                                    <Input 
                                      placeholder="A/C No or Name" 
                                      value={senderAccountNo} 
                                      onChange={e => setSenderAccountNo(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-mono"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-[10px] font-bold text-slate-600">ট্রানজেকশন / রেফারেন্স আইডি</Label>
                                    <Input 
                                      placeholder="Txn ID / Ref No" 
                                      value={senderTxnRef} 
                                      onChange={e => setSenderTxnRef(e.target.value)}
                                      className="h-9 rounded-md bg-white text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CHEQUE DETAILS */}
                          {(paymentMethod === 'Cheque' || paymentMethod === 'Check' || paymentMethod === 'Split' || chequePaidAmount > 0) && (
                            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-md space-y-2 font-bengali text-xs animate-in fade-in-0 shadow-2xs">
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
                                    className="h-9 rounded-md bg-white text-xs font-bengali"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-purple-900">চেক নম্বর</Label>
                                  <Input 
                                    placeholder="CQ-10023" 
                                    value={chequeNo} 
                                    onChange={e => setChequeNo(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-bold text-purple-900">চেকের তারিখ</Label>
                                  <Input 
                                    type="text" 
                                    value={chequeDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))} 
                                    onChange={e => setChequeDate(e.target.value)}
                                    className="h-9 rounded-md bg-white text-xs font-bengali font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </CardContent>
                    </Card>

                    {/* CARD 4: ATTACHMENTS */}
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-3">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-700 flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-blue-600" />
                          সংযুক্তি (ঐচ্ছিক)
                        </Label>

                        {/* File Dropzone */}
                        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-md p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50">
                          <UploadCloud className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                          <p className="text-xs font-bold text-slate-700">ফাইল ড্রাপ করুন অথবা ক্লিক করে আপলোড করুন</p>
                          <p className="text-[10px] text-slate-400 mt-1">সাপোর্টেড ফরম্যাট: JPG, PNG, PDF (সর্বোচ্চ 5MB)</p>
                        </div>
                      </CardContent>
                    </Card>

                  </div>

                  {/* RIGHT 4 COLUMNS: PAYMENT SUMMARY SIDEBAR CARD */}
                  <div className="lg:col-span-4 space-y-5">
                    
                    <Card className="bg-white border border-slate-200/80 rounded-md shadow-2xs">
                      <CardContent className="p-5 space-y-4">
                        <Label className="text-xs uppercase tracking-wider font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-orange-600" />
                          পেমেন্ট সারসংক্ষেপ
                        </Label>

                        {/* Financial Summary Lines */}
                        <div className="space-y-3 text-xs">
                          
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500 font-semibold">ইনভয়েস মোট</span>
                            <span className="font-bold text-slate-800">৳ {toBengaliDigits((totalInvoiceAmount || 0).toLocaleString('bn-BD'))}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500 font-semibold">পূর্ববর্তী পরিশোধ</span>
                            <span className="font-bold text-slate-800">৳ {toBengaliDigits((previousPaidAmount || 0).toLocaleString('bn-BD'))}</span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-slate-100 bg-emerald-50/50 p-2 rounded-md">
                            <span className="font-bold text-emerald-800">বর্তমান পেমেন্ট</span>
                            <span className="font-black text-emerald-600 text-sm">৳ {toBengaliDigits((currentPaymentAmount || 0).toLocaleString('bn-BD'))}</span>
                          </div>

                          {/* Dashed Separator */}
                          <div className="border-b border-dashed border-slate-200 my-2"></div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest block">অবশিষ্ট বকেয়া</span>
                            <span className="text-2xl font-black text-rose-600 block">
                              ৳ {toBengaliDigits((remainingDue || 0).toLocaleString('bn-BD'))}
                            </span>
                          </div>
                        </div>

                        {/* Quick Metadata List */}
                        <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">পেমেন্ট পদ্ধতি</span>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[11px]">
                              🏦 {paymentMethod === 'Cash' ? 'নগদ' : paymentMethod === 'Bank' ? 'ব্যাংক' : paymentMethod === 'Cheque' || paymentMethod === 'Check' ? 'চেক' : paymentMethod}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">পেমেন্ট তারিখ</span>
                            <span className="font-bold text-slate-700">{paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">রেফারেন্স নং</span>
                            <span className="font-mono font-bold text-slate-700">{toBengaliDigits(referenceNo || '—')}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">স্ট্যাটাস</span>
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">
                              নতুন খসড়া
                            </span>
                          </div>
                        </div>

                        {/* Security Notice Box */}
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-md flex items-center gap-2.5 text-xs text-emerald-900 mt-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="font-black text-emerald-950">নিরাপদ লেনদেন</p>
                            <p className="text-[10px] text-emerald-700 font-semibold">এই পেমেন্টটি সংরক্ষিত ও নিরাপদে রাখা হবে।</p>
                          </div>
                        </div>

                      </CardContent>
                    </Card>

                  </div>

                </div>
              </div>

              {/* STICKY BOTTOM ACTION FOOTER INSIDE FRAME */}
              <div className="bg-white border-t border-slate-300 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs font-bengali flex-shrink-0 rounded-b-md">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>💡 তথ্য নিশ্চিত হয়ে সংরক্ষণ বাটন চাপুন। এটি লেনদেনের তালিকায় যুক্ত হবে।</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-md h-10 px-5 text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    বাতিল করুন
                  </Button>

                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md h-10 px-6 text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    💾 পেমেন্ট সংরক্ষণ করুন ✓
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* MONEY RECEIPT MEMO PRINT MODAL */}
        {isPrintMemoOpen && (
          <Dialog open={isPrintMemoOpen} onOpenChange={setIsPrintMemoOpen}>
            <DialogContent className="max-w-xl rounded-3xl p-6 bg-white font-bengali">
              <div className="p-6 border border-slate-200 rounded-2xl space-y-5 bg-white">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">ব্রাদার্স ট্রেডার্স</h2>
                    <p className="text-xs text-slate-500">রড ও সিমেন্ট হোলসেল দোকান, মিরপুর, ঢাকা</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold block mb-1">
                      টাকা প্রাপ্তি রসিদ (Money Receipt)
                    </span>
                    <p className="text-xs font-mono text-slate-500">আইডি: {toBengaliDigits(autoPaymentId)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 font-semibold">প্রদানকারী (কাস্টমার):</p>
                    <p className="font-black text-slate-900 text-sm">{selectedParty?.name || '—'}</p>
                    <p className="text-slate-500">{toBengaliDigits(selectedParty?.phone || '—')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 font-semibold">তারিখ &amp; মাধ্যম:</p>
                    <p className="font-bold text-slate-800">{paymentDate || toBengaliDigits(format(new Date(), 'dd/MM/yyyy'))}</p>
                    <p className="font-bold text-blue-700">{paymentMethod === 'Cash' ? 'নগদ' : paymentMethod === 'Bank' ? 'ব্যাংক' : 'চেক'} ({bankTxnType})</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase">প্রাপ্তি পরিমাণ</p>
                  <p className="text-3xl font-black text-emerald-600">৳ {toBengaliDigits((paidAmount || 0).toLocaleString('bn-BD'))}</p>
                </div>

                <div className="flex justify-between items-center pt-8 text-xs font-bold text-slate-500 border-t border-slate-100">
                  <span>গ্রাহকের স্বাক্ষর</span>
                  <span>ক্যাশিয়ারের স্বাক্ষর</span>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsPrintMemoOpen(false)} className="rounded-xl font-bold text-xs">
                  বন্ধ করুন
                </Button>
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs">
                  <Printer className="w-4 h-4 mr-1.5" /> প্রিন্ট করুন
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}



        {/* ADD MONEY (টাকা যোগ) MODAL DIALOG */}
        <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
          <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl font-bengali">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-blue-600" /> টাকা যোগ করুন (Add Money)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Category / Source */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">টাকা যোগের খাত / ধরন *</Label>
                <Select value={addMoneyCategory} onValueChange={(val: string | null) => val && setAddMoneyCategory(val)}>
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-bengali text-xs font-bold">
                    <SelectItem value="ক্যাশে জমা (Add Cash)">ক্যাশে জমা (Add Cash)</SelectItem>
                    <SelectItem value="ব্যাংক ডিপোজিট (Bank Deposit)">ব্যাংক ডিপোজিট (Bank Deposit)</SelectItem>
                    <SelectItem value="মালিকের মূলধন যোগ (Owner Capital)">মালিকের মূলধন যোগ (Owner Capital)</SelectItem>
                    <SelectItem value="অন্যান্য আয় (Other Income)">অন্যান্য আয় (Other Income)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">টাকার পরিমাণ (৳) *</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={addMoneyAmount || ''}
                    onChange={e => setAddMoneyAmount(parseFloat(e.target.value) || 0)}
                    className="rounded-xl h-11 pl-9 bg-slate-50/50 border-slate-200 text-base font-black text-blue-600 text-right font-bengali"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">পেমেন্ট মাধ্যম *</Label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAddMoneyMethod('Cash')}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                      addMoneyMethod === 'Cash' 
                        ? "bg-white text-blue-700 border-2 border-blue-500 shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    💵 নগদ (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMoneyMethod('Bank')}
                    className={cn(
                      "h-10 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                      addMoneyMethod === 'Bank' 
                        ? "bg-white text-blue-700 border-2 border-blue-500 shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🏦 ব্যাংক (Bank)
                  </button>
                </div>
              </div>

              {/* Select Bank if Bank is selected */}
              {addMoneyMethod === 'Bank' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">ব্যাংক অ্যাকাউন্ট নির্বাচন করুন *</Label>
                  <Select value={addMoneyBankId} onValueChange={(val: string | null) => val && setAddMoneyBankId(val)}>
                    <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="ব্যাংক পছন্দ করুন..." />
                    </SelectTrigger>
                    <SelectContent className="font-bengali text-xs font-bold max-h-48">
                      {banks.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name} ({b.accNo}) — ৳{toBengaliDigits(b.balance.toLocaleString('bn-BD'))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">তারিখ *</Label>
                <Input 
                  type="date"
                  value={addMoneyDate}
                  onChange={e => setAddMoneyDate(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">নোট / বিবরণী (ঐচ্ছিক)</Label>
                <Input 
                  placeholder="যেমন: ক্যাশ বক্সে টাকা জমা..."
                  value={addMoneyNote}
                  onChange={e => setAddMoneyNote(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddMoneyOpen(false)} className="rounded-xl font-bold h-11 text-xs">
                বাতিল
              </Button>
              <Button onClick={handleCreateAddMoneySubmit} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 px-6 shadow-md shadow-blue-600/20 text-xs">
                <Check className="w-4 h-4 mr-1.5" /> টাকা যোগ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </Shell>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bengali">লোড হচ্ছে...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
