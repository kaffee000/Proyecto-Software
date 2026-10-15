-- Habilita el CRUD de actividades para cuentas autenticadas de organizadores.
-- Crear cada cuenta desde Supabase Auth y registrar su UUID en public.organizadores.

create table if not exists public.organizadores (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.organizadores enable row level security;
revoke all on table public.organizadores from anon, authenticated;
grant select on table public.organizadores to authenticated;

drop policy if exists "Organizadores consultan su propio perfil" on public.organizadores;
create policy "Organizadores consultan su propio perfil"
    on public.organizadores
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

-- La cartelera sigue siendo pública, pero las escrituras requieren la sesión
-- de Supabase Auth y una fila en public.organizadores.
revoke insert, update, delete on table public.actividades from anon, authenticated;
grant insert, update, delete on table public.actividades to authenticated;

drop policy if exists "Organizadores crean actividades" on public.actividades;
create policy "Organizadores crean actividades"
    on public.actividades
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.organizadores o
            where o.user_id = (select auth.uid())
        )
    );

drop policy if exists "Organizadores actualizan actividades" on public.actividades;
create policy "Organizadores actualizan actividades"
    on public.actividades
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.organizadores o
            where o.user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1
            from public.organizadores o
            where o.user_id = (select auth.uid())
        )
    );

drop policy if exists "Organizadores eliminan actividades" on public.actividades;
create policy "Organizadores eliminan actividades"
    on public.actividades
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.organizadores o
            where o.user_id = (select auth.uid())
        )
    );