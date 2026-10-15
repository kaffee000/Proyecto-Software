# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Vecinos de Talca que buscan actividades deportivas, recreativas o de salud y necesitan conocer horarios, lugares y disponibilidad.
- Organizadores municipales que publican y mantienen la cartelera de actividades.

## Product Purpose

Muni Sport reúne la oferta municipal de actividades comunitarias de Talca para que los vecinos puedan encontrar opciones y los organizadores puedan mantener información vigente.

## Positioning

La cartelera está enfocada en actividades y recintos municipales de Talca, con información local sobre fechas, lugares, categorías y cupos.

## Operating Context

Los vecinos exploran la cartelera y se inscriben en actividades con cupos disponibles. Los organizadores necesitan crear, consultar, actualizar y eliminar actividades y talleres, definiendo la capacidad total de cada uno.

## Capabilities and Constraints

- El proyecto existente usa Express, EJS y Supabase.
- El catálogo consulta actividades desde Supabase; la conexión y los datos dependen de la configuración del proyecto.
- El usuario eligió destacar la exploración de la cartelera como acción principal.
- Las inscripciones vecinales están incluidas en el incremento: cada cuenta puede reservar una vez por actividad y la base de datos protege la capacidad frente a solicitudes simultáneas.
- La inscripción usa la cuenta vecinal existente y no captura datos financieros ni depende de pasarelas de pago.
- Las pruebas académicas deben usar cuentas y actividades simuladas; los pagos reales y las notificaciones automáticas quedan fuera del alcance.
- La guía académica adjunta también pide documentación de arquitectura, criterios de aceptación y evidencia del trabajo en equipo.

## Brand Commitments

- Mantener el nombre Muni Sport y el escudo municipal existente.
- La dirección visual solicitada para este rediseño es blanco como base, rojo `#E63946` como acento, tipografía Geist Sans y un hero fotográfico con composición inspirada en la primera referencia adjunta.

## Evidence on Hand

- Fotografías locales de actividades comunitarias en `src/public/images/`.
- Escudo e identidad municipal en `src/public/images/muni.png` y `src/public/images/logo-muni.png`.
- Guía de trabajo del curso recibida como PDF en la conversación.

## Product Principles

- La cartelera debe mostrar información concreta y local de cada actividad.
- Las herramientas de organización deben mantener la cartelera desde Supabase.
- La portada debe servir tanto a vecinos como a organizadores municipales.
