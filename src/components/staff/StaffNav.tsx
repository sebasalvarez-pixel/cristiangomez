"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function StaffNav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/staff/agenda", label: "Agenda" },
    ...(role === "admin"
      ? [
          { href: "/staff/servicios", label: "Servicios" },
          { href: "/staff/estilistas", label: "Estilistas" },
        ]
      : []),
  ];

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/staff/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
      <div className="flex items-center gap-6">
        <Link href="/staff/agenda" className="font-display text-lg italic">
          CG
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "pb-1",
                pathname.startsWith(link.href)
                  ? "border-b-2 border-foreground font-medium"
                  : "text-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="hidden text-muted sm:inline">{name}</span>
        <button onClick={handleLogout} className="text-xs underline underline-offset-4">
          Salir
        </button>
      </div>
    </header>
  );
}
