/**
 * OpenStreetMap / Overpass API — completamente gratuito, sin API key
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */
import axios from "axios";
import type { ProspectoData } from "@/types";

const OVERPASS_URLS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Coordenadas del centro de cada estado (capital o ciudad principal)
export const ESTADO_CENTROS: Record<string, { lat: number; lng: number; radio: number }> = {
  "00": { lat: 23.6345, lng: -102.5528, radio: 60000 }, // Nacional — Bajío/centro de México
  "01": { lat: 21.8823, lng: -102.2912, radio: 20000 }, // Aguascalientes
  "02": { lat: 32.5027, lng: -115.4545, radio: 35000 }, // BC (Mexicali)
  "03": { lat: 24.1426, lng: -110.3128, radio: 25000 }, // BCS (La Paz)
  "04": { lat: 19.8301, lng: -90.5349,  radio: 20000 }, // Campeche
  "05": { lat: 25.4233, lng: -100.9773, radio: 25000 }, // Coahuila (Saltillo)
  "06": { lat: 19.2452, lng: -103.7241, radio: 15000 }, // Colima
  "07": { lat: 16.7522, lng: -93.1157,  radio: 25000 }, // Chiapas (Tuxtla)
  "08": { lat: 28.6330, lng: -106.0691, radio: 30000 }, // Chihuahua
  "09": { lat: 19.4326, lng: -99.1332,  radio: 20000 }, // CDMX
  "10": { lat: 24.0277, lng: -104.6532, radio: 20000 }, // Durango
  "11": { lat: 21.0190, lng: -101.2574, radio: 25000 }, // Guanajuato
  "12": { lat: 17.5504, lng: -99.5016,  radio: 25000 }, // Guerrero (Chilpancingo)
  "13": { lat: 20.1011, lng: -98.7591,  radio: 20000 }, // Hidalgo (Pachuca)
  "14": { lat: 20.6597, lng: -103.3496, radio: 20000 }, // Jalisco (Guadalajara)
  "15": { lat: 19.2965, lng: -99.6540,  radio: 20000 }, // Edomex (Toluca)
  "16": { lat: 19.7011, lng: -101.1843, radio: 20000 }, // Michoacán (Morelia)
  "17": { lat: 18.9244, lng: -99.2215,  radio: 15000 }, // Morelos (Cuernavaca)
  "18": { lat: 21.5114, lng: -104.8955, radio: 20000 }, // Nayarit (Tepic)
  "19": { lat: 25.6866, lng: -100.3161, radio: 15000 }, // Nuevo León (Monterrey)
  "20": { lat: 17.0732, lng: -96.7266,  radio: 20000 }, // Oaxaca
  "21": { lat: 19.0434, lng: -98.1985,  radio: 20000 }, // Puebla
  "22": { lat: 20.5888, lng: -100.3899, radio: 15000 }, // Querétaro
  "23": { lat: 21.1743, lng: -86.8466,  radio: 20000 }, // QRoo (Chetumal)
  "24": { lat: 22.1565, lng: -100.9855, radio: 20000 }, // SLP
  "25": { lat: 24.7994, lng: -107.3879, radio: 20000 }, // Sinaloa (Culiacán)
  "26": { lat: 29.0729, lng: -110.9559, radio: 25000 }, // Sonora (Hermosillo)
  "27": { lat: 17.9892, lng: -92.9475,  radio: 20000 }, // Tabasco (Villahermosa)
  "28": { lat: 23.7369, lng: -99.1411,  radio: 25000 }, // Tamaulipas (Cd Victoria)
  "29": { lat: 19.3182, lng: -98.2374,  radio: 10000 }, // Tlaxcala
  "30": { lat: 19.5438, lng: -96.9248,  radio: 20000 }, // Veracruz (Xalapa)
  "31": { lat: 20.9674, lng: -89.6237,  radio: 20000 }, // Yucatán (Mérida)
  "32": { lat: 22.7709, lng: -102.5832, radio: 20000 }, // Zacatecas
};

export interface OSMBusquedaParams {
  osmTags: Array<{ key: string; value: string }>;
  estadoCodigo: string;
  lat?: number;
  lng?: number;
  radio?: number;
  limite?: number;
}

interface OSMNode {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(params: OSMBusquedaParams): string {
  const centro = ESTADO_CENTROS[params.estadoCodigo] ?? ESTADO_CENTROS["09"];
  const lat = params.lat ?? centro.lat;
  const lng = params.lng ?? centro.lng;
  const radio = params.radio ?? centro.radio;

  const tagLines = params.osmTags.flatMap(({ key, value }) => {
    const tagFilter = value === "*" ? `["${key}"]` : `["${key}"="${value}"]`;
    return [
      `  node${tagFilter}["name"](around:${radio},${lat},${lng});`,
      `  way${tagFilter}["name"](around:${radio},${lat},${lng});`,
    ];
  });

