import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
      fullName: true,
      birthDate: true,
      cpf: true,
      cnpj: true,
      avatarUrl: true,
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

// A própria pessoa preenche seus dados pessoais. O avatar vai como data URL.
const MAX_AVATAR = 900_000;
const putSchema = z.object({
  fullName: z.string().max(200).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  cnpj: z.string().max(24).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  if (!collaboratorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = putSchema.parse(await req.json());
    if (data.avatarUrl && data.avatarUrl.length > MAX_AVATAR * 1.4) {
      return NextResponse.json({ error: "avatar_too_large" }, { status: 413 });
    }

    const updated = await prisma.collaborator.update({
      where: { id: collaboratorId },
      data: {
        fullName: data.fullName !== undefined ? (data.fullName?.trim() || null) : undefined,
        birthDate: data.birthDate !== undefined ? (data.birthDate ? new Date(data.birthDate) : null) : undefined,
        cpf: data.cpf !== undefined ? (data.cpf?.trim() || null) : undefined,
        cnpj: data.cnpj !== undefined ? (data.cnpj?.trim() || null) : undefined,
        avatarUrl: data.avatarUrl !== undefined ? (data.avatarUrl || null) : undefined,
      },
      select: { fullName: true, birthDate: true, cpf: true, cnpj: true, avatarUrl: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
