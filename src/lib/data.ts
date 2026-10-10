// Datos estáticos de referencia para Precio Claro.
// Portados verbatim desde el prototipo original (app_precio_claro.html).

export type Service = {
  id: string;
  cat: "transporte" | "playa";
  name: string;
  zone: string;
  min: number;
  max: number;
  unit: string;
  reg: string;
};

export const SERVICES: Service[] = [
  {
    id: "taxi",
    cat: "transporte",
    name: "Taxi (carrera mínima)",
    zone: "Toda la ciudad",
    min: 12250,
    max: 12250,
    unit: "por carrera · +$1.100 recargo nocturno (7 p.m.–5 a.m.)",
    reg: "Alcaldía de Cartagena / DATT — Decreto 0051 de 2026",
  },
  {
    id: "coche-elec",
    cat: "transporte",
    name: "Coche eléctrico turístico",
    zone: "Centro Histórico",
    min: 170000,
    max: 350000,
    unit: "30 min a 1 hora, según temporada",
    reg: "DATT / Corpoturismo",
  },
  {
    id: "lancha",
    cat: "transporte",
    name: "Lancha a Islas del Rosario / Barú",
    zone: "Muelles turísticos",
    min: 150000,
    max: 330000,
    unit: "tour de día completo, por persona",
    reg: "Operadores turísticos registrados",
  },
  {
    id: "ceviche",
    cat: "playa",
    name: "Ceviche",
    zone: "La Boquilla",
    min: 60000,
    max: 60000,
    unit: "porción de 300 g",
    reg: "Lista oficial de precios — La Boquilla (2025)",
  },
  {
    id: "ceviche-cholon",
    cat: "playa",
    name: "Ceviche",
    zone: "Cholón",
    min: 150000,
    max: 150000,
    unit: "porción",
    reg: "Lista de precios — Cholón",
  },
  {
    id: "cerveza-boquilla",
    cat: "playa",
    name: "Cerveza nacional",
    zone: "La Boquilla",
    min: 5000,
    max: 8000,
    unit: "unidad",
    reg: "Lista oficial de precios — La Boquilla (2025)",
  },
  {
    id: "cerveza-cholon",
    cat: "playa",
    name: "Cerveza nacional",
    zone: "Cholón",
    min: 15000,
    max: 15000,
    unit: "unidad",
    reg: "Lista de precios — Cholón",
  },
  {
    id: "limonada",
    cat: "playa",
    name: "Limonada de coco",
    zone: "La Boquilla",
    min: 30000,
    max: 30000,
    unit: "unidad",
    reg: "Lista oficial de precios — La Boquilla (2025)",
  },
  {
    id: "parasol",
    cat: "playa",
    name: "Parasol + 2 sillas + mesa",
    zone: "La Boquilla / Cholón",
    min: 50000,
    max: 50000,
    unit: "por día",
    reg: "Listas oficiales de precios distritales",
  },
  {
    id: "langosta",
    cat: "playa",
    name: "Langosta",
    zone: "Cholón",
    min: 255000,
    max: 255000,
    unit: "porción",
    reg: "Lista de precios — Cholón",
  },
];

export type CaseItem = {
  place: string;
  date: string;
  item: string;
  charged: string;
  ref: string;
  src: string;
};

export const CASES: CaseItem[] = [
  {
    place: "Barú — excursión Islas del Rosario",
    date: "dic. 2023",
    item: "2 limonadas de mango",
    charged: "$7.000.000",
    ref: "carta: $35.000 c/u",
    src: "Infobae (2023)",
  },
  {
    place: "Bocagrande, Playa Hollywood",
    date: "may. 2024",
    item: "2 langostas (800 g c/u)",
    charged: "$2.400.000",
    ref: "sin precio previo acordado",
    src: "El Tiempo (s.f.)",
  },
  {
    place: "Playa Blanca, Barú",
    date: "reciente",
    item: "2 bebidas + “servicio”",
    charged: "$336.000",
    ref: "pactado: $30.000 + consumo",
    src: "Semana (s.f.)",
  },
  {
    place: "Centro Histórico — restaurante",
    date: "jul. 2025",
    item: "3 comidas, 2 cócteles, parlante",
    charged: "$6.500.000",
    ref: "ajustado por mediación policial",
    src: "Infobae (2025)",
  },
];

export const ZONES_BY_CAT: Record<"transporte" | "playa", string[]> = {
  transporte: ["Todas", "Toda la ciudad", "Centro Histórico", "Muelles turísticos"],
  playa: ["Todas", "La Boquilla", "Cholón"],
};

export type MapPlace = {
  name: string;
  type: string;
  illustrative?: boolean;
  official?: boolean;
  carta: { item: string; price: number }[];
  ratings: { source: string; stars: number; count: number }[];
};

export type MapZone = {
  id: string;
  name: string;
  kind: "ciudad" | "playa";
  // Coordenadas aproximadas del centro de la zona (WGS84), para el mapa real.
  lat: number;
  lng: number;
  x: number;
  y: number;
  places: MapPlace[];
};

