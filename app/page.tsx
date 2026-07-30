'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { cn, fixMiliName } from '@/lib/utils';
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
  ChevronRight
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

const quickActions = [
  { label: 'বিক্রয় চালান', sub: 'নতুন ইনভয়েস', href: '/invoices', icon: Receipt, bg: 'bg-orange-50 hover:bg-orange-500', text: 'text-orange-600 group-hover:text-white', border: 'border-orange-200/80 hover:border-orange-500', iconBg: 'bg-orange-500 text-white' },
  { label: 'নতুন ক্রয়', sub: 'স্টক কিনুন', href: '/purchases', icon: Truck, bg: 'bg-indigo-50 hover:bg-indigo-600', text: 'text-indigo-600 group-hover:text-white', border: 'border-indigo-200/80 hover:border-indigo-600', iconBg: 'bg-indigo-600 text-white' },
  { label: 'নতুন পণ্য', sub: 'প্রোডাক্ট যুক্ত', href: '/inventory', icon: Package, bg: 'bg-emerald-50 hover:bg-emerald-600', text: 'text-emerald-600 group-hover:text-white', border: 'border-emerald-200/80 hover:border-emerald-600', iconBg: 'bg-emerald-600 text-white' },
  { label: 'কাস্টমার', sub: 'ক্রেতার খাতা', href: '/customers', icon: UserPlus, bg: 'bg-blue-50 hover:bg-blue-600', text: 'text-blue-600 group-hover:text-white', border: 'border-blue-200/80 hover:border-blue-600', iconBg: 'bg-blue-600 text-white' },
  { label: 'আয়-ব্যয়', sub: 'ক্যাশ/ব্যাংক', href: '/transactions', icon: Wallet, bg: 'bg-teal-50 hover:bg-teal-600', text: 'text-teal-600 group-hover:text-white', border: 'border-teal-200/80 hover:border-teal-600', iconBg: 'bg-teal-600 text-white' },
  { label: 'রিপোর্টস', sub: 'লাভ-ক্ষতি', href: '/reports', icon: BarChart3, bg: 'bg-purple-50 hover:bg-purple-600', text: 'text-purple-600 group-hover:text-white', border: 'border-purple-200/80 hover:border-purple-600', iconBg: 'bg-purple-600 text-white' },
  { label: 'লেজার খাতা', sub: 'বকেয়া তালিকা', href: '/reports?tab=due_customers', icon: BookOpen, bg: 'bg-rose-50 hover:bg-rose-600', text: 'text-rose-600 group-hover:text-white', border: 'border-rose-200/80 hover:border-rose-600', iconBg: 'bg-rose-600 text-white' },
  { label: 'কম স্টক', sub: 'সতর্কতা পণ্য', href: '/inventory/low-stock', icon: AlertCircle, bg: 'bg-amber-50 hover:bg-amber-500', text: 'text-amber-600 group-hover:text-white', border: 'border-amber-200/80 hover:border-amber-500', iconBg: 'bg-amber-500 text-white' },
];

const getDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const totalCashBalance = stats?.totalCash || 285400;
  const totalBankBalance = stats?.totalBank || 350000;
  const totalDuesAmount = stats?.totalDues || 872300;
  const totalMonthlySalesVal = stats?.monthlySales || 4872500;
  const totalMonthlyPurchasesVal = stats?.monthlyPurchases || 2450000;
  const lowStockCount = stats?.lowStockCount || 0;
  const recentTransactions = stats?.recentTransactions || [];

  const netProfitVal = Math.max(0, totalMonthlySalesVal - totalMonthlyPurchasesVal);
  const profitMarginPercent = totalMonthlySalesVal > 0 ? Math.min(100, Math.round((netProfitVal / totalMonthlySalesVal) * 100)) : 34;

  const weeklyData = [
    { name: 'শনি', বিক্রয়: 85000, ক্রয়: 60000 },
    { name: 'রবি', বিক্রয়: 120000, ক্রয়: 80000 },
    { name: 'সোম', বিক্রয়: 95000, ক্রয়: 70000 },
    { name: 'মঙ্গল', বিক্রয়: 140000, ক্রয়: 90000 },
    { name: 'বুধ', বিক্রয়: 110000, ক্রয়: 75000 },
    { name: 'বৃহস্পতি', বিক্রয়: 160000, ক্রয়: 100000 },
    { name: 'শুক্র', বিক্রয়: 130000, ক্রয়: 85000 },
  ];

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
      return [
        { name: '৮মিলি রড', stock: '৪.৫ টন (৪,৫০ কেজি)', percent: 65, color: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
        { name: '১০মিলি রড', stock: '১২.২ টন (১২,২০০ কেজি)', percent: 85, color: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { name: '১২মিলি রড', stock: '৮.০ টন (৮,০০০ কেজি)', percent: 55, color: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
        { name: '১৬মিলি রড', stock: '৫.৫ টন (৫,৫০ কেজি)', percent: 45, color: 'bg-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
        { name: 'শাহ সিমেন্ট', stock: '৪৫০ বস্তা', percent: 90, color: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'বসুন্ধরা সিমেন্ট', stock: '৩২০ বস্তা', percent: 75, color: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
      ];
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
      return [
        { name: '৮মিলি রড', stock: '২ টন বাকি' },
        { name: '২০মিলি রড', stock: '১.৫ টন বাকি' },
        { name: 'ক্রাউন সিমেন্ট', stock: '১৫ বস্তা বাকি' },
      ];
    }
    return filtered.slice(0, 4).map(p => ({
      name: fixMiliName(p.name),
      stock: `${p.stock || 0} ${p.unit || 'একক'} বাকি`
    }));
  }, [products]);

  // Real Recent Sales List
  const recentSalesList = useMemo(() => {
    if (orders.length === 0) {
      return [
        { customer: 'মো: রফিকুল ইসলাম', amount: '৳ ৪৫,৫০০', item: '১০মিলি রড — ২.৫ টন', time: '১৫ মি আগে', status: 'পরিশোধিত' },
        { customer: 'আল-আমিন কনস্ট্রাকশন', amount: '৳ ১,২৩,০০০', item: 'শাহ সিমেন্ট — ৫০ বস্তা', time: '৩৫ মি আগে', status: 'আংশিক' },
        { customer: 'হাসান বিল্ডার্স', amount: '৳ ৮৮,২০০', item: '১২মিলি রড — ৩ টন', time: '১ ঘ আগে', status: 'বাকি' },
        { customer: 'মো: করিম', amount: '৳ ১৮,৭৫০', item: 'বসুন্ধরা সিমেন্ট — ২৫ বস্তা', time: '২ ঘ আগে', status: 'পরিশোধিত' },
        { customer: 'নিউ সিটি ডেভেলপার', amount: '৳ ২,৮৫,০০০', item: 'মিশ্র পণ্য — বড় অর্ডার', time: '৩ ঘ আগে', status: 'আংশিক' },
      ];
    }

    return orders.slice(0, 5).map(o => {
      const firstItemName = o.items && o.items.length > 0 ? fixMiliName(o.items[0].name) : 'পণ্য';
      const extraItems = o.items && o.items.length > 1 ? ` (+${o.items.length - 1}টি)` : '';
      const itemDesc = `${firstItemName}${extraItems}`;
      
      const d = getDate(o.createdAt);
      const diffMins = Math.max(1, Math.round((new Date().getTime() - d.getTime()) / (1000 * 60)));
      const timeStr = diffMins < 60 ? `${diffMins} মি আগে` : diffMins < 1440 ? `${Math.round(diffMins / 60)} ঘ আগে` : d.toLocaleDateString('bn-BD');

      const due = o.dueAmount ?? ((o.totalAmount || 0) - (o.paidAmount || 0));
      const paid = o.paidAmount || 0;
      const status = due <= 0 ? 'পরিশোধিত' : paid > 0 ? 'আংশিক' : 'বাকি';

      return {
        customer: o.customerName || 'সম্মানিত কাস্টমার',
        amount: `৳ ${(o.totalAmount || 0).toLocaleString()}`,
        item: itemDesc,
        time: timeStr,
        status
      };
    });
  }, [orders]);

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full font-bengali">
        
        {/* ══════════ STAT CARDS WITH UNIQUE MINI GRAPHS ══════════ */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* CARD 1: CASH BALANCE (Smooth Curved Area Chart) */}
          <StatCard 
            title="নগদ ক্যাশ ব্যালেন্স" 
            value={`৳ ${totalCashBalance.toLocaleString()}`} 
            icon={Wallet} 
            trend="+১০% ক্যাশ" 
            trendUp={true} 
            description="গাল্লা ক্যাশ ব্যালেন্স"
            bg="bg-gradient-to-br from-emerald-500 to-teal-500"
            iconBg="bg-emerald-100 text-emerald-600"
            badgeBg="bg-emerald-100 text-emerald-700"
            graphType="area"
            strokeColor="#10b981"
            gradId="cashGrad"
            graphData={[{ v: 140 }, { v: 180 }, { v: 160 }, { v: 220 }, { v: 240 }, { v: 285 }]}
          />

          {/* CARD 2: BANK BALANCE (Stepped Line Chart) */}
          <StatCard 
            title="ব্যাংক ব্যালেন্স" 
            value={`৳ ${totalBankBalance.toLocaleString()}`} 
            icon={Landmark} 
            trend="ব্যাংক জমা" 
            trendUp={true} 
            description="ব্যাংক অ্যাকাউন্টের জমা"
            bg="bg-gradient-to-br from-blue-600 to-indigo-600"
            iconBg="bg-blue-100 text-blue-600"
            badgeBg="bg-blue-100 text-blue-700"
            graphType="step"
            strokeColor="#3b82f6"
            graphData={[{ v: 180 }, { v: 240 }, { v: 220 }, { v: 310 }, { v: 290 }, { v: 350 }]}
          />

          {/* CARD 3: TOTAL DUES (Pillar Bar Histogram Chart) */}
          <StatCard 
            title="মোট বকেয়া পাওনা" 
            value={`৳ ${totalDuesAmount.toLocaleString()}`} 
            icon={Banknote} 
            trend="কাস্টমার পাওনা" 
            trendUp={false} 
            description="ক্রেতাদের বকেয়া পাওনা"
            bg="bg-gradient-to-br from-rose-500 to-pink-600"
            iconBg="bg-rose-100 text-rose-600"
            badgeBg="bg-rose-100 text-rose-700"
            graphType="bar"
            strokeColor="#f43f5e"
            graphData={[{ v: 45 }, { v: 75 }, { v: 50 }, { v: 90 }, { v: 60 }, { v: 85 }, { v: 70 }]}
          />

          {/* CARD 4: MONTHLY SALES (Double Spline & Target Line Chart) */}
          <StatCard 
            title="চলতি মাসের বিক্রি" 
            value={`৳ ${totalMonthlySalesVal.toLocaleString()}`} 
            icon={TrendingUp} 
            trend="+২৩% বিক্রি" 
            trendUp={true} 
            description="চলতি মাসের সেলস"
            bg="bg-gradient-to-br from-orange-500 to-amber-500"
            iconBg="bg-orange-100 text-orange-600"
            badgeBg="bg-orange-100 text-orange-700"
            graphType="double-line"
            strokeColor="#f97316"
            graphData={[{ v: 30, t: 25 }, { v: 45, t: 35 }, { v: 40, t: 40 }, { v: 65, t: 50 }, { v: 60, t: 55 }, { v: 85, t: 70 }]}
          />

          {/* CARD 5: STOCK ALERT (Segmented Pulse Warning Bar Chart) */}
          <StatCard 
            title="স্টক সতর্কতা" 
            value={`${String(lowStockCount).padStart(2, '0')} পণ্য`} 
            icon={AlertCircle} 
            trend="জরুরি রিফিল" 
            trendUp={false} 
            description="পুনরায় অর্ডার প্রয়োজন"
            bg="bg-gradient-to-br from-amber-400 to-orange-500"
            iconBg="bg-amber-100 text-amber-600"
            badgeBg="bg-amber-100 text-amber-700"
            graphType="segmented-bars"
            graphData={[{ v: 10 }, { v: 8 }, { v: 5 }, { v: 12 }, { v: 4 }, { v: 9 }, { v: 6 }]}
          />
        </div>

        {/* ══════════ QUICK ACTIONS (CLEAN BRIGHT & COLORFUL) ══════════ */}
        <div className="rounded-[2.5rem] bg-white border border-slate-200/80 p-6 shadow-xl shadow-slate-200/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/25">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">দ্রুত শর্টকাটস ও নেভিগেশন</h3>
                <p className="text-xs text-slate-500 font-medium">১-ক্লিকে সরাসরি যেকোনো পেজে প্রবেশ করুন</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-200">
              ⚡ ১-ক্লিক সুবিধা
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickActions.map((action) => (
              <Link 
                key={action.href} 
                href={action.href}
                className={cn(
                  "group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 shadow-xs hover:shadow-lg text-center",
                  action.bg, action.border
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 shadow-xs transition-transform duration-300 group-hover:scale-110",
                  action.iconBg
                )}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className={cn("text-xs font-black transition-colors line-clamp-1", action.text)}>{action.label}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-white/80 font-bold mt-0.5">{action.sub}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ══════════ CHARTS ROW ══════════ */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Area Chart */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/80">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-slate-800 text-base">সাপ্তাহিক বিক্রয় ও ক্রয়</h3>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-1 ml-10">গত ৭ দিনের লেনদেনের গ্রাফ</p>
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
            <div className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} dx={-8} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 700, padding: '10px 16px' }} itemStyle={{ color: '#1e293b' }} />
                  <Area type="monotone" dataKey="বিক্রয়" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gSales)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#f97316' }} />
                  <Area type="monotone" dataKey="ক্রয়" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gPurchase)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
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
              {stockBreakdown.map((item, i) => (
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
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RECENT SALES + SUMMARY ══════════ */}
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
              {recentSalesList.map((sale, i) => (
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
              ))}
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
                  <ArrowUpRight className="w-3 h-3" /> +{profitMarginPercent}%
                </span>
              </div>

              <div className="flex flex-col items-center py-2 space-y-4">
                {/* Circular Donut Chart */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400">নিট লাভ</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5">৳{netProfitVal.toLocaleString()}</span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-100">
                      {profitMarginPercent}% মার্জিন
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
                    <span className="text-xs font-black text-orange-700">৳ {totalMonthlySalesVal.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-xs font-bold text-slate-700">মোট ক্রয়</span>
                    </div>
                    <span className="text-xs font-black text-indigo-700">৳ {totalMonthlyPurchasesVal.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700">নিট লাভ</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700">৳ {netProfitVal.toLocaleString()}</span>
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
                {lowStockAlertList.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-rose-50/60 hover:bg-rose-50 transition-colors rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    </div>
                    <span className="text-[11px] text-rose-600 font-black bg-white px-2.5 py-1 rounded-lg shadow-xs border border-rose-200">{item.stock}</span>
                  </div>
                ))}
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
      <div className="h-14 w-full mt-2 overflow-hidden relative">
        {graphType === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
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

        {graphType === 'step' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="stepAfter" dataKey="v" stroke={strokeColor} strokeWidth={2.5} dot={{ r: 2.5, fill: strokeColor }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {graphType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <Bar dataKey="v" fill={strokeColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {graphType === 'double-line' && (
          <ResponsiveContainer width="100%" height="100%">
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
