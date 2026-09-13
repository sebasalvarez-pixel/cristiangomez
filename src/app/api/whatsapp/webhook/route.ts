import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// Verificación inicial del webhook (Meta hace un GET con un challenge al configurarlo).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

// Recibe actualizaciones de estado de los mensajes enviados (sent/delivered/read/failed).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const supabase = createSupabaseServiceClient();

  const statuses =
    body.entry?.flatMap((entry: any) =>
      entry.changes?.flatMap((change: any) => change.value?.statuses ?? [])
    ) ?? [];

  for (const status of statuses) {
    if (!status?.id || !status?.status) continue;
    await supabase
      .from("notification_log")
      .update({ status: status.status })
      .eq("whatsapp_message_id", status.id);
  }

  return NextResponse.json({ ok: true });
}
