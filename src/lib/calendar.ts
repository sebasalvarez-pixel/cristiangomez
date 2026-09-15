import { dayOfWeekForDateIso } from "@/lib/timezone";

function parseIso(dateIso: string) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return { y, m, d };
}

function toIso(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function addDaysIso(dateIso: string, days: number): string {
  const { y, m, d } = parseIso(dateIso);
  return toIso(y, m, d + days);
}

export function addMonthsIso(dateIso: string, months: number): string {
  const { y, m, d } = parseIso(dateIso);
  return toIso(y, m + months, d);
}

/** Los 7 días (domingo a sábado) de la semana que contiene dateIso. */
export function getWeekDates(dateIso: string): string[] {
  const dow = dayOfWeekForDateIso(dateIso);
  const sunday = addDaysIso(dateIso, -dow);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(sunday, i));
}

/** Primer y último día del mes que contiene dateIso. */
export function getMonthBounds(dateIso: string): { firstDay: string; lastDay: string } {
  const { y, m } = parseIso(dateIso);
  const firstDay = toIso(y, m, 1);
  const lastDay = addDaysIso(toIso(y, m + 1, 1), -1);
  return { firstDay, lastDay };
}

/** Grilla de semanas (domingo a sábado) para el calendario mensual, recortando semanas finales vacías. */
export function getMonthGrid(dateIso: string): { dateIso: string; inMonth: boolean }[][] {
  const { m } = parseIso(dateIso);
  const { firstDay } = getMonthBounds(dateIso);
  const gridStart = addDaysIso(firstDay, -dayOfWeekForDateIso(firstDay));

  const weeks: { dateIso: string; inMonth: boolean }[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = Array.from({ length: 7 }, () => {
      const cell = { dateIso: cursor, inMonth: parseIso(cursor).m === m };
      cursor = addDaysIso(cursor, 1);
      return cell;
    });
    weeks.push(week);
  }
  while (weeks.length > 1 && weeks[weeks.length - 1].every((c) => !c.inMonth)) {
    weeks.pop();
  }
  return weeks;
}
