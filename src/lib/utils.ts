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

const DELINQUENT_STORAGE_MARKERS: string[] = [];

// Curated high-resolution fallback photos for trips and tours
export const CURATED_TRAVEL_FALLBACKS = [
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?auto=format&fit=crop&w=1200&q=80',
];

export const CURATED_FLYER_FALLBACKS = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
];

export const isDelinquentStorageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || DELINQUENT_STORAGE_MARKERS.length === 0) return false;
  const lower = url.toLowerCase();
  return DELINQUENT_STORAGE_MARKERS.some(marker => lower.includes(marker));
};

export const getDeterministicFallbackImage = (key: string, list = CURATED_TRAVEL_FALLBACKS): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
};

/**
 * Handles different types of image URLs for display.
 * @param url The URL of the image.
 * @returns A safe URL for an `<img>` or `<Image>` src attribute.
 */
export const getDisplayUrl = (url: string | null | undefined): string => {
    if (typeof url !== 'string' || !url) {
        return "";
    }

    return url;
};

export const toTitleCase = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ').trim();
}
