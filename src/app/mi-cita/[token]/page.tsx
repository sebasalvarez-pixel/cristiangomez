"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatCOP } from "@/lib/types";

interface AppointmentView {
  id: string;
  start_time: string;
  status: string;
  clients: { full_name: string };
  stylists: { display_name: string };
  appointment_services: { name_at_booking: string; price_cents_at_booking: number }[];
}

export default function MiCitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/mi-cita/${token}`)
      .then(async (res) => {
        if (!res.ok) return setNotFound(true);
        const data = await res.json();
        setAppointment(data.appointment);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    if (!confirm("¿Seguro que quieres cancelar tu cita?")) return;
    setCancelling(true);
    const res = await fetch(`/api/mi-cita/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) {
      setAppointment((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    }
    setCancelling(false);
  }

  if (loading) {
    return <Centered>Cargando…</Centered>;
  }
  if (notFound || !appointment) {
    return (
      <Centered>
        <p className="mb-4">No encontramos esta cita.</p>
        <ButtonLink href="/">Volver al inicio</ButtonLink>
      </Centered>
    );
  }

  const total = appointment.appointment_services.reduce(
    (sum, s) => sum + s.price_cents_at_booking,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <Link
        href="/"
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg"
        aria-label="Volver al inicio"
      >
        ‹
      </Link>
      <h1 className="font-display mb-6 text-2xl italic">Tu cita</h1>

      <div className="rounded-2xl border border-border px-5 py-5">
        <p className="text-xs uppercase tracking-wide text-muted">
          {appointment.status === "cancelled" ? "Cancelada" : "Confirmada"}
        </p>
        <p className="mt-2 text-lg font-medium">
          {format(new Date(appointment.start_time), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <p className="text-muted">{format(new Date(appointment.start_time), "h:mm a")}</p>

        <div className="mt-4 border-t border-border pt-4 text-sm">
          <p className="font-medium">{appointment.stylists.display_name}</p>
          <ul className="mt-2 space-y-1 text-muted">
            {appointment.appointment_services.map((s) => (
              <li key={s.name_at_booking}>{s.name_at_booking}</li>
            ))}
          </ul>
          {total > 0 && <p className="mt-2 font-medium">{formatCOP(total)}</p>}
        </div>
      </div>

      {appointment.status !== "cancelled" && appointment.status !== "completed" && (
        <Button
          variant="secondary"
          className="mt-6"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? "Cancelando…" : "Cancelar cita"}
        </Button>
      )}

      <ButtonLink href="/reservar" variant="ghost" className="mt-4">
        Reservar otra cita
      </ButtonLink>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}
