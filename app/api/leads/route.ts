import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  nome: z.string().trim().min(1).max(120),
  laboratorio: z.string().trim().min(1).max(160),
  cidade: z.string().trim().min(1).max(120),
  // opcional: de qual página/campanha veio o lead
  origem: z.string().trim().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      console.error("SLACK_WEBHOOK_URL não configurada");
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    const origem = data.origem || "Webinar InfoTime";
    const quando = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const slackPayload = {
      // fallback em texto puro (notificações/mobile)
      text: `🎯 Novo lead — ${origem}: ${data.nome} · ${data.laboratorio} · ${data.cidade}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🎯 Novo lead — ${origem}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Nome:*\n${data.nome}` },
            { type: "mrkdwn", text: `*Laboratório:*\n${data.laboratorio}` },
            { type: "mrkdwn", text: `*Cidade:*\n${data.cidade}` },
            { type: "mrkdwn", text: `*Recebido em:*\n${quando}` },
          ],
        },
      ],
    };

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Falha ao postar no Slack:", res.status, detail);
      return NextResponse.json({ error: "slack_failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation", issues: err.issues },
        { status: 400 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
