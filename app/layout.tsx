import type { Metadata } from 'next';
import { Inter, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: 'ব্রাদার্স ট্রেডার্স - রড ও সিমেন্ট ইআরপি',
  description: 'রড ও সিমেন্টের দোকানের সম্পূর্ণ ডিজিটাল ব্যবসা পরিচালনা ব্যবস্থা',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={cn(inter.variable, hindSiliguri.variable, "font-bengali")} suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
