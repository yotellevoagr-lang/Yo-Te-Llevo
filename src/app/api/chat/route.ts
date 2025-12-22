import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const runtime = 'nodejs';

interface TourData {
  id: string;
  destination: string;
  date: string;
  price: number;
  currency: string;
  days?: number;
  nights?: number;
  backgroundImage?: string;
  isFeatured?: boolean;
}

interface ContactData {
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressLink?: string;
  instagram?: string;
  facebook?: string;
  hours?: string;
}

async function fetchFromFirestore(path: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return null;
  }
}

async function getAllTours(): Promise<TourData[]> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return [];
    
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tours`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    if (!data.documents) return [];
    
    const now = new Date();
    
    return data.documents
      .map((doc: any) => {
        const fields = doc.fields;
        const id = doc.name.split('/').pop();
        
        let dateValue: Date;
        if (fields.date?.timestampValue) {
          dateValue = new Date(fields.date.timestampValue);
        } else if (fields.date?.stringValue) {
          dateValue = new Date(fields.date.stringValue);
        } else {
          dateValue = new Date();
        }
        
        const isPublic = fields.isPublic?.booleanValue ?? true;
        if (!isPublic) return null;
        
        return {
          id,
          destination: fields.destination?.stringValue || '',
          date: dateValue.toISOString(),
          price: parseInt(fields.price?.integerValue || fields.price?.doubleValue || '0'),
          currency: fields.currency?.stringValue || 'ARS',
          days: parseInt(fields.days?.integerValue || '0') || undefined,
          nights: parseInt(fields.nights?.integerValue || '0') || undefined,
          backgroundImage: fields.backgroundImage?.stringValue,
          isFeatured: fields.isFeatured?.booleanValue || false,
        };
      })
      .filter((tour: TourData | null): tour is TourData => {
        if (!tour) return false;
        return new Date(tour.date) >= now;
      })
      .sort((a: TourData, b: TourData) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error fetching tours:', error);
    return [];
  }
}

async function getContactInfo(): Promise<ContactData | null> {
  try {
    const data = await fetchFromFirestore('settings/general');
    if (!data?.fields) return null;
    
    const fields = data.fields;
    const contact = fields.contact?.mapValue?.fields || {};
    
    return {
      whatsapp: fields.mainWhatsappNumber?.stringValue,
      phone: contact.phone?.stringValue,
      email: contact.email?.stringValue,
      address: contact.address?.stringValue,
      addressLink: contact.addressLink?.stringValue,
      instagram: contact.instagram?.stringValue,
      facebook: contact.facebook?.stringValue,
      hours: contact.hours?.stringValue,
    };
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

Responde SOLO con JSON válido, sin texto adicional ni markdown.`;

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
      ? allTours.map(t => {
          const date = new Date(t.date);
          return `ID: ${t.id}, Destino: ${t.destination}, Fecha: ${date.toLocaleDateString('es-AR')}, Precio: ${t.currency === 'USD' ? 'USD ' : ''}$${t.price}, Días: ${t.days || 'N/A'}, Noches: ${t.nights || 'N/A'}, Destacado: ${t.isFeatured ? 'Sí' : 'No'}`;
        }).join('\n')
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
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      parsedResponse = { message: text, action: 'none' };
    }

    let tours = null;
    if (parsedResponse.action === 'showTours' && parsedResponse.tourIds?.length > 0) {
      tours = allTours.filter(t => parsedResponse.tourIds.includes(t.id));
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
