/**
 * Motor de búsqueda unificado — agrega OSM + DENUE + Google Places + Hunter.io
 * Siempre devuelve datos reales, sin mocks.
 */
import { interpretarBusquedaCompleta } from "@/lib/claude/client";
import { buscarEnOSM, ESTADO_CENTROS, OSM_TAGS_COMUNES } from "@/lib/sources/osm";
import { buscarPorEstado, mapEstratoATamano, ESTADOS_MEXICO } from "@/lib/denue/client";
import { buscarEnGooglePlaces } from "@/lib/sources/google-places";
import { buscarEmailsHunter } from "@/lib/sources/hunter";
import { scorearProspecto } from "@/lib/claude/client";
import { geocodificarMunicipio } from "@/lib/sources/nominatim";
import { clasificarVendedor, filtrarCompetidores } from "@/lib/prospect-matrix";
import { buscarEnDatosGob } from "@/lib/sources/datos-gob";
import { buscarEnSIEM } from "@/lib/sources/siem";
import type { ProspectoData } from "@/types";

// Solo scorear los primeros N resultados con Claude (Opción A)
const MAX_SCORE_IA = 5;

export interface SearchParams {
  descripcionNegocio: string;
  estadoCodigo: string;
  alcaldia?: string;
  alcaldiaCode?: string;
  tamano?: string;
  limite?: number;
  pagina?: number;
}

export interface SearchResult {
  prospectos: ProspectoData[];
  total: number;
  fuentes: { nombre: string; cantidad: number; disponible: boolean }[];
  girosInterpretados: string[];
  osmTags: Array<{ key: string; value: string }>;
  debug?: Record<string, unknown>;
}

