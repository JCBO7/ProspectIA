import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { personalizarMensaje } from "@/lib/utils/personalizar";
import type { ProspectoData } from "@/types";

interface EnvioMasivoBody {
  canal: string;
  mensaje: string;
  asunto?: string;
  prospectos: ProspectoData[];
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body: EnvioMasivoBody = await req.json();
    const { canal, mensaje, asunto, prospectos } = body;

    if (!canal || !mensaje || !prospectos?.length) {
      return NextResponse.json({ error: "canal, mensaje y prospectos son requeridos" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({ where: { userId: session.user.id } });
    if (!workspace) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });

    const resultados: Array<{ empresa: string; ok: boolean; error?: string }> = [];

    // ── EMAIL masivo via Resend ───────────────────────────────────────────
    if (canal === "EMAIL") {
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      for (const p of prospectos) {
        if (!p.email) {
          resultados.push({ empresa: p.empresa, ok: false, error: "Sin email" });
          continue;
        }

        const mensajePersonalizado = personalizarMensaje(mensaje, p);

        try {
          const htmlMensaje = mensajePersonalizado.replace(/\n/g, "<br>");
          const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "JC ProspectAI <noreply@resend.dev>",
            to: p.email,
            subject: (asunto ?? "Propuesta para [EMPRESA]")
              .replace(/\[EMPRESA\]/gi, p.empresa),
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${htmlMensaje}</div>`,
          });

          if (error) throw new Error(error.message);

          await prisma.mensaje.create({
            data: {
              workspaceId: workspace.id,
              prospectoId: p.id ?? null,
              canal,
              contenido: mensajePersonalizado,
              asunto: asunto ?? null,
              generadoPor: "IA",
              enviado: true,
            },
          });

          resultados.push({ empresa: p.empresa, ok: true });
        } catch (e) {
          resultados.push({ empresa: p.empresa, ok: false, error: e instanceof Error ? e.message : "Error" });
        }

        // Pequeña pausa para no saturar la API
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // ── WHATSAPP masivo via Twilio ────────────────────────────────────────
    if (canal === "WHATSAPP") {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return NextResponse.json({ error: "Twilio no configurado" }, { status: 503 });
      }

      const twilio = (await import("twilio")).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      for (const p of prospectos) {
        if (!p.telefono) {
          resultados.push({ empresa: p.empresa, ok: false, error: "Sin teléfono" });
          continue;
        }

        const mensajePersonalizado = personalizarMensaje(mensaje, p);

        try {
          const phone = p.telefono.replace(/\D/g, "");
          const to = `whatsapp:+52${phone.startsWith("52") ? phone.slice(2) : phone}`;

          await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER ?? "+14155238886"}`,
            to,
            body: mensajePersonalizado,
          });

          resultados.push({ empresa: p.empresa, ok: true });
        } catch (e) {
          resultados.push({ empresa: p.empresa, ok: false, error: e instanceof Error ? e.message : "Error" });
        }

        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const enviados = resultados.filter((r) => r.ok).length;
    const errores = resultados.filter((r) => !r.ok).length;

    return NextResponse.json({ enviados, errores, total: prospectos.length, resultados });
  } catch (error) {
    console.error("Error envío masivo:", error);
    return NextResponse.json({ error: "Error en envío masivo" }, { status: 500 });
  }
}
