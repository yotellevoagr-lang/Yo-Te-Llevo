

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
  minAge?: number;
  maxAge?: number;
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
    paidAt?: Date;
    paymentMethod?: PaymentMethod;
    transactionId?: string;
}

export interface Passenger {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
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
  // Address fields
  province?: string;
  city?: string;
  street?: string;
  addressNumber?: string;
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
  | 'fetchAvailableTags';
  
export interface ActionDescription {
  label: string;
  description: string;
}

export const actionDescriptions: Record<ActionType, ActionDescription> = {
  fetchFeaturedTours: {
    label: "Obtener Viajes Destacados",
    description: "Busca y muestra solo los viajes marcados como 'destacados'.",
  },
  fetchAllTours: {
    label: "Obtener Todos los Viajes",
    description: "Muestra un catálogo con todos los viajes activos y públicos.",
  },
  fetchPassengerByDNI: {
    label: "Buscar Pasajero por DNI",
    description: "Busca un pasajero usando el DNI ingresado y muestra su información.",
  },
  fetchFamilyGroup: {
    label: "Obtener Grupo Familiar",
    description: "Muestra todos los miembros del grupo familiar del usuario que ha iniciado sesión.",
  },
  getFaqAnswer: {
    label: "Obtener Respuesta de FAQ",
    description: "Proporciona una respuesta predefinida a una pregunta frecuente.",
  },
  fetchTripDetailsByName: {
    label: "Buscar Viaje por Nombre",
    description: "Busca un viaje cuyo destino coincida con el texto ingresado por el usuario.",
  },
  searchTripsByAttribute: {
    label: "Buscar Viajes por Etiqueta",
    description: "Filtra y muestra viajes que conten_gan las etiquetas temáticas seleccionadas.",
  },
  fetchActiveReservations: {
    label: "Obtener Reservas Activas",
    description: "Muestra los próximos viajes del usuario que ha iniciado sesión.",
  },
  fetchPaymentStatus: {
    label: "Obtener Estado de Pago",
    description: "Muestra el detalle de pagos y el saldo pendiente de una reserva seleccionada.",
  },
  fetchBoardingPass: {
    label: "Obtener Pase de Abordo",
    description: "Genera y muestra un resumen del pase de abordo para una reserva.",
  },
  getTripStatus: {
    label: "Obtener Estado de un Viaje (Admin)",
    description: "Muestra la capacidad total, ocupada y disponible de un viaje específico.",
  },
  askForChildren: {
    label: "Iniciar Pre-reserva (paso 1)",
    description: "Inicia el flujo para cotizar una reserva, preguntando por la cantidad total de pasajeros.",
  },
  calculatePrebookingPrice: {
    label: "Calcular Precio de Pre-reserva (paso 2)",
    description: "Calcula el precio final basado en el número de adultos y niños ingresado.",
  },
  fetchContactInfo: {
    label: "Obtener Información de Contacto",
    description: "Muestra el teléfono y email de contacto de la agencia.",
  },
  fetchAvailableTags: {
    label: "Cargar Etiquetas Disponibles",
    description: "Carga y muestra las etiquetas temáticas de los viajes como opciones.",
  },
};


export interface ChatbotNode {
  id: string;
  message: string;
  options: {
    text: string;
    next: string;
    action?: ActionType | undefined; // Allow undefined
    actionContext?: any;
    requiresAuth?: boolean;
    isExternalLink?: boolean;
  }[];
  isUserInput?: boolean;
  action?: ActionType;
  position?: { x: number, y: number };
}

export interface ChatbotState {
    selectedTags: string[];
}

export interface LocationVote {
    id?: string;
    province: string;
    city: string;
    createdAt: Date;
}

export type ReactionType = 'like' | 'love';

export interface CommunityReaction {
    id: string;
    type: ReactionType;
    userId: string;
    userName: string;
    createdAt: Date;
}

export interface CommunityComment {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    createdAt: Date;
    parentId?: string;
}

export interface CommunityPost {
    id: string;
    title?: string;
    content: string;
    media?: {
        url: string;
        type: 'image' | 'video';
    }[];
    benefitId?: string;
    visibility: 'public' | 'registered';
    status: 'active' | 'archived';
    createdBy: {
        uid: string;
        role: 'admin' | 'employee';
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
    reactionSummary: {
        likes: number;
        loves: number;
    };
    commentCount: number;
}

export type DiscountType = 'percentage' | 'fixed';
export type BenefitStatus = 'active' | 'expired' | 'exhausted' | 'draft';
export type VisibilityScope = 'public' | 'registered';
export type EligibleAudience = 'all' | 'selected' | 'recurrent';

export interface BenefitDesign {
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    backgroundImageUrl?: string;
    layoutPreset?: 'minimal' | 'bold' | 'elegant';
}

export interface Benefit {
    id: string;
    code: string;
    title: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    maxUsesTotal: number;
    currentUsesTotal: number;
    maxUsesPerPassenger: number;
    maxPassengersPerUse: number;
    applicableTripIds: string[];
    eligibleAudience: EligibleAudience;
    selectedPassengerIds: string[];
    visibilityScope: VisibilityScope;
    publishToCommunity: boolean;
    communityPostId?: string;
    status: BenefitStatus;
    validFrom: Date;
    validUntil: Date;
    autoApply: boolean;
    design?: BenefitDesign;
    createdAt: Date;
    createdBy: string;
}

export interface BenefitRedemption {
    id: string;
    benefitId: string;
    benefitCode: string;
    passengerId: string;
    passengerName: string;
    bookingId?: string;
    tripId?: string;
    discountApplied: number;
    discountType: DiscountType;
    usedAt: Date;
    appliedBy: string;
    source: 'manual' | 'auto' | 'booking';
}

export interface PassengerBenefit {
    id: string;
    benefitId: string;
    benefitCode: string;
    title: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    status: 'available' | 'used' | 'expired';
    applicableTripIds: string[];
    remainingUses: number;
    claimedAt: Date;
    expiresAt: Date;
    usedAt?: Date;
    usedInBookingId?: string;
}

export interface PassengerStats {
    totalTrips: number;
    completedTrips: number;
    totalSpent: number;
    lastTripDate?: Date;
}
