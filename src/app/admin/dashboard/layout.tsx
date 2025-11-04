
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Settings,
  Ticket,
  Users,
  Image as ImageIcon,
  Plane,
  LogOut,
  Globe,
  LayoutDashboard,
  TicketCheck,
  PercentSquare,
  BarChart3,
  Briefcase,
  Calendar,
  Receipt,
  Archive
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageToggle } from "@/app/language-toggle";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/app/theme-toggle";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, loading } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { href: "/admin/dashboard", label: t('admin_nav.dashboard'), icon: LayoutDashboard },
    { href: "/admin/dashboard/trips", label: t('admin_nav.trips'), icon: Plane },
    { href: "/admin/dashboard/flyers", label: t('admin_nav.flyers'), icon: ImageIcon },
    { href: "/admin/dashboard/reservations", label: t('admin_nav.reservations'), icon: Ticket },
    { href: "/admin/dashboard/passengers", label: t('admin_nav.passengers'), icon: Users },
    { href: "/admin/dashboard/employees", label: t('admin_nav.employees'), icon: Briefcase },
    { href: "/admin/dashboard/sellers", label: t('admin_nav.sellers'), icon: PercentSquare },
    { href: "/admin/dashboard/tickets", label: t('admin_nav.tickets'), icon: TicketCheck },
    { href: "/admin/dashboard/receipts", label: t('admin_nav.receipts'), icon: Receipt },
    { href: "/admin/dashboard/reports", label: t('admin_nav.reports'), icon: BarChart3 },
    { href: "/admin/dashboard/calendar", label: t('admin_nav.calendar'), icon: Calendar },
    { href: "/admin/dashboard/settings", label: t('admin_nav.settings'), icon: Settings },
  ];

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      router.replace('/login');
    }
  }, [loading, userRole, router]);

  if (loading || userRole !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}...</div>;
  }

  const handleLogout = async () => {
    await signOut(auth);
    // Explicitly clear session data from localStorage
    localStorage.removeItem('ytl_auth_role');
    localStorage.removeItem('ytl_available_roles');
    window.dispatchEvent(new Event("storage")); // Notify other tabs
    router.replace('/');
  }

  return (
    <ThemeProvider storageKey="ytl-theme-admin" attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <SidebarContent className="bg-card flex flex-col">
              <SidebarHeader>
                <Logo />
              </SidebarHeader>
              <div className="flex-1 overflow-y-auto">
                <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={t('admin_nav.view_site')}
                      >
                        <Link href="/" target="_blank">
                          <Globe />
                          <span>{t('admin_nav.view_site')}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
              <SidebarFooter className="mt-auto">
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip={t('admin_nav.logout')}>
                        <LogOut />
                        <span>{t('admin_nav.logout')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarFooter>
            </SidebarContent>
          </Sidebar>
          <div className="flex-1">
            <SidebarInset>
                <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger className="md:hidden" />
                      <h1 className="text-xl font-semibold">{t('admin_panel')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <LanguageToggle />
                      <ThemeToggle />
                    </div>
                </header>
              <main className="flex-1 p-6 overflow-auto">{children}</main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
