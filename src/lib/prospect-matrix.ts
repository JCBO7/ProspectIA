/**
 * Matriz determinista: servicio del VENDEDOR → tipos de CLIENTES POTENCIALES
 * Esta lógica es fija y no depende de IA para evitar confundir vendedor con cliente.
 */

export interface ClienteProfile {
  tiposCliente: string[];
  osmTags: Array<{ key: string; value: string }>;
  denueSectores: string[];       // sectores del CLIENTE (no del vendedor)
  excluirGiros: string[];        // giros que NO deben aparecer (competidores)
  excluirPalabras: string[];     // palabras en nombre de empresa → competidor
}

// ─── Normalización compartida ────────────────────────────────────────────────
function norm(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// ─── Matriz principal ────────────────────────────────────────────────────────
const MATRIZ: Array<{ keywords: string[]; perfil: ClienteProfile }> = [
  {
    keywords: ["aire acondicionado", "climatizacion", "climatización", "hvac", "refrigeracion", "refrigeración", "calefaccion", "calefacción", "ventilacion", "ventilación"],
    perfil: {
      tiposCliente: ["Restaurantes", "Hoteles", "Hospitales", "Gimnasios", "Escuelas", "Centros comerciales", "Clínicas", "Supermercados"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "school" },
        { key: "leisure", value: "fitness_centre" },
        { key: "shop", value: "supermarket" },
      ],
      denueSectores: ["restaurante", "hotel", "hospital", "escuela", "gimnasio", "supermercado"],
      excluirGiros: ["aire acondicionado", "refrigeracion", "climatizacion", "hvac", "mantenimiento de equipo", "climatizador"],
      excluirPalabras: ["clima", "hvac", "refriger", "climatiz", "ventilac", "calefac", "aire acond"],
    },
  },
  {
    keywords: ["plomeria", "plomería", "fontaneria", "fontanería", "instalaciones hidraulicas", "hidráulicas", "hidraulicas"],
    perfil: {
      tiposCliente: ["Constructoras", "Hoteles", "Restaurantes", "Inmobiliarias", "Hospitales", "Escuelas"],
      osmTags: [
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "restaurant" },
        { key: "office", value: "estate_agent" },
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "school" },
      ],
      denueSectores: ["constructora", "hotel", "restaurante", "inmobiliaria", "hospital"],
      excluirGiros: ["plomeria", "fontaneria", "instalaciones hidraulicas"],
      excluirPalabras: ["plomer", "fontaner", "hidraul"],
    },
  },
  {
    keywords: ["electricidad", "instalaciones electricas", "eléctricas", "electricista", "electroinstalaciones", "electricas"],
    perfil: {
      tiposCliente: ["Constructoras", "Hoteles", "Restaurantes", "Hospitales", "Escuelas", "Industrias"],
      osmTags: [
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "restaurant" },
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "school" },
        { key: "office", value: "estate_agent" },
      ],
      denueSectores: ["constructora", "hotel", "restaurante", "industria", "hospital"],
      excluirGiros: ["electricidad", "instalaciones electricas", "electricista", "electrica"],
      excluirPalabras: ["electric", "electro", "voltaje", "instalac electr"],
    },
  },
  {
    keywords: ["limpieza", "aseo", "higiene", "fumigacion", "fumigación", "desinfeccion", "desinfección", "sanitizacion"],
    perfil: {
      tiposCliente: ["Restaurantes", "Hoteles", "Hospitales", "Escuelas", "Gimnasios", "Centros comerciales", "Oficinas"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "school" },
        { key: "leisure", value: "fitness_centre" },
        { key: "shop", value: "supermarket" },
      ],
      denueSectores: ["restaurante", "hotel", "hospital", "oficina", "escuela"],
      excluirGiros: ["limpieza", "aseo", "fumigacion", "sanitizacion", "higiene industrial"],
      excluirPalabras: ["limpie", "fumig", "sanitiz", "desinfec", "aseo "],
    },
  },
  {
    keywords: ["software", "sistema", "app", "aplicacion", "aplicación", "erp", "crm", "plataforma digital", "desarrollo web", "desarrollo de software", "tecnologia", "tecnología", "programacion", "programación"],
    perfil: {
      tiposCliente: ["Restaurantes", "Tiendas", "Clínicas", "Despachos contables", "Constructoras", "Distribuidoras", "Hoteles"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "shop", value: "convenience" },
        { key: "office", value: "company" },
        { key: "amenity", value: "clinic" },
        { key: "tourism", value: "hotel" },
      ],
      denueSectores: ["restaurante", "comercio", "clinica", "constructora", "hotel"],
      excluirGiros: ["software", "desarrollo", "tecnologia", "sistemas", "informatica", "programacion"],
      excluirPalabras: ["softwar", "techno", "tecnolog", "sistemas ", "programac", "desarrollad"],
    },
  },
  {
    keywords: ["contabilidad", "contador", "fiscal", "contable", "impuestos", "declaracion", "declaración", "sat", "nomina", "nómina", "auditoria", "auditoría"],
    perfil: {
      tiposCliente: ["Restaurantes", "Tiendas minoristas", "Constructoras", "Talleres", "PyMEs", "Hoteles"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "shop", value: "convenience" },
        { key: "shop", value: "car_repair" },
        { key: "tourism", value: "hotel" },
        { key: "office", value: "company" },
      ],
      denueSectores: ["restaurante", "comercio", "constructora", "taller", "hotel"],
      excluirGiros: ["contabilidad", "contador", "fiscal", "auditoria", "nomina", "despacho contable"],
      excluirPalabras: ["contabil", "contadu", "fiscal", "auditor", "nomina", "impuest"],
    },
  },
  {
    keywords: ["marketing", "publicidad", "diseño grafico", "gráfico", "redes sociales", "community manager", "seo", "branding", "agencia creativa", "agencia digital"],
    perfil: {
      tiposCliente: ["Restaurantes", "Hoteles", "Clínicas dentales", "Tiendas de ropa", "Gimnasios", "Escuelas privadas"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "shop", value: "clothes" },
        { key: "leisure", value: "fitness_centre" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "dentist" },
      ],
      denueSectores: ["restaurante", "tienda", "clinica", "gimnasio", "hotel"],
      excluirGiros: ["marketing", "publicidad", "agencia", "diseño", "comunicacion", "branding"],
      excluirPalabras: ["marketin", "publicit", "agencia ", "branding", "seo ", "community"],
    },
  },
  {
    keywords: ["uniformes", "ropa laboral", "ropa de trabajo", "playeras", "bordado", "estampado"],
    perfil: {
      tiposCliente: ["Restaurantes", "Hospitales", "Hoteles", "Empresas de seguridad", "Escuelas", "Construcción"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "amenity", value: "hospital" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "school" },
        { key: "office", value: "company" },
      ],
      denueSectores: ["restaurante", "hospital", "hotel", "seguridad privada", "escuela"],
      excluirGiros: ["uniformes", "ropa laboral", "textil", "confeccion", "bordado"],
      excluirPalabras: ["uniform", "bordad", "estampad", "confeccion", "textil"],
    },
  },
  {
    keywords: ["seguridad", "vigilancia", "camaras", "cámaras", "circuito cerrado", "cctv", "alarma", "acceso", "guardia"],
    perfil: {
      tiposCliente: ["Tiendas", "Restaurantes", "Hoteles", "Escuelas", "Bancos", "Hospitales"],
      osmTags: [
        { key: "shop", value: "supermarket" },
        { key: "amenity", value: "restaurant" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "school" },
        { key: "amenity", value: "bank" },
      ],
      denueSectores: ["comercio", "restaurante", "hotel", "banco", "escuela"],
      excluirGiros: ["seguridad privada", "vigilancia", "camaras de seguridad", "empresa de seguridad"],
      excluirPalabras: ["segurid", "vigilanc", "cctv", "guardia", "custodia"],
    },
  },
  {
    keywords: ["construccion", "construcción", "remodelacion", "remodelación", "obra", "albañileria", "albañilería", "impermeabilizacion"],
    perfil: {
      tiposCliente: ["Inmobiliarias", "Hoteles", "Restaurantes", "Escuelas privadas", "Empresas"],
      osmTags: [
        { key: "office", value: "estate_agent" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "restaurant" },
        { key: "amenity", value: "school" },
        { key: "office", value: "company" },
      ],
      denueSectores: ["inmobiliaria", "hotel", "restaurante", "empresa"],
      excluirGiros: ["construccion", "albañileria", "contratista", "obra", "remodelacion"],
      excluirPalabras: ["construcc", "albañil", "remodelac", "contratist", "impermeab"],
    },
  },
  {
    keywords: ["transporte", "logistica", "logística", "mensajeria", "mensajería", "paqueteria", "paquetería", "fletes", "mudanzas", "carga"],
    perfil: {
      tiposCliente: ["Tiendas en línea", "Distribuidoras", "Restaurantes", "Industrias", "Farmacias"],
      osmTags: [
        { key: "shop", value: "convenience" },
        { key: "amenity", value: "pharmacy" },
        { key: "amenity", value: "restaurant" },
        { key: "shop", value: "supermarket" },
        { key: "office", value: "company" },
      ],
      denueSectores: ["comercio", "farmacia", "restaurante", "distribuidora"],
      excluirGiros: ["transporte", "logistica", "mensajeria", "paqueteria", "fletes", "mudanzas"],
      excluirPalabras: ["transport", "logist", "mensajer", "paqueter", "fletes", "mudanza"],
    },
  },
  {
    keywords: ["capacitacion", "capacitación", "cursos", "formacion", "formación", "entrenamiento", "coaching", "consultoria", "consultoría"],
    perfil: {
      tiposCliente: ["Empresas medianas", "Restaurantes cadena", "Hoteles", "Call centers", "Tiendas departamentales"],
      osmTags: [
        { key: "office", value: "company" },
        { key: "amenity", value: "restaurant" },
        { key: "tourism", value: "hotel" },
        { key: "shop", value: "department_store" },
      ],
      denueSectores: ["empresa", "restaurante", "hotel", "call center"],
      excluirGiros: ["capacitacion", "cursos", "consultoria", "coaching", "formacion", "escuela de negocios"],
      excluirPalabras: ["capacitac", "consultor", "coaching", "training", "formac"],
    },
  },
  {
    keywords: ["alimentos", "comida", "bebidas", "abarrotes", "distribuidor de alimentos", "productos alimenticios", "mayorista"],
    perfil: {
      tiposCliente: ["Restaurantes", "Hoteles", "Tiendas de abarrotes", "Cafeterías", "Cantinas"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "tourism", value: "hotel" },
        { key: "shop", value: "convenience" },
        { key: "amenity", value: "cafe" },
        { key: "amenity", value: "fast_food" },
      ],
      denueSectores: ["restaurante", "hotel", "tienda de abarrotes", "cafeteria"],
      excluirGiros: ["distribuidor", "mayorista", "abarrotes", "alimentos al mayoreo"],
      excluirPalabras: ["distribuid", "mayorist", "abarrot"],
    },
  },
  {
    keywords: ["mobiliario", "muebles", "sillas", "escritorios", "oficina equipamiento", "equipo de oficina"],
    perfil: {
      tiposCliente: ["Empresas nuevas", "Despachos", "Hospitales", "Escuelas", "Hoteles"],
      osmTags: [
        { key: "office", value: "company" },
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "school" },
        { key: "tourism", value: "hotel" },
        { key: "office", value: "estate_agent" },
      ],
      denueSectores: ["empresa", "hospital", "escuela", "hotel"],
      excluirGiros: ["muebles", "mobiliario", "fabricacion de muebles", "mueblerista"],
      excluirPalabras: ["muebler", "mobili", "fabricac muebl"],
    },
  },
  {
    keywords: ["salud", "dental", "medico", "médico", "clinica", "clínica", "estetica", "estética", "spa", "bienestar"],
    perfil: {
      tiposCliente: ["Pacientes particulares", "Empresas con plan médico", "Hoteles", "Gimnasios"],
      osmTags: [
        { key: "office", value: "company" },
        { key: "leisure", value: "fitness_centre" },
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "school" },
      ],
      denueSectores: ["empresa", "gimnasio", "hotel", "escuela"],
      excluirGiros: ["clinica", "dental", "medico", "estetica", "spa", "consultorio"],
      excluirPalabras: ["clinic", "dental", "medic", "estetica", "spa "],
    },
  },
  {
    keywords: ["impresion", "impresión", "imprenta", "papeleria", "papelería", "material impreso", "lonas", "banners", "rotulacion"],
    perfil: {
      tiposCliente: ["Restaurantes", "Tiendas", "Escuelas", "Hoteles", "Eventos y bodas"],
      osmTags: [
        { key: "amenity", value: "restaurant" },
        { key: "shop", value: "clothes" },
        { key: "amenity", value: "school" },
        { key: "tourism", value: "hotel" },
        { key: "office", value: "company" },
      ],
      denueSectores: ["restaurante", "tienda", "escuela", "hotel"],
      excluirGiros: ["imprenta", "impresion", "rotulacion", "papeleria"],
      excluirPalabras: ["imprent", "impresion", "rotulac", "papeler", "banner"],
    },
  },
  {
    keywords: ["energia solar", "paneles solares", "fotovoltaico", "energias renovables", "energia renovable", "solar"],
    perfil: {
      tiposCliente: ["Industrias", "Hoteles", "Restaurantes", "Escuelas", "Naves industriales", "Hospitales"],
      osmTags: [
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "restaurant" },
        { key: "amenity", value: "school" },
        { key: "amenity", value: "hospital" },
        { key: "shop", value: "supermarket" },
      ],
      denueSectores: ["industria", "hotel", "restaurante", "escuela", "hospital"],
      excluirGiros: ["energia solar", "paneles solares", "fotovoltaico", "energias renovables"],
      excluirPalabras: ["solar", "fotovoltaic", "panel solar", "energia renov"],
    },
  },
  {
    keywords: ["jardineria", "jardinería", "paisajismo", "poda", "mantenimiento de areas verdes", "areas verdes"],
    perfil: {
      tiposCliente: ["Hoteles", "Restaurantes con jardín", "Fraccionamientos", "Empresas con jardines", "Hospitales"],
      osmTags: [
        { key: "tourism", value: "hotel" },
        { key: "amenity", value: "restaurant" },
        { key: "office", value: "company" },
        { key: "amenity", value: "hospital" },
        { key: "office", value: "estate_agent" },
      ],
      denueSectores: ["hotel", "restaurante", "empresa", "hospital"],
      excluirGiros: ["jardineria", "paisajismo", "areas verdes", "mantenimiento jardin"],
      excluirPalabras: ["jardiner", "paisajist", "poda ", "areas verde"],
    },
  },
  {
    keywords: ["papeleria", "papelería", "utiles", "útiles", "articulos de oficina", "artículos de oficina", "suministros de oficina"],
    perfil: {
      tiposCliente: ["Empresas", "Escuelas", "Despachos", "Hospitales", "Hoteles"],
      osmTags: [
        { key: "office", value: "company" },
        { key: "amenity", value: "school" },
        { key: "amenity", value: "hospital" },
        { key: "tourism", value: "hotel" },
      ],
      denueSectores: ["empresa", "escuela", "hospital", "hotel"],
      excluirGiros: ["papeleria", "utiles escolares", "articulos de oficina"],
      excluirPalabras: ["papeler", "util escolar", "articulo ofic"],
    },
  },
];

