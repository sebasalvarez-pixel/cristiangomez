import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) payload.display_name = parsed.data.displayName;
  if (parsed.data.color !== undefined) payload.color = parsed.data.color;
  if (parsed.data.isActive !== undefined) payload.is_active = parsed.data.isActive;

  const { error } = await admin.supabase.from("stylists").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
