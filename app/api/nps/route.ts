import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  trafegoScore: z.number().int().min(0).max(10),
  trafegoCollab: z.string().optional(),
  designerScore: z.number().int().min(0).max(10).optional(),
  designerCollab: z.string().optional(),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verifica se já respondeu neste mês
    const existing = await prisma.npsResponse.findFirst({
      where: { clientId: data.clientId, month: data.month },
    });

    if (existing) {
      return NextResponse.json(
        { error: "already_submitted" },
        { status: 409 }
      );
    }

    const response = await prisma.npsResponse.create({ data });

    return NextResponse.json({ success: true, id: response.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
