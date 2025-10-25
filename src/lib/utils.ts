
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
 * - For remote URLs that are from Firebase Storage, it uses an image proxy.
 * - For local URLs (blob:, data:), it returns them directly.
 * @param url The URL of the image.
 * @returns A safe URL for an `<img>` src attribute.
 */
export const getDisplayUrl = (url: string | null): string => {
    if (!url) return "";
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    // We assume any other URL is a remote one that needs proxying.
    // This is especially important for Firebase Storage URLs to avoid CORS issues
    // or needing to make the bucket fully public.
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};
