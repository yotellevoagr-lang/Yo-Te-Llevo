
'use server';

import { getAllFromCollection, getDocumentById } from "./firestore-services";
import { getLayoutForType } from './layouts';
import type { Tour, Passenger, Reservation, BoardingPoint, Installment, PaymentMethod, GeneralSettings, ChatbotState } from "./types";
import type { ChatbotNode } from "./chatbot-nodes";

export type ActionType = 
  | 'fetchFeaturedTours' 
  | 'fetchAllTours' 
  | 'fetchPassengerByDNI' 
  | 'fetchFamilyGroup'
  | 'getFaqAnswer'
  | 'fetchTripDetailsByName'
  | 'searchTripsByAttribute'
  | 'fetchActiveReservations'
  | 'fetchPaymentStatus'
  | 'fetchBoardingPass'
  | 'getTripStatus'
  | 'askForChildren'
  | 'calculatePrebookingPrice'
  | 'fetchContactInfo'
  | 'manageTagSelection'
  | 'fetchAvailableTags';

export type ActionResponse = {
  success: boolean;
  message: string;
  data?: any; // Can be a single item or an array
  fallbackNode?: string;
  nodeId?: string; // Can be used to force a specific next node
  options?: ChatbotNode['options']; // To dynamically generate options
  context?: any; // To pass context to the next node
  state?: ChatbotState; // To update the chatbot's state
};

const faqAnswers: Record<string, string> = {
    how_to_book: "Reservar es muy fácil:\n1. Elige el viaje que más te guste.\n2. Haz clic en 'Reservar' y completa los datos de los pasajeros.\n3. Envía la solicitud. Un vendedor se pondrá en contacto contigo por WhatsApp para coordinar el pago y confirmar la reserva.",
    payment_methods: "Una vez que solicitas tu reserva, uno de nuestros vendedores se comunicará contigo para coordinar el pago, que puede ser por transferencia, tarjeta o efectivo.",
    what_is_included: "Generalmente nuestros viajes incluyen transporte, alojamiento y coordinación permanente. Las comidas y excursiones opcionales suelen ser aparte. Te recomendamos hacer clic en cada viaje para ver su descripción y toda la información actualizada.",
    cancellation_policy: "Nuestra política de cancelación puede variar según el viaje. Por favor, consulta los detalles específicos de cada viaje o contacta a un vendedor para más información.",
    about_us: "En 'YO TE LLEVO' creemos que viajar es más que visitar un lugar, es vivirlo. Nos especializamos en crear viajes grupales económicos, llenos de buena onda y momentos que recordarás para siempre."
};

const getDateFromFirestore = (dateField: any): Date => {
    if (!dateField) return new Date();
    if (dateField && typeof dateField.toDate === 'function') {
        return dateField.toDate();
    }
    return new Date(dateField);
}

const serializeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return null;

  if (obj instanceof Date) {
      return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObject(item));
  }
  
  if (typeof obj === 'object' && !obj.constructor.name.includes('Timestamp')) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value && typeof value.toDate === 'function') {
              newObj[key] = value.toDate().toISOString();
          } else if (value !== undefined) {
              newObj[key] = serializeObject(value);
          }
      }
    }
    return newObj;
  }

  return obj;
};

