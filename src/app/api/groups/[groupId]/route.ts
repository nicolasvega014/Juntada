import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { groupId } = await params;

    await prisma.message.deleteMany({ where: { groupId } });
    await prisma.expense.deleteMany({ where: { groupId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error eliminando grupo:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}