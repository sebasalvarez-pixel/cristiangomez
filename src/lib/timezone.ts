/**
 * El salón opera en horario de Colombia (America/Bogota, UTC-5 todo el año, sin
 * horario de verano). El servidor (Vercel) corre en UTC, así que toda esta lógica
 * está aislada aquí para no depender de la zona horaria del proceso donde corra.
 */
const BOGOTA_OFFSET_HOURS = 5;

/** Convierte una fecha calendario + hora "de pared" en Bogotá a un instante UTC real. */
export function bogotaWallClockToUtc(dateIso: string, hhmm: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + BOGOTA_OFFSET_HOURS, minute));
}

/** Día de la semana (0=domingo..6=sábado) de una fecha "YYYY-MM-DD", sin ambigüedad de zona horaria. */
export function dayOfWeekForDateIso(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

/** Rango UTC [inicio, fin) que cubre un día calendario completo en hora de Bogotá. */
export function bogotaDayRangeUtc(dateIso: string): { startIso: string; endIso: string } {
  const start = bogotaWallClockToUtc(dateIso, "00:00");
  const [year, month, day] = dateIso.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateIso = nextDay.toISOString().slice(0, 10);
  const end = bogotaWallClockToUtc(nextDateIso, "00:00");
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Fecha calendario ("YYYY-MM-DD") en Bogotá correspondiente a un instante UTC. */
export function utcToBogotaDateIso(date: Date): string {
  const shifted = new Date(date.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formatea un instante UTC como fecha/hora legible en Bogotá (para WhatsApp, etc), sin depender del TZ del proceso. */
export function formatBogota(date: Date, opts: { withWeekday?: boolean } = {}): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: opts.withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(date);
}
