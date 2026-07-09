import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.collaboratorId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const collaboratorId = session.user.collaboratorId;

  const portfolio = await prisma.clientOperator.findMany({
    where: { collaboratorId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          hasDesigner: true,
          responses: {
            orderBy: { submittedAt: "desc" },
            take: 12,
            select: {
              id: true,
              month: true,
              trafegoScore: true,
              designerScore: true,
              feedback: true,
              submittedAt: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json(portfolio.map((p) => p.client));
}
