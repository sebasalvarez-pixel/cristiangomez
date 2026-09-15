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
    <header className="border-b border-border px-4 py-4 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/staff/agenda" className="font-display shrink-0 text-lg italic">
          CG
        </Link>
        <div className="flex min-w-0 items-center gap-3 text-xs sm:gap-4 sm:text-sm">
          <span className="hidden truncate text-muted sm:inline">{name}</span>
          <Link href="/staff/cuenta" className="shrink-0 underline underline-offset-4">
            Mi cuenta
          </Link>
          <button onClick={handleLogout} className="shrink-0 underline underline-offset-4">
            Salir
          </button>
        </div>
      </div>
      <nav className="mt-3 flex gap-4 overflow-x-auto text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 pb-1",
              pathname.startsWith(link.href)
                ? "border-b-2 border-foreground font-medium"
                : "text-muted"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
