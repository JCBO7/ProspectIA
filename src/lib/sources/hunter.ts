/**
 * Hunter.io API — enriquecimiento de emails por dominio
 * Requiere HUNTER_API_KEY en .env
 * Plan gratuito: 25 búsquedas/mes — https://hunter.io/pricing
 * Docs: https://hunter.io/api-documentation/v2
 */
import axios from "axios";

const HUNTER_BASE = "https://api.hunter.io/v2";

export interface HunterEmail {
  email: string;
  confidence: number;
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
}

export interface HunterResult {
  domain: string;
  organization?: string;
  emails: HunterEmail[];
}

export async function buscarEmailsHunter(website: string): Promise<HunterResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey || !website) return null;

  // Extraer solo el dominio (sin protocolo ni ruta)
  const domain = website
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];

  if (!domain || domain.length < 4) return null;

  try {
    const res = await axios.get<{
      data: {
        domain: string;
        organization: string;
        emails: Array<{
          value: string;
          confidence: number;
          first_name?: string;
          last_name?: string;
          position?: string;
          department?: string;
        }>;
      };
      errors?: Array<{ id: string; details: string }>;
    }>(`${HUNTER_BASE}/domain-search`, {
      params: {
        domain,
        api_key: apiKey,
        limit: 5,
      },
      timeout: 8000,
    });

    if (res.data.errors?.length) return null;

    const data = res.data.data;
    return {
      domain: data.domain,
      organization: data.organization,
      emails: (data.emails ?? []).map((e) => ({
        email: e.value,
        confidence: e.confidence,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        department: e.department,
      })),
    };
  } catch (err) {
    // 404 = dominio no encontrado, 429 = rate limit — ambos son silenciosos
    if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 429)) {
      return null;
    }
    console.error("Error Hunter.io:", err instanceof Error ? err.message : err);
    return null;
  }
}
