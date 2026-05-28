import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// GET — listar plantillas del workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const workspace = await prisma.workspace.findFirst({ where: { userId: session.user.id } });
    if (!workspace) return NextResponse.json({ plantillas: [] });

    const plantillas = await prisma.plantilla.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ usosCount: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ plantillas });
  } catch (error) {
    console.error("Error obteniendo plantillas:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — crear plantilla
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, canal, contenido, asunto, descripcion } = await req.json();
    if (!nombre?.trim() || !canal || !contenido?.trim()) {
      return NextResponse.json({ error: "nombre, canal y contenido son requeridos" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({ where: { userId: session.user.id } });
    if (!workspace) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });

    const plantilla = await prisma.plantilla.create({
      data: { workspaceId: workspace.id, nombre, canal, contenido, asunto: asunto || null, descripcion: descripcion || null },
    });

    return NextResponse.json({ plantilla });
  } catch (error) {
    console.error("Error creando plantilla:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
