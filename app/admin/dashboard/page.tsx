"use client";

import { useEffect, useState, useCallback } from "react";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, MessageSquare, Star, ChevronDown, ChevronUp, Search } from "lucide-react";

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

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white/[0.04] border border-white/10 rounded-[10px] pl-[22px] pr-11 py-4 text-[15px] text-white focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown size={14} strokeWidth={2.5} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8FA3]" />
    </div>
  );
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

      if (selectedOperator) {
        respData = respData.filter(r => r.trafego?.id === selectedOperator);
      }

      setResponses(respData);
      setClients(clientData);
      setOperators(opData);

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

  const npsAquisicao = calcNps(responses, "trafegoScore");
  const npsEntrega = calcNps(responses, "designerScore");
  const allScores = responses.flatMap(r => [r.trafegoScore, r.designerScore].filter((s): s is number => s !== null && s !== undefined));
  const total = allScores.length || 1;
  const promoters = allScores.filter(s => s >= 9).length;
  const neutrals = allScores.filter(s => s === 7 || s === 8).length;
  const detractors = allScores.filter(s => s <= 6).length;

  function toggleCollab(id: string) {
    setCollabStats(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  return (
    <div className="px-16 py-14">
      <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Dashboard</h1>
      <p className="text-base text-[#8A8FA3] mb-8">Indicadores e Resultados — {monthLabel(selectedMonth)}</p>

      {/* Filtros */}
      <div className="flex gap-3.5 mb-7 flex-wrap">
        <FilterSelect value={selectedMonth} onChange={setSelectedMonth}>
          {availableMonths().map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </FilterSelect>

        <FilterSelect value={selectedClient} onChange={setSelectedClient}>
          <option value="">Todos os Clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>

        <FilterSelect value={selectedOperator} onChange={setSelectedOperator}>
          <option value="">Todos os Operadores</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </FilterSelect>
      </div>

      {/* Métricas */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[14px] bg-white/[0.03]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          <MetricTile label="NPS — AQUISIÇÃO" value={npsAquisicao !== null ? `${npsAquisicao > 0 ? "+" : ""}${npsAquisicao}` : "—"} icon={TrendingUp} sub="Promotores – Detratores" />
          <MetricTile label="NPS — ENTREGA" value={npsEntrega !== null ? `${npsEntrega > 0 ? "+" : ""}${npsEntrega}` : "—"} icon={Star} sub="Clientes com consultor dedicado" />
          <MetricTile label="RESPOSTAS NO MÊS" value={responses.length} icon={MessageSquare} sub="Pesquisas de satisfação" />
          <MetricTile label="DISTRIBUIÇÃO" value={`${Math.round((promoters / total) * 100)}% P`} icon={BarChart3} sub={`${Math.round((neutrals / total) * 100)}% N · ${Math.round((detractors / total) * 100)}% D`} />
        </div>
      )}

      {/* Respostas do Período */}
      <div className="mb-9">
        <h2 className="text-[21px] font-extrabold text-white mb-4">Respostas do Período</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.03]" />)}
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-[70px] px-5 flex flex-col items-center justify-center gap-3.5">
            <Search size={34} strokeWidth={1.8} className="text-[#5A5F72]" />
            <p className="text-base text-[#8A8FA3]">Nenhuma resposta encontrada para este período.</p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {["Cliente","Operador","Aquisição","Entrega","Feedback","Data"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-[#8A8FA3] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} className={`border-b border-white/[0.06] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                      <td className="px-5 py-3 text-white font-medium">{r.client.name}</td>
                      <td className="px-5 py-3 text-[#8A8FA3] text-xs">{r.trafego?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{r.trafegoScore}</span>
                          <NpsLabel score={r.trafegoScore} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {r.designerScore !== null && r.designerScore !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{r.designerScore}</span>
                            <NpsLabel score={r.designerScore} />
                          </div>
                        ) : <span className="text-[#8A8FA3]/40 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-[#8A8FA3] text-xs max-w-xs truncate">{r.feedback || <span className="opacity-40">—</span>}</td>
                      <td className="px-5 py-3 text-[#8A8FA3] text-xs whitespace-nowrap">{new Date(r.submittedAt).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ranking de Operadores */}
      <div>
        <h2 className="text-[21px] font-extrabold text-white mb-4">Ranking de Operadores</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-[14px] bg-white/[0.03]" />)}
          </div>
        ) : collabStats.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-[60px] px-5 flex items-center justify-center">
            <p className="text-base text-[#8A8FA3]">Nenhum dado para este período.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {collabStats.map((c, i) => (
              <div key={c.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden">
                <button onClick={() => toggleCollab(c.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] transition-all text-left">
                  <span className="text-[#8A8FA3] font-bold text-sm w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{c.name}</p>
                    <p className="text-[#8A8FA3] text-xs">{c.role === "gestor_trafego" ? "Operador" : "Designer"}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-2xl font-bold text-white">{c.avg.toFixed(1)}</p>
                    <p className="text-xs text-[#8A8FA3]">{c.scores.length} aval.</p>
                  </div>
                  <NpsLabel score={Math.round(c.avg)} />
                  {c.expanded ? <ChevronUp size={16} className="text-[#8A8FA3] ml-2" /> : <ChevronDown size={16} className="text-[#8A8FA3] ml-2" />}
                </button>
                {c.expanded && (
                  <div className="px-5 pb-4 border-t border-white/[0.08] pt-3">
                    <p className="text-xs text-[#8A8FA3] mb-2">Avaliado por:</p>
                    <div className="flex flex-wrap gap-2">
                      {c.clients.map(name => (
                        <span key={name} className="px-2 py-1 bg-white/[0.06] rounded text-xs text-white">{name}</span>
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

function MetricTile({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-[22px]">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#7C1EFB]/25 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-[#A970FF]" />
        </div>
      </div>
      <p className="text-[32px] font-extrabold text-white leading-none my-[18px]">{value}</p>
      <p className="text-[13.5px] text-[#8A8FA3]">{sub}</p>
    </div>
  );
}
