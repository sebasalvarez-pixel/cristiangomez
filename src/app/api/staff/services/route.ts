import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, categoryId, name, description, durationMinutes, priceCents } = parsed.data;

  const payload = {
    category_id: categoryId,
    name,
    description: description ?? null,
    duration_minutes: durationMinutes,
    price_cents: priceCents,
  };

  const { error } = id
    ? await admin.supabase.from("services").update(payload).eq("id", id)
    : await admin.supabase.from("services").insert(payload);

  if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