export async function buscarProspectos(params: SearchParams): Promise<SearchResult> {
  const {
    descripcionNegocio,
    estadoCodigo,
    alcaldia,
    alcaldiaCode,
    tamano,
    limite = 20,
    pagina = 1,
  } = params;

  const esNacional = estadoCodigo === "00";
  const nombreEstado = esNacional ? "México" : (ESTADOS_MEXICO[estadoCodigo] ?? "México");
  const fuentes: SearchResult["fuentes"] = [];
  const debugInfo: Record<string, unknown> = {};

  // ─── 0. Matriz determinista: identifica perfil del vendedor ───────────────
  const perfilVendedor = clasificarVendedor(descripcionNegocio);
  debugInfo.matrizMatch = !!perfilVendedor;

  // ─── 1. Claude interpreta la búsqueda ────────────────────────────────────
  let girosInterpretados: string[] = [];
  let palabrasClave: string[] = [];
  let osmTags: Array<{ key: string; value: string }> = [];

  // Si la matriz determinista reconoció el servicio, usa sus tags directamente
  if (perfilVendedor) {
    osmTags = perfilVendedor.osmTags;
    palabrasClave = perfilVendedor.denueSectores;
    girosInterpretados = perfilVendedor.tiposCliente;
    debugInfo.matrizUsada = true;
    // Intenta enriquecer con Claude en paralelo (sin bloquear si falla)
    interpretarBusquedaCompleta(descripcionNegocio)
      .then((interp) => { debugInfo.claudeEnriquecio = true; void interp; })
      .catch(() => { debugInfo.claudeEnriquecioError = true; });
  } else {
    try {
      const interp = await interpretarBusquedaCompleta(descripcionNegocio);
      girosInterpretados = interp.girosScian;
      palabrasClave = interp.palabrasClave;
      osmTags = interp.osmTags.length ? interp.osmTags : inferirTagsOSM(descripcionNegocio);
      debugInfo.claudeOk = true;
    } catch (e) {
      palabrasClave = [descripcionNegocio];
      osmTags = inferirTagsOSM(descripcionNegocio);
      debugInfo.claudeError = e instanceof Error ? e.message : String(e);
    }
  }

  // ─── 2. Geocodificar municipio si no es CDMX ─────────────────────────────
  let coordsCustom: { lat: number; lng: number } | null = null;
  if (estadoCodigo !== "09" && alcaldia) {
    coordsCustom = await geocodificarMunicipio(alcaldia, nombreEstado);
  }

  const ciudadTexto = esNacional
    ? "México"
    : alcaldia
    ? `${alcaldia}, ${nombreEstado}`
    : nombreEstado;

  // ─── 3. Buscar en todas las fuentes disponibles en paralelo ──────────────
  // Google Places: múltiples búsquedas por los top-3 sectores de clientes
  const gpQueries = palabrasClave.slice(0, 3).length
    ? palabrasClave.slice(0, 3)
    : [descripcionNegocio];

  const [resultadosOSM, resultadosDENUE, ...resultadosGPlacesArr] = await Promise.allSettled([
    // OSM — siempre disponible, gratuito
    buscarEnOSM({
      osmTags,
      estadoCodigo,
      lat: coordsCustom?.lat ?? ESTADO_CENTROS[estadoCodigo]?.lat,
      lng: coordsCustom?.lng ?? ESTADO_CENTROS[estadoCodigo]?.lng,
      radio: coordsCustom ? 10000 : undefined,
      limite: Math.ceil(limite * 1.5),
    }),

    // DENUE — solo si hay API key, busca por sector del CLIENTE
    // "0" en DENUE = búsqueda nacional; "00" es nuestro código interno para "todos"
    process.env.DENUE_API_KEY
      ? buscarPorEstado({
          estadoCodigo: esNacional ? "0" : estadoCodigo,
          alcaldiaCode: esNacional ? undefined : (alcaldiaCode ?? undefined),
          giro: palabrasClave[0] || girosInterpretados[0],
          nombre: undefined,
          registro: limite,
          pagina,
        }).then((ests) =>
          ests.map((est) => ({
            empresa: est.nombre,
            giro: est.claseActividad,
            giroSCIAN: est.codigoActividad,
            zona: est.colonia || undefined,
            alcaldia: est.municipio || undefined,
            ciudad: est.entidad || nombreEstado,
            tamano: mapEstratoATamano(est.estrato) as ProspectoData["tamano"],
            contacto: est.responsable || undefined,
            telefono: est.telefono || undefined,
            email: est.correoElectronico || undefined,
            website: est.sitioWeb || undefined,
            direccion:
              [est.tipoVialidad, est.nombreVialidad, est.numeroExterior, est.colonia, `CP ${est.cp}`]
                .filter(Boolean)
                .join(" ") || undefined,
            fuente: "DENUE" as const,
            score: 0,
            metadata: { fuente: "DENUE", denueId: est.id },
          }))
        )
      : Promise.resolve([]),

    // Google Places — una búsqueda por cada sector de cliente (máx 3)
    ...gpQueries.map((q) =>
      process.env.GOOGLE_PLACES_API_KEY
        ? buscarEnGooglePlaces({
            query: q,
            ciudad: ciudadTexto,
            limite: Math.ceil(limite / gpQueries.length) + 5,
          }).then((results) =>
            results.map((r) => ({ ...r, giro: r.giro || q }))
          )
        : Promise.resolve([])
    ),

    // datos.gob.mx — datasets abiertos del gobierno
    buscarEnDatosGob({
      sector: palabrasClave[0] || girosInterpretados[0] || descripcionNegocio,
      estadoCodigo,
      limite: Math.ceil(limite / 2),
    }),

    // SIEM — solo si hay API key configurada
    buscarEnSIEM({
      actividad: palabrasClave[0] || girosInterpretados[0] || descripcionNegocio,
      estadoCodigo,
      limite: Math.ceil(limite / 2),
    }),
  ]);

  // ─── 4. Consolidar resultados ─────────────────────────────────────────────
  const osmData: ProspectoData[] =
    resultadosOSM.status === "fulfilled" ? resultadosOSM.value : [];
  const denueData: ProspectoData[] =
    resultadosDENUE.status === "fulfilled" ? resultadosDENUE.value : [];

  // Google Places + datos.gob.mx + SIEM están en el spread
  const allSettled = resultadosGPlacesArr as PromiseSettledResult<ProspectoData[]>[];
  const gpResults   = allSettled.slice(0, gpQueries.length);
  const datosGobResult = allSettled[gpQueries.length];
  const siemResult     = allSettled[gpQueries.length + 1];

  const gplacesData: ProspectoData[] = gpResults
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<ProspectoData[]>).value);
  const datosGobData: ProspectoData[] =
    datosGobResult?.status === "fulfilled" ? (datosGobResult as PromiseFulfilledResult<ProspectoData[]>).value : [];
  const siemData: ProspectoData[] =
    siemResult?.status === "fulfilled" ? (siemResult as PromiseFulfilledResult<ProspectoData[]>).value : [];

  debugInfo.osmCount      = osmData.length;
  debugInfo.denueCount    = denueData.length;
  debugInfo.gplacesCount  = gplacesData.length;
  debugInfo.datosGobCount = datosGobData.length;
  debugInfo.siemCount     = siemData.length;

  fuentes.push({ nombre: "OpenStreetMap",   cantidad: osmData.length,      disponible: true });
  fuentes.push({ nombre: "DENUE (INEGI)",   cantidad: denueData.length,    disponible: !!process.env.DENUE_API_KEY });
  fuentes.push({ nombre: "Google Places",   cantidad: gplacesData.length,  disponible: !!process.env.GOOGLE_PLACES_API_KEY });
  fuentes.push({ nombre: "datos.gob.mx",    cantidad: datosGobData.length, disponible: true });
  fuentes.push({ nombre: "SIEM (Economía)", cantidad: siemData.length,     disponible: !!process.env.SIEM_API_KEY });

  // Merge: DENUE y Google Places tienen prioridad; datos.gob/SIEM antes que OSM
  const mergedRaw = mergeResultados([...denueData, ...gplacesData, ...datosGobData, ...siemData, ...osmData], limite * pagina);

  // Filtrar competidores usando la matriz determinista
  const merged = filtrarCompetidores(mergedRaw, perfilVendedor, descripcionNegocio);
  debugInfo.antesDeFiltroCometidores = mergedRaw.length;
  debugInfo.despuesDeFiltroCometidores = merged.length;

  // Filtrar por tamaño
  const filtrados = tamano
    ? merged.filter((p) => !p.tamano || p.tamano === tamano)
    : merged;

  // Paginar
  const inicio = (pagina - 1) * limite;
  const paginated = filtrados.slice(inicio, inicio + limite);

  // ─── 5. Enriquecer con Hunter.io (emails) los que tienen website ──────────
  const enriquecidos = await Promise.all(
    paginated.map(async (p) => {
      if (!p.website || !process.env.HUNTER_API_KEY) return p;
      const hunterResult = await buscarEmailsHunter(p.website);
      if (!hunterResult?.emails.length) return p;
      const topEmail = hunterResult.emails[0];
      return {
        ...p,
        email: p.email || topEmail.email,
        contacto:
          p.contacto ||
          (topEmail.firstName
            ? `${topEmail.firstName} ${topEmail.lastName ?? ""}`.trim()
            : undefined),
        metadata: {
          ...(p.metadata as object),
          hunterEmails: hunterResult.emails,
        },
      };
    })
  );

  // ─── 6. Scorear con Claude SOLO los primeros MAX_SCORE_IA ─────────────────
  const [paraScore, sinScore] = [
    enriquecidos.slice(0, MAX_SCORE_IA),
    enriquecidos.slice(MAX_SCORE_IA),
  ];

  const scored = await Promise.all(
    paraScore.map(async (p) => {
      try {
        const { score, razonamiento } = await scorearProspecto(
          {
            empresa: p.empresa,
            giro: p.giro,
            tamano: p.tamano,
            zona: p.zona,
            telefono: p.telefono,
            email: p.email,
            website: p.website,
          },
          descripcionNegocio
        );
        return {
          ...p,
          score,
          metadata: { ...(p.metadata as object), razonamientoScore: razonamiento },
        };
      } catch {
        return { ...p, score: scoreCompletitud(p) };
      }
    })
  );

  // El resto recibe score basado en completitud de datos (no flat 50)
  const rest = sinScore.map((p) => ({ ...p, score: p.score || scoreCompletitud(p) }));
  const conScore = [...scored, ...rest]
    .filter((p) => (p.score ?? 0) >= 15) // eliminar resultados claramente irrelevantes
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    prospectos: conScore,
    total: filtrados.length,
    fuentes,
    girosInterpretados,
    osmTags,
    debug: process.env.NODE_ENV === "development" ? debugInfo : undefined,
  };
}

