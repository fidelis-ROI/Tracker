"use client";

import { useEffect, useState } from "react";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Star, MessageSquare, Search } from "lucide-react";

interface ClientNps {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  responses: {
    id: string;
    month: string;
    trafegoScore: number;
    designerScore: number | null;
    feedback: string | null;
    submittedAt: string;
  }[];
}

function calcNps(scores: number[]) {
  if (!scores.length) return null;
  const p = scores.filter(s => s >= 9).length;
  const d = scores.filter(s => s <= 6).length;
  return Math.round(((p - d) / scores.length) * 100);
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function MetricTile({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub: string }) {
  return (
    <div className="bg-surface border border-line rounded-[14px] p-[22px]">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold tracking-[0.06em] text-dim">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#7C1EFB]/25 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-brand-soft" />
        </div>
      </div>
      <p className="text-[32px] font-extrabold text-ink leading-none my-[18px]">{value}</p>
      <p className="text-[13.5px] text-dim">{sub}</p>
    </div>
  );
}

export default function OperadorDashboardPage() {
  const [portfolio, setPortfolio] = useState<ClientNps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operador/portfolio")
      .then(r => r.json())
      .then(setPortfolio)
      .finally(() => setLoading(false));
  }, []);

  const allScores = portfolio.flatMap(c => c.responses.map(r => r.trafegoScore));
  const nps = calcNps(allScores);
  const avgScore = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : null;
  const activeClients = portfolio.filter(c => c.active).length;
  const totalResponses = portfolio.reduce((sum, c) => sum + c.responses.length, 0);

  const latest = portfolio
    .flatMap(c => c.responses.map(r => ({ ...r, clientName: c.name })))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 15);

  return (
    <div className="px-16 py-14">
      <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.01em] mb-2">Carteira</h1>
      <p className="text-base text-dim mb-8">Visão geral dos seus clientes e indicadores</p>

      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[14px] bg-surface" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          <MetricTile label="NPS DA CARTEIRA" value={nps !== null ? `${nps > 0 ? "+" : ""}${nps}` : "—"} icon={TrendingUp} sub="Últimos 12 meses" />
          <MetricTile label="MÉDIA DE NOTA" value={avgScore !== null ? avgScore.toFixed(1) : "—"} icon={Star} sub="Pontuação média" />
          <MetricTile label="CLIENTES ATIVOS" value={activeClients} icon={Users} sub={`${portfolio.length} no total`} />
          <MetricTile label="AVALIAÇÕES" value={totalResponses} icon={MessageSquare} sub="Pesquisas de satisfação" />
        </div>
      )}

      <h2 className="text-[21px] font-extrabold text-ink mb-4">Clientes na Carteira</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[14px] bg-surface" />)}
        </div>
      ) : portfolio.length === 0 ? (
        <div className="bg-surface border border-line rounded-[14px] py-[70px] px-5 flex flex-col items-center justify-center gap-3.5">
          <Search size={34} strokeWidth={1.8} className="text-faint" />
          <p className="text-base text-dim">Nenhum cliente na carteira. Solicite ao admin para atribuir clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portfolio.map(client => {
            const scores = client.responses.map(r => r.trafegoScore);
            const clientNps = calcNps(scores);
            const clientAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
            const lastResponse = client.responses[0];

            return (
              <div key={client.id} className="bg-surface border border-line rounded-[14px] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-ink font-semibold text-sm">{client.name}</p>
                    <p className="text-dim text-xs mt-0.5">
                      {scores.length} avaliação{scores.length !== 1 ? "ões" : ""}
                    </p>
                  </div>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${client.active ? "bg-[#5B21F0]/[0.22] text-brand-soft" : "bg-surface-hover border border-line text-dim"}`}>
                    {client.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {scores.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-extrabold text-ink">{clientAvg!.toFixed(1)}</span>
                      <div>
                        {clientNps !== null && (
                          <p className="text-xs text-dim">
                            NPS: <span className={clientNps >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"}>{clientNps > 0 ? "+" : ""}{clientNps}</span>
                          </p>
                        )}
                        <NpsLabel score={Math.round(clientAvg!)} />
                      </div>
                    </div>

                    {/* Last 6 months mini chart */}
                    <div className="flex items-end gap-1 h-8 mb-3">
                      {client.responses.slice(0, 6).reverse().map((r, i) => (
                        <div
                          key={r.id}
                          title={`${monthLabel(r.month)}: ${r.trafegoScore}`}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${(r.trafegoScore / 10) * 100}%`,
                            minHeight: "4px",
                            backgroundColor: r.trafegoScore >= 9 ? "#4ADE80" : r.trafegoScore >= 7 ? "#EAB308" : "#F87171",
                            opacity: i === client.responses.slice(0, 6).reverse().length - 1 ? 1 : 0.6,
                          }}
                        />
                      ))}
                    </div>

                    {lastResponse && (
                      <p className="text-xs text-dim">
                        Última avaliação: {monthLabel(lastResponse.month)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-dim/40 text-sm">Sem avaliações ainda</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Últimas avaliações */}
      {!loading && (
        <div className="mt-10">
          <h2 className="text-[21px] font-extrabold text-ink mb-1">Últimas avaliações</h2>
          <p className="text-sm text-dim mb-4">Respostas recentes dos seus clientes, com data, nota e comentário.</p>
          {latest.length === 0 ? (
            <div className="bg-surface border border-line rounded-[14px] py-10 px-5 text-center">
              <p className="text-base text-dim">Nenhuma avaliação ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latest.map((r) => (
                <div key={r.id} className="bg-surface border border-line rounded-[14px] p-5">
                  <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="text-ink font-semibold text-sm">{r.clientName}</span>
                      <span className="text-faint text-xs">·</span>
                      <span className="text-dim text-xs">{fmtDateTime(r.submittedAt)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-dim uppercase tracking-wide">Aquisição</span>
                        <span className="text-ink font-bold text-sm">{r.trafegoScore}</span>
                        <NpsLabel score={r.trafegoScore} />
                      </div>
                      {r.designerScore !== null && r.designerScore !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-dim uppercase tracking-wide">Entrega</span>
                          <span className="text-ink font-bold text-sm">{r.designerScore}</span>
                          <NpsLabel score={r.designerScore} />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[13.5px] text-ink-soft whitespace-pre-wrap leading-relaxed">
                    {r.feedback ? `"${r.feedback}"` : <span className="text-faint italic">Sem comentário</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
