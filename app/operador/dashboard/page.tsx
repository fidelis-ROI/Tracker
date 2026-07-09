"use client";

import { useEffect, useState } from "react";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Star, MessageSquare } from "lucide-react";
import { MetricCard } from "@/components/admin/MetricCard";

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-titillium text-white">Carteira</h1>
        <p className="text-[#8892A4] font-manrope text-sm mt-1">Visão geral dos seus clientes e NPS</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-[#0A0F1E]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <MetricCard label="NPS da Carteira" value={nps !== null ? `${nps > 0 ? "+" : ""}${nps}` : "—"} icon={TrendingUp} sub="Últimos 12 meses" highlight />
          <MetricCard label="Média de Nota" value={avgScore !== null ? avgScore.toFixed(1) : "—"} icon={Star} sub="Pontuação média" />
          <MetricCard label="Clientes Ativos" value={activeClients} icon={Users} sub={`${portfolio.length} no total`} />
          <MetricCard label="Avaliações" value={totalResponses} icon={MessageSquare} sub="Pit Stop Reports" />
        </div>
      )}

      {/* Client cards */}
      <h2 className="text-lg font-bold font-titillium text-white mb-4">Clientes na Carteira</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl bg-[#0A0F1E]" />)}
        </div>
      ) : portfolio.length === 0 ? (
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🏎️</p>
          <p className="text-white font-titillium font-semibold mb-1">Nenhum cliente na carteira</p>
          <p className="text-[#8892A4] font-manrope text-sm">Solicite ao admin para atribuir clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portfolio.map(client => {
            const scores = client.responses.map(r => r.trafegoScore);
            const clientNps = calcNps(scores);
            const clientAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
            const lastResponse = client.responses[0];

            return (
              <div key={client.id} className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-semibold font-manrope text-sm">{client.name}</p>
                    <p className="text-[#8892A4] font-manrope text-xs mt-0.5">
                      {scores.length} avaliação{scores.length !== 1 ? "ões" : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold font-titillium px-2 py-0.5 rounded-full border ${client.active ? "border-blue-800 text-[#1440FF] bg-blue-900/20" : "border-[#1A2140] text-[#8892A4]"}`}>
                    {client.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {scores.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-bold font-titillium text-white">{clientAvg!.toFixed(1)}</span>
                      <div>
                        {clientNps !== null && (
                          <p className="text-xs text-[#8892A4] font-manrope">
                            NPS: <span className={clientNps >= 0 ? "text-green-400" : "text-red-400"}>{clientNps > 0 ? "+" : ""}{clientNps}</span>
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
                            backgroundColor: r.trafegoScore >= 9 ? "#22c55e" : r.trafegoScore >= 7 ? "#eab308" : "#ef4444",
                            opacity: i === client.responses.slice(0, 6).reverse().length - 1 ? 1 : 0.6,
                          }}
                        />
                      ))}
                    </div>

                    {lastResponse && (
                      <p className="text-xs text-[#8892A4] font-manrope">
                        Última avaliação: {monthLabel(lastResponse.month)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[#8892A4]/40 text-sm font-manrope">Sem avaliações ainda</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
