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
  ('jesusthefacebook@gmail.com')
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
