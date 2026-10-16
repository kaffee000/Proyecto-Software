-- Permite a cada cuenta vecinal cancelar su inscripción y liberar el cupo de forma atómica.

create or replace function public.cancelar_inscripcion_actividad(p_actividad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_nombre text;
    v_cupos_disponibles integer;
begin
    if v_user_id is null then
        return pg_catalog.jsonb_build_object('status', 'no_autenticado');
    end if;

    delete from public.inscripciones
    where actividad_id = p_actividad_id
      and user_id = v_user_id;

    if not found then
        if not exists (
            select 1 from public.actividades
            where id = p_actividad_id
        ) then
            return pg_catalog.jsonb_build_object('status', 'actividad_no_encontrada');
        end if;

        return pg_catalog.jsonb_build_object('status', 'no_inscrito');
    end if;

    update public.actividades
    set cupos_ocupados = greatest(0, cupos_ocupados - 1)
    where id = p_actividad_id
    returning nombre, cupos_totales - cupos_ocupados
    into v_nombre, v_cupos_disponibles;

    return pg_catalog.jsonb_build_object(
        'status', 'cancelada',
        'actividad', v_nombre,
        'cupos_disponibles', v_cupos_disponibles
    );
end;
$$;

revoke all on function public.cancelar_inscripcion_actividad(uuid) from public, anon;
grant execute on function public.cancelar_inscripcion_actividad(uuid) to authenticated;
