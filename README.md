# Muni Sport

Muni Sport es una aplicación web orientada a centralizar y facilitar el descubrimiento de actividades deportivas, recreativas y de salud en Talca.

Este README describe la versión correspondiente al incremento de la Semana 3. El código debe mantener este alcance y este flujo como referencia principal de implementación y demostración.

## Incremento actual

El incremento presenta un recorrido simple para que una persona pueda explorar actividades y simular una inscripción:

```text
Catálogo de actividades → Filtro por categoría → Selección de actividad → Inscripción simulada
```

Las actividades se muestran con información ficticia, por lo que el flujo funciona sin pagos, autenticación ni una base de datos real.

## Funcionalidades

### PBI-01 - Catálogo de actividades simuladas

**Ruta:** `/event`

La vista muestra una grilla de actividades ficticias disponibles en Talca. Cada actividad incluye nombre, categoría, fecha, imagen y una acción para conocerla o iniciar el proceso de inscripción.

El catálogo utiliza datos simulados definidos dentro del proyecto, de manera que pueda visualizarse sin conexión a MongoDB ni a servicios externos.

**Relacionado con:** RF-01, AC-01 y RNF-PERF-01.

### PBI-02 - Filtros por categoría

**Ruta:** `/event`

El catálogo permite filtrar las actividades por las categorías `Deportes`, `Sociales` y `Salud`. También incluye la opción `Todas`, que vuelve a mostrar el catálogo completo.

El filtrado se realiza sobre los datos simulados y conserva al usuario dentro de la vista del catálogo. Cuando una categoría no tiene actividades, se muestra un mensaje informativo.

**Relacionado con:** RF-02, AC-02 y R-01.

### PBI-03 - Inscripción simulada

**Ruta:** `/pagos`

Al seleccionar una actividad y presionar **Inscribirse**, el usuario llega a una vista estática que informa que la inscripción se encuentra en construcción.

Esta vista representa el siguiente paso del producto, pero no solicita ni procesa datos personales, contraseñas, información bancaria ni pagos reales.

**Relacionado con:** RF-03, AC-03, RNF-SEC-01, RES-01 y R-02.

## Flujo de uso

1. Desde la página principal, ingresar al catálogo de actividades.
2. Revisar las actividades disponibles en `/event`.
3. Seleccionar una categoría para filtrar el catálogo.
4. Elegir una actividad.
5. Presionar **Inscribirse**.
6. Visualizar la pantalla `/event` con el mensaje de funcionalidad en construcción.
7. Regresar al catálogo.

Este recorrido constituye el corte vertical de la entrega y permite demostrar la integración entre catálogo, filtros, navegación e inscripción simulada.

## Funcionalidades fuera de este incremento

La visión completa de Muni Sport contempla funcionalidades que se desarrollarán en iteraciones posteriores:

- Integración con Transbank o Webpay.
- Procesamiento de pagos.
- Base de datos real para las actividades.
- Inscripciones persistentes.
- Gestión real de cupos.
- Registro de usuarios con contraseña.
- Inicio de sesión funcional.
- Panel de administración.
- Creación y edición de actividades por administradores.

Las vistas `/login`, `/register`, `/personal`, `/sport` y `/contact` pueden formar parte de la base general del proyecto, pero no pertenecen al flujo evaluado en este incremento.

## Tecnologías

- Node.js
- Express
- EJS
- JavaScript
- Bootstrap
- CSS
- Nodemon

MongoDB corresponde a una integración posterior. El catálogo, los filtros y la inscripción simulada no dependen de una base de datos real.

## Requisitos

Para ejecutar el proyecto se necesita:

- Node.js.
- npm.
- Un navegador web actualizado.

El incremento se ejecuta con datos ficticios y no requiere credenciales privadas ni servicios externos.

## Instalación

Clonar el repositorio y entrar en la carpeta del proyecto:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_PROYECTO>
```

Instalar las dependencias:

```bash
npm install
```

## Ejecución

Iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

Abrir la aplicación en el navegador:

```text
http://localhost:3000
```

El puerto predeterminado es `3000`.

## Verificación rápida

Con la aplicación ejecutándose, el flujo se comprueba de la siguiente manera:

| Acción | Resultado |
|---|---|
| Abrir `/event` | Se visualiza el catálogo de actividades simuladas. |
| Elegir `Deportes` | Se muestran únicamente actividades deportivas. |
| Elegir `Sociales` | Se muestran únicamente actividades sociales. |
| Elegir `Salud` | Se muestran únicamente actividades de salud. |
| Elegir `Todas` | Se visualizan nuevamente todas las actividades. |
| Presionar **Inscribirse** | La aplicación navega a `/inscripcion`. |
| Revisar `/inscripcion` | Se informa que la inscripción está en construcción. |
| Volver al catálogo | El usuario regresa a `/event` sin ingresar datos reales. |

## Estructura del proyecto

```text
src/
├── index.js
├── routes/
│   └── index.js
├── public/
│   ├── main.css
│   └── ...
└── views/
    ├── index.ejs
    ├── event.ejs
    ├── inscripcion.ejs
    └── partials/
```

Los datos simulados deben mantenerse en una estructura clara y separada de la lógica de presentación. Las rutas deben encargarse de la navegación y las vistas de representar la información al usuario.

## Seguridad y privacidad

El incremento utiliza exclusivamente información ficticia y no procesa pagos ni datos personales reales.

Las credenciales, tokens, contraseñas y URI de conexión no deben escribirse en el código ni en la documentación. Cuando una futura integración necesite configuración privada, esta debe manejarse mediante variables de entorno y un archivo `.env` excluido del repositorio.

Ejemplo de configuración local para una integración futura:

```env
PORT=3000
MONGODB_URI=<URI_DE_MONGODB>
```

No se deben incorporar valores reales en este archivo.

## Definition of Done

El incremento cumple su objetivo cuando la aplicación permite recorrer el flujo completo de catálogo, filtros, selección e inscripción simulada; puede ejecutarse en otro equipo siguiendo estas instrucciones; utiliza datos ficticios; no depende de MongoDB, pagos ni autenticación; y no expone credenciales ni solicita información sensible.

## Equipo

Muni Sport fue desarrollado por:

- Martin Aguayo
- Sergio Arellano
- Felipe Oróstica
- Juan Ortiz
- Joaquín Silva
