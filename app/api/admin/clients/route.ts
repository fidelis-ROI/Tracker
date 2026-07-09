import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  hasDesigner: z.boolean().default(true),
  active: z.boolean().default(true),
  ticket: z.number().optional(),
  contractDate: z.string().optional(),
  services: z.array(z.string()).optional(),
  operatorIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      hasDesigner: true,
      createdAt: true,
      ...(isAdmin ? { ticket: true, contractDate: true, services: true } : {}),
      operators: {
        select: {
          collaborator: { select: { id: true, name: true } },
        },
      },
    },
  });

  const result = clients.map(c => ({
    ...c,
    operators: c.operators.map(o => o.collaborator),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { operatorIds, ...rest } = createSchema.parse(body);

    const existing = await prisma.client.findUnique({ where: { slug: rest.slug } });
    if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

    const client = await prisma.client.create({
      data: {
        name: rest.name,
        slug: rest.slug,
        hasDesigner: rest.hasDesigner,
        active: rest.active,
        ticket: rest.ticket,
        contractDate: rest.contractDate ? new Date(rest.contractDate) : undefined,
        services: rest.services ? JSON.stringify(rest.services) : undefined,
      },
    });

    if (operatorIds && operatorIds.length > 0) {
      await prisma.clientOperator.createMany({
        data: operatorIds.map(collaboratorId => ({ clientId: client.id, collaboratorId })),
      });
    }

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
