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
  isFeatured?: boolean;
  isPublic?: boolean;
  availableSeats?: number;
  tags?: string[];
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

      return {
        id,
        destination: fields.destination?.stringValue || 'Sin destino',
        date: dateValue.toISOString(),
        price: Number(fields.price?.integerValue || fields.price?.doubleValue || 0),
        currency: fields.currency?.stringValue || 'ARS',
        days: parseInt(fields.days?.integerValue || '0') || undefined,
        nights: parseInt(fields.nights?.integerValue || '0') || undefined,
        backgroundImage: fields.backgroundImage?.stringValue || undefined,
        isFeatured: fields.isFeatured?.booleanValue || false,
        isPublic,
        availableSeats: parseInt(fields.availableSeats?.integerValue || '0') || undefined,
        tags: tagsArray,
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

async function getAllTours(): Promise<TourData[]> {
  // Intenta con Admin SDK (bypasses security rules)
  const adminOk = initializeFirebaseAdmin();
  if (adminOk) {
    const adminTours = await getAllToursAdmin();
    if (adminTours.length > 0) {
      return adminTours.filter(t => t.isPublic === true);
    }
  }

  // Fallback: REST API pública (funciona cuando las reglas permiten lectura sin auth)
  const restTours = await getAllToursREST();
  return restTours.filter(t => t.isPublic === true);
}

async function getContactInfo(): Promise<ContactData | null> {
  const adminOk = initializeFirebaseAdmin();
  if (adminOk) {
    const info = await getContactInfoAdmin();
    if (info) return info;
  }
  return getContactInfoREST();
}

const SYSTEM_PROMPT = `Sos el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina. Respondés siempre en español, con tono cordial y entusiasta.

VIAJES DISPONIBLES (fuente de verdad absoluta):
{{TOURS_DATA}}

CONTACTO:
{{CONTACT_DATA}}

REGLA ABSOLUTA — TARJETAS DE VIAJE:
Cada vez que mencionás o describís UNO o MÁS viajes específicos, SIEMPRE debés incluir en el JSON:
  "action": "showTours"
  "tourIds": [ IDs exactos de los viajes que mencionás ]

Esto aplica SIN EXCEPCIÓN para:
- "viajes destacados" → incluí todos los IDs marcados como DESTACADO
- "viajes baratos" → incluí el ID del más barato
- "viaje a X destino" → incluí el ID de ese destino
- "mostrame todos los viajes" → incluí todos los IDs
- Cualquier mención de 1 o más viajes en tu respuesta

NUNCA respondas solo con texto cuando mencionás viajes. El usuario SIEMPRE necesita ver la tarjeta con imagen y botón de reserva.
Si piden contacto: "action": "showContact".
Para reservas: elegir viaje → clic en Reservar → datos de pasajeros → punto de embarque → pagar seña o total.

RESPUESTA (SOLO JSON, sin texto extra):
{
  "message": "tu respuesta aquí",
  "action": "none" | "showTours" | "showContact",
  "tourIds": ["id1", "id2"],
  "links": [{"text": "texto", "url": "/url", "icon": "whatsapp|instagram|facebook|email|phone|map"}]
}`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

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
            t.days ? `${t.days} días` : null,
            t.nights ? `${t.nights} noches` : null,
            t.availableSeats ? `${t.availableSeats} lugares disp.` : null,
            t.isFeatured ? 'DESTACADO' : null,
            t.tags && t.tags.length > 0 ? t.tags.join(', ') : null,
          ].filter(Boolean).join(' | ');
          return `• ${t.destination} — ${dateStr} — ${price} — ID: ${t.id}${extras ? ` [${extras}]` : ''}`;
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

    const systemPrompt = SYSTEM_PROMPT
      .replace('{{TOURS_DATA}}', toursDataStr)
      .replace('{{CONTACT_DATA}}', contactDataStr);

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: [{ text: msg.content }],
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: conversationHistory,
      config: { temperature: 0.2, maxOutputTokens: 1024 },
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

    let tours = null;

    // Caso 1: La IA usó showTours correctamente con IDs
    if (Array.isArray(parsed.tourIds) && parsed.tourIds.length > 0) {
      tours = allTours.filter(t => parsed.tourIds.includes(t.id));
    }

    // Caso 2: La IA habló de viajes pero no usó showTours ni IDs — fallback por nombre de destino
    if ((!tours || tours.length === 0) && parsed.message) {
      const msgLower = parsed.message.toLowerCase();
      // Detectar si habla de viajes destacados
      if (msgLower.includes('destacado') || msgLower.includes('featured')) {
        const featuredTours = allTours.filter(t => t.isFeatured);
        if (featuredTours.length > 0) tours = featuredTours;
      }
      // Detectar destinos mencionados por nombre
      if (!tours || tours.length === 0) {
        const mentionedByName = allTours.filter(t =>
          msgLower.includes(t.destination.toLowerCase().trim())
        );
        if (mentionedByName.length > 0) tours = mentionedByName;
      }
      // Si habla de "viajes" en general sin filtrar, mostrar todos
      if (!tours || tours.length === 0) {
        const tourKeywords = ['viajes disponibles', 'todos los viajes', 'viajes que tenemos', 'nuestros viajes', 'catálogo'];
        if (tourKeywords.some(k => msgLower.includes(k))) {
          tours = allTours;
        }
      }
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
      success: true,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error al procesar tu mensaje. Por favor, intentá de nuevo.', success: false }, { status: 500 });
  }
}
