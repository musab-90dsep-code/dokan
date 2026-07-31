'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ProductInventoryItem {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice?: number;
  stock: number;
  unit: string;
  category?: string;
  brand?: string;
  code?: string;
  alertThreshold?: number;
}

export interface SelectedProductDetails {
  productId?: string;
  name: string;
  category: 'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য';
  mmSize?: string;
  brand?: string;
  price: number;
  sellPrice?: number;
  unit: string;
  stock: number;
}

interface CascadingProductSelectorProps {
  products: ProductInventoryItem[];
  onProductChange: (selection: SelectedProductDetails | null) => void;
  showPriceField: boolean; // true for Invoice/Purchase, false for Order
  priceLabel?: string;
  itemPrice: number;
  onPriceChange: (price: number) => void;
  
  showSellPriceField?: boolean; // true for Purchase Invoice
  itemSellPrice?: number;
  onSellPriceChange?: (price: number) => void;
  
  showAlertLimitField?: boolean; // true for Purchase Invoice
  itemAlertLimit?: number;
  onAlertLimitChange?: (limit: number) => void;

  itemQty: number;
  onQtyChange: (qty: number) => void;
  onAddCartItem: () => void;
  itemUnit?: string;
  onUnitChange?: (unit: string) => void;
  buttonLabel?: string;
  className?: string;
}

const ROD_MM_OPTIONS = [
  '৮ মিলি',
  '১০ মিলি',
  '১২ মিলি',
  '১৬ মিলি',
  '২০ মিলি',
  '২৫ মিলি',
  '৩২ মিলি',
];

const ROD_BRAND_OPTIONS = [
  'BSRM',
  'KSRM',
  'AKS',
  'GPH Ispat',
  'Baizid',
  'Anwar Ispat',
  'Metrocem',
  'RSRM',
];

const CEMENT_BRAND_OPTIONS = [
  'শাহ সিমেন্ট',
  'সেভেন রিংস',
  'বসুন্ধরা সিমেন্ট',
  'ফ্রেশ সিমেন্ট',
  'ক্রাউন সিমেন্ট',
  'প্রিমিয়ার সিমেন্ট',
  'হোলসিম সিমেন্ট',
  'আকিজ সিমেন্ট',
];

const RING_SIZE_OPTIONS = [
  '৭″ × ৭″',
  '৭″ × ৯″',
  '৮″ × ৮″',
  '৮″ × ১০″',
  '৬″ × ৬″',
  '১০″ × ১০″',
];

const RING_BRAND_OPTIONS = [
  '৮ মিলি রিং',
  '১০ মিলি রিং',
  'সাইট মেইড',
];

