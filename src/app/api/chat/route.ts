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

interface TourData {
  id: string;
  destination: string;
  date: Date;
  price: number;
  currency: string;
  days?: number;
  nights?: number;
  backgroundImage?: string;
  isFeatured?: boolean;
  description?: string;
}

async function getAllTours(): Promise<TourData[]> {
  try {
    const db = getFirestore();
    const toursSnapshot = await db.collection('tours').where('isPublic', '==', true).get();
    const now = new Date();
    
    return toursSnapshot.docs
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
          description: data.description,
        };
      })
      .filter(tour => tour.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error('Error fetching tours:', error);
    return [];
  }
}

async function getContactInfo() {
  try {
    const db = getFirestore();
    const settingsDoc = await db.collection('settings').doc('general').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      return {
        whatsapp: data?.mainWhatsappNumber,
        phone: data?.contact?.phone,
        email: data?.contact?.email,
        address: data?.contact?.address,
        addressLink: data?.contact?.addressLink,
        instagram: data?.contact?.instagram,
        facebook: data?.contact?.facebook,
        hours: data?.contact?.hours,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching contact:', error);
    return null;
  }
}

const SYSTEM_PROMPT = `Eres el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina. Eres amigable, entusiasta y servicial. Respondes siempre en español.

DATOS DE VIAJES DISPONIBLES:
{{TOURS_DATA}}

DATOS DE CONTACTO:
{{CONTACT_DATA}}

INSTRUCCIONES IMPORTANTES:
Debes responder SIEMPRE en formato JSON válido con esta estructura:
{
  "message": "Tu respuesta amigable aquí",
  "action": "none" | "showTours" | "showContact" | "showLinks",
  "tourIds": ["id1", "id2"],
  "links": [{"text": "texto", "url": "url", "icon": "whatsapp|instagram|facebook|email|phone|map|web"}]
}

REGLAS DE ACCIÓN:
1. Si preguntan por viajes, tours, destinos, o quieren ver opciones:
   - action: "showTours"
   - tourIds: IDs de los viajes relevantes (máximo 5)
   - Filtra según lo que pidan: más baratos, más caros, por destino, por fecha, destacados, etc.

2. Si preguntan por contacto, teléfono, WhatsApp, email, redes sociales, dirección:
   - action: "showContact"
   - links: array con los enlaces relevantes

3. Si mencionan algo que requiere un enlace (reservar, ver tours, registrarse):
   - action: "showLinks"
   - links: con las URLs correspondientes

4. Para preguntas generales sin necesidad de mostrar datos:
   - action: "none"
   - Solo responde con message

EJEMPLOS DE FILTROS:
- "viaje más barato" → ordena por precio ascendente, muestra el primero
- "viajes baratos" → ordena por precio, muestra los 3 más baratos
- "viajes caros" → ordena por precio descendente
- "viajes destacados" → filtra isFeatured = true
- "viajes en enero" → filtra por fecha
- "viaje a Cataratas" → busca por destino

URLs DISPONIBLES:
- Ver todos los tours: /tours
- Reservar viaje específico: /booking/[id]
- Registrarse: /login?mode=register
- Iniciar sesión: /login
- Perfil: /profile

Responde SOLO con JSON válido, sin texto adicional.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const [allTours, contactInfo] = await Promise.all([
      getAllTours(),
      getContactInfo()
    ]);

    const toursDataStr = allTours.length > 0 
      ? allTours.map(t => 
          `ID: ${t.id}, Destino: ${t.destination}, Fecha: ${t.date.toLocaleDateString('es-AR')}, Precio: ${t.currency === 'USD' ? 'USD ' : ''}$${t.price}, Días: ${t.days || 'N/A'}, Noches: ${t.nights || 'N/A'}, Destacado: ${t.isFeatured ? 'Sí' : 'No'}`
        ).join('\n')
      : 'No hay viajes disponibles actualmente.';

    const contactDataStr = contactInfo 
      ? `WhatsApp: ${contactInfo.whatsapp || 'N/A'}, Teléfono: ${contactInfo.phone || 'N/A'}, Email: ${contactInfo.email || 'N/A'}, Instagram: ${contactInfo.instagram || 'N/A'}, Facebook: ${contactInfo.facebook || 'N/A'}, Dirección: ${contactInfo.address || 'N/A'}, Horario: ${contactInfo.hours || 'N/A'}`
      : 'Información de contacto no disponible.';

    const systemPrompt = SYSTEM_PROMPT
      .replace('{{TOURS_DATA}}', toursDataStr)
      .replace('{{CONTACT_DATA}}', contactDataStr);

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: [{ text: msg.content }]
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: conversationHistory,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });

    let text = response.text;
    let parsedResponse: any = { message: text, action: 'none' };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      parsedResponse = { message: text, action: 'none' };
    }

    let tours = null;
    if (parsedResponse.action === 'showTours' && parsedResponse.tourIds?.length > 0) {
      tours = allTours
        .filter(t => parsedResponse.tourIds.includes(t.id))
        .map(t => ({
          ...t,
          date: t.date.toISOString()
        }));
    }

    let links = null;
    if (parsedResponse.action === 'showContact' && contactInfo) {
      links = [];
      if (contactInfo.whatsapp) {
        links.push({
          text: 'WhatsApp',
          url: `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola! Quisiera hacer una consulta.')}`,
          icon: 'whatsapp'
        });
      }
      if (contactInfo.phone) {
        links.push({ text: contactInfo.phone, url: `tel:${contactInfo.phone}`, icon: 'phone' });
      }
      if (contactInfo.email) {
        links.push({ text: contactInfo.email, url: `mailto:${contactInfo.email}`, icon: 'email' });
      }
      if (contactInfo.instagram) {
        links.push({ text: 'Instagram', url: contactInfo.instagram, icon: 'instagram' });
      }
      if (contactInfo.facebook) {
        links.push({ text: 'Facebook', url: contactInfo.facebook, icon: 'facebook' });
      }
      if (contactInfo.address && contactInfo.addressLink) {
        links.push({ text: contactInfo.address, url: contactInfo.addressLink, icon: 'map' });
      }
    } else if (parsedResponse.links?.length > 0) {
      links = parsedResponse.links;
    }

    return NextResponse.json({ 
      message: parsedResponse.message || text,
      tours: tours,
      links: links,
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
