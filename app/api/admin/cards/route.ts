import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity, nextCardCode, BOARD_STATUSES, PRIORITIES } from "@/lib/boards";
import { notify } from "@/lib/notifications";
import { z } from "zod";

const createSchema = z.object({
  boardId: z.string(),
  title: z.string().min(1),
  status: z.enum(BOARD_STATUSES).optional(),
  priority: z.enum(PRIORITIES).nullable().optional(),
  parentId: z.string().nullable().optional(), // se for subtarefa
  assigneeId: z.string().nullable().optional(),
  tagId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = createSchema.parse(await req.json());

    // Ordenar no fim da coluna
    const last = await prisma.boardCard.findFirst({
      where: { boardId: data.boardId, status: data.status ?? "backlog", parentId: data.parentId ?? null },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const code = await nextCardCode(data.boardId);

    const card = await prisma.boardCard.create({
      data: {
        boardId: data.boardId,
        code,
        title: data.title,
        status: data.status ?? "backlog",
        priority: data.priority ?? null,
        order: (last?.order ?? 0) + 1000,
        parentId: data.parentId ?? null,
        assigneeId: data.assigneeId ?? null,
        tagId: data.tagId ?? null,
        // Data de criação (Início) padrão = hoje; editável depois no painel do card.
        startDate: new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdByName: actor.name,
        createdByEmail: actor.email,
      },
      select: { id: true, boardId: true, code: true, title: true, status: true, parentId: true },
    });

    await logActivity(card.id, actor.name, "created", data.parentId ? "criou a subtarefa" : "criou o card");

    // Notifica quem foi atribuído na criação (exceto a própria pessoa).
    if (data.assigneeId) {
      await notify({
        recipientIds: [data.assigneeId],
        excludeCollaboratorId: actor.session.user.collaboratorId,
        actorName: actor.name,
        type: "assigned",
        card,
      });
    }

    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
