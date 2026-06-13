import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; paymentId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { groupId, paymentId } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const payment = await prisma.settlementPayment.findFirst({
    where: { id: paymentId, groupId },
  });
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  await prisma.settlementPayment.delete({ where: { id: paymentId } });

  return NextResponse.json({ ok: true });
}
