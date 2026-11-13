# Guía del código de Nexo Realty

Esta guía explica cómo está organizado el sitio y qué hace cada parte del código. Añadí comentarios en los archivos fuente para identificar las funciones y secciones; aquí está la explicación ampliada, siguiendo el orden en que normalmente se recorre la aplicación.

## 1. Mapa del proyecto

| Ruta | Responsabilidad |
| --- | --- |
| `app/page.tsx` | Portada pública, catálogo, filtros y enlaces de contacto. |
| `app/propiedades/[id]/page.tsx` | Ficha de un inmueble, galería y enlace prellenado a WhatsApp. |
| `app/dashboard/page.tsx` | Panel de propiedades, estadísticas y controles según el rol. |
| `app/dashboard/layout.tsx` | Comprueba la sesión en servidor antes de mostrar el panel. |
| `app/login/page.tsx` | Formulario de inicio de sesión. |
| `components/AdministrarUsuarios.tsx` | Crear cuentas, cambiar roles, restablecer claves y administrar actividad. |
| `components/CambiarContrasena.tsx` | Cambio de clave propia y cambio obligatorio tras un restablecimiento. |
| `app/api/auth/` | Inicio/cierre de sesión, sesiones, usuarios y contraseñas. |
| `lib/auth.ts`, `lib/passwords.ts` | Sesiones firmadas, roles y hashes de contraseña con scrypt. |
| `lib/storage.ts`, `app/api/media/route.ts` | Subida/borrado firmado de fotos en almacenamiento compatible con S3. |
| `migrations/001_cuentas_filtros.sql` | Tablas de usuarios, bloqueos de acceso y columnas nuevas del inmueble. |
| `scripts/migrate-db.mjs`, `scripts/bootstrap-users.mjs` | Aplicar la migración y crear las primeras cuentas. |
| `components/FormularioPropiedad.tsx` | Formulario compartido para registrar/editar propiedades y preparar fotos. |
| `components/Tarjeta.tsx` | Tarjeta visual reutilizable para un indicador con título, valor y detalle. |
| `app/api/propiedades/route.ts` | API de colección: lectura (`GET`) y creación (`POST`) en PostgreSQL. |
| `app/api/propiedades/[id]/route.ts` | API por ID: actualización (`PUT`) y eliminación (`DELETE`). |
| `app/api/db-test/route.ts` | Comprueba la conexión del servidor con la base de datos. |
| `lib/db.ts` | Crea y reutiliza el pool de conexiones PostgreSQL. |
| `lib/Propiedades.ts` | Almacén reactivo basado en `localStorage`, utilizado por la ficha actual. |
| `lib/imagenes-propiedades.ts` | Galerías de imágenes de muestra para IDs conocidos. |
| `types/propiedad.ts` | Modelo TypeScript compartido para propiedades y sus estados. |
| `app/layout.tsx`, `app/globals.css` | Marco HTML, metadatos, fuentes y estilos globales. |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` | Configuración de Next.js, TypeScript y ESLint. |

## 2. Cómo se muestra la página principal

En `app/page.tsx`, `"use client"` indica que este componente funciona en el navegador y puede usar estado, efectos y eventos. Los imports traen React (`useEffect`, `useState`), enlaces internos de Next, las galerías de respaldo y el tipo `Propiedad`.

`formatoPrecio` usa `Intl.NumberFormat` para mostrar números como dólares estadounidenses sin centavos. Dentro de `Home`, los `useState` mantienen la lista recibida, si todavía carga, el mensaje de error, el texto de búsqueda y el estado elegido en el filtro.

El `useEffect` se ejecuta al montar la página. Su función interna solicita `/api/propiedades` con `cache: "no-store"`, comprueba el estado HTTP, convierte la respuesta JSON a datos y actualiza el estado. El `try/catch/finally` distingue éxito, error y final de carga. La variable `activo` evita cambiar estado después de que el componente se haya desmontado.

Después, `propiedadesPublicas` excluye las que tienen estado `Vendida`. `propiedadesFiltradas` conserva las que coinciden con el nombre o la ubicación y con el filtro seleccionado. El `return` construye la interfaz en JSX: navegación, portada, introducción, buscador, resultados, sección “Nosotros”, contacto y pie de página. Las clases `className` son utilidades de Tailwind que controlan apariencia y adaptación a distintos tamaños de pantalla.

En cada tarjeta, `map` convierte cada propiedad en un enlace a `/propiedades/{id}`. La imagen se escoge en este orden: primera imagen no vacía guardada con el inmueble, primera foto de su galería de respaldo, o la primera foto de la galería número 1. Los condicionales JSX muestran estados de carga, error, lista o mensaje de cero resultados.

Los enlaces de WhatsApp contienen un número telefónico escrito en el código. El botón de contacto de la portada abre un mensaje general; el enlace de la ficha construye un texto específico para el inmueble.

## 3. Ficha individual

`app/propiedades/[id]/page.tsx` usa `[id]` como segmento dinámico de URL. `useParams` lee ese identificador. `useSyncExternalStore` conecta React a las funciones del almacén local: una función para suscribirse a cambios, otra para leer el valor actual en el navegador y otra para el valor inicial del servidor.

`find` busca una propiedad cuyo ID coincida. Si no aparece, el componente devuelve una pantalla “Propiedad no encontrada”. Si existe, selecciona imágenes, arma un mensaje personalizado y presenta ubicación, nombre, precio, estado, galería, descripción, habitaciones, baños y superficie.

`encodeURIComponent(mensaje)` codifica el texto para que pueda viajar en la URL de WhatsApp. `target="_blank"` abre otra pestaña y `rel="noopener noreferrer"` aísla la pestaña nueva. `Suspense` muestra “Cargando propiedad...” mientras se resuelve el contenido.

**Diferencia actual de datos:** la portada y el dashboard llaman a la API PostgreSQL. En cambio, esta ficha lee `lib/Propiedades.ts`, que mantiene valores de demostración/localStorage. Por ello, una propiedad creada en PostgreSQL no necesariamente aparecerá al abrir su ficha; esta parte requiere conectarse a la API para que todo el sitio use la misma fuente.

## 4. Dashboard administrativo

En `app/dashboard/page.tsx`, los estados React guardan inventario, carga, errores, apertura del modal, propiedad seleccionada para editar y filtros. El efecto inicial hace `GET /api/propiedades` y muestra la respuesta.

Los cálculos `total`, `disponibles`, `reservadas`, `vendidas`, `valorTotal` y `precioPromedio` derivan indicadores desde el inventario. `porcentaje` evita dividir por cero. `useMemo` vuelve a calcular la lista visible cuando cambia el inventario o los filtros.

Las funciones de acción corresponden a los métodos de la API:

1. `registrarPropiedad` envía JSON a `POST /api/propiedades`; al éxito añade el inmueble al principio de la lista y cierra el modal.
2. `editarPropiedad` envía JSON a `PUT /api/propiedades/{id}`; al éxito reemplaza la fila correspondiente.
3. `eliminarPropiedad` pide confirmación del navegador, llama a `DELETE /api/propiedades/{id}` y quita la fila.
4. `abrirEdicion` selecciona el inmueble y abre el modal; `abrirRegistro` limpia esa selección y abre un formulario nuevo.
5. `colorEstado` asigna clases CSS según el estado. `maxPrecio` encuentra el precio máximo para escalar el gráfico.

El JSX del dashboard se organiza en menú lateral, barra superior, resumen, gráficos, lista filtrable, y modal. La lista muestra hasta seis inmuebles (`slice(0, 6)`). Los gráficos son elementos HTML con alturas y fondos calculados desde los datos, no una biblioteca externa. El modal entrega al formulario callbacks para guardar o cerrar.

## 5. Formulario y fotografías

`FormularioPropiedad.tsx` es un componente cliente. `FormularioPropiedadProps` define tres entradas: `onGuardar`, `onCerrar` y, opcionalmente, `propiedadEditar`. El componente exterior asigna una `key` distinta según se trate de un registro nuevo o uno existente; React vuelve a montar los campos cuando cambia esa clave.

`FormularioCampos` crea un estado para cada valor del formulario. Si recibe una propiedad para edición, los estados comienzan con esos valores; si no, comienzan vacíos y el estado predeterminado es `Disponible`.

`comprimirImagen` crea una URL temporal para el archivo, lo carga en una imagen, dibuja la imagen en un canvas y reduce su dimensión máxima a 1400 píxeles. Luego la codifica como JPEG con calidad 0.72, revoca la URL temporal y devuelve el resultado como texto base64. Si no puede cargar o procesar la imagen, rechaza la promesa con un error.

`manejarSeleccionFotos` permite hasta cinco fotos, las comprime en el navegador y las sube a `/api/media`; el servidor las guarda en el bucket configurado y devuelve una URL. El formulario deja mover las fotos cargadas y quitar las que no se usarán. `manejarEnvio` valida el límite de fotos y los enlaces, y llama a `onGuardar` con los datos normalizados. Las credenciales S3 se documentan en [CONFIGURAR_ACCESO.md](CONFIGURAR_ACCESO.md).

Las constantes `estiloInput` y `estiloLabel` agrupan clases visuales repetidas. El JSX restante se divide en información general, características, fotos, información comercial y botones de acción. Los atributos `value` y `onChange` hacen campos controlados por React; `required`, `min` y `step` agregan validaciones básicas del navegador.

## 6. API y base de datos

### `GET` y `POST /api/propiedades`

La lista `estados` limita el estado a `Disponible`, `Reservada` o `Vendida`. `validarPropiedad` recibe `unknown` porque el JSON externo no es confiable: verifica objeto, textos, números finitos, enteros donde corresponde, estado, baños, descripción y arreglo de imágenes. Devuelve `null` si algo no es válido; de lo contrario limpia espacios y normaliza valores opcionales.

`convertirPropiedad` transforma los valores devueltos por PostgreSQL en el modelo TypeScript. `GET` consulta la tabla `propiedades` y hace `LEFT JOIN` con `imagenes_propiedad`; `JSON_AGG` recoge las URLs en orden y `COALESCE` entrega un arreglo vacío cuando no hay imágenes. Los errores se registran en el servidor y responden HTTP 500.

`POST` primero intenta analizar el JSON (HTTP 400 si no es válido), luego valida el contenido (HTTP 400 si no cumple). Obtiene un cliente del pool y ejecuta `BEGIN`. Inserta los datos principales usando parámetros `$1`, `$2`, etc., que separan valores de la instrucción SQL. Si hay imágenes, las inserta asociadas al ID. `COMMIT` confirma ambas partes como una operación; `ROLLBACK` deshace cambios ante error; `release` devuelve el cliente al pool. En éxito responde con el nuevo registro y estado HTTP 201.

### `PUT` y `DELETE /api/propiedades/[id]`

El tipo `ContextoRuta` refleja la convención actual de Next: `params` es una promesa. Cada método espera los parámetros, convierte el ID a número y rechaza IDs no enteros o menores que uno.

`PUT` parsea y valida el cuerpo, actualiza la fila, detecta el caso sin coincidencia (404), borra las imágenes anteriores e inserta las nuevas, todo dentro de una transacción. Devuelve el registro actualizado.

`DELETE` inicia una transacción, elimina primero las imágenes relacionadas y luego el inmueble. Si no encuentra el ID responde 404; si lo elimina confirma y devuelve un mensaje. En ambos métodos, los errores producen respuesta 500 y se intenta revertir la transacción.

### Conexión

`lib/db.ts` importa `server-only` para evitar que el módulo se incluya en código del navegador. Lee `DATABASE_URL` del entorno y falla con un mensaje entendible si falta. Crea un `Pool` de `pg` con hasta diez conexiones. En desarrollo conserva el pool en `globalThis` para reducir conexiones duplicadas durante recargas rápidas.

`app/api/db-test/route.ts` ejecuta una consulta pequeña que devuelve el nombre de la base y la hora. Solo una sesión de administrador puede llamar este endpoint. Si funciona, responde con `conectado: true`; si falla, responde HTTP 500 y `conectado: false`.

## 7. Inicio de sesión y roles

`app/login/page.tsx` presenta los campos de usuario y contraseña, envía el formulario a `POST /api/auth/login` y muestra errores del servidor. Si las credenciales son correctas, el navegador pasa al dashboard.

Las variables `ADMIN_USERNAME`/`ADMIN_PASSWORD` y `VIEWER_USERNAME`/`VIEWER_PASSWORD` solo sirven para insertar las cuentas iniciales con `npm run users:bootstrap`. A partir de entonces, `usuarios` en PostgreSQL es la fuente de cuentas y permisos. `lib/passwords.ts` cifra contraseñas con `scrypt` y una sal aleatoria. `lib/auth.ts` firma una cookie con HMAC-SHA256, y vuelve a consultar la cuenta activa y rol al autorizar cada solicitud; así, una cuenta desactivada o un rol cambiado surte efecto de inmediato. La sesión dura ocho horas.

`app/dashboard/layout.tsx` valida la cookie antes de renderizar el dashboard; sin sesión envía a `/login`. El dashboard consulta `GET /api/auth/session` para mostrar el rol y enseñar botones de edición solamente al administrador. `POST /api/auth/logout` borra la cookie.

Los Route Handlers vuelven a verificar el rol. `GET /api/propiedades` sigue abierto para que el catálogo público funcione. `POST` exige administrador para crear; `PUT` y `DELETE` exigen administrador para editar o eliminar. `app/api/auth/users` crea y lista usuarios; la ruta `[id]` cambia permisos, contraseña, estado o elimina la cuenta. Los endpoints impiden quitar al último administrador activo y no permiten a una cuenta cambiarse a sí misma a solo lectura. `PATCH /api/auth/password` verifica la contraseña actual. Si el administrador asigna una clave temporal, el sistema obliga a cambiarla antes de volver a permitir operaciones.

Cinco intentos fallidos bloquean el nombre de usuario durante 15 minutos. El control está guardado en la tabla `auth_login_attempts`. Si el usuario olvida su clave, el administrador la restablece; no se configuró envío de correo, por lo que no hay enlace automático de recuperación.

Para definir tus credenciales locales, sigue [CONFIGURAR_ACCESO.md](CONFIGURAR_ACCESO.md). `.env.example` contiene solo valores de ejemplo.

## 8. Datos auxiliares y tipos

`types/propiedad.ts` define `Estado` como unión de tres textos permitidos. `Propiedad` agrupa ID, nombre, ubicación, precio, habitaciones, superficie y estado, además de tipo, dirección, baños, descripción, amenidades e imágenes opcionales. La migración añade los campos de tipo, dirección y amenidades; la API valida los datos recibidos en tiempo de ejecución.

`lib/imagenes-propiedades.ts` asigna listas de URLs de Unsplash a IDs de muestra. `lib/Propiedades.ts` contiene propiedades iniciales, una clave para localStorage y un conjunto de suscriptores. `obtenerPropiedades` entrega el estado en memoria, `obtenerPropiedadesServidor` da datos iniciales para renderizado, `escucharCambios` escucha modificaciones de almacenamiento entre pestañas y devuelve una función para cancelar la suscripción. `guardarPropiedades` cambia memoria, intenta persistir JSON en localStorage y avisa a los suscriptores.

## 9. Marco visual y configuración

`app/layout.tsx` exporta `metadata` para el título y descripción del sitio. `Geist` y `Geist_Mono` cargan fuentes y registran variables CSS. `RootLayout` genera los elementos `html` y `body` compartidos, establece el idioma español y coloca dentro `{children}` la ruta actual.

`app/globals.css` importa Tailwind, define variables de fondo y texto, mapea esas variables al tema y añade estilos base del `body`. El bloque `prefers-color-scheme` cambia colores si el sistema del visitante prefiere modo oscuro.

`next.config.ts` activa opciones del framework y configura el cargador Tailwind de Turbopack. `tsconfig.json` activa modo estricto, JSX de React, resolución moderna de módulos y el alias `@/*` para importar desde la raíz. `eslint.config.mjs` combina reglas de Next para Core Web Vitals y TypeScript, e ignora las carpetas generadas. `package.json` contiene metadatos, dependencias y comandos `dev`, `build`, `start` y `lint`.

`app/propiedades/[id]/layout.tsx` crea título, descripción, URL canónica, Open Graph, Twitter Card y datos estructurados JSON-LD desde la fila del inmueble. `DetallePropiedadCliente.tsx` muestra las amenidades y la dirección opcional, ofrece una búsqueda de la zona en Google Maps e incluye un formulario que abre WhatsApp con los datos del interesado. El formulario de contacto no guarda esos datos en el sitio.

El catálogo filtra por texto, estado, tipo, presupuesto y habitaciones. El dashboard añade ordenamiento y paginación. Al guardar o eliminar, muestra avisos; antes de borrar, pide confirmar el nombre de la propiedad.

## 10. Cosas a tener presentes

- Para activar las cuentas, hay que restaurar la base de datos, ejecutar `npm run db:migrate` y `npm run users:bootstrap`; los pasos están en [CONFIGURAR_ACCESO.md](CONFIGURAR_ACCESO.md).
- La carga directa de fotos requiere configurar un bucket compatible con S3. Sin esas variables, pueden seguir usándose enlaces de imágenes externas.
- La migración no traslada imágenes que ya estén guardadas como base64 en PostgreSQL; el almacenamiento externo se aplica a las nuevas cargas y al reemplazar o retirar fotos antiguas.
- La API de PostgreSQL y la ficha de detalle usan fuentes de datos diferentes, como se explicó arriba.
- En producción, configura las variables de entorno en el proveedor de despliegue y usa HTTPS para que la cookie segura viaje protegida.
- La ficha pública todavía requiere que el origen de datos de propiedades esté disponible. Esta tarea no modifica la integración del catálogo ni restablece la base de datos de la otra laptop.

## 11. Símbolos frecuentes

- `import`: carga código, tipos o estilos de otro archivo o paquete.
- `export default`: marca el componente principal que Next usa para una ruta o componente.
- `export async function GET/POST/PUT/DELETE`: declara el método HTTP que atiende un Route Handler.
- `const`: declara un valor que no se reasigna; `let` sí permite reasignarlo.
- `=>`: define una función flecha.
- `?.`: accede a una propiedad solo si el valor anterior existe.
- `??`: usa el valor de la derecha solo cuando el de la izquierda es `null` o `undefined`.
- `A || B`: usa `B` si `A` es falso o vacío; por eso no equivale exactamente a `??`.
- `map`: transforma elementos de una lista, a menudo en elementos visuales.
- `filter`: conserva elementos que cumplen una condición.
- `reduce`: acumula una lista en un solo valor, por ejemplo sumar precios.
- `await`: espera el resultado de una promesa dentro de una función `async`.
- `try/catch/finally`: permite controlar errores y ejecutar limpieza al final.
- `useState`: guarda datos cambiantes de interfaz; `useEffect` sincroniza con procesos externos; `useMemo` evita recalcular hasta que cambian dependencias.
- `{expresión}` dentro de JSX: inserta un valor JavaScript en el marcado.
- `{condición ? A : B}`: muestra una salida u otra según la condición.
- `{condición && A}`: muestra `A` solamente si la condición es verdadera.
- `<Tipo>` y `as Tipo`: anotan o convierten tipos de TypeScript; no transforman por sí solos los datos recibidos.

> La guía se refiere a los archivos del proyecto tal como están ahora. No incluye archivos generados de `.next`, dependencias de `node_modules` ni el secreto de `.env.local`.
