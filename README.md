# Christian Gómez Peluquería — App de reservas

Web app (PWA) propia para reservas de citas, con notificaciones de confirmación/recordatorio/cancelación por WhatsApp y panel de agenda para los 4 estilistas.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth) · WhatsApp Cloud API.

## Desarrollo local

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env.local` y completa las variables — ver [SETUP.md](./SETUP.md) para la guía completa de Supabase, WhatsApp Cloud API y despliegue en Vercel.

## Estructura

- `src/app/reservar` — flujo de reserva para clientas (público).
- `src/app/mi-cita/[token]` — ver/cancelar una cita desde el link de WhatsApp.
- `src/app/staff` — panel de agenda, servicios y estilistas (requiere login).
- `src/app/api` — endpoints: disponibilidad, crear/cancelar citas, acciones de staff, cron de recordatorios, webhook de WhatsApp.
- `src/lib/whatsapp.ts` / `src/lib/notifications.ts` — envío de plantillas de WhatsApp (cae a modo *dry-run* en consola si no hay credenciales).
- `supabase/migrations` — esquema SQL y datos semilla.
