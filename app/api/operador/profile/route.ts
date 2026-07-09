import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.collaboratorId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const collaborator = await prisma.collaborator.findUnique({
    where: { id: session.user.collaboratorId },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      hireDate: true,
      adminUser: { select: { email: true } },
      clientPortfolio: {
        select: {
          client: { select: { id: true, name: true, slug: true, active: true } },
        },
      },
    },
  });

  if (!collaborator) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(collaborator);
}
