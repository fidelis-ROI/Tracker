import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  hasDesigner: z.boolean().optional(),
  active: z.boolean().optional(),
  brand: z.enum(["roi", "nitroads"]).optional(),
  ticket: z.number().nullable().optional(),
  contractDate: z.string().nullable().optional(),
  services: z.array(z.string()).nullable().optional(),
  operatorIds: z.array(z.string()).optional(), // IDs dos operadores atribuídos
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { operatorIds, services, contractDate, ...rest } = updateSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...rest,
        contractDate: contractDate ? new Date(contractDate) : contractDate === null ? null : undefined,
        services: services !== undefined ? (services ? JSON.stringify(services) : null) : undefined,
      },
    });

    // Atualiza atribuição de operadores se fornecida
    if (operatorIds !== undefined) {
      await prisma.clientOperator.deleteMany({ where: { clientId: id } });
      if (operatorIds.length > 0) {
        await prisma.clientOperator.createMany({
          data: operatorIds.map((collaboratorId) => ({ clientId: id, collaboratorId })),
        });
      }
    }

    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // Soft delete: preserva o histórico de avaliações e dados financeiros,
  // apenas remove o cliente das listagens e desvincula os operadores.
  await prisma.$transaction([
    prisma.clientOperator.deleteMany({ where: { clientId: id } }),
    prisma.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } }),
  ]);
  return NextResponse.json({ success: true });
}
