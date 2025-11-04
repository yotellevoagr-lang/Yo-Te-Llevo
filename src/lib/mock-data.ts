
import type { Tour, Reservation, Ticket, Employee, Passenger, AssignedCabin, BoardingPoint, Seller, CommissionSettings, Pension, RoomType } from './types';

export const mockPensions: Pension[] = [
    { id: 'pension-media', name: 'Media Pensión', description: 'Incluye desayuno y cena.' },
    { id: 'pension-completa', name: 'Pensión Completa', description: 'Incluye desayuno, almuerzo y cena.' },
    { id: 'pension-desayuno', name: 'Solo Desayuno', description: 'Incluye desayuno.' },
]

export const mockRoomTypes: RoomType[] = [
    { id: 'RT01', name: 'Doble Matrimonial' },
    { id: 'RT02', name: 'Doble Twin' },
    { id: 'RT03', name: 'Triple' },
    { id: 'RT04', name: 'Cuádruple' },
]

export const mockBoardingPoints: BoardingPoint[] = [
    { id: 'BP01', name: 'Terminal de Omnibus Rosario' },
    { id: 'BP02', name: 'Cruce Alberdi (Rosario)' },
    { id: 'BP03', name: 'Plaza del Soldado (Santa Fe)' },
    { id: 'BP04', name: 'Terminal de Omnibus Parana' },
    { id: 'BP05', name: 'Shell San Lorenzo (Autopista)' },
];

export const mockCommissionSettings: CommissionSettings = {
    rules: [
        { id: 'C01', from: 1, to: 4, rate: 5 },
        { id: 'C02', from: 5, to: 'infinite', rate: 10 }
    ]
}


export const mockTours: Tour[] = [
  {
    id: 'T-2026-BARILOCHE',
    destination: 'Bariloche Clásico',
    date: new Date('2026-07-10T20:00:00'),
    price: 350000,
    origin: "Buenos Aires",
    nights: 7,
    bus: "Via Bariloche",
    transportUnits: [
        { id: 1, category: 'vehicles', type: 'doble_piso', count: 1, coordinator: "Marcos Gil", coordinatorPhone: "341-504-0710" },
    ],
  },
  {
    id: 'T-2026-CATARATAS',
    destination: 'Cataratas del Iguazú',
    date: new Date('2026-09-05T18:30:00'),
    price: 280000,
    origin: "Rosario",
    nights: 5,
    bus: "Crucero del Norte",
    transportUnits: [
        { id: 1, category: 'vehicles', type: 'micro_largo', count: 1, coordinator: "Laura Fernandez", coordinatorPhone: "11-2233-4455" },
    ],
  },
  {
    id: 'T-2026-PATAGONIA',
    destination: 'Patagonia Austral',
    date: new Date('2026-11-20T10:00:00'),
    price: 550000,
    origin: "Aeroparque J. Newbery",
    nights: 8,
    bus: "Aerolíneas Argentinas",
    transportUnits: [
        { id: 1, category: 'airplanes', type: 'boeing_737', count: 1, coordinator: "Sofia Acosta", coordinatorPhone: "11-3344-5566" },
    ],
  },
   {
    id: 'T-2026-CRUCERO-SUR',
    destination: 'Crucero por el Sur',
    date: new Date('2026-12-15T16:00:00'),
    price: 1250000,
    origin: "Puerto de Ushuaia",
    nights: 10,
    bus: "Antarctic Cruises Inc.",
    transportUnits: [
        { id: 1, category: 'cruises', type: 'gran_crucero', count: 1, coordinator: "Angela Rojas", coordinatorPhone: "11-1111-1111" },
    ],
  },
];

export const mockAdminUser: Employee = { id: '8jb6LkWA1MhJWzMdMJKxowKDHG82', name: 'Angela Rojas', username: 'Angela Rojas', dni: '99999999', phone: '1111111111', password: 'AngelaRojasYTL', email: 'admin@yotellevo.com' };

export const mockEmployees: Employee[] = [
    { id: 'EMP-01', name: 'Laura Fernandez', username: 'laura.f', dni: '28123456', phone: '1122334455', password: "password123", fixedSalary: 180000 },
    { id: 'EMP-02', name: 'Marcos Gil', username: 'marcos.g', dni: '30654987', phone: '1166778899', password: "password123", fixedSalary: 180000 },
    { id: 'EMP-03', name: 'Sofia Acosta', username: 'sofia.a', dni: '35789123', phone: '1133445566', password: "password123", fixedSalary: 175000 },
];

export const mockSellers: Seller[] = [
    { id: 'SELL-EXT-01', name: 'Turismo del Litoral', username: 'turismo.litoral', dni: '30111222', phone: '342-555-0101', useFixedCommission: false },
    { id: 'SELL-EXT-02', name: 'Andes Viajes', username: 'andes.viajes', dni: '30333444', phone: '261-555-0202', useFixedCommission: true, fixedCommissionRate: 12 },
];


