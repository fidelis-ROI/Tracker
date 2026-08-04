import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["gestor_trafego", "lider", "designer"]),
  active: z.boolean().default(true),
  salary: z.number().nullable().optional(),
  variable: z.number().nullable().optional(),
  hireDate: z.string().nullable().optional(),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(6).optional(),
  loginGoogle: z.boolean().optional(), // login via Google (sem senha)
  loginRole: z.enum(["operator", "admin"]).optional(),
  clientIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const collaborators = await prisma.collaborator.findMany({
    where: { deletedAt: null, ...(role ? { role } : {}) },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      hireDate: true,
      avatarUrl: true,
      ...(isAdmin ? { salary: true, variable: true, fullName: true, birthDate: true, cpf: true, cnpj: true, bankHolder: true, bankInstitution: true, bankAgency: true, bankAccount: true, pixKey: true } : {}),
      adminUser: { select: { email: true, role: true, lastLoginAt: true } },
      clientPortfolio: {
        select: { client: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  return NextResponse.json(collaborators);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const collab = await prisma.collaborator.create({
      data: {
        name: data.name,
        role: data.role,
        active: data.active,
        salary: data.salary,
        variable: data.variable,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      },
    });

    // Cria acesso ao portal: por senha, ou via Google (sem senha — password null).
    if (data.createLogin && data.loginEmail && (data.loginPassword || data.loginGoogle)) {
      const hash = data.loginPassword ? await bcrypt.hash(data.loginPassword, 12) : null;
      await prisma.adminUser.create({
        data: { email: data.loginEmail.toLowerCase().trim(), password: hash, role: data.loginRole ?? "operator", collaboratorId: collab.id },
      });
    }

    if (data.clientIds && data.clientIds.length > 0) {
      await prisma.clientOperator.createMany({
        data: data.clientIds.map(clientId => ({ clientId, collaboratorId: collab.id })),
      });
    }

    return NextResponse.json(collab, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
