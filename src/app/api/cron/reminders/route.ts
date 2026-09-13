import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyAppointment } from "@/lib/notifications";
import type { NotificationType } from "@/lib/types";

const WINDOWS: { type: NotificationType; hoursBefore: number; toleranceMinutes: number }[] = [
  { type: "reminder_24h", hoursBefore: 24, toleranceMinutes: 15 },
  { type: "reminder_2h", hoursBefore: 2, toleranceMinutes: 15 },
];

/**
 * Se llama cada 15 minutos desde Vercel Cron (ver vercel.json).
 * Por cada ventana de recordatorio, busca citas confirmadas cuyo inicio caiga
 * dentro del rango y que todavía no tengan ese recordatorio enviado.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const now = Date.now();
  let sent = 0;

  for (const window of WINDOWS) {
    const targetTime = now + window.hoursBefore * 60 * 60 * 1000;
    const rangeStart = new Date(targetTime - window.toleranceMinutes * 60_000).toISOString();
    const rangeEnd = new Date(targetTime + window.toleranceMinutes * 60_000).toISOString();

    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        "id, start_time, manage_token, clients(full_name, phone_e164), stylists(display_name), appointment_services(name_at_booking), notification_log(type)"
      )
      .eq("status", "confirmed")
      .gte("start_time", rangeStart)
      .lte("start_time", rangeEnd);

    for (const appt of appointments ?? []) {
      const alreadySent = (appt.notification_log ?? []).some((n) => n.type === window.type);
      if (alreadySent) continue;

      const client = Array.isArray(appt.clients) ? appt.clients[0] : appt.clients;
      const stylist = Array.isArray(appt.stylists) ? appt.stylists[0] : appt.stylists;
      const services = appt.appointment_services ?? [];

      await notifyAppointment({
        appointmentId: appt.id,
        type: window.type,
        clientPhoneE164: client.phone_e164,
        clientName: client.full_name,
        stylistName: stylist.display_name,
        serviceNames: services.map((s) => s.name_at_booking),
        startTimeIso: appt.start_time,
        manageToken: appt.manage_token,
      });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
