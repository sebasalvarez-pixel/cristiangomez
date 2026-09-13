"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { BusinessHour, Stylist } from "@/lib/types";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Props {
  stylists: Stylist[];
  hours: BusinessHour[];
}

export function StylistsManager({ stylists, hours }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/staff/stylists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {stylists.map((stylist) => (
        <div key={stylist.id} className="rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-full text-white flex items-center justify-center text-xs"
                style={{ backgroundColor: stylist.color }}
              >
                {stylist.display_name.charAt(0)}
              </div>
              <p className={cn("text-sm font-medium", !stylist.is_active && "text-muted line-through")}>
                {stylist.display_name}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => setExpanded(expanded === stylist.id ? null : stylist.id)}
              >
                Horario
              </button>
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => toggleActive(stylist.id, stylist.is_active)}
              >
                {stylist.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>

          {expanded === stylist.id && (
            <HoursEditor
              stylistId={stylist.id}
              initialHours={hours.filter((h) => h.stylist_id === stylist.id)}
              onSaved={() => router.refresh()}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function HoursEditor({
  stylistId,
  initialHours,
  onSaved,
}: {
  stylistId: string;
  initialHours: BusinessHour[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    DAYS.map((_, dayOfWeek) => {
      const existing = initialHours.find((h) => h.day_of_week === dayOfWeek);
      return {
        dayOfWeek,
        enabled: Boolean(existing),
        startTime: existing?.start_time?.slice(0, 5) ?? "09:00",
        endTime: existing?.end_time?.slice(0, 5) ?? "19:00",
      };
    })
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/staff/stylists/${stylistId}/hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hours: rows
          .filter((r) => r.enabled)
          .map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="space-y-2 border-t border-border px-5 py-4">
      {rows.map((row, i) => (
        <div key={row.dayOfWeek} className="flex items-center gap-3 text-sm">
          <label className="flex w-28 items-center gap-2">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, enabled: e.target.checked } : r))
                )
              }
              className="accent-foreground"
            />
            {DAYS[row.dayOfWeek]}
          </label>
          <input
            type="time"
            value={row.startTime}
            disabled={!row.enabled}
            onChange={(e) =>
              setRows((prev) =>
                prev.map((r, idx) => (idx === i ? { ...r, startTime: e.target.value } : r))
              )
            }
            className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
          />
          <span className="text-muted">a</span>
          <input
            type="time"
            value={row.endTime}
            disabled={!row.enabled}
            onChange={(e) =>
              setRows((prev) =>
                prev.map((r, idx) => (idx === i ? { ...r, endTime: e.target.value } : r))
              )
            }
            className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
          />
        </div>
      ))}
      <Button className="mt-2" disabled={saving} onClick={save}>
        {saving ? "Guardando…" : "Guardar horario"}
      </Button>
    </div>
  );
}
