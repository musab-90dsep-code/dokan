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
  title: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স - রড ও সিমেন্ট ইআরপি',
  description: 'মেসার্স দেলোয়ার এন্ড ব্রাদার্স - রড ও সিমেন্টের দোকানের সম্পূর্ণ ডিজিটাল ব্যবসা পরিচালনা ব্যবস্থা',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

import { AuthProvider } from '@/lib/authContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={cn(inter.variable, hindSiliguri.variable, "font-bengali")} suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#faf8f5] text-[#2e2316] min-h-screen antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
