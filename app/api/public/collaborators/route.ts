import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota pública para listar colaboradores ativos (sem autenticação)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const collaborators = await prisma.collaborator.findMany({
    where: { active: true, ...(role ? { role } : {}) },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(collaborators);
}
