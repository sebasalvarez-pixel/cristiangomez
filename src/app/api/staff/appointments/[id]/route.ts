import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, stylist_id, start_time, manage_token, status, clients(full_name, phone_e164), stylists(display_name, profile_id), appointment_services(name_at_booking)"
    )
    .eq("id", id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  const stylist = Array.isArray(appointment.stylists) ? appointment.stylists[0] : appointment.stylists;
  const isOwner = stylist.profile_id === user.id;
  const canManageAny = profile?.role === "admin" || profile?.role === "reception";

  if (!canManageAny && !isOwner) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }

  if (parsed.data.status === "cancelled" && appointment.status !== "cancelled") {
    const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients;
    const services = appointment.appointment_services ?? [];
    await notifyAppointment({
      appointmentId: appointment.id,
      type: "cancellation",
      clientPhoneE164: client.phone_e164,
      clientName: client.full_name,
      stylistName: stylist.display_name,
      serviceNames: services.map((s) => s.name_at_booking),
      startTimeIso: appointment.start_time,
      manageToken: appointment.manage_token,
    });
  }

  return NextResponse.json({ ok: true });
}
