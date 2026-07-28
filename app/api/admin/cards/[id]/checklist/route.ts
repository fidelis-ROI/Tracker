import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity } from "@/lib/boards";
import { z } from "zod";

const createSchema = z.object({ text: z.string().min(1) });
const patchSchema = z.object({ itemId: z.string(), done: z.boolean().optional(), text: z.string().min(1).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { text } = createSchema.parse(await req.json());
    const last = await prisma.cardChecklistItem.findFirst({
      where: { cardId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const item = await prisma.cardChecklistItem.create({
      data: { cardId: id, text, order: (last?.order ?? 0) + 1000 },
    });
    await logActivity(id, actor.name, "checklist", "adicionou item ao checklist");
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { itemId, done, text } = patchSchema.parse(await req.json());
    const item = await prisma.cardChecklistItem.update({
      where: { id: itemId },
      data: { done, text },
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  await prisma.cardChecklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
