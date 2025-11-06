
import { getDoc, doc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from './firebase';
import type { ActionType } from "./chatbot-flow";
import { getChatbotNode } from "./firestore-services";

export interface ChatbotNode {
  id: string;
  message: string;
  options: {
    text: string;
    next: string;
    action?: ActionType;
    actionContext?: any; // To pass parameters to actions
    requiresAuth?: boolean;
    isExternalLink?: boolean;
  }[];
  isUserInput?: boolean;
  action?: ActionType;
}

const initialChatbotFlow: Record<string, ChatbotNode> = {
  inicio: {
    id: "inicio",
    message: "¡Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?",
    options: [
      { text: "✈️ Ver Viajes", next: "menu_viajes" },
      { text: "👤 Mi Cuenta", next: "menu_cuenta", requiresAuth: true },
      { text: "📝 Registrarse", next: "acerca_registro" },
      { text: "❓ Preguntas Frecuentes", next: "menu_faq" },
    ],
  },
  acerca_registro: {
    id: "acerca_registro",
    message: "¡Registrarse es una gran idea! Al crear una cuenta, tus datos se guardan para que tus futuras reservas sean mucho más rápidas. Además, podrás ver tu historial de viajes. ¿Quieres registrarte ahora?",
    options: [
        { text: "Sí, ¡vamos a registrarnos!", next: "/login?mode=register", isExternalLink: true },
        { text: "No, solo quiero explorar", next: "inicio" },
    ]
  },
  menu_faq: {
    id: "menu_faq",
    message: "Claro, aquí tienes algunas preguntas frecuentes. ¿Sobre qué quieres saber?",
    options: [
        { text: "🎟️ ¿Cómo se reserva?", next: "resultado_faq", action: 'getFaqAnswer', actionContext: 'how_to_book' },
        { text: "💳 Métodos de Pago", next: "resultado_faq", action: 'getFaqAnswer', actionContext: 'payment_methods' },
        { text: "🧳 ¿Qué incluye el viaje?", next: "resultado_faq", action: 'getFaqAnswer', actionContext: 'what_is_included' },
        { text: "🚫 Política de Cancelación", next: "resultado_faq", action: 'getFaqAnswer', actionContext: 'cancellation_policy' },
        { text: "🏢 Sobre Nosotros", next: "resultado_faq", action: 'getFaqAnswer', actionContext: 'about_us' },
        { text: "📞 Contacto Directo", next: "info_contacto", action: 'fetchContactInfo' },
        { text: "⬅️ Volver", next: "inicio" },
    ]
  },
  resultado_faq: {
    id: "resultado_faq",
    message: "Aquí tienes la información:", // This message will be replaced by the action's response
    options: [
        { text: "Ver otras preguntas", next: "menu_faq" },
        { text: "Gracias, volver al inicio", next: "inicio" },
    ],
  },
  info_contacto: {
    id: "info_contacto",
    message: "¡Claro! Puedes contactarnos a través de nuestra página de contacto o por nuestras redes sociales.",
    options: [
      { text: "Ir a la Página de Contacto", next: "/contact", isExternalLink: true },
      { text: "⬅️ Volver", next: "menu_faq" },
    ],
  },
  fallback_info_contacto: {
      id: "fallback_info_contacto",
      message: "No pude obtener la información de contacto, pero puedes encontrarla aquí:",
      options: [
        { text: "Ir a la Página de Contacto", next: "/contact", isExternalLink: true },
        { text: "⬅️ Volver", next: "menu_faq" },
      ]
  },
  menu_viajes: {
    id: "menu_viajes",
    message: "¡Excelente! ¿Cómo quieres buscar tu próximo viaje?",
    options: [
      { text: "⭐ Destacados", next: "resultado_viajes", action: 'fetchFeaturedTours' },
      { text: "🗺️ Ver Catálogo Completo", next: "resultado_viajes", action: 'fetchAllTours' },
      { text: "🔎 Buscar por temática", next: "seleccion_tematica", action: 'fetchAvailableTags' },
      { text: "⬅️ Volver", next: "inicio" },
    ],
  },
  seleccion_tematica: {
      id: "seleccion_tematica",
      message: "Selecciona una o más temáticas de tu interés y luego presiona 'Buscar'.",
      options: [
      ]
  },
  resultado_viajes: {
    id: "resultado_viajes",
    message: "Aquí tienes. Puedes hacer clic en 'Reservar' o pedirme más detalles de un viaje.",
    options: [
        { text: "Buscar de nuevo", next: "menu_viajes" },
        { text: "Volver al inicio", next: "inicio" },
    ],
  },
   resultado_detalles_viaje: {
    id: "resultado_detalles_viaje",
    message: "Aquí tienes los detalles del viaje:",
    options: [
        { text: "Hacer Pre-reserva", next: "inicio_pre_reserva" },
        { text: "Reservar en la web", next: "", isExternalLink: true }, // The 'next' will be populated dynamically
        { text: "Ver otros viajes", next: "menu_viajes" },
        { text: "Volver al inicio", next: "inicio" },
    ]
  },
  inicio_pre_reserva: {
    id: 'inicio_pre_reserva',
    message: '¡Genial! Empecemos tu pre-reserva. Primero, ¿cuántas personas van a viajar en total (incluyéndote a ti)?',
    isUserInput: true,
    action: 'askForChildren',
    options: [],
  },
  pre_reserva_ninos: {
    id: 'pre_reserva_ninos',
    message: 'Entendido. De ese total, ¿cuántos son niños (menores de 12 años)? Si no hay niños, escribe 0.',
    isUserInput: true,
    action: 'calculatePrebookingPrice',
    options: [],
  },
  pre_reserva_confirmar: {
      id: 'pre_reserva_confirmar',
      message: 'El precio se ha calculado. ¿Continuamos a la página de reserva para cargar los datos?',
      options: [
      ]
  },
  menu_cuenta: {
    id: "menu_cuenta",
    message: "Estás en tu cuenta. ¿Qué información quieres consultar?",
    options: [
      { text: "✈️ Mis Próximos Viajes", next: "resultado_reservas_activas", action: 'fetchActiveReservations', requiresAuth: true },
      { text: "👤 Mis Datos Personales", next: "resultado_info_pasajero", action: 'fetchPassengerByDNI', requiresAuth: true },
      { text: "👨‍👩‍👧‍👦 Mi Grupo Familiar", next: "resultado_grupo_familiar", action: 'fetchFamilyGroup', requiresAuth: true },
      { text: "⬅️ Volver", next: "inicio" },
    ],
  },
  resultado_reservas_activas: {
    id: "resultado_reservas_activas",
    message: "Estos son tus próximos viajes. Selecciona uno para ver más detalles.",
    options: [
      { text: "⬅️ Volver a mi cuenta", next: "menu_cuenta" },
    ],
  },
  menu_detalles_reserva: {
      id: "menu_detalles_reserva",
      message: "Perfecto. ¿Qué quieres saber sobre este viaje?",
      options: [
          { text: "💳 Estado de mis pagos", next: "resultado_estado_pago", action: "fetchPaymentStatus" },
          { text: "🎟️ Ver mi pase de abordo", next: "resultado_pase_abordo", action: "fetchBoardingPass" },
          { text: "⬅️ Ver otros viajes", next: "resultado_reservas_activas", action: 'fetchActiveReservations', requiresAuth: true },
      ]
  },
  resultado_estado_pago: {
      id: "resultado_estado_pago",
      message: "Aquí tienes el detalle de tus pagos:",
      options: [
          { text: "Ver mi pase de abordo", next: "resultado_pase_abordo", action: "fetchBoardingPass" },
          { text: "⬅️ Volver a los detalles", next: "menu_detalles_reserva" },
      ]
  },
  resultado_pase_abordo: {
      id: "resultado_pase_abordo",
      message: "Este es un resumen de tu pase de abordo. ¡No olvides tu DNI!",
      options: [
          { text: "Ver estado de mis pagos", next: "resultado_estado_pago", action: "fetchPaymentStatus" },
          { text: "⬅️ Volver a los detalles", next: "menu_detalles_reserva" },
      ]
  },
  resultado_info_pasajero: {
    id: "resultado_info_pasajero",
    message: "Estos son los datos que tenemos registrados:",
    options: [
        { text: "Ver mis próximos viajes", next: "resultado_reservas_activas", action: 'fetchActiveReservations', requiresAuth: true },
        { text: "⬅️ Volver", next: "menu_cuenta" },
    ],
  },
   resultado_grupo_familiar: {
    id: "resultado_grupo_familiar",
    message: "Estos son los integrantes de tu grupo:",
    options: [
        { text: "Ver mis próximos viajes", next: "resultado_reservas_activas", action: 'fetchActiveReservations', requiresAuth: true },
        { text: "⬅️ Volver", next: "menu_cuenta" },
    ],
  },
  menu_admin: {
    id: "menu_admin",
    message: "Panel de Administrador. ¿Qué deseas hacer?",
    options: [
      { text: "Buscar Pasajero por DNI", next: "input_dni_admin" },
      { text: "Estado de un Viaje", next: "input_viaje_admin" },
      { text: "⬅️ Volver", next: "inicio" },
    ],
  },
  input_viaje_admin: {
      id: "input_viaje_admin",
      message: "Ingresa el nombre del destino para ver su estado.",
      isUserInput: true,
      action: 'getTripStatus',
      options: [],
  },
  input_dni_admin: {
    id: "input_dni_admin",
    message: "Por favor, ingresa el número de DNI para buscar la información del pasajero.",
    options: [],
    isUserInput: true,
    action: 'fetchPassengerByDNI',
  },
  dni_no_encontrado: {
    id: "dni_no_encontrado",
    message: "No encontré un pasajero con ese DNI. ¿Quieres intentar con otro?",
    options: [
        { text: "Buscar de nuevo", next: "input_dni_admin" },
        { text: "⬅️ Volver", next: "inicio" },
    ]
  }
};

/**
 * Seeds the initial chatbot flow data into Firestore if it doesn't exist.
 */
async function seedChatbotFlow() {
    const chatbotFlowsCol = collection(db, 'chatbot_flows');
    const snapshot = await getDocs(chatbotFlowsCol);
    if (snapshot.empty) {
        console.log("Chatbot flow not found in Firestore, seeding initial data...");
        const batch = writeBatch(db);
        Object.entries(initialChatbotFlow).forEach(([id, nodeData]) => {
            const docRef = doc(db, 'chatbot_flows', id);
            batch.set(docRef, nodeData);
        });
        await batch.commit();
        console.log("Chatbot flow seeded successfully.");
    }
}

// Call this once, maybe during app initialization or first time the bot is opened.
// A good place is inside the getChatbotFlow function itself.
let isSeeding = false;
let hasSeeded = false;

export async function getChatbotFlow(id: string): Promise<ChatbotNode> {
    if (!hasSeeded && !isSeeding) {
        isSeeding = true;
        await seedChatbotFlow();
        isSeeding = false;
        hasSeeded = true;
    }
    
    const node = await getChatbotNode(id);
    if (node) {
        return node;
    }

    console.warn(`Chatbot node "${id}" not found in Firestore. Falling back to default 'inicio' node.`);
    // Fallback to the default start node if a node is not found
    const startNode = await getChatbotNode('inicio');
    return startNode || initialChatbotFlow['inicio'];
}
