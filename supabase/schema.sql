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
  comentario text
);

alter table public.prestadores enable row level security;
alter table public.encuestas enable row level security;

-- Prototipo académico sin autenticación: el equipo aplica la encuesta en campo
-- desde el enlace público, así que se permite insertar y leer con la clave "anon".
-- No se recogen datos personales identificables (no hay nombres de turistas).
create policy "anon insert prestadores" on public.prestadores
  for insert to anon with check (true);
create policy "anon select prestadores" on public.prestadores
  for select to anon using (true);

create policy "anon insert encuestas" on public.encuestas
  for insert to anon with check (true);
create policy "anon select encuestas" on public.encuestas
  for select to anon using (true);