function mergeResultados(lista: ProspectoData[], maxItems: number): ProspectoData[] {
  const vistos = new Map<string, ProspectoData>();

  for (const p of lista) {
    const key = normalizarNombre(p.empresa);
    if (!vistos.has(key)) {
      vistos.set(key, p);
    } else {
      const existente = vistos.get(key)!;
      vistos.set(key, {
        ...existente,
        telefono: existente.telefono || p.telefono,
        email: existente.email || p.email,
        website: existente.website || p.website,
        contacto: existente.contacto || p.contacto,
        direccion: existente.direccion || p.direccion,
      });
    }
    if (vistos.size >= maxItems * 2) break;
  }

  return Array.from(vistos.values());
}

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(sa de cv|sapi de cv|sc|s\.a\.|s\.c\.|s de rl|ac)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

// Mapeo de servicio del VENDEDOR → tags OSM de sus CLIENTES POTENCIALES
const SERVICIO_A_CLIENTES: Record<string, Array<{ key: string; value: string }>> = {
  "aire acondicionado": [{ key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }, { key: "office", value: "company" }, { key: "amenity", value: "hospital" }],
  "climatizacion":      [{ key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }, { key: "office", value: "company" }],
  "refrigeracion":      [{ key: "amenity", value: "restaurant" }, { key: "shop", value: "supermarket" }, { key: "amenity", value: "hospital" }],
  "limpieza":           [{ key: "office", value: "company" }, { key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }],
  "seguridad":          [{ key: "shop", value: "supermarket" }, { key: "office", value: "company" }, { key: "tourism", value: "hotel" }],
  "mantenimiento":      [{ key: "office", value: "company" }, { key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }],
  "software":           [{ key: "amenity", value: "restaurant" }, { key: "shop", value: "convenience" }, { key: "office", value: "company" }],
  "contabilidad":       [{ key: "amenity", value: "restaurant" }, { key: "shop", value: "convenience" }, { key: "office", value: "company" }],
  "marketing":          [{ key: "shop", value: "clothes" }, { key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }],
  "uniformes":          [{ key: "amenity", value: "restaurant" }, { key: "amenity", value: "hospital" }, { key: "tourism", value: "hotel" }],
  "construccion":       [{ key: "office", value: "company" }, { key: "office", value: "estate_agent" }],
  "renta":              [{ key: "office", value: "company" }, { key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }],
  "capacitacion":       [{ key: "office", value: "company" }, { key: "amenity", value: "restaurant" }],
  "transporte":         [{ key: "shop", value: "supermarket" }, { key: "office", value: "company" }, { key: "amenity", value: "restaurant" }],
  "publicidad":         [{ key: "shop", value: "clothes" }, { key: "amenity", value: "restaurant" }, { key: "tourism", value: "hotel" }],
};

