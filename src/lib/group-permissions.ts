import { prisma } from "@/lib/prisma";

export async function isGroupAdmin(groupId: string, userId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    select: { userId: true, role: true },
  });

  const member = members.find((m) => m.userId === userId);
  if (!member) return false;
  if (member.role === "admin") return true;

  const hasAdmin = members.some((m) => m.role === "admin");
  return !hasAdmin && members[0]?.userId === userId;
}
