'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';
import { Search, Package, AlertCircle } from 'lucide-react';
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
}

const categories = ['রড', 'সিমেন্ট', 'রিং', 'অন্যান্য'];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('সব');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

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
        alertThreshold: Number(p.min_stock || 10)
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

  const filtered = products.filter(p => 
    (filterCat === 'সব' || p.category === filterCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())))
  );

  const alertItems = products.filter(p => p.stock <= p.alertThreshold);
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
            { label: 'মোট পণ্য', value: `${toBnNum(products.length)} ধরনের`, color: 'text-slate-800' },
            { label: 'স্টক সতর্কতা', value: `${toBnNum(alertItems.length)}টি পণ্য`, color: 'text-rose-600' },
            { label: 'স্টক মূল্য', value: formatBnCurrency(totalStockValue), color: 'text-orange-600' },
            { label: 'আজকের স্টক স্থিতি', value: `${toBnNum(products.length)}টি পণ্য`, color: 'text-green-600' },
          ].map((s, i) => (
            <Card key={i} className="bg-white border-slate-200 shadow-sm rounded-lg">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bengali">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bengali">কোনো পণ্য পাওয়া যায়নি</TableCell></TableRow>
                  ) : filtered.map((product) => (
                    <TableRow key={product.id} onClick={() => setViewingProduct(product)} className="border-b border-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                      <TableCell className="p-3 font-bengali">
                        <div className="font-bold text-slate-800 text-sm">{product.name}</div>
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
                      <TableCell className="text-right font-bengali text-slate-500 text-sm">{formatBnCurrency(product.buyPrice)}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alert Sidebar */}
          <div className="space-y-4 font-bengali">
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
                  {viewingProduct.stock <= viewingProduct.alertThreshold && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> স্বল্প স্টক
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-2">{viewingProduct.name}</h3>
                {viewingProduct.brand && (
                  <p className="text-xs text-slate-500 font-semibold">ব্র্যান্ড: {viewingProduct.brand}</p>
                )}
              </div>

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

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setViewingProduct(null)} className="w-full font-bengali rounded-lg">
                  বন্ধ করুন
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
