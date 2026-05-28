/**
 * Nominatim (OpenStreetMap) — geocodificación gratuita, sin API key
 * Docs: https://nominatim.org/release-docs/develop/api/Search/
 * Límite: 1 req/seg, uso razonable
 */
import axios from "axios";

const BASE = "https://nominatim.openstreetmap.org";

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
}

export async function geocodificar(query: string, countryCode = "mx"): Promise<{ lat: number; lng: number; nombre: string } | null> {
  try {
    const res = await axios.get(`${BASE}/search`, {
      params: {
        q: query,
        format: "json",
        countrycodes: countryCode,
        limit: 1,
        addressdetails: 1,
      },
      headers: { "User-Agent": "JC-ProspectAI/1.0 (prospecting-app)" },
      timeout: 8000,
    });

    const results: NominatimResult[] = res.data;
    if (!results.length) return null;

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      nombre: results[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function geocodificarMunicipio(municipio: string, estado: string): Promise<{ lat: number; lng: number } | null> {
  const resultado = await geocodificar(`${municipio}, ${estado}, México`);
  if (!resultado) return null;
  return { lat: resultado.lat, lng: resultado.lng };
}