export const mockPassengers: Passenger[] = [
    // Familia Perez
    { id: 'P-30M-PER', fullName: 'Juan Perez', username: 'juan.perez', dni: '30123456', dob: new Date('1983-04-12'), phone: '11-3030-4040', family: 'Perez', nationality: 'Argentina', tierId: 'adult' },
    { id: 'P-32F-PER', fullName: 'Maria Lopez de Perez', username: 'maria.lopez', dni: '32456789', dob: new Date('1986-07-25'), phone: '11-3030-4040', family: 'Perez', nationality: 'Argentina', tierId: 'adult', email: 'maria.perez@example.com' },
    { id: 'P-50M-PER', fullName: 'Lucas Perez', username: 'lucas.perez', dni: '50123456', dob: new Date('2011-01-10'), phone: '', family: 'Perez', nationality: 'Argentina', tierId: 'adult' },
    
    // Familia Garcia
    { id: 'P-28M-GAR', fullName: 'Carlos Garcia', username: 'carlos.garcia', dni: '28987654', dob: new Date('1980-01-15'), phone: '341-505-6060', family: 'Garcia', nationality: 'Argentina', tierId: 'adult', email: 'carlos.garcia@example.com' },
    { id: 'P-29F-GAR', fullName: 'Ana Martinez', username: 'ana.martinez', dni: '29876543', dob: new Date('1982-10-30'), phone: '341-505-6060', family: 'Garcia', nationality: 'Argentina', tierId: 'adult' },

    // Familia Rodriguez
    { id: 'P-17F-ROD', fullName: 'Marta Rodriguez', username: 'marta.rodriguez', dni: '17888999', dob: new Date('1966-02-20'), phone: '351-606-7070', family: 'Rodriguez', nationality: 'Argentina', tierId: 'adult' },
    
    // Grupo Amigos Patagonia
    { id: 'P-35F-GOM', fullName: 'Valeria Gomez', username: 'valeria.gomez', dni: '35111222', dob: new Date('1992-05-20'), phone: '11-707-8080', family: 'Amigos Patagonia', nationality: 'Argentina', tierId: 'adult' },
    { id: 'P-36F-ROM', fullName: 'Julieta Romero', username: 'julieta.romero', dni: '36222333', dob: new Date('1993-08-11'), phone: '11-707-8081', family: 'Amigos Patagonia', nationality: 'Argentina', tierId: 'adult' },
    
    // Pasajeros individuales
    { id: 'P-25M-FLO', fullName: 'Ricardo Flores', username: 'ricardo.flores', dni: '25444555', dob: new Date('1976-09-01'), phone: '221-808-9090', nationality: 'Argentina', tierId: 'adult' },
    { id: 'P-40F-CAS', fullName: 'Lorena Castro', username: 'lorena.castro', dni: '40555666', dob: new Date('2001-11-12'), phone: '342-909-1010', nationality: 'Argentina', tierId: 'adult' },
];

export const mockReservations: Reservation[] = [
  // Reserva Familia Perez para Bariloche (2026)
  { id: "R-26-001-1", tripId: "T-2026-BARILOCHE", passenger: "Juan Perez", passengerIds: ["P-30M-PER", "P-32F-PER", "P-50M-PER"], paxCount: 3, assignedSeats: [{seatId: "1", unit: 1}, {seatId: "2", unit: 1}, {seatId: "3", unit: 1}], assignedCabins: [], status: "Confirmado", paymentStatus: "Pagado", sellerId: "EMP-01", finalPrice: 1050000, boardingPointId: 'BP01', roomTypeId: "RT03" },
  
  // Reserva Familia Garcia para Cataratas (2026)
  { id: "R-26-002-4", tripId: "T-2026-CATARATAS", passenger: "Carlos Garcia", passengerIds: ["P-28M-GAR", "P-29F-GAR"], paxCount: 2, assignedSeats: [{seatId: "5", unit: 1}, {seatId: "6", unit: 1}], assignedCabins: [], status: "Confirmado", paymentStatus: "Parcial", sellerId: "EMP-02", finalPrice: 560000, boardingPointId: 'BP02', roomTypeId: "RT01" },

  // Reserva Marta Rodriguez para Bariloche (2026)
  { id: "R-26-003-6", tripId: "T-2026-BARILOCHE", passenger: "Marta Rodriguez", passengerIds: ["P-17F-ROD"], paxCount: 1, assignedSeats: [{seatId: "4", unit: 1}], assignedCabins: [], status: "Confirmado", paymentStatus: "Pagado", sellerId: "SELL-EXT-01", finalPrice: 350000, boardingPointId: 'BP03' },
  
  // Reserva Grupo Amigos para Patagonia (2026)
  { id: "R-26-004-7", tripId: "T-2026-PATAGONIA", passenger: "Valeria Gomez", passengerIds: ["P-35F-GOM", "P-36F-ROM"], paxCount: 2, assignedSeats: [], assignedCabins: [], status: "Confirmado", paymentStatus: "Pagado", sellerId: "EMP-03", finalPrice: 1100000, roomTypeId: "RT02" },

  // Reserva individual pendiente para Cataratas (2026)
  { id: "R-26-005-9", tripId: "T-2026-CATARATAS", passenger: "Ricardo Flores", passengerIds: ["P-25M-FLO"], paxCount: 1, assignedSeats: [], assignedCabins: [], status: "Pendiente", paymentStatus: "Pendiente", sellerId: "unassigned", finalPrice: 280000 },
  
  // Reserva para el Crucero (2026)
  { id: "R-26-006-10", tripId: "T-2026-CRUCERO-SUR", passenger: "Lorena Castro", passengerIds: ["P-40F-CAS"], paxCount: 1, assignedSeats: [], assignedCabins: [{cabinId: "C101", unit: 1}], status: "Confirmado", paymentStatus: "Pagado", sellerId: "8jb6LkWA1MhJWzMdMJKxowKDHG82", finalPrice: 1250000, roomTypeId: 'RT01', pensionId: 'pension-completa'},
];


export const mockTickets: Ticket[] = []; // Se genera dinámicamente

    
