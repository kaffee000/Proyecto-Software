-- Registra inscripciones vecinales y descuenta cupos de forma atómica.
-- El bloqueo de la fila de actividad evita confirmar dos solicitudes por el último cupo.

alter table public.actividades
    add column if not exists cupos_totales integer,
    add column if not exists cupos_ocupados integer not null default 0;

-- Las actividades existentes publicaban texto como "18 cupos libres".
-- Se conserva ese número como capacidad inicial para no alterar el catálogo.
update public.actividades
set cupos_totales = case
    when substring(coalesce(cupos, '') from '[0-9]+') is null then 0
    else least(substring(cupos from '[0-9]+')::numeric, 1000000)::integer
end
where cupos_totales is null;

alter table public.actividades
    alter column cupos_totales set default 0,
    alter column cupos_totales set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'actividades_cupos_coherentes'
          and conrelid = 'public.actividades'::regclass
    ) then
        alter table public.actividades
            add constraint actividades_cupos_coherentes
            check (cupos_totales >= 0 and cupos_ocupados >= 0 and cupos_ocupados <= cupos_totales);
    end if;
end;
$$;

create table if not exists public.inscripciones (
    actividad_id uuid not null references public.actividades (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (actividad_id, user_id)
);

create index if not exists inscripciones_usuario_fecha_idx
    on public.inscripciones (user_id, created_at desc);

alter table public.inscripciones enable row level security;
revoke all on table public.inscripciones from anon, authenticated;
grant select on table public.inscripciones to authenticated;

drop policy if exists "Vecinos consultan sus inscripciones" on public.inscripciones;
create policy "Vecinos consultan sus inscripciones"
    on public.inscripciones
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

-- Las cuentas de organizador no pueden modificar el contador de reservas por API.
-- Ese dato solo cambia dentro de la función transaccional de inscripción.
revoke insert, update on table public.actividades from authenticated;
grant insert (nombre, descripcion, categoria, fecha, lugar, cupos_totales, estado, imagen)
    on table public.actividades to authenticated;
grant update (nombre, descripcion, categoria, fecha, lugar, cupos, cupos_totales, estado, imagen)
    on table public.actividades to authenticated;

create or replace function public.inscribir_en_actividad(p_actividad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_nombre text;
    v_cupos_disponibles integer;
    v_estado text;
begin
    if v_user_id is null then
        return pg_catalog.jsonb_build_object('status', 'no_autenticado');
    end if;

    begin
        update public.actividades
        set cupos_ocupados = cupos_ocupados + 1
        where id = p_actividad_id
          and estado = 'activo'
          and cupos_ocupados < cupos_totales
        returning nombre, cupos_totales - cupos_ocupados
        into v_nombre, v_cupos_disponibles;

        if not found then
            select nombre, estado
            into v_nombre, v_estado
            from public.actividades
            where id = p_actividad_id;

            if not found then
                return pg_catalog.jsonb_build_object('status', 'actividad_no_encontrada');
            end if;

            if exists (
                select 1 from public.inscripciones
                where actividad_id = p_actividad_id and user_id = v_user_id
            ) then
                return pg_catalog.jsonb_build_object('status', 'duplicada');
            end if;

            if v_estado <> 'activo' then
                return pg_catalog.jsonb_build_object('status', 'inscripcion_cerrada');
            end if;

            return pg_catalog.jsonb_build_object('status', 'sin_cupos');
        end if;

        insert into public.inscripciones (actividad_id, user_id)
        values (p_actividad_id, v_user_id);
    exception
        when unique_violation then
            -- La excepción revierte también el incremento dentro de este bloque.
            return pg_catalog.jsonb_build_object('status', 'duplicada');
    end;

    return pg_catalog.jsonb_build_object(
        'status', 'confirmada',
        'actividad', v_nombre,
        'cupos_disponibles', v_cupos_disponibles
    );
end;
$$;

revoke all on function public.inscribir_en_actividad(uuid) from public, anon;
grant execute on function public.inscribir_en_actividad(uuid) to authenticated;
