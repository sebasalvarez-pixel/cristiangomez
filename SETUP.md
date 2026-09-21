# Guía de puesta en marcha

El código ya está listo y probado (build + UI). Falta conectar 3 cosas que solo tú puedes crear: Supabase, WhatsApp Cloud API y Vercel.

## 1. Supabase (base de datos + login del staff)

1. Crea una cuenta/proyecto en https://supabase.com (plan gratuito alcanza de sobra).
2. En **SQL Editor**, pega y ejecuta en orden:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed.sql`
   - `supabase/migrations/0003_real_services.sql` (catálogo real de servicios, tomado del sistema anterior)
   - `supabase/migrations/0004_stylist_whatsapp.sql` (agrega el número de WhatsApp de cada estilista, para avisarles de citas nuevas)
3. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (¡no la compartas, tiene acceso total!)
4. Crea los 4 usuarios del staff en **Authentication → Users → Add user** (correo + contraseña), uno por cada estilista (Christian, Fernando, Diany, Linci).
5. En **Table Editor → profiles**, crea una fila por cada usuario recién creado:
   - `id`: el UUID del usuario (columna "User UID" en Authentication → Users)
   - `full_name`: su nombre
   - `role`: `admin` para Christian, `stylist` para los otros 3
6. En **Table Editor → stylists**, en cada fila (ya vienen precargadas del seed) llena `profile_id` con el `id` del perfil correspondiente, para que cada quien vea su propia agenda al iniciar sesión.

## 2. WhatsApp Cloud API (Meta) — ya tienen la cuenta verificada

1. Entra a https://business.facebook.com → tu cuenta de Meta Business → **WhatsApp Manager**.
2. En **API Setup**, copia:
   - `Phone number ID` → `WHATSAPP_PHONE_NUMBER_ID`
   - `WhatsApp Business Account ID` → `WHATSAPP_BUSINESS_ACCOUNT_ID`
3. Genera un **token permanente**: crea un System User en Meta Business Suite (Configuración del negocio → Usuarios → Usuarios del sistema), asígnale el activo de WhatsApp con permiso `whatsapp_business_messaging`, y genera su token sin fecha de expiración → `WHATSAPP_TOKEN`.
4. En **WhatsApp Manager → Plantillas de mensaje**, crea estas 3 plantillas (categoría "Utilidad") y espera la aprobación de Meta (suele tardar minutos a un par de horas):

   **`cita_confirmada`** (idioma: Español (CO))
   ```
   Hola {{1}} 👋 Tu cita en Christian Gómez Peluquería quedó confirmada:
   {{2}} con {{3}}, el {{4}}.
   Dirección: {{5}}
   Si necesitas cancelar, hazlo aquí: {{6}}
   ¡Te esperamos!
   ```

   **`recordatorio_cita`** (mismo orden de variables que la anterior)
   ```
   Hola {{1}}, te recordamos tu cita: {{2}} con {{3}}, el {{4}}.
   Dirección: {{5}}
   Cancelar: {{6}}
   ¡Te esperamos!
   ```

   **`cita_cancelada`**
   ```
   Hola {{1}}, tu cita de {{2}} programada para el {{3}} fue cancelada.
   Si fue un error, contáctanos.
   ```

   **`nueva_cita_estilista`** (esta le llega al estilista, no a la clienta)
   ```
   Hola {{1}}, tienes una cita nueva: {{3}} con {{2}}, el {{4}}. Revisa tu agenda para más detalles.
   ```

   Importante: Meta rechaza plantillas que empiezan o terminan con una variable (por eso cada una cierra con texto fijo). Al crearlas, Meta pide un ejemplo por cada variable: usa valores reales como "María", "Corte para dama", "Fernando", "martes 22 de septiembre, 10:00 AM", la dirección y un link cualquiera.

   Importante: respeta el orden y cantidad de variables tal cual, porque el código las llena en ese orden exacto (ver `src/lib/notifications.ts`).

5. Inventa un texto secreto para `WHATSAPP_VERIFY_TOKEN` (cualquier string), y en **WhatsApp Manager → Configuration → Webhook**, apunta la URL a `https://tu-dominio.vercel.app/api/whatsapp/webhook` usando ese mismo texto como "Verify token".

## 3. Variables de entorno

Copia `.env.example` a `.env.local` (desarrollo) y carga las mismas variables en Vercel (Project Settings → Environment Variables) para producción. Sin `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`, la app funciona igual pero solo simula el envío de WhatsApp en la consola del servidor (modo desarrollo).

## 4. Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. Impórtalo en https://vercel.com/new.
3. Agrega las variables de entorno del paso 3.
4. Al desplegar, el archivo `vercel.json` ya deja configurado el cron que revisa cada 15 minutos qué recordatorios de WhatsApp hay que enviar (24h y 2h antes de cada cita).

## 5. Primeros pasos dentro de la app

- Entra a `/staff/login` con el usuario de Christian (rol admin).
- En **Servicios**, ya está cargado el catálogo completo (nombres y duraciones reales, tomados del sistema anterior). Los precios quedaron en 0 ("Cotizar") porque así los manejaban antes — si quieren precios fijos, edítenlos ahí mismo.
- En **Estilistas**, ajusta el horario laboral real de cada quien (por defecto: martes a sábado, 9am-7pm) y carga el número de WhatsApp de cada uno (botón "WhatsApp" en su fila) — sin ese número, esa persona no recibe el aviso automático de citas nuevas.
- Comparte el link `/reservar` con las clientas (o ponlo como botón en redes sociales / WhatsApp Business).

## Ícono y detalles de marca

Los íconos en `public/icons/` son un placeholder (aro + punto en blanco y negro). Cuando tengan el logo final en alta resolución, reemplázenlos por PNG de 192x192 y 512x512 con el mismo nombre de archivo.
