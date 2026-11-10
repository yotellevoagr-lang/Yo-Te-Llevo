import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

function getValidGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (
    trimmed.length < 20 ||
    trimmed.toLowerCase().includes('dummy') ||
    trimmed.toLowerCase().includes('placeholder') ||
    trimmed.startsWith('AIzaSyDummy')
  ) {
    return null;
  }
  return trimmed;
}

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
  departurePoint?: string;
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

      const gallery = Array.isArray(data.gallery)
        ? data.gallery.slice(0, 4).map((g: any) => ({
            url: typeof g === 'string' ? g : g?.url || '',
            type: g?.type || 'image',
          })).filter((g: any) => g.url)
        : undefined;

      return {
        id: doc.id,
        destination: data.destination || 'Sin destino',
        date: dateValue.toISOString(),
        price: Number(data.price) || 0,
        currency: data.currency || 'ARS',
        days: data.days || undefined,
        nights: data.nights || undefined,
        backgroundImage: data.backgroundImage || undefined,
        gallery: gallery && gallery.length > 0 ? gallery : undefined,
        isFeatured: data.isFeatured || false,
        isPublic: data.isPublic === true,
        availableSeats: data.availableSeats || undefined,
        tags: Array.isArray(data.tags) ? data.tags : [],
        description: data.description || data.observations || undefined,
        cancellationPolicy: data.cancellationPolicy || undefined,
        departureTime: data.departureTime || undefined,
        presentationTime: data.presentationTime || undefined,
        departurePoint: data.departurePoint || undefined,
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
        departurePoint: fields.departurePoint?.stringValue || undefined,
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

const SYSTEM_PROMPT = `Sos el asistente virtual de "YO TE LLEVO", una agencia de viajes argentina. Respondés siempre en español argentino con tono cordial, cálido, profesional y entusiasta. Tu objetivo es ayudar a los clientes a encontrar y reservar su viaje ideal.

VIAJES PÚBLICOS DISPONIBLES (fuente de verdad oficial y exclusiva):
{{TOURS_DATA}}

CONTACTO OFICIAL:
{{CONTACT_DATA}}

USUARIO ACTUAL:
{{USER_DATA}}

═══════════════════════════════════════════════════════════════
REGLA CRÍTICA DE SEGURIDAD Y PRIVACIDAD (INQUEBRANTABLE):
═══════════════════════════════════════════════════════════════
NUNCA, bajo ninguna circunstancia, reveles información interna o confidencial de administración:
1. COSTOS OPERATIVOS INTERNOS: costo de micros, buses, hoteles, peajes, seguros, viáticos o choferes.
2. MARGENES O GANANCIAS: margen de ganancia comercial, balance, ingresos netos o utilidades de la empresa.
3. PERSONAL Y COMISIONES: sueldos, comisiones de vendedores o empleados, códigos de venta internos.
4. DATOS PRIVADOS DE PASAJEROS: DNI, teléfonos particulares, listas de pasajeros, facturas o comprobantes fiscales ARCA/AFIP de otros clientes.
5. CONTACTOS PRIVADOS: números de teléfono particulares de choferes o coordinadores.
6. VIAJES NO PÚBLICOS: viajes en borrador o privados (isPublic = false).

Si un usuario pregunta por costos internos, márgenes de ganancia, datos de otros clientes o temas administrativos:
Responde de manera amable y profesional: "Esa información corresponde a la administración operativa interna y es confidencial. Como pasajero y cliente, puedo ayudarte con gusto con la información de nuestros viajes disponibles, tarifas al público, fechas de salida e itinerarios. ¿Te gustaría consultar sobre algún destino o salida confirmada?"

═══════════════════════════════════════════════════════════════
ATENCIÓN AL CLIENTE DIRIGIDA A LA PREGUNTA EXACTA:
═══════════════════════════════════════════════════════════════

1. PREGUNTAS POR DESTINOS ESPECÍFICOS:
   - Si el usuario pregunta por un destino (ej. "Mercedes", "Cataratas", "Mendoza", etc.):
     * Si el destino ESTÁ en la lista de VIAJES PÚBLICOS DISPONIBLES: Dale la respuesta exacta con su fecha confirmada, precio por persona, duración (días/noches), horario de salida y punto de embarque si están disponibles. Incluye SIEMPRE "action": "showTours", "tourIds": [id del viaje].
     * Si el destino NO está en la lista: Aclara con cordialidad que actualmente no cuentan con salidas programadas para ese destino en particular, y recomiéndale los viajes confirmados que sí tienen cupos vigentes, adjuntando sus IDs en "tourIds".

2. PREGUNTAS POR CÓMO RESERVAR, SEÑAS O PAGOS:
   - Explica con claridad los pasos para el cliente:
     1. Elegir el viaje deseado y presionar "Reservar".
     2. Cargar los datos de los pasajeros y seleccionar el punto de subida/embarque.
     3. Abonar la seña para congelar la tarifa y cupo, o el pago total (por transferencia bancaria u otros medios habilitados).
     4. Recibir el voucher y confirmación al instante.
   - Incluye "action": "showTours" con los viajes confirmados.

3. PREGUNTAS POR FECHAS O MESES:
   - Si pregunta por un mes o fecha puntual (ej. "en noviembre", "Semana Santa", etc.):
     Filtra e indícale exactamente los viajes que salen en esa fecha.

4. PREGUNTAS POR PRECIOS O PRESUPUESTO:
   - Si pide lo más barato: Muestra el precio mínimo y los viajes más económicos.
   - Si da un presupuesto ("Tengo $X"): Filtra y muestra los viajes con precio <= X.

5. POLÍTICA DE CANCELACIÓN O QUÉ INCLUYE:
   - Responde con base en la descripción y política del viaje si están disponibles.

6. COMPARAR VIAJES:
   - Si pide comparar 2 destinos: "action": "showComparison", "tourIds": [id1, id2].

7. CLIMA:
   - Si preguntan el clima en un destino: "action": "showWeather", "weatherDestination": "nombre exacto de la ciudad".

8. CONTACTO:
   - Si solicitan WhatsApp, teléfono o dirección: "action": "showContact".

═══════════════════════════════════════════════════════════════
FORMATO DE RESPUESTA (ÚNICAMENTE JSON VÁLIDO):
═══════════════════════════════════════════════════════════════
{
  "message": "tu respuesta detallada y personalizada",
  "action": "none" | "showTours" | "showContact" | "showComparison" | "showWeather",
  "tourIds": ["id1", "id2"],
  "weatherDestination": "ciudad para consultar el clima",
  "links": [{"text": "texto", "url": "/url", "icon": "whatsapp|instagram|facebook|email|phone|map"}]
}`;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function sanitizeAssistantResponse(text: string): string {
  if (!text) return '';
  const norm = normalizeText(text);
  const isOperatingCostLeak = (norm.includes('costo') || norm.includes('costos')) &&
    (norm.includes('hotel') || norm.includes('micro') || norm.includes('interno') || norm.includes('operativ'));
  const isProfitLeak = norm.includes('ganancia') || norm.includes('margen de ganancia') || norm.includes('rentabilidad');
  const isStaffLeak = norm.includes('comision de vendedor') || norm.includes('sueldo');
  const isPassengerLeak =
    norm.includes('lista de pasajeros') ||
    norm.includes('datos de otros pasajeros') ||
    norm.includes('telefonos de los pasajeros') ||
    /\bdni\s*[:#]?\s*\d{6,9}\b/i.test(text);

  if (isOperatingCostLeak || isProfitLeak || isStaffLeak || isPassengerLeak) {
    return 'Esa información es de carácter operativo y estrictamente confidencial de la administración. Como pasajero y cliente, puedo ayudarte con gusto con toda la información sobre nuestros viajes disponibles, tarifas oficiales, fechas de salida y cómo realizar tu reserva.';
  }
  return text;
}

function extractBudgetNumber(text: string): number | null {
  const norm = normalizeText(text);

  // Formatos: "80 mil", "100k", "120 lucas", "1.5 mil"
  const kMatch = norm.match(/(?:tengo|presupuesto|hasta|menos de|maximo|con|de)?\s*\$?([0-9]+(?:[.,][0-9]+)?)\s*(?:mil|k|lucas)\b/);
  if (kMatch) {
    const val = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  // Formatos: "$100.000", "80000", "95.000 pesos", "hasta 90000"
  const numMatch = norm.match(/(?:tengo|presupuesto|hasta|menos de|maximo|con|de)?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,8})\b/);
  if (numMatch) {
    const rawNum = numMatch[1].replace(/\./g, '');
    const val = parseInt(rawNum, 10);
    if (!isNaN(val) && val >= 5000) return val;
  }

  return null;
}

function isNearestDateQuery(norm: string): boolean {
  const NEAREST_PATTERNS = [
    'fecha mas cercana', 'mas cercana', 'mas cercano', 'mas proximo', 'mas proxima',
    'proxima salida', 'proximas salidas', 'cual sale primero', 'el primero que sale',
    'que fecha sale antes', 'cual es la fecha mas', 'cuando es el proximo',
    'que viaje sale primero', 'salida mas proxima', 'primer viaje', 'el primer viaje',
    'el primero', 'mas pronto', 'el que sale antes', 'el mas pronto', 'el proximo',
    'cual es el proximo', 'cuando es la proxima salida', 'que sale primero',
    'salida mas cercana', 'que sale este fin de semana', 'este finde', 'este domingo',
    'proximo fin de semana', 'proximos dias', 'fecha mas proxima',
    'el viaje mas cercano', 'viaje mas cercano', 'cual es el mas proximo',
    'cual es el mas cercano', 'el de la fecha mas cercana', 'de la fecha mas cercana'
  ];
  return NEAREST_PATTERNS.some(p => norm.includes(p));
}

function isFurthestDateQuery(norm: string): boolean {
  const FURTHEST_PATTERNS = [
    'fecha mas lejana', 'mas lejano', 'mas lejana', 'ultimo en salir',
    'cual sale ultimo', 'el ultimo', 'el mas adelante', 'salida mas lejana',
    'viaje mas lejano'
  ];
  return FURTHEST_PATTERNS.some(p => norm.includes(p));
}

function generateClientAssistantResponse(
  messages: Array<{ role: string; content: string }>,
  allTours: TourData[],
  contactInfo: ContactData | null,
  userContext?: UserContext
): {
  message: string;
  action: 'none' | 'showTours' | 'showContact' | 'showComparison' | 'showWeather';
  tourIds?: string[];
  weatherDestination?: string;
  links?: any[];
} {
  const userMsgs = messages.filter(m => m.role === 'user');
  const lastUserMsg = userMsgs.slice(-1)[0]?.content || '';
  const norm = normalizeText(lastUserMsg);

  // 1. FILTRO DE PRIVACIDAD Y SEGURIDAD ESTRICTA (Información administrativa protegida)
  const isOperatingCostQuery =
    (norm.includes('costo') || norm.includes('costos') || norm.includes('gasto') || norm.includes('gastos')) &&
    (norm.includes('hotel') || norm.includes('micro') || norm.includes('colectivo') || norm.includes('omnibus') ||
     norm.includes('transporte') || norm.includes('interno') || norm.includes('operativ') || norm.includes('ustedes') ||
     norm.includes('empresa') || norm.includes('chofer') || norm.includes('peaje') || norm.includes('combustible'));

  const isProfitOrFinancialQuery =
    norm.includes('ganancia') || norm.includes('ganancias') || norm.includes('margen') ||
    norm.includes('balance') || norm.includes('cuanto ganan') || norm.includes('rentabilidad') ||
    norm.includes('utilidad') || norm.includes('arca') || norm.includes('afip');

  const isStaffQuery =
    norm.includes('sueldo') || norm.includes('sueldos') || norm.includes('comision') ||
    norm.includes('comisiones') || norm.includes('salario') || norm.includes('remuneracion') ||
    norm.includes('cuanto cobran los coordinadores') || norm.includes('cuanto cobra el chofer');

  const isPassengerPrivacyQuery =
    (norm.includes('pasajero') || norm.includes('pasajeros') || norm.includes('cliente') || norm.includes('clientes')) &&
    (norm.includes('lista') || norm.includes('datos') || norm.includes('dni') || norm.includes('telefono') || norm.includes('quienes van') || norm.includes('quien viaja'));

  const isAdminPanelQuery =
    norm.includes('administrador') || norm.includes('panel admin') || norm.includes('protegid') ||
    norm.includes('clave admin') || norm.includes('acceso admin') || norm.includes('base de datos');

  if (isOperatingCostQuery || isProfitOrFinancialQuery || isStaffQuery || isPassengerPrivacyQuery || isAdminPanelQuery) {
    return {
      message: 'Esa información corresponde a la gestión operativa interna y es estrictamente confidencial de la administración de la empresa. Como pasajero y cliente, puedo ayudarte con gusto con toda la información sobre nuestros viajes disponibles, fechas confirmadas, tarifas oficiales al público, itinerarios y el proceso para reservar tus lugares. ¿Te gustaría consultar sobre algún destino o fecha en particular?',
      action: allTours.length > 0 ? 'showTours' : 'none',
      tourIds: allTours.slice(0, 2).map(t => t.id),
    };
  }

  // 2. CONSULTAS POR FECHA MÁS CERCANA / PRÓXIMA SALIDA / CUÁL SALE PRIMERO
  if (allTours.length > 0 && isNearestDateQuery(norm)) {
    const sortedByDate = [...allTours].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const earliestIso = new Date(sortedByDate[0].date).toISOString().slice(0, 10);
    const sameDateTours = sortedByDate.filter(t => new Date(t.date).toISOString().slice(0, 10) === earliestIso);

    const earliestDateFormatted = new Date(sortedByDate[0].date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (sameDateTours.length === 1) {
      const tour = sameDateTours[0];
      const p = tour.currency === 'USD' ? `USD $${tour.price.toLocaleString()}` : `$${tour.price.toLocaleString()} ARS`;
      return {
        message: `La salida confirmada más próxima es **${tour.destination}** para el **${earliestDateFormatted}**.\n\n` +
          `💰 **Tarifa oficial:** ${p} por persona\n` +
          `${tour.departureTime ? `⏰ **Horario:** Salida ${tour.departureTime}\n` : ''}` +
          `${tour.departurePoint ? `📍 **Punto de embarque:** ${tour.departurePoint}\n` : ''}` +
          `${tour.availableSeats !== undefined ? `💺 **Cupos disponibles:** ${tour.availableSeats > 0 ? `${tour.availableSeats} lugares` : 'Últimos lugares'}\n` : ''}` +
          `\nPodés ver toda la información y asegurar tu lugar en la tarjeta a continuación:`,
        action: 'showTours',
        tourIds: [tour.id],
      };
    } else {
      const tourList = sameDateTours.map((t, idx) => {
        const p = t.currency === 'USD' ? `USD $${t.price.toLocaleString()}` : `$${t.price.toLocaleString()} ARS`;
        return `${idx + 1}️⃣ **${t.destination}**: ${p} por persona${t.departureTime ? ` (Salida: ${t.departureTime})` : ''}`;
      }).join('\n');

      return {
        message: `Nuestras salidas confirmadas más próximas son para el **${earliestDateFormatted}**. Para esa fecha tenemos **${sameDateTours.length} opciones confirmadas**:\n\n${tourList}\n\n¿Te gustaría reservar tu lugar en alguno de ellos? Acá tenés las tarjetas de esa fecha:`,
        action: 'showTours',
        tourIds: sameDateTours.map(t => t.id),
      };
    }
  }

  // 3. CONSULTAS POR SALIDA MÁS LEJANA / ÚLTIMO VIAJE PROGRAMADO
  if (allTours.length > 0 && isFurthestDateQuery(norm)) {
    const sortedByDateDesc = [...allTours].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const furthest = sortedByDateDesc[0];
    const dateFormatted = new Date(furthest.date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const p = furthest.currency === 'USD' ? `USD $${furthest.price.toLocaleString()}` : `$${furthest.price.toLocaleString()} ARS`;

    return {
      message: `El viaje programado más adelante en nuestro calendario es **${furthest.destination}** con salida el **${dateFormatted}** por **${p}** por persona.\n\nPodés consultar el itinerario y reservar con anticipación:`,
      action: 'showTours',
      tourIds: [furthest.id],
    };
  }

  // 4. CONSULTAS DE PRESUPUESTO CON MONTO ESPECÍFICO (ej. "tengo 100 mil", "menos de 90.000", o número tras pregunta)
  const budgetAmount = extractBudgetNumber(norm);
  if (budgetAmount !== null && allTours.length > 0) {
    const affordable = allTours.filter(t => t.price <= budgetAmount);
    if (affordable.length > 0) {
      const sortedAffordable = [...affordable].sort((a, b) => a.price - b.price);
      const listStr = sortedAffordable.map(t => {
        const p = t.currency === 'USD' ? `USD $${t.price.toLocaleString()}` : `$${t.price.toLocaleString()} ARS`;
        const d = new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' });
        return `• **${t.destination}**: ${p} (Salida: ${d})`;
      }).join('\n');

      return {
        message: `Con tu presupuesto de **$${budgetAmount.toLocaleString()} ARS**, podés acceder a ${affordable.length === 1 ? 'la siguiente salida confirmada' : `las siguientes ${affordable.length} salidas confirmadas`}:\n\n${listStr}\n\nPodés ver la información completa y reservar directamente en las tarjetas a continuación:`,
        action: 'showTours',
        tourIds: sortedAffordable.map(t => t.id),
      };
    } else {
      const sorted = [...allTours].sort((a, b) => a.price - b.price);
      const cheapest = sorted[0];
      return {
        message: `Nuestras tarifas confirmadas inician a partir de **${cheapest.currency === 'USD' ? 'USD $' : '$'}${cheapest.price.toLocaleString()} ARS** (${cheapest.destination}). Te muestro las opciones más accesibles para que puedas evaluarlas:`,
        action: 'showTours',
        tourIds: sorted.slice(0, 2).map(t => t.id),
      };
    }
  }

  // 5. CONSULTA DE PRESUPUESTO ABIERTO (sin especificar monto: "tengo un presupuesto", "según mi presupuesto", "tarifas")
  if (
    norm.includes('presupuesto') || norm.includes('cuanto dinero') ||
    norm.includes('cuanto cuesta viajar') || norm.includes('rango de precio') ||
    norm.includes('tarifas') || norm.includes('precios')
  ) {
    if (allTours.length > 0) {
      const sortedByPrice = [...allTours].sort((a, b) => a.price - b.price);
      const minTour = sortedByPrice[0];
      const maxTour = sortedByPrice[sortedByPrice.length - 1];

      return {
        message: `¡Contamos con opciones adaptadas a distintos presupuestos! Nuestras tarifas oficiales van desde **$${minTour.price.toLocaleString()} ARS** (${minTour.destination}) hasta **$${maxTour.price.toLocaleString()} ARS** (${maxTour.destination}).\n\n` +
          `¿De cuánto es tu presupuesto aproximado para recomendarte el viaje ideal?\n\n` +
          `Mientras tanto, acá tenés los viajes ordenados desde el más accesible:`,
        action: 'showTours',
        tourIds: sortedByPrice.map(t => t.id),
      };
    }
  }

  // 6. EL MÁS BARATO / OPCIÓN MÁS ECONÓMICA
  const isCheapestQuery =
    norm.includes('mas barato') || norm.includes('el mas barato') ||
    norm.includes('mas economico') || norm.includes('el mas economico') ||
    norm.includes('menor precio') || norm.includes('mas accesible') ||
    norm.includes('opcion mas barata') || norm.includes('el mas en cuenta') ||
    norm.includes('viaje mas barato') || norm.includes('baratos') || norm.includes('economicos');

  if (allTours.length > 0 && isCheapestQuery) {
    const sorted = [...allTours].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    const dateFormatted = new Date(cheapest.date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const priceFormatted = cheapest.currency === 'USD'
      ? `USD $${cheapest.price.toLocaleString()}`
      : `$${cheapest.price.toLocaleString()} ARS`;

    return {
      message: `Nuestra opción más accesible y económica es **${cheapest.destination}** por **${priceFormatted}** por persona, con salida confirmada el **${dateFormatted}**.\n\n` +
        `${cheapest.description ? `📝 *${cheapest.description.slice(0, 160)}...*\n\n` : ''}` +
        `Podés asegurar tu asiento abonando una seña o el total directamente desde la tarjeta a continuación:`,
      action: 'showTours',
      tourIds: [cheapest.id],
    };
  }

  // 7. EL MÁS CARO / OPCIÓN MÁS COMPLETA / PREMIUM
  const isPriciestQuery =
    norm.includes('mas caro') || norm.includes('el mas caro') ||
    norm.includes('mayor precio') || norm.includes('mas completo') ||
    norm.includes('mas exclusivo');

  if (allTours.length > 0 && isPriciestQuery) {
    const sorted = [...allTours].sort((a, b) => b.price - a.price);
    const priciest = sorted[0];
    const dateFormatted = new Date(priciest.date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const priceFormatted = priciest.currency === 'USD'
      ? `USD $${priciest.price.toLocaleString()}`
      : `$${priciest.price.toLocaleString()} ARS`;

    return {
      message: `El viaje más completo de nuestro catálogo es **${priciest.destination}** por **${priceFormatted}**, con salida programada para el **${dateFormatted}**.\n\n` +
        `${priciest.description ? `📝 *${priciest.description.slice(0, 180)}...*\n\n` : ''}` +
        `Podés ver el itinerario completo y reservar directamente en la tarjeta:`,
      action: 'showTours',
      tourIds: [priciest.id],
    };
  }

  // 8. CONSULTAS SOBRE RESERVAS, SEÑAS Y FORMAS DE PAGO (Atención al cliente)
  const BOOKING_KEYWORDS = [
    'como reservo', 'como reservar', 'como se reserva', 'como hago para reservar',
    'pasos para reservar', 'como pago', 'como pagar', 'formas de pago', 'metodos de pago',
    'medio de pago', 'seña', 'sena', 'congelar precio', 'transferencia', 'tarjeta',
    'como anotarme', 'como anotarse', 'reservar un lugar', 'como comprar', 'puedo senar',
    'cuanto es la sena', 'cuanto es la seña'
  ];

  if (BOOKING_KEYWORDS.some(kw => norm.includes(kw))) {
    return {
      message: '¡Reservar tu viaje con **YO TE LLEVO** es muy simple y seguro! Estos son los pasos para asegurar tu lugar:\n\n' +
        '1️⃣ **Elegí tu viaje:** En la tarjeta del destino que prefieras, hacé clic en **"Reservar"**.\n' +
        '2️⃣ **Cargá los pasajeros:** Indicá nombre, DNI y seleccioná el punto de subida/embarque más cómodo para vos.\n' +
        '3️⃣ **Asegurá tu lugar:** Podés abonar la seña para congelar la tarifa y tu asiento, o abonar el monto total mediante transferencia u otros medios habilitados.\n' +
        '4️⃣ **Confirmación al instante:** Una vez verificado el pago, tu reserva queda confirmada y recibís tu voucher de viaje.\n\n' +
        '¡Mirá las salidas confirmadas que tenemos disponibles para reservar!',
      action: allTours.length > 0 ? 'showTours' : 'none',
      tourIds: allTours.slice(0, 3).map(t => t.id),
    };
  }

  // 9. CONSULTAS SOBRE POLÍTICA DE CANCELACIÓN O QUÉ INCLUYE
  if (norm.includes('cancelacion') || norm.includes('cancelar') || norm.includes('reembolso') || norm.includes('devolucion')) {
    return {
      message: 'Nuestras políticas de cancelación y reprogramación están diseñadas para proteger la reserva de cada pasajero. Cada viaje cuenta con sus condiciones específicas detalladas en su ficha (plazos de aviso previo y porcentaje reintegrable según anticipación). En caso de dudas particulares sobre un viaje o motivo de fuerza mayor, podés consultar las condiciones antes de reservar o comunicarte con nuestro equipo.',
      action: allTours.length > 0 ? 'showTours' : 'none',
      tourIds: allTours.slice(0, 3).map(t => t.id),
    };
  }

  if (norm.includes('que incluye') || norm.includes('incluye comida') || norm.includes('incluye hotel') || norm.includes('servicios incluidos')) {
    return {
      message: 'Nuestros paquetes turísticos generalmente incluyen:\n\n' +
        '🚌 **Transporte:** Ida y vuelta en unidades confortables de larga distancia con aire acondicionado y calefacción.\n' +
        '👨‍✈️ **Coordinación permanente:** Acompañamiento del equipo de YO TE LLEVO durante todo el recorrido.\n' +
        '🏨 **Alojamiento y actividades:** Según el itinerario especificado en cada viaje (noches de hotel, excursiones o visitas guiadas).\n\n' +
        'En la tarjeta de cada viaje podés ver en detalle todos los servicios específicos incluidos.',
      action: allTours.length > 0 ? 'showTours' : 'none',
      tourIds: allTours.slice(0, 3).map(t => t.id),
    };
  }

  // 10. BÚSQUEDA ESPECÍFICA POR DESTINO SOLICITADO
  if (allTours.length > 0) {
    const matchedTours = allTours.filter(tour => {
      const destNorm = normalizeText(tour.destination);
      if (norm.includes(destNorm) || destNorm.includes(norm)) return true;

      // Palabras del destino de al menos 4 caracteres (evitando conectores comunes)
      const stopWords = ['para', 'desde', 'hacia', 'este', 'oeste', 'norte', 'traslado', 'visita'];
      const destTokens = destNorm
        .split(/[^a-z0-9]+/)
        .filter(t => t.length >= 4 && !stopWords.includes(t));

      return destTokens.some(token => norm.includes(token));
    });

    if (matchedTours.length > 0) {
      const primary = matchedTours[0];
      const dateFormatted = new Date(primary.date).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const priceFormatted = primary.currency === 'USD'
        ? `USD $${primary.price.toLocaleString()}`
        : `$${primary.price.toLocaleString()} ARS`;

      let msg = `¡Sí! Tenemos salida confirmada para **${primary.destination}**.\n\n` +
        `📅 **Fecha de salida:** ${dateFormatted}\n` +
        `💰 **Tarifa oficial:** ${priceFormatted} por persona\n`;

      if (primary.days || primary.nights) {
        msg += `⏱️ **Duración:** ${[primary.days ? `${primary.days} días` : null, primary.nights ? `${primary.nights} noches` : null].filter(Boolean).join(' / ')}\n`;
      }
      if (primary.departureTime) {
        msg += `⏰ **Horario de salida:** ${primary.departureTime}\n`;
      }
      if (primary.departurePoint) {
        msg += `📍 **Punto de embarque:** ${primary.departurePoint}\n`;
      }
      if (primary.availableSeats !== undefined) {
        msg += `💺 **Disponibilidad:** ${primary.availableSeats > 0 ? `${primary.availableSeats} lugares disponibles` : 'Cupos limitados'}\n`;
      }
      if (primary.description) {
        msg += `\n📝 ${primary.description.slice(0, 180)}${primary.description.length > 180 ? '...' : ''}\n`;
      }
      msg += `\nPodés consultar el itinerario completo y asegurar tu lugar directamente en la tarjeta:`;

      return {
        message: msg,
        action: 'showTours',
        tourIds: matchedTours.map(t => t.id),
      };
    }

    // Si el usuario preguntó por un destino que NO está en el catálogo actual
    const DESTINATION_QUERY_INDICATORS = [
      'viaje a', 'viajes a', 'salidas a', 'van a', 'ir a', 'escapada a', 'tienen a',
      'tienen para', 'hay viaje a', 'hay salidas a', 'destino', 'bariloche', 'cataratas',
      'iguazu', 'mendoza', 'cordoba', 'salta', 'jujuy', 'mar del plata', 'merlo',
      'tandil', 'colon', 'federacion', 'termas', 'san rafael', 'cancun', 'brasil',
      'ushuaia', 'calafate', 'madryn'
    ];

    if (DESTINATION_QUERY_INDICATORS.some(ind => norm.includes(ind))) {
      return {
        message: 'Por el momento no tenemos salidas confirmadas o públicas para ese destino en particular. Sin embargo, tenemos excelentes viajes con cupos abiertos y tarifas promocionales para las próximas fechas. ¡Te comparto nuestras opciones confirmadas para viajar!',
        action: 'showTours',
        tourIds: allTours.slice(0, 3).map(t => t.id),
      };
    }
  }

  // 11. BÚSQUEDA POR FECHA O MES ESPECÍFICO
  const MONTHS = [
    { name: 'enero', idx: 0 }, { name: 'febrero', idx: 1 }, { name: 'marzo', idx: 2 },
    { name: 'abril', idx: 3 }, { name: 'mayo', idx: 4 }, { name: 'junio', idx: 5 },
    { name: 'julio', idx: 6 }, { name: 'agosto', idx: 7 }, { name: 'septiembre', idx: 8 },
    { name: 'octubre', idx: 9 }, { name: 'noviembre', idx: 10 }, { name: 'diciembre', idx: 11 },
  ];

  const matchedMonth = MONTHS.find(m => norm.includes(m.name));
  if (matchedMonth && allTours.length > 0) {
    const monthTours = allTours.filter(t => new Date(t.date).getMonth() === matchedMonth.idx);
    if (monthTours.length > 0) {
      return {
        message: `Para el mes de **${matchedMonth.name}** tenemos las siguientes salidas programadas:`,
        action: 'showTours',
        tourIds: monthTours.map(t => t.id),
      };
    } else {
      return {
        message: `Actualmente no tenemos salidas programadas para el mes de **${matchedMonth.name}**, pero podés consultar nuestras próximas fechas confirmadas:`,
        action: 'showTours',
        tourIds: allTours.slice(0, 2).map(t => t.id),
      };
    }
  }

  // 12. CONSULTA DE CLIMA
  if (norm.includes('clima') || norm.includes('tiempo') || norm.includes('temperatura') || norm.includes('pronostico')) {
    const firstTour = allTours[0];
    const destinationCity = firstTour?.destination?.split('+')[0]?.trim() || 'Buenos Aires';
    return {
      message: `Te comparto el estado del tiempo para viajar:`,
      action: 'showWeather',
      weatherDestination: destinationCity,
    };
  }

  // 13. COMPARAR VIAJES
  if (norm.includes('comparar') || norm.includes('diferencia') || norm.includes('cual me conviene') || norm.includes('cual es mejor')) {
    return {
      message: allTours.length >= 2
        ? `Acá tenés una comparativa directa entre nuestras principales opciones: **${allTours[0].destination}** y **${allTours[1].destination}**:`
        : 'Acá tenés las opciones disponibles para evaluar:',
      action: allTours.length >= 2 ? 'showComparison' : 'showTours',
      tourIds: allTours.slice(0, 2).map(t => t.id),
    };
  }

  // 14. CANALES DE CONTACTO / ATENCIÓN
  if (
    norm.includes('contacto') || norm.includes('telefono') || norm.includes('whatsapp') ||
    norm.includes('donde estan') || norm.includes('direccion') || norm.includes('oficina') ||
    norm.includes('horario') || norm.includes('redes') || norm.includes('instagram')
  ) {
    return {
      message: '¡Con gusto! Podés comunicarte directamente con nuestro equipo de atención al viajero por cualquiera de nuestros canales oficiales:',
      action: 'showContact',
    };
  }

  // 15. DESTACADOS / RECOMENDADOS
  if (norm.includes('destacado') || norm.includes('recomend') || norm.includes('imperdible') || norm.includes('popular')) {
    const feat = allTours.filter(t => t.isFeatured);
    return {
      message: '¡Excelente! Estos son nuestros viajes más recomendados para viajar próximamente:',
      action: 'showTours',
      tourIds: (feat.length > 0 ? feat : allTours.slice(0, 2)).map(t => t.id),
    };
  }

  // 16. TODOS LOS VIAJES / CATÁLOGO COMPLETO
  if (norm.includes('todos') || norm.includes('catalogo') || norm.includes('que viajes tienen') || norm.includes('cuales son los viajes')) {
    return {
      message: `Actualmente disponemos de **${allTours.length} salidas confirmadas** con cupos abiertos. Podés consultar por cualquiera de ellos para ver itinerario, horarios y disponibilidad:`,
      action: 'showTours',
      tourIds: allTours.map(t => t.id),
    };
  }

  // 17. SALUDO INICIAL O CONSULTA GENERAL
  const greeting = userContext?.name ? `¡Hola ${userContext.name}! 👋` : '¡Hola! 👋';
  return {
    message: `${greeting} Soy tu asistente de viajes de **YO TE LLEVO**.\n\nPuedo ayudarte a buscar por **destino**, ver la **fecha más cercana**, recomendarte según tu **presupuesto**, ver qué incluye cada viaje o guiarte para reservar. ¿Por dónde empezamos?`,
    action: allTours.length > 0 ? 'showTours' : 'none',
    tourIds: allTours.slice(0, 3).map(t => t.id),
  };
}

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
            t.availableSeats ? `${t.availableSeats} lugares disponibles` : null,
            t.isFeatured ? 'DESTACADO' : null,
            t.departureTime ? `Salida: ${t.departureTime}` : null,
            t.departurePoint ? `Embarque: ${t.departurePoint}` : null,
            t.tags && t.tags.length > 0 ? `Tags: ${t.tags.join(',')}` : null,
          ].filter(Boolean).join(' | ');
          const descSnippet = t.description ? `\n  Detalles: ${t.description.slice(0, 150)}${t.description.length > 150 ? '...' : ''}` : '';
          const cancelSnippet = t.cancellationPolicy ? `\n  Cancelación: ${t.cancellationPolicy.slice(0, 100)}` : '';
          return `• ${t.destination} — ${dateStr} — Tarifa público: ${price} — ID: ${t.id}${extras ? ` [${extras}]` : ''}${descSnippet}${cancelSnippet}`;
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

    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || '' }],
    }));

    let text = '';
    let parsed: any = { message: '', action: 'none' };
    const apiKey = getValidGeminiApiKey();

    if (apiKey) {
      try {
        const client = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        text = response.text || '';
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else parsed = { message: text, action: 'none' };
      } catch {
        // Fallback silencioso al motor inteligente de viajes
      }
    }

    // Respuesta inteligente para el cliente si no hay API key o si el modelo no devolvió JSON
    if (!parsed.message) {
      parsed = generateClientAssistantResponse(messages, allTours, contactInfo, userContext);
    }

    // Obtener tours a mostrar (preservando el orden exacto de tourIds devuelto)
    let tours = null;
    const isComparison = parsed.action === 'showComparison';

    if (Array.isArray(parsed.tourIds) && parsed.tourIds.length > 0) {
      tours = parsed.tourIds
        .map(id => allTours.find(t => t.id === id))
        .filter((t): t is TourData => Boolean(t));
    }

    // Fallback por nombre de destino SOLO si tourIds no vino y action es showTours
    if ((!tours || tours.length === 0) && !isComparison && parsed.message && parsed.action === 'showTours') {
      const msgLower = parsed.message.toLowerCase();
      const byName = allTours.filter(t => msgLower.includes(t.destination.toLowerCase().trim()));
      if (byName.length > 0) tours = byName;
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

    const finalMessage = sanitizeAssistantResponse(parsed.message || text);

    return NextResponse.json({
      message: finalMessage,
      tours,
      links,
      weather,
      isComparison,
      success: true,
    });

  } catch (error: any) {
    console.error('[Chat API Error]:', error?.message || error);
    return NextResponse.json({ 
      error: 'Error al procesar tu mensaje. Por favor, intentá de nuevo.', 
      details: error?.message || String(error),
      success: false 
    }, { status: 500 });
  }
}
