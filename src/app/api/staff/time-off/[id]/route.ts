import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "No autorizado" }, { status: admin.status });

  const { id } = await params;
  const { error } = await admin.supabase.from("time_off").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
