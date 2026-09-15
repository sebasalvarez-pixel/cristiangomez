import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAvailableSlots } from "@/lib/availability";
import { notifyAppointment, notifyStylistNewBooking } from "@/lib/notifications";
import { utcToBogotaDateIso } from "@/lib/timezone";

const schema = z.object({
  stylistId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1),
  startTime: z.string(), // ISO
  clientName: z.string().min(2).max(120),
  clientPhone: z.string().min(7).max(20),
  notes: z.string().max(500).optional(),
  notifyClient: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { stylistId, serviceIds, startTime, clientName, notes, notifyClient } = parsed.data;

  const phone = parsePhoneNumberFromString(parsed.data.clientPhone, "CO");
  if (!phone || !phone.isValid()) {
    return NextResponse.json({ error: "Número de celular inválido" }, { status: 400 });
  }
  const phoneE164 = phone.number;

  const supabase = createSupabaseServiceClient();

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .in("id", serviceIds);

  if (servicesError || !services || services.length !== serviceIds.length) {
    return NextResponse.json({ error: "Servicio inválido" }, { status: 400 });
  }

  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
  const start = new Date(startTime);
  const end = new Date(start.getTime() + totalDuration * 60_000);
  const dateIso = utcToBogotaDateIso(start);

  // Estas tres cosas no dependen unas de otras, así que van en paralelo: la
  // re-verificación de disponibilidad (evita choques por concurrencia), los datos
  // del estilista, y el registro/actualización de la clienta.
  const [availableSlots, { data: stylist }, { data: client, error: clientError }] = await Promise.all([
    getAvailableSlots(stylistId, dateIso, totalDuration),
    supabase.from("stylists").select("display_name, phone_e164").eq("id", stylistId).single(),
    supabase
      .from("clients")
      .upsert({ full_name: clientName, phone_e164: phoneE164 }, { onConflict: "phone_e164" })
      .select("id")
      .single(),
  ]);

  if (!availableSlots.includes(start.toISOString())) {
    return NextResponse.json(
      { error: "Ese horario ya no está disponible, elige otro." },
      { status: 409 }
    );
  }

  if (!stylist) {
    return NextResponse.json({ error: "Estilista no encontrado" }, { status: 400 });
  }

  if (clientError || !client) {
    return NextResponse.json({ error: "No se pudo registrar la clienta" }, { status: 500 });
  }

  // Anti-spam: evita que un mismo celular reserve en cadena (por error o abuso),
  // lo cual además dispararía varios mensajes de WhatsApp de pago.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id)
    .neq("status", "cancelled")
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= 3) {
    return NextResponse.json(
      {
        error:
          "Ya tienes varias reservas recientes. Si necesitas otra cita, escríbenos directamente por WhatsApp.",
      },
      { status: 429 }
    );
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      client_id: client.id,
      stylist_id: stylistId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
      notes: notes ?? null,
    })
    .select("id, manage_token")
    .single();

  if (appointmentError) {
    // Choque de horario detectado por la base de datos (dos reservas simultáneas
    // para el mismo estilista y horario) — el código de exclusion_violation es 23P01.
    if (appointmentError.code === "23P01") {
      return NextResponse.json(
        { error: "Ese horario se acaba de ocupar, elige otro." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "No se pudo crear la cita" }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: "No se pudo crear la cita" }, { status: 500 });
  }

  // Guardar el detalle de servicios y avisar por WhatsApp (clienta + estilista) no
  // dependen entre sí, así que corren en paralelo en vez de uno tras otro — eso es
  // justo lo que hace esperar a la clienta más de la cuenta al confirmar.
  await Promise.all([
    supabase.from("appointment_services").insert(
      services.map((s) => ({
        appointment_id: appointment.id,
        service_id: s.id,
        name_at_booking: s.name,
        price_cents_at_booking: s.price_cents,
        duration_minutes_at_booking: s.duration_minutes,
      }))
    ),
    notifyClient
      ? notifyAppointment({
          appointmentId: appointment.id,
          type: "confirmation",
          clientPhoneE164: phoneE164,
          clientName,
          stylistName: stylist.display_name,
          serviceNames: services.map((s) => s.name),
          startTimeIso: start.toISOString(),
          manageToken: appointment.manage_token,
        })
      : Promise.resolve(),
    stylist.phone_e164
      ? notifyStylistNewBooking({
          appointmentId: appointment.id,
          stylistPhoneE164: stylist.phone_e164,
          stylistName: stylist.display_name,
          clientName,
          serviceNames: services.map((s) => s.name),
          startTimeIso: start.toISOString(),
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    appointmentId: appointment.id,
    manageToken: appointment.manage_token,
  });
}
