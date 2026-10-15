---
name: Muni Sport
description: Cartelera municipal de actividades de Talca, organizada como un registro cronológico.
colors:
  primary: "#E63946"
  primary-deep: "#C92F3C"
  featured: "#8F2632"
  ink: "#191919"
  muted: "#686868"
  paper: "#FFFFFF"
  soft: "#F5F4F2"
typography:
  display:
    fontFamily: "Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.65rem, 7.1vw, 5rem)"
    fontWeight: 500
    lineHeight: 0.99
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.11em"
rounded:
  compact: "6px"
  control: "12px"
  panel: "16px"
  hero-mobile: "24px"
  pill: "9999px"
spacing:
  unit: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  section: "64px"
  section-expanded: "96px"
components:
  navigation-shell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "82px"
    padding: "0 28px"
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
  filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  status-active:
    backgroundColor: "#FFF1F2"
    textColor: "#A92330"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  featured-activity:
    backgroundColor: "{colors.featured}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "20px"
  activity-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "24px 0"
  activity-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13.6px 16px"
  delete-confirmation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "32px 0"
---

# Design System: Muni Sport

## Overview

**Creative North Star: "Registro municipal en movimiento"**

Muni Sport presenta la oferta deportiva, recreativa y de salud de Talca como un registro local que se mantiene vivo con cada convocatoria. Una fotografía real de actividad comunitaria abre la experiencia; fechas, recintos, categorías y estados escritos mantienen la información concreta y fácil de comparar.

La cartelera es la tarea principal de vecinos y organizadores. El mismo lenguaje ordenado por fecha conecta la portada y la vista pública con el registro CRUD municipal. La identidad combina blanco amplio, tinta oscura, rojo municipal y Geist Sans, siempre junto al escudo oficial de la Municipalidad de Talca.

**Key Characteristics:**
- La fotografía de actividades reales abre la portada.
- La cartelera se lee en filas cronológicas con fecha, lugar, categoría y estado.
- El rojo señala acciones y datos clave; las etiquetas nombran cada estado.
- El panel de organización reutiliza la claridad del registro público.

## Colors

El blanco y la tinta llevan la mayor parte de la interfaz; el carmín profundo destaca la actividad próxima y el rojo municipal señala acciones, fechas y referencias clave.

