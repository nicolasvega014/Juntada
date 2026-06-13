import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPasswordStrength } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, password, avatar, alias } = await req.json();
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanAlias = typeof alias === "string" ? alias.trim() : "";

  if (!name || !cleanEmail || !password || !avatar || !cleanAlias) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  if (cleanAlias.length < 2) {
    return NextResponse.json({ error: "Alias mínimo 2 caracteres" }, { status: 400 });
  }

  if (!getPasswordStrength(password).ok) {
    return NextResponse.json({ error: "La contraseña tiene que ser segura" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe ese usuario" }, { status: 400 });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingEmail) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: cleanEmail, password: hashed, avatar, alias: cleanAlias },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, alias: user.alias });
}
