import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userPublicSelect = {
  id: true,
  name: true,
  avatar: true,
  alias: true,
} as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { groupId } = await params;
  const { fromId, toId, amount } = await req.json();
  const parsedAmount = parseFloat(amount);

  if (!fromId || !toId || fromId === toId || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const requester = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!requester) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: [fromId, toId] } },
  });
  if (members.length !== 2) {
    return NextResponse.json({ error: "Las personas no pertenecen al grupo" }, { status: 400 });
  }

  const payment = await prisma.settlementPayment.create({
    data: { fromId, toId, groupId, amount: parsedAmount },
    include: { from: { select: userPublicSelect }, to: { select: userPublicSelect } },
  });

  return NextResponse.json(payment);
}
