import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor, logActivity } from "@/lib/boards";
import { notify } from "@/lib/notifications";
import { z } from "zod";

const createSchema = z.object({ body: z.string().min(1), mentions: z.array(z.string()).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { body, mentions } = createSchema.parse(await req.json());
    const comment = await prisma.cardComment.create({
      data: { cardId: id, authorName: actor.name, authorEmail: actor.email, body },
      select: { id: true, authorName: true, body: true, createdAt: true },
    });
    await logActivity(id, actor.name, "comment", "comentou");

    // Notifica as pessoas mencionadas no comentário.
    if (mentions && mentions.length > 0) {
      const cardInfo = await prisma.boardCard.findUnique({
        where: { id },
        select: { id: true, boardId: true, code: true, title: true },
      });
      if (cardInfo) {
        await notify({
          recipientIds: mentions,
          excludeCollaboratorId: actor.session.user.collaboratorId,
          actorName: actor.name,
          type: "mention",
          card: cardInfo,
          context: "comment",
        });
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const commentId = new URL(req.url).searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });
  await prisma.cardComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
