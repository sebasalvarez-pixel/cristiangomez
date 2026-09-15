import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WHATSAPP_NUMBER = "573102380195";
const WHATSAPP_MESSAGE = "Hola Christian, quiero una asesoría para ";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const MAPS_DESTINATION = "2.9317351,-75.2769501";
const DIRECTIONS_HREF = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_DESTINATION}`;
const INSTAGRAM_HREF = "https://www.instagram.com/christiangomezj/";

function summarizeOpenDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return "Consulta disponibilidad al escribirnos";
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
      {/*
        Video hero horizontal (16:9), a todo el ancho. En cuanto tengan el archivo,
        reemplazar este div por:
        <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster="/video-poster.jpg">
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      */}
      <div className="relative flex aspect-video w-full items-center justify-center bg-muted-bg sm:aspect-[21/9]">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <Image src="/logo-mark.png" alt="" width={335} height={257} className="h-10 w-auto" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Video próximamente</p>
        </div>
      </div>

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
          Colorista internacional. Asesoría de imagen, balayage, alisados y looks
          para novias y quinceañeras — con más de 15 años de experiencia.
        </p>

        <div className="mt-10">
          <ButtonLink href={WHATSAPP_HREF} external className="px-10">
            Recibe tu asesoría
          </ButtonLink>
        </div>

        {/* Sobre Christian */}
        <section className="mt-28 w-full max-w-4xl">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">Sobre Christian</p>
          <h2 className="font-display text-3xl italic">15+ años transformando imágenes</h2>

          <div className="mt-10 grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            <video
              className="mx-auto aspect-[9/16] w-full max-w-[300px] rounded-2xl object-cover"
              controls
              playsInline
              preload="metadata"
              poster="/videos/sobre-christian-poster.jpg"
            >
              <source src="/videos/sobre-christian.mp4" type="video/mp4" />
            </video>

            <div className="text-left">
              <p className="text-sm leading-relaxed text-muted">
                Colorista internacional, especializado en asesoría de imagen y colorimetría.
                Christian y su equipo han vestido cientos de looks para bodas, quinceañeras,
                eventos sociales y el día a día de mujeres que quieren verse y sentirse
                seguras de sí mismas.
              </p>
              <a
                href={INSTAGRAM_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-xs uppercase tracking-wide underline underline-offset-4"
              >
                Ver trabajos en Instagram ↗
              </a>
            </div>
          </div>
        </section>

        {/* Portafolio */}
        <section className="mt-24 w-full max-w-3xl">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">Su trabajo</p>
          <h2 className="font-display text-3xl italic">Portafolio</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-2xl bg-muted-bg"
              >
                <Image src="/logo-mark.png" alt="" width={335} height={257} className="h-8 w-auto opacity-30" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Próximamente: fotos de trabajos reales</p>
        </section>

        {/* Servicios */}
        <section className="mt-24 w-full max-w-3xl">
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
              href={DIRECTIONS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs underline underline-offset-4"
            >
              Cómo llegar
            </a>
          </div>
        </section>

        <div className="mt-24">
          <ButtonLink href={WHATSAPP_HREF} external className="px-10">
            Recibe tu asesoría
          </ButtonLink>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        <p>Carrera 19 # 8 -28, Barrio Cálixto, Neiva-Huila</p>
        <Link href="/staff/login" className="mt-2 inline-block underline underline-offset-4">
          Acceso staff
        </Link>
      </footer>
    </div>
  );
}
