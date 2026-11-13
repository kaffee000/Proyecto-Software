-- Coordenadas de referencia para ubicar actividades en el mapa de muestra.
-- El organizador puede mover el marcador y actualizar estos puntos desde el formulario.

alter table public.actividades
    add column if not exists latitud double precision,
    add column if not exists longitud double precision;

update public.actividades
set latitud = null,
    longitud = null
where (latitud is null) <> (longitud is null);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'actividades_coordenadas_validas'
          and conrelid = 'public.actividades'::regclass
    ) then
        alter table public.actividades
            add constraint actividades_coordenadas_validas
            check (
                (latitud is null and longitud is null)
                or (
                    latitud is not null
                    and longitud is not null
                    and latitud between -90 and 90
                    and longitud between -180 and 180
                )
            );
    end if;
end;
$$;

-- Coordenadas aproximadas de los recintos de muestra incluidos en la migración inicial.
update public.actividades
set latitud = case
        when lower(lugar) like '%polideportivo%' then -35.422300
        when lower(lugar) like '%costanera%' then -35.414800
        when lower(lugar) like '%las américas%' or lower(lugar) like '%las americas%' then -35.411600
        when lower(lugar) like '%estadio sur%' then -35.439200
        when lower(lugar) like '%gimnasio regional%' then -35.424900
        when lower(lugar) like '%piscina municipal%' then -35.424600
        else -35.426400
    end,
    longitud = case
        when lower(lugar) like '%polideportivo%' then -71.638700
        when lower(lugar) like '%costanera%' then -71.676400
        when lower(lugar) like '%las américas%' or lower(lugar) like '%las americas%' then -71.640400
        when lower(lugar) like '%estadio sur%' then -71.664000
        when lower(lugar) like '%gimnasio regional%' then -71.656700
        when lower(lugar) like '%piscina municipal%' then -71.661700
        else -71.655400
    end
where latitud is null
  and longitud is null;
