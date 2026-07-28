import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity, RELATION_TYPES } from "@/lib/boards";
import { z } from "zod";

const createSchema = z.object({
  toId: z.string(),
  type: z.enum(RELATION_TYPES).default("relacionado"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { toId, type } = createSchema.parse(await req.json());
    if (toId === id) return NextResponse.json({ error: "self_relation" }, { status: 400 });

    const relation = await prisma.cardRelation.upsert({
      where: { fromId_toId_type: { fromId: id, toId, type } },
      update: {},
      create: { fromId: id, toId, type },
      select: {
        id: true,
        type: true,
        to: { select: { id: true, code: true, title: true, status: true } },
      },
    });
    await logActivity(id, actor.name, "relation", "vinculou um card");
    return NextResponse.json({ id: relation.id, type: relation.type, card: relation.to }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const relId = new URL(req.url).searchParams.get("relId");
  if (!relId) return NextResponse.json({ error: "relId required" }, { status: 400 });
  await prisma.cardRelation.delete({ where: { id: relId } });
  return NextResponse.json({ success: true });
}
