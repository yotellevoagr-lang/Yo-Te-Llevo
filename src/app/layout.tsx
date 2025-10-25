import type {Metadata, Viewport} from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from "@/components/ui/toaster"
import { Lato, Montserrat } from "next/font/google";
import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import Chatbot from '@/components/chatbot';
import { InstallPwaButton } from '@/components/install-pwa-button';

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'YO TE LLEVO',
  description: 'Tu próxima aventura te espera',
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#E95289",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${lato.variable} ${montserrat.variable} font-body antialiased`}>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ytl-theme-client">
            <AuthProvider>
              {children}
              <Chatbot />
              <InstallPwaButton />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
