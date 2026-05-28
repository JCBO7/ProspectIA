/**
 * Google Places API (New) — requiere GOOGLE_PLACES_API_KEY en .env
 * Usa la nueva API: https://places.googleapis.com/v1/places:searchText
 * IMPORTANTE: Activar "Places API (New)" en Google Cloud Console
 *   https://console.cloud.google.com → APIs → Places API (New) → Habilitar
 */
import axios from "axios";
import type { ProspectoData } from "@/types";

const PLACES_V1_BASE = "https://places.googleapis.com/v1/places:searchText";

export interface GooglePlacesParams {
  query: string;
  ciudad?: string;
  limite?: number;
}

interface NewPlaceResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
}

export async function buscarEnGooglePlaces(params: GooglePlacesParams): Promise<ProspectoData[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const searchQuery = params.ciudad
    ? `${params.query} en ${params.ciudad}, México`
    : `${params.query} en México`;

  try {
    const res = await axios.post<{ places?: NewPlaceResult[] }>(
      PLACES_V1_BASE,
      {
        textQuery: searchQuery,
        languageCode: "es",
        regionCode: "MX",
        maxResultCount: Math.min(params.limite ?? 20, 20),
      },
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating",
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    return (res.data.places ?? []).flatMap((place) => {
      const p = mapNewPlaceToProspecto(place);
      return p ? [p] : [];
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.error?.message ?? err.message;
      console.error("Google Places error:", msg);
    }
    return [];
  }
}

function mapNewPlaceToProspecto(place: NewPlaceResult): ProspectoData | null {
  const nombre = place.displayName?.text;
  if (!nombre) return null;

  const parts = (place.formattedAddress ?? "").split(",").map((s) => s.trim());

  const rawPhone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? "";
  const telefono = rawPhone.replace(/[\s\-().+]/g, "").replace(/^52/, "").slice(-10) || undefined;

  return {
    empresa: nombre,
    direccion: place.formattedAddress || undefined,
    zona: parts[1] || undefined,
    ciudad: parts[2] || undefined,
    telefono: telefono || undefined,
    website: place.websiteUri || undefined,
    score: place.rating ? Math.round(place.rating * 20) : 0,
    fuente: "GOOGLE_MAPS" as const,
    metadata: {
      fuente: "Google Places",
      placeId: place.id,
      rating: place.rating,
    },
  };
}
