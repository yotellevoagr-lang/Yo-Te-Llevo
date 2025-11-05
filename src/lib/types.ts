

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
  currency?: 'ARS' | 'USD';
}

export interface ExtraCost {
    id: string;
    description: string;
    amount: number;
    currency: 'ARS' | 'USD';
}

export interface CustomExpense {
    id: string;
    description: string;
    amount: number;
    currency: 'ARS' | 'USD';
    date: Date;
}

export interface ExternalCommission {
    id: string;
    description: string;
    amount: number;
    currency: 'ARS' | 'USD';
    date: Date;
}

export interface ExcursionIncome {
    id: string;
    description: string;
    amount: number;
    currency: 'ARS' | 'USD';
    date: Date;
}

export interface TransportCost {
    unitId: number;
    category: LayoutCategory;
    amount: number;
    currency: 'ARS' | 'USD';
}

export interface TourCosts {
    transport: TransportCost[];
    hotel: {
        amount: number;
        currency: 'ARS' | 'USD';
    };
    extras: ExtraCost[];
}

export interface ContactSettings {
    address?: string;
    addressLink?: string;
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
    pwaIconUrl?: string;
    pwaScreenshots?: string[];
    availableTags?: string[];
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

export interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

export interface Tour {
  id: string;
  destination: string;
  date: Date;
  price: number;
  currency?: 'ARS' | 'USD';
  isPublic?: boolean; 
  isFeatured?: boolean;
  showAsPopup?: boolean;
  tags?: string[];
  
  backgroundImage?: string;
  gallery?: GalleryItem[];
  description?: string; 

  origin?: string;
  days?: number;
  nights?: number;
  departurePoint?: string;
  platform?: string;
  presentationTime?: string;
  departureTime?: string;
  bus?: string;
  coordinator?: string;
  coordinatorPhone?: string;
  roomType?: string; 
  insurance?: Insurance;

  pricingTiers?: PricingTier[];
  costs?: TourCosts;
  
  observations?: string;
  cancellationPolicy?: string;
  
  transportUnits?: TransportUnit[];
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
    transactionId?: string;
}

export interface Passenger {
  id: string;
  username?: string;
  firstName: string;
  lastName: string;
  fullName: string; // This will be derived: `${firstName} ${lastName}`
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

export type CreatorContext = {
    by: string; // The UID of the creator
    role: 'client' | 'employee' | 'admin';
};

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
    };
    createdBy?: CreatorContext;
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
  warning?: string;
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


export type TransactionCategory =
  | 'Reservation Payment'
  | 'Transport Cost'
  | 'Hotel Cost'
  | 'Extra Cost'
  | 'Manual Expense'
  | 'External Commission'
  | 'Excursion Income';

export interface Transaction {
  id: string;
  amount: number;
  currency: 'ARS' | 'USD';
  date: Date;
  description: string;
  type: 'income' | 'expense';
  category: TransactionCategory;
  relatedId?: string;
  method?: string;
}

export interface ChatbotState {
    selectedTags: string[];
}
    
