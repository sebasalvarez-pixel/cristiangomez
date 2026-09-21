import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { AgendaView } from "@/components/staff/AgendaView";
import { bogotaDayRangeUtc, utcToBogotaDateIso } from "@/lib/timezone";
import { getMonthBounds, getWeekDates } from "@/lib/calendar";

export const dynamic = "force-dynamic";

type ViewMode = "day" | "week" | "month";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; stylist?: string; view?: string }>;
}) {
  const { date, stylist: stylistParam, view: viewParam } = await searchParams;
  const dateIso = date ?? utcToBogotaDateIso(new Date());
  const view: ViewMode =
    viewParam === "week" || viewParam === "month" ? viewParam : "day";

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();

  // Todas estas consultas son independientes entre sí (solo dependen de user.id, ya
  // resuelto arriba), así que van en paralelo en vez de una tras otra.
  const [
    { data: profile },
    { data: allStylists },
    { data: ownStylist },
    { data: categories },
    { data: services },
    { data: hoursRows },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("stylists").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("stylists").select("id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("service_categories").select("*").order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("business_hours").select("stylist_id, day_of_week"),
  ]);

  const workingDays: Record<string, number[]> = {};
  for (const row of hoursRows ?? []) {
    (workingDays[row.stylist_id] ??= []).push(row.day_of_week);
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-xl italic">Tu cuenta aún no tiene un perfil de staff</p>
        <p className="mt-3 text-sm text-muted">
          Pídele a Christian que active tu acceso para poder ver y crear citas.
        </p>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";
  // Recepción ve y gestiona la agenda de todos, igual que admin, pero no puede
  // tocar servicios/precios ni configuración de estilistas (eso sigue solo para admin).
  const canSeeAllStylists = isAdmin || profile?.role === "reception";

  const visibleStylists = canSeeAllStylists
    ? allStylists ?? []
    : (allStylists ?? []).filter((s) => s.id === ownStylist?.id);

  const activeStylistId = canSeeAllStylists ? stylistParam ?? "all" : ownStylist?.id ?? "";

  // El rango a consultar depende de la vista: un día, la semana (dom-sáb) o el mes completo.
  let rangeStartIso: string;
  let rangeEndIso: string;
  if (view === "week") {
    const week = getWeekDates(dateIso);
    rangeStartIso = bogotaDayRangeUtc(week[0]).startIso;
    rangeEndIso = bogotaDayRangeUtc(week[6]).endIso;
  } else if (view === "month") {
    const { firstDay, lastDay } = getMonthBounds(dateIso);
    rangeStartIso = bogotaDayRangeUtc(firstDay).startIso;
    rangeEndIso = bogotaDayRangeUtc(lastDay).endIso;
  } else {
    const day = bogotaDayRangeUtc(dateIso);
    rangeStartIso = day.startIso;
    rangeEndIso = day.endIso;
  }

  let query = supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, notes, clients(full_name, phone_e164), stylists(display_name, color), appointment_services(name_at_booking, price_cents_at_booking)"
    )
    .gte("start_time", rangeStartIso)
    .lt("start_time", rangeEndIso)
    .order("start_time");

  if (activeStylistId && activeStylistId !== "all") {
    query = query.eq("stylist_id", activeStylistId);
  } else if (!canSeeAllStylists) {
    query = query.eq("stylist_id", ownStylist?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data: appointments } = await query;

  // En vista Día, si hoy está vacío no queremos que parezca que no hay nada agendado
  // en general — avisamos cuántas citas hay en los próximos 7 días (fuera de hoy).
  let upcomingCount = 0;
  if (view === "day") {
    // rangeEndIso ya es el inicio de "mañana" en Bogotá (límite exclusivo del día de hoy).
    const weekAhead = new Date(new Date(rangeEndIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let upcomingQuery = supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_time", rangeEndIso)
      .lt("start_time", weekAhead)
      .neq("status", "cancelled");
    if (activeStylistId && activeStylistId !== "all") {
      upcomingQuery = upcomingQuery.eq("stylist_id", activeStylistId);
    } else if (!canSeeAllStylists) {
      upcomingQuery = upcomingQuery.eq("stylist_id", ownStylist?.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { count } = await upcomingQuery;
    upcomingCount = count ?? 0;
  }

  const normalizedAppointments = (appointments ?? []).map((appt) => {
    const client = Array.isArray(appt.clients) ? appt.clients[0] : appt.clients;
    const stylist = Array.isArray(appt.stylists) ? appt.stylists[0] : appt.stylists;
    return {
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.status,
      notes: appt.notes,
      clients: client,
      stylists: stylist,
      appointment_services: appt.appointment_services ?? [],
    };
  });

  return (
    <AgendaView
      view={view}
      dateIso={dateIso}
      isAdmin={canSeeAllStylists}
      stylists={visibleStylists}
      activeStylistId={activeStylistId}
      appointments={normalizedAppointments}
      upcomingCount={upcomingCount}
      categories={categories ?? []}
      services={services ?? []}
      workingDays={workingDays}
    />
  );
}
