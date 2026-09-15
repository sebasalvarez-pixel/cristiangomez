"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatCOP, formatDuration } from "@/lib/types";
import type { Service, ServiceCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface Props {
  categories: ServiceCategory[];
  services: Service[];
}

export function ServicesManager({ categories, services }: Props) {
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [addingServiceFor, setAddingServiceFor] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", duration: "30", price: "0" });
  const [saving, setSaving] = useState(false);

  async function addCategory() {
    if (newCategory.trim().length < 2) return;
    setSaving(true);
    await fetch("/api/staff/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim() }),
    });
    setNewCategory("");
    setSaving(false);
    router.refresh();
  }

  async function addService(categoryId: string) {
    if (form.name.trim().length < 2) return;
    setSaving(true);
    await fetch("/api/staff/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        durationMinutes: Number(form.duration),
        priceCents: Math.round(Number(form.price) * 100),
      }),
    });
    setForm({ name: "", description: "", duration: "30", price: "0" });
    setAddingServiceFor(null);
    setSaving(false);
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/staff/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id} className="rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="font-medium">{category.name}</p>
            <button
              className="text-xs underline underline-offset-4"
              onClick={() =>
                setAddingServiceFor(addingServiceFor === category.id ? null : category.id)
              }
            >
              + Servicio
            </button>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {services
              .filter((s) => s.category_id === category.id)
              .map((service) => (
                <div key={service.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className={cn("text-sm", !service.is_active && "text-muted line-through")}>
                      {service.name}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDuration(service.duration_minutes)} · {formatCOP(service.price_cents)}
                    </p>
                  </div>
                  <button
                    className="text-xs underline underline-offset-4"
                    onClick={() => toggleActive(service.id, service.is_active)}
                  >
                    {service.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ))}
          </div>

          {addingServiceFor === category.id && (
            <div className="space-y-2 border-t border-border px-5 py-4">
              <input
                placeholder="Nombre del servicio"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Minutos"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-1/2 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
                />
                <input
                  type="number"
                  placeholder="Precio COP"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-1/2 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <Button
                className="w-full"
                disabled={saving}
                onClick={() => addService(category.id)}
              >
                Guardar servicio
              </Button>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-border px-5 py-4">
        <p className="mb-2 text-sm font-medium">Nueva categoría</p>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Ej: Manicure"
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <Button variant="secondary" disabled={saving} onClick={addCategory}>
            Crear
          </Button>
        </div>
      </div>
    </div>
  );
}
