import { prisma } from "@/lib/prisma";

type CardSnapshot = { id: string; code: string | null; title: string; boardId: string | null };

/**
 * Cria notificações para um conjunto de destinatários (Collaborator ids).
 * Remove duplicatas, ignora vazios e nunca notifica o próprio autor da ação.
 * Best-effort: erros não derrubam a operação principal.
 */
export async function notify(opts: {
  recipientIds: (string | null | undefined)[];
  excludeCollaboratorId?: string | null;
  actorName: string;
  type: "assigned" | "mention";
  card: CardSnapshot;
  context?: string | null;
}) {
  const ids = Array.from(new Set(opts.recipientIds.filter((x): x is string => !!x))).filter(
    (id) => id !== opts.excludeCollaboratorId,
  );
  if (ids.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: ids.map((recipientId) => ({
        recipientId,
        type: opts.type,
        actorName: opts.actorName,
        cardId: opts.card.id,
        boardId: opts.card.boardId,
        cardCode: opts.card.code,
        cardTitle: opts.card.title,
        context: opts.context ?? null,
      })),
    });
  } catch {
    // best-effort
  }
}
