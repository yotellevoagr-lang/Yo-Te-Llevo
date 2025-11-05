
import type { ActionType } from "./chatbot-flow";

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

const chatbotFlow: Record<string, ChatbotNode> = {
  start: {
    id: "start",
    message: "¡Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?",
    options: [
      { text: "✈️ Ver Viajes", next: "trips_menu" },
      { text: "👤 Mi Cuenta", next: "account_menu", requiresAuth: true },
      { text: "📝 Registrarse", next: "why_register" },
      { text: "❓ Preguntas Frecuentes", next: "faq_menu" },
    ],
  },
  // --- Ayuda para Registro ---
  why_register: {
    id: "why_register",
    message: "¡Registrarse es una gran idea! Al crear una cuenta, tus datos se guardan para que tus futuras reservas sean mucho más rápidas. Además, podrás ver tu historial de viajes. ¿Quieres registrarte ahora?",
    options: [
        { text: "Sí, ¡vamos a registrarnos!", next: "/login?mode=register", isExternalLink: true },
        { text: "No, solo quiero explorar", next: "start" },
    ]
  },
  // --- Ayuda y Contacto / Preguntas Frecuentes ---
  faq_menu: {
    id: "faq_menu",
    message: "Claro, aquí tienes algunas preguntas frecuentes. ¿Sobre qué quieres saber?",
    options: [
        { text: "🎟️ ¿Cómo se reserva?", next: "faq_result", action: 'getFaqAnswer', actionContext: 'how_to_book' },
        { text: "💳 Métodos de Pago", next: "faq_result", action: 'getFaqAnswer', actionContext: 'payment_methods' },
        { text: "🧳 ¿Qué incluye el viaje?", next: "faq_result", action: 'getFaqAnswer', actionContext: 'what_is_included' },
        { text: "🚫 Política de Cancelación", next: "faq_result", action: 'getFaqAnswer', actionContext: 'cancellation_policy' },
        { text: "🏢 Sobre Nosotros", next: "faq_result", action: 'getFaqAnswer', actionContext: 'about_us' },
        { text: "📞 Contacto Directo", next: "contact_info", action: 'fetchContactInfo' },
        { text: "⬅️ Volver", next: "start" },
    ]
  },
  faq_result: {
    id: "faq_result",
    message: "Aquí tienes la información:", // This message will be replaced by the action's response
    options: [
        { text: "Ver otras preguntas", next: "faq_menu" },
        { text: "Gracias, volver al inicio", next: "start" },
    ],
  },
  contact_info: {
    id: "contact_info",
    message: "¡Claro! Puedes contactarnos a través de nuestra página de contacto o por nuestras redes sociales.",
    options: [
      { text: "Ir a la Página de Contacto", next: "/contact", isExternalLink: true },
      { text: "⬅️ Volver", next: "faq_menu" },
    ],
  },
  contact_info_fallback: {
      id: "contact_info_fallback",
      message: "No pude obtener la información de contacto, pero puedes encontrarla aquí:",
      options: [
        { text: "Ir a la Página de Contacto", next: "/contact", isExternalLink: true },
        { text: "⬅️ Volver", next: "faq_menu" },
      ]
  },
  // --- Viajes ---
  trips_menu: {
    id: "trips_menu",
    message: "¡Excelente! ¿Cómo quieres buscar tu próximo viaje?",
    options: [
      { text: "⭐ Destacados", next: "trips_result", action: 'fetchFeaturedTours' },
      { text: "🗺️ Ver Catálogo Completo", next: "trips_result", action: 'fetchAllTours' },
      { text: "🔎 Buscar por temática", next: "tag_selection", action: 'fetchAvailableTags' },
      { text: "⬅️ Volver", next: "start" },
    ],
  },
  tag_selection: {
      id: "tag_selection",
      message: "Selecciona una o más temáticas de tu interés y luego presiona 'Buscar'.",
      options: [
          // Options will be dynamically populated by fetchAvailableTags action.
          // A "Search" button should be dynamically added by the UI when tags are selected.
      ]
  },
  trips_result: {
    id: "trips_result",
    message: "Aquí tienes. Puedes hacer clic en 'Reservar' o pedirme más detalles de un viaje.",
    options: [
        { text: "Buscar de nuevo", next: "trips_menu" },
        { text: "Volver al inicio", next: "start" },
    ],
  },
   trip_details_result: {
    id: "trip_details_result",
    message: "Aquí tienes los detalles del viaje:",
    options: [
        { text: "Hacer Pre-reserva", next: "pre_booking_start" },
        { text: "Reservar en la web", next: "", isExternalLink: true }, // The 'next' will be populated dynamically
        { text: "Ver otros viajes", next: "trips_menu" },
        { text: "Volver al inicio", next: "start" },
    ]
  },
  // --- Flujo de Pre-Reserva ---
  pre_booking_start: {
    id: 'pre_booking_start',
    message: '¡Genial! Empecemos tu pre-reserva. Primero, ¿cuántas personas van a viajar en total (incluyéndote a ti)?',
    isUserInput: true,
    action: 'askForChildren',
    options: [],
  },
  pre_booking_ask_children: {
    id: 'pre_booking_ask_children',
    message: 'Entendido. De ese total, ¿cuántos son niños (menores de 12 años)? Si no hay niños, escribe 0.',
    isUserInput: true,
    action: 'calculatePrebookingPrice',
    options: [],
  },
  pre_booking_confirm: {
      id: 'pre_booking_confirm',
      message: 'El precio se ha calculado. ¿Continuamos a la página de reserva para cargar los datos?',
      options: [
          // Se llena dinámicamente por la acción
      ]
  },
  // --- Cuenta de Usuario (Cliente) ---
  account_menu: {
    id: "account_menu",
    message: "Estás en tu cuenta. ¿Qué información quieres consultar?",
    options: [
      { text: "✈️ Mis Próximos Viajes", next: "active_reservations_result", action: 'fetchActiveReservations', requiresAuth: true },
      { text: "👤 Mis Datos Personales", next: "passenger_info_result", action: 'fetchPassengerByDNI', requiresAuth: true },
      { text: "👨‍👩‍👧‍👦 Mi Grupo Familiar", next: "family_group_result", action: 'fetchFamilyGroup', requiresAuth: true },
      { text: "⬅️ Volver", next: "start" },
    ],
  },
  active_reservations_result: {
    id: "active_reservations_result",
    message: "Estos son tus próximos viajes. Selecciona uno para ver más detalles.",
    options: [
      // Options will be dynamically populated by the action
      { text: "⬅️ Volver a mi cuenta", next: "account_menu" },
    ],
  },
  reservation_details_menu: {
      id: "reservation_details_menu",
      message: "Perfecto. ¿Qué quieres saber sobre este viaje?",
      options: [
          { text: "💳 Estado de mis pagos", next: "payment_status_result", action: "fetchPaymentStatus" },
          { text: "🎟️ Ver mi pase de abordo", next: "boarding_pass_result", action: "fetchBoardingPass" },
          { text: "⬅️ Ver otros viajes", next: "active_reservations_result", action: 'fetchActiveReservations', requiresAuth: true },
      ]
  },
  payment_status_result: {
      id: "payment_status_result",
      message: "Aquí tienes el detalle de tus pagos:",
      options: [
          { text: "Ver mi pase de abordo", next: "boarding_pass_result", action: "fetchBoardingPass" },
          { text: "⬅️ Volver a los detalles", next: "reservation_details_menu" },
      ]
  },
  boarding_pass_result: {
      id: "boarding_pass_result",
      message: "Este es un resumen de tu pase de abordo. ¡No olvides tu DNI!",
      options: [
          { text: "Ver estado de mis pagos", next: "payment_status_result", action: "fetchPaymentStatus" },
          { text: "⬅️ Volver a los detalles", next: "reservation_details_menu" },
      ]
  },
  passenger_info_result: {
    id: "passenger_info_result",
    message: "Estos son los datos que tenemos registrados:",
    options: [
        { text: "Ver mis próximos viajes", next: "active_reservations_result", action: 'fetchActiveReservations', requiresAuth: true },
        { text: "⬅️ Volver", next: "account_menu" },
    ],
  },
   family_group_result: {
    id: "family_group_result",
    message: "Estos son los integrantes de tu grupo:",
    options: [
        { text: "Ver mis próximos viajes", next: "active_reservations_result", action: 'fetchActiveReservations', requiresAuth: true },
        { text: "⬅️ Volver", next: "account_menu" },
    ],
  },
  // --- Admin ---
  admin_account_menu: {
    id: "admin_account_menu",
    message: "Panel de Administrador. ¿Qué deseas hacer?",
    options: [
      { text: "Buscar Pasajero por DNI", next: "admin_search_dni_input" },
      { text: "Estado de un Viaje", next: "admin_trip_status_input" },
      { text: "⬅️ Volver", next: "start" },
    ],
  },
  admin_trip_status_input: {
      id: "admin_trip_status_input",
      message: "Ingresa el nombre del destino para ver su estado.",
      isUserInput: true,
      action: 'getTripStatus',
      options: [],
  },
  admin_search_dni_input: {
    id: "admin_search_dni_input",
    message: "Por favor, ingresa el número de DNI para buscar la información del pasajero.",
    options: [],
    isUserInput: true,
    action: 'fetchPassengerByDNI',
  },
  dni_not_found: {
    id: "dni_not_found",
    message: "No encontré un pasajero con ese DNI. ¿Quieres intentar con otro?",
    options: [
        { text: "Buscar de nuevo", next: "admin_search_dni_input" },
        { text: "⬅️ Volver", next: "start" },
    ]
  }
};

export function getChatbotFlow(id: string): ChatbotNode {
  return chatbotFlow[id] || chatbotFlow["start"];
};
