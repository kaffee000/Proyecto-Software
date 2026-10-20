-- Actualiza las rutas de imágenes locales existentes al formato .webp
update public.actividades
set imagen = regexp_replace(imagen, '\.(jpg|jpeg|png)$', '.webp', 'i')
where imagen ~* '^/images/.+\.(jpg|jpeg|png)$';
