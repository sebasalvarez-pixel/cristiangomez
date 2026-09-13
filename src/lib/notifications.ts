import { format } from "date-fns";
import { es } from "date-fns/locale";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";

const SALON_ADDRESS = "Carrera 19 # 8 -28, Barrio Cálixto, Neiva-Huila";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function formatDateTime(iso: string) {
  return format(new Date(iso), "EEEE d 'de' MMMM, h:mm a", { locale: es });
}

interface NotifyArgs {
  appointmentId: string;
  type: NotificationType;
  clientPhoneE164: string;
  clientName: string;
  stylistName: string;
  serviceNames: string[];
  startTimeIso: string;
  manageToken: string;
}

const TEMPLATE_BY_TYPE: Record<NotificationType, string> = {
  confirmation: "cita_confirmada",
  reminder_24h: "recordatorio_cita",
  reminder_2h: "recordatorio_cita",
  cancellation: "cita_cancelada",
};

export async function notifyAppointment(args: NotifyArgs) {
  const supabase = createSupabaseServiceClient();
  const when = formatDateTime(args.startTimeIso);
  const servicesText = args.serviceNames.join(", ");
  const manageUrl = `${SITE_URL}/mi-cita/${args.manageToken}`;

  const bodyParams =
    args.type === "cancellation"
      ? [args.clientName, servicesText, when]
      : [args.clientName, servicesText, args.stylistName, when, SALON_ADDRESS, manageUrl];

  const result = await sendWhatsAppTemplate({
    to: args.clientPhoneE164,
    template: TEMPLATE_BY_TYPE[args.type],
    bodyParams,
  });

  await supabase.from("notification_log").insert({
    appointment_id: args.appointmentId,
    type: args.type,
    status: result.ok ? "sent" : "failed",
    whatsapp_message_id: result.messageId ?? null,
    error: result.error ?? null,
  });

  return result;
}
