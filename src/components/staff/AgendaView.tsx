"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/types";
import type { Service, ServiceCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { NewAppointmentForm } from "@/components/staff/NewAppointmentForm";

interface AppointmentRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  clients: { full_name: string; phone_e164: string };
  stylists: { display_name: string; color: string };
  appointment_services: { name_at_booking: string; price_cents_at_booking: number }[];
}

interface Stylist {
  id: string;
  display_name: string;
  color: string;
}

interface Props {
  dateIso: string;
  isAdmin: boolean;
  stylists: Stylist[];
  activeStylistId: string;
  appointments: AppointmentRow[];
  categories: ServiceCategory[];
  services: Service[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

export function AgendaView({
  dateIso,
  isAdmin,
  stylists,
  activeStylistId,
  appointments,
  categories,
  services,
}: Props) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const date = new Date(`${dateIso}T00:00:00`);

  function goToDate(newDate: Date) {
    const iso = format(newDate, "yyyy-MM-dd");
    router.push(`/staff/agenda?date=${iso}${activeStylistId !== "all" ? `&stylist=${activeStylistId}` : ""}`);
  }

  function goToStylist(id: string) {
    router.push(`/staff/agenda?date=${dateIso}&stylist=${id}`);
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/staff/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => goToDate(subDays(date, 1))} className="px-2 text-lg">
          ‹
        </button>
        <h1 className="font-display text-xl italic">
          {format(date, "EEEE d 'de' MMMM", { locale: es })}
        </h1>
        <button onClick={() => goToDate(addDays(date, 1))} className="px-2 text-lg">
          ›
        </button>
      </div>

      <Button className="mb-6 w-full sm:w-auto" onClick={() => setShowNewAppointment(true)}>
        + Nueva cita
      </Button>

      {isAdmin && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => goToStylist("all")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs",
              activeStylistId === "all" ? "border-foreground bg-foreground text-background" : "border-border"
            )}
          >
            Todos
          </button>
          {stylists.map((s) => (
            <button
              key={s.id}
              onClick={() => goToStylist(s.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs",
                activeStylistId === s.id ? "border-foreground bg-foreground text-background" : "border-border"
              )}
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}

      {appointments.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">No hay citas este día.</p>
      )}

      <div className="space-y-3">
        {appointments.map((appt) => {
          const total = appt.appointment_services.reduce((sum, s) => sum + s.price_cents_at_booking, 0);
          return (
            <div key={appt.id} className="rounded-2xl border border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(appt.start_time), "h:mm a")} –{" "}
                    {format(new Date(appt.end_time), "h:mm a")}
                  </p>
                  <p className="mt-1 text-sm">{appt.clients.full_name}</p>
                  <p className="text-xs text-muted">{appt.clients.phone_e164}</p>
                  {isAdmin && (
                    <p className="mt-1 text-xs" style={{ color: appt.stylists.color }}>
                      {appt.stylists.display_name}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs",
                    appt.status === "cancelled" || appt.status === "no_show"
                      ? "bg-muted-bg text-muted"
                      : "bg-foreground text-background"
                  )}
                >
                  {STATUS_LABEL[appt.status]}
                </span>
              </div>

              <ul className="mt-3 text-xs text-muted">
                {appt.appointment_services.map((s) => (
                  <li key={s.name_at_booking}>{s.name_at_booking}</li>
                ))}
              </ul>
              {total > 0 && <p className="mt-1 text-xs font-medium">{formatCOP(total)}</p>}

              {appt.status !== "cancelled" && appt.status !== "completed" && (
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    label="Completada"
                    onClick={() => updateStatus(appt.id, "completed")}
                    disabled={updatingId === appt.id}
                  />
                  <ActionButton
                    label="No asistió"
                    onClick={() => updateStatus(appt.id, "no_show")}
                    disabled={updatingId === appt.id}
                  />
                  <ActionButton
                    label="Cancelar"
                    onClick={() => updateStatus(appt.id, "cancelled")}
                    disabled={updatingId === appt.id}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNewAppointment && (
        <NewAppointmentForm
          dateIso={dateIso}
          stylists={stylists}
          defaultStylistId={activeStylistId}
          categories={categories}
          services={services}
          onClose={() => setShowNewAppointment(false)}
          onCreated={() => {
            setShowNewAppointment(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
    >
      {label}
    </button>
  );
}
