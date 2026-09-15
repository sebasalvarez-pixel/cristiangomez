export type UserRole = "admin" | "stylist";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type NotificationType =
  | "confirmation"
  | "reminder_24h"
  | "reminder_2h"
  | "cancellation";

export interface ServiceCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
}

export interface Stylist {
  id: string;
  profile_id: string | null;
  display_name: string;
  avatar_url: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export interface BusinessHour {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone_e164: string;
  notes: string | null;
}

export interface Appointment {
  id: string;
  client_id: string;
  stylist_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  manage_token: string;
  created_at: string;
}

export interface AppointmentService {
  appointment_id: string;
  service_id: string;
  name_at_booking: string;
  price_cents_at_booking: number;
  duration_minutes_at_booking: number;
}

export interface AppointmentWithDetails extends Appointment {
  client: Client;
  stylist: Stylist;
  services: AppointmentService[];
}

export function formatCOP(cents: number): string {
  if (cents <= 0) return "Cotizar";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Muestra la duración en horas cuando llega o pasa de 1h (ej: "4 h", "3 h 30 min"); en minutos si es menor. */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
