export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Mobile Banking' | 'Card';
  status: 'Paid' | 'Partial' | 'Due';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'booking' | 'payment' | 'system';
  read: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  preferredContactMethod?: 'WhatsApp' | 'Phone' | 'Email';
  notes?: string;
  status: 'Active' | 'Inactive';
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  teamName: string;
  date: string;
  time: string;
  duration: string;
  price: number;
  advance: number;
  paymentDeadline?: string;
  type?: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  facility?: string;
}

export const FACILITIES = [
  'Premium Turf Arena (Pitch 1)',
  'Galaxy Futsal Court (Pitch 2)',
  'VIP Turf Pitch (Pitch 3)'
] as const;

