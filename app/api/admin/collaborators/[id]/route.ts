import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["gestor_trafego", "designer"]).optional(),
  active: z.boolean().optional(),
  salary: z.number().nullable().optional(),
  variable: z.number().nullable().optional(),
  hireDate: z.string().nullable().optional(),
  // Gerenciar login
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(6).optional(),
  clientIds: z.array(z.string()).optional(), // Carteira de clientes
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "admin";
  const isOwnProfile = session.user.collaboratorId === id;

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const collab = await prisma.collaborator.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      hireDate: true,
      ...(isAdmin ? { salary: true, variable: true } : {}),
      adminUser: { select: { email: true, role: true } },
      clientPortfolio: {
        select: {
          client: { select: { id: true, name: true, slug: true, active: true } },
        },
      },
    },
  });

  if (!collab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(collab);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { loginEmail, loginPassword, clientIds, hireDate, ...rest } = updateSchema.parse(body);

    const collab = await prisma.collaborator.update({
      where: { id },
      data: {
        ...rest,
        hireDate: hireDate ? new Date(hireDate) : hireDate === null ? null : undefined,
      },
    });

    // Atualizar login se fornecido
    if (loginEmail || loginPassword) {
      const existingUser = await prisma.adminUser.findUnique({ where: { collaboratorId: id } });
      if (existingUser) {
        const updateData: Record<string, unknown> = {};
        if (loginEmail) updateData.email = loginEmail;
        if (loginPassword) updateData.password = await bcrypt.hash(loginPassword, 12);
        await prisma.adminUser.update({ where: { collaboratorId: id }, data: updateData });
      } else if (loginEmail && loginPassword) {
        const hash = await bcrypt.hash(loginPassword, 12);
        await prisma.adminUser.create({
          data: { email: loginEmail, password: hash, role: "operator", collaboratorId: id },
        });
      }
    }

    // Atualizar carteira de clientes
    if (clientIds !== undefined) {
      await prisma.clientOperator.deleteMany({ where: { collaboratorId: id } });
      if (clientIds.length > 0) {
        await prisma.clientOperator.createMany({
          data: clientIds.map((clientId) => ({ clientId, collaboratorId: id })),
        });
      }
    }

    return NextResponse.json(collab);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
