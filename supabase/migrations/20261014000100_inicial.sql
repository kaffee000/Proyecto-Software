-- Esquema inicial de Muni Sport. Se puede ejecutar desde Supabase > SQL Editor.

create table if not exists public.actividades (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    descripcion text not null,
    categoria text not null check (categoria in ('Deportes', 'Salud', 'Sociales')),
    fecha timestamptz not null,
    lugar text not null,
    cupos text,
    estado text not null default 'activo',
    imagen text,
    created_at timestamptz not null default now()
);

create index if not exists actividades_categoria_fecha_idx
    on public.actividades (categoria, fecha);

create table if not exists public.profesionales (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    profesion text,
    email text,
    created_at timestamptz not null default now()
);

alter table public.actividades enable row level security;
revoke all on table public.actividades from anon, authenticated;
grant select on table public.actividades to anon, authenticated;

drop policy if exists "Actividades visibles para todos" on public.actividades;
create policy "Actividades visibles para todos"
    on public.actividades
    for select
    to anon, authenticated
    using (true);

alter table public.profesionales enable row level security;
revoke all on table public.profesionales from anon, authenticated;
grant select on table public.profesionales to anon, authenticated;

drop policy if exists "Profesionales visibles para todos" on public.profesionales;
create policy "Profesionales visibles para todos"
    on public.profesionales
    for select
    to anon, authenticated
    using (true);

insert into public.actividades (
    id, nombre, descripcion, categoria, fecha, lugar, cupos, estado, imagen
)
values
    (
        '00000000-0000-4000-8000-000000000001',
        'Taller formativo de básquetbol y deporte',
        'Entrenamiento dinámico para el desarrollo de fundamentos técnicos, trabajo en equipo y acondicionamiento físico.',
        'Deportes', '2026-10-18 10:00:00-03:00', 'Polideportivo Municipal Talca',
        '18 cupos libres', 'activo', '/images/actividad de deporte.webp'
    ),
    (
        '00000000-0000-4000-8000-000000000002',
        'Baile entretenido y vida activa',
        'Sesiones guiadas de acondicionamiento aeróbico, ritmo y vitalidad en comunidad aptas para todas las edades.',
        'Salud', '2026-10-19 09:30:00-03:00', 'Parque Costanera Río Claro',
        '24 cupos libres', 'activo', '/images/actividad baile entretenido.webp'
    ),
    (
        '00000000-0000-4000-8000-000000000003',
        'Encuentro y actividades para adulto mayor',
        'Jornada de integración vecinal con ejercicios de estiramiento, pausas activas y dinámicas participativas.',
        'Sociales', '2026-10-20 16:00:00-03:00', 'Centro Comunitario Las Américas',
        '40 cupos libres', 'activo', '/images/actividades adulto mayor.webp'
    ),
    (
        '00000000-0000-4000-8000-000000000004',
        'Talleres deportivos de invierno y juventud',
        'Espacios recreativos para niñas, niños y jóvenes durante temporadas de descanso escolar en recintos locales.',
        'Deportes', '2026-10-21 15:00:00-03:00', 'Estadio Sur Talca',
        '25 cupos libres', 'activo', '/images/actividad vacaciones de invierno.webp'
    ),
    (
        '00000000-0000-4000-8000-000000000005',
        'Jornada formativa infanto-juvenil',
        'Práctica de habilidades motrices, juegos colectivos y orientación en salud física preventiva.',
        'Salud', '2026-10-22 11:00:00-03:00', 'Gimnasio Regional de Talca',
        '30 cupos libres', 'activo', '/images/actividad vacaciones de invierno 2.webp'
    ),
    (
        '00000000-0000-4000-8000-000000000006',
        'Hidrogimnasia y bienestar acuático',
        'Sesiones guiadas en piscina temperada para fortalecimiento cardiovascular, bajo impacto articular y bienestar comunitario.',
        'Salud', '2026-10-23 11:00:00-03:00', 'Piscina Municipal de Talca',
        '20 cupos libres', 'activo', '/images/actividad baile en piscina.webp'
    )
on conflict (id) do nothing;
