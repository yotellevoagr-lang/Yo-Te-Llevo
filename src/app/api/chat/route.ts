import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function initializeFirebaseAdmin(): boolean {
  if (adminApp && adminDb) return true;

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) return false;

    const serviceAccount = JSON.parse(serviceAccountKey);

    if (getApps().length === 0) {
      adminApp = initializeApp({ credential: cert(serviceAccount) });
    } else {
      adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    return true;
  } catch {
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
  gallery?: { url: string; type: string }[];
  isFeatured?: boolean;
  isPublic?: boolean;
  availableSeats?: number;
  tags?: string[];
  description?: string;
  cancellationPolicy?: string;
  departureTime?: string;
  presentationTime?: string;
}

interface WeatherData {
  city: string;
  temp: string;
  feelsLike: string;
  desc: string;
  humidity: string;
  forecast: string;
}

interface UserContext {
  name?: string;
  pastDestinations?: string[];
  upcomingDestinations?: string[];
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

async function getAllToursAdmin(): Promise<TourData[]> {
  if (!adminDb) return [];

  try {
    const snap = await adminDb.collection('tours').get();
    return snap.docs.map(doc => {
      const data = doc.data();
      let dateValue: Date;

      if (data.date?.toDate) {
        dateValue = data.date.toDate();
      } else if (data.date instanceof Date) {
        dateValue = data.date;
      } else if (typeof data.date === 'string' || typeof data.date === 'number') {
        dateValue = new Date(data.date);
      } else {
        dateValue = new Date();
      }

      return {
        id: doc.id,
        destination: data.destination || 'Sin destino',
        date: dateValue.toISOString(),
        price: Number(data.price) || 0,
        currency: data.currency || 'ARS',
        days: data.days || undefined,
        nights: data.nights || undefined,
        backgroundImage: data.backgroundImage || undefined,
        isFeatured: data.isFeatured || false,
        isPublic: data.isPublic === true,
        availableSeats: data.availableSeats || undefined,
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

async function getAllToursREST(): Promise<TourData[]> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return [];

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tours?pageSize=300`;
    const allDocs: any[] = [];

    // Recorrer todas las páginas de resultados
    let nextPageToken: string | null = null;
    do {
      const url = nextPageToken ? `${baseUrl}&pageToken=${nextPageToken}` : baseUrl;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) break;
      const data = await res.json();
      if (data.documents) allDocs.push(...data.documents);
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    if (allDocs.length === 0) return [];

    return allDocs.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();

      const isPublic = fields.isPublic?.booleanValue === true;

      let dateValue: Date;
      if (fields.date?.timestampValue) {
        dateValue = new Date(fields.date.timestampValue);
      } else if (fields.date?.stringValue) {
        dateValue = new Date(fields.date.stringValue);
      } else if (fields.date?.integerValue) {
        dateValue = new Date(Number(fields.date.integerValue));
      } else if (fields.date?.mapValue?.fields?.seconds?.integerValue) {
        dateValue = new Date(Number(fields.date.mapValue.fields.seconds.integerValue) * 1000);
      } else {
        dateValue = new Date();
      }

      const tagsArray = fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue).filter(Boolean) || [];
      const gallery = fields.gallery?.arrayValue?.values?.slice(0, 4).map((v: any) => ({
        url: v.mapValue?.fields?.url?.stringValue || '',
        type: v.mapValue?.fields?.type?.stringValue || 'image'
      })).filter((g: any) => g.url) || [];

      return {
        id,
        destination: fields.destination?.stringValue || 'Sin destino',
        date: dateValue.toISOString(),
        price: Number(fields.price?.integerValue || fields.price?.doubleValue || 0),
        currency: fields.currency?.stringValue || 'ARS',
        days: parseInt(fields.days?.integerValue || '0') || undefined,
        nights: parseInt(fields.nights?.integerValue || '0') || undefined,
        backgroundImage: fields.backgroundImage?.stringValue || undefined,
        gallery: gallery.length > 0 ? gallery : undefined,
        isFeatured: fields.isFeatured?.booleanValue || false,
        isPublic,
        availableSeats: parseInt(fields.availableSeats?.integerValue || '0') || undefined,
        tags: tagsArray,
        description: fields.description?.stringValue || fields.observations?.stringValue || undefined,
        cancellationPolicy: fields.cancellationPolicy?.stringValue || undefined,
        departureTime: fields.departureTime?.stringValue || undefined,
        presentationTime: fields.presentationTime?.stringValue || undefined,
      };
    }).sort((a: TourData, b: TourData) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

async function getContactInfoAdmin(): Promise<ContactData | null> {
  if (!adminDb) return null;
  try {
    const doc = await adminDb.collection('settings').doc('general').get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      whatsapp: data.mainWhatsappNumber,
      phone: data.contact?.phone,
      email: data.contact?.email,
      address: data.contact?.address,
      addressLink: data.contact?.addressLink,
      instagram: data.contact?.instagram,
      facebook: data.contact?.facebook,
      hours: data.contact?.hours,
    };
  } catch {
    return null;
  }
}

async function getContactInfoREST(): Promise<ContactData | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.fields) return null;
    const f = data.fields;
    const c = f.contact?.mapValue?.fields || {};
    return {
      whatsapp: f.mainWhatsappNumber?.stringValue,
      phone: c.phone?.stringValue,
      email: c.email?.stringValue,
      address: c.address?.stringValue,
      addressLink: c.addressLink?.stringValue,
      instagram: c.instagram?.stringValue,
      facebook: c.facebook?.stringValue,
      hours: c.hours?.stringValue,
    };
  } catch {
    return null;
  }
}

function isTourUpcoming(tour: TourData): boolean {
  // Hora actual en Argentina (UTC-3) — inicio del día
  const now = new Date();
  const argentinaOffset = -3 * 60; // minutos
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const argNow = new Date(utcMs + argentinaOffset * 60000);
  // Comparar solo fecha (sin hora) — el día del viaje ya es historial
  const todayArg = new Date(argNow.getFullYear(), argNow.getMonth(), argNow.getDate());
  const tourDate = new Date(tour.date);
  const tourDay = new Date(tourDate.getFullYear(), tourDate.getMonth(), tourDate.getDate());
  return tourDay > todayArg;
}

async function getAllTours(): Promise<TourData[]> {
  // Intenta con Admin SDK (bypasses security rules)
  const adminOk = initializeFirebaseAdmin();
  if (adminOk) {
    const adminTours = await getAllToursAdmin();
    if (adminTours.length > 0) {
      return adminTours.filter(t => t.isPublic === true && isTourUpcoming(t));
    }
  }

  // Fallback: REST API pública (funciona cuando las reglas permiten lectura sin auth)
  const restTours = await getAllToursREST();
  return restTours.filter(t => t.isPublic === true && isTourUpcoming(t));
}

async function getWeather(city: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { cache: 'no-store', headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;
    const desc = current.weatherDesc?.[0]?.value || 'N/A';
    const forecastArr = (data.weather || []).slice(0, 3);
    const forecast = forecastArr.map((w: any) => {
      return `${w.date}: ${w.mintempC}°-${w.maxtempC}°C`;
    }).join(' | ');
    return {
      city,
      temp: `${current.temp_C}°C`,
      feelsLike: `${current.FeelsLikeC}°C`,
      desc,
      humidity: `${current.humidity}%`,
      forecast,
    };
  } catch {
    return null;
  }
}

async function getContactInfo(): Promise<ContactData | null> {
  const adminOk = initializeFirebaseAdmin();
  if (adminOk) {
    const info = await getContactInfoAdmin();
    if (info) return info;
  }
  return getContactInfoREST();
}

const SYSTEM_PROMPT = `Sos el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina. Respondés siempre en español, con tono cordial y entusiasta. Sos un asistente avanzado, único e inigualable.

VIAJES DISPONIBLES (fuente de verdad absoluta):
{{TOURS_DATA}}

CONTACTO:
{{CONTACT_DATA}}

USUARIO ACTUAL:
{{USER_DATA}}

═══════════════════════════════
REGLAS Y CAPACIDADES
═══════════════════════════════

1. TARJETAS DE VIAJE (REGLA ABSOLUTA):
   Cada vez que mencionás 1 o más viajes, SIEMPRE incluí:
   "action": "showTours", "tourIds": [IDs exactos]
   - "viajes destacados" → IDs con DESTACADO
   - "más barato" → ID del precio mínimo
   - "viaje a X" → ID de ese destino
   - "todos los viajes" → todos los IDs
   NUNCA respondas solo texto cuando mencionás viajes.

2. COMPARAR VIAJES:
   Si el usuario pide comparar 2 viajes → "action": "showComparison", "tourIds": [id1, id2]
   Ejemplo: "comparame Cataratas con Buenos Aires", "¿cuál es mejor X o Y?"

3. CLIMA / TIEMPO:
   Si preguntan por el clima en un destino → "action": "showWeather", "weatherDestination": "nombre exacto ciudad"
   Ejemplo: "¿qué clima hace en Cataratas?", "¿cómo está el tiempo en Córdoba?"

4. FAQ / DETALLES DEL VIAJE:
   Si preguntan qué incluye, qué llevar, itinerario, horarios, política de cancelación →
   Respondé con la información disponible en la descripción y datos del viaje.
   Siempre que hables de un viaje específico, incluí también su tarjeta (showTours + tourId).

5. PRESUPUESTO:
   Si el usuario da un presupuesto → mostrá TODOS los viajes dentro de ese rango.
   "Tengo $X" → filtrá por precio <= X → showTours con esos IDs.
   Si ninguno entra → mostrá el más cercano al presupuesto.

6. HISTORIAL PERSONALIZADO:
   Si hay datos de usuario → Saludalo por nombre, considerá sus viajes pasados para recomendar
   destinos nuevos. Mencioná si ya viajó a un destino que está preguntando.

7. CONTACTO:
   Si piden contacto → "action": "showContact"

8. PARA RESERVAR:
   Elegir viaje → botón Reservar → datos de pasajeros → punto de embarque → pagar seña o total.

═══════════════════════════════
FORMATO DE RESPUESTA (SOLO JSON):
═══════════════════════════════
{
  "message": "tu respuesta aquí",
  "action": "none" | "showTours" | "showContact" | "showComparison" | "showWeather",
  "tourIds": ["id1", "id2"],
  "weatherDestination": "ciudad para consultar el clima",
  "links": [{"text": "texto", "url": "/url", "icon": "whatsapp|instagram|facebook|email|phone|map"}]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userContext }: { messages: any[]; userContext?: UserContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const [allTours, contactInfo] = await Promise.all([getAllTours(), getContactInfo()]);

    const toursDataStr = allTours.length > 0
      ? allTours.map(t => {
          const date = new Date(t.date);
          const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
          const price = t.currency === 'USD' ? `USD $${t.price}` : `$${t.price} ARS`;
          const extras = [
            t.days ? `${t.days}D` : null,
            t.nights ? `${t.nights}N` : null,
            t.availableSeats ? `${t.availableSeats} lugares` : null,
            t.isFeatured ? 'DESTACADO' : null,
            t.departureTime ? `Salida: ${t.departureTime}` : null,
            t.tags && t.tags.length > 0 ? `Tags: ${t.tags.join(',')}` : null,
          ].filter(Boolean).join(' | ');
          const descSnippet = t.description ? `\n  Info: ${t.description.slice(0, 120)}${t.description.length > 120 ? '...' : ''}` : '';
          const cancelSnippet = t.cancellationPolicy ? `\n  Cancelación: ${t.cancellationPolicy.slice(0, 80)}` : '';
          return `• ${t.destination} — ${dateStr} — ${price} — ID: ${t.id}${extras ? ` [${extras}]` : ''}${descSnippet}${cancelSnippet}`;
        }).join('\n')
      : 'No hay viajes cargados en el sistema.';

    const contactDataStr = contactInfo
      ? [
          contactInfo.whatsapp ? `WhatsApp: ${contactInfo.whatsapp}` : null,
          contactInfo.phone ? `Tel: ${contactInfo.phone}` : null,
          contactInfo.email ? `Email: ${contactInfo.email}` : null,
          contactInfo.instagram ? `Instagram: ${contactInfo.instagram}` : null,
          contactInfo.facebook ? `Facebook: ${contactInfo.facebook}` : null,
          contactInfo.address ? `Dirección: ${contactInfo.address}` : null,
          contactInfo.hours ? `Horario: ${contactInfo.hours}` : null,
        ].filter(Boolean).join(' | ')
      : 'Contacto no disponible.';

    const userDataStr = userContext
      ? [
          userContext.name ? `Nombre: ${userContext.name}` : null,
          userContext.pastDestinations?.length ? `Ya viajó a: ${userContext.pastDestinations.join(', ')}` : null,
          userContext.upcomingDestinations?.length ? `Tiene reservado: ${userContext.upcomingDestinations.join(', ')}` : null,
        ].filter(Boolean).join(' | ')
      : 'Usuario anónimo (no logueado)';

    const systemPrompt = SYSTEM_PROMPT
      .replace('{{TOURS_DATA}}', toursDataStr)
      .replace('{{CONTACT_DATA}}', contactDataStr)
      .replace('{{USER_DATA}}', userDataStr);

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: [{ text: msg.content }],
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: conversationHistory,
      config: { temperature: 0.2, maxOutputTokens: 1500 },
    });

    let text = response.text;
    let parsed: any = { message: text, action: 'none' };

    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = { message: text, action: 'none' };
    }

    // Obtener tours a mostrar (comparación o tarjetas individuales)
    let tours = null;
    const isComparison = parsed.action === 'showComparison';

    if (Array.isArray(parsed.tourIds) && parsed.tourIds.length > 0) {
      tours = allTours.filter(t => parsed.tourIds.includes(t.id));
    }

    // Fallback por nombre de destino si la IA no usó tourIds
    if ((!tours || tours.length === 0) && !isComparison && parsed.message) {
      const msgLower = parsed.message.toLowerCase();
      if (msgLower.includes('destacado') || msgLower.includes('featured')) {
        const ft = allTours.filter(t => t.isFeatured);
        if (ft.length > 0) tours = ft;
      }
      if (!tours || tours.length === 0) {
        const byName = allTours.filter(t => msgLower.includes(t.destination.toLowerCase().trim()));
        if (byName.length > 0) tours = byName;
      }
      if (!tours || tours.length === 0) {
        const allKeywords = ['viajes disponibles', 'todos los viajes', 'viajes que tenemos', 'nuestros viajes', 'catálogo'];
        if (allKeywords.some(k => msgLower.includes(k))) tours = allTours;
      }
    }

    // Obtener clima si la IA lo solicitó
    let weather = null;
    if (parsed.action === 'showWeather' && parsed.weatherDestination) {
      weather = await getWeather(parsed.weatherDestination);
    }

    let links = null;
    if (parsed.action === 'showContact' && contactInfo) {
      links = [];
      if (contactInfo.whatsapp) links.push({ text: 'WhatsApp', url: `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola! Quisiera consultar sobre un viaje.')}`, icon: 'whatsapp' });
      if (contactInfo.phone) links.push({ text: contactInfo.phone, url: `tel:${contactInfo.phone}`, icon: 'phone' });
      if (contactInfo.email) links.push({ text: contactInfo.email, url: `mailto:${contactInfo.email}`, icon: 'email' });
      if (contactInfo.instagram) links.push({ text: 'Instagram', url: contactInfo.instagram, icon: 'instagram' });
      if (contactInfo.facebook) links.push({ text: 'Facebook', url: contactInfo.facebook, icon: 'facebook' });
      if (contactInfo.address && contactInfo.addressLink) links.push({ text: contactInfo.address, url: contactInfo.addressLink, icon: 'map' });
    } else if (Array.isArray(parsed.links) && parsed.links.length > 0) {
      links = parsed.links;
    }

    return NextResponse.json({
      message: parsed.message || text,
      tours,
      links,
      weather,
      isComparison,
      success: true,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error al procesar tu mensaje. Por favor, intentá de nuevo.', success: false }, { status: 500 });
  }
}
