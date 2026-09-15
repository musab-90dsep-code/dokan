'use client';

import React from 'react';
import { toBnDigits, PartyProfile } from '@/components/PartyProfilePage';
import { numberToBengaliWords, cleanLegacyBengaliText } from '@/lib/bengaliUtils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

export interface PrintLedgerRow {
  date: string;
  description: string;
  quantity: string;
  rate: string;
  deposit: string;
  amount: string;
  rawDeposit: number;
  rawAmount: number;
}

export const formatLedgerNum = (val: number | string | undefined | null, emptyValue: string = '-'): string => {
  if (val === undefined || val === null || val === '') return emptyValue;
  const num = Number(val);
  if (isNaN(num) || num === 0) return emptyValue;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(1).split('.');
  const intPart = Number(parts[0]).toLocaleString('en-IN');
  const decPart = parts[1];
  return `${isNegative ? '-' : ''}${toBnDigits(`${intPart}.${decPart}`)}`;
};

export const formatLedgerDate = (dateVal: any): string => {
  if (!dateVal) return '—';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const raw = format(d, 'dd-MM-yyyy', { locale: bn });
    return toBnDigits(raw);
  } catch {
    return '—';
  }
};

export function buildLedgerPrintRows(
  party: PartyProfile | null,
  transactions: any[],
  isCustomer: boolean,
  isEngineer: boolean = false,
  startDate?: string,
  endDate?: string,
  isSupplier: boolean = false
): { rows: PrintLedgerRow[]; totalAmount: number; totalDeposit: number; netBalance: number } {
  const rows: PrintLedgerRow[] = [];
  let totalAmount = 0;
  let totalDeposit = 0;

  const startObj = startDate ? new Date(startDate) : null;
  const endObj = endDate ? new Date(endDate) : null;
  if (endObj) endObj.setHours(23, 59, 59, 999);

  // Separate opening / previous balance from transactions prior to startDate
  let priorBalance = Number(party?.openingBalance || 0);

  const sorted = [...transactions].sort((a, b) => {
    const da = new Date(a.createdAt || 0);
    const db = new Date(b.createdAt || 0);
    return da.getTime() - db.getTime();
  });

  const inScopeTransactions: any[] = [];

  sorted.forEach(tx => {
    if (tx.status === 'cancelled' || tx.status === 'rejected' || tx.status === 'pending' || tx.status === 'draft') return;
    const txDate = new Date(tx.createdAt || 0);

    if (startObj && txDate < startObj) {
      // Accumulate into prior balance
      const txType = tx.transactionType;
      let bill = Number(tx.totalAmount || 0);
      const paid = Number(tx.paidAmount || 0);

      // Exclude labor & shipping charges for suppliers and purchase transactions
      if (txType === 'purchase' || !isCustomer || isSupplier) {
        let meta: any = {};
        if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
        }
        const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
        const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);
        bill = Math.max(0, bill - (labCost + shipCost));
      }

      if (txType === 'payment_in' || txType === 'payment_out' || (isEngineer && txType === 'payment')) {
        priorBalance -= (paid || bill);
      } else if (txType === 'sale_return' || txType === 'purchase_return') {
        priorBalance -= bill;
      } else {
        priorBalance += bill;
        if (paid > 0) priorBalance -= paid;
      }
      return;
    }

    if (endObj && txDate > endObj) return;

    inScopeTransactions.push(tx);
  });

  // 1. Opening row if priorBalance is non-zero
  if (priorBalance !== 0) {
    const opDateStr = startDate 
      ? formatLedgerDate(startDate) 
      : formatLedgerDate(party?.joinedDate || party?.createdAt || new Date());

    if (priorBalance > 0) {
      totalAmount += priorBalance;
      rows.push({
        date: opDateStr,
        description: 'পূর্বের প্রারম্ভিক বকেয়া',
        quantity: '-',
        rate: '-',
        deposit: '-',
        amount: formatLedgerNum(priorBalance),
        rawDeposit: 0,
        rawAmount: priorBalance,
      });
    } else {
      const absBal = Math.abs(priorBalance);
      totalDeposit += absBal;
      rows.push({
        date: opDateStr,
        description: 'পূর্বের প্রারম্ভিক জমা',
        quantity: '-',
        rate: '-',
        deposit: formatLedgerNum(absBal),
        amount: '-',
        rawDeposit: absBal,
        rawAmount: 0,
      });
    }
  }

  // 2. Iterate in-scope transactions
  inScopeTransactions.forEach(tx => {
    const txDateStr = formatLedgerDate(tx.createdAt);
    const txType = tx.transactionType;

    let meta: any = {};
    if (tx.notes && typeof tx.notes === 'string' && tx.notes.trim().startsWith('{')) {
      try { meta = JSON.parse(tx.notes.split('\n')[0]); } catch {}
    }

    if (txType === 'payment_in' || txType === 'payment_out' || (isEngineer && txType === 'payment')) {
      const paid = Number(tx.paidAmount || tx.totalAmount || 0);
      if (paid > 0) {
        totalDeposit += paid;
        rows.push({
          date: txDateStr,
          description: 'জমা',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(paid),
          amount: '-',
          rawDeposit: paid,
          rawAmount: 0,
        });
      }

      const payDiscount = Number(tx.discount || 0);
      if (payDiscount > 0) {
        totalDeposit += payDiscount;
        rows.push({
          date: txDateStr,
          description: 'ছাড় / বাট্টা',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(payDiscount),
          amount: '-',
          rawDeposit: payDiscount,
          rawAmount: 0,
        });
      }
    } else if (txType === 'sale_return' || txType === 'purchase_return') {
      const retAmt = Number(tx.totalAmount || 0);
      if (retAmt > 0) {
        totalDeposit += retAmt;
        rows.push({
          date: txDateStr,
          description: 'পণ্য ফেরত',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(retAmt),
          amount: '-',
          rawDeposit: retAmt,
          rawAmount: 0,
        });
      }
    } else {
      // Normal sale / purchase invoice: Expand every line item
      const items = tx.items || [];
      if (items.length > 0) {
        items.forEach((it: any) => {
          let name = cleanLegacyBengaliText(it.product_name || it.name || 'পণ্য');
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          const itemTotal = Number(it.total) || (qty * price);

          totalAmount += itemTotal;
          rows.push({
            date: txDateStr,
            description: name,
            quantity: formatLedgerNum(qty),
            rate: formatLedgerNum(price),
            deposit: '-',
            amount: formatLedgerNum(itemTotal),
            rawDeposit: 0,
            rawAmount: itemTotal,
          });
        });
      } else {
        let bill = Number(tx.totalAmount || 0);
        if (txType === 'purchase' || !isCustomer || isSupplier) {
          const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
          const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);
          bill = Math.max(0, bill - (labCost + shipCost));
        }
        totalAmount += bill;
        rows.push({
          date: txDateStr,
          description: isCustomer ? 'পণ্য বিক্রয়' : 'পণ্য ক্রয়',
          quantity: '১.০',
          rate: formatLedgerNum(bill),
          deposit: '-',
          amount: formatLedgerNum(bill),
          rawDeposit: 0,
          rawAmount: bill,
        });
      }

      // Labor charge: Only for customer sales invoices, NEVER added to supplier ledger
      const labCost = Number(meta.laborCost || (tx as any).laborCost || (tx as any).labor_cost || 0);
      if (labCost > 0 && isCustomer && !isSupplier && txType !== 'purchase') {
        totalAmount += labCost;
        rows.push({
          date: txDateStr,
          description: 'লেবারি',
          quantity: '১.০',
          rate: formatLedgerNum(labCost),
          deposit: '-',
          amount: formatLedgerNum(labCost),
          rawDeposit: 0,
          rawAmount: labCost,
        });
      }

      // Transport / shipping charge: Only for customer sales invoices, NEVER added to supplier ledger
      const shipCost = Number(meta.shippingCost || (tx as any).shippingCost || (tx as any).shipping_cost || (tx as any).transportCost || 0);
      if (shipCost > 0 && isCustomer && !isSupplier && txType !== 'purchase') {
        totalAmount += shipCost;
        rows.push({
          date: txDateStr,
          description: 'ভাড়া',
          quantity: '১.০',
          rate: formatLedgerNum(shipCost),
          deposit: '-',
          amount: formatLedgerNum(shipCost),
          rawDeposit: 0,
          rawAmount: shipCost,
        });
      }

      // Special discount from invoice: deduct so ledger matches the actual invoice bill
      if (items.length > 0) {
        const discountPercent = Number(meta.discountPercent || 0);
        let invDiscount = Number(tx.discount !== undefined && tx.discount !== null ? tx.discount : (meta.discountFlat || meta.discount || meta.discountAmount || 0));
        if (invDiscount <= 0 && discountPercent > 0) {
          const sub = items.reduce((sum: number, it: any) => sum + (Number(it.total) || (Number(it.quantity || 1) * Number(it.price || 0))), 0);
          invDiscount = (sub * discountPercent) / 100;
        }

        if (invDiscount > 0) {
          totalAmount -= invDiscount;
          rows.push({
            date: txDateStr,
            description: 'বিশেষ ছাড়',
            quantity: '-',
            rate: '-',
            deposit: '-',
            amount: `-${formatLedgerNum(invDiscount)}`,
            rawDeposit: 0,
            rawAmount: -invDiscount,
          });
        }
      }

      // Immediate cash payment on invoice
      const initPaid = Number(tx.paidAmount || 0);
      if (initPaid > 0) {
        totalDeposit += initPaid;
        rows.push({
          date: txDateStr,
          description: 'জমা',
          quantity: '-',
          rate: '-',
          deposit: formatLedgerNum(initPaid),
          amount: '-',
          rawDeposit: initPaid,
          rawAmount: 0,
        });
      }
    }
  });

  const netBalance = totalAmount - totalDeposit;
  return { rows, totalAmount, totalDeposit, netBalance };
}

