"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/types";
import type { Service, ServiceCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { NewAppointmentForm } from "@/components/staff/NewAppointmentForm";
import { addDaysIso, addMonthsIso, getMonthGrid, getWeekDates } from "@/lib/calendar";
import { utcToBogotaDateIso } from "@/lib/timezone";

type ViewMode = "day" | "week" | "month";

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
  view: ViewMode;
  dateIso: string;
  isAdmin: boolean;
  stylists: Stylist[];
  activeStylistId: string;
  appointments: AppointmentRow[];
  upcomingCount?: number;
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
  view,
  dateIso,
  isAdmin,
  stylists,
  activeStylistId,
  appointments,
  upcomingCount = 0,
  categories,
  services,
}: Props) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const date = useMemo(() => new Date(`${dateIso}T00:00:00`), [dateIso]);
  const todayIso = utcToBogotaDateIso(new Date());

  const stylistQuery = activeStylistId && activeStylistId !== "all" ? `&stylist=${activeStylistId}` : "";

  function goTo(newDateIso: string, newView: ViewMode = view) {
    router.push(`/staff/agenda?view=${newView}&date=${newDateIso}${stylistQuery}`);
  }

  function goToStylist(id: string) {
    router.push(`/staff/agenda?view=${view}&date=${dateIso}&stylist=${id}`);
  }

  function goPrev() {
    if (view === "day") goTo(addDaysIso(dateIso, -1));
    else if (view === "week") goTo(addDaysIso(dateIso, -7));
    else goTo(addMonthsIso(dateIso, -1));
  }

  function goNext() {
    if (view === "day") goTo(addDaysIso(dateIso, 1));
    else if (view === "week") goTo(addDaysIso(dateIso, 7));
    else goTo(addMonthsIso(dateIso, 1));
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

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const appt of appointments) {
      const key = utcToBogotaDateIso(new Date(appt.start_time));
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [appointments]);

  const headerLabel = useMemo(() => {
    if (view === "day") return format(date, "EEEE d 'de' MMMM", { locale: es });
    if (view === "week") {
      const week = getWeekDates(dateIso);
      const start = new Date(`${week[0]}T00:00:00`);
      const end = new Date(`${week[6]}T00:00:00`);
      return `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`;
    }
    return format(date, "MMMM yyyy", { locale: es });
  }, [view, dateIso, date]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-2">
        <button
          onClick={goPrev}
          aria-label="Anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xl"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="font-display text-center text-lg italic sm:text-xl">{headerLabel}</h1>
          {dateIso !== todayIso && (
            <button
              onClick={() => goTo(todayIso)}
              className="rounded-full border border-foreground px-3 py-1 text-xs font-medium"
            >
              Hoy
            </button>
          )}
        </div>
        <button
          onClick={goNext}
          aria-label="Siguiente"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xl"
        >
          ›
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 rounded-full border border-border p-1">
        {(["day", "week", "month"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => goTo(dateIso, mode)}
            className={cn(
              "rounded-full py-2 text-sm font-medium",
              view === mode ? "bg-foreground text-background" : "text-muted"
            )}
          >
            {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      <Button className="mb-6 w-full sm:w-auto" onClick={() => setShowNewAppointment(true)}>
        + Nueva cita
      </Button>

      {isAdmin && (
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Estilista</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => goToStylist("all")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm",
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
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
                  activeStylistId === s.id ? "border-foreground bg-foreground text-background" : "border-border"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: activeStylistId === s.id ? "currentColor" : s.color }}
                />
                {s.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "day" && upcomingCount > 0 && (
        <button
          onClick={() => goTo(dateIso, "week")}
          className="mb-4 flex w-full items-center justify-between rounded-2xl bg-muted-bg px-5 py-3 text-left text-sm"
        >
          <span>
            Tienes <span className="font-medium">{upcomingCount}</span> cita
            {upcomingCount === 1 ? "" : "s"} programada{upcomingCount === 1 ? "" : "s"} en los
            próximos 7 días
          </span>
          <span className="shrink-0 underline underline-offset-4">Ver semana</span>
        </button>
      )}

      {view === "day" && (
        <DayAgenda
          appointments={appointmentsByDay.get(dateIso) ?? []}
          isAdmin={isAdmin}
          updatingId={updatingId}
          onUpdateStatus={updateStatus}
        />
      )}

      {view === "week" && (
        <WeekAgenda
          dateIso={dateIso}
          appointmentsByDay={appointmentsByDay}
          isAdmin={isAdmin}
          todayIso={todayIso}
          onSelectDay={(d) => goTo(d, "day")}
        />
      )}

      {view === "month" && (
        <MonthAgenda
          dateIso={dateIso}
          appointmentsByDay={appointmentsByDay}
          todayIso={todayIso}
          onSelectDay={(d) => goTo(d, "day")}
        />
      )}

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

function DayAgenda({
  appointments,
  isAdmin,
  updatingId,
  onUpdateStatus,
}: {
  appointments: AppointmentRow[];
  isAdmin: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  if (appointments.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No hay citas este día.</p>;
  }

  return (
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
                  onClick={() => onUpdateStatus(appt.id, "completed")}
                  disabled={updatingId === appt.id}
                />
                <ActionButton
                  label="No asistió"
                  onClick={() => onUpdateStatus(appt.id, "no_show")}
                  disabled={updatingId === appt.id}
                />
                <ActionButton
                  label="Cancelar"
                  onClick={() => onUpdateStatus(appt.id, "cancelled")}
                  disabled={updatingId === appt.id}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekAgenda({
  dateIso,
  appointmentsByDay,
  isAdmin,
  todayIso,
  onSelectDay,
}: {
  dateIso: string;
  appointmentsByDay: Map<string, AppointmentRow[]>;
  isAdmin: boolean;
  todayIso: string;
  onSelectDay: (dateIso: string) => void;
}) {
  const week = getWeekDates(dateIso);

  return (
    <div className="space-y-3">
      {week.map((day) => {
        const dayAppointments = (appointmentsByDay.get(day) ?? []).filter(
          (a) => a.status !== "cancelled"
        );
        const isToday = day === todayIso;
        const dayDate = new Date(`${day}T00:00:00`);
        return (
          <div key={day} className="rounded-2xl border border-border">
            <button
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex w-full items-center justify-between rounded-t-2xl px-5 py-3 text-left",
                isToday && "bg-muted-bg"
              )}
            >
              <span className="text-sm font-medium">
                {format(dayDate, "EEEE d 'de' MMMM", { locale: es })}
              </span>
              <span className="text-xs text-muted">
                {dayAppointments.length > 0 ? `${dayAppointments.length} cita(s)` : "Sin citas"}
              </span>
            </button>
            {dayAppointments.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {dayAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => onSelectDay(day)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm"
                  >
                    <span className="w-20 shrink-0 text-muted">
                      {format(new Date(appt.start_time), "h:mm a")}
                    </span>
                    <span className="flex-1 truncate">{appt.clients.full_name}</span>
                    {isAdmin && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: appt.stylists.color }}
                        title={appt.stylists.display_name}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthAgenda({
  dateIso,
  appointmentsByDay,
  todayIso,
  onSelectDay,
}: {
  dateIso: string;
  appointmentsByDay: Map<string, AppointmentRow[]>;
  todayIso: string;
  onSelectDay: (dateIso: string) => void;
}) {
  const weeks = getMonthGrid(dateIso);
  const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((cell) => {
          const count = (appointmentsByDay.get(cell.dateIso) ?? []).filter(
            (a) => a.status !== "cancelled"
          ).length;
          const isToday = cell.dateIso === todayIso;
          const dayNumber = Number(cell.dateIso.slice(8, 10));
          return (
            <button
              key={cell.dateIso}
              onClick={() => onSelectDay(cell.dateIso)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border text-sm",
                cell.inMonth ? "border-border" : "border-transparent text-muted/50",
                isToday && "border-foreground font-medium"
              )}
            >
              <span>{dayNumber}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium",
                    isToday ? "bg-foreground text-background" : "bg-muted-bg text-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
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
