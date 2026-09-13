-- Datos iniciales: categorías y estilistas tal como los manejan hoy.
-- Los servicios (nombre/duración/precio) se cargan luego desde el panel admin,
-- porque no tenemos el detalle exacto de cada uno.

insert into service_categories (name, sort_order) values
  ('Peinado y Maquillaje', 1),
  ('Servicios Tinturas', 2),
  ('Procesos Alisadores', 3),
  ('Cortes de Cabello', 4),
  ('Hidrataciones', 5),
  ('Depilación de Cera', 6);

insert into stylists (display_name, color, sort_order) values
  ('Christian Gómez', '#111111', 1),
  ('Fernando Conde', '#2b2b2b', 2),
  ('Diany Muñoz', '#4a4a4a', 3),
  ('Linci Sánchez', '#6b6b6b', 4);

-- Ejemplo de servicio ya conocido, dentro de "Depilación de Cera"
insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id,
       'Depilación con cera',
       'Cejas, bigote, nariz, axilas, barba, pecho, pierna completa, media pierna y oídos. Sombreados con henna.',
       45,
       0,
       1
from service_categories where name = 'Depilación de Cera';

-- Horario laboral por defecto: martes a sábado, 9:00 a 19:00 (ajustar en el panel admin)
insert into business_hours (stylist_id, day_of_week, start_time, end_time)
select s.id, d.dow, '09:00', '19:00'
from stylists s
cross join (select generate_series(2, 6) as dow) d;
