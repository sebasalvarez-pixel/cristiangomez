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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  // Recepción ve y gestiona la agenda de todos, igual que admin, pero no puede
  // tocar servicios/precios ni configuración de estilistas (eso sigue solo para admin).
  const canSeeAllStylists = isAdmin || profile?.role === "reception";

  const { data: allStylists } = await supabase
    .from("stylists")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const { data: ownStylist } = await supabase
    .from("stylists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

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

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
  ]);

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
      categories={categories ?? []}
      services={services ?? []}
    />
  );
}
