import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { ServicesManager } from "@/components/staff/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/staff/agenda");

  const supabase = createSupabaseServiceClient();
  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort_order"),
    supabase.from("services").select("*").order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display mb-6 text-xl italic">Servicios</h1>
      <ServicesManager categories={categories ?? []} services={services ?? []} />
    </div>
  );
}
