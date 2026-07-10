"use client";

import { useEffect, useState, useCallback } from "react";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";

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

function availableMonths(count = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
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

  const byClient = new Map<string, typeof responses>();
  responses.forEach(r => {
    if (!byClient.has(r.client.id)) byClient.set(r.client.id, []);
    byClient.get(r.client.id)!.push(r);
  });

  return (
    <div className="px-16 py-14">
      <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Clientes</h1>
      <p className="text-base text-[#8A8FA3] mb-8">NPS por cliente da sua carteira</p>

      {/* Filtros */}
      <div className="flex gap-3.5 mb-7 flex-wrap">
        <FilterSelect value={selectedMonth} onChange={setSelectedMonth}>
          <option value="">Todos os períodos</option>
          {availableMonths().map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </FilterSelect>

        <FilterSelect value={selectedClient} onChange={setSelectedClient}>
          <option value="">Todos os clientes</option>
          {portfolio.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[14px] bg-white/[0.03]" />)}
        </div>
      ) : portfolio.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-[70px] px-5 flex flex-col items-center justify-center gap-3.5">
          <Search size={34} strokeWidth={1.8} className="text-[#5A5F72]" />
          <p className="text-base text-[#8A8FA3]">Nenhum cliente na carteira. Solicite ao admin para atribuir clientes.</p>
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
                <div key={client.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden">
                  <button
                    onClick={() => toggleClient(client.id)}
                    className="w-full flex items-center gap-4 px-[26px] py-5 hover:bg-white/[0.04] transition-all text-left"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold text-[15px]">{client.name}</p>
                      <p className="text-[#8A8FA3] text-xs">{clientResponses.length} avaliação{clientResponses.length !== 1 ? "ões" : ""}</p>
                    </div>

                    {avg !== null ? (
                      <div className="flex items-center gap-2 mr-3">
                        <span className="text-2xl font-extrabold text-white">{avg.toFixed(1)}</span>
                        <NpsLabel score={Math.round(avg)} />
                      </div>
                    ) : <span className="text-[#8A8FA3]/40 text-sm mr-3">Sem dados</span>}

                    <a
                      href={`/r/${client.slug}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="text-[#8A8FA3] hover:text-white transition-all"
                      title="Abrir formulário"
                    >
                      <ExternalLink size={16} />
                    </a>
                    {isExpanded ? <ChevronUp size={16} className="text-[#8A8FA3]" /> : <ChevronDown size={16} className="text-[#8A8FA3]" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/[0.08]">
                      {loadingResp ? (
                        <div className="p-4 space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.04]" />)}
                        </div>
                      ) : clientResponses.length === 0 ? (
                        <p className="px-[26px] py-4 text-[#8A8FA3] text-sm">Nenhuma avaliação para o filtro selecionado.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.08]">
                              {["Período","Nota Aquisição","Nota Entrega","Feedback","Data"].map(h => (
                                <th key={h} className="text-left px-[26px] py-2.5 text-xs font-bold text-[#8A8FA3] uppercase tracking-widest">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {clientResponses.map((r, i) => (
                              <tr key={r.id} className={`border-b border-white/[0.06] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                                <td className="px-[26px] py-3 text-[#8A8FA3] text-xs">{monthLabel(r.month)}</td>
                                <td className="px-[26px] py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-bold">{r.trafegoScore}</span>
                                    <NpsLabel score={r.trafegoScore} />
                                  </div>
                                </td>
                                <td className="px-[26px] py-3">
                                  {r.designerScore !== null && r.designerScore !== undefined ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-bold">{r.designerScore}</span>
                                      <NpsLabel score={r.designerScore} />
                                    </div>
                                  ) : <span className="text-[#8A8FA3]/40 text-xs">—</span>}
                                </td>
                                <td className="px-[26px] py-3 text-[#8A8FA3] text-xs max-w-xs truncate">
                                  {r.feedback || <span className="opacity-40">—</span>}
                                </td>
                                <td className="px-[26px] py-3 text-[#8A8FA3] text-xs whitespace-nowrap">
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
