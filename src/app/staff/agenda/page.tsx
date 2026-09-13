import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { AgendaView } from "@/components/staff/AgendaView";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; stylist?: string }>;
}) {
  const { date, stylist: stylistParam } = await searchParams;
  const dateIso = date ?? new Date().toISOString().slice(0, 10);

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

  const visibleStylists = isAdmin
    ? allStylists ?? []
    : (allStylists ?? []).filter((s) => s.id === ownStylist?.id);

  const activeStylistId = isAdmin ? stylistParam ?? "all" : ownStylist?.id ?? "";

  let query = supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, notes, clients(full_name, phone_e164), stylists(display_name, color), appointment_services(name_at_booking, price_cents_at_booking)"
    )
    .gte("start_time", `${dateIso}T00:00:00`)
    .lte("start_time", `${dateIso}T23:59:59`)
    .order("start_time");

  if (activeStylistId && activeStylistId !== "all") {
    query = query.eq("stylist_id", activeStylistId);
  } else if (!isAdmin) {
    query = query.eq("stylist_id", ownStylist?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data: appointments } = await query;

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
      isAdmin={isAdmin}
      stylists={visibleStylists}
      activeStylistId={activeStylistId}
      appointments={normalizedAppointments}
    />
  );
}
