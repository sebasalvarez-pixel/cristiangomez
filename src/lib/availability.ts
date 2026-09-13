import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { bogotaDayRangeUtc, bogotaWallClockToUtc, dayOfWeekForDateIso } from "@/lib/timezone";

const SLOT_STEP_MINUTES = 15;

interface Range {
  start: Date;
  end: Date;
}

function overlaps(a: Range, b: Range) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Calcula los horarios de inicio disponibles para un estilista en una fecha dada,
 * dado el total de minutos que ocupan los servicios elegidos. Todo el cálculo de
 * horario laboral asume hora de Bogotá (UTC-5), sin importar en qué zona horaria
 * corra el servidor.
 */
export async function getAvailableSlots(
  stylistId: string,
  dateIso: string, // "2026-09-20"
  totalDurationMinutes: number
): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const dayOfWeek = dayOfWeekForDateIso(dateIso);
  const { startIso, endIso } = bogotaDayRangeUtc(dateIso);

  const [{ data: hours }, { data: timeOff }, { data: existingAppointments }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("start_time, end_time")
      .eq("stylist_id", stylistId)
      .eq("day_of_week", dayOfWeek),
    supabase
      .from("time_off")
      .select("starts_at, ends_at")
      .eq("stylist_id", stylistId)
      .gte("ends_at", startIso)
      .lte("starts_at", endIso),
    supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("stylist_id", stylistId)
      .neq("status", "cancelled")
      .gte("start_time", startIso)
      .lt("start_time", endIso),
  ]);

  if (!hours || hours.length === 0) return [];

  const busyRanges: Range[] = [
    ...(timeOff ?? []).map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
    ...(existingAppointments ?? []).map((a) => ({
      start: new Date(a.start_time),
      end: new Date(a.end_time),
    })),
  ];

  const now = new Date();
  const slots: string[] = [];

  for (const window of hours) {
    const windowStart = bogotaWallClockToUtc(dateIso, window.start_time.slice(0, 5));
    const windowEnd = bogotaWallClockToUtc(dateIso, window.end_time.slice(0, 5));

    for (
      let candidate = new Date(windowStart);
      candidate.getTime() + totalDurationMinutes * 60_000 <= windowEnd.getTime();
      candidate = new Date(candidate.getTime() + SLOT_STEP_MINUTES * 60_000)
    ) {
      if (candidate < now) continue;

      const candidateRange: Range = {
        start: candidate,
        end: new Date(candidate.getTime() + totalDurationMinutes * 60_000),
      };

      const hasConflict = busyRanges.some((busy) => overlaps(candidateRange, busy));
      if (!hasConflict) {
        slots.push(candidate.toISOString());
      }
    }
  }

  return slots;
}
