import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userPublicSelect = {
  id: true,
  name: true,
  avatar: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: {
      members: { include: { user: { select: userPublicSelect } } },
      expenses: { include: { paidBy: { select: userPublicSelect } } },
    },
  });

  if (!group) return NextResponse.json({ error: "Invitaci�n inv�lida" }, { status: 404 });
  return NextResponse.json(group);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { code } = await params;
  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) return NextResponse.json({ error: "Invitaci�n inv�lida" }, { status: 404 });

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });

  if (!existing) {
    await prisma.groupMember.create({
      data: { userId, groupId: group.id },
    });
  }

  return NextResponse.json({ groupId: group.id });
}
