import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity } from "@/lib/boards";
import { z } from "zod";

// Sem storage externo: anexos são guardados como data URL base64 na própria linha.
// Limite conservador para não estourar a linha do Postgres.
const MAX_BYTES = 1_500_000;

const createSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  dataUrl: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = createSchema.parse(await req.json());
    if (data.size > MAX_BYTES || data.dataUrl.length > MAX_BYTES * 1.4) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    const att = await prisma.cardAttachment.create({
      data: { cardId: id, filename: data.filename, mimeType: data.mimeType, size: data.size, dataUrl: data.dataUrl },
      select: { id: true, filename: true, mimeType: true, size: true, dataUrl: true, createdAt: true },
    });
    await logActivity(id, actor.name, "attachment", `anexou ${data.filename}`);
    return NextResponse.json(att, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const attId = new URL(req.url).searchParams.get("attId");
  if (!attId) return NextResponse.json({ error: "attId required" }, { status: 400 });
  await prisma.cardAttachment.delete({ where: { id: attId } });
  return NextResponse.json({ success: true });
}
