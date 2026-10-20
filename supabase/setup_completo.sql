-- Precio Claro — instalación completa en un proyecto Supabase NUEVO.
-- Pegar todo en SQL Editor y ejecutar una sola vez (orden: esquema, roles/reseñas, datos de demostración).

-- Precio Claro — esquema Supabase
-- Ejecutar en el SQL Editor del proyecto Supabase (Dashboard > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- Fase 2: caracterización de prestadores ("Caracteriza tu negocio")
create table if not exists public.prestadores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre_negocio text not null,
  tipo_servicio text not null check (tipo_servicio in ('transporte','playa_restaurante','otro')),
  tipo_servicio_otro text,
  zona text not null,
  oferta_precio text not null,
  oportunidad text
);

-- Fase 3: encuesta al turista (dolor principal + usabilidad)
create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sobrecobro text not null check (sobrecobro in ('si','no','no_seguro')),
  sobrecobro_detalle text,
  expectativas text[] not null default '{}',
  usabilidad_estrellas int check (usabilidad_estrellas between 1 and 5),
  comentario text,
  -- true = respuesta simulada de demostración (ver seed_encuestas_simuladas.sql)
  es_simulada boolean not null default false
);

alter table public.prestadores enable row level security;
alter table public.encuestas enable row level security;

-- Toda la app ahora exige iniciar sesión con Google (Supabase Auth) antes de
-- poder usarla, incluidas las pestañas de consulta de tarifas. Por eso las
-- políticas se endurecieron de "anon" a "authenticated": solo un usuario con
-- sesión válida (cualquier cuenta de Google) puede insertar o leer estas
-- tablas. Sigue sin recogerse ningún dato personal identificable del
-- prestador o del turista más allá del correo usado para iniciar sesión.
create policy "authenticated insert prestadores" on public.prestadores
  for insert to authenticated with check (true);
create policy "authenticated select prestadores" on public.prestadores
  for select to authenticated using (true);

create policy "authenticated insert encuestas" on public.encuestas
  for insert to authenticated with check (true);
-- La lectura (select) de encuestas la restringe a administradores el archivo
-- roles_y_resenas.sql (política "admin select encuestas"). Ejecutar ese archivo después.


-- Precio Claro — roles (administrador) y reseñas
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
-- Es idempotente: se puede ejecutar más de una vez.

-- 1) Administradores ---------------------------------------------------------
-- Lista de correos con rol de administrador. Para agregar a otra persona:
--   insert into public.admins(email) values ('persona@correo.com');
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;

drop policy if exists "cada usuario ve su propia fila de admins" on public.admins;
create policy "cada usuario ve su propia fila de admins" on public.admins
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

insert into public.admins (email) values
  ('jesusdanielquintanasantander@gmail.com'),
  ('jesusthefacebook@gmail.com'),
  ('cgutierrezp2@unicartagena.edu.co'),
  ('jriverar1@unicartagena.edu.co'),
  ('omercador@unicartagena.edu.co'),
  ('lalvarezb1@unicartagena.edu.co')
on conflict do nothing;

-- Función auxiliar usada por las políticas RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- 2) Las respuestas de la encuesta solo las lee el administrador --------------
-- Cualquier usuario con sesión puede seguir ENVIANDO la encuesta (insert),
-- pero el análisis (select) queda restringido al administrador.
drop policy if exists "authenticated select encuestas" on public.encuestas;
drop policy if exists "admin select encuestas" on public.encuestas;
create policy "admin select encuestas" on public.encuestas
  for select to authenticated
  using (public.is_admin());

-- 3) Reseñas ------------------------------------------------------------------
-- Opiniones de usuarios con sesión iniciada sobre una zona. Las filas con
-- es_simulada = true son ejemplos de demostración (user_id nulo).
create table if not exists public.resenas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  zona_id text not null,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 300),
  es_simulada boolean not null default false
);
alter table public.resenas enable row level security;

drop policy if exists "authenticated select resenas" on public.resenas;
create policy "authenticated select resenas" on public.resenas
  for select to authenticated using (true);

drop policy if exists "authenticated insert resenas" on public.resenas;
create policy "authenticated insert resenas" on public.resenas
  for insert to authenticated
  with check (user_id = auth.uid() and es_simulada = false);

-- Cada persona borra sus reseñas; el administrador puede moderar cualquiera.
drop policy if exists "borrar propia o admin resenas" on public.resenas;
create policy "borrar propia o admin resenas" on public.resenas
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());


-- Precio Claro — 20 encuestas SIMULADAS (datos de demostración, NO reales)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de agregar la columna es_simulada.

alter table public.encuestas add column if not exists es_simulada boolean not null default false;

delete from public.encuestas where es_simulada = true;

