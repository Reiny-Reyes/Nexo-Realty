# Migrar datos y configurar accesos

La aplicación guarda cuentas y roles en PostgreSQL y almacena contraseñas como hashes `scrypt`. Las migraciones agregan campos para tipo, operación, moneda y fecha de actualización, además de consultas, métricas, auditoría y recuperación de cuenta. Los registros actuales de propiedades se conservan; los nuevos campos toman valores predeterminados (`Sin especificar`, `Venta`, `USD`).

## Antes de migrar la base de datos

Primero traslada/restaura la base de datos desde la otra laptop y actualiza `DATABASE_URL` en `.env.local` para apuntar a esa base. Conserva el respaldo original. Luego ejecuta:

```powershell
npm run db:migrate
```

El script lee `.env.local` y aplica en orden las migraciones pendientes (`migrations/001...003`). Esto presupone que el esquema actual ya contiene `propiedades` e `imagenes_propiedad`. El script registra cada migración aplicada y puede volver a ejecutarse sin repetirlas.

## Crear las cuentas iniciales

Añade al `.env.local` las variables siguientes. Conserva `DATABASE_URL` y otros valores que ya existan:

```dotenv
SESSION_SECRET="un-secreto-aleatorio-de-al-menos-32-caracteres"
ADMIN_USERNAME="usuario-administrador-inicial"
ADMIN_PASSWORD="contrasena-larga-y-unica-de-12-caracteres-o-mas"
VIEWER_USERNAME="usuario-solo-lectura-inicial"
VIEWER_PASSWORD="otra-contrasena-larga-y-unica-de-12-caracteres-o-mas"
```

Puedes generar `SESSION_SECRET` desde la terminal con Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Los usuarios y contraseñas de administrador/consulta solo se usan para crear las dos primeras cuentas. Luego puedes borrar sus cuatro variables del `.env.local`; el inicio de sesión consulta las cuentas de PostgreSQL. `SESSION_SECRET` sí debe permanecer configurado. No subas `.env.local` al repositorio. El archivo `.env.example` muestra el formato con valores ficticios.

Con la base ya migrada y las variables iniciales en su lugar, crea las cuentas:

```powershell
npm run users:bootstrap
```

El comando no modifica una cuenta que ya exista. Inicia el sitio y entra por `/login`. Después, el administrador puede crear usuarios, cambiar roles, restablecer contraseñas, desactivarlos o eliminarlos desde **Usuarios** en el dashboard. Las contraseñas temporales obligan al usuario a elegir una propia.

## Control de intentos y recuperación

Cinco intentos fallidos para el mismo nombre de usuario bloquean nuevos intentos durante 15 minutos. Las consultas públicas tienen límites por conexión y las sesiones se revocan al cambiar permisos o contraseña. Para permitir recuperación autónoma, configura el proveedor Resend y asigna un correo a cada cuenta desde **Usuarios**:

```dotenv
RESEND_API_KEY="re_..."
EMAIL_FROM="Nexo Realty <no-reply@tu-dominio-verificado.com>"
NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
```

El dominio remitente debe estar verificado en Resend. Sin esas variables, la opción de recuperación informa que no está configurada; el administrador todavía puede asignar una contraseña temporal y el usuario debe cambiarla al entrar. Un usuario que conoce su contraseña también puede cambiarla desde **Mi contraseña**.

## Consultas, imágenes y métricas

Las consultas enviadas desde una ficha se guardan en PostgreSQL y abren WhatsApp para completar el contacto. Los usuarios del panel pueden verlas; solo administradores pueden cambiar su estado. El panel también muestra visitas, conversión aproximada, inmuebles populares e historial de cambios. Las visitas se cuentan una vez por navegador y propiedad al día.

En el editor de propiedad se pueden añadir hasta cinco imágenes por archivo o URL, previsualizarlas, cambiar el orden y elegir la portada. También se puede seleccionar venta/alquiler y USD/RD$. El resumen de portafolio conserva totales separados por moneda.

El sitio expone `/sitemap.xml` y `/robots.txt`; configura `NEXT_PUBLIC_SITE_URL` con el dominio público para que los enlaces canónicos y SEO apunten al dominio de producción.

Las sesiones duran ocho horas y usan una cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción. El servidor vuelve a consultar el usuario activo y el rol en cada operación protegida.

## Almacenamiento de fotografías

Las fotos subidas desde el formulario se comprimen en el navegador y se envían a un bucket compatible con S3 (por ejemplo, AWS S3 o Cloudflare R2). Configura en `.env.local` y en el proveedor:

```dotenv
S3_ENDPOINT="https://endpoint-s3-del-proveedor"
S3_BUCKET="nombre-del-bucket"
S3_REGION="region-del-bucket"
S3_ACCESS_KEY_ID="clave-de-acceso"
S3_SECRET_ACCESS_KEY="secreto-de-acceso"
S3_PUBLIC_URL="https://dominio-publico-de-imagenes"
NEXT_PUBLIC_SITE_URL="https://dominio-publico-del-sitio"
```

El bucket debe permitir lectura pública de los objetos mediante `S3_PUBLIC_URL`; las subidas y eliminaciones se firman desde el servidor. Sin estas variables, siguen funcionando los enlaces de imágenes que ya se alojan externamente, pero no la subida de archivos desde el equipo. Solo se aceptan JPEG, PNG y WebP de hasta 8 MB después de la compresión.

Las fotos ya guardadas en la base no se mueven automáticamente. Las nuevas se almacenan en el bucket; al editar una propiedad, quitar una imagen anterior y guardar, el servidor elimina el objeto antiguo si pertenece a este bucket y ya no está asociado a otra propiedad.
