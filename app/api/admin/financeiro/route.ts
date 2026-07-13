import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Horizonte de projeção usado no LTV projetado: assume que o cliente
// permanece pagando o ticket atual por mais N meses a partir de hoje.
const PROJECTION_MONTHS = 6;

// Zonas de classificação de NPS (metodologia Bain, adaptada em pt-BR).
function npsZone(nps: number): { label: string; color: string } {
  if (nps >= 70) return { label: "Zona de excelência", color: "#4ADE80" };
  if (nps >= 50) return { label: "Zona de qualidade", color: "#4ADE80" };
  if (nps >= 0) return { label: "Zona de aperfeiçoamento", color: "#EAB308" };
  return { label: "Zona crítica", color: "#F87171" };
}

// Meses inteiros decorridos entre duas datas (mínimo 0).
function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function calcNps(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      active: true,
      ticket: true,
      contractDate: true,
      brand: true,
      responses: { select: { trafegoScore: true } },
    },
  });

  // Só entram nos cálculos financeiros os clientes com ticket e data de
  // contratação preenchidos — sem isso não dá pra calcular LT/receita.
  const billable = clients.filter(c => c.ticket != null && c.contractDate != null);

  const perClient = billable.map(c => {
    const ticket = c.ticket!;
    const ltMonths = monthsBetween(c.contractDate!, now);
    const accumulatedRevenue = ticket * ltMonths;
    const ltvProjected = ticket * (ltMonths + PROJECTION_MONTHS);
    const nps = calcNps(c.responses.map(r => r.trafegoScore));

    return {
      id: c.id,
      name: c.name,
      active: c.active,
      brand: c.brand,
      ticket,
      ltMonths,
      accumulatedRevenue,
      ltvProjected,
      nps,
    };
  });

  // MRR, ticket médio, LT médio e LTV médio consideram apenas a carteira
  // ATIVA — é a "foto de hoje" da operação, não o histórico.
  const activePortfolio = perClient.filter(c => c.active);
  const mrr = activePortfolio.reduce((sum, c) => sum + c.ticket, 0);
  const avgTicket = activePortfolio.length ? mrr / activePortfolio.length : 0;
  const avgLtMonths = activePortfolio.length
    ? activePortfolio.reduce((sum, c) => sum + c.ltMonths, 0) / activePortfolio.length
    : 0;
  const avgLtv = avgTicket * avgLtMonths;

  // Receita acumulada da carteira soma TODOS os clientes com contrato
  // (ativos ou não) — dinheiro já faturado não some quando o cliente sai.
  const totalAccumulatedRevenue = perClient.reduce((sum, c) => sum + c.accumulatedRevenue, 0);

  // NPS médio da carteira = média do NPS de cada cliente ativo que já
  // tem pelo menos uma resposta (não é o NPS agregado de todas as notas juntas).
  const npsValues = activePortfolio.map(c => c.nps).filter((n): n is number => n !== null);
  const avgNps = npsValues.length ? Math.round(npsValues.reduce((a, b) => a + b, 0) / npsValues.length) : null;

  // Evolução do MRR nos últimos 6 meses: para cada mês, soma o ticket dos
  // clientes que hoje estão ativos E já tinham contrato assinado até o fim
  // daquele mês. Clientes que já cancelaram não aparecem no histórico,
  // pois o schema não guarda data de cancelamento.
  const mrrHistory: { month: string; label: string; value: number }[] = [];
  const monthLabels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  for (let i = 5; i >= 0; i--) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    const value = activePortfolio
      .filter(c => {
        const client = billable.find(b => b.id === c.id)!;
        return client.contractDate! <= endOfMonth;
      })
      .reduce((sum, c) => sum + c.ticket, 0);
    mrrHistory.push({
      month: `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabels[refDate.getMonth()],
      value,
    });
  }

  return NextResponse.json({
    mrr,
    activeClientCount: activePortfolio.length,
    totalAccumulatedRevenue,
    avgTicket,
    avgLtMonths,
    avgLtv,
    avgNps,
    npsZone: avgNps !== null ? npsZone(avgNps) : null,
    clients: perClient
      .filter(c => c.active)
      .sort((a, b) => b.accumulatedRevenue - a.accumulatedRevenue),
    mrrHistory,
    projectionMonths: PROJECTION_MONTHS,
  });
}
