import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const BOARD_STATUSES = [
  "backlog",
  "todo",
  "doing",
  "review",
  "blocked",
  "done",
] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const STATUS_LABELS: Record<BoardStatus, string> = {
  backlog: "Backlog",
  todo: "A Fazer",
  doing: "Fazendo",
  review: "Em Revisão",
  blocked: "Bloqueado",
  done: "Concluído",
};

export const RELATION_TYPES = [
  "relacionado",
  "bloqueia",
  "bloqueado_por",
  "duplica",
] as const;

/** Retorna a sessão + um "ator" (nome/email) para logs e autoria. */
export async function getActor() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  let name = session.user.email;
  if (session.user.collaboratorId) {
    const collab = await prisma.collaborator.findUnique({
      where: { id: session.user.collaboratorId },
      select: { name: true },
    });
    if (collab?.name) name = collab.name;
  } else {
    name = session.user.email.split("@")[0];
  }

  return { session, name, email: session.user.email };
}

/** Registra uma entrada na timeline do card. Silencioso em caso de erro. */
export async function logActivity(
  cardId: string,
  actorName: string,
  type: string,
  detail?: string,
) {
  try {
    await prisma.cardActivity.create({
      data: { cardId, actorName, type, detail },
    });
  } catch {
    // timeline é best-effort, não deve derrubar a operação principal
  }
}

/**
 * Gera o próximo código sequencial do board (ex: "MAR-128") de forma atômica,
 * incrementando o contador `cardSeq` do board.
 */
export async function nextCardCode(boardId: string): Promise<string> {
  const board = await prisma.board.update({
    where: { id: boardId },
    data: { cardSeq: { increment: 1 } },
    select: { prefix: true, cardSeq: true },
  });
  return `${board.prefix}-${board.cardSeq}`;
}
