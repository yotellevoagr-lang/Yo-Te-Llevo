
"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, MessageSquarePlus, Download } from "lucide-react";
import { TemplateImporter } from "@/components/admin/template-importer";
import { ReservationFromTextImporter } from "@/components/admin/reservation-from-text-importer";
import { DataExporter } from "@/app/admin/dashboard/data-exporter";
import { useAuth } from "@/components/auth/auth-provider";

export default function EmployeeDashboardPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isTextImporterOpen, setIsTextImporterOpen] = useState(false);
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const { user } = useAuth();
  const employeeName = user?.name || 'Empleado';

  return (
    <>
      <TemplateImporter isOpen={isImporterOpen} onOpenChange={setIsImporterOpen} />
      <ReservationFromTextImporter isOpen={isTextImporterOpen} onOpenChange={setIsTextImporterOpen} />
      <DataExporter isOpen={isExporterOpen} onOpenChange={setIsExporterOpen} />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>¡Bienvenido/a a tu panel, {employeeName}!</CardTitle>
            <CardDescription>
              Desde aquí podrás gestionar tus ventas, ver la información de tus pasajeros y acceder a los materiales de los viajes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Utiliza el menú de la izquierda para navegar por las diferentes secciones.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <Button onClick={() => setIsTextImporterOpen(true)}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Crear Reserva desde Texto
                </Button>
                <Button variant="outline" onClick={() => setIsImporterOpen(true)}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Importar desde Plantilla
                </Button>
                 <Button variant="outline" onClick={() => setIsExporterOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Datos
                </Button>
            </div>
             <p className="text-sm text-muted-foreground pt-2">
              Usa estas opciones para cargar datos masivamente o exportar listas de pasajeros.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
