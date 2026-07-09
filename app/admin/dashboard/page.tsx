"use client";

import { useEffect, useState, useCallback } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, TrendingUp, MessageSquare, Star, ChevronDown, ChevronUp } from "lucide-react";

interface Response {
  id: string;
  month: string;
  trafegoScore: number;
  designerScore: number | null;
  feedback: string | null;
  submittedAt: string;
  client: { id: string; name: string };
  trafego: { id: string; name: string } | null;
  designer: { id: string; name: string } | null;
}

interface Collaborator { id: string; name: string; role: string; }
interface Client { id: string; name: string; }
interface CollabStat {
  id: string; name: string; role: string; scores: number[];
  avg: number; clients: string[]; expanded: boolean;
}

function currentMonth() { return new Date().toISOString().slice(0, 7); }

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

function availableMonths(count = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function calcNps(responses: Response[], field: "trafegoScore" | "designerScore") {
  const scores = responses.map(r => r[field]).filter((s): s is number => s !== null && s !== undefined);
  if (!scores.length) return null;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

export default function DashboardPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [operators, setOperators] = useState<Collaborator[]>([]);
  const [collabStats, setCollabStats] = useState<CollabStat[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedClient) params.set("clientId", selectedClient);

      const [respRes, clientRes, opRes] = await Promise.all([
        fetch(`/api/admin/responses?${params}`),
        fetch("/api/admin/clients"),
        fetch("/api/admin/collaborators?role=gestor_trafego"),
      ]);

      let respData: Response[] = await respRes.json();
      const clientData: Client[] = await clientRes.json();
      const opData: Collaborator[] = await opRes.json();

      // Filtro por operador no cliente
      if (selectedOperator) {
        respData = respData.filter(r => r.trafego?.id === selectedOperator);
      }

      setResponses(respData);
      setClients(clientData);
      setOperators(opData);

      // Stats por colaborador
      const statsMap = new Map<string, CollabStat>();
      respData.forEach((r) => {
        if (r.trafego) {
          const key = r.trafego.id;
          if (!statsMap.has(key)) {
            statsMap.set(key, { id: key, name: r.trafego.name, role: "gestor_trafego", scores: [], avg: 0, clients: [], expanded: false });
          }
          const s = statsMap.get(key)!;
          s.scores.push(r.trafegoScore);
          if (!s.clients.includes(r.client.name)) s.clients.push(r.client.name);
        }
        if (r.designer && r.designerScore !== null) {
          const key = r.designer.id;
          if (!statsMap.has(key)) {
            statsMap.set(key, { id: key, name: r.designer.name, role: "designer", scores: [], avg: 0, clients: [], expanded: false });
          }
          const s = statsMap.get(key)!;
          s.scores.push(r.designerScore!);
          if (!s.clients.includes(r.client.name)) s.clients.push(r.client.name);
        }
      });

      statsMap.forEach(s => {
        s.avg = s.scores.length > 0 ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10 : 0;
      });

      setCollabStats(Array.from(statsMap.values()).sort((a, b) => b.avg - a.avg));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedClient, selectedOperator]);

  useEffect(() => { loadData(); }, [loadData]);

  const npsTrafico = calcNps(responses, "trafegoScore");
  const npsDesigner = calcNps(responses, "designerScore");
  const allScores = responses.flatMap(r => [r.trafegoScore, r.designerScore].filter((s): s is number => s !== null && s !== undefined));
  const total = allScores.length || 1;
  const promoters = allScores.filter(s => s >= 9).length;
  const neutrals = allScores.filter(s => s === 7 || s === 8).length;
  const detractors = allScores.filter(s => s <= 6).length;

  function toggleCollab(id: string) {
    setCollabStats(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Performance & Resultados — ${monthLabel(selectedMonth)}`}
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
        >
          {availableMonths().map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>

        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          className="bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
        >
          <option value="">Todos os Clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={selectedOperator}
          onChange={e => setSelectedOperator(e.target.value)}
          className="bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
        >
          <option value="">Todos os Operadores</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Métricas */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-[#0A0F1E]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <MetricCard label="NPS — Tráfego" value={npsTrafico !== null ? `${npsTrafico > 0 ? "+" : ""}${npsTrafico}` : "—"} icon={TrendingUp} sub="Promotores − Detratores" highlight />
          <MetricCard label="NPS — Criativos" value={npsDesigner !== null ? `${npsDesigner > 0 ? "+" : ""}${npsDesigner}` : "—"} icon={Star} sub="Clientes com designer" />
          <MetricCard label="Respostas no Mês" value={responses.length} icon={MessageSquare} sub="Pit Stop Reports" />
          <MetricCard label="Distribuição" value={`${Math.round((promoters / total) * 100)}% P`} icon={BarChart3} sub={`${Math.round((neutrals / total) * 100)}% N · ${Math.round((detractors / total) * 100)}% D`} />
        </div>
      )}

      {/* Tabela de Respostas */}
      <div className="mb-8">
        <h2 className="text-lg font-bold font-titillium text-white mb-4">Respostas do Período</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-[#0A0F1E]" />)}
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">🏁</p>
            <p className="text-[#8892A4] font-manrope text-sm">Nenhuma resposta encontrada para este período.</p>
          </div>
        ) : (
          <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A2140]">
                    {["Cliente","Operador","Tráfego","Criativos","Feedback","Data"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} className={`border-b border-[#1A2140]/50 ${i % 2 === 1 ? "bg-[#1A2140]/10" : ""}`}>
                      <td className="px-5 py-3 text-white font-manrope font-medium">{r.client.name}</td>
                      <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs">{r.trafego?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold font-titillium">{r.trafegoScore}</span>
                          <NpsLabel score={r.trafegoScore} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {r.designerScore !== null && r.designerScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold font-titillium">{r.designerScore}</span>
                            <NpsLabel score={r.designerScore} />
                          </div>
                        ) : <span className="text-[#8892A4]/40 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs max-w-xs truncate">{r.feedback || <span className="opacity-40">—</span>}</td>
                      <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs whitespace-nowrap">{new Date(r.submittedAt).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ranking Operadores */}
      <div>
        <h2 className="text-lg font-bold font-titillium text-white mb-4">Ranking de Operadores</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-[#0A0F1E]" />)}
          </div>
        ) : collabStats.length === 0 ? (
          <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-8 text-center">
            <p className="text-[#8892A4] font-manrope text-sm">Nenhum dado para este período.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {collabStats.map((c, i) => (
              <div key={c.id} className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl overflow-hidden">
                <button onClick={() => toggleCollab(c.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#1A2140]/30 transition-all text-left">
                  <span className="text-[#8892A4] font-titillium font-bold text-sm w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-white font-semibold font-manrope text-sm">{c.name}</p>
                    <p className="text-[#8892A4] text-xs font-manrope">{c.role === "gestor_trafego" ? "Operador" : "Designer"}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-2xl font-bold font-titillium text-white">{c.avg.toFixed(1)}</p>
                    <p className="text-xs text-[#8892A4] font-manrope">{c.scores.length} aval.</p>
                  </div>
                  <NpsLabel score={Math.round(c.avg)} />
                  {c.expanded ? <ChevronUp size={16} className="text-[#8892A4] ml-2" /> : <ChevronDown size={16} className="text-[#8892A4] ml-2" />}
                </button>
                {c.expanded && (
                  <div className="px-5 pb-4 border-t border-[#1A2140] pt-3">
                    <p className="text-xs text-[#8892A4] font-manrope mb-2">Avaliado por:</p>
                    <div className="flex flex-wrap gap-2">
                      {c.clients.map(name => (
                        <span key={name} className="px-2 py-1 bg-[#1A2140] rounded text-xs text-white font-manrope">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
