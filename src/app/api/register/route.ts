import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, password, avatar, alias } = await req.json();
  const cleanAlias = typeof alias === "string" ? alias.trim() : "";

  if (!name || !password || !avatar || !cleanAlias) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (cleanAlias.length < 2) {
    return NextResponse.json({ error: "Alias mínimo 2 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe ese usuario" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, password: hashed, avatar, alias: cleanAlias },
  });

  return NextResponse.json({ id: user.id, name: user.name, avatar: user.avatar, alias: user.alias });
}