function inferirTagsOSM(descripcion: string): Array<{ key: string; value: string }> {
  const desc = descripcion.toLowerCase();

  // Primero intenta mapear el SERVICIO DEL VENDEDOR a sus CLIENTES
  for (const [servicio, clienteTags] of Object.entries(SERVICIO_A_CLIENTES)) {
    if (desc.includes(servicio)) return clienteTags;
  }

  // Luego intenta con el mapa de keywords directas (para búsquedas donde ya se describe al cliente)
  for (const [keyword, tags] of Object.entries(OSM_TAGS_COMUNES)) {
    if (desc.includes(keyword)) return tags;
  }

  // Fallback genérico: sectores más amplios de posibles clientes
  return [
    { key: "amenity", value: "restaurant" },
    { key: "office", value: "company" },
    { key: "tourism", value: "hotel" },
  ];
}

// Score basado en completitud de datos — reemplaza el flat 50 para prospectos sin score IA
function scoreCompletitud(p: ProspectoData): number {
  let score = 25; // base mínima
  if (p.telefono) score += 20;
  if (p.email) score += 20;
  if (p.website) score += 15;
  if (p.contacto) score += 10;
  if (p.giro) score += 5;
  if (p.direccion) score += 5;
  return Math.min(score, 75); // Claude puede empujar hasta 100
}
