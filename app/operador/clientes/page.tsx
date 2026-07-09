"use client";

import { useEffect, useState, useCallback } from "react";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface NpsResponse {
  id: string;
  month: string;
  trafegoScore: number;
  designerScore: number | null;
  feedback: string | null;
  submittedAt: string;
}

interface ClientNps {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  responses: NpsResponse[];
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function availableMonths(count = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

export default function OperadorClientesPage() {
  const [portfolio, setPortfolio] = useState<ClientNps[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [responses, setResponses] = useState<(NpsResponse & { client: { id: string; name: string } })[]>([]);
  const [loadingResp, setLoadingResp] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/operador/portfolio")
      .then(r => r.json())
      .then(setPortfolio)
      .finally(() => setLoading(false));
  }, []);

  const loadResponses = useCallback(async () => {
    setLoadingResp(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set("month", selectedMonth);
      if (selectedClient) params.set("clientId", selectedClient);
      const res = await fetch(`/api/operador/responses?${params}`);
      const data = await res.json();
      setResponses(data);
    } finally {
      setLoadingResp(false);
    }
  }, [selectedMonth, selectedClient]);

  useEffect(() => { loadResponses(); }, [loadResponses]);

  function toggleClient(id: string) {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Group responses by client
  const byClient = new Map<string, typeof responses>();
  responses.forEach(r => {
    if (!byClient.has(r.client.id)) byClient.set(r.client.id, []);
    byClient.get(r.client.id)!.push(r);
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-titillium text-white">Clientes</h1>
        <p className="text-[#8892A4] font-manrope text-sm mt-1">NPS por cliente da sua carteira</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
        >
          <option value="">Todos os períodos</option>
          {availableMonths().map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>

        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          className="bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
        >
          <option value="">Todos os clientes</option>
          {portfolio.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0A0F1E]" />)}
        </div>
      ) : portfolio.length === 0 ? (
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🏎️</p>
          <p className="text-white font-titillium font-semibold mb-1">Nenhum cliente na carteira</p>
          <p className="text-[#8892A4] font-manrope text-sm">Solicite ao admin para atribuir clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolio
            .filter(c => !selectedClient || c.id === selectedClient)
            .map(client => {
              const clientResponses = byClient.get(client.id) ?? [];
              const isExpanded = expandedClients.has(client.id);
              const scores = clientResponses.map(r => r.trafegoScore);
              const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

              return (
                <div key={client.id} className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleClient(client.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#1A2140]/30 transition-all text-left"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold font-manrope text-sm">{client.name}</p>
                      <p className="text-[#8892A4] font-manrope text-xs">{clientResponses.length} avaliação{clientResponses.length !== 1 ? "ões" : ""}</p>
                    </div>

                    {avg !== null ? (
                      <div className="flex items-center gap-2 mr-3">
                        <span className="text-2xl font-bold font-titillium text-white">{avg.toFixed(1)}</span>
                        <NpsLabel score={Math.round(avg)} />
                      </div>
                    ) : <span className="text-[#8892A4]/40 text-sm mr-3">Sem dados</span>}

                    <a
                      href={`/r/${client.slug}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-[#1A2140] text-[#8892A4] hover:text-white transition-all"
                      title="Abrir formulário"
                    >
                      <ExternalLink size={14} />
                    </a>
                    {isExpanded ? <ChevronUp size={16} className="text-[#8892A4]" /> : <ChevronDown size={16} className="text-[#8892A4]" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#1A2140]">
                      {loadingResp ? (
                        <div className="p-4 space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg bg-[#1A2140]" />)}
                        </div>
                      ) : clientResponses.length === 0 ? (
                        <p className="px-5 py-4 text-[#8892A4] text-sm font-manrope">Nenhuma avaliação para o filtro selecionado.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#1A2140]">
                              {["Período","Nota Tráfego","Nota Criativos","Feedback","Data"].map(h => (
                                <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {clientResponses.map((r, i) => (
                              <tr key={r.id} className={`border-b border-[#1A2140]/30 ${i % 2 === 1 ? "bg-[#1A2140]/10" : ""}`}>
                                <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs">{monthLabel(r.month)}</td>
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
                                <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs max-w-xs truncate">
                                  {r.feedback || <span className="opacity-40">—</span>}
                                </td>
                                <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs whitespace-nowrap">
                                  {new Date(r.submittedAt).toLocaleDateString("pt-BR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
