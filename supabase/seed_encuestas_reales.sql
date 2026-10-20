-- Precio Claro — 20 encuestas REALES aplicadas a turistas (es_simulada = false)
-- Datos entregados por el equipo; la fecha exacta de cada respuesta no se registró (se usa la fecha de carga).
-- Ejecutar en el SQL Editor de Supabase. Es repetible: borra primero las reales con perfil y las vuelve a insertar.

alter table public.encuestas add column if not exists perfil text;

delete from public.encuestas where es_simulada = false and perfil is not null;

insert into public.encuestas (perfil, sobrecobro, expectativas, usabilidad_estrellas, comentario) values
('John M. (EE. UU.)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente']::text[], 4, 'Good idea! Me cobraron 100.000 COP por una cerveza en Playa Blanca. Sería genial que la app tuviera una versión en inglés.'),
('Laura S. (España)', 'si', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio']::text[], 5, 'Me sentí estafada por unas masajistas en Bocagrande. Esta aplicación es súper necesaria y la interfaz es muy clara.'),
('Klaus W. (Alemania)', 'no_seguro', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas']::text[], 4, 'Cartagena es fantástica, pero todo me pareció caro. No sé si era el precio real o precio para turista. La app me daría seguridad.'),
('Mateo L. (Argentina)', 'si', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas','Ver la reputación del sitio']::text[], 5, 'Los taxistas siempre te tiran un número más alto si escuchan acento extranjero. La lista del Decreto 0051 en la app salva vidas.'),
('Sarah J. (Canadá)', 'no', array['Ver el precio oficial antes de pagar']::text[], 5, 'I loved the city. Fui con un tour todo incluido así que no tuve problemas, pero probar el prototipo me dio mucha tranquilidad.'),
('Pierre D. (Francia)', 'si', array['Reportar un cobro injusto fácilmente','Ver la reputación del sitio']::text[], 3, 'Las ostras en la playa fueron una trampa. Me gusta la app, pero le falta un mapa offline para cuando no hay buena señal en las islas.'),
('Ana C. (México)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente']::text[], 4, 'Pagué el doble por una carpa en La Boquilla. Poner las listas oficiales de precios es el mejor acierto de este proyecto académico.'),
('Emma R. (Reino Unido)', 'no_seguro', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas']::text[], 4, 'Es difícil calcular con la moneda local. Sería súper útil si el prototipo integrara un conversor a dólares o euros.'),
('Marco B. (Italia)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente','Comparar con lo que pagaron otros turistas','Ver la reputación del sitio']::text[], 5, 'Increíble que no exista algo así ya. Me cobraron una propina obligatoria altísima. Muy buen proyecto de la universidad.'),
('João F. (Brasil)', 'si', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio']::text[], 5, 'Em Cholón os preços mudam toda hora. Muy buena iniciativa, te permite ver cuánto deberías pagar antes de sentarte.'),
('Mike T. (EE. UU.)', 'no', array['Comparar con lo que pagaron otros turistas']::text[], 4, 'Usé plataformas de transporte privado todo el tiempo así que evité problemas con taxis. Aún así, ver la pestaña de restaurantes es genial.'),
('Chloe H. (Australia)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente']::text[], 5, 'El diseño es limpio y directo. Me pasó con una botella de agua que me vendieron a precio de oro. Ojalá sea oficial pronto.'),
('Valentina M. (Chile)', 'si', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas','Ver la reputación del sitio']::text[], 4, 'Nos intentaron cobrar de más por unas sillas, menos mal preguntamos a otros turistas. La función de reseñas es la que más usaría.'),
('Tom V. (Países Bajos)', 'no_seguro', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas']::text[], 3, 'Los menús a veces no tienen los impuestos claros y te sorprenden al final. El prototipo es rápido pero le agregaría más zonas turísticas.'),
('Carlos E. (Perú)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente']::text[], 5, 'Excelente iniciativa. El taxi del aeropuerto a la Ciudad Amurallada fue un robo a mano armada. La tabla de tarifas me habría salvado.'),
('Emily G. (EE. UU.)', 'si', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio']::text[], 4, 'Make it in english please! Negociar las carpas en la playa es un dolor de cabeza constante.'),
('Lukas R. (Suiza)', 'no_seguro', array['Ver el precio oficial antes de pagar']::text[], 4, 'Todo estuvo bien en mi viaje. El prototipo académico se siente como una app profesional. Navegación muy intuitiva.'),
('Yuki A. (Japón)', 'si', array['Ver el precio oficial antes de pagar','Reportar un cobro injusto fácilmente']::text[], 5, 'Muy fácil de usar. Los números y precios oficiales ayudan mucho cuando no hablas bien español.'),
('Anna K. (Alemania)', 'si', array['Ver el precio oficial antes de pagar','Comparar con lo que pagaron otros turistas','Reportar un cobro injusto fácilmente']::text[], 4, 'Sería ideal que las autoridades vieran el ''Panel de análisis'' de esta app para multar a los restaurantes usando los reportes reales.'),
('Luis F. (Costa Rica)', 'no', array['Ver el precio oficial antes de pagar','Ver la reputación del sitio']::text[], 5, 'Fui muy precavido gracias a que leí las noticias antes de viajar, pero esta herramienta condensaría todo en un solo lugar. Éxitos con el proyecto.');
