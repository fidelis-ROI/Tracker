import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Observação privada do operador sobre um cliente. Só o próprio operador
// (via collaboratorId da sessão) lê e escreve a sua própria observação.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  if (!collaboratorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const obs = await prisma.clientObservation.findUnique({
    where: { clientId_collaboratorId: { clientId, collaboratorId } },
    select: { note: true, updatedAt: true },
  });

  return NextResponse.json({ note: obs?.note ?? "", updatedAt: obs?.updatedAt ?? null });
}

const putSchema = z.object({ clientId: z.string(), note: z.string().max(5000) });

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const collaboratorId = session?.user.collaboratorId;
  if (!collaboratorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { clientId, note } = putSchema.parse(await req.json());
    const trimmed = note.trim();

    if (!trimmed) {
      // Nota vazia = remove a observação.
      await prisma.clientObservation.deleteMany({ where: { clientId, collaboratorId } });
      return NextResponse.json({ note: "", updatedAt: null });
    }

    const obs = await prisma.clientObservation.upsert({
      where: { clientId_collaboratorId: { clientId, collaboratorId } },
      update: { note: trimmed },
      create: { clientId, collaboratorId, note: trimmed },
      select: { note: true, updatedAt: true },
    });
    return NextResponse.json(obs);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