// ─── Función principal ────────────────────────────────────────────────────────
export function clasificarVendedor(descripcion: string): ClienteProfile | null {
  const desc = norm(descripcion);

  for (const entrada of MATRIZ) {
    for (const kw of entrada.keywords) {
      if (desc.includes(norm(kw))) {
        return entrada.perfil;
      }
    }
  }
  return null;
}

// ─── Filtro post-búsqueda: elimina competidores ──────────────────────────────
export function filtrarCompetidores<T extends { giro?: string; empresa?: string }>(
  resultados: T[],
  perfilVendedor: ClienteProfile | null,
  descripcionVendedor: string
): T[] {
  if (!perfilVendedor) return resultados;

  const descNorm = norm(descripcionVendedor);

  // Palabras del vendedor de más de 4 chars que no sean stopwords
  const STOP = new Set([
    "vendo", "venta", "ofrezco", "oferto", "tengo", "brindo",
    "para", "como", "esto", "nuestro", "nuestra", "servicio",
    "servicios", "empresa", "negocio", "trabajo", "somos", "soy",
    "produc", "dedico", "dedica",
  ]);
  const palabrasVendedor = descNorm.split(/\s+/).filter(
    (w) => w.length > 4 && !STOP.has(w)
  );

  return resultados.filter((r) => {
    const giroNorm = norm(r.giro ?? "");
    const empresaNorm = norm(r.empresa ?? "");

    // ── 1. Giro del resultado coincide con giros a excluir ────────────────
    for (const excluir of perfilVendedor.excluirGiros) {
      const excNorm = norm(excluir);
      if (giroNorm.includes(excNorm)) return false;
      if (excNorm.length > 3 && excNorm.includes(giroNorm.split(" ")[0] ?? "")) return false;
    }

    // ── 2. Nombre de empresa contiene palabras clave de exclusión ─────────
    for (const excluir of perfilVendedor.excluirGiros) {
      const excNorm = norm(excluir);
      if (excNorm.length > 4 && empresaNorm.includes(excNorm)) return false;
    }

    // ── 3. Nombre de empresa contiene palabras clave del vendedor ─────────
    for (const palabra of palabrasVendedor) {
      if (empresaNorm.includes(palabra)) return false;
    }

    // ── 4. Nuevo: excluirPalabras — lista curada de fragmentos sospechosos ─
    if (perfilVendedor.excluirPalabras) {
      for (const frag of perfilVendedor.excluirPalabras) {
        const fragNorm = norm(frag);
        if (empresaNorm.includes(fragNorm)) return false;
        if (giroNorm.includes(fragNorm)) return false;
      }
    }

    return true;
  });
}
