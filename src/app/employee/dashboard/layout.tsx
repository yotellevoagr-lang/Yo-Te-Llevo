
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  Ticket,
  Users,
  Image as ImageIcon,
  LogOut,
  TicketCheck,
  Plane,
  LayoutDashboard,
  Receipt
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
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageToggle } from "@/app/language-toggle";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/app/theme-toggle";


export default function EmployeeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, loading } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { href: "/employee/dashboard", label: t('admin_nav.dashboard'), icon: LayoutDashboard },
    { href: "/employee/dashboard/trips", label: t('admin_nav.trips'), icon: Plane },
    { href: "/employee/dashboard/reservations", label: t('admin_nav.reservations'), icon: Ticket },
    { href: "/employee/dashboard/passengers", label: t('admin_nav.passengers'), icon: Users },
    { href: "/employee/dashboard/tickets", label: t('admin_nav.tickets'), icon: TicketCheck },
    { href: "/employee/dashboard/receipts", label: t('admin_nav.receipts'), icon: Receipt },
    { href: "/employee/dashboard/settings", label: t('employee_nav.settings'), icon: Settings },
  ];

  useEffect(() => {
    if (!loading && userRole !== 'employee' && userRole !== 'admin') {
      router.replace('/login');
    }
  }, [loading, userRole, router]);

  if (loading || (userRole !== 'employee' && userRole !== 'admin')) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const handleLogout = async () => {
    await signOut(auth);
    // Explicitly clear session data from localStorage
    localStorage.removeItem('ytl_auth_role');
    localStorage.removeItem('ytl_available_roles');
    window.dispatchEvent(new Event("storage")); // Notify other tabs
    router.push('/');
  }

  return (
    <ThemeProvider storageKey="ytl-theme-employee" attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <SidebarContent className="bg-card flex flex-col">
              <SidebarHeader>
                <Logo />
              </SidebarHeader>
              <div className="flex-1 overflow-y-auto">
                <SidebarMenu>
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
                    <SidebarMenuButton onClick={handleLogout} tooltip={t('employee_nav.logout')}>
                        <LogOut />
                        <span>{t('employee_nav.logout')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarFooter>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
              <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
                  <div className="flex items-center gap-4">
                      <SidebarTrigger className="md:hidden" />
                      <h1 className="text-xl font-semibold">{t('employee_panel')}</h1>
                  </div>
                  <div className="flex items-center gap-2">
                      <LanguageToggle />
                      <ThemeToggle />
                  </div>
              </header>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
