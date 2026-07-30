'use client';

import { Shell } from '@/components/Shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Building2, Phone, MapPin, Settings as SettingsIcon } from 'lucide-react';
import { api, ShopSettingsData } from '@/lib/api';

export default function SettingsPage() {
  const [shopSettings, setShopSettings] = useState<ShopSettingsData>({
    business_name: 'দোকান ইআরপি (Dokan ERP)',
    phone: '01700000000',
    email: 'contact@dokan.com',
    address: 'ঢাকা, বাংলাদেশ',
    currency: '৳',
    receipt_footer: 'আমাদের সাথে থাকার জন্য ধন্যবাদ!'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.get().then(data => {
      setShopSettings(data);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading settings:', err);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      if (shopSettings.id) {
        await api.settings.update(shopSettings.id, shopSettings);
      }
      toast.success('সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      toast.error('সেটিংস সংরক্ষণ করা সম্ভব হয়নি');
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-bengali flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-orange-600" />
            দোকান ও সিস্টেম সেটিংস
          </h2>
          <p className="text-slate-500 font-bengali mt-1">আপনার ব্যবসা ও প্রতিষ্ঠানের তথ্য সম্বলিত সেটিংস</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="font-bengali flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-orange-500" />
              প্রতিষ্ঠানের তথ্য
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bengali font-semibold">দোকান/প্রতিষ্ঠানের নাম</Label>
                <Input
                  value={shopSettings.business_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, business_name: e.target.value })}
                  placeholder="দোকানের নাম"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bengali font-semibold">মোবাইল নম্বর</Label>
                <Input
                  value={shopSettings.phone}
                  onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                  placeholder="মোবাইল নম্বর"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bengali font-semibold">ইমেইল</Label>
                <Input
                  value={shopSettings.email || ''}
                  onChange={(e) => setShopSettings({ ...shopSettings, email: e.target.value })}
                  placeholder="ইমেইল এড্রেস"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bengali font-semibold">টাকা সিম্বল (Currency)</Label>
                <Input
                  value={shopSettings.currency}
                  onChange={(e) => setShopSettings({ ...shopSettings, currency: e.target.value })}
                  placeholder="৳"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bengali font-semibold">ঠিকানা</Label>
              <Input
                value={shopSettings.address || ''}
                onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                placeholder="দোকানের ঠিকানা"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bengali font-semibold">রশিদ মেসেজ (Receipt Footer)</Label>
              <Input
                value={shopSettings.receipt_footer || ''}
                onChange={(e) => setShopSettings({ ...shopSettings, receipt_footer: e.target.value })}
                placeholder="ইনভয়েসের নিচে লেখা বার্তা"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-500 text-white font-bengali px-6">
                সেভ করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
