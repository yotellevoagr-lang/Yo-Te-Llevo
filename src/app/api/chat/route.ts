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
      next: { revalidate: 0 }
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
          days: data.days,
          nights: data.nights,
          backgroundImage: data.backgroundImage,
          isFeatured: data.isFeatured || false,
          isPublic: data.isPublic ?? true
        };
      })
      .filter(tour => {
        // No filtering here, filter in getAllTours for consistency
        return true;
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
      next: { revalidate: 0 }
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
        } else if (fields.date?.integerValue) {
          dateValue = new Date(Number(fields.date.integerValue));
        } else {
          dateValue = new Date();
        }
        
        return {
          id,
          destination: fields.destination?.stringValue || 'Sin destino',
          date: dateValue.toISOString(),
          price: Number(fields.price?.integerValue || fields.price?.doubleValue || '0'),
          currency: fields.currency?.stringValue || 'ARS',
          days: parseInt(fields.days?.integerValue || '0') || undefined,
          nights: parseInt(fields.nights?.integerValue || '0') || undefined,
          backgroundImage: fields.backgroundImage?.stringValue,
          isFeatured: fields.isFeatured?.booleanValue || false,
        };
      })
      .filter((tour: TourData | null): tour is TourData => {
        // No filtering here, filter in getAllTours for consistency
        return !!tour;
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
  let tours: TourData[] = [];
  
  if (hasAdmin && db) {
    tours = await getAllToursAdmin();
  }
  
  if (tours.length === 0) {
    tours = await getAllToursREST();
  }
  
  // FINAL SAFETY FILTER: Remove only tours that are strictly in the past
  // But allow anything from "today" onwards
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  return tours.filter(t => {
    const tourDate = new Date(t.date).getTime();
    return tourDate >= todayStart;
  });
}

async function getContactInfo(): Promise<ContactData | null> {
  const hasAdmin = initializeFirebaseAdmin();
  if (hasAdmin && db) {
    const contact = await getContactInfoAdmin();
    if (contact) return contact;
  }
  return getContactInfoREST();
}

const SYSTEM_PROMPT = `Eres el asistente virtual oficial y experto de la agencia de viajes "YO TE LLEVO". Tu misión es ser el mejor asistente de IA: servicial, detallista y proactivo. Respondes siempre en español.

VIAJES DISPONIBLES ACTUALMENTE (Usa esta lista como única fuente de verdad):
{{TOURS_DATA}}

INFORMACIÓN DE CONTACTO:
{{CONTACT_DATA}}

REGLAS CRÍTICAS DE VISIBILIDAD:
1. DEBES MOSTRAR TODOS LOS VIAJES: Si el usuario pregunta "qué viajes hay", "cuáles son los destinos" o similares, TIENES que listar CADA UNO de los viajes que aparecen arriba en la sección "VIAJES DISPONIBLES ACTUALMENTE". No resumas, muéstralos todos.
2. NUNCA DIGAS QUE NO HAY VIAJES si hay al menos uno en la lista superior.
3. IDs DE VIAJES: Para la acción "showTours", incluye TODOS los IDs de la lista si el usuario pide ver todo el catálogo.

GUÍA DETALLADA DE RESERVA (Explica esto siempre que pregunten "cómo reservar"):
- Paso 1: Revisa nuestra lista de viajes y elige tu destino favorito.
- Paso 2: Haz clic en el botón "Reservar" del viaje elegido.
- Paso 3: Elige la fecha en la que deseas viajar.
- Paso 4: Carga los datos de los pasajeros (Nombre y DNI).
- Paso 5: Selecciona tu lugar de subida (punto de embarque).
- Paso 6: Elige si quieres pagar una seña o el total del viaje.
- Paso 7: ¡Confirmas y listo! Podrás ver tu comprobante en tu perfil.

FORMATO DE RESPUESTA (ESTRICTO JSON):
{
  "message": "Tu respuesta detallada y entusiasta aquí",
  "action": "none" | "showTours" | "showContact" | "showLinks",
  "tourIds": ["id1", "id2", ...],
  "links": [{"text": "texto", "url": "/url", "icon": "whatsapp|instagram|facebook|email|phone|map|web"}]
}

Responde SOLO con el objeto JSON, sin texto adicional.`;

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
          return `- VIAJE: ${t.destination} | FECHA: ${date.toLocaleDateString('es-AR')} | PRECIO: ${t.currency === 'USD' ? 'USD ' : ''}$${t.price} | ID: ${t.id} | DESTACADO: ${t.isFeatured ? 'SÍ' : 'NO'}`;
        }).join('\n')
      : 'No hay viajes disponibles actualmente.';

    const contactDataStr = contactInfo 
      ? `WhatsApp: ${contactInfo.whatsapp || 'N/A'}, Teléfono: ${contactInfo.phone || 'N/A'}, Email: ${contactInfo.email || 'N/A'}, Instagram: ${contactInfo.instagram || 'N/A'}, Facebook: ${contactInfo.facebook || 'N/A'}, Dirección: ${contactInfo.address || 'N/A'}, Horario: ${contactInfo.hours || 'N/A'}`
      : 'Información de contacto no disponible.';

    console.log('--- DEBUG INFO ---');
    console.log('Total tours encontrados:', allTours.length);
    console.log('Tours enviando al prompt:', toursDataStr);
    console.log('------------------');

    const systemPrompt = SYSTEM_PROMPT
      .replace('{{TOURS_DATA}}', toursDataStr)
      .replace('{{CONTACT_DATA}}', contactDataStr);

    const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: [{ text: msg.content }]
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: systemPrompt,
      messages: conversationHistory,
      config: {
        temperature: 0.1,
        maxOutputTokens: 2048,
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
