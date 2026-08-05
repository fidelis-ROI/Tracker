import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Operador/líder edita as informações de um cliente da SUA carteira
// (Drive, logos, informações úteis, observações). Admin também passa aqui.
const putSchema = z.object({
  clientId: z.string(),
  driveUrl: z.string().nullable().optional(),
  usefulInfo: z.string().nullable().optional(),
  logoUrl1: z.string().nullable().optional(),
  logoUrl2: z.string().nullable().optional(),
  logoUrl3: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const clean = (v: string | null | undefined) =>
  v !== undefined ? (v?.trim() || null) : undefined;

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  const isAdmin = session?.user.role === "admin";
  if (!session || (!collaboratorId && !isAdmin)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = putSchema.parse(await req.json());

    // Operador só edita clientes que estão na carteira dele. Admin edita qualquer um.
    if (!isAdmin) {
      const assigned = await prisma.clientOperator.findFirst({
        where: { clientId: data.clientId, collaboratorId: collaboratorId! },
        select: { id: true },
      });
      if (!assigned) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const updated = await prisma.client.update({
      where: { id: data.clientId },
      data: {
        driveUrl: clean(data.driveUrl),
        usefulInfo: clean(data.usefulInfo),
        logoUrl1: clean(data.logoUrl1),
        logoUrl2: clean(data.logoUrl2),
        logoUrl3: clean(data.logoUrl3),
        notes: clean(data.notes),
      },
      select: { driveUrl: true, usefulInfo: true, logoUrl1: true, logoUrl2: true, logoUrl3: true, notes: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
