'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api, PartyData, TransactionData } from '@/lib/api';
import { Receipt, Phone, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import Link from 'next/link';

interface Customer {
  id: string; name: string; phone: string; address: string;
  businessName: string; totalDue: number; totalPurchase: number; photoUrl?: string;
}

interface Order {
  id: string; customerName: string; customerId: string;
  totalAmount: number; paidAmount: number; dueAmount: number;
  paymentStatus: string; createdAt: any;
}

const toBnDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);
};

export default function CustomerDuesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDues() {
      try {
        setLoading(true);
        const partyList = await api.parties.list({ party_type: 'customer' });
        setCustomers(partyList.map(c => ({
          id: String(c.id),
          name: c.name,
          phone: c.phone,
          address: c.address || '',
          businessName: c.business_name || '',
          totalDue: Number(c.total_due || 0),
          totalPurchase: Number(c.total_purchases || 0),
          photoUrl: c.photo_url || ''
        })));

        const txList = await api.transactions.list({ transaction_type: 'sale' });
        setOrders(txList.map(t => ({
          id: String(t.id || t.invoice_no),
          customerName: t.party_name || 'গ্রাহক',
          customerId: String(t.party || ''),
          totalAmount: Number(t.total_amount || 0),
          paidAmount: Number(t.paid_amount || 0),
          dueAmount: Number(t.due_amount || 0),
          paymentStatus: t.status || 'completed',
          createdAt: t.created_at
        })));
      } catch (e) {
        console.error('Error loading dues:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDues();
  }, []);

  const customerDues = customers
    .map(c => {
      const cOrders = orders.filter(o => o.customerId === c.id || o.customerName === c.name);
      const totalBill = cOrders.reduce((a, o) => a + (o.totalAmount || 0), 0);
      const totalPaid = cOrders.reduce((a, o) => a + (o.paidAmount || 0), 0);
      const totalDue = c.totalDue !== undefined && c.totalDue > 0
        ? c.totalDue
        : Math.max(0, totalBill - totalPaid);
      return { 
        ...c, 
        totalBill, 
        totalPaid, 
        totalDue, 
        pendingChequeSum: 0,
        invoiceCount: cOrders.length 
      };
    })
    .filter(c => c.totalDue > 0);

  const grandTotalDue = customerDues.reduce((a, c) => a + c.totalDue, 0);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-bengali flex items-center gap-2">
              <Receipt className="w-6 h-6 text-rose-600" /> গ্রাহকদের বকেয়া তালিকা
            </h2>
            <p className="text-slate-500 font-bengali mt-1">যেসব গ্রাহকের কাছে দোকানে টাকা বকেয়া রয়েছে</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-3 text-right">
            <p className="text-xs text-rose-600 font-bengali font-semibold">সর্বমোট পাওনা (বকেয়া)</p>
            <p className="text-2xl font-black text-rose-700 font-bengali">৳ {grandTotalDue.toLocaleString('bn-BD')}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bengali text-lg">লোড হচ্ছে...</div>
        ) : customerDues.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-slate-700 font-bengali text-xl font-bold">কারো কাছে কোনো বকেয়া নেই!</p>
            <p className="text-slate-400 font-bengali mt-2">সব হিসাব পরিশোধিত</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerDues.map(c => (
              <Card key={c.id} className="hover:shadow-md transition border-slate-200">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg font-bengali">{c.name}</h3>
                      {c.businessName && <p className="text-xs text-slate-500 font-bengali">{c.businessName}</p>}
                      <p className="text-xs text-slate-400 font-bengali flex items-center gap-1 mt-1">
                        <Phone className="w-3.5 h-3.5" /> {toBnDigits(c.phone)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-rose-600 font-bengali font-bold block">বকেয়া</span>
                      <span className="text-xl font-black text-rose-600 font-bengali">৳ {c.totalDue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bengali">{toBnDigits(c.invoiceCount)} টি বিক্রি ইনভয়েস</span>
                    <Link href={`/customers/${c.id}`} className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 font-bengali">
                      লেজার দেখুন <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
