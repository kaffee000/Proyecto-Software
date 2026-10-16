# Muni Sport

Muni Sport centraliza el descubrimiento de actividades deportivas, recreativas y de salud en Talca. La aplicación usa Express y EJS; el catálogo y el directorio profesional se leen desde Supabase (Postgres).

## Funcionalidades

- Catálogo de actividades en `/` y `/event`, filtrable por Deportes, Salud y Sociales.
- Registro e inicio de sesión vecinal con Supabase Auth, búsqueda, favoritos e inscripción por actividad.
- Acceso separado para organizadores en `/admin/login` y gestión CRUD de la cartelera.
- Vista `/personal` para el directorio profesional.
- Inscripción autenticada con reserva de cupo, confirmación, vista de inscripciones propias (`/inscripciones`), cancelación de reserva, rechazo de duplicados y control concurrente de capacidad. No procesa pagos.
- Imágenes servidas desde `src/public/images`.

## Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard). Espera a que la base de datos termine de inicializarse.
2. En el proyecto, abre **SQL Editor**, crea una consulta y ejecuta, en este orden, [`supabase/migrations/20261014000100_inicial.sql`](supabase/migrations/20261014000100_inicial.sql), [`supabase/migrations/20261014000200_crud_actividades_organizadores.sql`](supabase/migrations/20261014000200_crud_actividades_organizadores.sql), [`supabase/migrations/20261014000300_favoritos_vecinales.sql`](supabase/migrations/20261014000300_favoritos_vecinales.sql), [`supabase/migrations/20261014000400_inscripciones_cupos.sql`](supabase/migrations/20261014000400_inscripciones_cupos.sql) y [`supabase/migrations/20261014000500_cancelar_inscripcion.sql`](supabase/migrations/20261014000500_cancelar_inscripcion.sql). Las últimas dos migraciones agregan capacidad y reservas a las actividades y operaciones atómicas para confirmar o cancelar inscripciones sin sobrepasar los cupos.
3. En **Connect** o **Settings → API Keys**, copia el **Project URL** y la **Publishable key** (`sb_publishable_...`). Para proyectos antiguos, se puede usar la clave `anon` en su lugar.
4. En la raíz del proyecto, crea `.env` desde la plantilla (`Copy-Item .env.example .env` en PowerShell; `cp .env.example .env` en macOS/Linux) y completa:

   ```env
   PORT=3000
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_<tu-clave>
   ```

   Si tu proyecto antiguo solo tiene la clave `anon`, usa `SUPABASE_ANON_KEY` en lugar de `SUPABASE_PUBLISHABLE_KEY`. No agregues la clave `service_role` ni una clave `sb_secret_` al archivo de la aplicación.

5. Instala dependencias e inicia la aplicación:

   ```bash
   npm install
   npm run dev
   ```

6. Crea y confirma una cuenta de organizador en **Authentication → Users**. Copia su UUID y, desde **SQL Editor**, autorízala:

   ```sql
   insert into public.organizadores (user_id)
   values ('UUID-DE-LA-CUENTA');
   ```

   Luego abre `http://localhost:3000/admin/actividades` e inicia sesión con el correo y contraseña de esa cuenta. Las categorías permitidas son `Deportes`, `Salud` y `Sociales`; los estados son `activo`, `pausado`, `finalizado` y `cancelado`. La imagen puede ser una ruta local bajo `/images/` o una URL HTTPS.

Las cuentas vecinales se crean desde `/register` y se autentican desde `/login`; pueden guardar actividades, buscarlas, ver sus favoritos e inscribirse en actividades con cupos disponibles. La capacidad se define como un número total en la gestión de actividades y el catálogo descuenta cada reserva confirmada. La base de datos impide reservas duplicadas y serializa las inscripciones concurrentes por actividad. Si Supabase Authentication exige confirmar el correo, la persona debe abrir el enlace recibido antes de iniciar sesión. La foto de perfil es opcional y acepta una URL HTTPS; si no se define, se muestran las iniciales.

El panel de organizadores usa una sesión almacenada en el servidor. En desarrollo se genera un secreto temporal; en producción define un `SESSION_SECRET` largo y configura un almacén de sesión persistente antes de desplegar varias instancias.

Las claves de publicación no sustituyen la seguridad de la base de datos. RLS permite leer actividades y profesionales públicamente, pero solo usuarios con fila en `public.organizadores` pueden crear, editar o eliminar actividades. No agregues una clave `service_role` ni una clave `sb_secret_` al servidor web.

## Datos existentes en MongoDB

El código anterior consultaba la colección `webMuni.profesionales`, pero este repositorio no tiene una URI de MongoDB configurada ni contiene un respaldo de esos documentos. La migración SQL crea el esquema equivalente (`nombre`, `profesion`, `email`), pero no puede copiar registros a los que no tiene acceso. Si hay datos que conservar, expórtalos desde MongoDB a CSV con esos encabezados e impórtalos en `public.profesionales` desde Supabase **Table Editor**. El catálogo actual provenía de datos escritos en el código; la migración SQL los inserta en `public.actividades`.

## Desarrollo local

Requisitos: Node.js 20.6 o posterior y npm. `npm run dev` inicia Express y Tailwind CSS en modo watch. `npm run build:css` genera el CSS minificado para compilarlo antes de desplegar. Supabase debe estar configurado para cargar el catálogo. Si faltan las variables de entorno o hay un error de conexión, la aplicación muestra un aviso en el catálogo y sigue disponible para navegar las demás páginas.

El archivo `.env` está excluido de Git. Para conectar otro entorno, configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en las variables de entorno de ese servicio. Nunca uses una clave secreta o `service_role` en código cliente o en un repositorio.

## Estructura

```text
src/
├── index.js                 # Express y cliente Supabase
├── routes/index.js          # Catálogo y CRUD de actividades
├── middleware/organizador.js # Sesión, rol y protección CSRF del panel
├── styles.css               # Entrada de Tailwind CSS
├── public/                  # CSS generado e imágenes
└── views/                   # Vistas EJS
supabase/
└── migrations/              # Esquema, RLS, datos y roles de organizador
```
