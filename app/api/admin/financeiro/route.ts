import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Horizonte de projeção usado no LTV projetado: assume que o cliente
// permanece pagando o ticket atual por mais N meses a partir de hoje.
const PROJECTION_MONTHS = 6;

// Zonas de classificação de NPS (metodologia Bain, adaptada em pt-BR).
function npsZone(nps: number): { label: string; color: string } {
  if (nps >= 70) return { label: "Zona de excelência", color: "#22C55E" };
  if (nps >= 50) return { label: "Zona de qualidade", color: "#22C55E" };
  if (nps >= 0) return { label: "Zona de aperfeiçoamento", color: "#EAB308" };
  return { label: "Zona crítica", color: "#EF4444" };
}

function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function calcNps(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, collaborators] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        active: true,
        ticket: true,
        contractDate: true,
        setupFee: true,
        setupInstallments: true,
        brand: true,
        responses: { select: { trafegoScore: true } },
        operators: { select: { collaborator: { select: { id: true, name: true, role: true } } } },
      },
    }),
    prisma.collaborator.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, role: true, salary: true, variable: true },
    }),
  ]);

  const billable = clients.filter((c) => c.ticket != null && c.contractDate != null);

  const perClient = billable.map((c) => {
    const ticket = c.ticket!;
    const ltMonths = monthsBetween(c.contractDate!, now);
    return {
      id: c.id,
      name: c.name,
      active: c.active,
      brand: c.brand as "roi" | "nitroads",
      ticket,
      ltMonths,
      contractDate: c.contractDate!,
      accumulatedRevenue: ticket * ltMonths,
      ltvProjected: ticket * (ltMonths + PROJECTION_MONTHS),
      nps: calcNps(c.responses.map((r) => r.trafegoScore)),
      gestorIds: c.operators
        .filter((o) => o.collaborator.role === "gestor_trafego")
        .map((o) => o.collaborator.id),
    };
  });

  // "Foto de hoje" = carteira ativa.
  const active = perClient.filter((c) => c.active);
  const mrr = active.reduce((s, c) => s + c.ticket, 0);
  const arr = mrr * 12;
  const avgTicket = active.length ? mrr / active.length : 0;
  const avgLtMonths = avg(active.map((c) => c.ltMonths));
  const avgLtv = avgTicket * avgLtMonths;
  const totalAccumulatedRevenue = perClient.reduce((s, c) => s + c.accumulatedRevenue, 0);

  const npsValues = active.map((c) => c.nps).filter((n): n is number => n !== null);
  const avgNps = npsValues.length ? Math.round(avg(npsValues)) : null;

  // MRR por marca.
  const brandSplit = (["roi", "nitroads"] as const).map((brand) => {
    const list = active.filter((c) => c.brand === brand);
    const brandMrr = list.reduce((s, c) => s + c.ticket, 0);
    return {
      brand,
      mrr: brandMrr,
      clientCount: list.length,
      avgTicket: list.length ? brandMrr / list.length : 0,
      share: mrr ? brandMrr / mrr : 0,
    };
  });

  // Novos no mês (contrato assinado no mês corrente).
  const newThisMonth = active.filter((c) => c.contractDate >= startOfMonth);
  const newClientsThisMonth = newThisMonth.length;
  const newMrrThisMonth = newThisMonth.reduce((s, c) => s + c.ticket, 0);

  const inactiveCount = perClient.filter((c) => !c.active).length;

  // Pagamentos de setup (valor único, opcionalmente parcelado a partir da contratação).
  const setups = clients
    .filter((c) => c.setupFee != null && c.setupFee > 0)
    .map((c) => {
      const total = c.setupFee!;
      const installments = c.setupInstallments && c.setupInstallments > 0 ? c.setupInstallments : 1;
      const installmentValue = total / installments;
      // Parcelas já decorridas (a 1ª cai no mês da contratação). Sem data → considera à vista, tudo recebido.
      const monthsSince = c.contractDate ? monthsBetween(c.contractDate, now) : installments - 1;
      const paidInstallments = Math.min(installments, monthsSince + 1);
      const dueThisMonth = monthsSince >= 0 && monthsSince < installments ? installmentValue : 0;
      return {
        id: c.id,
        name: c.name,
        total,
        installments,
        installmentValue,
        paidInstallments,
        remainingInstallments: installments - paidInstallments,
        received: installmentValue * paidInstallments,
        dueThisMonth,
      };
    })
    .sort((a, b) => b.total - a.total);

  const setupTotal = setups.reduce((s, x) => s + x.total, 0);
  const setupReceived = setups.reduce((s, x) => s + x.received, 0);
  const setupPending = Math.max(0, setupTotal - setupReceived);
  const setupThisMonth = setups.reduce((s, x) => s + x.dueThisMonth, 0);

  // Custo da equipe e margem bruta.
  const teamCost = collaborators.reduce((s, c) => s + (c.salary ?? 0) + (c.variable ?? 0), 0);
  const grossMargin = mrr - teamCost;
  const grossMarginPct = mrr ? grossMargin / mrr : 0;

  // Visão de carteira por gestor de tráfego.
  const portfolio = collaborators
    .filter((col) => col.role === "gestor_trafego")
    .map((col) => {
      const list = active.filter((c) => c.gestorIds.includes(col.id));
      const portfMrr = list.reduce((s, c) => s + c.ticket, 0);
      const npsList = list.map((c) => c.nps).filter((n): n is number => n !== null);
      return {
        id: col.id,
        name: col.name,
        clientCount: list.length,
        mrr: portfMrr,
        avgTicket: list.length ? portfMrr / list.length : 0,
        accumulatedRevenue: list.reduce((s, c) => s + c.accumulatedRevenue, 0),
        nps: npsList.length ? Math.round(avg(npsList)) : null,
        share: mrr ? portfMrr / mrr : 0,
      };
    })
    .sort((a, b) => b.mrr - a.mrr);

  const assignedMrr = portfolio.reduce((s, p) => s + p.mrr, 0);
  const unassignedMrr = Math.max(0, mrr - assignedMrr);

  // Evolução do MRR (12 meses).
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mrrHistory: { month: string; label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    const value = active
      .filter((c) => c.contractDate <= endOfMonth)
      .reduce((s, c) => s + c.ticket, 0);
    mrrHistory.push({
      month: `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabels[refDate.getMonth()],
      value,
    });
  }

  return NextResponse.json({
    mrr,
    arr,
    activeClientCount: active.length,
    inactiveCount,
    newClientsThisMonth,
    newMrrThisMonth,
    totalAccumulatedRevenue,
    avgTicket,
    avgLtMonths,
    avgLtv,
    avgNps,
    npsZone: avgNps !== null ? npsZone(avgNps) : null,
    teamCost,
    grossMargin,
    grossMarginPct,
    brandSplit,
    portfolio,
    unassignedMrr,
    setupTotal,
    setupReceived,
    setupPending,
    setupThisMonth,
    setups,
    clients: active
      .map((c) => ({
        id: c.id,
        name: c.name,
        brand: c.brand,
        ticket: c.ticket,
        ltMonths: c.ltMonths,
        accumulatedRevenue: c.accumulatedRevenue,
        ltvProjected: c.ltvProjected,
        nps: c.nps,
      }))
      .sort((a, b) => b.accumulatedRevenue - a.accumulatedRevenue),
    mrrHistory,
    projectionMonths: PROJECTION_MONTHS,
  });
}
