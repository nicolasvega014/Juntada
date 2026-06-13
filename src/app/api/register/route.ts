import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, password, avatar } = await req.json();

  if (!name || !password || !avatar) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe ese usuario" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, password: hashed, avatar },
  });

  return NextResponse.json({ id: user.id, name: user.name, avatar: user.avatar });
}