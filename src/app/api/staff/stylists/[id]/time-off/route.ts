import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { bogotaDayRangeUtc } from "@/lib/timezone";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, reason } = parsed.data;
  if (endDate < startDate) {
    return NextResponse.json({ error: "La fecha final no puede ser antes de la inicial" }, { status: 400 });
  }

  const startsAt = bogotaDayRangeUtc(startDate).startIso;
  const endsAt = bogotaDayRangeUtc(endDate).endIso;

  const { error } = await admin.supabase.from("time_off").insert({
    stylist_id: id,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: reason || null,
  });

  if (error) return NextResponse.json({ error: "No se pudo guardar el bloqueo" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
