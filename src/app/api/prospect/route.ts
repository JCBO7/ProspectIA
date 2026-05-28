/**
 * POST /api/prospect
 * Flujo combinado: Google Places → Hunter.io enrichment
 * Body: { businessType: string, city: string }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buscarEnGooglePlaces } from "@/lib/sources/google-places";
import { buscarEmailsHunter } from "@/lib/sources/hunter";
import type { ProspectoData } from "@/types";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { businessType, city } = body as { businessType?: string; city?: string };

    if (!businessType?.trim() || !city?.trim()) {
      return NextResponse.json(
        { error: "businessType y city son requeridos" },
        { status: 400 }
      );
    }

    // 1. Buscar negocios en Google Places
    const places = await buscarEnGooglePlaces({
      query: businessType,
      ciudad: city,
      limite: 20,
    });

    // 2. Enriquecer con Hunter.io los que tienen website (en paralelo, máx 5 concurrentes)
    const enriched: ProspectoData[] = await Promise.all(
      places.map(async (prospect) => {
        if (!prospect.website) return prospect;

        const hunterResult = await buscarEmailsHunter(prospect.website);
        if (!hunterResult?.emails.length) return prospect;

        const topEmail = hunterResult.emails[0];
        return {
          ...prospect,
          // Usar el email con mayor confidence score
          email: topEmail.email,
          // Si Hunter encontró nombre del contacto, usarlo
          contacto: topEmail.firstName
            ? `${topEmail.firstName} ${topEmail.lastName ?? ""}`.trim()
            : prospect.contacto,
          metadata: {
            ...(prospect.metadata as object),
            hunterEmails: hunterResult.emails,
            hunterOrganization: hunterResult.organization,
          },
        };
      })
    );

    const emailsEncontrados = enriched.filter((p) => !!p.email).length;

    return NextResponse.json({
      prospectos: enriched,
      total: enriched.length,
      fuentes: [
        {
          nombre: "Google Places",
          cantidad: places.length,
          disponible: !!process.env.GOOGLE_PLACES_API_KEY,
        },
        {
          nombre: "Hunter.io",
          cantidad: emailsEncontrados,
          disponible: !!process.env.HUNTER_API_KEY,
        },
      ],
    });
  } catch (error) {
    console.error("Error en /api/prospect:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
