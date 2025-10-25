
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Employee } from '@/lib/types';
import { useAuth } from '@/components/auth/auth-provider';

export default function EmployeeDashboardPage() {
    const { user } = useAuth();
    const [employeeName, setEmployeeName] = useState('');

    useEffect(() => {
        if (user) {
            setEmployeeName((user as Employee).name);
        }
    }, [user])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>¡Bienvenido/a a tu panel, {employeeName}!</CardTitle>
          <CardDescription>
            Desde aquí podrás gestionar tus ventas, ver la información de tus pasajeros y acceder a los materiales de los viajes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Utiliza el menú de la izquierda para navegar por las diferentes secciones. Para generar una nueva venta, haz click en "Nueva Venta".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
