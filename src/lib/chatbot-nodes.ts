import type { ActionType } from "./chatbot-flow";

export interface ChatbotNode {
  id: string;
  message: string;
  options: {
    text: string;
    next: string;
    action?: ActionType;
    requiresAuth?: boolean;
    isExternalLink?: boolean; // To open links in a new tab
  }[];
  isUserInput?: boolean;
  action?: ActionType;
}

const chatbotFlow: Record<string, ChatbotNode> = {
  start: {
    id: "start",
    message: "¡Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?",
    options: [
      { text: "✈️ Ver Viajes", next: "trips_menu" },
      { text: "👤 Mi Cuenta", next: "account_menu", requiresAuth: true },
      { text: "❓ Ayuda y Contacto", next: "help_menu" },
    ],
  },
  // --- Ayuda y Contacto ---
  help_menu: {
    id: "help_menu",
    message: "Claro, ¿qué necesitas saber?",
    options: [
        { text: "📞 Datos de Contacto", next: "contact_info" },
        { text: "🎟️ ¿Cómo Reservo?", next: "how_to_book" },
        { text: "💳 Métodos de Pago", next: "payment_methods" },
        { text: "🏢 Sobre Nosotros", next: "about_us" },
        { text: "⬅️ Volver", next: "start" },
    ]
  },
  contact_info: {
    id: "contact_info",
    message: "¡Claro! Puedes contactarnos a través de nuestra página de contacto o por nuestras redes sociales.",
    options: [
      { text: "Ir a la Página de Contacto", next: "/contact", isExternalLink: true },
      { text: "⬅️ Volver", next: "help_menu" },
    ],
  },
  how_to_book: {
    id: "how_to_book",
    message: "Reservar es muy fácil:\n1. Elige el viaje que más te guste.\n2. Haz clic en 'Reservar' y completa los datos de los pasajeros.\n3. Envía la solicitud. Un vendedor se pondrá en contacto contigo por WhatsApp para coordinar el pago y confirmar la reserva.",
    options: [
      { text: "Ver Viajes Disponibles", next: "trips_menu" },
      { text: "⬅️ Volver", next: "help_menu" },
    ],
  },
  payment_methods: {
    id: "payment_methods",
    message: "Una vez que solicitas tu reserva, uno de nuestros vendedores se comunicará contigo para coordinar el pago, que puede ser por transferencia, tarjeta o efectivo.",
    options: [
        { text: "Entendido", next: "help_menu" },
    ],
  },
  about_us: {
    id: "about_us",
    message: "En 'YO TE LLEVO' creemos que viajar es más que visitar un lugar, es vivirlo. Nos especializamos en crear viajes grupales económicos, llenos de buena onda y momentos que recordarás para siempre.",
    options: [
        { text: "¡Genial!", next: "help_menu" },
    ],
  },
  // --- Viajes ---
  trips_menu: {
    id: "trips_menu",
    message: "¡Perfecto! ¿Qué viajes te gustaría ver?",
    options: [
      { text: "⭐ Destacados", next: "trips_result", action: 'fetchFeaturedTours' },
      { text: "🗺️ Ver Todos", next: "trips_result", action: 'fetchAllTours' },
      { text: "⬅️ Volver", next: "start" },
    ],
  },
  trips_result: {
    id: "trips_result",
    message: "Aquí tienes. Puedes hacer clic en 'Reservar' en cualquiera de ellos para empezar.",
    options: [
        { text: "Ver otros viajes", next: "trips_menu" },
        { text: "Volver al inicio", next: "start" },
    ],
  },
  // --- Cuenta de Usuario ---
  account_menu: {
    id: "account_menu",
    message: "Estás en tu cuenta. ¿Qué información quieres consultar?",
    options: [
      { text: "Mis Datos Personales", next: "passenger_info_result", action: 'fetchPassengerByDNI' },
      { text: "Mi Historial de Viajes", next: "passenger_history_result", action: 'fetchPassengerHistory' },
      { text: "Buscar por DNI", next: "reservation_check_dni" },
      { text: "⬅️ Volver", next: "start" },
    ],
  },
  passenger_info_result: {
    id: "passenger_info_result",
    message: "Estos son los datos que tenemos registrados:",
    options: [
        { text: "Ver historial de viajes", next: "passenger_history_result", action: 'fetchPassengerHistory' },
        { text: "⬅️ Volver", next: "account_menu" },
    ],
  },
  passenger_history_result: {
    id: "passenger_history_result",
    message: "Este es tu historial de viajes con nosotros.",
    options: [
        { text: "Ver mis datos", next: "passenger_info_result", action: 'fetchPassengerByDNI' },
        { text: "⬅️ Volver", next: "account_menu" },
    ],
  },
  // --- Búsqueda por DNI ---
  reservation_check_dni: {
    id: "reservation_check_dni",
    message: "Por favor, ingresa el número de DNI para buscar la información del pasajero.",
    options: [
      { text: "Buscar", next: "passenger_info_result" },
      { text: "No encontrado", next: "dni_not_found" }
    ],
    isUserInput: true,
    action: 'fetchPassengerByDNI',
  },
  dni_not_found: {
    id: "dni_not_found",
    message: "No encontré un pasajero con ese DNI. ¿Quieres intentar con otro?",
    options: [
        { text: "Buscar de nuevo", next: "reservation_check_dni" },
        { text: "⬅️ Volver", next: "start" },
    ]
  }
};

export function getChatbotFlow(id: string): ChatbotNode {
  return chatbotFlow[id] || chatbotFlow["start"];
};