const serializeCollection = <T>(collection: T[]): T[] => {
    return collection.map(item => serializeObject(item));
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export async function executeChatbotAction (action: ActionType, context?: any): Promise<ActionResponse> {
  try {
    switch (action) {
        case 'fetchAvailableTags': {
            const allTours = await getAllFromCollection<Tour>('tours');
            const activePublicTours = allTours.filter(tour => tour.isPublic && getDateFromFirestore(tour.date) >= new Date());
            const usedTags = new Set(activePublicTours.flatMap(tour => tour.tags || []));
            const tagOptions: ChatbotNode['options'] = Array.from(usedTags).map(tag => ({
                text: tag,
                next: 'tag_selection',
                action: 'manageTagSelection',
                actionContext: tag
            }));

            // Add the "Back" option
            tagOptions.push({ text: "⬅️ Volver", next: "trips_menu" });

            return {
                success: true,
                message: "Selecciona una o más temáticas que te interesen y luego presiona 'Buscar'.",
                options: tagOptions
            };
        }
        case 'manageTagSelection': {
            if (!context) return { success: false, message: "Error" };
            const { selectedTags, tag: newTag } = context;
            const updatedTags = selectedTags.includes(newTag)
                ? selectedTags.filter((t: string) => t !== newTag)
                : [...selectedTags, newTag];

            // Re-fetch all available tags to regenerate options
            const allTours = await getAllFromCollection<Tour>('tours');
            const activePublicTours = allTours.filter(tour => tour.isPublic && getDateFromFirestore(tour.date) >= new Date());
            const usedTags = new Set(activePublicTours.flatMap(tour => tour.tags || []));
            const tagOptions: ChatbotNode['options'] = Array.from(usedTags).map(tag => ({
                text: tag,
                next: 'tag_selection',
                action: 'manageTagSelection',
                actionContext: tag
            }));
            tagOptions.push({ text: "⬅️ Volver", next: "trips_menu" });

            return {
                success: true,
                message: "Has actualizado tus filtros. Puedes seguir seleccionando o pulsar 'Buscar'.",
                nodeId: 'tag_selection', // Stay on the same node
                state: { selectedTags: updatedTags },
                options: tagOptions,
            };
        }
        case 'fetchContactInfo': {
            const settings = await getDocumentById<GeneralSettings>('settings', 'general');
            if (settings && settings.contact) {
                return { 
                    success: true, 
                    message: "¡Claro! Aquí tienes nuestra información de contacto:",
                    data: {
                        contactInfo: {
                            phone: settings.contact.phone,
                            email: settings.contact.email,
                        }
                    }
                };
            }
            return { success: false, message: "No pude encontrar la información de contacto. Por favor, visita nuestra página de contacto.", fallbackNode: 'contact_info_fallback' };
        }
        case 'getTripStatus': {
             if (!context) return { success: false, message: "Necesito el nombre de un viaje para darte su estado.", fallbackNode: 'admin_account_menu'};
            const allTours = await getAllFromCollection<Tour>('tours');
            const allReservations = await getAllFromCollection<Reservation>('reservations');
            
            const tour = allTours.find(t => t.destination.toLowerCase().includes(context.toLowerCase()));
            if (!tour) return { success: false, message: `No encontré el viaje "${context}".`};

            let totalCapacity = 0;
            if (tour.transportUnits) {
                for (const unit of tour.transportUnits) {
                    const layout = await getLayoutForType(unit.category, unit.type);
                    if(layout) {
                        const capacity = Object.values(layout.floors).reduce((sum, floor) => {
                            const grid = floor.grid.gridData;
                            return sum + grid.filter(cell => cell.type === 'seat' || cell.type === 'cabin').length;
                        }, 0);
                        totalCapacity += capacity;
                    }
                }
            }

            const occupiedCount = allReservations
                .filter(r => r.tripId === tour.id)
                .reduce((sum, r) => sum + r.paxCount, 0);
            
            const details = `
Estado de: ${tour.destination}
Capacidad Total: ${totalCapacity} pasajeros
Lugares Ocupados: ${occupiedCount}
Lugares Disponibles: ${totalCapacity - occupiedCount}
            `;
            
            return { success: true, message: "Aquí tienes el estado del viaje:", data: { details }};
        }
        case 'askForChildren': {
             if (!context || isNaN(parseInt(context))) {
                return { success: false, message: "Por favor, ingresa un número válido de pasajeros." };
            }
            const paxCount = parseInt(context);
            if (paxCount <= 0) {
                return { success: false, message: "El número de pasajeros debe ser mayor que cero." };
            }
            // Pass the total passenger count to the next step
            return { success: true, message: "", nodeId: 'pre_booking_ask_children', context: { paxCount } };
        }
        case 'calculatePrebookingPrice': {
            if (!context || !context.tripId || !context.paxCount) {
                return { success: false, message: "Faltan datos para calcular el precio." };
            }
            const childCount = isNaN(parseInt(context.userInput)) ? 0 : parseInt(context.userInput);
            if (childCount > context.paxCount) {
                return { success: false, message: "El número de niños no puede ser mayor al total de pasajeros. Por favor, empieza de nuevo.", nodeId: 'pre_booking_start'};
            }

            const tour = await getDocumentById<Tour>('tours', context.tripId);
            if (!tour) return { success: false, message: "No encontré el viaje." };
            
            const adults = context.paxCount - (childCount || 0);
            const childTier = tour.pricingTiers?.find(t => t.name.toLowerCase().includes('niño') || t.name.toLowerCase().includes('menor'));
            const childPrice = childTier ? childTier.price : tour.price;

            const totalPrice = (adults * tour.price) + ((childCount || 0) * childPrice);
            
            const message = `¡Perfecto! Para ${context.paxCount} pasajero(s) (${adults} adultos y ${childCount || 0} niños), el precio base es de ${formatCurrency(totalPrice)}. ¿Quieres continuar y cargar los datos de los pasajeros?`;
            
            const bookingUrl = `/booking/${tour.id}`;
            
            return { success: true, message, nodeId: 'pre_booking_confirm', options: [{ text: "Sí, ir a reservar", next: bookingUrl, isExternalLink: true }, { text: "No, gracias", next: "start" }] };
        }
        case 'fetchActiveReservations': {
            if (!context) return { success: false, message: "Debes iniciar sesión para ver tus viajes.", fallbackNode: 'start' };
            const allReservations = await getAllFromCollection<Reservation>('reservations');
            const userReservations = allReservations.filter(r => r.passengerIds.includes(context));

            if (userReservations.length === 0) {
                return { success: true, message: "Aún no tienes viajes reservados. ¿Quieres ver nuestros destinos?", options: [{ text: "Sí, mostrar viajes", next: "trips_menu" }, { text: "No, gracias", next: "start" }] };
            }

            const allTours = await getAllFromCollection<Tour>('tours');
            const activeReservations = userReservations.filter(res => {
                const tour = allTours.find(t => t.id === res.tripId);
                return tour && getDateFromFirestore(tour.date) >= new Date();
            });

            if (activeReservations.length === 0) {
                return { success: true, message: "No tienes viajes activos próximamente. ¿Quieres ver tu historial o buscar nuevos viajes?", options: [{ text: "Ver historial (próximamente)", next: "account_menu" }, { text: "Buscar nuevos viajes", next: "trips_menu" }] };
            }

            const options = activeReservations.map(res => {
                const tour = allTours.find(t => t.id === res.tripId);
                return {
                    text: `${tour?.destination} - ${getDateFromFirestore(tour?.date).toLocaleDateString()}`,
                    next: 'reservation_details_menu',
                    actionContext: res.id // Pass reservation ID to the next step
                };
            });

            return { success: true, message: "Estos son tus próximos viajes. Selecciona uno para ver más detalles:", options: [...options, { text: "⬅️ Volver a mi cuenta", next: "account_menu" }] };
        }
        case 'fetchPaymentStatus': {
            if (!context) return { success: false, message: "No se seleccionó ninguna reserva.", fallbackNode: 'active_reservations_result' };
            const reservation = await getDocumentById<Reservation>('reservations', context);
            if (!reservation) return { success: false, message: "No encontré los datos de esa reserva.", fallbackNode: 'active_reservations_result' };
            
            const installments = reservation.installments?.details || [];
            const totalPaid = installments.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
            const balance = reservation.finalPrice - totalPaid;

            let details = `Monto Total: ${formatCurrency(reservation.finalPrice)}\nMonto Pagado: ${formatCurrency(totalPaid)}\nSaldo Pendiente: ${formatCurrency(balance)}\n\nDetalle de Cuotas:\n`;
            installments.forEach((inst, i) => {
                details += `Cuota ${i+1}: ${formatCurrency(inst.amount)} - ${inst.isPaid ? 'Pagada' : 'Pendiente'}\n`;
            });
            
            return { success: true, message: "Aquí tienes el detalle de tus pagos:", data: { details }, nodeId: 'payment_status_result', options: [ { text: "Ver mi pase de abordo", next: "boarding_pass_result", action: "fetchBoardingPass", actionContext: context }, { text: "⬅️ Volver a los viajes", next: "active_reservations_result", action: "fetchActiveReservations", requiresAuth: true } ]};
        }
         case 'fetchBoardingPass': {
            if (!context) return { success: false, message: "No se seleccionó ninguna reserva.", fallbackNode: 'active_reservations_result' };
            const reservation = await getDocumentById<Reservation>('reservations', context);
            if (!reservation) return { success: false, message: "No encontré los datos de esa reserva.", fallbackNode: 'active_reservations_result' };
            
            const tour = await getDocumentById<Tour>('tours', reservation.tripId);
            if (!tour) return { success: false, message: "No encontré los datos del viaje asociado.", fallbackNode: 'active_reservations_result' };

            const mainPassenger = await getDocumentById<Passenger>('passengers', reservation.passengerIds[0]);
            const boardingPoint = tour.departurePoint || mainPassenger?.boardingPointId;
            const assignedSeats = reservation.assignedSeats.map(s => `Asiento ${s.seatId}`).join(', ');
            
            const details = `
Viaje: ${tour.destination}
Pasajero Principal: ${mainPassenger?.fullName}
Fecha Salida: ${getDateFromFirestore(tour.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
Hora Presentación: ${tour.presentationTime || 'A confirmar'}
Punto de Embarque: ${boardingPoint || 'A confirmar'}
Asiento(s): ${assignedSeats || 'Asignado por coordinador'}
            `;
            
            return { success: true, message: "Este es un resumen de tu pase de abordo. ¡No olvides tu DNI!", data: { details }, nodeId: 'boarding_pass_result', options: [ { text: "Ver estado de mis pagos", next: "payment_status_result", action: "fetchPaymentStatus", actionContext: context }, { text: "⬅️ Volver a los viajes", next: "active_reservations_result", action: "fetchActiveReservations", requiresAuth: true } ] };
        }
      case 'getFaqAnswer': {
          const answer = faqAnswers[context as string] || "Lo siento, no tengo una respuesta para eso. ¿Quieres ver otras preguntas?";
          return { success: true, message: answer, nodeId: 'faq_result' };
      }
      case 'fetchFeaturedTours': {
        const allTours = await getAllFromCollection<Tour>('tours');
        const featured = allTours.filter(t => t.isPublic && t.isFeatured && getDateFromFirestore(t.date) >= new Date());
        if (featured.length > 0) {
          return { success: true, message: "¡Estos son nuestros viajes destacados!", data: serializeCollection(featured) };
        }
        return { success: false, message: "No hay viajes destacados en este momento. ¿Quieres ver todos?", fallbackNode: 'trips_menu' };
      }
      case 'fetchAllTours': {
        const allTours = await getAllFromCollection<Tour>('tours');
        const active = allTours.filter(t => t.isPublic && getDateFromFirestore(t.date) >= new Date());
        if (active.length > 0) {
            return { success: true, message: "Aquí tienes todos nuestros próximos viajes:", data: serializeCollection(active) };
        }
        return { success: false, message: "No tenemos viajes programados por ahora. ¡Vuelve pronto!", fallbackNode: 'start' };
      }
      case 'fetchTripDetailsByName': {
          if (!context) return { success: false, message: "Necesito un nombre para buscar.", fallbackNode: 'search_by_name_input'};
          const allTours = await getAllFromCollection<Tour>('tours');
          const searchTerm = context.toLowerCase();
          const tour = allTours.find(t => t.destination.toLowerCase().includes(searchTerm));
          if (tour) {
              const details = `
Destino: ${tour.destination}
Fecha: ${getDateFromFirestore(tour.date).toLocaleDateString()}
Precio: $${tour.price.toLocaleString()}
Noches: ${tour.nights || 'No especificado'}
Origen: ${tour.origin || 'No especificado'}
Transporte: ${tour.bus || 'No especificado'}
              `;
              return { success: true, message: "¡Encontré este viaje!", data: { ...serializeObject(tour), details: details }, nodeId: 'trip_details_result' };
          }
          return { success: false, message: `No encontré ningún viaje a "${context}". ¿Quieres ver todos los viajes?`, fallbackNode: 'trips_menu' };
      }
      case 'searchTripsByAttribute': {
          const tagsToSearch: string[] = Array.isArray(context) ? context : [context];
          if (tagsToSearch.length === 0) {
              return { success: true, message: "No seleccionaste ninguna temática. ¿Quieres ver todos los viajes?", nodeId: 'trips_menu' };
          }

          const allTours = await getAllFromCollection<Tour>('tours');
          const activeTours = allTours.filter(t => t.isPublic && getDateFromFirestore(t.date) >= new Date());
          
          const results = activeTours.filter(tour => 
              tagsToSearch.every(tag => tour.tags?.includes(tag))
          );
          
          if (results.length > 0) {
              const tagText = tagsToSearch.join(', ');
              return { success: true, message: `Encontré estos viajes con la(s) temática(s) "${tagText}":`, data: serializeCollection(results) };
          }
          return { success: false, message: `No encontré viajes con todas esas temáticas. Aquí tienes todos nuestros viajes activos:`, data: serializeCollection(activeTours), fallbackNode: 'trips_result'};
      }
      case 'fetchPassengerByDNI': {
        if (!context) return { success: false, message: "Debes iniciar sesión para ver tus datos.", fallbackNode: 'start' };
        const passenger = await getDocumentById<Passenger>('passengers', context);
        if (passenger) {
          const allReservations = await getAllFromCollection<Reservation>('reservations');
          const passengerReservations = allReservations.filter(r => r.passengerIds.includes(passenger.id));
          const passengerData = { ...passenger, tripCount: passengerReservations.length };
          return { success: true, message: "Encontré estos datos para ti:", data: [serializeObject(passengerData)], nodeId: 'passenger_info_result' };
        }
        return { success: false, message: `No pude encontrar un pasajero con DNI ${context}.`, fallbackNode: 'dni_not_found' };
      }
      case 'fetchFamilyGroup': {
        if (!context) return { success: false, message: "Debes iniciar sesión para ver tu grupo.", fallbackNode: 'start' };
        const allPassengers = await getAllFromCollection<Passenger>('passengers');
        const currentUser = allPassengers.find(p => p.id === context);
        if (!currentUser) {
            return { success: false, message: "No pude encontrar tu perfil de usuario.", fallbackNode: 'start' };
        }
        if (!currentUser.family) {
          return { success: true, message: "No perteneces a un grupo familiar. Aquí están tus datos:", data: [serializeObject(currentUser)], nodeId: 'family_group_result' };
        }
        const familyMembers = allPassengers.filter(p => p.family === currentUser.family);
        return { success: true, message: `Estos son los integrantes de tu grupo: ${currentUser.family}`, data: serializeCollection(familyMembers), nodeId: 'family_group_result' };
      }
      default:
        return { success: false, message: "Acción no reconocida." };
    }
  } catch (error) {
    console.error("Error executing chatbot action:", error);
    return { success: false, message: "Hubo un problema al procesar tu solicitud." };
  }
};
