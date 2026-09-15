"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addMonthsIso, getMonthGrid } from "@/lib/calendar";
import { cn } from "@/lib/cn";

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

interface Props {
  selectedDateIso: string | null;
  todayIso: string;
  onSelect: (dateIso: string) => void;
}

export function DatePicker({ selectedDateIso, todayIso, onSelect }: Props) {
  const [monthRef, setMonthRef] = useState(selectedDateIso ?? todayIso);
  const weeks = getMonthGrid(monthRef);
  const monthDate = new Date(`${monthRef}T00:00:00`);
  const atCurrentMonth = monthRef.slice(0, 7) <= todayIso.slice(0, 7);

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonthRef(addMonthsIso(monthRef, -1))}
          disabled={atCurrentMonth}
          aria-label="Mes anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg disabled:opacity-30"
        >
          ‹
        </button>
        <p className="font-display text-base italic capitalize">
          {format(monthDate, "MMMM yyyy", { locale: es })}
        </p>
        <button
          onClick={() => setMonthRef(addMonthsIso(monthRef, 1))}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell) => {
          const isPast = cell.dateIso < todayIso;
          const disabled = isPast || !cell.inMonth;
          const isSelected = cell.dateIso === selectedDateIso;
          const isToday = cell.dateIso === todayIso;
          const dayNumber = Number(cell.dateIso.slice(8, 10));
          return (
            <button
              key={cell.dateIso}
              disabled={disabled}
              onClick={() => onSelect(cell.dateIso)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm",
                !cell.inMonth && "invisible",
                disabled && cell.inMonth && "text-muted/40",
                !disabled && !isSelected && "hover:bg-muted-bg",
                isSelected && "bg-foreground font-medium text-background",
                isToday && !isSelected && "border border-foreground font-medium"
              )}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
