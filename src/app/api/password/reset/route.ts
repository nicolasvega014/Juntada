import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPasswordStrength } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (!getPasswordStrength(password).ok) {
    return NextResponse.json({ error: "La contraseña tiene que ser segura" }, { status: 400 });
  }

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "El link ya venció o no es válido" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { password: await bcrypt.hash(password, 10) },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
