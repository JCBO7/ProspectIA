/**
 * datos.gob.mx — Portal de Datos Abiertos del Gobierno de México
 * API CKAN pública, sin API key requerida.
 * Docs: https://datos.gob.mx/api/3/action/
 */
import axios from "axios";
import type { ProspectoData } from "@/types";

const CKAN_BASE = "https://datos.gob.mx/api/3/action";

// Datasets conocidos indexados por sector de cliente (resource_id de datos.gob.mx)
const DATASETS_POR_SECTOR: Record<string, { resourceId: string; descripcion: string }[]> = {
  clinica:     [{ resourceId: "ab1783c3-e6f6-4f9c-9c2c-2bd8f49969d0", descripcion: "Clínicas y hospitales" }],
  hospital:    [{ resourceId: "ab1783c3-e6f6-4f9c-9c2c-2bd8f49969d0", descripcion: "Clínicas y hospitales" }],
  farmacia:    [{ resourceId: "ab1783c3-e6f6-4f9c-9c2c-2bd8f49969d0", descripcion: "Farmacias y clínicas" }],
  proveedor:   [{ resourceId: "2fd2a048-2309-45b9-886b-877c618bdb38", descripcion: "Proveedores y contratistas" }],
  contratista: [{ resourceId: "2fd2a048-2309-45b9-886b-877c618bdb38", descripcion: "Proveedores y contratistas" }],
  empresa:     [{ resourceId: "2fd2a048-2309-45b9-886b-877c618bdb38", descripcion: "Registro de empresas" }],
};

// Nombres de estado de México normalizados para filtrar
const ESTADO_NOMBRES: Record<string, string[]> = {
  "01": ["Aguascalientes"],
  "02": ["Baja California"],
  "03": ["Baja California Sur"],
  "04": ["Campeche"],
  "05": ["Coahuila"],
  "06": ["Colima"],
  "07": ["Chiapas"],
  "08": ["Chihuahua"],
  "09": ["Ciudad de Mexico", "Ciudad de México", "CDMX", "Distrito Federal"],
  "10": ["Durango"],
  "11": ["Guanajuato"],
  "12": ["Guerrero"],
  "13": ["Hidalgo"],
  "14": ["Jalisco"],
  "15": ["Estado de Mexico", "Estado de México", "Mexico", "México"],
  "16": ["Michoacan", "Michoacán"],
  "17": ["Morelos"],
  "18": ["Nayarit"],
  "19": ["Nuevo Leon", "Nuevo León"],
  "20": ["Oaxaca"],
  "21": ["Puebla"],
  "22": ["Queretaro", "Querétaro"],
  "23": ["Quintana Roo"],
  "24": ["San Luis Potosi", "San Luis Potosí"],
  "25": ["Sinaloa"],
  "26": ["Sonora"],
  "27": ["Tabasco"],
  "28": ["Tamaulipas"],
  "29": ["Tlaxcala"],
  "30": ["Veracruz"],
  "31": ["Yucatan", "Yucatán"],
  "32": ["Zacatecas"],
};

interface CKANRecord {
  [key: string]: string | number | null;
}

// Detecta el campo que contiene el nombre de la empresa en el dataset
function detectarCampoNombre(record: CKANRecord): string {
  const candidatos = ["empresa", "razon_social", "nombre", "establecimiento", "denominacion", "nombre_empresa", "name"];
  for (const c of candidatos) {
    if (record[c] !== undefined && record[c] !== null) return c;
  }
  return Object.keys(record).find(k => k !== "_id" && typeof record[k] === "string") ?? "_id";
}

// Detecta el campo de estado
function detectarCampoEstado(record: CKANRecord): string {
  const candidatos = ["estado", "entidad", "entidad_federativa", "state"];
  return candidatos.find(c => record[c] !== undefined) ?? "estado";
}

// Detecta el campo de municipio
function detectarCampoMunicipio(record: CKANRecord): string {
  const candidatos = ["municipio_o_delegacion", "municipio", "delegacion", "alcaldia", "ciudad"];
  return candidatos.find(c => record[c] !== undefined) ?? "municipio";
}

// Mapea un registro CKAN a ProspectoData
function mapCKANRecord(record: CKANRecord, giroDesc: string, estadoCodigo: string): ProspectoData | null {
  const campoNombre = detectarCampoNombre(record);
  const nombre = String(record[campoNombre] ?? "").trim();
  if (!nombre || nombre === "undefined") return null;

  const campoMunicipio = detectarCampoMunicipio(record);
  const municipio = String(record[campoMunicipio] ?? "").trim();
  const rfc = String(record.rfc_persona_fisica_moral_contratista ?? record.rfc ?? "").trim();

  return {
    empresa: nombre,
    giro: giroDesc,
    alcaldia: municipio || undefined,
    ciudad: (ESTADO_NOMBRES[estadoCodigo]?.[0]) ?? undefined,
    fuente: "MANUAL" as const,
    score: 0,
    metadata: {
      fuente: "datos.gob.mx",
      rfc: rfc || undefined,
    },
  };
}

