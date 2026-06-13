import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/reset-email";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(req: Request) {
  const { email } = await req.json();
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { tokenHash, expiresAt, userId: user.id },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const resetUrl = `${baseUrl}/#reset=${token}`;
  await sendPasswordResetEmail(cleanEmail, resetUrl);

  return NextResponse.json({ ok: true });
}
