import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const month = searchParams.get("month");

  if (!clientId || !month) {
    return NextResponse.json({ error: "clientId and month required" }, { status: 400 });
  }

  const existing = await prisma.npsResponse.findFirst({
    where: { clientId, month },
    select: { id: true },
  });

  return NextResponse.json({ submitted: !!existing });
}
