"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Wallet, Receipt, Users, Percent, HandCoins,
  Sparkles, Clock, Target, UserCheck, Briefcase, ArrowUpRight,
} from "lucide-react";

interface ClientFinance {
  id: string; name: string; brand: "roi" | "nitroads";
  ticket: number; ltMonths: number; accumulatedRevenue: number; ltvProjected: number; nps: number | null;
}
interface BrandSplit { brand: "roi" | "nitroads"; mrr: number; clientCount: number; avgTicket: number; share: number; }
interface Portfolio { id: string; name: string; clientCount: number; mrr: number; avgTicket: number; accumulatedRevenue: number; nps: number | null; share: number; }
interface FinanceData {
  mrr: number; arr: number; activeClientCount: number; inactiveCount: number;
  newClientsThisMonth: number; newMrrThisMonth: number;
  totalAccumulatedRevenue: number; avgTicket: number; avgLtMonths: number; avgLtv: number;
  avgNps: number | null; npsZone: { label: string; color: string } | null;
  teamCost: number; grossMargin: number; grossMarginPct: number;
  brandSplit: BrandSplit[]; portfolio: Portfolio[]; unassignedMrr: number;
  clients: ClientFinance[];
  mrrHistory: { month: string; label: string; value: number }[];
  projectionMonths: number;
}

function fmtBRL(v: number) {
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}
function fmtCompact(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return fmtBRL(v);
}

type Tone = "default" | "brand" | "success" | "danger" | "warning";
const toneText: Record<Tone, string> = {
  default: "text-ink", brand: "text-brand", success: "text-success", danger: "text-danger", warning: "text-warning",
};
const toneIconWrap: Record<Tone, string> = {
  default: "bg-surface-hover text-dim",
  brand: "bg-brand-tint text-brand",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
};

