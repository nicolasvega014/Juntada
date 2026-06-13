import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { groupId } = await params;
  const { desc, amount, paidById, date } = await req.json();

  const expense = await prisma.expense.create({
    data: {
      desc,
      amount: parseFloat(amount),
      paidById,
      date,
      groupId,
    },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          avatar: true,
          alias: true,
        },
      },
    },
  });

  return NextResponse.json(expense);
}
