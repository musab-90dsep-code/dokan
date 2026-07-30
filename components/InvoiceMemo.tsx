'use client';

import React, { useState } from 'react';
import { toBengaliDigits, formatBengaliTaka, numberToBengaliWords } from '@/lib/bengaliUtils';
import { format } from 'date-fns';

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  discount?: number;
  bundle?: number | string;
  pieces?: number | string;
}

interface InvoiceMemoProps {
  invoice: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    siteAddress?: string;
    siteContact?: string;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    previousBalance?: number;
    transportCost?: number;
    laborCost?: number;
    vehicleNo?: string;
    driverInfo?: string;
    items: OrderItem[];
    createdAt: any;
    note?: string;
    paymentStatus?: string;
  };
  shopInfo?: {
    name?: string;
    proprietor?: string;
    address?: string;
    description?: string;
    dealership?: string;
    phone?: string;
    terms?: string;
  };
}

export const InvoiceMemo: React.FC<InvoiceMemoProps> = ({ invoice, shopInfo: propShopInfo }) => {
  const [shop] = useState(() => {
    const defaultShop = {
      name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
      proprietor: 'প্রোঃ- মোঃ মিকাইল শেখ',
      address: 'চৌধুরী নিউ সুপার মার্কেট, ৩১০, বঙ্গবন্ধু সড়ক, গোপালগঞ্জ।',
      description: 'রড, সিমেন্ট, পাইকারী ও খুচরা বিক্রয় করা হয়।',
      dealership: 'ডিলারঃ এ্যাংকর সিমেন্ট এবং হোলসিম সিমেন্ট, BSRM / SCRM রড',
      phone: 'মোবাইলঃ ০১৭১২-০১৪২২৫, ০১৭০১-২৯৫৩৩০, ০১৭২৭-৯৫২৫১৩',
      terms: 'বিঃ দ্রঃ- বিক্রিত মাল ফেরত বা বদল হয় না।',
    };

    if (propShopInfo) {
      return { ...defaultShop, ...propShopInfo };
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shopInfo');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            name: parsed.name || defaultShop.name,
            proprietor: parsed.proprietor || defaultShop.proprietor,
            address: parsed.address || defaultShop.address,
            description: parsed.type ? `${parsed.type} - পাইকারী ও খুচরা বিক্রয় করা হয়।` : defaultShop.description,
            dealership: parsed.dealership || defaultShop.dealership,
            phone: parsed.phone ? `মোবাইলঃ ${parsed.phone}` : defaultShop.phone,
            terms: parsed.terms || defaultShop.terms,
          };
        }
      } catch (e) {
        console.error('Error reading shopInfo', e);
      }
    }
    return defaultShop;
  });

  // Format Date
  const getDateString = () => {
    if (!invoice.createdAt) return toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
    const d = invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt);
    try {
      return toBengaliDigits(format(d, 'dd/MM/yyyy'));
    } catch {
      return toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
    }
  };

  const productTotal = (invoice.items || []).reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
  const transportCost = invoice.transportCost || 0;
  const laborCost = invoice.laborCost || 0;
  
  const total = invoice.totalAmount || (productTotal + transportCost + laborCost);
  const paid = invoice.paidAmount || 0;
  const due = invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, total - paid);
  const prevBal = invoice.previousBalance || 0;
  const grandTotal = total + prevBal;

  const invoiceNo = toBengaliDigits(invoice.id.slice(-5).toUpperCase());

  // Dynamic row calculation
  const items = invoice.items || [];
  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - items.length - (laborCost > 0 ? 1 : 0) - (transportCost > 0 ? 1 : 0));

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-slate-900 font-bengali p-4 sm:p-6 border-2 border-slate-300 rounded-xl shadow-lg print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none">
      {/* --- MEMO HEADER --- */}
      <div className="relative border-b-2 border-emerald-600 pb-2">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="border border-red-600 text-red-600 font-black text-[10px] px-1.5 py-0.5 rounded shadow-xs">
              MD&B
            </span>
            <div className="text-xs font-bold text-slate-800">
              নং <span className="font-black text-sm text-red-700">{invoiceNo}</span>
            </div>
          </div>

          <div className="text-right text-[11px] font-bold text-slate-700 max-w-[280px]">
            {shop.address}
          </div>
        </div>

        {/* Main Shop Name Banner */}
        <div className="text-center my-1">
          <h1 className="text-3xl sm:text-4xl font-black text-red-600 tracking-wide font-bengali">
            {shop.name}
          </h1>
          <div className="inline-block bg-emerald-700 text-white text-xs font-bold px-4 py-0.5 rounded-full mt-1">
            {shop.proprietor}
          </div>
        </div>

        {/* Banners */}
        <div className="bg-emerald-600 text-white text-center text-xs font-bold py-1 px-2 mt-1 rounded-sm tracking-wider">
          {shop.description}
        </div>
        <div className="bg-sky-600 text-white text-center text-xs font-bold py-1 px-2 mt-0.5 rounded-sm">
          {shop.dealership}
        </div>
        <div className="text-center text-[11px] font-bold text-slate-800 py-1 bg-slate-100 mt-0.5 rounded-sm">
          {shop.phone}
        </div>
      </div>

      {/* --- CUSTOMER & SITE INFO ROW --- */}
      <div className="mt-3 border border-sky-400 rounded-lg p-2.5 bg-sky-50/40 space-y-2 text-xs sm:text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="bg-sky-900 text-white text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
              নামঃ
            </span>
            <span className="font-black text-slate-900 text-base border-b border-dashed border-slate-400 flex-1 px-2 py-0.5">
              {invoice.customerName || 'খুচরা ক্রেতা'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-black text-slate-700">তাং-</span>
            <span className="font-bold text-slate-900 text-sm border-b border-dashed border-slate-400 px-2 py-0.5">
              {getDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-sky-900 text-white text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
              ঠিকানাঃ
            </span>
            <span className="font-bold text-slate-800 text-xs border-b border-dashed border-slate-400 flex-1 px-2 py-0.5 truncate">
              {invoice.customerAddress || invoice.customerPhone || 'গোপালগঞ্জ'}
            </span>
          </div>

          {invoice.siteAddress && (
            <div className="flex items-center gap-2">
              <span className="bg-orange-700 text-white text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                সাইটঃ
              </span>
              <span className="font-bold text-orange-950 text-xs border-b border-dashed border-slate-400 flex-1 px-2 py-0.5 truncate">
                {invoice.siteAddress} {invoice.siteContact ? `(${invoice.siteContact})` : ''}
              </span>
            </div>
          )}
        </div>

        {(invoice.vehicleNo || invoice.driverInfo) && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-sky-100/60 p-1.5 rounded border border-sky-200">
            <span>🚛 পরিবহন তথ্য:</span>
            {invoice.vehicleNo && <span className="bg-white px-2 py-0.5 rounded border border-sky-300">গাড়ি: {invoice.vehicleNo}</span>}
            {invoice.driverInfo && <span className="bg-white px-2 py-0.5 rounded border border-sky-300">ড্রাইভার: {invoice.driverInfo}</span>}
          </div>
        )}
      </div>

      {/* --- PRODUCT TABLE --- */}
      <div className="mt-3 border-2 border-orange-500 rounded-lg overflow-hidden">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-orange-500 text-white border-b-2 border-orange-600">
              <th className="py-1.5 px-2 border-r border-orange-400 text-center font-black w-[12%]">বান্ডিল/পিস</th>
              <th className="py-1.5 px-2 border-r border-orange-400 text-left font-black w-[40%]">বিবরণ</th>
              <th className="py-1.5 px-2 border-r border-orange-400 text-center font-black w-[18%]">পরিমাণ</th>
              <th className="py-1.5 px-2 border-r border-orange-400 text-right font-black w-[15%]">দর</th>
              <th className="py-1.5 px-2 text-right font-black w-[15%]">টাকা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-200/60 bg-pink-50/20">
            {items.map((item, idx) => {
              const itemTotal = (item.price - (item.discount || 0)) * item.quantity;
              const bundleInfo = item.bundle ? `${item.bundle} বান্ডিল` : item.pieces ? `${item.pieces} পিস` : '-';
              return (
                <tr key={idx} className="hover:bg-pink-100/30">
                  <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-700">
                    {toBengaliDigits(bundleInfo)}
                  </td>
                  <td className="py-2 px-2 border-r border-pink-200 text-left font-bold text-slate-900">
                    {item.name}
                  </td>
                  <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-800">
                    {toBengaliDigits(item.quantity)} {item.unit || 'বস্তা/কেজি'}
                  </td>
                  <td className="py-2 px-2 border-r border-pink-200 text-right font-bold text-slate-800">
                    {toBengaliDigits(item.price)}/=
                  </td>
                  <td className="py-2 px-2 text-right font-black text-slate-900">
                    {toBengaliDigits(itemTotal.toLocaleString('en-IN'))}/=
                  </td>
                </tr>
              );
            })}

            {/* Extra Labor Charge Row if any */}
            {laborCost > 0 && (
              <tr className="hover:bg-pink-100/30">
                <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-700">-</td>
                <td className="py-2 px-2 border-r border-pink-200 text-left font-bold text-slate-900">নামানো / লেবার খরচ</td>
                <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-700">-</td>
                <td className="py-2 px-2 border-r border-pink-200 text-right font-bold text-slate-700">-</td>
                <td className="py-2 px-2 text-right font-black text-slate-900">{toBengaliDigits(laborCost.toLocaleString('en-IN'))}/=</td>
              </tr>
            )}

            {/* Extra Freight / Transport Row if any */}
            {transportCost > 0 && (
              <tr className="hover:bg-pink-100/30">
                <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-700">-</td>
                <td className="py-2 px-2 border-r border-pink-200 text-left font-bold text-slate-900">গাড়ি ভাড়া / পরিবহন খরচ</td>
                <td className="py-2 px-2 border-r border-pink-200 text-center font-bold text-slate-700">-</td>
                <td className="py-2 px-2 border-r border-pink-200 text-right font-bold text-slate-700">-</td>
                <td className="py-2 px-2 text-right font-black text-slate-900">{toBengaliDigits(transportCost.toLocaleString('en-IN'))}/=</td>
              </tr>
            )}

            {/* Extra Empty Rows */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border-r border-pink-200 text-center text-slate-300">-</td>
                <td className="border-r border-pink-200"></td>
                <td className="border-r border-pink-200"></td>
                <td className="border-r border-pink-200"></td>
                <td className="text-right pr-2 text-pink-300 font-thin">|</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- FOOTER SUMMARY & SIGNATURES --- */}
      <div className="mt-3 grid grid-cols-12 gap-3 items-end">
        <div className="col-span-7 flex flex-col justify-between h-full py-1">
          <div className="text-slate-300 text-3xl font-black italic tracking-widest pl-4 opacity-50 select-none">
            ধন্যবাদান্তে
          </div>

          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-900">
              <span className="font-black text-slate-800">টাকা (কথায়ঃ)</span>{' '}
              <span className="border-b border-dashed border-slate-600 font-black text-slate-900 inline-block px-2 py-0.5">
                {numberToBengaliWords(grandTotal)}
              </span>
            </div>

            <div className="pt-6">
              <div className="w-40 border-t border-slate-700 text-center text-xs font-bold text-slate-800">
                ক্রেতা/প্রতিনিধির স্বাক্ষর
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Grid */}
        <div className="col-span-5 border-2 border-pink-300 rounded-lg overflow-hidden bg-pink-50/40 text-xs sm:text-sm font-bold">
          <div className="flex justify-between items-center px-3 py-1.5 border-b border-pink-200">
            <span className="text-slate-800 font-bold">মোট-</span>
            <span className="font-black text-slate-900">{formatBengaliTaka(total)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 border-b border-pink-200">
            <span className="text-slate-700">অগ্রিম/সাবেক-</span>
            <span className="font-bold text-slate-800">{formatBengaliTaka(prevBal)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 border-b border-pink-200 bg-pink-100/50">
            <span className="text-slate-900 font-black">সর্বমোট-</span>
            <span className="font-black text-slate-900 text-base">{formatBengaliTaka(grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 border-b border-pink-200">
            <span className="text-emerald-800 font-black">জমা-</span>
            <span className="font-black text-emerald-700 text-base">{formatBengaliTaka(paid)}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5">
            <span className="text-rose-800 font-black">বাকী</span>
            <span className="font-black text-rose-700 text-base">{formatBengaliTaka(due)}</span>
          </div>
        </div>
      </div>

      {/* --- FOOTER BOTTOM BANNER & PROPRIETOR SIGNATURE --- */}
      <div className="mt-4 pt-2 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="bg-emerald-700 text-white font-black px-4 py-1 rounded-full text-center text-[11px]">
          {shop.terms}
        </div>

        <div className="text-right space-y-1 self-end sm:self-auto">
          <div className="h-8 flex items-end justify-end pr-4 text-slate-400 italic text-xs">
            (স্বাক্ষর)
          </div>
          <div className="border-t border-slate-700 px-2 pt-0.5 font-black text-slate-900 text-xs">
            পক্ষে- {shop.name}
          </div>
        </div>
      </div>
    </div>
  );
};
