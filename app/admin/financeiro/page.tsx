"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientFinance {
  id: string;
  name: string;
  brand: "roi" | "nitroads";
  ticket: number;
  ltMonths: number;
  accumulatedRevenue: number;
  ltvProjected: number;
  nps: number | null;
}

interface FinanceData {
  mrr: number;
  activeClientCount: number;
  totalAccumulatedRevenue: number;
  avgTicket: number;
  avgLtMonths: number;
  avgLtv: number;
  avgNps: number | null;
  npsZone: { label: string; color: string } | null;
  clients: ClientFinance[];
  mrrHistory: { month: string; label: string; value: number }[];
  projectionMonths: number;
}

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function MetricCard({ label, value, valueColor, sub, subEl }: { label: string; value: string; valueColor?: string; sub?: string; subEl?: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] px-6 py-[22px]">
      <p className="text-[13px] text-[#8A8FA3] mb-2.5">{label}</p>
      <p className="text-[26px] font-extrabold leading-none" style={{ color: valueColor ?? "#fff" }}>{value}</p>
      {sub && <p className="text-[12.5px] text-[#6E7285] mt-1.5">{sub}</p>}
      {subEl}
    </div>
  );
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/financeiro")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const maxMrr = data ? Math.max(...data.mrrHistory.map(m => m.value), 1) : 1;

  return (
    <div className="px-16 py-14">
      <div className="flex items-start justify-between mb-9">
        <div>
          <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Financeiro</h1>
          <p className="text-base text-[#8A8FA3]">Visão administrativa da receita de toda a carteira</p>
        </div>
        <span className="text-[11px] font-bold tracking-[0.06em] text-[#8B6BFF] bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/[0.35] rounded-full px-4 py-1.5">
          VISÃO ADMINISTRATIVA
        </span>
      </div>

      {loading || !data ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-9">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[14px] bg-white/[0.03]" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-9">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[14px] bg-white/[0.03]" />)}
          </div>
        </>
      ) : (
        <>
          {/* Métricas principais */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-9">
            <MetricCard
              label="MRR da carteira"
              value={formatBRL(data.mrr)}
              sub={`${data.activeClientCount} cliente${data.activeClientCount !== 1 ? "s" : ""} ativo${data.activeClientCount !== 1 ? "s" : ""}`}
            />
            <MetricCard
              label="Receita acumulada"
              value={formatBRL(data.totalAccumulatedRevenue)}
              valueColor="#8B6BFF"
              sub="Ticket × tempo de todos os clientes"
            />
            <MetricCard label="Ticket médio" value={formatBRL(data.avgTicket)} />
            <MetricCard
              label="NPS médio da carteira"
              value={data.avgNps !== null ? String(data.avgNps) : "—"}
              valueColor={data.npsZone?.color}
              subEl={
                data.npsZone && (
                  <div className="flex items-baseline gap-2 -mt-1">
                    <span className="text-[13px] font-semibold" style={{ color: data.npsZone.color }}>{data.npsZone.label}</span>
                  </div>
                )
              }
            />
          </div>

          {/* LT / LTV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-9">
            <MetricCard
              label="LT médio (Lifetime)"
              value={`${data.avgLtMonths.toFixed(0)} meses`}
              sub="Tempo médio de permanência dos clientes"
            />
            <MetricCard
              label="LTV médio (Lifetime Value)"
              value={formatBRL(data.avgLtv)}
              valueColor="#8B6BFF"
              sub="Ticket médio × LT médio"
            />
          </div>

          {/* Receita por cliente */}
          <h2 className="text-[19px] font-extrabold text-white mb-4">Receita por cliente</h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden mb-9">
            {data.clients.length === 0 ? (
              <p className="px-[26px] py-8 text-[#8A8FA3] text-sm text-center">
                Nenhum cliente ativo com ticket e data de contratação cadastrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_1fr_0.9fr_0.7fr] px-[26px] py-[18px] border-b border-white/[0.08]">
                    {["CLIENTE","TICKET","LT","RECEITA ACUMULADA","LTV PROJ.","NPS"].map(h => (
                      <span key={h} className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">{h}</span>
                    ))}
                  </div>
                  {data.clients.map((c, i) => (
                    <div
                      key={c.id}
                      className={`grid grid-cols-[1.4fr_0.8fr_0.9fr_1fr_0.9fr_0.7fr] items-center px-[26px] py-5 ${i < data.clients.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                    >
                      <span className="text-base font-semibold text-white">{c.name}</span>
                      <span className="text-[14.5px] text-[#B7BBCB]">{formatBRL(c.ticket)}</span>
                      <span className="text-[14.5px] text-[#B7BBCB]">{c.ltMonths} {c.ltMonths === 1 ? "mês" : "meses"}</span>
                      <span className="text-[15px] font-bold text-[#8B6BFF]">{formatBRL(c.accumulatedRevenue)}</span>
                      <span className="text-[14.5px] text-[#B7BBCB]">{formatBRL(c.ltvProjected)}</span>
                      <span className="text-[14.5px] font-bold text-[#4ADE80]">{c.nps !== null ? c.nps : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evolução do MRR */}
          <h2 className="text-[19px] font-extrabold text-white mb-4">Evolução do MRR</h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-7">
            <div className="flex items-end gap-6 h-40">
              {data.mrrHistory.map((m, i) => {
                const isLast = i === data.mrrHistory.length - 1;
                const heightPct = maxMrr > 0 ? Math.max((m.value / maxMrr) * 100, 4) : 4;
                return (
                  <div key={m.month} className="flex flex-col items-center gap-2.5 flex-1">
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className="w-full max-w-[56px] rounded-t-lg"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: isLast ? "#7C1EFB" : "rgba(124,30,251,0.4)",
                        }}
                        title={formatBRL(m.value)}
                      />
                    </div>
                    <span className={`text-[12.5px] ${isLast ? "text-[#B7BBCB] font-semibold" : "text-[#6E7285]"}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