### Primary
- **Rojo municipal** (#E63946): marcadores, subrayados, foco de teclado y detalles que orientan la mirada.
- **Carmín de acción** (#C92F3C): fondo de botones principales sobre superficies claras, con texto blanco.
- **Carmín profundo** (#8F2632): ficha de próxima actividad superpuesta al hero, con texto blanco y metadatos atenuados.

### Neutral
- **Papel** (#FFFFFF): fondo principal y superficies de navegación, formularios y fichas.
- **Tinta** (#191919): titulares, nombres de actividades, navegación y datos prioritarios.
- **Texto secundario** (#686868): descripciones, recintos, ayudas y metadatos.
- **Superficie suave** (#F5F4F2): separación tonal de secciones.
- **Reglas finas** (negro al 10–15%): separadores de filas, tablas y bloques editoriales.

Los estados conservan una etiqueta visible en palabras. “Activa” usa rosa pálido con texto rojo oscuro; “Pausada” usa ámbar claro; “Finalizada” y “Cancelada” usan gris cálido. El color acompaña al estado, nunca lo comunica por sí solo.

### Named Rules
**The Carmine-Signal Rule.** El rojo municipal #E63946 marca detalles y referencias clave; el carmín profundo #C92F3C sostiene los botones llenos. Cada estado también aparece escrito.

## Typography

**Display Font:** Geist Sans (fallback: Geist, system-ui, sans-serif)
**Body Font:** Geist Sans (fallback: Geist, system-ui, sans-serif)
**Label/Mono Font:** Geist Sans para etiquetas; cifras tabulares para fechas y horas.

**Character:** Geist mantiene un tono municipal contemporáneo, directo y legible. Los titulares compactos y de gran escala aportan energía; los datos de fecha y lugar conservan una lectura sobria.

### Hierarchy
- **Display** (500, clamp 2.65rem–5rem, line-height 0.99): titular de portada, con ancho controlado y tracking de -0.04em.
- **Headline** (600, 36px base; 48px en sm y 60px en lg, line-height 1.02): títulos de páginas y secciones.
- **Title** (600, 18–20px, line-height 1.375): nombres de actividades, fichas y filas.
- **Body** (400, 16px, line-height 1.75): introducciones y texto principal; el detalle del catálogo baja a 14px con interlineado generoso.
- **Label** (600, 11px, tracking 0.11em, mayúsculas): categoría, hora y encabezados compactos. Las fechas usan cifras tabulares.

### Named Rules
**The Clear-Data Rule.** Mantén fecha, hora, recinto y estado legibles en sus propios rótulos; la jerarquía tipográfica ayuda a escanear, no sustituye los nombres de los datos.

## Layout

La navegación blanca ocupa 82px de alto, conserva el escudo y el nombre Muni Sport, y limita su contenido a 1440px. El contenido editorial usa un máximo de 1280px, con márgenes laterales de 16px en móvil y 28px desde md. Las secciones amplían su espacio vertical de 64px a 96px en pantallas mayores.

En escritorio, el hero comienza justo bajo la navegación, conserva un margen lateral de 24px y tiene una altura mínima de la ventana menos los 82px del encabezado. Sus cuatro esquinas usan un radio de 24px. La foto cubre el fondo; dos degradados oscuros sostienen la lectura del titular y los botones a la izquierda. La próxima actividad aparece en una ficha carmín profundo superpuesta abajo a la derecha.

En móvil, el hero conserva esquinas de 24px y sigue este orden: titular, descripción, acciones, fotografía y ficha de actividad. El texto y las acciones siempre preceden a la imagen, sin superponerse. La foto mide 220px en el ancho base y 320px desde sm.

La cartelera organiza las actividades como filas cronológicas, con categoría, fecha y hora, nombre, recinto, estado y acceso a consulta en una misma unidad. Los filtros reducen resultados y conservan ese orden. En pantallas anchas, fecha, actividad, recinto, estado y acción tienen columnas propias; en móvil, los datos se apilan dentro de cada fila. El panel CRUD reutiliza la misma jerarquía: tabla en escritorio, registros apilados en móvil y formularios agrupados con claridad.

### Named Rules
**The Date-First Register Rule.** Mantén las actividades en orden cronológico y agrupa sus datos esenciales en cada fila para que vecinos y organizadores puedan comparar la misma información.

## Elevation & Depth

La interfaz es plana por defecto. Las reglas finas y los cambios de superficie separan el contenido; el hero usa degradados sobre la fotografía para asegurar contraste. Las sombras quedan reservadas para elementos flotantes: la ficha de próxima actividad y el menú móvil.

### Shadow Vocabulary
- **Ficha destacada** (0 18px 50px -22px rgba(0, 0, 0, 0.5)): separa la convocatoria próxima de la fotografía del hero.
- **Menú móvil** (0 18px 48px -18px rgba(25, 25, 25, 0.28)): distingue el menú desplegable de la página.

### Named Rules
**The Flat-By-Default Rule.** Usa separadores y superficies para estructurar listas; reserva las sombras para elementos que flotan sobre otro contenido.

## Shapes

Las acciones, filtros y estados usan siluetas de píldora. Los campos tienen esquinas de 12px, la ficha destacada y el menú móvil de 16px, y el marco del hero móvil de 24px. Las filas del catálogo permanecen abiertas, separadas por reglas horizontales en vez de envolverse en tarjetas repetidas.

## Components

### Buttons
Los botones se sienten directos y fáciles de identificar.

- **Shape:** píldora, 9999px.
- **Primary:** carmín #C92F3C sobre papel, texto blanco, mínimo 48px de alto y 24px de espacio horizontal.
- **Hover / Focus:** el hover oscurece el carmín; el CTA del hero sube 2px. El foco conserva un contorno visible de 2px y separación de 3px.
- **Secondary:** borde fino, texto tinta y fondo blanco; sobre la fotografía usa borde y texto blancos.

### Chips
- **Category filter:** seleccionado en tinta con texto blanco; sin seleccionar, fondo blanco y borde tenue. Ambos conservan forma de píldora.
- **Activity state:** etiqueta compacta con el estado escrito. Activa usa rosa/rojo, pausada ámbar y estados terminados gris cálido.

### Cards / Containers
La ficha de próxima actividad es el único contenedor prominente de la portada: fondo #8F2632, texto blanco, radio de 16px, padding de 20–24px y sombra cuando se superpone a la foto. Las actividades del catálogo siguen siendo filas abiertas, sin una grilla de tarjetas uniformes.

### Inputs / Fields
Los campos llevan etiqueta encima, fondo blanco, borde de tinta al 18% y radio de 12px. El foco cambia el borde a rojo y añade un halo suave de 3px; las ayudas y los errores se muestran junto al campo correspondiente.

### Navigation
La navegación comparte el escudo municipal, de formato cuadrado, pegado al nombre Muni Sport en una banda blanca de 82px. La acción para visitas lleva al acceso vecinal; con sesión vecinal aparecen búsqueda, favoritos y avatar. El acceso de organizadores conserva su ruta separada.

### Activity Register Row
Cada registro reúne fecha, categoría y hora, nombre y descripción, recinto, estado y una acción. Las líneas divisorias y las cifras tabulares permiten recorrer la agenda sin convertirla en una cuadrícula de tarjetas.

### Organizer CRUD
La gestión usa una tabla en escritorio y registros apilados en móvil. Crear y editar comparten campos etiquetados y grupos separados por reglas; eliminar tiene una confirmación propia, con la acción destructiva separada de la opción de conservar.

## Do's and Don'ts

### Do:
- **Do** conserva el escudo oficial y el nombre Muni Sport juntos en la navegación.
- **Do** mantiene el hero casi a borde completo, con 24px de margen lateral y las cuatro esquinas redondeadas en escritorio; en móvil coloca copia y acciones antes de la foto.
- **Do** mantiene fecha, recinto y estado junto a cada actividad tanto en la cartelera como en el panel.
- **Do** acompaña cada color de estado con una etiqueta escrita y visible.

### Don't:
- **Don't** reemplaces la cartelera cronológica principal por una grilla de tarjetas idénticas.
- **Don't** comuniques un estado solo mediante el color.
- **Don't** muevas el texto o las acciones del hero móvil detrás de la fotografía.
- **Don't** sustituyas el escudo de la Municipalidad de Talca por un símbolo genérico.

\n
