const GRAPH_VERSION = "v21.0";

interface SendTemplateArgs {
  to: string; // E.164, ej: +573001234567
  template: string;
  languageCode?: string;
  bodyParams: string[];
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  dryRun: boolean;
}

function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Envía un mensaje de plantilla de WhatsApp vía Cloud API de Meta.
 * Si no hay credenciales configuradas (desarrollo local), simula el envío
 * dejando el mensaje en consola para poder probar el flujo completo.
 */
export async function sendWhatsAppTemplate({
  to,
  template,
  languageCode = "es_CO",
  bodyParams,
}: SendTemplateArgs): Promise<SendResult> {
  if (!isConfigured()) {
    console.log(
      `[whatsapp:dry-run] to=${to} template=${template} params=${JSON.stringify(bodyParams)}`
    );
    return { ok: true, dryRun: true, messageId: `dry-run-${Date.now()}` };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace("+", ""),
          type: "template",
          template: {
            name: template,
            language: { code: languageCode },
            components: [
              {
                type: "body",
                parameters: bodyParams.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, dryRun: false, error: JSON.stringify(data) };
    }

    return { ok: true, dryRun: false, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, dryRun: false, error: (err as Error).message };
  }
}

export function whatsappConfigured() {
  return isConfigured();
}
