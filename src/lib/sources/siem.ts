/**
 * SIEM — Sistema de Información Empresarial Mexicano (SE)
 * Portal: https://siem.economia.gob.mx
 *
 * ESTADO: La API REST requiere autenticación del portal de la SE.
 * Para obtener acceso: registrarse en https://siem.economia.gob.mx
 * y solicitar API key a la Secretaría de Economía.
 *
 * Variable de entorno requerida: SIEM_API_KEY
 */
import axios from "axios";
import type { ProspectoData } from "@/types";

const SIEM_BASE = "https://siem.economia.gob.mx/api";

export interface SIEMParams {
  actividad: string;    // giro/sector del cliente (ej: "restaurante")
  estadoCodigo: string; // código INEGI del estado (ej: "09" para CDMX)
  municipio?: string;
  limite?: number;
  pagina?: number;
}

interface SIEMEmpresa {
  id?: string;
  nombre?: string;
  razonSocial?: string;
  actividad?: string;
  giro?: string;
  estado?: string;
  municipio?: string;
  colonia?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  rfc?: string;
}

function mapSIEMToProspecto(emp: SIEMEmpresa): ProspectoData | null {
  const nombre = emp.nombre || emp.razonSocial;
  if (!nombre) return null;

  return {
    empresa: nombre,
    giro: emp.actividad || emp.giro || undefined,
    alcaldia: emp.municipio || undefined,
    ciudad: emp.estado || undefined,
    zona: emp.colonia || undefined,
    direccion: emp.direccion || undefined,
    telefono: emp.telefono || undefined,
    email: emp.email || undefined,
    website: emp.sitioWeb || undefined,
    fuente: "MANUAL" as const,
    score: 0,
    metadata: {
      fuente: "SIEM",
      rfc: emp.rfc,
      siemId: emp.id,
    },
  };
}

export async function buscarEnSIEM(params: SIEMParams): Promise<ProspectoData[]> {
  const apiKey = process.env.SIEM_API_KEY;
  if (!apiKey) return [];  // Sin key, skip silenciosamente

  const { actividad, estadoCodigo, municipio, limite = 20, pagina = 1 } = params;

  try {
    const res = await axios.get<{ empresas?: SIEMEmpresa[]; data?: SIEMEmpresa[] }>(
      `${SIEM_BASE}/empresas`,
      {
        params: {
          actividad,
          estado: estadoCodigo,
          municipio: municipio || undefined,
          pagina: pagina - 1,
          registros: limite,
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        timeout: 12000,
        httpsAgent: new (await import("https")).Agent({ rejectUnauthorized: false }),
      }
    );

    const lista = res.data.empresas ?? res.data.data ?? [];
    return lista.flatMap((e) => {
      const p = mapSIEMToProspecto(e);
      return p ? [p] : [];
    });
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      console.warn("SIEM: API key inválida o sin permisos");
    }
    return [];
  }
}
