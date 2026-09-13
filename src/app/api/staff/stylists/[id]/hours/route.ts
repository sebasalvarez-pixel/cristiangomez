import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await admin.supabase.from("business_hours").delete().eq("stylist_id", id);

  if (parsed.data.hours.length > 0) {
    const { error } = await admin.supabase.from("business_hours").insert(
      parsed.data.hours.map((h) => ({
        stylist_id: id,
        day_of_week: h.dayOfWeek,
        start_time: h.startTime,
        end_time: h.endTime,
      }))
    );
    if (error) return NextResponse.json({ error: "No se pudo guardar el horario" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
