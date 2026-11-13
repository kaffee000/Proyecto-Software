-- Permite a los organizadores autenticados guardar y actualizar las coordenadas
-- de ubicación al crear o editar actividades, manteniendo protegido cupos_ocupados.

grant insert (latitud, longitud)
    on table public.actividades to authenticated;

grant update (latitud, longitud)
    on table public.actividades to authenticated;
