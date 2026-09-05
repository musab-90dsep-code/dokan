'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { cn, fixMiliName, toBnNum, formatBnCurrency } from '@/lib/utils';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  User, 
  AlertCircle, 
  Banknote, 
  PackageCheck, 
  TrendingDown, 
  ArrowRight, 
  History, 
  Zap, 
  Receipt, 
  Truck, 
  Package, 
  UserPlus, 
  Wallet, 
  Landmark, 
  BarChart3, 
  BookOpen, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  ChevronRight,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  ArrowRightLeft,
  Scale,
  Settings,
  AlertTriangle,
  FileText,
  Percent,
  Layers,
  Layers2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api, DashboardStats } from '@/lib/api';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

interface Order {
  id: string;
  orderId?: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items?: OrderItem[];
  createdAt: any;
}

interface Purchase {
  id: string;
  supplierName?: string;
  totalPrice?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  createdAt: any;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock?: number;
  unit?: string;
  sellPrice?: number;
}

interface Customer {
  id: string;
  name: string;
  totalDue?: number;
}

interface Bank {
  id: string;
  name: string;
  balance: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  accountType?: string;
  createdAt: any;
}

interface ShortcutAction {
  label: string;
  sub: string;
  tag: string;
  href: string;
  icon: any;
  gradient: string;
  iconShadow: string;
  accentBg: string;
  accentBorder: string;
  accentLine: string;
  accentText: string;
}

const allShortcuts: ShortcutAction[] = [
  { 
    label: 'কাস্টমার যোগ', 
    sub: 'নতুন খরিদ্দার এন্ট্রি', 
    tag: 'কাস্টমার',
    href: '/customers?action=add', 
    icon: UserPlus, 
    gradient: 'from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/25',
    accentBg: 'from-emerald-50/70 via-white to-white',
    accentBorder: 'border-emerald-200/80 hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    accentLine: 'bg-emerald-500',
    accentText: 'group-hover:text-emerald-700',
  },
  { 
    label: 'নতুন বিক্রয়', 
    sub: 'অর্ডার ও বিক্রয় তৈরি', 
    tag: 'বিক্রয়',
    href: '/orders', 
    icon: ShoppingCart, 
    gradient: 'from-[#9b7524] via-[#b88e2d] to-[#d4af37]',
    iconShadow: 'shadow-amber-500/30',
    accentBg: 'from-amber-50/80 via-white to-white',
    accentBorder: 'border-[#e2d7c5] hover:border-[#b88e2d]/60 hover:shadow-amber-500/10',
    accentLine: 'bg-[#b88e2d]',
    accentText: 'group-hover:text-[#9b7524]',
  },
  { 
    label: 'বিক্রয় চালান', 
    sub: 'ইনভয়েস ও মেমো প্রিন্ট', 
    tag: 'চালান কপি',
    href: '/invoices', 
    icon: Receipt, 
    gradient: 'from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/25',
    accentBg: 'from-blue-50/70 via-white to-white',
    accentBorder: 'border-blue-200/80 hover:border-blue-500/60 hover:shadow-blue-500/10',
    accentLine: 'bg-blue-600',
    accentText: 'group-hover:text-blue-700',
  },
  { 
    label: 'পেমেন্ট গ্রহণ', 
    sub: 'বকেয়া টাকা জমা / আদায়', 
    tag: 'কালেকশন',
    href: '/transactions?type=income&action=create', 
    icon: ArrowUpCircle, 
    gradient: 'from-teal-500 to-cyan-600',
    iconShadow: 'shadow-teal-500/25',
    accentBg: 'from-teal-50/70 via-white to-white',
    accentBorder: 'border-teal-200/80 hover:border-teal-500/60 hover:shadow-teal-500/10',
    accentLine: 'bg-teal-600',
    accentText: 'group-hover:text-teal-700',
  },
  { 
    label: 'দৈনন্দিন খরচ', 
    sub: 'দোকান খরচের হিসাব', 
    tag: 'খরচ ভাউচার',
    href: '/expenses', 
    icon: Wallet, 
    gradient: 'from-rose-500 to-pink-600',
    iconShadow: 'shadow-rose-500/25',
    accentBg: 'from-rose-50/70 via-white to-white',
    accentBorder: 'border-rose-200/80 hover:border-rose-500/60 hover:shadow-rose-500/10',
    accentLine: 'bg-rose-600',
    accentText: 'group-hover:text-rose-700',
  },
  { 
    label: 'পণ্য স্টক', 
    sub: 'মজুদ মালামালের খতিয়ান', 
    tag: 'ইনভেন্টরি',
    href: '/inventory', 
    icon: Package, 
    gradient: 'from-purple-500 to-violet-600',
    iconShadow: 'shadow-purple-500/25',
    accentBg: 'from-purple-50/70 via-white to-white',
    accentBorder: 'border-purple-200/80 hover:border-purple-500/60 hover:shadow-purple-500/10',
    accentLine: 'bg-purple-600',
    accentText: 'group-hover:text-purple-700',
  },
];

const getDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function Dashboard() {
  const isMounted = useIsMounted();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchDashboardData = useCallback(() => {
    Promise.all([
      api.dashboard.getStats(),
      api.inventory.list(),
      api.transactions.list({ transaction_type: 'sale' })
    ]).then(([statsData, prodList, txList]) => {
      setStats(statsData);
      const safeProdList = Array.isArray(prodList) ? prodList : [];
      setProducts(safeProdList.map(p => ({
        id: String(p.id),
        name: p.name,
        stock: Number(p.stock || 0),
        minStock: Number(p.min_stock || 10),
        unit: p.unit || 'পিস',
        sellPrice: Number(p.sell_price || 0)
      })));
      const safeTxList = Array.isArray(txList) ? txList : [];
      setOrders(safeTxList.map(t => ({
        id: String(t.id),
        orderId: t.invoice_no,
        customerName: t.party_name || 'গ্রাহক',
        totalAmount: t.total_amount,
        paidAmount: t.paid_amount,
        dueAmount: t.due_amount,
        createdAt: t.created_at
      })));
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener('orderUpdated', fetchDashboardData);
    return () => {
      window.removeEventListener('orderUpdated', fetchDashboardData);
    };
  }, [fetchDashboardData]);

  const totalCashBalance = stats?.totalCash ?? 0;
  const totalBankBalance = stats?.totalBank ?? 0;
  const totalDuesAmount = stats?.totalDues ?? 0;
  const totalMonthlySalesVal = stats?.monthlySales ?? 0;
  const totalMonthlyPurchasesVal = stats?.monthlyPurchases ?? 0;
  const lowStockCount = stats?.lowStockCount ?? 0;
  const recentTransactions = stats?.recentTransactions || [];

  const netProfitVal = Math.max(0, totalMonthlySalesVal - totalMonthlyPurchasesVal);
  const profitMarginPercent = totalMonthlySalesVal > 0 ? Math.min(100, Math.round((netProfitVal / totalMonthlySalesVal) * 100)) : 0;

  const weeklyData = useMemo(() => {
    if (stats?.weeklyData && stats.weeklyData.length > 0) {
      return stats.weeklyData;
    }
    return [
      { name: 'সোম', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'মঙ্গল', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'বুধ', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'বৃহস্পতি', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'শুক্র', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'শনি', বিক্রয়: 0, ক্রয়: 0 },
      { name: 'রবি', বিক্রয়: 0, ক্রয়: 0 },
    ];
  }, [stats]);

  // Real Financial Pie Data
  const financialPieData = useMemo(() => {
    return [
      { name: 'মোট বিক্রয়', value: totalMonthlySalesVal, color: '#f97316' },
      { name: 'মোট ক্রয়', value: totalMonthlyPurchasesVal, color: '#6366f1' },
      { name: 'নিট লাভ', value: netProfitVal, color: '#10b981' },
    ];
  }, [totalMonthlySalesVal, totalMonthlyPurchasesVal, netProfitVal]);

  // Real Inventory Breakdown List
  const stockBreakdown = useMemo(() => {
    if (products.length === 0) {
      return [];
    }

    const maxStock = Math.max(...products.map(p => p.stock || 1), 100);
    const colors = ['bg-orange-500', 'bg-indigo-600', 'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-500'];
    const badges = [
      'bg-orange-50 text-orange-700 border-orange-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-amber-50 text-amber-700 border-amber-200'
    ];

    return products.slice(0, 6).map((p, idx) => {
      const name = fixMiliName(p.name);
      const unit = p.unit || (name.includes('রড') ? 'টন' : 'বস্তা');
      const stockVal = p.stock || 0;
      const percent = Math.min(100, Math.round((stockVal / maxStock) * 100));
      return {
        name,
        stock: `${stockVal.toLocaleString()} ${unit}`,
        percent: Math.max(15, percent),
        color: colors[idx % colors.length],
        badge: badges[idx % badges.length]
      };
    });
  }, [products]);

  // Real Low Stock Warning List
  const lowStockAlertList = useMemo(() => {
    const filtered = products.filter(p => (p.stock || 0) <= (p.minStock || 10));
    if (filtered.length === 0) {
      return [];
    }
    return filtered.slice(0, 4).map(p => ({
      name: fixMiliName(p.name),
      stock: `${p.stock || 0} ${p.unit || 'একক'} বাকি`
    }));
  }, [products]);

  // Real Recent Sales List
  const recentSalesList = useMemo(() => {
    if (orders.length === 0) {
      return [];
    }

    return orders.slice(0, 5).map(o => {
      const firstItemName = o.items && o.items.length > 0 ? fixMiliName(o.items[0].name) : 'পণ্য';
      const extraItems = o.items && o.items.length > 1 ? ` (+${toBnNum(o.items.length - 1)}টি)` : '';
      const itemDesc = `${firstItemName}${extraItems}`;
      
      const d = getDate(o.createdAt);
      const diffMins = Math.max(1, Math.round((new Date().getTime() - d.getTime()) / (1000 * 60)));
      const timeStr = diffMins < 60 ? `${toBnNum(diffMins)} মি আগে` : diffMins < 1440 ? `${toBnNum(Math.round(diffMins / 60))} ঘ আগে` : d.toLocaleDateString('bn-BD');

      const due = o.dueAmount ?? ((o.totalAmount || 0) - (o.paidAmount || 0));
      const paid = o.paidAmount || 0;
      const status = due <= 0 ? 'পরিশোধিত' : paid > 0 ? 'আংশিক' : 'বাকি';

      return {
        customer: o.customerName || 'সম্মানিত কাস্টমার',
        amount: formatBnCurrency(o.totalAmount || 0),
        item: itemDesc,
        time: timeStr,
        status
      };
    });
  }, [orders]);

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full font-bengali">
        
        {/* ==================== STAT CARDS WITH UNIQUE MINI GRAPHS ==================== */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* CARD 1: CASH BALANCE (Smooth Curved Area Chart) */}
          <StatCard 
            title="নগদ ক্যাশ ব্যালেন্স" 
            value={formatBnCurrency(totalCashBalance)} 
            icon={Wallet} 
            trend={totalCashBalance < 0 ? 'ঘাটতি' : 'ক্যাশ'} 
            trendUp={totalCashBalance >= 0} 
            description={totalCashBalance < 0 ? 'ক্যাশ ব্যালেন্স ঘাটতি' : 'গাল্লা ক্যাশ ব্যালেন্স'}
            bg={totalCashBalance < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}
            iconBg={totalCashBalance < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}
            badgeBg={totalCashBalance < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
            graphType="area"
            strokeColor={totalCashBalance < 0 ? '#ef4444' : '#10b981'}
            gradId="cashGrad"
            graphData={weeklyData.map(d => ({ v: d.বিক্রয় }))}
          />

          {/* CARD 2: BANK BALANCE (Stepped Line Chart) */}
          <StatCard 
            title="ব্যাংক ব্যালেন্স" 
            value={formatBnCurrency(totalBankBalance)} 
            icon={Landmark} 
            trend={totalBankBalance < 0 ? 'ঘাটতি' : 'ব্যাংক জমা'} 
            trendUp={totalBankBalance >= 0} 
            description={totalBankBalance < 0 ? 'ব্যাংক ব্যালেন্স মাইনাস' : 'ব্যাংক অ্যাকাউন্টের জমা'}
            bg={totalBankBalance < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}
            iconBg={totalBankBalance < 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}
            badgeBg={totalBankBalance < 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}
            graphType="step"
            strokeColor={totalBankBalance < 0 ? '#ef4444' : '#3b82f6'}
            graphData={weeklyData.map(d => ({ v: d.ক্রয় }))}
          />

          {/* CARD 3: TOTAL DUES (Pillar Bar Histogram Chart) */}
          <StatCard 
            title="মোট বকেয়া পাওনা" 
            value={formatBnCurrency(totalDuesAmount)} 
            icon={Banknote} 
            trend="কাস্টমার পাওনা" 
            trendUp={false} 
            description="ক্রেতাদের বকেয়া পাওনা"
            bg="bg-gradient-to-br from-rose-500 to-pink-600"
            iconBg="bg-rose-100 text-rose-600"
            badgeBg="bg-rose-100 text-rose-700"
            graphType="bar"
            strokeColor="#f43f5e"
            graphData={weeklyData.map(d => ({ v: Math.max(0, d.বিক্রয় - d.ক্রয়) }))}
          />

          {/* CARD 4: MONTHLY SALES (Double Spline & Target Line Chart) */}
          <StatCard 
            title="চলতি মাসের বিক্রি" 
            value={formatBnCurrency(totalMonthlySalesVal)} 
            icon={TrendingUp} 
            trend="বিক্রি" 
            trendUp={true} 
            description="চলতি মাসের সেলস"
            bg="bg-gradient-to-br from-[#8c6b1c] via-[#b88e2d] to-[#d4af37]"
            iconBg="bg-amber-100/90 text-amber-800"
            badgeBg="bg-amber-100 text-amber-800"
            graphType="double-line"
            strokeColor="#b88e2d"
            graphData={weeklyData.map(d => ({ v: d.বিক্রয়, t: d.ক্রয় }))}
          />

          {/* CARD 5: STOCK ALERT (Segmented Pulse Warning Bar Chart) */}
          <StatCard 
            title="স্টক সতর্কতা" 
            value={`${toBnNum(lowStockCount)}টি পণ্য`} 
            icon={AlertCircle} 
            trend="রিফিল" 
            trendUp={false} 
            description="পুনরায় অর্ডার প্রয়োজন"
            bg="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600"
            iconBg="bg-amber-100 text-amber-800"
            badgeBg="bg-amber-100 text-amber-800"
            graphType="segmented-bars"
            graphData={products.length > 0 ? products.slice(0, 7).map(p => ({ v: p.stock })) : [{ v: 0 }]}
          />
        </div>

        {/* ==================== QUICK SHORTCUTS ROW (FULL WIDTH BALANCED 6-COL TILES) ==================== */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-4.5 shadow-sm space-y-3 font-bengali w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#8c6b1c] via-[#b88e2d] to-[#d4af37] text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                <Zap className="w-4 h-4 fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-none">দ্রুত শর্টকাট ও কার্যক্রম</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                    {toBnNum(allShortcuts.length)}টি অ্যাকশন
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">দোকানের প্রধান ও নিয়মিত কার্যক্রমগুলো এক ক্লিকে সম্পন্ন করুন</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60">
                <Sparkles className="w-3 h-3 text-[#b88e2d]" /> এক ক্লিকে সরাসরি প্রবেশ
              </span>
            </div>
          </div>

          {/* Full-width Balanced Grid - 6 columns on lg, 3 on sm, 2 on xs - ZERO empty space */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
            {allShortcuts.map((action) => (
              <Link 
                key={action.href} 
                href={action.href}
                className={cn(
                  "group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border bg-gradient-to-b transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 overflow-hidden",
                  action.accentBg,
                  action.accentBorder
                )}
              >
                {/* Top subtle accent highlight bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 transition-all duration-300 opacity-60 group-hover:opacity-100", action.accentLine)} />

                {/* Top Row: Icon + Tag Badge */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br flex-shrink-0",
                    action.gradient,
                    action.iconShadow
                  )}>
                    <action.icon className="w-4 h-4" />
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-600 border border-slate-200/70 shadow-2xs group-hover:border-slate-300 transition-colors">
                    {action.tag}
                  </span>
                </div>

                {/* Bottom Content: Title + Subtitle + Micro hover arrow */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={cn(
                      "text-xs sm:text-[13px] font-black text-slate-900 tracking-tight transition-colors leading-snug truncate",
                      action.accentText
                    )}>
                      {action.label}
                    </h4>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </div>

                  <p className="text-[9.5px] sm:text-[10px] text-slate-400 group-hover:text-slate-600 font-medium leading-tight truncate">
                    {action.sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ==================== MAIN ANALYSIS ROW ==================== */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Area Chart: Weekly Trends */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 font-bengali">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">সাপ্তাহিক লেনদেন বিশ্লেষণ</h3>
                <p className="text-xs font-semibold text-slate-400">গত ৭ দিনের বিক্রি ও ক্রয়ের তুলনামূলক চার্ট</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-slate-600">বিক্রয়</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">ক্রয়</span>
                </div>
                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-200">এই সপ্তাহ</span>
              </div>
            </div>
            <div className="p-6 h-[300px] w-full min-w-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} className="font-bold" dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${toBnNum((v / 1000).toFixed(0))}কে`} dx={-8} />
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 700, padding: '10px 16px' }} itemStyle={{ color: '#1e293b' }} />
                    <Area type="monotone" dataKey="বিক্রয়" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gSales)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#f97316' }} />
                    <Area type="monotone" dataKey="ক্রয়" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gPurchase)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Current Stock Inventory Breakdown */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80 flex flex-col font-bengali">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <PackageCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">বর্তমান স্টক স্থিতি</h3>
                  <p className="text-[10px] font-bold text-slate-400">রড ও সিমেন্টের বর্তমান মজুদ</p>
                </div>
              </div>
              <Link href="/inventory" className="text-[11px] font-bold text-emerald-600 hover:underline">
                ইনভেন্টরি ➔
              </Link>
            </div>
            <div className="p-5 flex-1 space-y-3.5 overflow-y-auto max-h-[320px]">
              {stockBreakdown.length > 0 ? (
                stockBreakdown.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className={cn('font-black text-[11px] px-2 py-0.5 rounded-md border', item.badge)}>
                        {item.stock}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full transition-all duration-500', item.color)} 
                        style={{ width: `${item.percent}%` }} 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  কোন পণ্য যুক্ত করা হয়নি। ইনভেন্টরি পেজ থেকে পণ্য যুক্ত করুন।
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== RECENT SALES + SUMMARY ==================== */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Recent Sales Table */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                  <History className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-slate-800 text-base">সাম্প্রতিক বিক্রয়</h3>
              </div>
              <Link href="/orders" className="flex items-center gap-1 text-xs text-orange-600 font-black uppercase tracking-widest hover:text-orange-700 transition-colors font-bengali">
                সব দেখুন <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentSalesList.length > 0 ? (
                recentSalesList.map((sale, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group font-bengali">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md transition-transform group-hover:scale-105",
                      i === 0 ? 'bg-orange-500 shadow-orange-200' :
                      i === 1 ? 'bg-indigo-600 shadow-indigo-200' :
                      i === 2 ? 'bg-rose-500 shadow-rose-200' :
                      i === 3 ? 'bg-emerald-500 shadow-emerald-200' :
                      'bg-blue-600 shadow-blue-200'
                    )}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{sale.customer}</p>
                      <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">{sale.item} · {sale.time}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black text-slate-800">{sale.amount}</p>
                      <span className={cn(
                        "inline-flex text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1",
                        sale.status === 'পরিশোধিত' ? 'bg-emerald-100 text-emerald-700' :
                        sale.status === 'আংশিক' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      )}>{sale.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  কোন সাম্প্রতিক বিক্রয় ট্রানজ্যাকশন নেই।
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Monthly Financial Donut Chart Widget (Gol Chart) */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 flex flex-col justify-between font-bengali">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">মাসিক সারসংক্ষেপ</h3>
                    <p className="text-[10px] font-bold text-slate-400">আয়-ব্যয় ও নিট লাভের গোল চার্ট</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> +{toBnNum(profitMarginPercent)}%
                </span>
              </div>

              <div className="flex flex-col items-center py-2 space-y-4">
                {/* Circular Donut Chart */}
                <div className="relative w-44 h-44 flex items-center justify-center min-w-0">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={financialPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={72}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {financialPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400">নিট লাভ</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5">{formatBnCurrency(netProfitVal)}</span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-100">
                      {toBnNum(profitMarginPercent)}% মার্জিন
                    </span>
                  </div>
                </div>

                {/* Donut Chart Legend & Breakdown */}
                <div className="w-full space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-xs font-bold text-slate-700">মোট বিক্রয়</span>
                    </div>
                    <span className="text-xs font-black text-orange-700">{formatBnCurrency(totalMonthlySalesVal)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-xs font-bold text-slate-700">মোট ক্রয়</span>
                    </div>
                    <span className="text-xs font-black text-indigo-700">{formatBnCurrency(totalMonthlyPurchasesVal)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700">নিট লাভ</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700">{formatBnCurrency(netProfitVal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Alert Card */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden font-bengali">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-slate-800 font-black">স্টক সতর্কতা</p>
                </div>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">জরুরি</span>
              </div>
              <div className="p-4 space-y-2">
                {lowStockAlertList.length > 0 ? (
                  lowStockAlertList.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-rose-50/60 hover:bg-rose-50 transition-colors rounded-xl border border-rose-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      </div>
                      <span className="text-[11px] text-rose-600 font-black bg-white px-2.5 py-1 rounded-lg shadow-xs border border-rose-200">{item.stock}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-emerald-600 font-bold bg-emerald-50/60 rounded-xl border border-emerald-100">
                    ✓ কোনো কম স্টক পণ্য নেই! সব পর্যাপ্ত।
                  </div>
                )}
                <Link href="/inventory" className="flex items-center justify-center gap-1 text-xs text-indigo-600 font-black hover:text-indigo-800 pt-1.5 transition-colors">
                  সব পণ্য দেখুন <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  description, 
  bg, 
  iconBg, 
  badgeBg,
  graphType,
  graphData,
  strokeColor,
  gradId
}: any) {
  const isMounted = useIsMounted();

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-200/80 group hover:-translate-y-1 transition-all duration-300 font-bengali flex flex-col justify-between">
      {/* Accent gradient strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-1.5", bg)} />
      
      <div className="relative p-5 pb-2">
        <div className="flex justify-between items-start mb-3">
          <p className="text-xs font-bold text-slate-500 leading-tight">{title}</p>
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0", iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</h3>
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg",
            badgeBg
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 truncate">{description}</span>
        </div>
      </div>

      {/* Unique Mini Graph Area at the Bottom */}
      <div className="h-14 w-full mt-2 overflow-hidden relative min-w-0">
        {isMounted && graphType === 'area' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={graphData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId || 'areaGrad'} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradId || 'areaGrad'})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'step' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={graphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="stepAfter" dataKey="v" stroke={strokeColor} strokeWidth={2.5} dot={{ r: 2.5, fill: strokeColor }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={graphData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <Bar dataKey="v" fill={strokeColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {isMounted && graphType === 'double-line' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={graphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="t" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {graphType === 'segmented-bars' && (
          <div className="flex items-end justify-between px-5 h-full pb-2 gap-1.5">
            {graphData.map((d: any, idx: number) => {
              const heightPercent = Math.min(100, Math.max(25, d.v * 8));
              return (
                <div key={idx} className="flex-1 bg-amber-100/60 rounded-md h-full flex items-end overflow-hidden p-0.5">
                  <div 
                    className={cn("w-full rounded-xs transition-all duration-500", d.v < 7 ? "bg-rose-500 animate-pulse" : "bg-amber-500")} 
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
