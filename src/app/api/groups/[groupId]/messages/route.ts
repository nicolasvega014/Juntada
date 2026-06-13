import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { groupId } = await params;
    const { text } = await req.json();

    if (!text?.trim()) return NextResponse.json({ error: "Mensaje vac�o" }, { status: 400 });

    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        userId,
        groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            alias: true,
          },
        },
      },
    });

    return NextResponse.json(message);
  } catch (e) {
    console.error("Error mensaje:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
