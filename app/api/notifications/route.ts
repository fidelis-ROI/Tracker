import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Campos obrigatórios do perfil — enquanto algum estiver vazio, a pessoa recebe
// a notificação fixa de "complete seu perfil".
const REQUIRED_PROFILE_FIELDS = [
  "fullName", "birthDate", "cpf", "cnpj",
  "bankHolder", "bankInstitution", "bankAgency", "bankAccount", "pixKey",
] as const;

// Lista as notificações da pessoa logada (destinatário = seu Collaborator).
export async function GET() {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  if (!collaboratorId) {
    // Sem colaborador vinculado (ex.: admin de seed) — sem notificações.
    return NextResponse.json({ notifications: [], unreadCount: 0, profileIncomplete: false });
  }

  const profile = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
    select: { fullName: true, birthDate: true, cpf: true, cnpj: true, bankHolder: true, bankInstitution: true, bankAgency: true, bankAccount: true, pixKey: true },
  });
  const profileIncomplete = !profile || REQUIRED_PROFILE_FIELDS.some((f) => {
    const v = (profile as Record<string, unknown>)[f];
    return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
  });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: collaboratorId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        actorName: true,
        cardId: true,
        boardId: true,
        cardCode: true,
        cardTitle: true,
        context: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { recipientId: collaboratorId, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount, profileIncomplete });
}

const patchSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

// Marca uma notificação (id) ou todas (all: true) como lidas.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  if (!collaboratorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id, all } = patchSchema.parse(await req.json());
    if (all) {
      await prisma.notification.updateMany({
        where: { recipientId: collaboratorId, read: false },
        data: { read: true },
      });
    } else if (id) {
      // updateMany com o filtro do dono evita marcar notificação de outra pessoa.
      await prisma.notification.updateMany({
        where: { id, recipientId: collaboratorId },
        data: { read: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