export function CascadingProductSelector({
  products,
  onProductChange,
  showPriceField,
  priceLabel = 'একক মূল্য (৳)',
  itemPrice,
  onPriceChange,
  showSellPriceField = false,
  itemSellPrice = 0,
  onSellPriceChange,
  showAlertLimitField = false,
  itemAlertLimit = 200,
  onAlertLimitChange,
  itemQty,
  onQtyChange,
  onAddCartItem,
  itemUnit,
  onUnitChange,
  buttonLabel = '+ যোগ করুন',
  className,
}: CascadingProductSelectorProps) {
  const [category, setCategory] = useState<'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য'>('রড');
  const [selectedMm, setSelectedMm] = useState<string>('১০ মিলি');
  const [selectedBrand, setSelectedBrand] = useState<string>('BSRM');
  const [otherProductId, setOtherProductId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  // Handle Category Switch & defaults
  const handleCategorySelect = (cat: 'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য') => {
    setCategory(cat);
    if (cat === 'রড') {
      setSelectedMm('১০ মিলি');
      setSelectedBrand('BSRM');
      if (onUnitChange) onUnitChange('কেজি');
      if (onAlertLimitChange) onAlertLimitChange(200);
    } else if (cat === 'সিমেন্ট') {
      setSelectedMm('');
      setSelectedBrand('শাহ সিমেন্ট');
      if (onUnitChange) onUnitChange('বস্তা');
      if (onAlertLimitChange) onAlertLimitChange(50);
    } else if (cat === 'রিং') {
      setSelectedMm('৭″ × ৭″');
      setSelectedBrand('৮ মিলি রিং');
      if (onUnitChange) onUnitChange('পিস');
      if (onAlertLimitChange) onAlertLimitChange(100);
    } else {
      setSelectedMm('');
      setSelectedBrand('');
      setOtherProductId('');
      if (onUnitChange) onUnitChange('পিস');
    }
  };

  // Derive constructed product name & match inventory product
  const matchedProductInfo = useMemo(() => {
    if (category === 'অন্যান্য') {
      if (otherProductId) {
        const found = products.find(p => p.id === otherProductId);
        if (found) {
          return {
            productId: found.id,
            name: found.name,
            price: found.buyPrice || found.sellPrice || 0,
            sellPrice: found.sellPrice || 0,
            unit: found.unit || 'পিস',
            stock: found.stock || 0,
          };
        }
      }
      return {
        productId: undefined,
        name: customName || 'অন্যান্য পণ্য',
        price: 0,
        sellPrice: 0,
        unit: 'পিস',
        stock: 0,
      };
    }

    let constructedName = '';
    let defaultUnit = 'পিস';

    if (category === 'রড') {
      constructedName = `${selectedMm} ${selectedBrand} রড`.trim();
      defaultUnit = 'কেজি';
    } else if (category === 'সিমেন্ট') {
      constructedName = selectedBrand.endsWith('সিমেন্ট') ? selectedBrand : `${selectedBrand} সিমেন্ট`;
      defaultUnit = 'বস্তা';
    } else if (category === 'রিং') {
      constructedName = `${selectedMm} রিং ${selectedBrand ? `(${selectedBrand})` : ''}`.trim();
      defaultUnit = 'পিস';
    }

    // Exact match search
    const exact = products.find(p => p.name.toLowerCase() === constructedName.toLowerCase());
    if (exact) {
      return {
        productId: exact.id,
        name: exact.name,
        price: exact.buyPrice || exact.sellPrice || 0,
        sellPrice: exact.sellPrice || 0,
        unit: exact.unit || defaultUnit,
        stock: exact.stock || 0,
      };
    }

    // Partial search (contains mm and brand)
    const partial = products.find(p => {
      const pName = p.name.toLowerCase();
      if (category === 'রড') {
        return pName.includes(selectedMm.toLowerCase()) && pName.includes(selectedBrand.toLowerCase());
      }
      if (category === 'সিমেন্ট') {
        return pName.includes(selectedBrand.toLowerCase());
      }
      if (category === 'রিং') {
        return pName.includes(selectedMm.toLowerCase());
      }
      return false;
    });

    if (partial) {
      return {
        productId: partial.id,
        name: partial.name,
        price: partial.buyPrice || partial.sellPrice || 0,
        sellPrice: partial.sellPrice || 0,
        unit: partial.unit || defaultUnit,
        stock: partial.stock || 0,
      };
    }

    return {
      productId: undefined,
      name: constructedName,
      price: 0,
      sellPrice: 0,
      unit: defaultUnit,
      stock: 0,
    };
  }, [category, selectedMm, selectedBrand, otherProductId, customName, products]);

  // Sync state up to parent when selection changes
  useEffect(() => {
    onProductChange({
      productId: matchedProductInfo.productId,
      name: matchedProductInfo.name,
      category,
      mmSize: selectedMm,
      brand: selectedBrand,
      price: matchedProductInfo.price,
      sellPrice: matchedProductInfo.sellPrice,
      unit: matchedProductInfo.unit,
      stock: matchedProductInfo.stock,
    });

    if (matchedProductInfo.price > 0 && itemPrice === 0) {
      onPriceChange(matchedProductInfo.price);
    }
    if (matchedProductInfo.sellPrice && matchedProductInfo.sellPrice > 0 && itemSellPrice === 0 && onSellPriceChange) {
      onSellPriceChange(matchedProductInfo.sellPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedMm, selectedBrand, otherProductId, customName, matchedProductInfo]);

  return (
    <div className={cn('p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4 font-bengali', className)}>
      {/* 1. Category Selection Row */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>১. পণ্যের ধরন নির্বাচন করুন (Category)</span>
          {matchedProductInfo.stock > 0 && (
            <span className="text-[11px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
              বর্তমান স্টক: {matchedProductInfo.stock} {matchedProductInfo.unit}
            </span>
          )}
        </Label>
        
        <div className="grid grid-cols-4 gap-2">
          {(['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'] as const).map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={cn(
                  'py-2 px-3 rounded-xl font-black text-xs transition-all border flex items-center justify-center gap-1.5',
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20 scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                {cat === 'রড' && '🏗️'}
                {cat === 'সিমেন্ট' && '🧱'}
                {cat === 'রিং' && '⭕'}
                {cat === 'অন্যান্য' && '📦'}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cascading Attributes Row (Based on Category) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* ROD FLOW: mm Select + Brand Select */}
        {category === 'রড' && (
          <>
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. মিলি (mm / Size)</Label>
              <Select value={selectedMm} onValueChange={(val: string | null) => setSelectedMm(val || '১০ মিলি')}>
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {ROD_MM_OPTIONS.map((mm) => (
                    <SelectItem key={mm} value={mm}>{mm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. ব্র্যান্ড (Brand)</Label>
              <Select value={selectedBrand} onValueChange={(val: string | null) => setSelectedBrand(val || 'BSRM')}>
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {ROD_BRAND_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* CEMENT FLOW: Brand Select */}
        {category === 'সিমেন্ট' && (
          <div className="sm:col-span-12 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">২. সিমেন্ট ব্র্যান্ড (Brand)</Label>
            <Select value={selectedBrand} onValueChange={(val: string | null) => setSelectedBrand(val || 'শাহ সিমেন্ট')}>
              <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-bengali text-xs font-bold">
                {CEMENT_BRAND_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* RING FLOW: Size Select + Gauge/Brand Select */}
        {category === 'রিং' && (
          <>
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. রিং সাইজ (Size)</Label>
              <Select value={selectedMm} onValueChange={(val: string | null) => setSelectedMm(val || '৭″ × ৭″')}>
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {RING_SIZE_OPTIONS.map((sz) => (
                    <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. রিং গেজ / ক্যাটাগরি</Label>
              <Select value={selectedBrand} onValueChange={(val: string | null) => setSelectedBrand(val || '৮ মিলি রিং')}>
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {RING_BRAND_OPTIONS.map((rb) => (
                    <SelectItem key={rb} value={rb}>{rb}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* OTHERS FLOW: Existing Product Select */}
        {category === 'অন্যান্য' && (
          <div className="sm:col-span-12 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">পণ্য নির্বাচন করুন</Label>
            <Select 
              value={otherProductId} 
              onValueChange={(val: string | null) => {
                const v = val || '';
                setOtherProductId(v);
                const match = products.find(p => p.id === v);
                if (match) {
                  if (showPriceField) onPriceChange(match.buyPrice || match.sellPrice || 0);
                  if (showSellPriceField && onSellPriceChange) onSellPriceChange(match.sellPrice || 0);
                }
              }}
            >
              <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                <SelectValue placeholder="পণ্য নির্বাচন করুন..." />
              </SelectTrigger>
              <SelectContent className="font-bengali text-xs font-bold max-h-60">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sellPrice ? `— ৳${p.sellPrice}/${p.unit || 'পিস'}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 3. Quantities, Prices & Alert Limit Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
        {/* Quantity Field */}
        <div className="sm:col-span-3 space-y-1">
          <Label className="text-[11px] font-bold text-slate-600">পরিমাণ ({matchedProductInfo.unit})</Label>
          <Input
            type="number"
            min="1"
            value={isNaN(itemQty) ? '' : itemQty}
            onChange={(e) => onQtyChange(parseFloat(e.target.value) || 1)}
            className="rounded-xl h-10 bg-white text-center font-bold text-xs"
          />
        </div>

        {/* Primary Price Field (Buy Price or Unit Price) */}
        {showPriceField && (
          <div className={cn(showSellPriceField ? 'sm:col-span-3' : 'sm:col-span-4', 'space-y-1')}>
            <Label className="text-[11px] font-bold text-slate-600">{priceLabel}</Label>
            <Input
              type="number"
              min="0"
              value={!itemPrice || isNaN(itemPrice) ? '' : itemPrice}
              onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-orange-600"
            />
          </div>
        )}

        {/* Sell Price Field (For Purchase Invoice) */}
        {showSellPriceField && onSellPriceChange && (
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">বিক্রয় মূল্য (৳)</Label>
            <Input
              type="number"
              min="0"
              value={!itemSellPrice || isNaN(itemSellPrice) ? '' : itemSellPrice}
              onChange={(e) => onSellPriceChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-emerald-600"
            />
          </div>
        )}

        {/* Stock Alert Limit Field (For Purchase Invoice) */}
        {showAlertLimitField && onAlertLimitChange && (
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">স্টক অ্যালার্ট লিমিট</Label>
            <Input
              type="number"
              min="0"
              value={!itemAlertLimit || isNaN(itemAlertLimit) ? '' : itemAlertLimit}
              onChange={(e) => onAlertLimitChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-purple-600"
            />
          </div>
        )}

        {/* Add Row Button */}
        <div className="sm:col-span-3 flex items-end">
          <Button
            type="button"
            onClick={onAddCartItem}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-10 rounded-xl font-bold text-xs shadow-xs"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>

      {/* Selected Item Summary Pill */}
      <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">আইটেম সমারী:</span>
          <span className="font-black text-slate-900">{matchedProductInfo.name}</span>
          <span className="text-slate-500 font-bold">({itemQty} {matchedProductInfo.unit})</span>
        </div>
        <div className="flex items-center gap-3">
          {showPriceField && (
            <span className="font-black text-orange-600">
              ক্রয় মোট: ৳{(itemQty * (itemPrice || matchedProductInfo.price || 0)).toLocaleString()}
            </span>
          )}
          {showSellPriceField && itemSellPrice > 0 && (
            <span className="font-bold text-emerald-600">
              (বিক্রয়: ৳{itemSellPrice}/{matchedProductInfo.unit})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
