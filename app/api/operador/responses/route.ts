import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.collaboratorId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const clientId = searchParams.get("clientId");
  const collaboratorId = session.user.collaboratorId;

  const responses = await prisma.npsResponse.findMany({
    where: {
      trafegoCollab: collaboratorId,
      ...(month ? { month } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(responses);
}
