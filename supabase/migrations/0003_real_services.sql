-- Catálogo real de servicios, tomado del sistema de reservas que manejaban antes (Lizto).
-- Los precios quedan en 0 (se muestran como "Cotizar" en la app) porque el negocio los
-- define en el momento según largo/grosor de cabello; se pueden ajustar luego desde el panel.

insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id, v.name, v.description, v.duration_minutes, 0, v.sort_order
from service_categories, (values
  ('Paquetes de novia', null, 240, 1),
  ('Paquetes de quinceañeras', null, 240, 2),
  ('Peinados y maquillaje para reinas, modelos, grados y fiestas sociales', null, 120, 3)
) as v(name, description, duration_minutes, sort_order)
where service_categories.name = 'Peinado y Maquillaje';

insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id, v.name, v.description, v.duration_minutes, 0, v.sort_order
from service_categories, (values
  ('Balayage', null, 300, 1),
  ('Mechas', null, 240, 2),
  ('Iluminaciones', null, 210, 3),
  ('Babylight', null, 240, 4),
  ('Técnicas globales', null, 240, 5),
  ('Bases', null, 120, 6),
  ('Contouring', null, 180, 7)
) as v(name, description, duration_minutes, sort_order)
where service_categories.name = 'Servicios Tinturas';

insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id, v.name, v.description, v.duration_minutes, 0, v.sort_order
from service_categories, (values
  ('Keratinas para cabellos tinturados', 'Producto alisador sin formol, sin contraindicaciones.', 240, 1),
  ('Keratinas para cabellos naturales', 'Producto alisador sin formol, sin contraindicaciones.', 240, 2),
  ('Keratinas para mujeres embarazadas', 'Producto alisador sin formol, sin contraindicaciones.', 240, 3),
  ('Keratinas para niñas', 'Producto alisador sin formol, sin contraindicaciones.', 240, 4)
) as v(name, description, duration_minutes, sort_order)
where service_categories.name = 'Procesos Alisadores';

insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id, v.name, v.description, v.duration_minutes, 0, v.sort_order
from service_categories, (values
  ('Corte para dama', null, 60, 1),
  ('Corte para caballero', null, 40, 2),
  ('Corte para niños y niñas', null, 15, 3)
) as v(name, description, duration_minutes, sort_order)
where service_categories.name = 'Cortes de Cabello';

insert into services (category_id, name, description, duration_minutes, price_cents, sort_order)
select id, v.name, v.description, v.duration_minutes, 0, v.sort_order
from service_categories, (values
  ('Botox capilar', null, 120, 1),
  ('Repolarizaciones L''Oréal', null, 120, 2),
  ('Plex Tecitaly', null, 120, 3),
  ('Olaplex', null, 120, 4)
) as v(name, description, duration_minutes, sort_order)
where service_categories.name = 'Hidrataciones';