  return `[out:json][timeout:28];
(
${tagLines.join("\n")}
);
out body center ${params.limite ?? 40};`;
}

async function queryOverpass(query: string): Promise<OSMNode[]> {
  for (const url of OVERPASS_URLS) {
    try {
      const res = await axios.get(url, {
        params: { data: query },
        headers: { "User-Agent": "ProspectAI/1.0 (contacto@prospectai.mx)" },
        timeout: 25000,
      });
      return res.data?.elements ?? [];
    } catch {
      // intenta con el siguiente mirror
    }
  }
  return [];
}

function mapOSMToProspecto(el: OSMNode, _estadoCodigo: string): ProspectoData | null {
  const tags = el.tags ?? {};
  const nombre = tags.name;
  if (!nombre) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;

  // Teléfono: varios campos posibles en OSM
  const telefono =
    tags.phone || tags["contact:phone"] || tags["contact:mobile"] ||
    tags.mobile || tags["phone:MX"] || "";

  // Tipo de negocio
  const tipo =
    tags.amenity || tags.shop || tags.office || tags.tourism ||
    tags.healthcare || tags.leisure || tags.craft || "";

  // Dirección
  const calle = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const colonia = tags["addr:suburb"] || tags["addr:neighbourhood"] || "";
  const ciudad = tags["addr:city"] || tags["addr:state"] || "";

  // Responsable / contacto
  const responsable =
    tags["contact:person"] || tags.owner || tags.operator || "";

  return {
    empresa: nombre,
    giro: tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, " ") : undefined,
    zona: colonia || undefined,
    alcaldia: ciudad || undefined,
    ciudad: ciudad || undefined,
    contacto: responsable || undefined,
    telefono: telefono ? telefono.replace(/[\s\-().+]/g, "").slice(-10) : undefined,
    email: tags.email || tags["contact:email"] || undefined,
    website: tags.website || tags["contact:website"] || tags["contact:facebook"] || undefined,
    direccion: calle || undefined,
    fuente: "MANUAL" as const, // mapeado a MANUAL por ahora (fuente: OSM)
    score: 0,
    metadata: {
      fuente: "OSM",
      osmId: el.id,
      osmType: el.type,
      lat,
      lng,
      tags: Object.keys(tags)
        .filter(k => ["name", "amenity", "shop", "office", "phone", "website", "email"].includes(k))
        .reduce((acc, k) => ({ ...acc, [k]: tags[k] }), {}),
    },
  };
}

export async function buscarEnOSM(params: OSMBusquedaParams): Promise<ProspectoData[]> {
  if (!params.osmTags.length) return [];

  const query = buildOverpassQuery(params);
  const elementos = await queryOverpass(query);

  const resultados: ProspectoData[] = [];
  for (const el of elementos) {
    const p = mapOSMToProspecto(el, params.estadoCodigo);
    if (p) resultados.push(p);
  }

  // Deduplicar por nombre exacto
  const vistos = new Set<string>();
  return resultados.filter(p => {
    const key = p.empresa.toLowerCase().trim();
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

// Mapeo de descripciones comunes → tags OSM
export const OSM_TAGS_COMUNES: Record<string, Array<{ key: string; value: string }>> = {
  restaurante:   [{ key: "amenity", value: "restaurant" }, { key: "amenity", value: "fast_food" }],
  cafe:          [{ key: "amenity", value: "cafe" }, { key: "amenity", value: "bar" }],
  hotel:         [{ key: "tourism", value: "hotel" }, { key: "tourism", value: "motel" }],
  farmacia:      [{ key: "amenity", value: "pharmacy" }],
  clinica:       [{ key: "amenity", value: "clinic" }, { key: "amenity", value: "doctors" }],
  dentista:      [{ key: "amenity", value: "dentist" }],
  hospital:      [{ key: "amenity", value: "hospital" }],
  escuela:       [{ key: "amenity", value: "school" }],
  universidad:   [{ key: "amenity", value: "university" }],
  banco:         [{ key: "amenity", value: "bank" }],
  gasolinera:    [{ key: "amenity", value: "fuel" }],
  supermercado:  [{ key: "shop", value: "supermarket" }],
  ferreteria:    [{ key: "shop", value: "hardware" }, { key: "shop", value: "doityourself" }],
  ropa:          [{ key: "shop", value: "clothes" }, { key: "shop", value: "fashion" }],
  panaderia:     [{ key: "shop", value: "bakery" }],
  belleza:       [{ key: "shop", value: "beauty" }, { key: "amenity", value: "hairdresser" }],
  gym:           [{ key: "leisure", value: "fitness_centre" }],
  consultoria:   [{ key: "office", value: "company" }, { key: "office", value: "consulting" }],
  abogado:       [{ key: "office", value: "lawyer" }],
  contador:      [{ key: "office", value: "accountant" }],
  taller:        [{ key: "shop", value: "car_repair" }, { key: "craft", value: "car_repair" }],
  papeleria:     [{ key: "shop", value: "stationery" }],
  tienda:        [{ key: "shop", value: "convenience" }, { key: "shop", value: "general" }],
  oficina:       [{ key: "office", value: "*" }],
};
