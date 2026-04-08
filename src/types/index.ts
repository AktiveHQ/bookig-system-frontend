export interface Business {
  id: string;
  name: string;
  description: string;
  country: string;
  city: string;
  address: string;
  email: string;
  phone?: string;
  headerImageUrl?: string | null;
  idVerificationType?: 'NIN' | 'PASSPORT' | 'VOTERS_CARD' | null;
  idDocumentData?: string | null;
  cacDocumentData?: string | null;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  verificationComment?: string | null;
  feeHandling: 'customer' | 'business';
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  slug: string;
}

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: string;
  businessId?: number | null;
}

export interface Appointment {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availableDays: number[]; // 0=Sun, 1=Mon, ...
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  duration: number; // minutes
  maxBookingsPerSlot: number;
  messageForClients?: string;
  createdAt: string;
  paused?: boolean;
}

export interface Booking {
  id: string;
  appointmentId: string;
  businessSlug: string;
  clientName: string;
  clientEmail: string;
  date: string; // YYYY-MM-DD
  time: string; // "10:00"
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'expired' | 'completed';
  createdAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
