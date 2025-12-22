import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

if (getApps().length === 0) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });
    }
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
  }
}

async function getActiveTours() {
  try {
    const db = getFirestore();
    const toursSnapshot = await db.collection('tours').where('isPublic', '==', true).get();
    const now = new Date();
    
    const tours = toursSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        return {
          id: doc.id,
          destination: data.destination,
          date: date,
          price: data.price,
          currency: data.currency || 'ARS',
          days: data.days,
          nights: data.nights,
          backgroundImage: data.backgroundImage,
          isFeatured: data.isFeatured,
        };
      })
      .filter(tour => tour.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
    
    return tours;
  } catch (error) {
    console.error('Error fetching tours:', error);
    return [];
  }
}

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

IMPORTANTE - Detección de intención:
Si el usuario pregunta por viajes disponibles, destinos, tours, o quiere ver opciones de viajes, DEBES responder EXACTAMENTE con este formato JSON:
{"showTours": true, "message": "Tu mensaje amigable aquí"}

Ejemplos de frases que indican que quiere ver viajes:
- "qué viajes tienen"
- "quiero ver viajes"
- "a dónde puedo viajar"
- "destinos disponibles"
- "qué tours hay"
- "opciones de viaje"
- "quiero viajar"
- "mostrame los viajes"

Para cualquier otra pregunta, responde normalmente con texto.

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

    let text = response.text;
    let tours = null;

    try {
      const jsonMatch = text.match(/\{[\s\S]*"showTours"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.showTours) {
          tours = await getActiveTours();
          text = parsed.message || "¡Aquí tienes los viajes disponibles!";
        }
      }
    } catch (e) {
    }

    return NextResponse.json({ 
      message: text,
      tours: tours,
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
