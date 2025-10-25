
'use server';
/**
 * @fileOverview Service functions to fetch travel-related data from Firestore for AI flows.
 */

import { getAllFromCollection, getDocumentById } from '@/lib/firestore-services';
import type { Passenger, Reservation, Tour } from '@/lib/types';

/**
 * Fetches and formats all relevant information for a given passenger ID.
 * This function is designed to be used by an AI tool.
 * @param userId The ID of the passenger.
 * @returns A formatted string containing the passenger's details and their reservations, or an empty string if not found.
 */
export async function getPassengerContext(userId: string): Promise<string> {
    if (!userId) return "";

    const passenger = await getDocumentById<Passenger>('passengers', userId);
    if (!passenger) {
        return `No se encontró información para el pasajero con ID ${userId}.`;
    }

    const [allReservations, allTours] = await Promise.all([
        getAllFromCollection<Reservation>('reservations'),
        getAllFromCollection<Tour>('tours')
    ]);

    const passengerReservations = allReservations.filter(r => r.passengerIds.includes(passenger.id));

    let context = `## Información para ${passenger.fullName} (DNI: ${passenger.dni}) ##\n`;

    if (passengerReservations.length === 0) {
        context += "El pasajero no tiene reservas activas.\n";
    } else {
        context += "El pasajero tiene las siguientes reservas:\n";
        passengerReservations.forEach(res => {
            const tour = allTours.find(t => t.id === res.tripId);
            const paidAmount = res.installments?.details.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0) || 0;
            const balance = res.finalPrice - paidAmount;

            context += `
- Reserva para ${tour?.destination || 'destino desconocido'}:
  - Estado: ${res.status}
  - Pasajeros en la reserva: ${res.paxCount}
  - Precio Final: $${res.finalPrice.toLocaleString('es-AR')}
  - Monto Pagado: $${paidAmount.toLocaleString('es-AR')}
  - Saldo Pendiente: $${balance.toLocaleString('es-AR')}
  - Estado del Pago: ${res.paymentStatus}
`;
        });
    }

    return context.trim();
}
