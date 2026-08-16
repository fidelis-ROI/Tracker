import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  team: z.string().nullable().optional(),
  color: z.string().optional(),
  prefix: z.string().min(1).max(6).optional(),
});

// Retorna o board com todos os cards de topo (não-subtarefas) para o Kanban.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const board = await prisma.board.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      team: true,
      color: true,
      prefix: true,
      tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
    },
  });
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const cards = await prisma.boardCard.findMany({
    where: { boardId: id, deletedAt: null, parentId: null },
    orderBy: [{ status: "asc" }, { order: "asc" }],
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      priority: true,
      order: true,
      dueDate: true,
      assignee: { select: { id: true, name: true } },
      tag: { select: { id: true, name: true, color: true } },
      client: { select: { id: true, name: true } },
      _count: {
        select: {
          subtasks: { where: { deletedAt: null } },
          comments: true,
          attachments: true,
          checklist: true,
        },
      },
      checklist: { select: { done: true } },
    },
  });

  const shaped = cards.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    status: c.status,
    priority: c.priority,
    order: c.order,
    dueDate: c.dueDate,
    assignee: c.assignee,
    tag: c.tag,
    client: c.client,
    counts: {
      subtasks: c._count.subtasks,
      comments: c._count.comments,
      attachments: c._count.attachments,
      checklistTotal: c._count.checklist,
      checklistDone: c.checklist.filter((i) => i.done).length,
    },
  }));

  return NextResponse.json({ board, cards: shaped });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = updateSchema.parse(await req.json());
    const board = await prisma.board.update({
      where: { id },
      data: {
        ...data,
        prefix: data.prefix ? data.prefix.toUpperCase() : undefined,
      },
    });
    return NextResponse.json(board);
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
  await prisma.board.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
