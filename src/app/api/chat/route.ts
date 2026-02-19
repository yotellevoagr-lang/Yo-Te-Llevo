import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

let adminApp: App | null = null;
let db: Firestore | null = null;

function initializeFirebaseAdmin() {
  if (adminApp) return true;
  
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) return false;
    
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      adminApp = getApps()[0];
    }
    
    db = getFirestore(adminApp);
    return true;
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
    return false;
  }
}

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

async function fetchFromFirestoreREST(path: string) {
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
    console.error('Firestore REST fetch error:', error);
    return null;
  }
}

async function getAllToursAdmin(): Promise<TourData[]> {
  if (!db) return [];
  
  try {
    const toursSnapshot = await db.collection('tours').get();
    const now = new Date();
    
    return toursSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        return {
          id: doc.id,
          destination: data.destination,
          date: date.toISOString(),
          price: data.price,
          currency: data.currency || 'ARS',
          days: data.days,
          nights: data.nights,
          backgroundImage: data.backgroundImage,
          isFeatured: data.isFeatured,
          isPublic: data.isPublic ?? true
        };
      })
      .filter(tour => {
        const isPublic = tour.isPublic !== false;
        return isPublic && new Date(tour.date) >= now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error fetching tours with Admin:', error);
    return [];
  }
}

async function getAllToursREST(): Promise<TourData[]> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return [];
    
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tours?pageSize=100`;
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
    console.error('Error fetching tours with REST:', error);
    return [];
  }
}

async function getContactInfoAdmin(): Promise<ContactData | null> {
  if (!db) return null;
  
  try {
    const settingsDoc = await db.collection('settings').doc('general').get();
    if (!settingsDoc.exists) return null;
    
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
  } catch (error) {
    console.error('Error fetching contact with Admin:', error);
    return null;
  }
}

async function getContactInfoREST(): Promise<ContactData | null> {
  try {
    const data = await fetchFromFirestoreREST('settings/general');
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
    console.error('Error fetching contact with REST:', error);
    return null;
  }
}

async function getAllTours(): Promise<TourData[]> {
  const hasAdmin = initializeFirebaseAdmin();
  if (hasAdmin && db) {
    const tours = await getAllToursAdmin();
    if (tours.length > 0) return tours;
  }
  return getAllToursREST();
}

async function getContactInfo(): Promise<ContactData | null> {
  const hasAdmin = initializeFirebaseAdmin();
  if (hasAdmin && db) {
    const contact = await getContactInfoAdmin();
    if (contact) return contact;
  }
  return getContactInfoREST();
}

const SYSTEM_PROMPT = `Eres el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina. Eres amigable, entusiasta y el mejor asistente de IA que existe. Respondes siempre en español.

DATOS DE VIAJES DISPONIBLES:
{{TOURS_DATA}}

DATOS DE CONTACTO:
{{CONTACT_DATA}}

INSTRUCCIONES DE RESPUESTA:
Debes responder SIEMPRE en formato JSON válido con esta estructura:
{
  "message": "Tu respuesta amigable y detallada aquí",
  "action": "none" | "showTours" | "showContact" | "showLinks",
  "tourIds": ["id1", "id2"],
  "links": [{"text": "texto", "url": "/url", "icon": "whatsapp|instagram|facebook|email|phone|map|web"}]
}

REGLAS DE ORO:
1. MOSTRAR TODOS LOS VIAJES: Si el usuario pide "ver todos los viajes", "qué viajes hay", o similares sin filtros específicos, DEBES incluir los IDs de TODOS los viajes disponibles en el campo "tourIds". No te limites a 5 si el usuario quiere ver todo el catálogo.
2. GUÍA PASO A PASO PARA RESERVAS: Cuando alguien pregunte "cómo reservar", "cómo hago una reserva" o similar, NO solo los redirijas. Debes explicarles el proceso detalladamente:
   - Paso 1: Explora nuestros destinos en la sección de "Viajes" o pídeme que te muestre las opciones.
   - Paso 2: Elige el viaje que más te guste y haz clic en el botón "Reservar" o "Ver Detalles".
   - Paso 3: Selecciona la fecha de salida (si hay varias disponibles).
   - Paso 4: Completa los datos de los pasajeros (Nombre, DNI, etc.).
   - Paso 5: Elige tu punto de embarque.
   - Paso 6: Selecciona el método de pago (Seña o Pago Total).
   - Paso 7: ¡Listo! Recibirás la confirmación y podrás ver tu reserva en tu perfil.
3. EXCELENCIA: Sé proactivo. Si un viaje está marcado como "Destacado", menciónalo con entusiasmo. Si preguntan por contacto, ofrece todos los medios disponibles.

REGLAS DE ACCIÓN:
1. Si preguntan por viajes, tours, destinos, o quieren ver opciones:
   - action: "showTours"
   - tourIds: IDs de los viajes relevantes. Si piden "todos", incluye todos. Si piden específicos, filtra.
   - Filtra según lo que pidan: más baratos, más caros, por destino, por fecha, destacados, etc.

2. Si preguntan por contacto, teléfono, WhatsApp, email, redes sociales, dirección:
   - action: "showContact"
   - links: array con los enlaces relevantes.

3. Si mencionan algo que requiere un enlace (reservar, ver tours, registrarse):
   - action: "showLinks"
   - links: con las URLs correspondientes.

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
      // Allow showing more than 5 if explicitly requested or "all"
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
