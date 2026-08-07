'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  TrendingUp, ChevronDown, ChevronRight, Truck, BarChart3,
  AlertTriangle, FileText, Receipt, RotateCcw, Building2,
  DollarSign, PieChart, Landmark, ArrowUpCircle, ArrowDownCircle, PlusCircle, BookOpen, ArrowRightLeft, Scale, PanelLeftClose, PanelLeftOpen, Wallet, Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type MenuItem = {
  name: string;
  icon: any;
  href?: string;
  children?: { name: string; href: string; icon?: any }[];
};

const menuStructure: MenuItem[] = [
  {
    name: 'ড্যাশবোর্ড',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    name: 'পণ্য (স্টক)',
    icon: Package,
    href: '/inventory',
    children: [
      { name: 'সব পণ্য', href: '/inventory', icon: Package },
      { name: 'কম স্টক', href: '/inventory/low-stock', icon: AlertTriangle },
    ],
  },
  {
    name: 'বিক্রয়',
    icon: ShoppingCart,
    href: '/orders',
    children: [
      { name: 'গ্রাহক', href: '/customers', icon: Users },
      { name: 'বিক্রয় অর্ডার', href: '/orders', icon: ShoppingCart },
      { name: 'বিক্রয় চালান', href: '/invoices', icon: Receipt },
      { name: 'বিক্রয় রিটার্ন', href: '/sales/returns', icon: RotateCcw },
    ],
  },
  {
    name: 'ক্রয়',
    icon: Truck,
    href: '/purchases',
    children: [
      { name: 'সাপ্লায়ার', href: '/suppliers', icon: Building2 },
      { name: 'ক্রয় ইনভয়েস', href: '/purchases', icon: Truck },
    ],
  },
  {
    name: 'লেনদেন',
    icon: ArrowUpCircle,
    href: '/transactions',
    children: [
      { name: 'সব লেনদেন', href: '/transactions', icon: ArrowRightLeft },
      { name: 'পেমেন্ট দিন', href: '/transactions?type=expense&action=create', icon: ArrowDownCircle },
      { name: 'পেমেন্ট গ্রহণ', href: '/transactions?type=income&action=create', icon: ArrowUpCircle },
      { name: 'টাকা যোগ', href: '/transactions?type=contra', icon: PlusCircle },
    ],
  },
  {
    name: 'খরচ (Expense)',
    icon: Wallet,
    href: '/expenses',
  },
  {
    name: 'রিপোর্ট',
    icon: BarChart3,
    href: '/reports',
    children: [
      { name: 'সব রিপোর্ট', href: '/reports?tab=hub', icon: BarChart3 },
      { name: 'বাকি কাস্টমার তালিকা', href: '/reports?tab=due_customers', icon: Users },
      { name: 'ব্যাংক এর তালিকা', href: '/reports?tab=bank_list', icon: Landmark },
      { name: 'ডেইলী টপসিট', href: '/reports?tab=daily_topsheet', icon: FileText },
      { name: 'ডেইলী সেলস স্টেটমেন্ট', href: '/reports?tab=daily_sales', icon: ShoppingCart },
      { name: 'প্রফিট এবং লস', href: '/reports?tab=profit_loss', icon: TrendingUp },
      { name: 'ব্যালেন্স স্টেটমেন্ট', href: '/reports?tab=balance_sheet', icon: Scale },
      { name: 'রড সিমেন্ট ক্রয় বিক্রয় স্টেটমেন্ট', href: '/reports?tab=trade_register', icon: Truck },
      { name: 'পেন্ডিং কমিশন তালিকা', href: '/reports?tab=commissions', icon: Percent },
    ]
  },
  {
    name: 'সেটিংস',
    icon: Settings,
    href: '/settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const currentType = searchParams.get('type');
  
  // State for hover-expand sidebar (Off/Collapsed by default, opens on mouse hover)
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false); // Option to pin sidebar if user clicks pin

  const isExpanded = isHovered || isPinned;

  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const active = menuStructure.find(m =>
      m.children?.some(c => {
        const [baseHref] = c.href.split('?');
        return pathname === baseHref || pathname.startsWith(baseHref + '/');
      })
    );
    return active ? [active.name] : [];
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleLogout = async () => {
    try { 
      window.location.href = '/';
    } catch (e) { console.error(e); }
  };

  const isChildActive = (children: { href: string }[]) =>
    children.some(c => {
      const [baseHref, query] = c.href.split('?');
      if (pathname === baseHref) {
        if (query) {
          const childType = new URLSearchParams(query).get('type');
          return currentType === childType;
        }
        return true;
      }
      return baseHref !== '/' && pathname.startsWith(baseHref + '/');
    });

  return (
    <div 
      className="relative z-[70] flex-shrink-0 print:hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible spacer to maintain main layout width when sidebar expands over */}
      <div className="w-[72px] h-screen hidden sm:block pointer-events-none" />

      {/* Actual Animated Sidebar Wrapper */}
      <aside 
        className={cn(
          'fixed top-0 left-0 h-screen flex flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out overflow-hidden z-[70] font-bengali',
          isExpanded ? 'w-[260px]' : 'w-[72px]'
        )}
      >
        {/* LOGO HEADER */}
        <div className="p-3.5 sm:p-4 border-b border-orange-700/20 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 relative overflow-hidden flex items-center justify-between min-h-[64px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-inner">
              ব
            </div>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap transition-all duration-200">
                <h1 className="text-sm font-black text-white leading-tight">ব্রাদার্স ট্রেডার্স</h1>
                <p className="text-[10px] text-orange-100 font-semibold">রড ও সিমেন্ট ব্যবসা</p>
              </div>
            )}
          </div>

          {isExpanded && (
            <button 
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'সাইডবার পিন খুলুন' : 'সাইডবার পিন করুন'}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* MENU SCROLL AREA */}
        <ScrollArea className="flex-1 px-2.5 py-3">
          <nav className="space-y-1">
            {menuStructure.map((item) => {
              const isOpen = openMenus.includes(item.name);
              const hasChildren = !!item.children && item.children.length > 0;
              const isParentActive = hasChildren
                ? isChildActive(item.children!)
                : pathname === item.href;

              if (!hasChildren && item.href) {
                return (
                  <Link key={item.name} href={item.href}>
                    <div 
                      title={!isExpanded ? item.name : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium relative group',
                        isParentActive
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20'
                          : 'text-slate-600 hover:bg-orange-50/70 hover:text-orange-600'
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {isExpanded && (
                        <span className="whitespace-nowrap overflow-hidden transition-all duration-200">
                          {item.name}
                        </span>
                      )}

                      {/* Tooltip hint when collapsed */}
                      {!isExpanded && (
                        <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                          {item.name}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              }

              return (
                <div key={item.name} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isExpanded) setIsHovered(true);
                      toggleMenu(item.name);
                    }}
                    title={!isExpanded ? item.name : undefined}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium group relative',
                      isParentActive
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-slate-600 hover:bg-orange-50/70 hover:text-orange-600'
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <item.icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', isParentActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-orange-600')} />
                      {isExpanded && (
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                          {item.name}
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    )}

                    {/* Tooltip hint when collapsed */}
                    {!isExpanded && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                        {item.name}
                      </div>
                    )}
                  </button>

                  {/* SUBMENU ITEMS */}
                  {isExpanded && isOpen && item.children && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-orange-100 pl-3 py-1">
                      {item.children.map(child => {
                        const [baseHref, query] = child.href.split('?');
                        let isActive = false;
                        if (pathname === baseHref) {
                          if (query) {
                            const childParams = new URLSearchParams(query);
                            let matches = true;
                            childParams.forEach((val, key) => {
                              if (searchParams.get(key) !== val) matches = false;
                            });
                            isActive = matches;
                          } else {
                            const currentTab = searchParams.get('tab');
                            const currentTypeParam = searchParams.get('type');
                            isActive = !currentTab && !currentTypeParam;
                          }
                        } else if (baseHref !== '/' && pathname.startsWith(baseHref + '/')) {
                          isActive = true;
                        }
                        
                        return (
                          <Link key={child.name} href={child.href}>
                            <div className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-bold relative',
                              isActive
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}>
                              {child.icon && <child.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />}
                              <span className="whitespace-nowrap">{child.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* FOOTER LOGOUT */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            title={!isExpanded ? 'লগ আউট' : undefined}
            className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors text-sm font-bold relative group"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-rose-500" />
            {isExpanded && <span className="whitespace-nowrap">লগ আউট</span>}

            {!isExpanded && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-rose-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                লগ আউট
              </div>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