// Datos de muestra para la vista "Mapa": zonas turísticas con 1-2 comercios ilustrativos.
// Las cartas de La Boquilla y Cholón usan las listas oficiales de precios ya citadas
// en SERVICES; los demás comercios y TODAS las calificaciones son ilustrativos
// (no extraídos de Google Maps, TripAdvisor ni otra plataforma — ver sección 6.6 del artículo).
export const ZONES_MAP: MapZone[] = [
  {
    id: "centro",
    name: "Centro Histórico",
    kind: "ciudad",
    lat: 10.4236,
    lng: -75.5513,
    x: 49,
    y: 13.2,
    places: [
      {
        name: "Restaurante ejemplo — Plaza Santo Domingo",
        type: "Cocina caribeña · comercio ilustrativo",
        illustrative: true,
        carta: [
          { item: "Cazuela de mariscos", price: 65000 },
          { item: "Ceviche de camarón", price: 48000 },
          { item: "Limonada de coco", price: 12000 },
        ],
        ratings: [
          { source: "Google (ilustrativo)", stars: 4.3, count: 214 },
          { source: "TripAdvisor (ilustrativo)", stars: 4.1, count: 132 },
          { source: "Precio Claro (turistas)", stars: 4.0, count: 9 },
        ],
      },
    ],
  },
  {
    id: "bocagrande",
    name: "Bocagrande",
    kind: "ciudad",
    lat: 10.402,
    lng: -75.5565,
    x: 48,
    y: 38.2,
    places: [
      {
        name: "Marisquería ejemplo — Av. San Martín",
        type: "Marisquería · comercio ilustrativo",
        illustrative: true,
        carta: [
          { item: "Langosta a la parrilla", price: 120000 },
          { item: "Arroz con camarones", price: 52000 },
          { item: "Cerveza nacional", price: 9000 },
        ],
        ratings: [
          { source: "Google (ilustrativo)", stars: 4.0, count: 341 },
          { source: "TripAdvisor (ilustrativo)", stars: 3.8, count: 198 },
          { source: "Precio Claro (turistas)", stars: 3.6, count: 14 },
        ],
      },
    ],
  },
  {
    id: "boquilla",
    name: "La Boquilla",
    kind: "playa",
    lat: 10.47,
    lng: -75.493,
    x: 66,
    y: 5.9,
    places: [
      {
        name: "Kiosko de playa — lista oficial 2025",
        type: "Kiosko de playa · precios de la lista oficial",
        official: true,
        carta: [
          { item: "Ceviche (porción 300 g)", price: 60000 },
          { item: "Cerveza nacional", price: 6500 },
          { item: "Limonada de coco", price: 30000 },
          { item: "Parasol + 2 sillas + mesa (día)", price: 50000 },
        ],
        ratings: [
          { source: "Google (ilustrativo)", stars: 4.1, count: 96 },
          { source: "TripAdvisor (ilustrativo)", stars: 3.9, count: 58 },
          { source: "Precio Claro (turistas)", stars: 4.2, count: 22 },
        ],
      },
    ],
  },
  {
    id: "cholon",
    name: "Cholón",
    kind: "playa",
    lat: 10.259,
    lng: -75.604,
    x: 43,
    y: 87.5,
    places: [
      {
        name: "Kiosko de playa — lista Cholón",
        type: "Kiosko de playa · precios de la lista de Cholón",
        official: true,
        carta: [
          { item: "Ceviche (porción)", price: 150000 },
          { item: "Cerveza nacional", price: 15000 },
          { item: "Limonada de coco", price: 50000 },
          { item: "Langosta (porción)", price: 255000 },
        ],
        ratings: [
          { source: "Google (ilustrativo)", stars: 3.7, count: 64 },
          { source: "TripAdvisor (ilustrativo)", stars: 3.5, count: 41 },
          { source: "Precio Claro (turistas)", stars: 2.9, count: 17 },
        ],
      },
    ],
  },
  {
    id: "baru",
    name: "Playa Blanca (Barú)",
    kind: "playa",
    lat: 10.2288,
    lng: -75.6128,
    x: 23,
    y: 97,
    places: [
      {
        name: "Carpa de playa ejemplo — Playa Blanca",
        type: "Carpa de playa · comercio ilustrativo",
        illustrative: true,
        carta: [
          { item: "Bebida de bienvenida", price: 15000 },
          { item: '"Servicio" de mesa (no siempre acordado)', price: 30000 },
          { item: "Pescado frito con patacón", price: 45000 },
        ],
        ratings: [
          { source: "Google (ilustrativo)", stars: 3.9, count: 87 },
          { source: "TripAdvisor (ilustrativo)", stars: 3.4, count: 52 },
          { source: "Precio Claro (turistas)", stars: 2.7, count: 11 },
        ],
      },
    ],
  },
];

export type Actor = {
  tag: string;
  name: string;
  ofrece: string;
  precio: string;
  dolor: string;
  oportunidad: string;
};

