import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  trafegoScore: z.number().int().min(0).max(10),
  designerScore: z.number().int().min(0).max(10).optional(),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verifica se já respondeu neste mês
    const existing = await prisma.npsResponse.findFirst({
      where: { clientId: data.clientId, month: data.month },
    });

    if (existing) {
      return NextResponse.json(
        { error: "already_submitted" },
        { status: 409 }
      );
    }

    // O cliente não escolhe quem avaliou — isso é definido pelo admin
    // através da atribuição de operadores/designer ao cliente.
    const assigned = await prisma.clientOperator.findMany({
      where: { clientId: data.clientId },
      include: { collaborator: { select: { id: true, role: true } } },
    });
    const trafegoCollab = assigned.find(a => a.collaborator.role === "gestor_trafego")?.collaborator.id;
    const designerCollab = assigned.find(a => a.collaborator.role === "designer")?.collaborator.id;

    const response = await prisma.npsResponse.create({
      data: { ...data, trafegoCollab, designerCollab },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
