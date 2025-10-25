
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './auth/auth-provider';
import { Skeleton } from './ui/skeleton';
import { getDisplayUrl } from '@/lib/utils';

// The default logo is now a placeholder URL.
const defaultLogo = "https://placehold.co/36x36/E95289/FFFFFF.png?text=YTL";

export function Logo() {
  const { logoUrl, loading } = useAuth();

  if (loading) {
      return (
         <Link href="/" className="flex items-center gap-2" prefetch={false}>
            <Skeleton className="w-9 h-9 rounded-full" />
             <span className="text-2xl font-bold tracking-tight text-foreground font-headline">
                YO TE LLEVO
            </span>
         </Link>
      )
  }
  
  const imageSrc = logoUrl ? getDisplayUrl(logoUrl) : defaultLogo;

  return (
    <Link href="/" className="flex items-center gap-2" prefetch={false}>
      <Image
        src={imageSrc}
        alt="YO TE LLEVO Logo"
        width={36}
        height={36}
        className="rounded-full object-cover"
        key={logoUrl || 'default-logo'} // Adding key forces re-render when src changes
      />
      <span className="text-2xl font-bold tracking-tight text-foreground font-headline">
        YO TE LLEVO
      </span>
    </Link>
  );
}
