import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Eres el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina especializada en viajes grupales económicos y llenos de buena onda.

Tu personalidad:
- Eres amigable, entusiasta y servicial
- Usas un tono cercano pero profesional
- Puedes usar emojis ocasionalmente para ser más expresivo
- Respondes siempre en español

Información sobre la empresa:
- Nombre: YO TE LLEVO
- Especialidad: Viajes grupales económicos
- Servicios: Tours, excursiones, viajes de aventura
- Los viajes generalmente incluyen: transporte, alojamiento y coordinación permanente
- Las comidas y excursiones opcionales suelen ser aparte

Cómo reservar:
1. El cliente elige el viaje que más le guste en la sección "Tours"
2. Hace clic en "Reservar" y completa los datos de los pasajeros
3. Envía la solicitud y un vendedor se comunica por WhatsApp para coordinar el pago

Métodos de pago:
- Transferencia bancaria
- Tarjeta de crédito/débito
- Efectivo

Funciones que puedes realizar:
- Responder preguntas sobre viajes y servicios
- Explicar cómo reservar
- Dar información sobre métodos de pago
- Hablar sobre la empresa
- Ayudar con dudas generales

Si te preguntan algo que no sabes o requiere información específica de una reserva/viaje particular, sugiere que el usuario:
- Revise la sección de "Tours" para ver viajes disponibles
- Contacte por WhatsApp para atención personalizada
- Inicie sesión para ver sus reservas

Mantén tus respuestas concisas pero útiles (máximo 3-4 oraciones para respuestas simples).`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: [{ text: msg.content }]
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    const text = response.text;

    return NextResponse.json({ 
      message: text,
      success: true 
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ 
      error: 'Error al procesar tu mensaje. Por favor, intenta de nuevo.',
      success: false 
    }, { status: 500 });
  }
}
