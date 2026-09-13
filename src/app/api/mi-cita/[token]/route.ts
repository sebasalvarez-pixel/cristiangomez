import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notifications";

async function fetchAppointment(token: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, manage_token, clients(full_name, phone_e164), stylists(display_name), appointment_services(name_at_booking, price_cents_at_booking)"
    )
    .eq("manage_token", token)
    .single();
  return data;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await fetchAppointment(token);

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const appointment = await fetchAppointment(token);

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  if (appointment.status === "cancelled") {
    return NextResponse.json({ appointment });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("manage_token", token);

  if (error) {
    return NextResponse.json({ error: "No se pudo cancelar" }, { status: 500 });
  }

  const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients;
  const stylist = Array.isArray(appointment.stylists) ? appointment.stylists[0] : appointment.stylists;
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

  return NextResponse.json({ ok: true });
}
