import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// PATCH — incrementar usosCount
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await prisma.plantilla.update({
      where: { id: params.id },
      data: { usosCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// DELETE — eliminar plantilla
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const workspace = await prisma.workspace.findFirst({ where: { userId: session.user.id } });
    if (!workspace) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.plantilla.deleteMany({
      where: { id: params.id, workspaceId: workspace.id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
