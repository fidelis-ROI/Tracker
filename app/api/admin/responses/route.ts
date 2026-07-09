import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = {};
  if (month) where.month = month;
  if (clientId) where.clientId = clientId;

  const responses = await prisma.npsResponse.findMany({
    where,
    include: {
      client: true,
      trafego: true,
      designer: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(responses);
}