function StatCard({
  icon: Icon, label, value, sub, tone = "default", accent,
}: {
  icon: React.ElementType; label: string; value: string; sub?: React.ReactNode; tone?: Tone; accent?: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-line rounded-2xl px-6 py-5 shadow-[0_1px_3px_rgba(15,20,40,0.05)] hover:border-line-strong transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12.5px] font-medium text-dim">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneIconWrap[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className={`text-[27px] font-extrabold leading-none tracking-[-0.01em] ${toneText[tone]}`}>{value}</p>
      {sub && <div className="text-[12.5px] text-faint mt-2">{sub}</div>}
      {accent}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 mt-2">
      <h2 className="text-[19px] font-extrabold text-ink tracking-[-0.01em]">{children}</h2>
      {hint && <span className="text-[12.5px] text-faint">{hint}</span>}
    </div>
  );
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/financeiro").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const maxMrr = data ? Math.max(...data.mrrHistory.map((m) => m.value), 1) : 1;
  const roi = data?.brandSplit.find((b) => b.brand === "roi");
  const nitro = data?.brandSplit.find((b) => b.brand === "nitroads");

  return (
    <div className="px-10 xl:px-16 py-12 max-w-[1400px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.015em] mb-2">Financeiro</h1>
          <p className="text-[15px] text-dim">Receita, margem e saúde da carteira</p>
        </div>
        <span className="text-[11px] font-bold tracking-[0.06em] text-brand bg-brand-tint border border-brand/30 rounded-full px-4 py-1.5">
          VISÃO ADMINISTRATIVA
        </span>
      </div>

      {loading || !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-surface" />)}
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-surface" />)}
          </div>
          <Skeleton className="h-56 rounded-2xl bg-surface" />
        </div>
      ) : (
        <>
          {/* Receita */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard icon={DollarSign} label="MRR da carteira" value={fmtBRL(data.mrr)} tone="brand"
              sub={`${data.activeClientCount} cliente${data.activeClientCount !== 1 ? "s" : ""} ativo${data.activeClientCount !== 1 ? "s" : ""}${data.inactiveCount ? ` · ${data.inactiveCount} inativo${data.inactiveCount !== 1 ? "s" : ""}` : ""}`} />
            <StatCard icon={TrendingUp} label="ARR projetado" value={fmtBRL(data.arr)} sub="MRR × 12 meses" />
            <StatCard icon={Wallet} label="Receita acumulada" value={fmtBRL(data.totalAccumulatedRevenue)}
              sub="Faturado ao longo dos contratos" />
            <StatCard icon={Receipt} label="Ticket médio" value={fmtBRL(data.avgTicket)} sub="Por cliente ativo" />
          </div>

          {/* Saúde financeira */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Briefcase} label="Custo da equipe" value={fmtBRL(data.teamCost)}
              sub="Salários + variáveis (mensal)" />
            <StatCard icon={Percent} label="Margem bruta" value={fmtBRL(data.grossMargin)}
              tone={data.grossMargin >= 0 ? "success" : "danger"}
              sub={`${(data.grossMarginPct * 100).toFixed(0)}% do MRR · após custo de equipe`} />
            <StatCard icon={Sparkles} label="Novos no mês" value={`+${data.newClientsThisMonth}`} tone="brand"
              sub={data.newMrrThisMonth ? `+${fmtBRL(data.newMrrThisMonth)} de MRR` : "Nenhum contrato novo"} />
            <StatCard icon={Target} label="NPS médio" value={data.avgNps !== null ? String(data.avgNps) : "—"}
              tone={data.avgNps === null ? "default" : data.avgNps >= 50 ? "success" : data.avgNps >= 0 ? "warning" : "danger"}
              sub={data.npsZone ? data.npsZone.label : "Sem respostas ainda"} />
          </div>

          {/* LT / LTV */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-9">
            <StatCard icon={Clock} label="LT médio" value={`${data.avgLtMonths.toFixed(0)} meses`}
              sub="Tempo médio de permanência" />
            <StatCard icon={HandCoins} label="LTV médio" value={fmtBRL(data.avgLtv)} tone="brand"
              sub="Ticket médio × LT médio" />
            <StatCard icon={Users} label="Clientes ativos" value={String(data.activeClientCount)}
              sub={data.inactiveCount ? `${data.inactiveCount} inativo(s)` : "Toda a base ativa"} />
            <StatCard icon={UserCheck} label="MRR sem gestor" value={fmtBRL(data.unassignedMrr)}
              tone={data.unassignedMrr > 0 ? "warning" : "success"}
              sub={data.unassignedMrr > 0 ? "Clientes sem gestor atribuído" : "Toda a carteira atribuída"} />
          </div>

          {/* MRR por marca */}
          <SectionTitle hint="Distribuição da receita recorrente">MRR por marca</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-9">
            {[{ b: roi, name: "Cliente ROI", color: "#7C1EFB" }, { b: nitro, name: "Cliente NitroAds", color: "#1440FF" }].map(({ b, name, color }) => (
              <div key={name} className="bg-surface border border-line rounded-2xl px-6 py-5 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[15px] font-bold text-ink">{name}</span>
                  </div>
                  <span className="text-[12.5px] text-faint">{b?.clientCount ?? 0} cliente{(b?.clientCount ?? 0) !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <p className="text-[24px] font-extrabold text-ink leading-none">{fmtBRL(b?.mrr ?? 0)}</p>
                  <p className="text-[13px] text-dim">ticket {fmtBRL(b?.avgTicket ?? 0)}</p>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((b?.share ?? 0) * 100)}%`, backgroundColor: color }} />
                </div>
                <p className="text-[12px] text-faint mt-1.5">{Math.round((b?.share ?? 0) * 100)}% do MRR total</p>
              </div>
            ))}
          </div>

          {/* Evolução do MRR */}
          <SectionTitle hint="Últimos 12 meses">Evolução do MRR</SectionTitle>
          <div className="bg-surface border border-line rounded-2xl p-6 mb-9 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
            <div className="flex gap-3 h-48">
              {data.mrrHistory.map((m, i) => {
                const isLast = i === data.mrrHistory.length - 1;
                const heightPct = Math.max((m.value / maxMrr) * 100, 3);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10.5px] font-semibold text-dim opacity-0 group-hover:opacity-100 transition-opacity">{fmtCompact(m.value)}</span>
                    <div className="w-full flex items-end justify-center flex-1">
                      <div
                        className="w-full max-w-[42px] rounded-t-md transition-all"
                        style={{
                          height: `${heightPct}%`,
                          background: isLast
                            ? "linear-gradient(180deg, #A970FF 0%, #7C1EFB 100%)"
                            : "linear-gradient(180deg, rgba(124,30,251,0.55) 0%, rgba(124,30,251,0.28) 100%)",
                        }}
                      />
                    </div>
                    <span className={`text-[11.5px] ${isLast ? "text-ink font-bold" : "text-faint"}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visão de carteira por gestor */}
          <SectionTitle hint="Receita sob gestão de cada operador">Visão de carteira</SectionTitle>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-9 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
            {data.portfolio.length === 0 ? (
              <p className="px-6 py-8 text-dim text-sm text-center">Nenhum gestor de tráfego com carteira atribuída.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[1.6fr_0.8fr_1.2fr_1.4fr_1fr_0.7fr] px-6 py-3.5 border-b border-line bg-surface-hover/40">
                    {["GESTOR", "CLIENTES", "MRR GERIDO", "% DA CARTEIRA", "TICKET MÉDIO", "NPS"].map((h) => (
                      <span key={h} className="text-[11px] font-bold tracking-[0.05em] text-dim">{h}</span>
                    ))}
                  </div>
                  {data.portfolio.map((p, i) => (
                    <div key={p.id} className={`grid grid-cols-[1.6fr_0.8fr_1.2fr_1.4fr_1fr_0.7fr] items-center px-6 py-4 ${i < data.portfolio.length - 1 ? "border-b border-line" : ""} hover:bg-surface-hover/40 transition-colors`}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-brand-tint text-brand flex items-center justify-center text-[11px] font-bold">
                          {p.name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("")}
                        </span>
                        <span className="text-[14.5px] font-semibold text-ink">{p.name}</span>
                      </div>
                      <span className="text-[14px] text-dim">{p.clientCount}</span>
                      <span className="text-[15px] font-bold text-brand">{fmtBRL(p.mrr)}</span>
                      <div className="flex items-center gap-2.5 pr-6">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(p.share * 100)}%` }} />
                        </div>
                        <span className="text-[12px] text-faint w-9 text-right">{Math.round(p.share * 100)}%</span>
                      </div>
                      <span className="text-[14px] text-ink-soft">{fmtBRL(p.avgTicket)}</span>
                      <span className={`text-[14px] font-bold ${p.nps === null ? "text-faint" : p.nps >= 50 ? "text-success" : p.nps >= 0 ? "text-warning" : "text-danger"}`}>
                        {p.nps !== null ? p.nps : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Receita por cliente */}
          <SectionTitle hint="Ordenado por receita acumulada">Receita por cliente</SectionTitle>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
            {data.clients.length === 0 ? (
              <p className="px-6 py-8 text-dim text-sm text-center">Nenhum cliente ativo com ticket e data de contratação cadastrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr_0.9fr_1fr_0.9fr_0.6fr] px-6 py-3.5 border-b border-line bg-surface-hover/40">
                    {["CLIENTE", "MARCA", "TICKET", "LT", "RECEITA ACUM.", "LTV PROJ.", "NPS"].map((h) => (
                      <span key={h} className="text-[11px] font-bold tracking-[0.05em] text-dim">{h}</span>
                    ))}
                  </div>
                  {data.clients.map((c, i) => (
                    <div key={c.id} className={`grid grid-cols-[1.6fr_0.7fr_0.8fr_0.9fr_1fr_0.9fr_0.6fr] items-center px-6 py-4 ${i < data.clients.length - 1 ? "border-b border-line" : ""} hover:bg-surface-hover/40 transition-colors`}>
                      <span className="text-[14.5px] font-semibold text-ink">{c.name}</span>
                      <span>
                        <span className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${c.brand === "nitroads" ? "bg-info/15 text-info" : "bg-brand-tint text-brand"}`}>
                          {c.brand === "nitroads" ? "NitroAds" : "ROI"}
                        </span>
                      </span>
                      <span className="text-[14px] text-dim">{fmtBRL(c.ticket)}</span>
                      <span className="text-[14px] text-dim">{c.ltMonths} {c.ltMonths === 1 ? "mês" : "meses"}</span>
                      <span className="text-[14.5px] font-bold text-brand">{fmtBRL(c.accumulatedRevenue)}</span>
                      <span className="text-[14px] text-ink-soft">{fmtBRL(c.ltvProjected)}</span>
                      <span className={`text-[14px] font-bold ${c.nps === null ? "text-faint" : c.nps >= 50 ? "text-success" : c.nps >= 0 ? "text-warning" : "text-danger"}`}>
                        {c.nps !== null ? c.nps : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-[12px] text-faint mt-4">
            <ArrowUpRight size={13} /> LTV projetado assume mais {data.projectionMonths} meses de permanência sobre o ticket atual.
          </p>
        </>
      )}
    </div>
  );
}
