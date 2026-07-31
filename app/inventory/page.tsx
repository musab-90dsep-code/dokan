'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { api, ProductData } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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
const units = ['কেজি', 'পিস', 'টন', 'বস্তা', 'ফুট'];
const rodSizes = ['৮ মিলি', '১০ মিলি', '১২ মিলি', '১৬ মিলি', '২০ মিলি', '২২ মিলি', '২৫ মিলি', '২৮ মিলি', '৩২ মিলি'];
const ringSizes = ['৭" × ৭"', '৮" × ৮"', '৭" × ১১"', '৪" × ৭"', '৬ মিলি রিং', '৮ মিলি রিং', '১০ মিলি রিং', 'বাইন্ডিং রিং'];

const rodBrands = [
  'BSRM',
  'KSRM',
  'AKS (আবুল খায়ের)',
  'GPH Ispat',
  'RSRM',
  'Rahim Steel',
  'Anwar Ispat',
  'Bandar Steel (BSRM Group)',
  'SSRM',
  'HKG Steel',
  'BSRM Ultima',
  'লোকাল রড / অন্যান্য'
];

const cementBrands = [
  'Shah Cement (শাহ)',
  'Bashundhara Cement (বসুন্ধরা)',
  'Crown Cement (ক্রাউন)',
  'Seven Rings Cement (সেভেন রিং)',
  'Fresh Cement (ফ্রেশ)',
  'Premier Cement (প্রিমিয়ার)',
  'Holcim Cement (হোলসিম)',
  'Tiger Cement (টাইগার / ডায়মন্ড)',
  'Elephant Brand (হাতি মার্কা)',
  'Akij Cement (আকিজ)',
  'Scan Cement (স্ক্যান)',
  'Metrocem Cement (মেট্রোসেম)',
  'Aramit Cement (অ্যারামিট)',
  'Royal Cement (রয়েল)',
  'Confidence Cement (কনফিডেন্স)',
  'অন্যান্য সিমেন্ট'
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('সব');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const [rodSize, setRodSize] = useState('১০ মিলি');
  const [ringSize, setRingSize] = useState('৭" × ৭"');
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    brand: string;
    buyPrice: string | number;
    sellPrice: string | number;
    stock: string | number;
    unit: string;
    alertThreshold: string | number;
  }>({
    name: '', category: 'রড', brand: '', buyPrice: '', sellPrice: '', stock: '', unit: 'কেজি', alertThreshold: 200
  });

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

  const getComputedProductName = () => {
    if (formData.category === 'রড') {
      return `${rodSize} রড${formData.brand ? ` (${formData.brand})` : ''}`;
    }
    if (formData.category === 'রিং') {
      return `${ringSize} রিং${formData.brand ? ` (${formData.brand})` : ''}`;
    }
    if (formData.category === 'সিমেন্ট') {
      return `${formData.brand ? `${formData.brand} ` : ''}সিমেন্ট`;
    }
    return formData.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = getComputedProductName();
    if (!finalName || !finalName.trim()) {
      toast.error('পণ্যের নাম দিন');
      return;
    }

    const payload: ProductData = {
      name: finalName.trim(),
      category_name: formData.category,
      brand: formData.brand ? formData.brand.trim() : '',
      purchase_price: Number(formData.buyPrice) || 0,
      sell_price: Number(formData.sellPrice) || 0,
      stock: Number(formData.stock) || 0,
      unit: formData.unit || 'পিস',
      min_stock: Number(formData.alertThreshold) || 10,
    };

    try {
      if (editingProduct) {
        await api.inventory.update(editingProduct.id, payload);
        toast.success('পণ্য আপডেট হয়েছে');
      } else {
        await api.inventory.create(payload);
        toast.success('নতুন পণ্য যুক্ত হয়েছে');
      }
      setIsAddOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (err: any) { 
      console.error('Error saving product:', err);
      toast.error(err?.message || 'পণ্য সংরক্ষণ করতে সমস্যা হয়েছে'); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('পণ্যটি মুছে ফেলবেন?')) return;
    try {
      await api.inventory.delete(id);
      toast.success('পণ্য মুছে ফেলা হয়েছে');
      fetchProducts();
    } catch { toast.error('মুছে ফেলা সম্ভব হয়নি'); }
  };

  const resetForm = () => {
    setRodSize('১০ মিলি');
    setRingSize('৭" × ৭"');
    setFormData({ name: '', category: 'রড', brand: '', buyPrice: '', sellPrice: '', stock: '', unit: 'কেজি', alertThreshold: 200 });
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    let extractedRodSize = '১০ মিলি';
    if (p.category === 'রড') {
      const match = rodSizes.find(s => p.name.includes(s));
      if (match) extractedRodSize = match;
    }
    setRodSize(extractedRodSize);

    let extractedRingSize = '৭" × ৭"';
    if (p.category === 'রিং') {
      const match = ringSizes.find(s => p.name.includes(s));
      if (match) extractedRingSize = match;
    }
    setRingSize(extractedRingSize);

    setFormData({ 
      name: p.name, 
      category: p.category || 'রড', 
      brand: p.brand || '', 
      buyPrice: p.buyPrice ?? '', 
      sellPrice: p.sellPrice ?? '', 
      stock: p.stock ?? '', 
      unit: p.unit || 'পিস', 
      alertThreshold: p.alertThreshold ?? 200 
    });
    setIsAddOpen(true);
  };

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
            <p className="text-slate-500 font-bengali text-sm">রড, সিমেন্ট, রিং ও অন্যান্য পণ্যের স্টক ব্যবস্থাপনা</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setEditingProduct(null); resetForm(); } }}>
            <DialogTrigger render={
              <Button className="bg-orange-600 hover:bg-orange-700 font-bengali h-10 px-5 rounded-lg">
                <Plus className="w-4 h-4 mr-2" />নতুন পণ্য যুক্ত করুন
              </Button>
            } />
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="font-bengali text-lg font-bold text-slate-800">
                  {editingProduct ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যুক্ত করুন'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="font-bengali text-sm">বিভাগ (Category)</Label>
                    <Select value={formData.category} onValueChange={v => {
                      const cat = v || 'রড';
                      const defaultUnit = cat === 'রড' ? 'কেজি' : cat === 'রিং' ? 'পিস' : cat === 'সিমেন্ট' ? 'বস্তা' : 'পিস';
                      const defaultAlert = cat === 'রড' ? 200 : cat === 'রিং' ? 100 : cat === 'সিমেন্ট' ? 50 : 5;
                      setFormData({
                        ...formData,
                        category: cat,
                        unit: defaultUnit,
                        alertThreshold: defaultAlert
                      });
                    }}>
                      <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="font-bengali">
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === 'রড' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="font-bengali text-sm">রড মিলি (সাইজ)</Label>
                        <Select value={rodSize} onValueChange={v => setRodSize(v || '১০ মিলি')}>
                          <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent className="font-bengali">
                            {rodSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-bengali text-sm">রড ব্র্যান্ড</Label>
                        <Select value={formData.brand} onValueChange={v => setFormData({...formData, brand: v || ''})}>
                          <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue placeholder="ব্র্যান্ড বাছুন..." /></SelectTrigger>
                          <SelectContent className="font-bengali">
                            {rodBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : formData.category === 'রিং' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="font-bengali text-sm">রিং এর সাইজ (Ring Size)</Label>
                        <Select value={ringSize} onValueChange={v => setRingSize(v || '৭" × ৭"')}>
                          <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent className="font-bengali">
                            {ringSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-bengali text-sm">ব্র্যান্ড / নোট</Label>
                        <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="যেমন: BSRM / লোকাল" className="font-bengali rounded-lg border-slate-200" />
                      </div>
                    </>
                  ) : formData.category === 'সিমেন্ট' ? (
                    <div className="col-span-2 space-y-1.5">
                      <Label className="font-bengali text-sm">সিমেন্ট ব্র্যান্ড নির্বাচন করুন</Label>
                      <Select value={formData.brand} onValueChange={v => setFormData({...formData, brand: v || ''})}>
                        <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue placeholder="সিমেন্ট ব্র্যান্ড বাছুন..." /></SelectTrigger>
                        <SelectContent className="font-bengali">
                          {cementBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="font-bengali text-sm">পণ্যের নাম</Label>
                        <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="পণ্যের নাম লিখুন" className="font-bengali rounded-lg border-slate-200" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="font-bengali text-sm">ব্র্যান্ড</Label>
                        <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="ব্র্যান্ডের নাম (ঐচ্ছিক)" className="font-bengali rounded-lg border-slate-200" />
                      </div>
                    </>
                  )}

                  {(formData.category === 'রড' || formData.category === 'সিমেন্ট' || formData.category === 'রিং') && (
                    <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-xs font-bengali text-slate-500 font-semibold">স্বয়ংক্রিয় তৈরি পণ্যের নাম:</span>
                      <span className="text-xs font-bengali font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded border border-orange-200">{getComputedProductName()}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="font-bengali text-sm">ক্রয় মূল্য (৳)</Label>
                    <Input type="number" required value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: e.target.value})} className="rounded-lg border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bengali text-sm">বিক্রয় মূল্য (৳)</Label>
                    <Input type="number" required value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} className="rounded-lg border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bengali text-sm">পরিমাণ</Label>
                    <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="rounded-lg border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bengali text-sm">একক (Unit)</Label>
                    <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v || 'পিস'})}>
                      <SelectTrigger className="font-bengali rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="font-bengali">
                        {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="font-bengali text-sm">সতর্কতা সীমা (Alert Limit)</Label>
                    <Input type="number" value={formData.alertThreshold} onChange={e => setFormData({...formData, alertThreshold: e.target.value})} className="rounded-lg border-slate-200" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 font-bengali rounded-lg h-11">
                    {editingProduct ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'মোট পণ্য', value: `${toBnNum(products.length)} ধরনের`, color: 'text-slate-800' },
            { label: 'স্টক সতর্কতা', value: `${toBnNum(alertItems.length)}টি পণ্য`, color: 'text-rose-600' },
            { label: 'স্টক মূল্য', value: formatBnCurrency(totalStockValue), color: 'text-orange-600' },
            { label: 'আজ আপডেট', value: `${toBnNum(products.length)}টি পণ্য`, color: 'text-green-600' },
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
                  <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold font-bengali transition-colors whitespace-nowrap", filterCat === cat ? 'bg-orange-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}>
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
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-center">স্টক</TableHead>
                    <TableHead className="font-bengali text-slate-500 text-[10px] tracking-widest font-bold text-right py-3">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bengali">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bengali">কোনো পণ্য পাওয়া যায়নি</TableCell></TableRow>
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
                      <TableCell className="text-right p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(product); }} title="সম্পাদনা" className="h-7 w-7 text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} title="মুছে ফেলুন" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
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

              <DialogFooter className="flex gap-2 sm:gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewingProduct(null)} className="flex-1 font-bengali rounded-lg">
                  বন্ধ করুন
                </Button>
                <Button onClick={() => { const prod = viewingProduct; setViewingProduct(null); openEdit(prod); }} className="flex-1 bg-orange-600 hover:bg-orange-700 font-bengali rounded-lg">
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> সম্পাদনা করুন
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