// Actores del sector turístico identificados y caracterizados (fase 1-2 de la
// metodología propuesta): quiénes son, qué ofrecen o necesitan, y qué
// oportunidad representan para Precio Claro. Basado en la revisión documental.
export const ACTORS: Actor[] = [
  {
    tag: "Demanda",
    name: "Turistas nacionales e internacionales",
    ofrece:
      "Visitan Cartagena en estadías cortas; generalmente desconocen las tarifas locales y tienen poco poder de negociación frente al prestador.",
    precio: "No aplica (son quienes pagan)",
    dolor:
      "No saber, en el momento de pagar, si el valor cobrado corresponde a la tarifa real o al precio de referencia de la zona.",
    oportunidad:
      "Consulta rápida del precio de referencia y reporte de irregularidades desde el propio celular, antes o justo después de pagar.",
  },
  {
    tag: "Oferta · Transporte",
    name: "Taxistas, lancheros y operadores de coches eléctricos",
    ofrece: "Traslados y paseos turísticos con tarifas reguladas por decreto o por su propio gremio.",
    precio: "Taxi $12.250 (carrera mínima) · lancha $150.000–$330.000",
    dolor:
      "Los cobros de unos pocos prestadores irregulares afectan la reputación de todo el gremio ante los turistas.",
    oportunidad:
      "Mostrar su tarifa oficial dentro de la app genera confianza inmediata y reduce los conflictos con el turista en el sitio.",
  },
  {
    tag: "Oferta · Playas y restaurantes",
    name: "Kioskos de playa y restaurantes (La Boquilla, Cholón, Bocagrande, Centro Histórico)",
    ofrece:
      "Alimentos, bebidas y servicios de playa, algunos con lista de precios oficial y otros con carta propia.",
    precio: "Ceviche $60.000–$150.000 · cerveza $5.000–$15.000, según la zona",
    dolor:
      "Los negocios que sí cobran precios justos compiten en desventaja frente a los que sobrecobran ocasionalmente a turistas.",
    oportunidad:
      "Publicar su propia carta dentro de la app para diferenciarse de los prestadores que generan la mala fama del sector.",
  },
  {
    tag: "Regulación",
    name:
      "Alcaldía / DATT, Superintendencia de Industria y Comercio, gremios (Corpoturismo)",
    ofrece:
      "Fijan las tarifas oficiales, publican listas de precios en playas y reciben y sancionan denuncias por cobro excesivo.",
    precio: "No aplica (rol regulador)",
    dolor:
      "Sus canales de difusión y denuncia (listas físicas, Titán Chat, Visit Cartagena) están fragmentados y son poco conocidos por el turista.",
    oportunidad:
      "Un canal adicional, más ligero, que redirige al turista hacia sus propios mecanismos oficiales de denuncia.",
  },
];

// Tipos de servicio mostrados como chips en "Caracteriza tu negocio",
// mapeados al valor aceptado por la columna tipo_servicio en Supabase.
export const PRESTADOR_TIPOS: { label: string; value: "transporte" | "playa_restaurante" | "otro" }[] = [
  { label: "Transporte", value: "transporte" },
  { label: "Playa o restaurante", value: "playa_restaurante" },
  { label: "Otro", value: "otro" },
];

export const EXPECTATIVAS = [
  "Ver el precio oficial antes de pagar",
  "Reportar un cobro injusto fácilmente",
  "Ver la reputación del sitio",
  "Comparar con lo que pagaron otros turistas",
];

// Chips de la pregunta de sobrecobro. El valor interno "inseguro" se traduce
// a "no_seguro" (el valor aceptado por la columna sobrecobro) al enviar.
export const SOBRECOBRO_OPTIONS: { value: "si" | "no" | "inseguro"; label: string }[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "inseguro", label: "No estoy seguro" },
];

export const STAR_LABELS = ["Sin calificar", "Muy difícil", "Difícil", "Aceptable", "Fácil", "Muy fácil"];

export type TabKey = "transporte" | "playa" | "mapa" | "actores" | "encuesta" | "resenas" | "panel";

export const TAB_COPY: Record<TabKey, { title: string; sub: string }> = {
  transporte: { title: "Consultar tarifa", sub: "Elige una zona y un servicio para ver el precio de referencia" },
  playa: { title: "Consultar tarifa", sub: "Elige una zona y un servicio para ver el precio de referencia" },
  mapa: { title: "Mapa de comercios", sub: "Mapa real de Cartagena con cartas de ejemplo y calificaciones por zona" },
  actores: { title: "Actores del sector", sub: "Levantamiento y caracterización de actores turísticos" },
  encuesta: { title: "Encuesta", sub: "Identifica el principal dolor del turista y valida el prototipo" },
  resenas: { title: "Reseñas", sub: "Opiniones de usuarios con sesión sobre el trato y los cobros en cada zona" },
  panel: { title: "Panel de resultados", sub: "Solo administradores: análisis de las respuestas de la encuesta" },
};

export function money(n: number): string {
  return "$" + n.toLocaleString("es-CO");
}

export function starsLabel(n: number): string {
  return "★ " + n.toFixed(1);
}
