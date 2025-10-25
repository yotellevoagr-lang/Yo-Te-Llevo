
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, LogInIcon } from "lucide-react";

export default function RegisterSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-2xl text-center">
        <CardHeader>
           <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-headline">
            ¡Registro Completado!
          </CardTitle>
          <CardDescription>
            Tu cuenta ha sido creada y tu contraseña guardada. Ya puedes acceder a tu panel de empleado.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/login">
                    <LogInIcon className="mr-2 h-4 w-4"/>
                    Ir a Iniciar Sesión
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
