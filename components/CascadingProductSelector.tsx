'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';
import { toBengaliDigits } from '@/lib/bengaliUtils';

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
  cementType?: 'OPC' | 'PCC' | '';
  variant?: string;
  price: number;
  sellPrice?: number;
  unit: string;
  stock: number;
}


interface CascadingProductSelectorProps {
  products: ProductInventoryItem[];
  onProductChange: (selection: SelectedProductDetails | null) => void;
  showPriceField: boolean; // true for Invoice/Purchase, false for Order
  onlyInStock?: boolean; // true for Invoice/Order (Sales), false for Purchase
  autoLoadPrice?: boolean; // false by default: user manually enters unit price
  priceLabel?: string;
  itemPrice: number;
  onPriceChange: (price: number) => void;
  
  showTotalPriceField?: boolean; // true for Purchase Invoice
  itemTotalPrice?: number;
  onTotalPriceChange?: (total: number) => void;

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
  purchaseType?: 'rod' | 'cement';
  allowedCategories?: ('রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য')[];
}

const ROD_MM_OPTIONS = [
  '৮ মিলি',
  '১০ মিলি',
  '১২ মিলি',
  '১৬ মিলি',
  '২০ মিলি',
  '২২ মিলি',
  '২৫ মিলি',
  '৩২ মিলি',
];

const ROD_BRAND_OPTIONS = [
  'BSRM',
  'SCRM',
  'SCRM TMX',
  'KSML',
  'HKG',
  'DSRM',
];

const CEMENT_BRAND_OPTIONS = [
  'Holcim Strong structure',
  'Holcim Supercrete',
  'Holcim Supercrete Plus',
  'Holcim Coastal Guard',
  'Holcim Waterprotect',
  'King Brand',
  'Aman',
  'শাহ সিমেন্ট',
  'সেভেন রিংস সিমেন্ট',
  'ক্রাউন সিমেন্ট',
  'বসুন্ধরা সিমেন্ট',
  'ফ্রেশ সিমেন্ট',
  'প্রিমিয়ার সিমেন্ট',
  'আকিজ সিমেন্ট',
];

