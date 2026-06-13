import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { getPasswordStrength } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, alias, avatar, currentPassword, newPassword } = await req.json();
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanAlias = typeof alias === "string" ? alias.trim() : "";
  const cleanAvatar = typeof avatar === "string" ? avatar : "";

  if (cleanName.length < 2) return NextResponse.json({ error: "Nombre mínimo 2 caracteres" }, { status: 400 });
  if (cleanAlias.length < 2) return NextResponse.json({ error: "Alias mínimo 2 caracteres" }, { status: 400 });
  if (!cleanAvatar) return NextResponse.json({ error: "Elegí un avatar" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (cleanName !== user.name) {
    const existing = await prisma.user.findUnique({ where: { name: cleanName } });
    if (existing) return NextResponse.json({ error: "Ya existe ese usuario" }, { status: 400 });
  }

  const data: { name: string; alias: string; avatar: string; password?: string } = {
    name: cleanName,
    alias: cleanAlias,
    avatar: cleanAvatar,
  };

  if (newPassword) {
    const strength = getPasswordStrength(newPassword);
    if (!strength.ok) return NextResponse.json({ error: "La contraseña nueva no es segura" }, { status: 400 });
    if (!currentPassword) return NextResponse.json({ error: "Ingresá tu contraseña actual" }, { status: 400 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "La contraseña actual no coincide" }, { status: 400 });

    data.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, avatar: true, alias: true },
  });

  return NextResponse.json(updated);
}
