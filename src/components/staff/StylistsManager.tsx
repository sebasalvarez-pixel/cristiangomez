"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { BusinessHour, Stylist, TimeOff } from "@/lib/types";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Props {
  stylists: Stylist[];
  hours: BusinessHour[];
  timeOff: TimeOff[];
}

export function StylistsManager({ stylists, hours, timeOff }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<string | null>(null);

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
              <div>
                <p className={cn("text-sm font-medium", !stylist.is_active && "text-muted line-through")}>
                  {stylist.display_name}
                </p>
                <p className="text-xs text-muted">
                  {stylist.phone_e164 ?? "Sin WhatsApp — no recibirá avisos de citas nuevas"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-3">
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => setEditingPhone(editingPhone === stylist.id ? null : stylist.id)}
              >
                WhatsApp
              </button>
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => setExpanded(expanded === stylist.id ? null : stylist.id)}
              >
                Horario
              </button>
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => setEditingTimeOff(editingTimeOff === stylist.id ? null : stylist.id)}
              >
                Bloqueos
              </button>
              <button
                className="text-xs underline underline-offset-4"
                onClick={() => toggleActive(stylist.id, stylist.is_active)}
              >
                {stylist.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>

          {editingPhone === stylist.id && (
            <PhoneEditor
              stylistId={stylist.id}
              initialPhone={stylist.phone_e164}
              onSaved={() => {
                setEditingPhone(null);
                router.refresh();
              }}
            />
          )}

          {expanded === stylist.id && (
            <HoursEditor
              stylistId={stylist.id}
              initialHours={hours.filter((h) => h.stylist_id === stylist.id)}
              onSaved={() => router.refresh()}
            />
          )}

          {editingTimeOff === stylist.id && (
            <TimeOffEditor
              stylistId={stylist.id}
              entries={timeOff.filter((t) => t.stylist_id === stylist.id)}
              onChanged={() => router.refresh()}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PhoneEditor({
  stylistId,
  initialPhone,
  onSaved,
}: {
  stylistId: string;
  initialPhone: string | null;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/staff/stylists/${stylistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneE164: phone }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-2 border-t border-border px-5 py-4">
      <p className="text-xs text-muted">
        Número de WhatsApp donde le van a llegar los avisos de citas nuevas.
      </p>
      <div className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="300 123 4567"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <Button disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
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

function TimeOffEditor({
  stylistId,
  entries,
  onChanged,
}: {
  stylistId: string;
  entries: TimeOff[];
  onChanged: () => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upcoming = [...entries].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  async function addBlock() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/staff/stylists/${stylistId}/time-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, reason: reason.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setReason("");
    onChanged();
  }

  async function removeBlock(id: string) {
    setDeletingId(id);
    await fetch(`/api/staff/time-off/${id}`, { method: "DELETE" });
    setDeletingId(null);
    onChanged();
  }

  return (
    <div className="space-y-3 border-t border-border px-5 py-4">
      <p className="text-xs text-muted">
        Bloquea días completos (vacaciones, permisos): nadie va a poder reservar con esta
        persona en ese rango de fechas.
      </p>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg bg-muted-bg px-3 py-2 text-xs"
            >
              <span>
                {format(new Date(entry.starts_at), "d MMM", { locale: es })} –{" "}
                {format(new Date(new Date(entry.ends_at).getTime() - 1), "d MMM yyyy", {
                  locale: es,
                })}
                {entry.reason && ` · ${entry.reason}`}
              </span>
              <button
                className="underline underline-offset-4"
                disabled={deletingId === entry.id}
                onClick={() => removeBlock(entry.id)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border px-2 py-1.5 text-xs"
          />
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="min-w-32 flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button disabled={saving} onClick={addBlock}>
        {saving ? "Guardando…" : "Bloquear fechas"}
      </Button>
    </div>
  );
}
