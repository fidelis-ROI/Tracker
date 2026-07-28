import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  team: z.string().nullable().optional(),
  color: z.string().optional(),
  prefix: z.string().min(1).max(6).optional(),
});

function derivePrefix(name: string) {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "TSK").padEnd(3, "X");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const boards = await prisma.board.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      team: true,
      color: true,
      prefix: true,
      createdAt: true,
      _count: { select: { cards: { where: { deletedAt: null, parentId: null } } } },
    },
  });

  return NextResponse.json(
    boards.map((b) => ({ ...b, cardCount: b._count.cards, _count: undefined })),
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const board = await prisma.board.create({
      data: {
        name: data.name,
        team: data.team ?? null,
        color: data.color || "#F59E0B",
        prefix: (data.prefix || derivePrefix(data.name)).toUpperCase(),
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
