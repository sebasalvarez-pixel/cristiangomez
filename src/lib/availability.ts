import { createSupabaseServiceClient } from "@/lib/supabase/server";

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
 * dado el total de minutos que ocupan los servicios elegidos.
 */
export async function getAvailableSlots(
  stylistId: string,
  dateIso: string, // "2026-09-20"
  totalDurationMinutes: number
): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const date = new Date(`${dateIso}T00:00:00`);
  const dayOfWeek = date.getDay();

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
      .gte("ends_at", `${dateIso}T00:00:00`)
      .lte("starts_at", `${dateIso}T23:59:59`),
    supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("stylist_id", stylistId)
      .neq("status", "cancelled")
      .gte("start_time", `${dateIso}T00:00:00`)
      .lte("start_time", `${dateIso}T23:59:59`),
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
    const [startH, startM] = window.start_time.split(":").map(Number);
    const [endH, endM] = window.end_time.split(":").map(Number);

    const windowStart = new Date(date);
    windowStart.setHours(startH, startM, 0, 0);
    const windowEnd = new Date(date);
    windowEnd.setHours(endH, endM, 0, 0);

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
