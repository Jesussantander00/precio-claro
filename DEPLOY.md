# Cómo publicar Precio Claro (Supabase + Vercel)

Esta guía explica, paso a paso, cómo poner en producción la aplicación
**Precio Claro** usando una base de datos gratuita en **Supabase** y un
despliegue gratuito en **Vercel**. No necesitas experiencia previa; solo
sigue los pasos en orden.

---

## Parte 1 — Crear la base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta gratuita
   (puedes usar tu cuenta de GitHub o Google).
2. Haz clic en **New Project**.
   - Elige una organización (o crea una nueva).
   - Ponle un nombre al proyecto, por ejemplo `precio-claro`.
   - Crea una contraseña de base de datos y guárdala en un lugar seguro
     (no la necesitarás para esta app, pero Supabase la pide igual).
   - Elige la región más cercana (por ejemplo, la de Estados Unidos - East).
   - Haz clic en **Create new project** y espera 1-2 minutos mientras se
     aprovisiona.
3. Cuando el proyecto esté listo, ve al menú lateral izquierdo y entra a
   **SQL Editor**.
4. Haz clic en **New query**.
5. Abre el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este
   proyecto, copia **todo** su contenido y pégalo en el editor de SQL de
   Supabase.
6. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter). Deberías ver un
   mensaje de éxito. Esto crea las tablas `prestadores` y `encuestas`, y
   los permisos necesarios para que el formulario público pueda escribir
   en ellas.
7. Para confirmar que todo quedó bien, ve a **Table Editor** en el menú
   lateral: deberías ver las dos tablas creadas, ambas vacías.

## Parte 2 — Obtener las credenciales del proyecto

1. En el menú lateral, ve a **Project Settings** (ícono de engranaje) →
   **Data API**.
2. Copia el valor de **Project URL** (algo como
   `https://xxxxxxxxxxxx.supabase.co`). Esta será tu variable
   `NEXT_PUBLIC_SUPABASE_URL`.
3. En la misma página (o en **API Keys**), copia la clave marcada como
   **anon** / **public** (no la `service_role`, que es secreta y no se usa
   en esta app). Esta será tu variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Guarda ambos valores; los usarás en la Parte 4.

## Parte 3 — Subir el proyecto a GitHub (si aún no lo has hecho)

1. Crea un repositorio nuevo en [github.com](https://github.com).
2. Desde la carpeta del proyecto, en una terminal:
   ```bash
   git init
   git add .
   git commit -m "Precio Claro: versión Next.js + Supabase"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
   (Si prefieres no usar la terminal, GitHub Desktop también funciona.)

> **Importante:** el archivo `.env.example` no contiene claves reales, así
> que es seguro subirlo. Nunca subas un archivo `.env.local` con tus
> claves reales a un repositorio público (aunque en este proyecto las
> claves son públicas por diseño, ya que se usa la clave "anon").

## Parte 4 — Desplegar en Vercel

Elige **una** de las dos opciones:

### Opción A — Conectar el repositorio de GitHub (recomendada)

1. Entra a [vercel.com](https://vercel.com) y crea una cuenta (puedes
   usar tu cuenta de GitHub).
2. Haz clic en **Add New... → Project**.
3. Elige el repositorio que subiste en la Parte 3 y haz clic en
   **Import**.
4. Vercel detecta automáticamente que es un proyecto Next.js; no cambies
   nada en **Build and Output Settings**.
5. Antes de hacer clic en **Deploy**, despliega la sección
   **Environment Variables** y agrega las dos variables (ver Parte 5).
6. Haz clic en **Deploy** y espera 1-2 minutos.

### Opción B — Vercel CLI con un token

1. Instala la CLI de Vercel (requiere Node.js instalado):
   ```bash
   npm install -g vercel
   ```
2. Genera un token en
   [vercel.com/account/tokens](https://vercel.com/account/tokens) y
   autentícate:
   ```bash
   vercel login
   # o, con el token directamente:
   vercel --token TU_TOKEN
   ```
3. Desde la carpeta del proyecto:
   ```bash
   vercel --token TU_TOKEN
   ```
   Sigue las instrucciones en pantalla (acepta las opciones por defecto).
   Esto crea un despliegue de vista previa.
4. Configura las variables de entorno (ver Parte 5) y luego despliega a
   producción:
   ```bash
   vercel --prod --token TU_TOKEN
   ```

## Parte 5 — Configurar las variables de entorno en Vercel

1. En el panel del proyecto en Vercel, ve a **Settings → Environment
   Variables**.
2. Agrega las siguientes dos variables (para los entornos *Production*,
   *Preview* y *Development*):

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | El **Project URL** que copiaste en la Parte 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave **anon public** que copiaste en la Parte 2 |

3. Guarda los cambios.

## Parte 6 — Volver a desplegar

Las variables de entorno solo se aplican en despliegues nuevos, así que
después de agregarlas necesitas volver a desplegar:

- **Si usaste la Opción A (GitHub):** ve a la pestaña **Deployments** del
  proyecto en Vercel, abre el menú (···) del último despliegue y elige
  **Redeploy**.
- **Si usaste la Opción B (CLI):** vuelve a correr
  ```bash
  vercel --prod --token TU_TOKEN
  ```

Cuando termine, abre la URL que te da Vercel (algo como
`https://precio-claro.vercel.app`) y prueba:

1. Que las 5 pestañas carguen correctamente.
2. Que el formulario **Caracteriza tu negocio** (pestaña Actores) guarde
   una prueba y muestre el mensaje de confirmación.
3. Que la **Encuesta** (pestaña Encuesta) se pueda enviar y que el
   "Resumen del equipo" se actualice.
4. En el **Table Editor** de Supabase, confirma que las filas de prueba
   aparecen en `prestadores` y `encuestas`.

Si algo no funciona, revisa primero que las dos variables de entorno
estén bien copiadas (sin espacios de más) y que hayas vuelto a desplegar
después de guardarlas.
