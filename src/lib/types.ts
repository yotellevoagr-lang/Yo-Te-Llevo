

import type { Layout, Cell } from './layouts';

export type LayoutCategory = 'vehicles' | 'airplanes' | 'cruises';

export type LayoutItemType = string;

export interface CustomLayoutConfig {
  name: string;
  capacity: number;
  layout: Layout;
}

export interface Pension {
  id: string;
  name: string;
  description: string;
}

export interface RoomType {
  id: string;
  name: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
}

export interface ExtraCost {
    id: string;
    description: string;
    amount: number;
}

export interface CustomExpense {
    id: string;
    description: string;
    amount: number;
    date: Date;
}

export interface ExternalCommission {
    id: string;
    description: string;
    amount: number;
    date: Date;
}

export interface ExcursionIncome {
    id: string;
    description: string;
    amount: number;
    date: Date;
}

export interface TransportCost {
    unitId: number;
    category: LayoutCategory;
    amount: number;
}

export interface TourCosts {
    transport?: TransportCost[];
    hotel?: number;
    extras?: ExtraCost[];
}

export interface ContactSettings {
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
    instagram?: string;
    facebook?: string;
}

export interface DomainSettings {
    domains: string[];
}

export interface GeneralSettings {
    mainWhatsappNumber?: string;
    contact?: ContactSettings;
    calendarDownloadFolder?: string;
    reportDownloadFolder?: string;
    observations?: string;
    cancellationPolicy?: string;
    logoUrl?: string;
    aboutUsMedia?: {
        url: string;
        type: 'image' | 'video';
    };
}

export interface GeoSettings {
    latitude: number;
    longitude: number;
    radiusKm: number;
}

export interface BoardingPoint {
    id: string;
    name: string;
}

export interface TransportUnit {
    id: number;
    category: LayoutCategory;
    type: LayoutItemType;
    count: number;
    coordinator?: string;
    coordinatorPhone?: string;
}

export interface Insurance {
    active: boolean;
    cost: number;
    minAge: number;
    maxAge: number;
}

export interface Tour {
  id: string;
  destination: string;
  date: Date;
  price: number;
  currency?: 'ARS' | 'USD';
  isPublic?: boolean; // Nuevo campo para visibilidad
  backgroundImage?: string;
  isFeatured?: boolean;
  
  origin?: string;
  nights?: number;
  departurePoint?: string;
  platform?: string;
  presentationTime?: string;
  departureTime?: string;
  bus?: string;
  coordinator?: string; // This can be the main coordinator if a unit doesn't have one
  coordinatorPhone?: string;
  roomType?: string; // e.g. 'Doble', 'Triple' etc.
  insurance?: Insurance;

  pricingTiers?: PricingTier[];
  costs?: TourCosts;
  
  observations?: string;
  cancellationPolicy?: string;
  
  transportUnits?: TransportUnit[];

  // Deprecated fields, kept for potential data migration but should not be used for new logic
  flyerUrl?: string; // DEPRECATED
  flyerType?: 'image' | 'video'; // DEPRECATED
  vehicles?: Partial<Record<LayoutItemType, number>>;
  airplanes?: Partial<Record<LayoutItemType, number>>;
  cruises?: Partial<Record<LayoutItemType, number>>;
}

export type ReservationStatus = "Confirmado" | "Pendiente";
export type PaymentStatus = "Pagado" | "Parcial" | "Pendiente";
export type PaymentMethod = "Tarjeta" | "Transferencia" | "Efectivo";

export type AssignedSeat = { 
  seatId: string; 
  unit: number; 
};

export type AssignedCabin = {
  cabinId: string;
  unit: number;
}

export interface Installment {
    amount: number;
    isPaid: boolean;
    paymentMethod?: PaymentMethod;
}

export interface Passenger {
  id: string;
  username?: string;
  fullName: string;
  email?: string;
  password?: string;
  dni: string;
  dob?: Date | null;
  phone?: string;
  family?: string;
  nationality: string;
  tierId: string;
  boardingPointId?: string;
}

export type Reservation = {
    id: string;
    tripId: string;
    passenger: string; 
    passengerIds: string[]; 
    insuredPassengerIds?: string[];
    releasedPassengerIds?: string[];
    paxCount: number; 
    assignedSeats: AssignedSeat[];
    assignedCabins: AssignedCabin[];
    status: ReservationStatus;
    paymentStatus: PaymentStatus;
    sellerId: string;
    pensionId?: string;
    finalPrice: number;
    boardingPointId?: string;
    roomTypeId?: string;
    installments?: {
        count: number;
        details: Installment[];
    }
}

export type Ticket = {
  id: string; 
  passengerId: string;
  reservationId: string;
  tripId: string;
  passengerName: string;
  passengerDni: string;
  qrCodeUrl: string;
  reservation: Reservation;
  boardingPointId?: string;
}


// --- New Employee and Seller Types ---

export interface Employee {
  id: string;
  name: string;
  username?: string;
  dni: string;
  phone: string;
  password?: string;
  fixedSalary?: number;
  email?: string;
}

export interface Seller {
  id: string;
  name: string;
  username?: string;
  dni: string;
  phone: string;
  useFixedCommission: boolean;
  fixedCommissionRate?: number;
}

export interface CommissionRule {
    id: string;
    from: number;
    to: number | 'infinite';
    rate: number;
}

export interface CommissionSettings {
    rules: CommissionRule[];
}

export interface Flyer {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  tourId: string | null;
  isGeneralPromotion: boolean;
}


// --- History & Archiving Types ---
export interface HistoryItem {
  id: string; // Can be tour id for reports, or a custom id for calendars
  name: string; // Display name, e.g., "Bariloche - 15/08/2025" or "Calendario 2025"
  data: any; // The actual data, e.g., ReportData or Bubble[]
  savedAt: string; // ISO date string
}
