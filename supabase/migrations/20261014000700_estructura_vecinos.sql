-- Estructura del usuario vecino y verificación previa de disponibilidad de correo/RUT.
-- Los vecinos pueden explorar la cartelera, guardar favoritos e inscribirse en actividades,
-- pero NO tienen permisos para crear, editar ni eliminar eventos (exclusivo de public.organizadores).

create table if not exists public.vecinos (
    user_id uuid primary key references auth.users (id) on delete cascade,
    rut text not null unique check (rut ~ '^[0-9]{7,8}-[0-9Kk]$'),
    primer_nombre text not null check (char_length(btrim(primer_nombre)) between 1 and 60),
    apellido_paterno text not null check (char_length(btrim(apellido_paterno)) between 1 and 60),
    apellido_materno text not null check (char_length(btrim(apellido_materno)) between 1 and 60),
    telefono text not null check (telefono ~ '^9[0-9]{8}$'),
    correo text not null unique check (
        char_length(btrim(correo)) <= 254
        and correo ~* '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
    ),
    correo_verificado boolean not null default true,
    rol text not null default 'vecino' check (rol = 'vecino'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists vecinos_correo_lower_idx
    on public.vecinos (lower(correo));

create index if not exists vecinos_rut_upper_idx
    on public.vecinos (upper(rut));

alter table public.vecinos enable row level security;
revoke all on table public.vecinos from anon, authenticated;
grant select, insert, update on table public.vecinos to authenticated;

drop policy if exists "Vecinos consultan su propio perfil" on public.vecinos;
create policy "Vecinos consultan su propio perfil"
    on public.vecinos
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Vecinos registran su propio perfil" on public.vecinos;
create policy "Vecinos registran su propio perfil"
    on public.vecinos
    for insert
    to authenticated
    with check (
        (select auth.uid()) = user_id
        and rol = 'vecino'
    );

drop policy if exists "Vecinos actualizan su propio perfil" on public.vecinos;
create policy "Vecinos actualizan su propio perfil"
    on public.vecinos
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check (
        (select auth.uid()) = user_id
        and rol = 'vecino'
    );

-- Función de solo consulta booleana para comprobar si un correo o RUT ya está registrado
-- antes de enviar el código de verificación de 4 dígitos o completar el alta.
create or replace function public.verificar_disponibilidad_vecino(
    p_correo text,
    p_rut text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_correo text := lower(btrim(coalesce(p_correo, '')));
    v_rut text := upper(btrim(coalesce(p_rut, '')));
    v_correo_ocupado boolean := false;
    v_rut_ocupado boolean := false;
begin
    if v_correo <> '' then
        select exists (
            select 1 from auth.users u where lower(u.email) = v_correo
            union all
            select 1 from public.vecinos v where lower(v.correo) = v_correo
        )
        into v_correo_ocupado;
    end if;

    if v_rut <> '' then
        select exists (
            select 1 from public.vecinos v where upper(v.rut) = v_rut
        )
        into v_rut_ocupado;
    end if;

    return pg_catalog.jsonb_build_object(
        'correo_registrado', coalesce(v_correo_ocupado, false),
        'rut_registrado', coalesce(v_rut_ocupado, false)
    );
end;
$$;

revoke all on function public.verificar_disponibilidad_vecino(text, text) from public;
grant execute on function public.verificar_disponibilidad_vecino(text, text) to anon, authenticated;

-- Sincroniza automáticamente la tabla public.vecinos cuando se registra un vecino en auth.users
create or replace function public.sincronizar_perfil_vecino()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    v_rut text := upper(btrim(coalesce(v_meta ->> 'rut', '')));
    v_primer_nombre text := btrim(coalesce(v_meta ->> 'primer_nombre', ''));
    v_apellido_paterno text := btrim(coalesce(v_meta ->> 'apellido_paterno', ''));
    v_apellido_materno text := btrim(coalesce(v_meta ->> 'apellido_materno', ''));
    v_telefono text := btrim(coalesce(v_meta ->> 'telefono', ''));
    v_correo text := lower(btrim(coalesce(new.email, '')));
    v_verificado boolean := coalesce((v_meta ->> 'correo_verificado')::boolean, true);
begin
    if v_rut <> ''
       and v_primer_nombre <> ''
       and v_apellido_paterno <> ''
       and v_apellido_materno <> ''
       and v_telefono ~ '^9[0-9]{8}$'
       and v_correo <> '' then
        insert into public.vecinos (
            user_id,
            rut,
            primer_nombre,
            apellido_paterno,
            apellido_materno,
            telefono,
            correo,
            correo_verificado,
            rol
        )
        values (
            new.id,
            v_rut,
            v_primer_nombre,
            v_apellido_paterno,
            v_apellido_materno,
            v_telefono,
            v_correo,
            v_verificado,
            'vecino'
        )
        on conflict (user_id) do update
        set rut = excluded.rut,
            primer_nombre = excluded.primer_nombre,
            apellido_paterno = excluded.apellido_paterno,
            apellido_materno = excluded.apellido_materno,
            telefono = excluded.telefono,
            correo = excluded.correo,
            correo_verificado = excluded.correo_verificado,
            updated_at = now();
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_vecino on auth.users;
create trigger on_auth_user_created_vecino
    after insert on auth.users
    for each row
    execute function public.sincronizar_perfil_vecino();