interface PartyLedgerPrintMemoProps {
  party: PartyProfile | null;
  transactions: any[];
  isCustomer: boolean;
  isSupplier?: boolean;
  isEngineer?: boolean;
  startDate?: string;
  endDate?: string;
}

export const PartyLedgerPrintMemo: React.FC<PartyLedgerPrintMemoProps> = ({
  party,
  transactions,
  isCustomer,
  isSupplier = false,
  isEngineer = false,
  startDate,
  endDate
}) => {
  const { rows, totalAmount, totalDeposit, netBalance } = buildLedgerPrintRows(
    party,
    transactions,
    isCustomer,
    isEngineer,
    startDate,
    endDate,
    isSupplier
  );

  return (
    <div 
      id="printable-memo-wrapper" 
      className="printable-memo font-bengali text-black bg-white w-full max-w-[850px] mx-auto p-4 leading-tight print:p-0 print:m-0 print:w-full print:max-w-none"
    >
      {/* 1. TOP COLORFUL SHOP BANNER (MATCHES USER'S UPLOADED FILE EXACTLY) */}
      <div className="relative overflow-hidden border border-slate-300 rounded-sm mb-1.5 p-2.5 text-center bg-gradient-to-r from-blue-50/50 via-white to-sky-50/50">
        
        {/* Left Geometric Angular Accents */}
        <div className="absolute top-0 left-0 w-24 h-full pointer-events-none overflow-hidden opacity-90">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,0 80,0 30,100 0,100" fill="#1e3a8a" />
            <polygon points="40,0 100,0 50,100 20,100" fill="#dc2626" opacity="0.85" />
            <polygon points="70,0 100,0 80,100 45,100" fill="#0284c7" opacity="0.9" />
          </svg>
        </div>

        {/* Right Geometric Angular Accents */}
        <div className="absolute top-0 right-0 w-24 h-full pointer-events-none overflow-hidden opacity-90">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="20,0 100,0 100,100 70,100" fill="#0284c7" />
            <polygon points="0,0 60,0 40,100 0,100" fill="#dc2626" opacity="0.85" />
            <polygon points="10,0 50,0 80,100 30,100" fill="#1e3a8a" opacity="0.9" />
          </svg>
        </div>

        {/* Banner Texts */}
        <div className="relative z-10 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 tracking-wider">
            মোবাইলঃ ০১৭১২-০১৪২২৫, ০১৭০১-২৮৫৩৩০, ০১৭২৭-৯৫২৫১৩
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#154284] tracking-tight leading-tight">
            মেসার্স দেলোয়ার এন্ড ব্রাদার্স
          </h1>
          <p className="text-xs font-bold text-[#9e1c1c]">
            প্রোঃ- মোঃ মিকাঈল শেখ
          </p>
          <div className="pt-0.5">
            <span className="inline-block bg-[#325288] text-white px-4 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
              পরিচালনায়ঃ মোঃ জুয়েল খাঁন ও মোঃ সায়মন শেখ
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#c52222]">
            রড, সিমেন্ট, পাইকারী ও খুচরা বিক্রয় করা হয়।
          </p>
          <p className="text-[11px] font-bold text-[#1a56b0]">
            ডিলারঃ এ্যাংকর সিমেন্ট এবং হোলসিম সিমেন্ট, BSRM / SCRM রড
          </p>
          <div className="pt-0.5">
            <span className="inline-block bg-[#1a365d] text-white px-5 py-0.5 rounded text-[10px] font-semibold">
              চৌধুরী নিউ সুপার মার্কেট ...., বঙ্গবন্ধু সড়ক, গোপালগঞ্জ।
            </span>
          </div>
        </div>
      </div>

      {/* 2. INVOICE META & CUSTOMER DETAILS BOX */}
      <div className="border border-black mb-1 bg-white">
        <div className="relative border-b border-black py-0.5 px-3 text-center">
          <span className="font-black text-xs tracking-widest uppercase">INVOICE</span>
          <span className="absolute right-3 top-0.5 font-bold text-xs">০১</span>
        </div>
        <div className="grid grid-cols-2 text-xs">
          <div className="border-r border-black py-1 px-3 flex items-center gap-2">
            <span className="font-black whitespace-nowrap">
              {isCustomer ? 'ক্রেতা ঃ' : isSupplier ? 'সরবরাহকারী ঃ' : 'পার্টি ঃ'}
            </span>
            <span className="font-bold text-black">{party?.name || ''}</span>
          </div>
          <div className="py-1 px-3 flex items-center gap-2">
            <span className="font-black whitespace-nowrap">ঠিকানা ঃ</span>
            <span className="font-normal text-black">{party?.address || party?.businessName || '—'}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN LEDGER CHRONOLOGICAL TABLE (6 COLUMNS) */}
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="border-b border-black bg-white font-black text-black">
            <th className="border border-black py-1 px-2 text-center w-[95px] font-bold">তারিখ</th>
            <th className="border border-black py-1 px-2 text-center font-bold">বিবরণ</th>
            <th className="border border-black py-1 px-2 text-center w-[85px] font-bold">পরিমাণ</th>
            <th className="border border-black py-1 px-2 text-center w-[75px] font-bold">দর</th>
            <th className="border border-black py-1 px-2 text-center w-[100px] font-bold">জমা</th>
            <th className="border border-black py-1 px-2 text-center w-[115px] font-bold">টাকা</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-b border-black text-black">
              <td colSpan={6} className="border border-black py-6 text-center font-bold text-slate-500">
                কোনো লেনদেনের তথ্য পাওয়া যায়নি
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className="border-b border-black text-black break-inside-avoid">
                <td className="border border-black py-0.5 px-2 text-center font-normal whitespace-nowrap">{row.date}</td>
                <td className="border border-black py-0.5 px-2 text-center font-bold">{row.description}</td>
                <td className="border border-black py-0.5 px-2 text-right font-normal">{row.quantity}</td>
                <td className="border border-black py-0.5 px-2 text-right font-normal">{row.rate}</td>
                <td className="border border-black py-0.5 px-2 text-right font-bold">{row.deposit}</td>
                <td className="border border-black py-0.5 px-2 text-right font-bold">{row.amount}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          {/* Summary Box (Matches Page 4 of User's PDF) */}
          <tr className="border-t border-black font-bold break-inside-avoid">
            <td colSpan={4} rowSpan={3} className="border border-black p-2.5 align-middle text-left bg-white">
              <div className="flex items-start gap-2">
                <span className="font-black whitespace-nowrap">কথায় ঃ</span>
                <span className="font-bold text-black">{numberToBengaliWords(netBalance).replace(' টাকা মাত্র', '')} টাকা মাত্র।</span>
              </div>
            </td>
            <td className="border border-black py-1 px-2 text-center font-black">মোট</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(totalAmount, toBnDigits('০.০'))}</td>
          </tr>
          <tr className="border-t border-black font-bold break-inside-avoid">
            <td className="border border-black py-1 px-2 text-center font-black">জমা</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(totalDeposit, toBnDigits('০.০'))}</td>
          </tr>
          <tr className="border-t border-black font-bold break-inside-avoid">
            <td className="border border-black py-1 px-2 text-center font-black">বাকী</td>
            <td className="border border-black py-1 px-2 text-right font-black">{formatLedgerNum(netBalance, toBnDigits('০.০'))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
