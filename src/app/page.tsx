import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function summarizeOpenDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return "Consulta disponibilidad al reservar";
  // Agrupa días consecutivos (ej: 2,3,4,5,6 -> "Mar a Sáb")
  const ranges: [number, number][] = [];
  for (const d of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else ranges.push([d, d]);
  }
  return ranges
    .map(([a, b]) => (a === b ? DAY_LABELS[a] : `${DAY_LABELS[a]} a ${DAY_LABELS[b]}`))
    .join(", ");
}

export default async function Home() {
  const supabase = createSupabaseServiceClient();

  const [{ data: categories }, { data: services }, { data: stylists }, { data: hours }] =
    await Promise.all([
      supabase.from("service_categories").select("id, name").order("sort_order"),
      supabase.from("services").select("category_id, duration_minutes").eq("is_active", true),
      supabase
        .from("stylists")
        .select("id, display_name, color")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("business_hours").select("day_of_week, start_time, end_time"),
    ]);

  const openDaysLabel = summarizeOpenDays((hours ?? []).map((h) => h.day_of_week));
  // Rango general: la hora más temprana y más tardía entre todos los estilistas
  // (cada uno puede tener su propio horario, esto es solo un aproximado para la vitrina).
  const hourRange =
    hours && hours.length > 0
      ? {
          start_time: hours.reduce((min, h) => (h.start_time < min ? h.start_time : min), hours[0].start_time),
          end_time: hours.reduce((max, h) => (h.end_time > max ? h.end_time : max), hours[0].end_time),
        }
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center px-6 py-20 text-center">
        <Image
          src="/logo-mark.png"
          alt="Christian Gómez"
          width={335}
          height={257}
          priority
          className="mb-8 h-16 w-auto"
        />
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted">Neiva · Huila</p>
        <h1 className="font-display max-w-md text-4xl italic leading-tight sm:text-5xl">
          Christian Gómez
          <span className="mt-3 block text-lg font-sans font-medium not-italic tracking-[0.2em] text-muted">
            PELUQUERÍA · ASESOR DE IMAGEN
          </span>
        </h1>

        <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted">
          Cortes, color, alisados e hidratación con Christian, Fernando, Diany y
          Linci. Reserva tu cita en segundos.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/reservar">Reservar cita</ButtonLink>
          <ButtonLink href="/staff/login" variant="secondary">
            Acceso staff
          </ButtonLink>
        </div>

        {/* Servicios */}
        <section className="mt-28 w-full max-w-3xl">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">Lo que hacemos</p>
          <h2 className="font-display text-3xl italic">Servicios</h2>

          <div className="mt-10 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {(categories ?? []).map((category) => {
              const categoryServices = (services ?? []).filter(
                (s) => s.category_id === category.id
              );
              if (categoryServices.length === 0) return null;
              const minMinutes = Math.min(...categoryServices.map((s) => s.duration_minutes));
              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-border px-6 py-5"
                >
                  <p className="text-base font-medium">{category.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {categoryServices.length} servicio{categoryServices.length === 1 ? "" : "s"} ·
                    desde {formatDuration(minMinutes)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Equipo */}
        <section className="mt-24 w-full max-w-3xl">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">Quiénes somos</p>
          <h2 className="font-display text-3xl italic">Nuestro equipo</h2>

          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {(stylists ?? []).map((stylist) => (
              <div key={stylist.id} className="flex flex-col items-center gap-3">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium text-white"
                  style={{ backgroundColor: stylist.color }}
                >
                  {stylist.display_name.charAt(0)}
                </div>
                <p className="text-sm font-medium">{stylist.display_name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Visítanos */}
        <section className="mt-24 w-full max-w-md">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">Encuéntranos</p>
          <h2 className="font-display text-3xl italic">Visítanos</h2>

          <div className="mt-10 rounded-2xl border border-border px-6 py-6 text-sm">
            <p className="font-medium">Carrera 19 # 8 -28, Barrio Cálixto</p>
            <p className="text-muted">Neiva, Huila</p>
            {hourRange && (
              <p className="mt-4 text-muted">
                {openDaysLabel} · {hourRange.start_time.slice(0, 5)} a{" "}
                {hourRange.end_time.slice(0, 5)}
              </p>
            )}
            <a
              href="https://www.google.com/maps/search/?api=1&query=Carrera+19+%23+8-28,+Barrio+C%C3%A1lixto,+Neiva,+Huila"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs underline underline-offset-4"
            >
              Cómo llegar
            </a>
          </div>
        </section>

        <div className="mt-24">
          <ButtonLink href="/reservar">Reservar mi cita</ButtonLink>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        Carrera 19 # 8 -28, Barrio Cálixto, Neiva-Huila
      </footer>
    </div>
  );
}
