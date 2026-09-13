import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StaffNav } from "@/components/staff/StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <StaffNav name={profile?.full_name ?? "Staff"} role={profile?.role ?? "stylist"} />
      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
