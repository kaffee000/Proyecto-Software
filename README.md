# Muni Sport

Muni Sport es una aplicación web orientada a centralizar y facilitar el descubrimiento de actividades deportivas, recreativas y de salud en Talca.

Este README describe el incremento definido para la Semana 3: un producto construible, verificable y defendible que permite consultar un catálogo de actividades, filtrarlo por categoría y recorrer una inscripción simulada sin integrar pagos reales.

## Objetivo del incremento

La página principal presenta una oferta de actividades ficticias y permite recorrer el siguiente flujo:

```text
Catálogo de actividades → Filtro por categoría → Selección de actividad → Inscripción simulada
```

El producto utiliza datos estáticos y se ejecuta sin depender de una base de datos, una pasarela de pagos, autenticación ni servicios externos.

## Funcionalidades del MVP

### PBI-01 - Mostrar catálogo de actividades simuladas

**Rutas:** `/` y `/event`

La página principal muestra un catálogo de actividades deportivas, recreativas y de salud disponibles en Talca. La vista contiene una grilla con actividades ficticias e información suficiente para consultarlas, incluyendo título, categoría, fecha, imagen y estado.

El catálogo se alimenta con datos estáticos definidos dentro del proyecto. La carga inicial debe ser fluida y completarse en un máximo de 3 segundos en el entorno local.

**Trazabilidad:** RF-01, RNF-PERF-01, AC-01, R-01 y T-01.

### PBI-02 - Filtrar actividades por categoría

**Ruta:** `/event`

La vista del catálogo incluye una barra superior de filtros con las categorías `Deportes`, `Sociales` y `Salud`. También permite seleccionar `Todas las actividades`, opción que se muestra por defecto al ingresar sin filtros.

Al seleccionar una categoría, la grilla muestra únicamente las actividades correspondientes. Si la categoría no tiene actividades, la grilla oculta los resultados anteriores y muestra un mensaje amigable, manteniendo visible la barra de filtros.

**Trazabilidad:** RF-02, AC-02, AC-04, R-01 y T-02.

### PBI-03 - Redirigir a una inscripción simulada

**Ruta de destino:** `/pagos`

Cada actividad incluye un botón **Inscribirse** o **Pagar**. Al seleccionarlo, la aplicación redirige a una vista estática con el mensaje **En construcción**.

Esta vista únicamente demuestra la navegación del flujo. No contiene formularios funcionales, no solicita datos personales, credenciales o información bancaria, y no envía solicitudes de pago a terceros.

**Trazabilidad:** RF-03, RNF-SEC-01, RES-01, AC-03, R-02 y T-03.

## Criterios de aceptación

| ID | Escenario | Resultado esperado |
|---|---|---|
| AC-01 | La persona ingresa a la página principal. | Se visualiza el catálogo de actividades simuladas junto con la navegación. |
| AC-02 | La persona selecciona la categoría `Salud`. | El catálogo muestra únicamente actividades etiquetadas como `Salud`. |
| AC-03 | La persona presiona `Inscribirse` o `Pagar`. | La aplicación redirige a una pantalla `En construcción` sin solicitar ni enviar datos. |
| AC-04 | La persona selecciona una categoría sin actividades. | La grilla oculta los resultados anteriores y muestra un mensaje informativo, manteniendo los filtros visibles. |

## Reglas y restricciones

| ID | Definición |
|---|---|
| R-01 | Al ingresar sin filtros, el catálogo muestra `Todas las actividades`. |
| R-02 | El flujo de inscripción o pago no captura datos reales ni permite interacción con formularios de pago. |
| RES-01 | El catálogo y la inscripción simulada utilizan exclusivamente información ficticia. |
| RNF-SEC-01 | La navegación hacia la inscripción simulada no procesa datos ni realiza peticiones a terceros. |
| RNF-PERF-01 | La lista de actividades simuladas se muestra en un máximo de 3 segundos en el entorno local. |

## Flujo de demostración

1. Abrir `http://localhost:3000/`.
2. Visualizar el catálogo inicial con `Todas las actividades`.
3. Seleccionar `Deportes`, `Sociales` o `Salud` desde la barra de filtros.
4. Comprobar que la grilla muestra solo la categoría seleccionada.
5. Seleccionar una categoría sin resultados y comprobar el mensaje informativo.
6. Presionar **Inscribirse** o **Pagar** en una actividad.
7. Comprobar la redirección a `/pagos` y el mensaje **En construcción**.
8. Confirmar que no se solicitaron ni enviaron datos reales.

## Alcance y exclusiones

El MVP incluye una vista principal estática, un catálogo de actividades ficticias, filtros por categoría, navegación hacia una vista de inscripción simulada y un diseño responsivo básico.

La integración con Transbank o Webpay, el procesamiento de pagos, la base de datos real, las inscripciones persistentes, la gestión real de cupos, el panel de administración y el registro de usuarios con contraseña pertenecen a iteraciones posteriores.

Las rutas `/login`, `/register`, `/personal`, `/sport` y `/contact` pueden formar parte de la aplicación general, pero no participan en el flujo evaluado de este MVP.

## Tecnologías

- Node.js
- Express
- EJS
- JavaScript
- Bootstrap
- CSS
- Nodemon

MongoDB no forma parte de la ejecución del MVP. El catálogo y sus filtros se construyen con datos estáticos para mantener el incremento simple, reproducible y verificable.

## Requisitos

- Node.js instalado.
- npm instalado junto con Node.js.
- Navegador web actualizado.

No se requieren credenciales privadas, una cuenta de MongoDB, una pasarela de pagos ni servicios externos para ejecutar este incremento.

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
npx nodemon src/index.js
```

Abrir la aplicación en:

```text
http://localhost:3000
```

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
    ├── pagos.ejs
    └── partials/
```

Los datos ficticios pueden definirse en un módulo o archivo JSON separado. Las rutas controlan la navegación, las vistas representan la información y los recursos públicos contienen los estilos e imágenes de la interfaz.

## Seguridad y privacidad

El MVP no recopila datos personales, contraseñas, credenciales ni información bancaria. La vista `/pagos` solo representa una pantalla de navegación simulada y no realiza pagos.

Las URI de conexión, contraseñas, tokens y claves privadas no deben escribirse en el código, en `README.md`, en `mongo.txt` ni en ningún archivo versionado. Si una iteración futura requiere configuración privada, debe utilizar variables de entorno y un archivo `.env` excluido del repositorio.

Ejemplo de configuración local para una integración futura:

```env
PORT=3000
MONGODB_URI=<URI_DE_MONGODB>
```

Este ejemplo no contiene credenciales reales.

## Definition of Done

El incremento se considera terminado cuando la página principal muestra el catálogo ficticio, los filtros por Deportes, Sociales y Salud funcionan junto con la opción Todas, el estado sin resultados es comprensible, el botón de inscripción o pago redirige a `/pagos` sin capturar ni enviar datos, la carga del catálogo se mantiene dentro de 3 segundos, la aplicación puede ejecutarse en otro equipo siguiendo este README y el repositorio no expone información sensible.

## Equipo

Muni Sport fue desarrollado por:

- Martin Aguayo
- Sergio Arellano
- Felipe Oróstica
- Juan Ortiz
- Joaquín Silva
