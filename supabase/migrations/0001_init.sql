-- Christian Gómez Peluquería — esquema inicial
-- Extensiones: pgcrypto para UUIDs/tokens, btree_gist para el constraint anti-choques de abajo.
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Roles del staff
create type user_role as enum ('admin', 'stylist');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
create type notification_type as enum ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation');
create type notification_status as enum ('sent', 'failed', 'delivered', 'read');

-- Perfiles de staff (1:1 con auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'stylist',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Estilistas (perfil público, puede o no tener login propio)
create table stylists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  display_name text not null,
  avatar_url text,
  color text not null default '#111111',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories (id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents bigint not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table stylist_services (
  stylist_id uuid not null references stylists (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  primary key (stylist_id, service_id)
);

-- Horario laboral recurrente por estilista (0 = domingo ... 6 = sábado)
create table business_hours (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references stylists (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- Bloqueos puntuales (vacaciones, almuerzo, permisos)
create table time_off (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references stylists (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_e164 text not null unique,
  notes text,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  stylist_id uuid not null references stylists (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  manage_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  -- Último cerrojo contra choques de horario: aunque la app revalide disponibilidad
  -- antes de insertar, dos reservas simultáneas para el mismo estilista y horario
  -- no pueden coexistir a nivel de base de datos (se ignoran las citas canceladas).
  exclude using gist (
    stylist_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);

create table appointment_services (
  appointment_id uuid not null references appointments (id) on delete cascade,
  service_id uuid not null references services (id) on delete restrict,
  name_at_booking text not null,
  price_cents_at_booking bigint not null,
  duration_minutes_at_booking int not null,
  primary key (appointment_id, service_id)
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  type notification_type not null,
  status notification_status not null,
  whatsapp_message_id text,
  error text,
  sent_at timestamptz not null default now()
);

create index idx_appointments_stylist_time on appointments (stylist_id, start_time);
create index idx_appointments_status on appointments (status);
create index idx_notification_log_appointment on notification_log (appointment_id, type);
create unique index uq_manage_token on appointments (manage_token);

-- Row Level Security
alter table profiles enable row level security;
alter table stylists enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table stylist_services enable row level security;
alter table business_hours enable row level security;
alter table time_off enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table notification_log enable row level security;

-- Lectura pública (para el flujo de reserva): catálogo de servicios/estilistas/horarios
create policy "public read categories" on service_categories for select using (true);
create policy "public read services" on services for select using (is_active);
create policy "public read stylists" on stylists for select using (is_active);
create policy "public read stylist_services" on stylist_services for select using (true);
create policy "public read business_hours" on business_hours for select using (true);

-- Todo lo demás (clientes, citas, notas, perfiles) solo vía service role desde el servidor.
-- No se agregan policies de insert/update/delete para anon: las mutaciones pasan por
-- API routes de Next.js usando la service role key, que hace bypass de RLS.

create policy "staff read profiles" on profiles for select using (auth.uid() = id);

create policy "staff read own appointments" on appointments for select using (
  exists (
    select 1 from profiles p
    join stylists s on s.profile_id = p.id
    where p.id = auth.uid()
      and (p.role = 'admin' or s.id = appointments.stylist_id)
  )
);

create policy "staff read appointment_services" on appointment_services for select using (
  exists (select 1 from appointments a where a.id = appointment_services.appointment_id)
);

create policy "staff read clients" on clients for select using (
  exists (select 1 from profiles p where p.id = auth.uid())
);
