import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { AgendaView } from "@/components/staff/AgendaView";
import { bogotaDayRangeUtc, utcToBogotaDateIso } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; stylist?: string }>;
}) {
  const { date, stylist: stylistParam } = await searchParams;
  const dateIso = date ?? utcToBogotaDateIso(new Date());

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

  const { startIso, endIso } = bogotaDayRangeUtc(dateIso);

  let query = supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, notes, clients(full_name, phone_e164), stylists(display_name, color), appointment_services(name_at_booking, price_cents_at_booking)"
    )
    .gte("start_time", startIso)
    .lt("start_time", endIso)
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
