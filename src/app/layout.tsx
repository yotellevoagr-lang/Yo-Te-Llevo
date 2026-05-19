
import type {Metadata, Viewport} from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from "@/components/ui/toaster"
import { Lato, Lilita_One } from "next/font/google";
import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';
import { FixedActionButtons } from '@/components/fixed-action-buttons';
import { DynamicTheme } from '@/components/dynamic-theme';
import { FirebaseMessaging } from '@/components/firebase-messaging';
import { getDocumentById } from '@/lib/firestore-services';
import type { GeneralSettings } from '@/lib/types';
import { getDisplayUrl } from '@/lib/utils';
import { NotificationPermission } from '@/components/notification-permission';
import { PageTracker } from '@/components/page-tracker';

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-headline',
  display: 'swap',
});

// Default metadata
const defaultTitle = 'YO TE LLEVO';
const defaultDescription = 'Tu próxima aventura te espera';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDocumentById<GeneralSettings>('settings', 'general');
  const pwaIconUrl = settings?.pwaIconUrl ? getDisplayUrl(settings.pwaIconUrl) : '/favicon.ico';

  return {
    title: defaultTitle,
    description: defaultDescription,
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.ico", // Always use the static favicon for the browser tab
      apple: pwaIconUrl, // Use the dynamic icon for Apple devices
    },
  };
}


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
      <body className={`${lato.variable} ${lilitaOne.variable} font-body antialiased`}>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ytl-theme-client">
            <AuthProvider>
              <DynamicTheme />
              <FirebaseMessaging />
              <PageTracker />
              {children}
              <FixedActionButtons />
              <NotificationPermission />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
