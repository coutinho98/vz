export type Role = 'ORGANIZER' | 'CUSTOMER' | 'GATE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface CatalogItem {
  ref: string;
  category: 'MOVIE' | 'SHOW';
  title: string;
  description: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genre: string | null;
}

export interface CatalogResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  source: 'tmdb' | 'fallback' | 'local';
}

export interface EventAvailability {
  total: number;
  available: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  category: 'MOVIE' | 'SHOW';
  venue: string;
  city: string;
  startsAt: string;
  seatingMode: 'SEATED' | 'STANDING';
  rowsCount: number | null;
  seatsPerRow: number | null;
  capacity: number | null;
  priceCents: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  createdAt: string;
  organizer?: { name: string };
  availability?: EventAvailability;
  _count?: { tickets: number; reservations: number };
}

export interface EventsPage {
  items: EventItem[];
  page: number;
  totalPages: number;
  total: number;
}

export interface SeatMapSeat {
  id: string;
  number: number;
  status: 'FREE' | 'TAKEN';
}

export interface SeatMap {
  seatingMode: 'SEATED' | 'STANDING';
  rows: { row: string; seats: SeatMapSeat[] }[];
}

export interface ReservationSeat {
  id: string;
  row: string;
  number: number;
}

export interface Reservation {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  quantity: number;
  totalCents: number;
  expiresAt: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    startsAt: string;
    posterUrl: string | null;
  };
  seats?: ReservationSeat[];
}

export interface Payment {
  id: string;
  status: 'APPROVED' | 'DECLINED';
  cardBrand: string;
  cardLast4: string;
  amountCents: number;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  seatLabel: string | null;
  quantity: number;
  status: 'VALID' | 'USED' | 'CANCELLED';
  checkedInAt: string | null;
  createdAt: string;
  event: {
    title: string;
    venue: string;
    city: string;
    startsAt: string;
    posterUrl: string | null;
    category: 'MOVIE' | 'SHOW';
  };
}

export interface PublicTicket {
  code: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  seatLabel: string | null;
  quantity: number;
  checkedInAt: string | null;
  event: Ticket['event'];
  holderFirstName: string;
}

export interface PayResponse {
  outcome: 'APPROVED' | 'DECLINED';
  declineCode?: string;
  declineMessage?: string;
  payment: Payment;
  tickets: Ticket[];
}

export type CheckInStatus = 'VALID' | 'ALREADY_USED' | 'INVALID';

export interface CheckInResponse {
  status: CheckInStatus;
  reason?: 'NOT_FOUND' | 'WRONG_EVENT' | 'CANCELLED';
  message: string;
  ticket?: {
    code: string;
    seatLabel: string | null;
    quantity: number;
    holderFirstName: string;
    checkedInAt: string | null;
  };
}