insert into public.encuestas (created_at, sobrecobro, sobrecobro_detalle, expectativas, usabilidad_estrellas, comentario, es_simulada) values
('2026-09-15T10:02:00-05:00', 'si', 'Me ofrecieron un ''paquete'' de playa sin explicar qué incluía y terminé pagando de más.', array['Reportar un cobro injusto fácilmente']::text[], 3, 'Muy fácil de usar desde el celular.', true),
('2026-09-16T19:32:00-05:00', 'no', null, array['Ver el precio oficial antes de pagar','Ver la reputación del sitio','Comparar con lo que pagaron otros turistas']::text[], 4, 'El mapa ayuda a ubicar las zonas, ojalá tuviera más comercios.', true),
('2026-09-16T20:12:00-05:00', 'no', null, array['Ver el precio oficial antes de pagar']::text[], 4, 'Sería útil tenerla también en inglés para turistas extranjeros.', true),
('2026-09-17T12:01:00-05:00', 'si', 'En Bocagrande la cuenta de la marisquería incluía productos que no pedí.', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio']::text[], 3, null, true),
('2026-09-17T12:32:00-05:00', 'no', null, array['Comparar con lo que pagaron otros turistas']::text[], 4, null, true),
('2026-09-17T17:49:00-05:00', 'si', 'Me ofrecieron un ''paquete'' de playa sin explicar qué incluía y terminé pagando de más.', array['Ver la reputación del sitio']::text[], 4, 'Buena idea; lo usaría antes de contratar un taxi o una lancha.', true),
('2026-09-19T16:51:00-05:00', 'si', null, array['Reportar un cobro injusto fácilmente','Ver la reputación del sitio','Comparar con lo que pagaron otros turistas']::text[], 4, null, true),
('2026-09-19T18:06:00-05:00', 'no', null, array['Reportar un cobro injusto fácilmente']::text[], 5, null, true),
('2026-09-19T19:30:00-05:00', 'si', null, array['Reportar un cobro injusto fácilmente','Ver la reputación del sitio','Comparar con lo que pagaron otros turistas']::text[], 4, null, true),
('2026-09-20T19:59:00-05:00', 'si', 'El vendedor de la playa subió el precio de la limonada al ver que éramos turistas.', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas']::text[], 3, null, true),
('2026-09-21T13:58:00-05:00', 'no_seguro', null, array['Ver el precio oficial antes de pagar','Ver la reputación del sitio','Comparar con lo que pagaron otros turistas']::text[], 4, 'Faltan más servicios, como tours en lancha por las islas.', true),
('2026-09-21T20:33:00-05:00', 'si', null, array['Reportar un cobro injusto fácilmente','Comparar con lo que pagaron otros turistas']::text[], 2, 'Claro y rápido, sin tantos pasos.', true),
('2026-09-22T16:42:00-05:00', 'no_seguro', null, array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente','Ver la reputación del sitio']::text[], 4, 'La parte de verificar lo que pagué me pareció lo más útil.', true),
('2026-09-23T09:03:00-05:00', 'no_seguro', null, array['Reportar un cobro injusto fácilmente','Ver la reputación del sitio']::text[], 5, 'Sería útil tenerla también en inglés para turistas extranjeros.', true),
('2026-09-23T19:32:00-05:00', 'si', 'En Playa Blanca me cobraron un ''servicio'' de mesa que nadie me había mencionado.', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio','Comparar con lo que pagaron otros turistas']::text[], 4, 'Buena idea; lo usaría antes de contratar un taxi o una lancha.', true),
('2026-09-27T15:59:00-05:00', 'si', null, array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente','Ver la reputación del sitio']::text[], 5, null, true),
('2026-09-29T20:56:00-05:00', 'si', 'Me cobraron el doble por un taxi desde el Centro Histórico.', array['Reportar un cobro injusto fácilmente','Comparar con lo que pagaron otros turistas']::text[], 5, 'Que se actualicen los precios seguido.', true),
('2026-10-01T15:58:00-05:00', 'si', null, array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente','Comparar con lo que pagaron otros turistas']::text[], 4, 'Me gustaría reportar directamente a la autoridad desde la app.', true),
('2026-10-01T17:33:00-05:00', 'no', null, array['Comparar con lo que pagaron otros turistas']::text[], 4, null, true),
('2026-10-02T14:32:00-05:00', 'si', null, array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente','Comparar con lo que pagaron otros turistas']::text[], 5, null, true);


-- Precio Claro — reseñas SIMULADAS de demostración (es_simulada = true).
-- NO son opiniones reales de turistas. Ejecutar después de roles_y_resenas.sql.
delete from public.resenas where es_simulada = true;

insert into public.resenas (created_at, user_id, zona_id, estrellas, comentario, es_simulada) values
  ('2026-09-18 10:15:00-05', null, 'centro',    4, 'El taxi cobró la tarifa oficial que mostraba la app.', true),
  ('2026-09-20 16:40:00-05', null, 'centro',    2, 'Me pidieron más del rango de referencia y tuve que negociar.', true),
  ('2026-09-22 12:05:00-05', null, 'bocagrande',3, 'Buenos restaurantes, pero conviene pedir la carta con precios antes de ordenar.', true),
  ('2026-09-25 11:30:00-05', null, 'boquilla',  5, 'Los precios de la lista oficial se respetaron en el kiosko donde estuvimos.', true),
  ('2026-09-28 14:20:00-05', null, 'cholon',    3, 'La lista oficial es alta, pero al menos sabíamos cuánto iban a cobrar.', true),
  ('2026-10-01 09:50:00-05', null, 'baru',      2, 'Cobro de servicio adicional que no estaba acordado al inicio.', true);
