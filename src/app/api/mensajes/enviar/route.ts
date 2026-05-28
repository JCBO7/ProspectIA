import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function limpiarTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  // Asegurar que empiece con 52 (México)
  if (digits.startsWith("521") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("52") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+52${digits.slice(-10)}`;
}

async function enviarEmailSMTP(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; detalle: string }> {
  const nodemailer = await import("nodemailer");

  // Funciona con Brevo (smtp-relay.brevo.com:587) o cualquier SMTP
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER ?? process.env.GMAIL_USER,
      pass: process.env.SMTP_PASSWORD ?? process.env.GMAIL_APP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });

  const from = process.env.SMTP_FROM ?? process.env.GMAIL_USER ?? "prospectai@gmail.com";

  await transporter.sendMail({
    from: `ProspectAI <${from}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { ok: true, detalle: `Enviado desde ${from} a ${params.to}` };
}

async function enviarEmailResend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; detalle: string }> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "ProspectAI <noreply@resend.dev>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) throw new Error(error.message);
  return { ok: true, detalle: `Enviado via Resend a ${params.to}` };
}

async function enviarSMSTextBelt(params: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; detalle: string }> {
  const key = process.env.TEXTBELT_KEY ?? "textbelt"; // "textbelt" = 1 gratis/día por IP
  const body = new URLSearchParams({
    phone: params.to,
    message: params.message.slice(0, 160),
    key,
  });

  const res = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as { success: boolean; error?: string; quotaRemaining?: number };
  if (!data.success) throw new Error(data.error ?? "TextBelt error");

  return {
    ok: true,
    detalle: `SMS enviado a ${params.to} · Cuota restante: ${data.quotaRemaining ?? "?"}`,
  };
}

async function enviarSMSTwilio(params: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; detalle: string }> {
  const twilio = (await import("twilio")).default;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: process.env.TWILIO_SMS_NUMBER!,
    to: params.to,
    body: params.message.slice(0, 160),
  });

  return { ok: true, detalle: `SMS Twilio enviado a ${params.to}` };
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { canal, mensaje, asunto, prospecto } = body as {
      canal: string;
      mensaje: string;
      asunto?: string;
      prospecto?: { id?: string; empresa: string; email?: string; telefono?: string };
    };

    if (!canal || !mensaje) {
      return NextResponse.json({ error: "canal y mensaje son requeridos" }, { status: 400 });
    }

    let resultado: { ok: boolean; metodo: string; detalle?: string } = {
      ok: false,
      metodo: "ninguno",
    };

    // ── EMAIL ─────────────────────────────────────────────────────────────
    if (canal === "EMAIL") {
      if (!prospecto?.email) {
        return NextResponse.json({ error: "El prospecto no tiene email registrado" }, { status: 400 });
      }

      const htmlMensaje = mensaje.replace(/\n/g, "<br>");
      const subject = asunto || `Propuesta para ${prospecto.empresa}`;

      // Prioridad: SMTP (Brevo/Gmail) → Resend
      if ((process.env.SMTP_USER || process.env.GMAIL_USER) && (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD)) {
        const r = await enviarEmailSMTP({ to: prospecto.email, subject, html: htmlMensaje });
        resultado = { ...r, metodo: "smtp" };
      } else if (process.env.RESEND_API_KEY) {
        const r = await enviarEmailResend({ to: prospecto.email, subject, html: htmlMensaje });
        resultado = { ...r, metodo: "resend" };
      } else {
        return NextResponse.json(
          { error: "Sin proveedor de email. Configura GMAIL_USER + GMAIL_APP_PASSWORD en .env" },
          { status: 503 }
        );
      }
    }

    // ── WHATSAPP API (Twilio) ─────────────────────────────────────────────
    if (canal === "WHATSAPP") {
      if (!prospecto?.telefono) {
        return NextResponse.json({ error: "El prospecto no tiene teléfono" }, { status: 400 });
      }
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return NextResponse.json({ error: "Twilio no configurado" }, { status: 503 });
      }

      const twilio = (await import("twilio")).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const to = `whatsapp:${limpiarTelefono(prospecto.telefono)}`;
      const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER ?? "+14155238886"}`;

      await client.messages.create({ from, to, body: mensaje });
      resultado = { ok: true, metodo: "twilio-whatsapp", detalle: `Enviado a ${to}` };
    }

    // ── SMS ───────────────────────────────────────────────────────────────
    if (canal === "SMS") {
      if (!prospecto?.telefono) {
        return NextResponse.json({ error: "El prospecto no tiene teléfono" }, { status: 400 });
      }

      const to = limpiarTelefono(prospecto.telefono);

      // Prioridad: Twilio → TextBelt (gratis, 1/día)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_NUMBER) {
        const r = await enviarSMSTwilio({ to, message: mensaje });
        resultado = { ...r, metodo: "twilio-sms" };
      } else {
        const r = await enviarSMSTextBelt({ to, message: mensaje });
        resultado = { ...r, metodo: "textbelt" };
      }
    }

    // ── Registrar en historial ─────────────────────────────────────────────
    if (resultado.ok) {
      const workspace = await prisma.workspace.findFirst({ where: { userId: session.user.id } });
      if (workspace) {
        await prisma.mensaje.create({
          data: {
            workspaceId: workspace.id,
            prospectoId: prospecto?.id ?? null,
            canal: canal as import("@prisma/client").Canal,
            contenido: mensaje,
            asunto: asunto ?? null,
            generadoPor: "IA",
            enviado: true,
          },
        });
      }
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar" },
      { status: 500 }
    );
  }
}
