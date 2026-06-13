import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { groupId } = await params;
    const { status } = await req.json();
    if (status !== "active" && status !== "finalized") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { status, endedAt: status === "finalized" ? new Date() : null },
    });

    return NextResponse.json(group);
  } catch (e) {
    console.error("Error actualizando grupo:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { groupId } = await params;

    await prisma.message.deleteMany({ where: { groupId } });
    await prisma.settlementPayment.deleteMany({ where: { groupId } });
    await prisma.expense.deleteMany({ where: { groupId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error eliminando grupo:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