// Busca en un dataset específico por estado
async function queryDataset(
  resourceId: string,
  giroDesc: string,
  estadoCodigo: string,
  limite: number,
  q?: string
): Promise<ProspectoData[]> {
  const nombresEstado = ESTADO_NOMBRES[estadoCodigo] ?? [];

  // Intentar con cada nombre del estado como filtro de búsqueda
  for (const nombreEstado of nombresEstado) {
    try {
      const res = await axios.get<{
        success: boolean;
        result: { total: number; records: CKANRecord[] };
      }>(`${CKAN_BASE}/datastore_search`, {
        params: {
          resource_id: resourceId,
          q: q || nombreEstado,
          limit: limite,
        },
        timeout: 12000,
        httpsAgent: new (await import("https")).Agent({ rejectUnauthorized: false }),
      });

      if (!res.data.success) continue;
      const records = res.data.result.records ?? [];
      if (!records.length) continue;

      // Filtrar por estado si los registros tienen ese campo
      const primerRecord = records[0];
      const campoEstado = detectarCampoEstado(primerRecord);
      const filtrados = records.filter((r) => {
        const val = String(r[campoEstado] ?? "").toLowerCase();
        return nombresEstado.some((n) => val.includes(n.toLowerCase()));
      });

      const resultados = (filtrados.length > 0 ? filtrados : records)
        .flatMap((r) => {
          const p = mapCKANRecord(r, giroDesc, estadoCodigo);
          return p ? [p] : [];
        })
        .slice(0, limite);

      if (resultados.length > 0) return resultados;
    } catch {
      continue;
    }
  }
  return [];
}

// Busca en datos.gob.mx datasets relevantes para el sector del cliente
async function buscarDatasetsRelevantes(
  sector: string,
  estadoCodigo: string,
  limite: number
): Promise<ProspectoData[]> {
  try {
    const res = await axios.get<{
      success: boolean;
      result: { results: Array<{ title: string; id: string; resources: Array<{ id: string; name: string; format: string }> }> };
    }>(`${CKAN_BASE}/package_search`, {
      params: { q: sector, rows: 5 },
      timeout: 10000,
      httpsAgent: new (await import("https")).Agent({ rejectUnauthorized: false }),
    });

    if (!res.data.success) return [];

    const prospectos: ProspectoData[] = [];
    for (const dataset of res.data.result.results.slice(0, 3)) {
      for (const resource of dataset.resources.filter(r => r.format === "CSV" || r.format === "JSON").slice(0, 1)) {
        try {
          const data = await queryDataset(resource.id, dataset.title, estadoCodigo, Math.ceil(limite / 3));
          prospectos.push(...data);
          if (prospectos.length >= limite) break;
        } catch { continue; }
      }
      if (prospectos.length >= limite) break;
    }
    return prospectos.slice(0, limite);
  } catch {
    return [];
  }
}

export interface DatosGobParams {
  sector: string;          // sector del cliente (ej: "restaurante", "hospital")
  estadoCodigo: string;
  limite?: number;
}

export async function buscarEnDatosGob(params: DatosGobParams): Promise<ProspectoData[]> {
  const { sector, estadoCodigo, limite = 20 } = params;
  const sectorNorm = sector.toLowerCase().trim();

  const resultados: ProspectoData[] = [];

  // 1. Buscar en datasets conocidos por sector
  for (const [key, datasets] of Object.entries(DATASETS_POR_SECTOR)) {
    if (sectorNorm.includes(key) || key.includes(sectorNorm.split(" ")[0])) {
      for (const ds of datasets) {
        const data = await queryDataset(ds.resourceId, ds.descripcion, estadoCodigo, Math.ceil(limite / 2), sector);
        resultados.push(...data);
        if (resultados.length >= limite) return resultados.slice(0, limite);
      }
    }
  }

  // 2. Si no hay match en datasets conocidos, buscar dinámicamente
  if (resultados.length < 5) {
    const dinamicos = await buscarDatasetsRelevantes(sector, estadoCodigo, limite - resultados.length);
    resultados.push(...dinamicos);
  }

  return resultados.slice(0, limite);
}
