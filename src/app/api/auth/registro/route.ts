import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  try {
    const dbUrl = process.env.DATABASE_URL ?? "";
    const firstCharCode = dbUrl.charCodeAt(0);
    if (firstCharCode === 0xFEFF || firstCharCode === 65279) {
      return NextResponse.json({ error: `BOM detectado: primer char=${firstCharCode}, url_start=${dbUrl.substring(0, 15)}` }, { status: 500 });
    }

    const { name, email, password } = await req.json();

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Crear workspace por defecto
    await prisma.workspace.create({
      data: {
        userId: user.id,
        name: `Workspace de ${name || email}`,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
