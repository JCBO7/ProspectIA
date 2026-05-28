import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generarPromptImagen } from "@/lib/claude/client";

// Usa Pollinations.ai — generación gratuita, sin API key requerida
function buildPollinationsUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { descripcionNegocio, prospecto, canal, estilo } = body;

    if (!descripcionNegocio || !prospecto) {
      return NextResponse.json({ error: "descripcionNegocio y prospecto son requeridos" }, { status: 400 });
    }

    // Claude genera el prompt en inglés optimizado para generadores de imagen
    const { promptEN, descripcionES } = await generarPromptImagen({
      descripcionNegocio,
      prospecto,
      canal,
      estilo,
    });

    // Construir URL de Pollinations con el prompt
    const imagenUrl = buildPollinationsUrl(promptEN);

    return NextResponse.json({
      imagenUrl,
      promptEN,
      descripcionES,
    });
  } catch (error) {
    console.error("Error generando imagen:", error);
    return NextResponse.json({ error: "Error generando imagen" }, { status: 500 });
  }
}
