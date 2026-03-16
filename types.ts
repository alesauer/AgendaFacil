export type UserRole = 'CLIENT' | 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  active?: boolean;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  imageUrl?: string;
  iconName?: string;
  isPromo?: boolean;
  promoPrice?: number;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  iconName?: string;
  specialties: string[]; // Service IDs
}

export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';

export interface Appointment {
  id: string;
  serviceId: string;
  professionalId: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  status: AppointmentStatus;
  totalValue: number;
  paymentMethod?: 'PIX' | 'CREDIT_CARD';
  isAllDay?: boolean;
  blockReason?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  timestamp: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  birthday?: string; // YYYY-MM-DD
  totalSpent: number;
  haircutsCount: number;
  lastVisit?: string; // YYYY-MM-DD
}

export interface DashboardStats {
  totalRevenue: number;
  totalAppointments: number;
  topService: string;
  cancelRate: number;
}

export interface BusinessHour {
  dayOfWeek: number;
  day: string;
  open: boolean;
  start: string;
  end: string;
}

export interface BrandIdentity {
  name: string;
  logoUrl?: string;
  iconName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}