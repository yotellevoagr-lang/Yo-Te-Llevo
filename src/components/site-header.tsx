

"use client"

import Link from "next/link"
import React from "react"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MenuIcon, LogInIcon, UserPlus, UserCircle, LogOut, Settings, LayoutDashboard, Shuffle, Plane, UserCog } from "lucide-react"
import { useAuth } from "./auth/auth-provider"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { ThemeToggle } from "@/app/theme-toggle"
import { LanguageToggle } from "@/app/language-toggle"
import { useTranslation } from "react-i18next"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"


export function SiteHeader() {
  const { user, userRole, availableRoles } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    // Explicitly clear session data from localStorage
    localStorage.removeItem('ytl_auth_role');
    localStorage.removeItem('ytl_available_roles');
    window.dispatchEvent(new Event("storage")); // Notify other tabs
    router.push('/');
    setIsSheetOpen(false); // Close sheet on logout
  }

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsSheetOpen(false);
  }

  const navLinks = [
    { href: "/", label: t('nav.home') },
    { href: "/tours", label: t('nav.trips') },
    { href: "/flyers", label: t('nav.flyers') },
    { href: "/contact", label: t('nav.contact') },
  ]
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center h-16 max-w-screen-2xl">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        
        {/* Mobile Logo */}
        <div className="flex md:hidden mr-auto">
             <Logo />
        </div>

        <nav className="items-center flex-1 hidden gap-6 text-sm font-medium md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="transition-colors text-foreground/60 hover:text-foreground/80"
              prefetch={false}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          {/* Mobile Menu */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <MenuIcon className="w-6 h-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col p-0">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle className="sr-only">Menú Principal</SheetTitle>
                 <Logo />
              </SheetHeader>
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                <nav className="p-6 text-lg font-medium space-y-4">
                  {navLinks.map(({ href, label }) => (
                    <button
                      key={label}
                      onClick={() => handleNavigation(href)}
                      className="w-full text-left block transition-colors text-foreground hover:text-primary"
                    >
                      {label}
                    </button>
                  ))}
                  
                   {user && (
                    <>
                        <div className="w-full border-t my-4"></div>
                        <h3 className="text-sm font-semibold text-muted-foreground px-2">{t('my_account')}</h3>
                        {userRole === 'admin' && <button onClick={() => handleNavigation('/admin/dashboard')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><LayoutDashboard />{t('admin_panel')}</button>}
                        {userRole === 'employee' && <button onClick={() => handleNavigation('/employee/dashboard')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><LayoutDashboard />{t('employee_panel')}</button>}
                         <button onClick={() => handleNavigation('/profile')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><UserCog />{t('my_profile')}</button>
                        <button onClick={() => handleNavigation('/profile/my-trips')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><Plane />{t('my_trips')}</button>
                        {availableRoles.length > 1 && (
                             <button onClick={() => handleNavigation('/login/select-role')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><Shuffle />Cambiar de Panel</button>
                        )}
                    </>
                   )}
                   
                   <div className="w-full border-t my-4"></div>
                   <button onClick={() => handleNavigation('/settings')} className="w-full text-left flex items-center gap-2 text-foreground hover:text-primary"><Settings />Ajustes</button>
                </nav>
                <div className="p-4 mt-auto space-y-4 border-t">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-sm text-muted-foreground">Opciones</span>
                        <div className="flex gap-1">
                            <LanguageToggle />
                            <ThemeToggle />
                        </div>
                    </div>
                    {user ? (
                         <Button onClick={handleLogout} className="w-full" variant="outline">
                            <LogOut className="w-4 h-4 mr-2" />
                            {t('auth.logout')}
                         </Button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <Button asChild className="w-full" variant="outline">
                            <Link href="/login" onClick={() => setIsSheetOpen(false)}>
                                <LogInIcon className="w-4 h-4 mr-2" />
                                {t('auth.login')}
                            </Link>
                            </Button>
                            <Button asChild className="w-full">
                            <Link href="/login?mode=register" onClick={() => setIsSheetOpen(false)}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                {t('auth.register')}
                            </Link>
                            </Button>
                        </div>
                    )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
           
           {/* Desktop Menu */}
           <div className="hidden md:flex items-center gap-2">
             <LanguageToggle />
             <ThemeToggle />
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={''} alt={(user as any).name || 'Usuario'} />
                                <AvatarFallback>{(user as any).name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('my_account')}</DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        {userRole === 'admin' && <DropdownMenuItem asChild><Link href="/admin/dashboard"><LayoutDashboard className="mr-2"/>{t('admin_panel')}</Link></DropdownMenuItem>}
                        {userRole === 'employee' && <DropdownMenuItem asChild><Link href="/employee/dashboard"><LayoutDashboard className="mr-2"/>{t('employee_panel')}</Link></DropdownMenuItem>}
                         <DropdownMenuItem asChild>
                            <Link href="/profile"><UserCog className="mr-2"/>{t('my_profile')}</Link>
                         </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                            <Link href="/settings"><Settings className="mr-2"/>Ajustes</Link>
                         </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href="/profile/my-trips"><Plane className="mr-2"/>{t('my_trips')}</Link>
                        </DropdownMenuItem>
                        {availableRoles.length > 1 && (
                            <DropdownMenuItem asChild>
                                <Link href="/login/select-role"><Shuffle className="mr-2"/>Cambiar de Panel</Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                            <LogOut className="mr-2"/>
                            {t('auth.logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <>
                    <Button asChild variant="ghost">
                        <Link href="/login">
                        <LogInIcon className="w-4 h-4 mr-2" />
                        {t('auth.login')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/login?mode=register">
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t('auth.register')}
                        </Link>
                    </Button>
                </>
            )}
           </div>
        </div>
      </div>
    </header>
  )
}
