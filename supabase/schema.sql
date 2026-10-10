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
