"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/types";
import type { Service, ServiceCategory } from "@/lib/types";

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
  const [stylistId, setStylistId] = useState(defaultStylistId && defaultStylistId !== "all" ? defaultStylistId : "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
    setSelectedSlot(null);
    setSlots([]);
  }

  async function loadSlots(currentStylistId: string) {
    if (!currentStylistId || totalDuration === 0) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stylistId: currentStylistId, date: dateIso, totalDurationMinutes: totalDuration }),
    });
    const data = await res.json();
    setSlots(res.ok ? data.slots : []);
    setLoadingSlots(false);
  }

  function handlePickStylist(id: string) {
    setStylistId(id);
    if (totalDuration > 0) loadSlots(id);
  }

  async function handleSubmit() {
    if (!stylistId || !selectedSlot || selectedServiceIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stylistId,
        serviceIds: selectedServiceIds,
        startTime: selectedSlot,
        clientName: name,
        clientPhone: phone,
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
          <button onClick={onClose} className="text-sm text-muted">
            Cerrar
          </button>
        </div>

        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Estilista</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {stylists.map((s) => (
            <button
              key={s.id}
              onClick={() => handlePickStylist(s.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs",
                stylistId === s.id ? "border-foreground bg-foreground text-background" : "border-border"
              )}
            >
              {s.display_name}
            </button>
          ))}
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
                    {service.name} · {service.duration_minutes} min · {formatCOP(service.price_cents)}
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        {stylistId && totalDuration > 0 && slots.length === 0 && !loadingSlots && (
          <button
            className="mb-4 text-xs underline underline-offset-4"
            onClick={() => loadSlots(stylistId)}
          >
            Buscar horarios disponibles
          </button>
        )}

        {loadingSlots && <p className="mb-4 text-sm text-muted">Buscando horarios…</p>}

        {slots.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Horario</p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs",
                    selectedSlot === slot ? "border-foreground bg-foreground text-background" : "border-border"
                  )}
                >
                  {format(new Date(slot), "h:mm a")}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          disabled={!selectedSlot || name.trim().length < 2 || phone.trim().length < 7 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Creando…" : "Crear cita"}
        </Button>
      </div>
    </div>
  );
}