const RING_SIZE_OPTIONS = [
  '3-3',
  '3-4',
  '3-7',
  '7-7',
  '7-9',
  'Pistol ring',
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
  onlyInStock = false,
  autoLoadPrice = false,
  priceLabel = 'একক মূল্য (৳)',
  itemPrice,
  onPriceChange,
  showTotalPriceField = false,
  itemTotalPrice,
  onTotalPriceChange,
  showSellPriceField = false,
  itemSellPrice = 0,
  onSellPriceChange,
  showAlertLimitField = false,
  itemAlertLimit = 0,
  onAlertLimitChange,
  itemQty,
  onQtyChange,
  onAddCartItem,
  itemUnit,
  onUnitChange,
  buttonLabel = '+ যোগ করুন',
  className,
  purchaseType,
  allowedCategories,
}: CascadingProductSelectorProps) {
  const isPurchaseMode = showTotalPriceField || showSellPriceField || !!purchaseType;
  const [enteredTotal, setEnteredTotal] = useState<number | ''>('');

  const categoriesToDisplay = useMemo<('রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য')[]>(() => {
    if (allowedCategories && allowedCategories.length > 0) return allowedCategories;
    if (purchaseType === 'rod') return ['রড', 'রিং'];
    if (purchaseType === 'cement') return ['সিমেন্ট'];
    return ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];
  }, [allowedCategories, purchaseType]);

  const initialCategory = categoriesToDisplay[0] || 'রড';
  const [categoryState, setCategoryState] = useState<'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য'>(initialCategory);

  const category = categoriesToDisplay.includes(categoryState)
    ? categoryState
    : initialCategory;

  const [selectedMm, setSelectedMm] = useState<string>(
    initialCategory === 'রিং' ? '3-3' : initialCategory === 'সিমেন্ট' ? '' : '১০ মিলি'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    initialCategory === 'সিমেন্ট' ? 'Holcim Supercrete' : initialCategory === 'রিং' ? '৮ মিলি রিং' : 'BSRM'
  );
  const [enableCementType, setEnableCementType] = useState<boolean>(false);
  const [cementType, setCementType] = useState<'OPC' | 'PCC'>('PCC');
  const [otherProductId, setOtherProductId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  // Products with positive stock
  const inStockProducts = useMemo(() => {
    return products.filter(p => (p.stock || 0) > 0);
  }, [products]);

  // Dynamically filter Rod Brands
  const availableRodBrands = useMemo(() => {
    if (!onlyInStock) return ROD_BRAND_OPTIONS;
    const rodItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
    });

    const filtered = ROD_BRAND_OPTIONS.filter(b =>
      rodItems.some(p => p.name.toLowerCase().includes(b.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(b.toLowerCase())))
    );
    const customBrands = rodItems
      .map(p => p.brand)
      .filter((b): b is string => !!b && !filtered.includes(b));

    const combined = Array.from(new Set([...filtered, ...customBrands]));
    return combined;
  }, [onlyInStock, inStockProducts]);

  // Dynamically filter Rod mm options for selectedBrand
  const availableRodMms = useMemo(() => {
    if (!onlyInStock) return ROD_MM_OPTIONS;
    const rodItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রড' || cat.includes('rod') || name.includes('রড') || name.includes('মিলি') || name.includes('mm');
    });

    const filtered = ROD_MM_OPTIONS.filter(mm => {
      const mmNum = mm.replace(/[^0-9]/g, '');
      return rodItems.some(p => {
        const name = p.name.toLowerCase();
        const matchesBrand = !selectedBrand || name.includes(selectedBrand.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(selectedBrand.toLowerCase()));
        const matchesMm = name.includes(mm.toLowerCase()) || (mmNum ? (name.includes(`${mmNum}mm`) || name.includes(`${mmNum} মিলি`)) : false);
        return matchesBrand && matchesMm;
      });
    });
    return filtered;
  }, [onlyInStock, selectedBrand, inStockProducts]);

  // Dynamically filter Cement Brands
  const availableCementBrands = useMemo(() => {
    if (!onlyInStock) return CEMENT_BRAND_OPTIONS;
    const cementItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'সিমেন্ট' || cat.includes('cement') || name.includes('সিমেন্ট');
    });

    const filtered = CEMENT_BRAND_OPTIONS.filter(b => {
      const bCore = b.replace('সিমেন্ট', '').trim().toLowerCase();
      return cementItems.some(p => p.name.toLowerCase().includes(bCore) || (p.brand && p.brand.toLowerCase().includes(bCore)));
    });
    const customBrands = cementItems
      .map(p => p.brand)
      .filter((b): b is string => !!b && !filtered.includes(b));

    const combined = Array.from(new Set([...filtered, ...customBrands]));
    return combined;
  }, [onlyInStock, inStockProducts]);

  // Dynamically filter Ring Sizes & Brands
  const availableRingSizes = useMemo(() => {
    if (!onlyInStock) return RING_SIZE_OPTIONS;
    const ringItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রিং' || cat.includes('ring') || name.includes('রিং') || name.includes('ring');
    });

    const filtered = RING_SIZE_OPTIONS.filter(sz => {
      return ringItems.some(p => {
        const name = p.name.toLowerCase();
        if (name.includes(sz.toLowerCase())) return true;
        const parts = sz.split('-');
        if (parts.length === 2 && name.includes(parts[0]) && name.includes(parts[1])) return true;
        return false;
      });
    });

    const customSizes = ringItems
      .map(p => p.name)
      .filter((s): s is string => !!s && !filtered.includes(s));

    return Array.from(new Set([...filtered, ...customSizes]));
  }, [onlyInStock, inStockProducts]);

  const availableRingBrands = useMemo(() => {
    if (!onlyInStock) return RING_BRAND_OPTIONS;
    const ringItems = inStockProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'রিং' || cat.includes('ring') || name.includes('রিং') || name.includes('ring');
    });

    const filtered = RING_BRAND_OPTIONS.filter(b =>
      ringItems.some(p => p.name.toLowerCase().includes(b.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(b.toLowerCase())))
    );
    return filtered;
  }, [onlyInStock, inStockProducts]);

  // Handle Category Switch & defaults
  const handleCategorySelect = useCallback((cat: 'রড' | 'সিমেন্ট' | 'রিং' | 'অন্যান্য') => {
    setCategoryState(cat);
    if (cat === 'রড') {
      const defaultBrand = onlyInStock ? (availableRodBrands[0] || '') : 'BSRM';
      const defaultMm = onlyInStock ? (availableRodMms[0] || '') : '১০ মিলি';
      setSelectedMm(defaultMm);
      setSelectedBrand(defaultBrand);
      if (onUnitChange) onUnitChange('কেজি');
    } else if (cat === 'সিমেন্ট') {
      const defaultBrand = onlyInStock ? (availableCementBrands[0] || '') : 'Holcim Supercrete';
      setSelectedMm('');
      setSelectedBrand(defaultBrand);
      if (onUnitChange) onUnitChange('বস্তা');
    } else if (cat === 'রিং') {
      const defaultSz = onlyInStock ? (availableRingSizes[0] || '') : '3-3';
      const defaultBrand = onlyInStock ? (availableRingBrands[0] || '') : '৮ মিলি রিং';
      setSelectedMm(defaultSz);
      setSelectedBrand(defaultBrand);
      if (onUnitChange) onUnitChange('পিস');
    } else {
      setSelectedMm('');
      setSelectedBrand('');
      setOtherProductId('');
      if (onUnitChange) onUnitChange('পিস');
    }
    if (onSellPriceChange) onSellPriceChange(0);
    if (onAlertLimitChange) onAlertLimitChange(0);
  }, [onlyInStock, availableRodBrands, availableRodMms, availableCementBrands, availableRingSizes, availableRingBrands, onUnitChange, onAlertLimitChange, onSellPriceChange]);


  // Derive effective activeBrand and activeMm based on availability
  const activeBrand = useMemo(() => {
    if (onlyInStock) {
      if (category === 'সিমেন্ট') {
        return availableCementBrands.includes(selectedBrand) ? selectedBrand : (availableCementBrands[0] || '');
      } else if (category === 'রড') {
        return availableRodBrands.includes(selectedBrand) ? selectedBrand : (availableRodBrands[0] || '');
      } else if (category === 'রিং') {
        return availableRingBrands.includes(selectedBrand) ? selectedBrand : (availableRingBrands[0] || '');
      }
    }
    if (category === 'সিমেন্ট') {
      if (!availableCementBrands.includes(selectedBrand)) {
        return availableCementBrands[0] || 'Holcim Supercrete';
      }
    } else if (category === 'রড') {
      if (!availableRodBrands.includes(selectedBrand)) {
        return availableRodBrands[0] || 'BSRM';
      }
    } else if (category === 'রিং') {
      if (!availableRingBrands.includes(selectedBrand)) {
        return availableRingBrands[0] || '৮ মিলি রিং';
      }
    }
    return selectedBrand;
  }, [onlyInStock, category, availableRodBrands, availableCementBrands, availableRingBrands, selectedBrand]);

  const activeMm = useMemo(() => {
    if (onlyInStock) {
      if (category === 'রড') {
        return availableRodMms.includes(selectedMm) ? selectedMm : (availableRodMms[0] || '');
      }
      if (category === 'রিং') {
        return availableRingSizes.includes(selectedMm) ? selectedMm : (availableRingSizes[0] || '');
      }
    }
    return selectedMm;
  }, [onlyInStock, category, availableRodMms, availableRingSizes, selectedMm]);

  // Derive constructed product name & match inventory product
  const matchedProductInfo = useMemo(() => {
    const isPurchaseMode = showSellPriceField;
    const searchPool = onlyInStock ? inStockProducts : products;

    if (category === 'অন্যান্য') {
      if (otherProductId) {
        const found = searchPool.find(p => p.id === otherProductId);
        if (found) {
          const buyP = Number(found.buyPrice || 0);
          const sellP = Number(found.sellPrice || 0);
          return {
            productId: found.id,
            name: found.name,
            price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
            sellPrice: sellP,
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
      constructedName = activeBrand && activeMm ? `${activeBrand} ${activeMm} রড`.trim() : '';
      defaultUnit = 'কেজি';
    } else if (category === 'সিমেন্ট') {
      if (activeBrand) {
        if (activeBrand.endsWith('সিমেন্ট')) {
          constructedName = enableCementType && cementType
            ? `${activeBrand} (${cementType})`
            : activeBrand;
        } else {
          constructedName = enableCementType && cementType
            ? `${activeBrand} (${cementType}) সিমেন্ট`
            : `${activeBrand} সিমেন্ট`;
        }
      } else {
        constructedName = '';
      }
      defaultUnit = 'বস্তা';
    } else if (category === 'রিং') {
      if (activeMm.toLowerCase().includes('pistol')) {
        constructedName = activeBrand && activeBrand !== 'সাইট মেইড' ? `Pistol Ring (${activeBrand})` : 'Pistol Ring';
      } else {
        constructedName = activeMm ? `${activeMm} রিং ${activeBrand && activeBrand !== 'সাইট মেইড' ? `(${activeBrand})` : ''}`.trim() : '';
      }
      defaultUnit = 'পিস';
    }

    if (!constructedName) {
      return {
        productId: undefined,
        name: '',
        price: 0,
        sellPrice: 0,
        unit: defaultUnit,
        stock: 0,
      };
    }

    // Exact match search in searchPool
    const exact = searchPool.find(p => {
      const pName = p.name.toLowerCase();
      const cName = constructedName.toLowerCase();
      if (pName === cName) return true;
      if (category === 'রড') {
        return pName === `${activeMm} ${activeBrand} রড`.toLowerCase() || pName === `${activeBrand} ${activeMm} রড`.toLowerCase();
      }
      if (category === 'সিমেন্ট' && activeBrand) {
        if (enableCementType && cementType) {
          const typeLower = cementType.toLowerCase();
          const brandLower = activeBrand.toLowerCase();
          return pName.includes(brandLower) && pName.includes(typeLower);
        } else {
          if (pName.includes('opc') || pName.includes('pcc')) return false;
          return pName === activeBrand.toLowerCase() || pName === `${activeBrand} সিমেন্ট`.toLowerCase();
        }
      }
      if (category === 'রিং' && activeMm) {
        return pName === activeMm.toLowerCase() || pName === `${activeMm} রিং`.toLowerCase();
      }
      return false;
    });
    if (exact) {
      const buyP = Number(exact.buyPrice || 0);
      const sellP = Number(exact.sellPrice || 0);
      return {
        productId: exact.id,
        name: exact.name,
        price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
        sellPrice: sellP,
        unit: exact.unit || defaultUnit,
        stock: exact.stock || 0,
      };
    }

    // Partial search (contains mm and brand) in searchPool
    const partial = searchPool.find(p => {
      const pName = p.name.toLowerCase();
      if (category === 'রড') {
        return activeMm && activeBrand && pName.includes(activeMm.toLowerCase()) && pName.includes(activeBrand.toLowerCase());
      }
      if (category === 'সিমেন্ট') {
        if (enableCementType && cementType) {
          return activeBrand && pName.includes(activeBrand.toLowerCase()) && pName.includes(cementType.toLowerCase());
        }
        if (pName.includes('opc') || pName.includes('pcc')) return false;
        return activeBrand && pName.includes(activeBrand.toLowerCase());
      }
      if (category === 'রিং') {
        return activeMm && pName.includes(activeMm.toLowerCase());
      }
      return false;
    });

    if (partial) {
      const buyP = Number(partial.buyPrice || 0);
      const sellP = Number(partial.sellPrice || 0);
      return {
        productId: partial.id,
        name: partial.name,
        price: isPurchaseMode ? (buyP || sellP) : (sellP || buyP),
        sellPrice: sellP,
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
  }, [category, activeMm, activeBrand, otherProductId, customName, onlyInStock, inStockProducts, products, showSellPriceField, enableCementType, cementType]);

  // Sync state up to parent when selection changes
  useEffect(() => {
    onProductChange({
      productId: matchedProductInfo.productId,
      name: matchedProductInfo.name,
      category,
      mmSize: category === 'সিমেন্ট' && enableCementType ? cementType : activeMm,
      brand: activeBrand,
      cementType: category === 'সিমেন্ট' && enableCementType ? cementType : '',
      variant: category === 'সিমেন্ট' && enableCementType ? cementType : activeMm,
      price: matchedProductInfo.price,
      sellPrice: matchedProductInfo.sellPrice,
      unit: matchedProductInfo.unit,
      stock: matchedProductInfo.stock,
    });

    if (autoLoadPrice) {
      onPriceChange(matchedProductInfo.price || 0);
      if (onSellPriceChange) {
        onSellPriceChange(matchedProductInfo.sellPrice || 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, activeMm, activeBrand, otherProductId, customName, matchedProductInfo, autoLoadPrice, enableCementType, cementType]);

  return (
    <div className={cn('p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4 font-bengali', className)}>
      {/* 1. Category Selection Row */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>১. পণ্যের ধরন নির্বাচন করুন (Category)</span>
          {matchedProductInfo.stock > 0 ? (
            <span className="text-[11px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
              বর্তমান স্টক: {toBengaliDigits(matchedProductInfo.stock)} {matchedProductInfo.unit}
            </span>
          ) : (
            <span className="text-[11px] font-black text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
              ⚠️ স্টকে নেই (স্টক: ০ {matchedProductInfo.unit})
            </span>
          )}
        </Label>
        
        <div className={cn("grid gap-2", 
          categoriesToDisplay.length === 1 ? "grid-cols-1 sm:grid-cols-2" :
          categoriesToDisplay.length === 2 ? "grid-cols-2" :
          "grid-cols-2 sm:grid-cols-4"
        )}>
          {categoriesToDisplay.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={cn(
                  'py-2.5 px-3 rounded-xl font-black text-xs transition-all border flex items-center justify-center gap-1.5',
                  isSelected
                    ? 'bg-gradient-to-r from-[#b88e2d] to-[#d4af37] text-white border-[#8c6b1c] shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-[#fbf9f5]'
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
        {/* ROD FLOW: Brand Select + mm Select */}
        {category === 'রড' && (
          <>
            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. কোম্পানি / ব্র্যান্ড (Brand)</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRodBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো ব্র্যান্ড নেই</SelectItem>
                  ) : (
                    availableRodBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. মিলি (mm / Size)</Label>
              <Select 
                value={activeMm} 
                onValueChange={(val: string | null) => {
                  setSelectedMm(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRodMms.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো মিলি/সাইজ নেই</SelectItem>
                  ) : (
                    availableRodMms.map((mm) => (
                      <SelectItem key={mm} value={mm}>{mm}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* CEMENT FLOW: Brand Select + Cement Type (OPC / PCC) Switch */}
        {category === 'সিমেন্ট' && (
          <>
            <div className={cn(enableCementType ? "sm:col-span-7" : "sm:col-span-7", "space-y-1")}>
              <Label className="text-[11px] font-bold text-slate-600">২. সিমেন্ট ব্র্যান্ড (Brand)</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableCementBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো সিমেন্ট ব্র্যান্ড নেই</SelectItem>
                  ) : (
                    availableCementBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-5 space-y-1">
              <div className="flex items-center justify-between">
                <Label 
                  className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer select-none" 
                  onClick={() => {
                    const nextState = !enableCementType;
                    setEnableCementType(nextState);
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                >
                  <span>৩. সিমেন্ট টাইপ (OPC / PCC)</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded font-black tracking-wide transition-colors",
                    enableCementType ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-500 border border-slate-200"
                  )}>
                    {enableCementType ? "চালু" : "বন্ধ"}
                  </span>
                </Label>

                {/* Animated Switch Toggle Button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableCementType}
                  onClick={() => {
                    const nextState = !enableCementType;
                    setEnableCementType(nextState);
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                    enableCementType ? "bg-emerald-600" : "bg-slate-300"
                  )}
                  title={enableCementType ? "টাইপ বন্ধ করুন" : "টাইপ (OPC / PCC) চালু করুন"}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      enableCementType ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* When Switch is ON: OPC / PCC Selection Buttons */}
              {enableCementType ? (
                <div className="grid grid-cols-2 gap-1.5 h-10">
                  <button
                    type="button"
                    onClick={() => {
                      setCementType('OPC');
                      setEnteredTotal('');
                      onPriceChange(0);
                      if (onSellPriceChange) onSellPriceChange(0);
                    }}
                    className={cn(
                      "h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                      cementType === 'OPC'
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-md shadow-blue-500/20 scale-[1.01]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    <span>OPC</span>
                    {cementType === 'OPC' && <span className="text-[11px] font-black">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCementType('PCC');
                      setEnteredTotal('');
                      onPriceChange(0);
                      if (onSellPriceChange) onSellPriceChange(0);
                    }}
                    className={cn(
                      "h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                      cementType === 'PCC'
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-700 shadow-md shadow-emerald-500/20 scale-[1.01]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    <span>PCC</span>
                    {cementType === 'PCC' && <span className="text-[11px] font-black">✓</span>}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    setEnableCementType(true);
                    setEnteredTotal('');
                    onPriceChange(0);
                    if (onSellPriceChange) onSellPriceChange(0);
                  }}
                  className="h-10 rounded-xl bg-white border border-dashed border-slate-300 text-slate-500 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-300 hover:text-emerald-700 transition-all select-none"
                  title="সুইচ অন করে OPC বা PCC নির্বাচন করুন"
                >
                  <span className="text-emerald-600 font-bold">⚡</span>
                  <span>টাইপ যোগ করতে সুইচ অন করুন</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* RING FLOW: Size Select + Gauge/Brand Select */}
        {category === 'রিং' && (
          <>
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">২. রিং সাইজ (Size)</Label>
              <Select 
                value={activeMm} 
                onValueChange={(val: string | null) => {
                  setSelectedMm(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRingSizes.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো রিং সাইজ নেই</SelectItem>
                  ) : (
                    availableRingSizes.map((sz) => (
                      <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">৩. রিং গেজ / ক্যাটাগরি</Label>
              <Select 
                value={activeBrand} 
                onValueChange={(val: string | null) => {
                  setSelectedBrand(val || '');
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onSellPriceChange) onSellPriceChange(0);
                  if (onAlertLimitChange) onAlertLimitChange(0);
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-bengali text-xs font-bold">
                  {availableRingBrands.length === 0 ? (
                    <SelectItem value="_none" disabled>স্টকে কোনো রিং গেজ নেই</SelectItem>
                  ) : (
                    availableRingBrands.map((rb) => (
                      <SelectItem key={rb} value={rb}>{rb}</SelectItem>
                    ))
                  )}
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
                if (match && autoLoadPrice) {
                  if (showPriceField) onPriceChange(match.buyPrice || match.sellPrice || 0);
                  if (showSellPriceField && onSellPriceChange) onSellPriceChange(match.sellPrice || 0);
                }
              }}
            >
              <SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 text-xs font-bold">
                <SelectValue placeholder="পণ্য নির্বাচন করুন..." />
              </SelectTrigger>
              <SelectContent className="font-bengali text-xs font-bold max-h-60">
                {(onlyInStock ? products.filter(p => (p.stock || 0) > 0) : products).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sellPrice ? `— ৳${p.sellPrice}/${p.unit || 'পিস'}` : ''} (স্টক: {p.stock || 0} {p.unit || 'পিস'})
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
        <div className={cn(isPurchaseMode ? 'sm:col-span-3' : 'sm:col-span-4', 'space-y-1')}>
          <Label className="text-[11px] font-bold text-slate-600">পরিমাণ ({matchedProductInfo.unit})</Label>
          <Input
            type="number"
            min="1"
            value={!itemQty && itemQty !== 0 ? '' : itemQty}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onQtyChange('' as any);
              } else {
                const parsed = parseFloat(val);
                const newQty = isNaN(parsed) ? ('' as any) : parsed;
                onQtyChange(newQty);
                if (typeof newQty === 'number' && newQty > 0 && enteredTotal !== '' && Number(enteredTotal) > 0) {
                  const computedPrice = Math.round((Number(enteredTotal) / newQty) * 100) / 100;
                  onPriceChange(computedPrice);
                } else if (typeof newQty === 'number' && newQty > 0 && itemPrice > 0) {
                  setEnteredTotal(Math.round(newQty * itemPrice * 100) / 100);
                }
              }
            }}
            onFocus={(e) => e.target.select()}
            className="rounded-xl h-10 bg-white text-center font-bold text-xs"
          />
        </div>

        {/* Total Price Input (For Purchase Invoice) */}
        {isPurchaseMode && (
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-[11px] font-black text-indigo-700 flex items-center justify-between">
              <span>মোট ক্রয় মূল্য (৳)</span>
              <span className="text-[9px] font-bold text-indigo-500">(ইনভয়েস মোট টাকা)</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={enteredTotal !== '' ? enteredTotal : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setEnteredTotal('');
                  onPriceChange(0);
                  if (onTotalPriceChange) onTotalPriceChange(0);
                } else {
                  const parsed = parseFloat(val);
                  const newTotal = isNaN(parsed) ? '' : parsed;
                  setEnteredTotal(newTotal);
                  if (typeof newTotal === 'number') {
                    if (onTotalPriceChange) onTotalPriceChange(newTotal);
                    if (itemQty > 0) {
                      const computedPrice = Math.round((newTotal / itemQty) * 100) / 100;
                      onPriceChange(computedPrice);
                    }
                  }
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="মোট টাকা লিখুন"
              className="rounded-xl h-10 bg-indigo-50/70 border-indigo-200 text-center font-black text-xs text-indigo-700 focus:bg-white transition-colors"
            />
          </div>
        )}

        {/* Primary Price Field (Only in Non-Purchase / Sales mode) */}
        {showPriceField && !isPurchaseMode && (
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">{priceLabel}</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={!itemPrice && itemPrice !== 0 ? '' : itemPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onPriceChange('' as any);
                } else {
                  const parsed = parseFloat(val);
                  onPriceChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-orange-600"
            />
          </div>
        )}

        {/* Sell Price Field (For Purchase Invoice) */}
        {showSellPriceField && onSellPriceChange && (
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">বিক্রয় মূল্য (৳)</Label>
            <Input
              type="number"
              min="0"
              value={!itemSellPrice && itemSellPrice !== 0 ? '' : itemSellPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onSellPriceChange('' as any);
                } else {
                  const parsed = parseFloat(val);
                  onSellPriceChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-emerald-600"
            />
          </div>
        )}

        {/* Stock Alert Limit Field (For Purchase Invoice) */}
        {showAlertLimitField && onAlertLimitChange && (
          <div className="sm:col-span-1 space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">অ্যালার্ট</Label>
            <Input
              type="number"
              min="0"
              value={!itemAlertLimit && itemAlertLimit !== 0 ? '' : itemAlertLimit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onAlertLimitChange('' as any);
                } else {
                  const parsed = parseFloat(val);
                  onAlertLimitChange(isNaN(parsed) ? ('' as any) : parsed);
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="rounded-xl h-10 bg-white text-center font-bold text-xs text-purple-600"
            />
          </div>
        )}

        {/* Add Row Button */}
        <div className={cn(isPurchaseMode ? 'sm:col-span-2' : 'sm:col-span-4', 'flex items-end')}>
          <Button
            type="button"
            onClick={() => {
              if (onlyInStock) {
                if (matchedProductInfo.stock <= 0) {
                  toast.error('এই পণ্যটি বর্তমানে স্টকে নেই!');
                  return;
                }
                if (itemQty > matchedProductInfo.stock) {
                  toast.error(`⚠️ স্টকে মাত্র ${matchedProductInfo.stock} ${matchedProductInfo.unit} রয়েছে! এর বেশি বিক্রি/নেওয়া সম্ভব নয়।`);
                  return;
                }
              }
              onAddCartItem();
              setEnteredTotal('');
            }}
            className="w-full bg-gradient-to-r from-[#b88e2d] to-[#d4af37] hover:from-[#a37c22] hover:to-[#be9b2d] text-white h-10 rounded-xl font-bold text-xs shadow-xs"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>

      {/* Selected Item Summary Pill */}
      <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">আইটেম সারসংক্ষেপ:</span>
          <span className="font-black text-slate-900">{matchedProductInfo.name}</span>
          <span className="text-slate-500 font-bold">({toBengaliDigits(itemQty)} {matchedProductInfo.unit})</span>
        </div>
        <div className="flex items-center gap-3">
          {(isPurchaseMode ? (enteredTotal !== '' || (itemPrice > 0 && itemQty > 0)) : showPriceField) && (
            <span className="font-black text-indigo-700">
              মোট: ৳{toBengaliDigits(((enteredTotal !== '' && Number(enteredTotal) > 0) ? Number(enteredTotal) : (itemQty * (itemPrice || 0))).toLocaleString('en-IN'))}
            </span>
          )}
          {showSellPriceField && itemSellPrice > 0 && (
            <span className="font-bold text-emerald-600">
              (বিক্রয়: ৳{toBengaliDigits(itemSellPrice.toLocaleString('en-IN'))}/{matchedProductInfo.unit})
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

