import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
    });
    if (!workspace) return NextResponse.json({ campanas: [] });

    const campanas = await prisma.campana.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { prospectos: true } },
      },
    });

    return NextResponse.json({ campanas });
  } catch (error) {
    console.error("Error listando campañas:", error);
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
    const { nombre, descripcion, canal, mensaje, asunto, prospectoIds, scheduledAt } = body;

    if (!nombre || !canal || !mensaje) {
      return NextResponse.json({ error: "nombre, canal y mensaje son requeridos" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { userId: session.user.id },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }

    const campana = await prisma.campana.create({
      data: {
        workspaceId: workspace.id,
        nombre,
        descripcion,
        canal,
        mensaje,
        asunto,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        prospectos: prospectoIds?.length
          ? {
              create: prospectoIds.map((id: string) => ({
                prospectoId: id,
                status: "PENDIENTE",
              })),
            }
          : undefined,
      },
      include: { _count: { select: { prospectos: true } } },
    });

    return NextResponse.json({ campana }, { status: 201 });
  } catch (error) {
    console.error("Error creando campaña:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
