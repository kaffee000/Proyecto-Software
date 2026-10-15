-- Permite a cada cuenta vecinal guardar actividades favoritas.
create table if not exists public.actividad_favoritos (
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    actividad_id uuid not null references public.actividades (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, actividad_id)
);

create index if not exists actividad_favoritos_actividad_idx
    on public.actividad_favoritos (actividad_id);

alter table public.actividad_favoritos enable row level security;
revoke all on table public.actividad_favoritos from anon, authenticated;
grant select, insert, delete on table public.actividad_favoritos to authenticated;

drop policy if exists "Vecinos consultan sus favoritos" on public.actividad_favoritos;
create policy "Vecinos consultan sus favoritos"
    on public.actividad_favoritos
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Vecinos guardan sus favoritos" on public.actividad_favoritos;
create policy "Vecinos guardan sus favoritos"
    on public.actividad_favoritos
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Vecinos quitan sus favoritos" on public.actividad_favoritos;
create policy "Vecinos quitan sus favoritos"
    on public.actividad_favoritos
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);
