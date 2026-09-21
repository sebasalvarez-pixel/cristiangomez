"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatCOP, formatDuration } from "@/lib/types";
import type { Service, ServiceCategory } from "@/lib/types";
import { DatePicker } from "@/components/booking/DatePicker";
import { utcToBogotaDateIso } from "@/lib/timezone";

interface Stylist {
  id: string;
  display_name: string;
}

interface Props {
  dateIso: string;
  stylists: Stylist[];
  defaultStylistId?: string;
  categories: ServiceCategory[];
  services: Service[];
  onClose: () => void;
  onCreated: () => void;
}

export function NewAppointmentForm({
  dateIso,
  stylists,
  defaultStylistId,
  categories,
  services,
  onClose,
  onCreated,
}: Props) {
  const todayIso = utcToBogotaDateIso(new Date());
  const [selectedDateIso, setSelectedDateIso] = useState(dateIso < todayIso ? todayIso : dateIso);
  const [stylistId, setStylistId] = useState(defaultStylistId && defaultStylistId !== "all" ? defaultStylistId : "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [slotResult, setSlotResult] = useState<{ key: string; slots: string[] } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDuration = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((sum, s) => sum + s.duration_minutes, 0),
    [services, selectedServiceIds]
  );

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const slotsReady = Boolean(stylistId) && totalDuration > 0;
  const slotKey = `${stylistId}|${selectedDateIso}|${totalDuration}`;
  const slots = slotsReady && slotResult?.key === slotKey ? slotResult.slots : null;
  const loadingSlots = slotsReady && slotResult?.key !== slotKey;
  const validSlot = slots && selectedSlot && slots.includes(selectedSlot) ? selectedSlot : null;

  useEffect(() => {
    if (!stylistId || totalDuration === 0) return;
    let cancelled = false;
    const key = `${stylistId}|${selectedDateIso}|${totalDuration}`;
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stylistId, date: selectedDateIso, totalDurationMinutes: totalDuration }),
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!cancelled) setSlotResult({ key, slots: ok ? data.slots : [] });
      })
      .catch(() => {
        if (!cancelled) setSlotResult({ key, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [stylistId, selectedDateIso, totalDuration]);

  async function handleSubmit() {
    if (!stylistId || !validSlot || selectedServiceIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId,
        serviceIds: selectedServiceIds,
        startTime: validSlot,
        clientName: name,
        clientPhone: phone,
        notifyClient,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la cita");
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl italic">Nueva cita</h2>
          <button onClick={onClose} className="rounded-full border border-border px-4 py-1.5 text-sm">
            Cerrar
          </button>
        </div>

        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Estilista</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {stylists.map((s) => (
            <button
              key={s.id}
              onClick={() => setStylistId(s.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm",
                stylistId === s.id ? "border-foreground bg-foreground text-background" : "border-border"
              )}
            >
              {s.display_name}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Fecha</p>
        <div className="mb-4">
          <DatePicker selectedDateIso={selectedDateIso} todayIso={todayIso} onSelect={setSelectedDateIso} />
          <p className="mt-2 text-center text-xs text-muted">
            {format(new Date(`${selectedDateIso}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Servicios</p>
        <div className="mb-4 max-h-40 space-y-3 overflow-y-auto rounded-xl border border-border p-3">
          {categories.map((category) => {
            const categoryServices = services.filter((s) => s.category_id === category.id);
            if (categoryServices.length === 0) return null;
            return (
              <div key={category.id}>
                <p className="mb-1 text-xs font-medium text-muted">{category.name}</p>
                {categoryServices.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="accent-foreground"
                    />
                    {service.name} · {formatDuration(service.duration_minutes)} · {formatCOP(service.price_cents)}
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Horario</p>
        <div className="mb-4">
          {!slotsReady && (
            <p className="rounded-xl bg-muted-bg px-4 py-3 text-sm text-muted">
              Elige la estilista y al menos un servicio para ver los horarios disponibles.
            </p>
          )}
          {loadingSlots && <p className="py-3 text-sm text-muted">Buscando horarios…</p>}
          {slots && slots.length === 0 && (
            <p className="rounded-xl bg-muted-bg px-4 py-3 text-sm text-muted">
              No hay horarios disponibles ese día. Prueba con otra fecha u otra estilista.
            </p>
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-sm",
                    validSlot === slot ? "border-foreground bg-foreground text-background" : "border-border"
                  )}
                >
                  {format(new Date(slot), "h:mm a")}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 space-y-2">
          <input
            placeholder="Nombre de la clienta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <input
            placeholder="Celular (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
            className="accent-foreground"
          />
          Enviar confirmación por WhatsApp a la clienta
        </label>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          disabled={!validSlot || name.trim().length < 2 || phone.trim().length < 7 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Creando…" : "Crear cita"}
        </Button>
      </div>
    </div>
  );
}
