
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function DevLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const access = sessionStorage.getItem('ytl_dev_access');
        if (access !== '1') {
            router.replace('/admin/dashboard/settings');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background text-foreground">
                <Shield className="w-10 h-10 text-primary animate-pulse" />
                <p className="text-muted-foreground text-sm">Verificando acceso...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {children}
        </div>
    );
}
