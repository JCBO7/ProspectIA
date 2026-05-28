import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { generarMensaje } from "@/lib/claude/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { descripcionNegocio, prospecto, canal, tono, propuestaValor, guardar = false } = body;

    if (!descripcionNegocio || !prospecto || !canal) {
      return NextResponse.json(
        { error: "descripcionNegocio, prospecto y canal son requeridos" },
        { status: 400 }
      );
    }

    const canalesValidos = ["WHATSAPP", "EMAIL", "SMS", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "LLAMADA"];
    if (!canalesValidos.includes(canal)) {
      return NextResponse.json({ error: "Canal no válido" }, { status: 400 });
    }

    const mensaje = await generarMensaje({
      descripcionNegocio,
      prospecto,
      canal,
      tono,
      propuestaValor,
    });

    // Guardar en historial si se solicita
    if (guardar) {
      const workspace = await prisma.workspace.findFirst({
        where: { userId: session.user.id },
      });
      if (workspace) {
        await prisma.mensaje.create({
          data: {
            workspaceId: workspace.id,
            prospectoId: prospecto.id || null,
            canal,
            contenido: mensaje.contenido,
            asunto: mensaje.asunto || null,
            generadoPor: "IA",
          },
        });
      }
    }

    return NextResponse.json({
      canal,
      contenido: mensaje.contenido,
      asunto: mensaje.asunto,
      ideaImagen: mensaje.ideaImagen,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error generando mensaje:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
