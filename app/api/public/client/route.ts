import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota pública para buscar cliente por slug (sem autenticação)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { slug, active: true },
  });

  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(client);
}
