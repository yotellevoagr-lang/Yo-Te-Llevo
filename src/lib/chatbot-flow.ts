
'use server';

import { getAllFromCollection } from "./firestore-services";
import type { Tour, Passenger, Reservation } from "./types";
import type { ChatbotNode } from "./chatbot-nodes";

export type ActionType = 'fetchFeaturedTours' | 'fetchAllTours' | 'fetchPassengerByDNI' | 'fetchPassengerHistory';

export type ActionResponse = {
  success: boolean;
  message: string;
  data?: any[] | null;
  fallbackNode?: string;
};

// Helper function to correctly handle Firebase Timestamps
const getDateFromFirestore = (dateField: any): Date => {
    if (dateField && typeof dateField.toDate === 'function') {
        // It's a Firebase Timestamp
        return dateField.toDate();
    }
    // It's already a Date object or a string/number that can be parsed
    return new Date(dateField);
}

const serializeTours = (tours: Tour[]): any[] => {
    return tours.map(tour => ({
        ...tour,
        date: getDateFromFirestore(tour.date).toISOString(),
    }));
}

export async function executeChatbotAction (action: ActionType, context?: any): Promise<ActionResponse> {
  try {
    switch (action) {
      case 'fetchFeaturedTours': {
        const allTours = await getAllFromCollection<Tour>('tours');
        const featured = allTours.filter(t => t.isPublic && t.isFeatured && getDateFromFirestore(t.date) >= new Date());
        if (featured.length > 0) {
          return { success: true, message: "¡Estos son nuestros viajes destacados!", data: serializeTours(featured) };
        }
        return { success: false, message: "No hay viajes destacados en este momento. ¿Quieres ver todos?", fallbackNode: 'trips_menu' };
      }
      case 'fetchAllTours': {
        const allTours = await getAllFromCollection<Tour>('tours');
        const active = allTours.filter(t => t.isPublic && getDateFromFirestore(t.date) >= new Date());
        if (active.length > 0) {
            return { success: true, message: "Aquí tienes todos nuestros próximos viajes:", data: serializeTours(active) };
        }
        return { success: false, message: "No tenemos viajes programados por ahora. ¡Vuelve pronto!", fallbackNode: 'start' };
      }
      case 'fetchPassengerByDNI': {
        if (!context) return { success: false, message: "Necesito un DNI o ID para buscar.", fallbackNode: 'reservation_check' };
        const allPassengers = await getAllFromCollection<Passenger>('passengers');
        // If context is from a logged in user, it will be their ID. Otherwise it's a DNI string from input.
        const passenger = allPassengers.find(p => p.dni === context || p.id === context);
        if (passenger) {
          const allReservations = await getAllFromCollection<Reservation>('reservations');
          const passengerReservations = allReservations.filter(r => r.passengerIds.includes(passenger.id));
          return { success: true, message: "Encontré estos datos para ti:", data: [{ ...passenger, tripCount: passengerReservations.length }] };
        }
        return { success: false, message: `No encontré ningún pasajero con el DNI ${context}.` };
      }
      case 'fetchPassengerHistory': {
         if (!context) return { success: false, message: "Debes iniciar sesión para ver tu historial.", fallbackNode: 'start' };
         const allReservations = await getAllFromCollection<Reservation>('reservations');
         const passengerReservations = allReservations.filter(r => r.passengerIds.includes(context));
         if (passengerReservations.length > 0) {
             const allTours = await getAllFromCollection<Tour>('tours');
             const tripDetails = passengerReservations.map(res => {
                 const tour = allTours.find(t => t.id === res.tripId);
                 if (!tour) return null;
                 return {...tour, date: getDateFromFirestore(tour.date)};
             }).filter(Boolean);
             return { success: true, message: "Estos son los viajes que has hecho o tienes reservados con nosotros:", data: serializeTours(tripDetails as Tour[]) };
         }
         return { success: true, message: "Aún no tienes viajes registrados con nosotros. ¿Quieres ver nuestros destinos?", data: [] };
      }
      default:
        return { success: false, message: "Acción no reconocida." };
    }
  } catch (error) {
    console.error("Error executing chatbot action:", error);
    return { success: false, message: "Hubo un problema al procesar tu solicitud." };
  }
};
