"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatCOP, formatDuration } from "@/lib/types";
import type { Service, ServiceCategory, Stylist } from "@/lib/types";

interface StylistService {
  stylist_id: string;
  service_id: string;
}

interface Props {
  categories: ServiceCategory[];
  services: Service[];
  stylists: Stylist[];
  stylistServices: StylistService[];
}

type Step = "services" | "stylist" | "datetime" | "contact" | "done";

const ANY_STYLIST = "any";

export function BookingWizard({ categories, services, stylists, stylistServices }: Props) {
  const [step, setStep] = useState<Step>("services");
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.id ?? null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [stylistId, setStylistId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<{ time: string; stylistId: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; stylistId: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price_cents, 0);

  function eligibleStylists(): Stylist[] {
    return stylists.filter((stylist) =>
      selectedServiceIds.every((serviceId) => {
        const restricted = stylistServices.some((ss) => ss.service_id === serviceId);
        if (!restricted) return true;
        return stylistServices.some(
          (ss) => ss.service_id === serviceId && ss.stylist_id === stylist.id
        );
      })
    );
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function loadSlots(date: Date, stylistChoice: string) {
    setLoadingSlots(true);
    setSelectedSlot(null);
    const dateIso = format(date, "yyyy-MM-dd");
    const candidates = stylistChoice === ANY_STYLIST ? eligibleStylists() : eligibleStylists().filter((s) => s.id === stylistChoice);

    const results = await Promise.all(
      candidates.map(async (stylist) => {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stylistId: stylist.id,
            date: dateIso,
            totalDurationMinutes: totalDuration,
          }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.slots as string[]).map((time) => ({ time, stylistId: stylist.id }));
      })
    );

    const merged = new Map<string, { time: string; stylistId: string }>();
    for (const group of results) {
      for (const slot of group) {
        if (!merged.has(slot.time)) merged.set(slot.time, slot);
      }
    }

    setSlots(Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time)));
    setLoadingSlots(false);
  }

  async function handlePickStylist(id: string) {
    setStylistId(id);
    setStep("datetime");
    await loadSlots(selectedDate, id);
  }

  async function handlePickDate(date: Date) {
    setSelectedDate(date);
    if (stylistId) await loadSlots(date, stylistId);
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stylistId: selectedSlot.stylistId,
          serviceIds: selectedServiceIds,
          startTime: selectedSlot.time,
          clientName: name,
          clientPhone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar la cita");
        setSubmitting(false);
        return;
      }
      setManageToken(data.manageToken);
      setStep("done");
    } catch {
      setError("Error de conexión, intenta de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <div>
      <StepHeader step={step} />

      {step === "services" && (
        <div className="space-y-3">
          {categories.map((category) => {
            const categoryServices = services.filter((s) => s.category_id === category.id);
            const isOpen = openCategory === category.id;
            return (
              <div key={category.id} className="border border-border rounded-2xl overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
                  onClick={() => setOpenCategory(isOpen ? null : category.id)}
                >
                  {category.name}
                  <span className="text-muted">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-border border-t border-border">
                    {categoryServices.map((service) => {
                      const checked = selectedServiceIds.includes(service.id);
                      return (
                        <label
                          key={service.id}
                          className={cn(
                            "flex cursor-pointer items-start justify-between gap-4 px-5 py-4",
                            checked && "bg-muted-bg"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{service.name}</p>
                            {service.description && (
                              <p className="mt-1 text-xs text-muted leading-relaxed">
                                {service.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted">
                              {formatDuration(service.duration_minutes)} · {formatCOP(service.price_cents)}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(service.id)}
                            className="mt-1 h-5 w-5 accent-foreground"
                          />
                        </label>
                      );
                    })}
                    {categoryServices.length === 0 && (
                      <p className="px-5 py-4 text-xs text-muted">Próximamente</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="sticky bottom-0 mt-6 border-t border-border bg-background pt-4">
            <p className="mb-3 text-xs text-muted">
              {selectedServiceIds.length} servicio(s) seleccionados
              {totalDuration > 0 && ` · ${formatDuration(totalDuration)} · ${formatCOP(totalPrice)}`}
            </p>
            <Button
              className="w-full"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setStep("stylist")}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "stylist" && (
        <div className="space-y-3">
          <button
            className="flex w-full items-center gap-4 rounded-2xl border border-border px-5 py-4 text-left"
            onClick={() => handlePickStylist(ANY_STYLIST)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-bg text-sm">
              ✦
            </div>
            <div>
              <p className="text-sm font-medium">Cualquiera disponible</p>
              <p className="text-xs text-muted">Te asignamos el primer horario libre</p>
            </div>
          </button>
          {eligibleStylists().map((stylist) => (
            <button
              key={stylist.id}
              className="flex w-full items-center gap-4 rounded-2xl border border-border px-5 py-4 text-left"
              onClick={() => handlePickStylist(stylist.id)}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm text-white"
                style={{ backgroundColor: stylist.color }}
              >
                {stylist.display_name.charAt(0)}
              </div>
              <p className="text-sm font-medium">{stylist.display_name}</p>
            </button>
          ))}
          <BackButton onClick={() => setStep("services")} />
        </div>
      )}

      {step === "datetime" && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {next14Days.map((date) => {
              const active = isSameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handlePickDate(date)}
                  className={cn(
                    "flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 text-xs",
                    active ? "border-foreground bg-foreground text-background" : "border-border"
                  )}
                >
                  <span className="uppercase">{format(date, "EEE", { locale: es })}</span>
                  <span className="mt-1 text-base font-medium">{format(date, "d")}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {loadingSlots && <p className="col-span-3 text-center text-sm text-muted">Buscando horarios…</p>}
            {!loadingSlots && slots.length === 0 && (
              <p className="col-span-3 text-center text-sm text-muted">
                No hay horarios disponibles este día
              </p>
            )}
            {!loadingSlots &&
              slots.map((slot) => {
                const active = selectedSlot?.time === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm",
                      active ? "border-foreground bg-foreground text-background" : "border-border"
                    )}
                  >
                    {format(new Date(slot.time), "h:mm a")}
                  </button>
                );
              })}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button disabled={!selectedSlot} onClick={() => setStep("contact")}>
              Continuar
            </Button>
            <BackButton onClick={() => setStep("stylist")} />
          </div>
        </div>
      )}

      {step === "contact" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Celular (WhatsApp)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="300 123 4567"
              className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-foreground"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="rounded-2xl bg-muted-bg px-5 py-4 text-sm">
            <p className="font-medium">Resumen</p>
            <p className="mt-1 text-muted">
              {selectedServices.map((s) => s.name).join(", ")}
            </p>
            {selectedSlot && (
              <p className="mt-1 text-muted">
                {format(new Date(selectedSlot.time), "EEEE d 'de' MMMM, h:mm a", { locale: es })}
              </p>
            )}
          </div>

          <Button
            className="w-full"
            disabled={name.trim().length < 2 || phone.trim().length < 7 || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Confirmando…" : "Confirmar cita"}
          </Button>
          <BackButton onClick={() => setStep("datetime")} />
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-foreground text-2xl">
            ✓
          </div>
          <h2 className="font-display text-2xl italic">¡Cita confirmada!</h2>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Te enviamos la confirmación por WhatsApp al {phone}. Si necesitas cancelar, usa el
            link que llegó en el mensaje.
          </p>
          {manageToken && (
            <a
              href={`/mi-cita/${manageToken}`}
              className="mt-6 text-sm underline underline-offset-4"
            >
              Ver mi cita
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StepHeader({ step }: { step: Step }) {
  if (step === "done") return null;
  const labels: Record<Exclude<Step, "done">, string> = {
    services: "Elige tus servicios",
    stylist: "Elige tu especialista",
    datetime: "Elige fecha y hora",
    contact: "Tus datos",
  };
  return (
    <h1 className="font-display mb-6 text-2xl italic">{labels[step]}</h1>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-center text-xs text-muted underline underline-offset-4">
      Volver
    </button>
  );
}
