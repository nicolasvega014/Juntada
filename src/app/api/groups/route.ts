import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userPublicSelect = {
  id: true,
  name: true,
  avatar: true,
  alias: true,
} as const;

const groupPayload = {
  members: { include: { user: { select: userPublicSelect } }, orderBy: { joinedAt: "asc" } },
  expenses: { include: { paidBy: { select: userPublicSelect } } },
  settlementPayments: { include: { from: { select: userPublicSelect }, to: { select: userPublicSelect } }, orderBy: { createdAt: "desc" } },
} as const;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: groupPayload,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, emoji, eventDate } = await req.json();

  const group = await prisma.group.create({
    data: {
      name,
      emoji,
      eventDate: eventDate ? new Date(eventDate) : null,
      members: { create: { userId, role: "admin" } },
    },
    include: groupPayload,
  });

  return NextResponse.json(group);
}
