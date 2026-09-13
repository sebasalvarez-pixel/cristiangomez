import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };

  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { ok: false as const, status: 403 as const };

  return { ok: true as const, userId: user.id, supabase };
}
