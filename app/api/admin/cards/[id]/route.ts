import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity, STATUS_LABELS, BOARD_STATUSES, PRIORITIES, PRIORITY_LABELS, type BoardStatus, type Priority } from "@/lib/boards";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(BOARD_STATUSES).optional(),
  priority: z.enum(PRIORITIES).nullable().optional(),
  order: z.number().optional(),
  assigneeId: z.string().nullable().optional(),
  coAssigneeId: z.string().nullable().optional(),
  tagId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await prisma.boardCard.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      boardId: true,
      code: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      createdAt: true,
      createdByName: true,
      parentId: true,
      assignee: { select: { id: true, name: true } },
      coAssignee: { select: { id: true, name: true } },
      tag: { select: { id: true, name: true, color: true } },
      parent: { select: { id: true, code: true, title: true } },
      checklist: { orderBy: { order: "asc" }, select: { id: true, text: true, done: true } },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, filename: true, mimeType: true, size: true, dataUrl: true, createdAt: true },
      },
      subtasks: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, code: true, title: true, status: true, assignee: { select: { name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, authorName: true, body: true, createdAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        select: { id: true, actorName: true, type: true, detail: true, createdAt: true },
      },
      relationsFrom: {
        select: { id: true, type: true, to: { select: { id: true, code: true, title: true, status: true } } },
      },
      relationsTo: {
        select: { id: true, type: true, from: { select: { id: true, code: true, title: true, status: true } } },
      },
    },
  });

  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const relations = [
    ...card.relationsFrom.map((r) => ({ id: r.id, type: r.type, card: r.to })),
    ...card.relationsTo.map((r) => ({ id: r.id, type: `${r.type} (inverso)`, card: r.from })),
  ];

  return NextResponse.json({ ...card, relationsFrom: undefined, relationsTo: undefined, relations });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = updateSchema.parse(await req.json());

    const before = await prisma.boardCard.findUnique({
      where: { id },
      select: { status: true, priority: true, assigneeId: true, dueDate: true, title: true, tagId: true },
    });
    if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const card = await prisma.boardCard.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        order: data.order,
        assigneeId: data.assigneeId,
        coAssigneeId: data.coAssigneeId,
        tagId: data.tagId,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
      select: { id: true, status: true },
    });

    // Timeline — só registra mudanças significativas
    if (data.status && data.status !== before.status) {
      await logActivity(id, actor.name, "status", `moveu para "${STATUS_LABELS[data.status as BoardStatus]}"`);
    }
    if (data.assigneeId !== undefined && data.assigneeId !== before.assigneeId) {
      if (data.assigneeId) {
        const c = await prisma.collaborator.findUnique({ where: { id: data.assigneeId }, select: { name: true } });
        await logActivity(id, actor.name, "assignee", `atribuiu para ${c?.name ?? "—"}`);
      } else {
        await logActivity(id, actor.name, "assignee", "removeu o responsável");
      }
    }
    if (data.dueDate !== undefined && (data.dueDate ? new Date(data.dueDate).getTime() : null) !== (before.dueDate?.getTime() ?? null)) {
      await logActivity(id, actor.name, "due", data.dueDate ? `definiu vencimento` : "removeu o vencimento");
    }
    if (data.title && data.title !== before.title) {
      await logActivity(id, actor.name, "title", "renomeou o card");
    }
    if (data.priority !== undefined && data.priority !== before.priority) {
      await logActivity(id, actor.name, "priority", data.priority ? `definiu prioridade ${PRIORITY_LABELS[data.priority as Priority]}` : "removeu a prioridade");
    }

    return NextResponse.json(card);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.boardCard.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
