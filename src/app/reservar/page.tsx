import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export default async function ReservarPage() {
  const supabase = createSupabaseServiceClient();

  const [{ data: categories }, { data: services }, { data: stylists }, { data: stylistServices }] =
    await Promise.all([
      supabase.from("service_categories").select("*").order("sort_order"),
      supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
      // Solo columnas seguras para el público: sin profile_id ni el WhatsApp del estilista.
      supabase
        .from("stylists")
        .select("id, display_name, avatar_url, color, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("stylist_services").select("*"),
    ]);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <BookingWizard
          categories={categories ?? []}
          services={services ?? []}
          stylists={stylists ?? []}
          stylistServices={stylistServices ?? []}
        />
      </div>
    </div>
  );
}
