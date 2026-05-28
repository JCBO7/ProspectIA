import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { buscarProspectos } from "@/lib/search-engine";
import { ALCALDIAS_CDMX } from "@/lib/denue/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      descripcionNegocio,
      estadoCodigo = "09",
      alcaldia,
      tamano,
      limite = 20,
      pagina = 1,
    } = body;

    if (!descripcionNegocio?.trim()) {
      return NextResponse.json({ error: "descripcionNegocio es requerido" }, { status: 400 });
    }

    // Verificar límites del plan FREE
    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
      include: { _count: { select: { prospectos: true } } },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }
    if (session.user.plan === "FREE" && workspace._count.prospectos >= 50) {
      return NextResponse.json(
        { error: "Límite del plan gratuito alcanzado (50 prospectos). Actualiza a Pro." },
        { status: 403 }
      );
    }

    // Resolver código de alcaldía si es CDMX
    const alcaldiaCode =
      estadoCodigo === "09" && alcaldia
        ? ALCALDIAS_CDMX[alcaldia]
        : undefined;

    const resultado = await buscarProspectos({
      descripcionNegocio,
      estadoCodigo,
      alcaldia,
      alcaldiaCode,
      tamano,
      limite,
      pagina,
    });

    return NextResponse.json({
      prospectos: resultado.prospectos,
      total: resultado.total,
      pagina,
      fuentes: resultado.fuentes,
      girosInterpretados: resultado.girosInterpretados,
      osmTags: resultado.osmTags,
    });
  } catch (error) {
    console.error("Error en búsqueda:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
