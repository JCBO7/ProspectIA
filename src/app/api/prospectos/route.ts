import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
    });
    if (!workspace) {
      return NextResponse.json({ prospectos: [], total: 0 });
    }

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { empresa: { contains: search, mode: "insensitive" } },
        { giro: { contains: search, mode: "insensitive" } },
        { zona: { contains: search, mode: "insensitive" } },
        { contacto: { contains: search, mode: "insensitive" } },
      ];
    }

    const [prospectos, total] = await Promise.all([
      prisma.prospecto.findMany({
        where,
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.prospecto.count({ where }),
    ]);

    return NextResponse.json({ prospectos, total, page, limit });
  } catch (error) {
    console.error("Error listando prospectos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { prospectos: prospectosData, guardar = false } = body;

    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }

    if (!guardar) {
      return NextResponse.json({ message: "OK" });
    }

    // Guardar prospectos en lote
    const created = await prisma.$transaction(
      (prospectosData || []).map((p: Record<string, unknown>) =>
        prisma.prospecto.create({
          data: {
            workspaceId: workspace.id,
            empresa: p.empresa as string,
            giro: p.giro as string | undefined,
            giroSCIAN: p.giroSCIAN as string | undefined,
            zona: p.zona as string | undefined,
            alcaldia: p.alcaldia as string | undefined,
            ciudad: (p.ciudad as string) || "Ciudad de México",
            tamano: p.tamano as "MICRO" | "PEQUENA" | "MEDIANA" | "GRANDE" | undefined,
            telefono: p.telefono as string | undefined,
            email: p.email as string | undefined,
            website: p.website as string | undefined,
            direccion: p.direccion as string | undefined,
            score: (p.score as number) || 0,
            fuente: (p.fuente as "DENUE" | "GOOGLE_MAPS" | "MANUAL") || "DENUE",
            metadata: p.metadata as object | undefined,
          },
        })
      )
    );

    return NextResponse.json({ guardados: created.length, prospectos: created });
  } catch (error) {
    console.error("Error guardando prospectos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
    });

    await prisma.prospecto.deleteMany({
      where: { id, workspaceId: workspace?.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando prospecto:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
