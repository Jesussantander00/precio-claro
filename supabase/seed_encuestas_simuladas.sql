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
