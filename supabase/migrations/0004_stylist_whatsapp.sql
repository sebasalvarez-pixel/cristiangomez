-- Número de WhatsApp de cada estilista, para avisarles cuando les cae una cita nueva.
alter table stylists add column if not exists phone_e164 text;

-- Nuevo tipo de notificación: aviso al estilista (separado del recordatorio a la clienta).
alter type notification_type add value if not exists 'new_booking_stylist';
