'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { Search, Package, AlertCircle, AlertTriangle, Trash2, CheckCircle2, Edit3 } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatDualStock, toBnNum, formatBnCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  unit: string;
  alertThreshold: number;
  needsPriceReview?: boolean;
}

const categories = ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('সব');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Simple Delete State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Price Review / Fix State
  const [fixingPriceProduct, setFixingPriceProduct] = useState<Product | null>(null);
  const [editBuyPrice, setEditBuyPrice] = useState<number | string>('');
  const [editSellPrice, setEditSellPrice] = useState<number | string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.list();
      const safeData = Array.isArray(data) ? data : [];
      setProducts(safeData.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || 'অন্যান্য',
        brand: p.brand || '',
        buyPrice: Number(p.purchase_price || 0),
        sellPrice: Number(p.sell_price || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'পিস',
        alertThreshold: Number(p.min_stock || 10),
        needsPriceReview: Boolean(p.needs_price_review)
      })));
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      await fetchProducts();
    })();
    return () => { ignore = true; };
  }, []);

  const openPriceFixModal = (p: Product) => {
    setFixingPriceProduct(p);
    setEditBuyPrice(p.buyPrice || 0);
    setEditSellPrice(p.sellPrice || 0);
  };

  const handleSaveFixedPrice = async () => {
    if (!fixingPriceProduct) return;
    try {
      setIsSavingPrice(true);
      const newBuy = Number(editBuyPrice) || 0;
      const newSell = Number(editSellPrice) || 0;
      await api.inventory.update(fixingPriceProduct.id, {
        purchase_price: newBuy,
        sell_price: newSell,
        needs_price_review: false
      });
      toast.success('ক্রয় মূল্য সফলভাবে আপডেট ও ফিক্স করা হয়েছে');
      setProducts(prev => prev.map(p => 
        p.id === fixingPriceProduct.id ? {
          ...p,
          buyPrice: newBuy,
          sellPrice: newSell,
          needsPriceReview: false
        } : p
      ));
      if (viewingProduct?.id === fixingPriceProduct.id) {
        setViewingProduct(prev => prev ? {
          ...prev,
          buyPrice: newBuy,
          sellPrice: newSell,
          needsPriceReview: false
        } : null);
      }
      setFixingPriceProduct(null);
    } catch (err: any) {
      console.error('Error updating price:', err);
      toast.error('মূল্য আপডেট করা সম্ভব হয়নি');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDismissPriceAlert = async () => {
    if (!fixingPriceProduct) return;
    try {
      setIsSavingPrice(true);
      await api.inventory.update(fixingPriceProduct.id, {
        needs_price_review: false
      });
      toast.success('ক্রয় মূল্য নিশ্চিত করা হয়েছে ও অ্যালার্ট সরানো হয়েছে');
      setProducts(prev => prev.map(p => 
        p.id === fixingPriceProduct.id ? { ...p, needsPriceReview: false } : p
      ));
      if (viewingProduct?.id === fixingPriceProduct.id) {
        setViewingProduct(prev => prev ? { ...prev, needsPriceReview: false } : null);
      }
      setFixingPriceProduct(null);
    } catch (err: any) {
      console.error('Error dismissing alert:', err);
      toast.error('অ্যালার্ট সরানো যায়নি');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      setIsDeleting(true);
      await api.inventory.delete(deletingProduct.id);
      toast.success('পণ্যটি মুছে ফেলা হয়েছে');
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
      if (viewingProduct?.id === deletingProduct.id) {
        setViewingProduct(null);
      }
      setDeletingProduct(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error('মুছে ফেলা সম্ভব হয়নি');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = products.filter(p => 
    (filterCat === 'সব' || p.category === filterCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())))
  );

  const alertItems = products.filter(p => p.stock <= p.alertThreshold);
  const priceReviewItems = products.filter(p => p.needsPriceReview);
  const totalStockValue = products.reduce((acc, p) => acc + (p.buyPrice * p.stock), 0);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-bengali">পণ্য তালিকা ও স্টক</h2>
            <p className="text-slate-500 font-bengali text-sm">রড, সিমেন্ট, রিং ও অন্যান্য পণ্যের বর্তমান মজুদ ও বিবরণ</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'মোট পণ্য', value: `${toBnNum(products.length)} ধরনের`, color: 'text-slate-800', bg: 'bg-white' },
            { 
              label: 'মূল্য রিভিউ অ্যালার্ট', 
              value: priceReviewItems.length > 0 ? `${toBnNum(priceReviewItems.length)}টি পণ্য` : 'সব ঠিক আছে ✓', 
              color: priceReviewItems.length > 0 ? 'text-amber-600' : 'text-slate-600',
              bg: priceReviewItems.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white'
            },
            { label: 'স্টক সতর্কতা', value: `${toBnNum(alertItems.length)}টি পণ্য`, color: 'text-rose-600', bg: 'bg-white' },
            { label: 'স্টক মূল্য', value: formatBnCurrency(totalStockValue), color: 'text-orange-600', bg: 'bg-white' },
          ].map((s, i) => (
            <Card key={i} className={cn("border-slate-200 shadow-sm rounded-lg", s.bg)}>
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold font-bengali">{s.label}</p>
                <p className={cn("text-xl font-black font-bengali mt-1", s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Table */}
          <Card className="lg:col-span-3 border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3 bg-slate-50/50">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="পণ্য বা ব্র্যান্ড খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white border-slate-200 font-bengali rounded-lg" />
              </div>
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                {['সব', ...categories].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold font-bengali transition-colors cursor-pointer whitespace-nowrap", filterCat === cat ? 'bg-orange-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold py-3">পণ্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold">বিভাগ</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right">ক্রয় মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right">বিক্রয় মূল্য</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-center">বর্তমান স্টক</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-center w-24">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bengali">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bengali">কোনো পণ্য পাওয়া যায়নি</TableCell></TableRow>
                  ) : filtered.map((product) => (
                    <TableRow key={product.id} onClick={() => setViewingProduct(product)} className={cn("border-b border-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors", product.needsPriceReview && "bg-amber-50/30")}>
                      <TableCell className="p-3 font-bengali">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                          {product.needsPriceReview && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 gap-1 animate-pulse" title="ক্রয় চালান এডিট হওয়ায় ক্রয় মূল্য পর্যালোচনা প্রয়োজন">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              মূল্য রিভিউ
                            </span>
                          )}
                        </div>
                        {product.brand && <div className="text-[10px] text-slate-400 font-bold">{product.brand}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold font-bengali uppercase", 
                          product.category === 'রড' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                          product.category === 'রিং' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                          product.category === 'সিমেন্ট' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          'bg-slate-100 text-slate-600'
                        )}>
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bengali text-sm">
                        {product.needsPriceReview ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-amber-700">{formatBnCurrency(product.buyPrice)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPriceFixModal(product);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95"
                              title="ক্রয় মূল্য ফিক্স করুন"
                            >
                              <AlertTriangle className="w-3 h-3" /> ফিক্স করুন
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">{formatBnCurrency(product.buyPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bengali font-bold text-slate-800 text-sm">{formatBnCurrency(product.sellPrice)}</TableCell>
                      <TableCell className="text-center font-bengali">
                        {(() => {
                          const stockInfo = formatDualStock(product.stock, product.unit, product.category);
                          return (
                            <div className="flex flex-col items-center">
                              <span className={cn("font-black text-sm", product.stock <= product.alertThreshold ? 'text-rose-600' : 'text-slate-800')}>
                                {stockInfo.main}
                                {product.stock <= product.alertThreshold && <span className="ml-1 text-rose-500">⚠</span>}
                              </span>
                              {stockInfo.sub && (
                                <span className="text-[11px] font-bold text-slate-500">
                                  {stockInfo.sub}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center font-bengali p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {product.needsPriceReview && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPriceFixModal(product)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="ক্রয় মূল্য ফিক্স করুন"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingProduct(product)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alert Sidebar */}
          <div className="space-y-4 font-bengali">
            {/* Price Review Alert Section */}
            {priceReviewItems.length > 0 && (
              <Card className="border-amber-200 shadow-sm rounded-lg bg-amber-50/40">
                <div className="p-4 border-b border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-amber-900 text-sm">ক্রয় মূল্য রিভিউ ({toBnNum(priceReviewItems.length)})</h3>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[11px] text-amber-800 leading-snug">চালান এডিটের কারণে নিচের পণ্যের ক্রয় মূল্য পর্যালোচনার প্রয়োজন:</p>
                  {priceReviewItems.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => openPriceFixModal(p)} 
                      className="p-2.5 bg-white border border-amber-200 rounded-lg flex justify-between items-center cursor-pointer hover:bg-amber-50 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-amber-700 font-bold">বর্তমান কেনা: {formatBnCurrency(p.buyPrice)}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-xs">
                        ফিক্স করুন
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alert Section */}
            <Card className="border-slate-200 shadow-sm rounded-lg bg-white">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">স্টক সতর্কতা</h3>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <CardContent className="p-3 space-y-2">
                {alertItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">সব পণ্য পর্যাপ্ত আছে ✓</p>
                ) : alertItems.map(p => {
                  const sInfo = formatDualStock(p.stock, p.unit, p.category);
                  return (
                    <div key={p.id} onClick={() => setViewingProduct(p)} className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex justify-between items-center cursor-pointer hover:bg-rose-100/70 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-rose-900">{p.name}</p>
                        {p.brand && <p className="text-[10px] text-rose-600 font-bold">{p.brand}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-700">{sInfo.main}</span>
                        {sInfo.sub && <p className="text-[10px] text-rose-500 font-bold">{sInfo.sub}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* View Product Details Modal */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => { if (!open) setViewingProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              পণ্যের বিস্তারিত তথ্য
            </DialogTitle>
          </DialogHeader>

          {viewingProduct && (
            <div className="space-y-4 py-2">
              {/* Header summary box */}
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold uppercase">
                    {viewingProduct.category}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {viewingProduct.needsPriceReview && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> মূল্য রিভিউ প্রয়োজন
                      </span>
                    )}
                    {viewingProduct.stock <= viewingProduct.alertThreshold && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> স্বল্প স্টক
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-2">{viewingProduct.name}</h3>
                {viewingProduct.brand && (
                  <p className="text-xs text-slate-500 font-semibold">ব্র্যান্ড: {viewingProduct.brand}</p>
                )}
              </div>

              {/* Price Review Notice in View Modal */}
              {viewingProduct.needsPriceReview && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-xs text-amber-800">
                    <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> ক্রয় চালান এডিট সতর্কতা</p>
                    <p className="text-[11px] mt-0.5 text-amber-700">চালান এডিটের কারণে এর ক্রয় মূল্য পর্যালোচনার তালিকায় আছে।</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = viewingProduct;
                      setViewingProduct(null);
                      openPriceFixModal(p);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs"
                  >
                    মূল্য ফিক্স করুন
                  </Button>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">ক্রয় মূল্য</span>
                  <span className="text-sm font-black text-slate-700">{formatBnCurrency(viewingProduct.buyPrice)}</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">প্রতি {viewingProduct.unit}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">বিক্রয় মূল্য</span>
                  <span className="text-sm font-black text-emerald-600">{formatBnCurrency(viewingProduct.sellPrice)}</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">প্রতি {viewingProduct.unit}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">বর্তমান স্টক</span>
                  {(() => {
                    const stockInfo = formatDualStock(viewingProduct.stock, viewingProduct.unit, viewingProduct.category);
                    return (
                      <div>
                        <span className={cn("text-sm font-black block", viewingProduct.stock <= viewingProduct.alertThreshold ? "text-rose-600" : "text-slate-800")}>
                          {stockInfo.main}
                          {viewingProduct.stock <= viewingProduct.alertThreshold && <span className="ml-1 text-rose-500">⚠</span>}
                        </span>
                        {stockInfo.sub && <span className="text-[10px] text-slate-500 font-semibold block">{stockInfo.sub}</span>}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">আনুমানিক লাভ ({viewingProduct.unit})</span>
                  <span className="text-sm font-black text-orange-600">
                    {formatBnCurrency(viewingProduct.sellPrice - viewingProduct.buyPrice)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">মোট মজুদ মূল্য</span>
                  <span className="text-sm font-black text-slate-800">
                    {formatBnCurrency(viewingProduct.buyPrice * viewingProduct.stock)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">সতর্কতা সীমা</span>
                  <span className="text-sm font-black text-slate-700">
                    {toBnNum(viewingProduct.alertThreshold)} {viewingProduct.unit}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    setDeletingProduct(prod);
                  }} 
                  className="font-bengali text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  মুছে ফেলুন
                </Button>
                <Button variant="default" onClick={() => setViewingProduct(null)} className="font-bengali rounded-lg text-xs">
                  বন্ধ করুন
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price Fix & Review Modal */}
      <Dialog open={!!fixingPriceProduct} onOpenChange={(open) => { if (!open) setFixingPriceProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              ক্রয় মূল্য পর্যালোচনা ও ফিক্স
            </DialogTitle>
          </DialogHeader>

          {fixingPriceProduct && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                  ইনভয়েস এডিট সংক্রান্ত তথ্য:
                </p>
                <p className="text-amber-800 leading-relaxed">
                  ক্রয় চালান এডিট করার কারণে <strong className="font-bold">&quot;{fixingPriceProduct.name}&quot;</strong> পণ্যের স্টকে পরিবর্তন এসেছে, কিন্তু এর ক্রয় মূল্য অপরিবর্তিত রাখা হয়েছে। আপনি চাইলে নিচে ক্রয় মূল্য ফিক্স করে আপডেট করতে পারেন অথবা বর্তমান মূল্য নিশ্চিত করতে পারেন।
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    ক্রয় মূল্য (প্রতি {fixingPriceProduct.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(e.target.value)}
                    className="font-bengali text-sm font-bold bg-white border-slate-300 focus:border-amber-500"
                    placeholder="ক্রয় মূল্য দিন"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    বিক্রয় মূল্য (প্রতি {fixingPriceProduct.unit})
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(e.target.value)}
                    className="font-bengali text-sm font-bold bg-white border-slate-300 focus:border-amber-500"
                    placeholder="বিক্রয় মূল্য দিন"
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDismissPriceAlert}
                  disabled={isSavingPrice}
                  className="w-full sm:w-auto font-bengali text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  বর্তমান মূল্য ঠিক আছে
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveFixedPrice}
                  disabled={isSavingPrice}
                  className="w-full sm:w-auto font-bengali bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                >
                  {isSavingPrice ? 'সংরক্ষণ হচ্ছে...' : 'মূল্য ফিক্স ও আপডেট করুন'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProduct} onOpenChange={(open) => { if (!open) setDeletingProduct(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl p-6 font-bengali">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              পণ্য মুছে ফেলতে চান?
            </DialogTitle>
          </DialogHeader>

          {deletingProduct && (
            <p className="text-sm text-slate-600 py-2">
              আপনি কি নিশ্চিত যে <strong className="text-slate-900 font-bold">&quot;{deletingProduct.name}&quot;</strong> পণ্যটি তালিকা থেকে মুছে ফেলতে চান?
            </p>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingProduct(null)}
              disabled={isDeleting}
              className="font-bengali rounded-lg text-xs"
            >
              বাতিল
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="font-bengali rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
