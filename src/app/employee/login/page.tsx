
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// This page now acts as a gatekeeper, redirecting to the new unified login page.
export default function DeprecatedEmployeeLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
       <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
            <CardTitle>Redireccionando...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
            <Loader2 className="w-12 h-12 animate-spin text-primary"/>
        </CardContent>
       </Card>
    </div>
  );
}
