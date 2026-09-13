import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { StylistsManager } from "@/components/staff/StylistsManager";

export const dynamic = "force-dynamic";

export default async function EstilistasPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/staff/agenda");

  const supabase = createSupabaseServiceClient();
  const [{ data: stylists }, { data: hours }] = await Promise.all([
    supabase.from("stylists").select("*").order("sort_order"),
    supabase.from("business_hours").select("*"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display mb-6 text-xl italic">Estilistas</h1>
      <StylistsManager stylists={stylists ?? []} hours={hours ?? []} />
    </div>
  );
}
