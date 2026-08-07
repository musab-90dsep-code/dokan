'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Printer, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toBengaliDigits, numberToBengaliWords } from '@/lib/bengaliUtils';
import { printElement } from '@/lib/printUtils';

export interface PurchaseItem {
  id?: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  discount?: number;
  bundle?: number | string;
  pieces?: number | string;
}

export interface PurchaseInvoiceMemoProps {
  invoice: {
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
    transportCost?: number;
    laborCost?: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
    paymentMethod?: string;
    chequeNo?: string;
    chequeDate?: string;
    note?: string;
    createdAt: any;
    vehicleNo?: string;
    driverName?: string;
    driverPhone?: string;
    deliveryAddress?: string;
    purchaseType?: 'rod' | 'cement' | string;
    operatorName?: string;
  };
  shopInfo?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    terms?: string;
    proprietor?: string;
  };
  type?: 'purchase' | 'sales';
  showPrintButton?: boolean;
  onClose?: () => void;
}

export const PurchaseInvoiceMemo: React.FC<PurchaseInvoiceMemoProps> = ({
  invoice,
  shopInfo: propShopInfo,
  type = 'purchase',
  showPrintButton = true
}) => {
  const handleTriggerPrint = () => {
    printElement('printable-memo-wrapper');
  };

  const [shop] = useState(() => {
    const defaultShop = {
      name: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স',
      proprietor: 'প্রোঃ- মোঃ মিকাইল শেখ',
      tagline: 'রড, সিমেন্ট ও বিল্ডিং সামগ্রী পাইকারী ও খুচরা সরবরাহ কেন্দ্র',
      address: '৩১০, চৌধুরী নিউ সুপার মার্কেট, বঙ্গবন্ধু সড়ক, গোপালগঞ্জ',
      phone: '০১৭১২-০১৪২২৫, ০১৭০১-২৯৫৩৩০',
      email: 'delowarteraders@gmail.com',
      terms: 'বিঃ দ্রঃ— ১. এটি একটি সিস্টেম-জেনারেটেড অফিশিয়াল ক্রয় চালান। ২. ডেলিভারি সাইটে মালামাল গণন পূর্বক বুঝে নেওয়ার অনুরোধ করা যাচ্ছে।',
      software: 'Hasanah Tech Solution',
      softwareCompany: 'Hasanah Tech Solution',
      softwarePhone: '01349345353',
      softwareWebsite: 'www.hasanahtech.vercel.app'
    };

    let customPromo: any = {};
    if (typeof window !== 'undefined') {
      try {
        const promoSaved = localStorage.getItem('softwarePromoInfo');
        if (promoSaved) customPromo = JSON.parse(promoSaved);
      } catch (e) {}
    }

    if (propShopInfo) {
      return { ...defaultShop, ...propShopInfo, ...customPromo };
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shopInfo');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            name: parsed.name || defaultShop.name,
            proprietor: parsed.proprietor || defaultShop.proprietor,
            tagline: parsed.type ? `${parsed.type} - পাইকারী ও খুচরা সরবরাহ কেন্দ্র` : defaultShop.tagline,
            address: parsed.address || defaultShop.address,
            phone: parsed.phone ? `মোবাইলঃ ${parsed.phone}` : defaultShop.phone,
            email: parsed.email || defaultShop.email,
            terms: parsed.terms || defaultShop.terms,
            software: parsed.software || customPromo.softwareCompany || defaultShop.software,
            softwareCompany: customPromo.softwareCompany || parsed.softwareCompany || defaultShop.softwareCompany,
            softwarePhone: customPromo.softwarePhone || parsed.softwarePhone || defaultShop.softwarePhone,
            softwareWebsite: customPromo.softwareWebsite || parsed.softwareWebsite || defaultShop.softwareWebsite
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...defaultShop, ...customPromo };
  });

  // Format Date & Time
  const rawDate = invoice?.createdAt;
  const d = rawDate?.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
  let dateStr = '০৭/০৮/২০২০';
  let timeStr = '১১:৪৫ AM';
  try {
    dateStr = toBengaliDigits(format(d, 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(d, 'hh:mm a'));
  } catch {
    dateStr = toBengaliDigits(format(new Date(), 'dd/MM/yyyy'));
    timeStr = toBengaliDigits(format(new Date(), 'hh:mm a'));
  }

  const items = invoice.items || [];
  const subtotal = invoice.subtotal || items.reduce((sum, i) => sum + ((i.price - (i.discount || 0)) * i.quantity), 0);
  const discount = invoice.discount || 0;
  const transportCost = invoice.transportCost || invoice.shippingCost || 0;
  const laborCost = invoice.laborCost || 0;
  const totalAmount = invoice.totalAmount || (subtotal - discount + transportCost + laborCost);
  const paidAmount = invoice.paidAmount || 0;
  const dueAmount = invoice.dueAmount !== undefined ? invoice.dueAmount : Math.max(0, totalAmount - paidAmount);

  // Memo number format
  const isPurchase = type === 'purchase';
  const prefix = isPurchase ? 'PUR' : 'INV';
  const memoNo = invoice.id 
    ? (invoice.id.startsWith('INV') || invoice.id.startsWith('PUR') ? invoice.id : `${prefix}-${invoice.id.slice(-6).toUpperCase()}`)
    : `${prefix}-2026-0042`;

  // Aggregate quantity by unit
  const aggregatedUnits = items.reduce((acc: Record<string, number>, item) => {
    const u = item.unit || 'পিস';
    acc[u] = (acc[u] || 0) + item.quantity;
    return acc;
  }, {});

  const totalQuantitySummary = Object.entries(aggregatedUnits)
    .map(([unit, qty]) => `${toBengaliDigits(qty.toLocaleString('en-IN'))} ${unit}`)
    .join(' • ');

  const isPaid = dueAmount <= 0 || invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'পরিশোধিত';

  const partyTitle = isPurchase ? 'সাপ্লাইয়ার / কোম্পানি' : 'গ্রাহক / কাস্টমার';
  const memoTitle = isPurchase ? 'অফিসিয়াল ক্রয় ইনভয়েস' : 'অফিসিয়াল বিক্রয় ক্যাশ মেমো';

  // Try parsing meta notes if stored as JSON
  let meta: any = {};
  let cleanUserNote = invoice.note || (invoice as any).notes || '';
  if (cleanUserNote && cleanUserNote.startsWith('{')) {
    try {
      const firstLine = cleanUserNote.split('\n')[0];
      meta = JSON.parse(firstLine);
      cleanUserNote = cleanUserNote.substring(firstLine.length).trim();
    } catch {
      // not json
    }
  }

  const effectiveVehicleNo = invoice.vehicleNo || meta.vehicleNo || '';
  const effectiveDriverName = invoice.driverName || meta.driverName || '';
  const effectiveDeliveryAddress = invoice.deliveryAddress || meta.deliveryAddress || '';
  const effectivePaymentMethodName = meta.paymentMethodName || invoice.paymentMethod || 'Cash';

  return (
    <div className="w-full font-bengali">
      {/* Top bar preview button */}
      {showPrintButton && (
        <div className="flex items-center justify-between bg-black text-white p-3.5 px-6 rounded-t-2xl print:hidden shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-white" />
            <span>ক্লিন ইনভয়েস প্রিভিউ (A4 Print Copy)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="bg-white text-black hover:bg-slate-200 text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-slate-300"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>ইনভয়েস প্রিন্ট করুন</span>
          </button>
        </div>
      )}

      {/* --- MINIMALIST CLEAN INVOICE SHEET (NO HEAVY BOXES) --- */}
      <div 
        id="printable-memo-wrapper" 
        className={cn(
          "w-full max-w-[820px] mx-auto bg-white text-black p-8 space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none",
          !showPrintButton && "rounded-2xl"
        )}
      >
        {/* --- 1. HEADER (CLEAN TEXT & SIMPLE LINE) --- */}
        <div className="flex justify-between items-start pb-4 border-b border-black">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-black tracking-tight">
              {shop.name}
            </h1>
            <p className="text-xs font-bold text-slate-700">
              {shop.tagline}
            </p>
            <p className="text-xs font-bold text-slate-800 pt-1">
              📍 {shop.address} • 📞 {shop.phone}
            </p>
          </div>

          <div className="text-right text-xs font-bold space-y-1 shrink-0">
            <h2 className="text-xl font-black text-black uppercase tracking-wider">{memoTitle}</h2>
            <p className="pt-1">আইডি: <span className="font-mono font-black text-sm">{memoNo}</span></p>
            <p>তারিখ: <span>{dateStr}</span></p>
            <p>সময়: <span className="font-mono">{timeStr}</span></p>
            <p className="font-black text-sm pt-1">
              [{isPaid ? 'পরিশোধিত' : 'বকেয়া আছে'}]
            </p>
          </div>
        </div>

        {/* --- 2. PARTY INFO (CLEAN WITHOUT BOXES) --- */}
        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-black border-b border-slate-300 pb-4">
          <div className="col-span-7 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="w-24 shrink-0 font-black text-slate-600">{partyTitle}:</span>
              <span className="font-black text-sm">{invoice.supplierName || invoice.businessName || 'নগদ সরবরাহকারী'}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="w-24 shrink-0 font-black text-slate-600">মোবাইল:</span>
              <span className="font-mono">{invoice.supplierPhone || '—'}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="w-24 shrink-0 font-black text-slate-600">ঠিকানা:</span>
              <span>{invoice.supplierAddress || '—'}</span>
            </div>
          </div>

          <div className="col-span-5 space-y-1.5 text-right">
            {effectiveVehicleNo && <div><span className="text-slate-600 font-black">গাড়ি নং: </span><span className="font-mono">{effectiveVehicleNo}</span></div>}
            {effectiveDriverName && <div><span className="text-slate-600 font-black">ড্রাইভার: </span>{effectiveDriverName}</div>}
            {effectiveDeliveryAddress && <div><span className="text-slate-600 font-black">সাইট: </span>{effectiveDeliveryAddress}</div>}
          </div>
        </div>

        {/* --- 3. PRODUCT TABLE (SIMPLE CLEAN LINES, NO VERTICAL GRID BOXES) --- */}
        <div>
          <table className="w-full text-xs sm:text-sm text-black border-collapse">
            <thead>
              <tr className="border-y-2 border-black font-black text-left">
                <th className="py-2 px-1 text-center w-[6%]">#</th>
                <th className="py-2 px-2 text-left w-[46%]">পণ্যের বিবরণ</th>
                <th className="py-2 px-2 text-center w-[14%]">পরিমাণ</th>
                <th className="py-2 px-2 text-right w-[16%]">একক দর (৳)</th>
                <th className="py-2 px-2 text-right w-[18%]">মোট টাকা (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const itemTotal = (item.price - (item.discount || 0)) * item.quantity;
                const bundleInfo = item.bundle ? `(${toBengaliDigits(item.bundle)} বান্ডিল)` : item.pieces ? `(${toBengaliDigits(item.pieces)} পিস)` : '';
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-1 text-center font-bold text-slate-600">
                      {toBengaliDigits(idx + 1)}
                    </td>
                    <td className="py-2 px-2 text-left font-black">
                      <span>{item.name}</span> <span className="text-slate-600 font-semibold">{bundleInfo}</span>
                    </td>
                    <td className="py-2 px-2 text-center font-black">
                      {toBengaliDigits(item.quantity.toLocaleString('en-IN'))} {item.unit || 'পিস'}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">
                      ৳ {toBengaliDigits(item.price.toLocaleString('en-IN'))}
                    </td>
                    <td className="py-2 px-2 text-right font-black">
                      ৳ {toBengaliDigits(itemTotal.toLocaleString('en-IN'))}
                    </td>
                  </tr>
                );
              })}

              {/* Labor Row */}
              {laborCost > 0 && (
                <tr className="border-t border-slate-200">
                  <td className="py-2 px-1 text-center font-bold text-slate-500">-</td>
                  <td className="py-2 px-2 text-left font-bold">নামানো / লেবার খরচ</td>
                  <td className="py-2 px-2 text-center font-bold">-</td>
                  <td className="py-2 px-2 text-right font-bold">-</td>
                  <td className="py-2 px-2 text-right font-black">৳ {toBengaliDigits(laborCost.toLocaleString('en-IN'))}</td>
                </tr>
              )}

              {/* Transport Row */}
              {transportCost > 0 && (
                <tr className="border-t border-slate-200">
                  <td className="py-2 px-1 text-center font-bold text-slate-500">-</td>
                  <td className="py-2 px-2 text-left font-bold">গাড়ি ভাড়া / পরিবহন খরচ</td>
                  <td className="py-2 px-2 text-center font-bold">-</td>
                  <td className="py-2 px-2 text-right font-bold">-</td>
                  <td className="py-2 px-2 text-right font-black">৳ {toBengaliDigits(transportCost.toLocaleString('en-IN'))}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Subtotal Summary Bar */}
          <div className="flex justify-between items-center border-t-2 border-black pt-2 font-black text-xs text-black">
            <span>মোট মালামাল পরিমাণ: {totalQuantitySummary || '০ পিস'}</span>
            <span className="text-sm">মোট ইনভয়েস বিল: ৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN'))}</span>
          </div>
        </div>

        {/* --- 4. FINANCIAL BREAKDOWN & WORDS --- */}
        <div className="grid grid-cols-12 gap-4 items-start pt-2 text-black font-bold text-xs">
          {/* Left Column */}
          <div className="col-span-7 space-y-2">
            <div>
              <p className="font-black text-[11px] text-slate-600">টাকা (কথায়):</p>
              <p className="font-black text-sm pt-0.5">
                {numberToBengaliWords(totalAmount)} টাকা মাত্র।
              </p>
            </div>

            <div className="pt-2 text-slate-700 text-xs space-y-1">
              {(() => {
                const pmRaw = effectivePaymentMethodName || 'Cash';
                const pmLower = pmRaw.toLowerCase();
                const isBankToBank = pmLower.includes('banktobank') || pmLower.includes('ব্যাংক-টু-ব্যাংক');
                const isBank = pmLower.includes('bank') || pmLower.includes('ব্যাংক');
                const isCheque = pmLower.includes('cheque') || pmLower.includes('check') || pmLower.includes('চেক');

                let displayMethod = '💵 নগদ (Cash)';
                if (isBankToBank) displayMethod = '🔄 ব্যাংক-টু-ব্যাংক ট্রান্সফার (Bank-to-Bank)';
                else if (isBank) displayMethod = '🏦 ব্যাংক ট্রান্সফার (Bank Transfer)';
                else if (isCheque) displayMethod = '📄 চেক (Cheque)';
                else if (pmLower.includes('mobile')) displayMethod = '📱 মোবাইল ব্যাংকিং';

                const shopBank = meta.selectedShopBank || meta.bankName || invoice.chequeNo ? '' : '';
                const suppBank = meta.supplierBankName || '';
                const suppAcc = meta.supplierAccountNo || '';
                const txnRef = meta.transactionRef || meta.supplierTxnRef || '';
                const chqNo = invoice.chequeNo || meta.chequeNo || '';
                const chqDate = invoice.chequeDate || meta.chequeDate || '';

                return (
                  <div className="space-y-1 border-t border-slate-200 pt-2 mt-2">
                    <p className="font-bold">
                      পেমেন্ট মাধ্যম: <span className="font-black text-black">{displayMethod}</span>
                    </p>

                    {isBankToBank && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-0.5 mt-1 font-mono">
                        {meta.selectedShopBank && <p>• প্রেরক (দোকান ব্যাংক): {meta.selectedShopBank}</p>}
                        {suppBank && <p>• গ্রহীতা ব্যাংক: {suppBank} {suppAcc ? `(A/C: ${suppAcc})` : ''}</p>}
                        {txnRef && <p>• Txn/Ref ID: {txnRef}</p>}
                      </div>
                    )}

                    {isBank && !isBankToBank && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-0.5 mt-1 font-mono">
                        {meta.selectedShopBank && <p>• ব্যাংক A/C: {meta.selectedShopBank}</p>}
                        {txnRef && <p>• Txn ID: {txnRef}</p>}
                      </div>
                    )}

                    {isCheque && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-0.5 mt-1 font-mono">
                        {chqNo && <p>• চেক নম্বর: {chqNo}</p>}
                        {chqDate && <p>• তারিখ: {chqDate}</p>}
                      </div>
                    )}

                    {cleanUserNote && (
                      <p className="pt-1 text-[11px] font-medium text-slate-700">
                        <strong className="text-black">নোট:</strong> {cleanUserNote}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Column (Calculation Alignment) */}
          <div className="col-span-5 space-y-1.5 text-xs font-bold border-t border-b border-black py-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-700">চালান মূল্য:</span>
              <span className="font-black">৳ {toBengaliDigits(subtotal.toLocaleString('en-IN'))}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-700">বিশেষ ছাড় (Discount):</span>
                <span className="font-black">- ৳ {toBengaliDigits(discount.toLocaleString('en-IN'))}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-black text-sm pt-1 border-t border-slate-300">
              <span>সর্বমোট পাওনা:</span>
              <span>৳ {toBengaliDigits(totalAmount.toLocaleString('en-IN'))}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-700">পরিশোধিত / জমা:</span>
              <span className="font-black">৳ {toBengaliDigits(paidAmount.toLocaleString('en-IN'))}</span>
            </div>

            <div className="flex justify-between items-center font-black text-sm pt-1 border-t border-slate-300">
              <span>অবশিষ্ট বকেয়া:</span>
              <span>৳ {toBengaliDigits(dueAmount.toLocaleString('en-IN'))}</span>
            </div>
          </div>
        </div>

        {/* --- 5. SIGNATURES & NOTICE --- */}
        <div className="pt-10 space-y-4 text-black">
          <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold">
            <div>
              <div className="w-36 mx-auto border-t border-black pt-1 font-black">
                {partyTitle}র স্বাক্ষর
              </div>
            </div>
            <div>
              <div className="w-36 mx-auto border-t border-black pt-1 font-black">
                প্রস্তুতকারী (অপারেটর)
              </div>
            </div>
            <div>
              <div className="w-40 mx-auto border-t border-black pt-1 font-black">
                পক্ষে- {shop.name}
              </div>
            </div>
          </div>

          {/* System Generated Invoice Notice */}
          <div className="pt-3 border-t border-slate-300 text-center text-[10px] font-bold text-slate-600">
            বিঃ দ্রঃ— এটি একটি কম্পিউটারাইজড অটো-জেনারেটেড অফিশিয়াল ক্রয় ইনভয়েস চালান।
          </div>

          {/* Software Company Branding & Promotion Footer */}
          <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-black uppercase tracking-wider">DEV</span>
              <span>Software Developed By: <strong className="text-black font-black">{shop.softwareCompany || shop.software || 'Hasanah Tech Solution'}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              {shop.softwareWebsite && (
                <span>🌐 <strong className="text-slate-800 font-mono font-bold">{shop.softwareWebsite}</strong></span>
              )}
              {shop.softwarePhone && (
                <span>📞 ডেভেলপার হেল্পলাইন: <strong className="text-black font-mono font-black">{shop.softwarePhone}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
