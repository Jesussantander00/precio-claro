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
