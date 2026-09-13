'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toBengaliDigits, toEnglishDigits } from '@/lib/bengaliUtils';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Package,
  Truck,
  Receipt,
  FileText,
  Trash2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export type ImportType = 'customers' | 'products' | 'suppliers' | 'expenses';

interface DataImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ImportType;
  onSuccess?: () => void;
}

export function DataImportModal({
  open,
  onOpenChange,
  defaultType = 'customers',
  onSuccess
}: DataImportModalProps) {
  const [activeType, setActiveType] = useState<ImportType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset file and preview when changing type
  const handleTypeChange = (type: ImportType) => {
    setActiveType(type);
    setFile(null);
    setParsedRows([]);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 1. Generate & Download Sample Template
  const handleDownloadTemplate = () => {
    try {
      let headers: string[] = [];
      let sampleData: any[] = [];
      let fileName = '';

      if (activeType === 'customers') {
        fileName = 'কাস্টমার_বকেয়া_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'নাম (Name)': 'আব্দুল করিম',
            'মোবাইল (Phone)': '01711122233',
            'ব্যবসা প্রতিষ্ঠান (Business Name)': 'করিম ট্রেডার্স',
            'ঠিকানা (Address)': 'সদর রোড, গোপালগঞ্জ',
            'পূর্বের বকেয়া (Opening Due)': 15000
          },
          {
            'নাম (Name)': 'রফিকুল ইসলাম',
            'মোবাইল (Phone)': '01822233344',
            'ব্যবসা প্রতিষ্ঠান (Business Name)': 'ইসলাম হার্ডওয়্যার',
            'ঠিকানা (Address)': 'নিউ মার্কেট, ঢাকা',
            'পূর্বের বকেয়া (Opening Due)': 8500
          }
        ];
      } else if (activeType === 'products') {
        fileName = 'পণ্য_স্টক_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'পণ্যের নাম (Product Name)': 'BSRM রড ১৬ মিমি',
            'ক্যাটাগরি (Category)': 'রড',
            'একক (Unit)': 'কেজি',
            'বর্তমান স্টক (Stock)': 2500,
            'ক্রয়মূল্য (Purchase Price)': 92.5,
            'বিক্রয়মূল্য (Sell Price)': 96.0,
            'ব্র্যান্ড (Brand)': 'BSRM'
          },
          {
            'পণ্যের নাম (Product Name)': 'শাহ সিমেন্ট স্পেশাল',
            'ক্যাটাগরি (Category)': 'সিমেন্ট',
            'একক (Unit)': 'ব্যাগ',
            'বর্তমান স্টক (Stock)': 300,
            'ক্রয়মূল্য (Purchase Price)': 510,
            'বিক্রয়মূল্য (Sell Price)': 540,
            'ব্র্যান্ড (Brand)': 'Shah Cement'
          }
        ];
      } else if (activeType === 'suppliers') {
        fileName = 'সাপ্লায়ার_পাওনা_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'সাপ্লায়ার নাম (Supplier Name)': 'মেসার্স মেঘনা স্টিল মিলস',
            'মোবাইল (Phone)': '01933344455',
            'প্রতিষ্ঠান (Company Name)': 'মেঘনা গ্রুপ',
            'ঠিকানা (Address)': 'মতিঝিল, ঢাকা',
            'পূর্বের পাওনা (Payable Due)': 120000
          }
        ];
      } else if (activeType === 'expenses') {
        fileName = 'পূর্ববর্তী_খরচ_নমুনা_টেমপ্লেট.xlsx';
        sampleData = [
          {
            'খরচের বিবরণ (Title)': 'দোকান ভাড়া - জানুয়ারি',
            'ক্যাটাগরি (Category)': 'দোকান ভাড়া',
            'টাকার পরিমাণ (Amount)': 15000,
            'তারিখ (Date)': '2025-01-10',
            'পেমেন্ট মেথড (Payment Method)': 'ক্যাশ'
          },
          {
            'খরচের বিবরণ (Title)': 'বিদ্যুৎ বিল - জানুয়ারি',
            'ক্যাটাগরি (Category)': 'বিদ্যুৎ বিল',
            'টাকার পরিমাণ (Amount)': 3200,
            'তারিখ (Date)': '2025-01-15',
            'পেমেন্ট মেথড (Payment Method)': 'ব্যাংক'
          }
        ];
      }

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, fileName);
      toast.success('নমুনা এক্সেল টেমপ্লেট সফলভাবে ডাউনলোড হয়েছে');
    } catch (err) {
      console.error('Error downloading template:', err);
      toast.error('টেমপ্লেট ডাউনলোড করা সম্ভব হয়নি');
    }
  };

  // Normalize field names
  const normalizeKey = (key: string): string => {
    const k = key.trim().toLowerCase();
    if (k.includes('নাম') || k.includes('name') || k.includes('title')) return 'name';
    if (k.includes('ফোন') || k.includes('phone') || k.includes('mobile') || k.includes('মোবাইল')) return 'phone';
    if (k.includes('ব্যবসা') || k.includes('business') || k.includes('প্রতিষ্ঠান') || k.includes('company')) return 'business_name';
    if (k.includes('ঠিকানা') || k.includes('address')) return 'address';
    if (k.includes('বকেয়া') || k.includes('বকেয়া') || k.includes('due') || k.includes('balance') || k.includes('পাওনা')) return 'due';
    if (k.includes('স্টক') || k.includes('stock') || k.includes('পরিমাণ') || k.includes('qty')) return 'stock';
    if (k.includes('ক্যাটাগরি') || k.includes('category')) return 'category';
    if (k.includes('একক') || k.includes('unit')) return 'unit';
    if (k.includes('ক্রয়') || k.includes('কেনা') || k.includes('buy') || k.includes('purchase')) return 'purchase_price';
    if (k.includes('বিক্রয়') || k.includes('বিক্রি') || k.includes('sell') || k.includes('sale')) return 'sell_price';
    if (k.includes('ব্র্যান্ড') || k.includes('brand')) return 'brand';
    if (k.includes('টাকা') || k.includes('amount') || k.includes('খরচ')) return 'amount';
    if (k.includes('তারিখ') || k.includes('date')) return 'date';
    if (k.includes('মেথড') || k.includes('method')) return 'payment_method';
    return k;
  };

  // 2. Parse Uploaded File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawJson.length === 0) {
        toast.error('নির্বাচিত ফাইলে কোনো ডাটা পাওয়া যায়নি');
        setIsProcessing(false);
        return;
      }

      // Format parsed items
      const formatted = rawJson.map((row) => {
        const item: any = {};
        for (const [key, val] of Object.entries(row)) {
          const normKey = normalizeKey(key);
          item[normKey] = typeof val === 'string' ? val.trim() : val;
        }

        // Clean numbers & values
        if (activeType === 'customers' || activeType === 'suppliers') {
          const rawDue = item.due !== undefined && item.due !== '' ? item.due : (item.amount !== undefined && item.amount !== '' ? item.amount : 0);
          const dueEn = toEnglishDigits(String(rawDue)).replace(/[^0-9.-]+/g, '');
          const due = parseFloat(dueEn) || 0;
          const phoneEn = toEnglishDigits(item.phone ? String(item.phone) : '').replace(/[^0-9]/g, '');
          return {
            name: item.name || '',
            phone: phoneEn,
            business_name: item.business_name || '',
            address: item.address || '',
            opening_balance: due,
            total_due: due,
            party_type: activeType === 'suppliers' ? 'supplier' : 'customer'
          };
        } else if (activeType === 'products') {
          const stock = parseFloat(toEnglishDigits(String(item.stock || 0)).replace(/[^0-9.-]+/g, '')) || 0;
          const purchase_price = parseFloat(toEnglishDigits(String(item.purchase_price || 0)).replace(/[^0-9.-]+/g, '')) || 0;
          const sell_price = parseFloat(toEnglishDigits(String(item.sell_price || 0)).replace(/[^0-9.-]+/g, '')) || 0;
          return {
            name: item.name || '',
            category_name: item.category || 'সাধারণ পণ্য',
            unit: item.unit || 'পিস',
            stock,
            purchase_price,
            sell_price,
            brand: item.brand || ''
          };
        } else if (activeType === 'expenses') {
          const amount = parseFloat(toEnglishDigits(String(item.amount || 0)).replace(/[^0-9.-]+/g, '')) || 0;
          return {
            title: item.name || item.title || 'সাধারণ খরচ',
            category_name: item.category || 'সাধারণ খরচ',
            amount,
            date: item.date || new Date().toISOString().split('T')[0],
            payment_method: item.payment_method || 'ক্যাশ'
          };
        }
        return item;
      });

      // Filter out completely blank rows
      const validItems = formatted.filter((item) => item.name || item.title);
      setParsedRows(validItems);
      setPreviewData(validItems.slice(0, 15)); // First 15 for preview
      toast.success(`${toBengaliDigits(validItems.length)} টি রো সফলভাবে লোড হয়েছে`);
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error('ফাইলটি পড়তে সমস্যা হয়েছে। এক্সেল ফরম্যাটটি সঠিক আছে কিনা যাচাই করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Submit Data to Backend
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('ইমপোর্ট করার জন্য কোনো ডাটা নেই');
      return;
    }

    try {
      setIsSubmitting(true);

      if (activeType === 'customers' || activeType === 'suppliers') {
        const res = await api.parties.bulkImport(parsedRows);
        toast.success(
          `ইমপোর্ট সফল! তৈরি: ${toBengaliDigits(res.created_count)}, আপডেট: ${toBengaliDigits(res.updated_count)}`
        );
      } else if (activeType === 'products') {
        const res = await api.inventory.bulkImport(parsedRows);
        toast.success(
          `পণ্য ইমপোর্ট সফল! নতুন: ${toBengaliDigits(res.created_count)}, আপডেট: ${toBengaliDigits(res.updated_count)}`
        );
      } else if (activeType === 'expenses') {
        const res = await api.expenses.bulkImport(parsedRows);
        toast.success(`খরচ ইমপোর্ট সফল! মোট: ${toBengaliDigits(res.created_count)} টি রেকর্ড সংরক্ষিত`);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Import execution error:', err);
      toast.error(err?.message || 'ইমপোর্ট করার সময় সার্ভারে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  এক্সেল / CSV ডাটা ও পূর্বের হিসাব ইমপোর্ট
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  আগের খাতা বা অন্য সফটওয়্যার থেকে গ্রাহক, বকেয়া, পণ্য ও খরচের রেকর্ড এক ক্লিকে ইমপোর্ট করুন
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Select Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              ১. কী ধরনের ডাটা ইমপোর্ট করতে চান তা নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'customers' as ImportType, label: 'গ্রাহক ও বকেয়া', icon: Users, desc: 'কাস্টমার ও প্রারম্ভিক বাকি' },
                { id: 'products' as ImportType, label: 'পণ্য ও স্টক', icon: Package, desc: 'আইটেম, মূল্য ও মজুদ' },
                { id: 'suppliers' as ImportType, label: 'সাপ্লায়ার পাওনা', icon: Truck, desc: 'মহাজনদের আগের পাওনা' },
                { id: 'expenses' as ImportType, label: 'পূর্ববর্তী খরচ', icon: Receipt, desc: 'বিগত তারিখের খরচের তালিকা' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTypeChange(tab.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${isSelected ? 'text-orange-900' : 'text-slate-800'}`}>
                        {tab.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{tab.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Download Template & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Card */}
            <Card className="p-4 border border-slate-200 bg-slate-50/50 flex flex-col justify-between shadow-none">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>নমুনা এক্সেল ফাইল ডাউনলোড করুন</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  কলামগুলোর সঠিক নাম ও ফরম্যাট পেতে প্রথমে নমুনা ফাইলটি ডাউনলোড করে নিন। সেই ফাইলে আপনার তথ্য পেস্ট করুন।
                </p>
              </div>
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full bg-white hover:bg-slate-100 text-xs font-bold border-slate-300 text-slate-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  নমুনা টেমপ্লেট ডাউনলোড (.xlsx)
                </Button>
              </div>
            </Card>

            {/* Upload Area */}
            <Card className="p-4 border-2 border-dashed border-slate-200 hover:border-orange-400 bg-white transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative shadow-none">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-orange-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'ফাইল আপলোড করতে ক্লিক করুন বা ড্র্যাগ করুন'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                সমর্থিত ফরম্যাট: .xlsx, .xls অথবা .csv
              </p>
            </Card>
          </div>

          {/* Step 3: Data Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    ডাটা প্রিভিউ (মোট {toBengaliDigits(parsedRows.length)} টি রো লোড হয়েছে)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  প্রথম ১৫টি রো প্রদর্শিত হচ্ছে
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold w-12">#</TableHead>
                      <TableHead className="text-xs font-bold">নাম / বিবরণ</TableHead>
                      {activeType === 'customers' || activeType === 'suppliers' ? (
                        <>
                          <TableHead className="text-xs font-bold">মোবাইল</TableHead>
                          <TableHead className="text-xs font-bold">প্রতিষ্ঠান</TableHead>
                          <TableHead className="text-xs font-bold text-right">পূর্বের বকেয়া/পাওনা</TableHead>
                        </>
                      ) : activeType === 'products' ? (
                        <>
                          <TableHead className="text-xs font-bold">ক্যাটাগরি</TableHead>
                          <TableHead className="text-xs font-bold text-right">মজুদ (Stock)</TableHead>
                          <TableHead className="text-xs font-bold text-right">ক্রয়মূল্য</TableHead>
                          <TableHead className="text-xs font-bold text-right">বিক্রয়মূল্য</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-xs font-bold">ক্যাটাগরি</TableHead>
                          <TableHead className="text-xs font-bold">তারিখ</TableHead>
                          <TableHead className="text-xs font-bold text-right">টাকা</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/70 text-xs">
                        <TableCell className="font-mono text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{row.name || row.title}</TableCell>
                        {activeType === 'customers' || activeType === 'suppliers' ? (
                          <>
                            <TableCell className="font-mono text-slate-600">{row.phone || '—'}</TableCell>
                            <TableCell className="text-slate-600">{row.business_name || '—'}</TableCell>
                            <TableCell className="text-right font-bold text-orange-600">
                              ৳{toBengaliDigits(row.total_due?.toLocaleString('en-IN') || '০')}
                            </TableCell>
                          </>
                        ) : activeType === 'products' ? (
                          <>
                            <TableCell className="text-slate-600">{row.category_name}</TableCell>
                            <TableCell className="text-right font-bold text-slate-800">
                              {toBengaliDigits(row.stock)} {row.unit}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              ৳{toBengaliDigits(row.purchase_price)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              ৳{toBengaliDigits(row.sell_price)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-slate-600">{row.category_name}</TableCell>
                            <TableCell className="font-mono text-slate-600">{row.date}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600">
                              ৳{toBengaliDigits(row.amount?.toLocaleString('en-IN') || '০')}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            বাতিল
          </Button>

          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setPreviewData([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isSubmitting}
                className="text-xs"
              >
                রিসেট
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleExecuteImport}
              disabled={parsedRows.length === 0 || isSubmitting || isProcessing}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ইমপোর্ট হচ্ছে...
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  ইমপোর্ট সম্পন্ন করুন ({toBengaliDigits(parsedRows.length)})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
