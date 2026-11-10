import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Reservation, Tour, Passenger } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a dynamic, display-friendly ID for reservations, tickets, or receipts.
 * Format: [Prefix]-[YY]-[Last6OfReservationId]
 * Example: R-24-aB3xZ9
 */
export const generateDisplayID = (
    prefix: 'R' | 'T' | 'Re', 
    reservation: Reservation, 
    tour?: Tour, 
    passenger?: Passenger
): string => {
    if (!reservation.id) {
        return "ID-INVÁLIDO";
    }
    
    // Use the year from the tour's date if available, otherwise current year
    const year = tour ? new Date(tour.date).getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
    
    // Use last 6 chars of reservation ID for uniqueness
    const idFragment = reservation.id.slice(-6);

    return `${prefix}-${year}-${idFragment}`;
}

/**
 * Handles different types of image URLs for display.
 * This version is simplified to handle only direct URLs (data:, blob:, http).
 * @param url The URL of the image.
 * @returns A safe URL for an `<img>` src attribute.
 */
export const getDisplayUrl = (url: string | null | undefined): string => {
    if (typeof url !== 'string' || !url) {
        return "";
    }
    // All URL types (data, blob, http) can be used directly in `src` attributes.
    // The previous proxy is no longer needed with the Base64 approach for remote images stored in Firestore.
    return url;
};

export const toTitleCase = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ').trim();
}
