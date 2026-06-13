import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userPublicSelect = {
  id: true,
  name: true,
  avatar: true,
  alias: true,
} as const;

async function ensureGroupMember(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { groupId, expenseId } = await params;
  const member = await ensureGroupMember(groupId, userId);
  if (!member) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { desc, amount, paidById, date } = await req.json();
  const cleanDesc = typeof desc === "string" ? desc.trim() : "";
  const parsedAmount = parseFloat(amount);

  if (!cleanDesc || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !paidById || !date) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const payer = await ensureGroupMember(groupId, paidById);
  if (!payer) return NextResponse.json({ error: "La persona no pertenece al grupo" }, { status: 400 });

  const existing = await prisma.expense.findFirst({ where: { id: expenseId, groupId } });
  if (!existing) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { desc: cleanDesc, amount: parsedAmount, paidById, date },
    include: { paidBy: { select: userPublicSelect } },
  });

  return NextResponse.json(expense);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { groupId, expenseId } = await params;
  const member = await ensureGroupMember(groupId, userId);
  if (!member) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existing = await prisma.expense.findFirst({ where: { id: expenseId, groupId } });
  if (!existing) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  await prisma.expense.delete({ where: { id: expenseId } });

  return NextResponse.json({ ok: true });
}
