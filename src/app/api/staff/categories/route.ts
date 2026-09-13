import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({ name: z.string().min(2).max(80) });

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await admin.supabase
    .from("service_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { error } = await admin.supabase.from("service_categories").insert({
    name: parsed.data.name,
    sort_order: (existing?.[0]?.sort_order ?? 0) + 1,
  });

  if (error) return NextResponse.json({ error: "No se pudo crear" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
