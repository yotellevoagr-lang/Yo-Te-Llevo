
"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ChatbotEditorPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Editor del Asistente Virtual</h2>
          <p className="text-muted-foreground">
            Personaliza los flujos de conversación, mensajes y acciones del chatbot.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
            {/* <Button>Guardar Cambios</Button> */}
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Flujo de Conversación</CardTitle>
            <CardDescription>Próximamente aquí podrás editar visualmente el flujo del chatbot.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Funcionalidad en desarrollo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
