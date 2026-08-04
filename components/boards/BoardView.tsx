"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CardPanel } from "@/components/boards/CardPanel";
import type { KanbanCard, BoardMeta, Collaborator } from "@/components/boards/types";
import { ArrowLeft, Plus, MessageSquare, Paperclip, CheckSquare, GitBranch, ListFilter, X, AlertTriangle, ChevronDown } from "lucide-react";

const COLUMNS: { key: string; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "A Fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "review", label: "Em Revisão" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Concluído" },
];

const COLUMN_ACCENT: Record<string, string> = {
  backlog: "#8A8FA3",
  todo: "#5B8DFF",
  doing: "#F59E0B",
  review: "#A970FF",
  blocked: "#EF4444",
  done: "#22C55E",
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "#22C55E" },
  media: { label: "Média", color: "#F59E0B" },
  alta: { label: "Alta", color: "#EF4444" },
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

function FilterSelect({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-lg border pl-3 pr-7 py-1.5 text-[12.5px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] transition-colors ${
          value ? "bg-brand-tint border-brand/40 text-brand font-semibold" : "bg-surface border-line text-dim hover:text-ink"
        }`}
      >
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  );
}

function dueLabel(due: string | null) {
  if (!due) return null;
  const d = new Date(due);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const overdue = days < 0;
  return { label: `Venc. ${label}`, overdue, soon: days >= 0 && days <= 2 };
}

export function BoardView({ boardId, basePath }: { boardId: string; basePath: string }) {
  const [board, setBoard] = useState<BoardMeta | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [fAssignee, setFAssignee] = useState("");
  const [fTag, setFTag] = useState("");
  const [fPriority, setFPriority] = useState("");

  const load = useCallback(async () => {
    try {
      const [boardRes, collabRes] = await Promise.all([
        fetch(`/api/admin/boards/${boardId}`),
        fetch("/api/admin/collaborators"),
      ]);
      if (boardRes.ok) {
        const data = await boardRes.json();
        setBoard(data.board);
        setCards(data.cards);
      }
      if (collabRes.ok) setCollaborators(await collabRes.json());
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link vindo de uma notificação: ?card=<id> abre o painel do card.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("card");
    if (c) setOpenCardId(c);
  }, []);

  async function moveCard(cardId: string, status: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === status) return;
    // otimista
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status } : c)));
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Não foi possível mover o card.");
      load();
    }
  }

  async function quickAdd(status: string) {
    const title = newTitle.trim();
    if (!title) {
      setAdding(null);
      return;
    }
    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, title, status }),
      });
      if (!res.ok) throw new Error();
      setNewTitle("");
      setAdding(null);
      load();
    } catch {
      toast.error("Erro ao criar o card.");
    }
  }

  const filtersActive = !!(fAssignee || fTag || fPriority);
  const matchesFilters = (c: KanbanCard) =>
    (!fAssignee || c.assignee?.id === fAssignee) &&
    (!fTag || c.tag?.id === fTag) &&
    (!fPriority || c.priority === fPriority);

  const byColumn = (status: string) =>
    cards.filter((c) => c.status === status && matchesFilters(c)).sort((a, b) => a.order - b.order);

  return (
    <div className="px-8 py-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <Link href={basePath} className="flex items-center gap-1.5 text-[13px] text-dim hover:text-ink transition-all mb-2">
            <ArrowLeft size={14} /> Boards
          </Link>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 rounded-full" style={{ backgroundColor: board?.color ?? "#8A8FA3" }} />
            <div>
              <h1 className="text-[26px] font-extrabold text-ink tracking-[-0.01em] leading-tight">
                {board?.name ?? <span className="opacity-40">Carregando…</span>}
              </h1>
              {board?.team && <p className="text-[13px] text-dim">{board.team}</p>}
            </div>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ListFilter size={15} className="text-faint" />
            <FilterSelect value={fAssignee} onChange={setFAssignee} label="Pessoa">
              <option value="">Todas as pessoas</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={fTag} onChange={setFTag} label="Tag">
              <option value="">Todas as tags</option>
              {board?.tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={fPriority} onChange={setFPriority} label="Prioridade">
              <option value="">Todas as prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </FilterSelect>
            {filtersActive && (
              <button
                onClick={() => { setFAssignee(""); setFTag(""); setFPriority(""); }}
                className="flex items-center gap-1 text-[12.5px] text-dim hover:text-ink px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-all"
              >
                <X size={13} /> Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-6 gap-4 flex-1">
          {COLUMNS.map((c) => (
            <Skeleton key={c.key} className="rounded-[14px] bg-surface" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const colCards = byColumn(col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                onDrop={() => {
                  if (dragId) moveCard(dragId, col.key);
                  setDragId(null);
                  setDragOverCol(null);
                }}
                className={`w-[300px] flex-shrink-0 flex flex-col rounded-[14px] border transition-colors ${
                  dragOverCol === col.key
                    ? "border-[#7C1EFB]/50 bg-[#7C1EFB]/[0.06]"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLUMN_ACCENT[col.key] }} />
                    <span className="text-[14px] font-bold text-ink">{col.label}</span>
                    <span className="text-[12px] text-faint">{colCards.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAdding(col.key);
                      setNewTitle("");
                    }}
                    className="text-dim hover:text-ink transition-all"
                    title="Adicionar card"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {colCards.map((card) => {
                    const due = dueLabel(card.dueDate);
                    const overdue = !!(due && due.overdue);
                    const prio = card.priority ? PRIORITY_META[card.priority] : null;
                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDragId(card.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setOpenCardId(card.id)}
                        className={`bg-raised border border-line rounded-[11px] p-3.5 cursor-pointer hover:border-line-strong transition-all ${
                          overdue ? "border-l-[3px] border-l-danger" : ""
                        } ${dragId === card.id ? "opacity-40" : ""}`}
                      >
                        {(card.tag || prio) && (
                          <div className="flex items-center flex-wrap gap-1.5 mb-2">
                            {prio && (
                              <span
                                className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded px-1.5 py-0.5"
                                style={{ backgroundColor: `${prio.color}22`, color: prio.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prio.color }} />
                                {prio.label}
                              </span>
                            )}
                            {card.tag && (
                              <span
                                className="inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                                style={{ backgroundColor: `${card.tag.color}22`, color: card.tag.color }}
                              >
                                {card.tag.name}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[14.5px] font-semibold text-ink leading-snug mb-2.5">{card.title}</p>

                        {due && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-0.5 mb-2 ${
                              overdue
                                ? "bg-danger/15 text-danger"
                                : due.soon
                                ? "bg-warning/15 text-warning"
                                : "bg-surface-hover text-dim"
                            }`}
                          >
                            {overdue && <AlertTriangle size={11} />}
                            {overdue ? `Atrasado · ${due.label.replace("Venc. ", "")}` : due.label}
                          </span>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2.5 text-[11.5px] text-faint">
                            {card.counts.checklistTotal > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare size={12} />
                                {card.counts.checklistDone}/{card.counts.checklistTotal}
                              </span>
                            )}
                            {card.counts.subtasks > 0 && (
                              <span className="flex items-center gap-1">
                                <GitBranch size={12} />
                                {card.counts.subtasks}
                              </span>
                            )}
                            {card.counts.comments > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare size={12} />
                                {card.counts.comments}
                              </span>
                            )}
                            {card.counts.attachments > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip size={12} />
                                {card.counts.attachments}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {card.assignee ? (
                              <span
                                className="w-6 h-6 rounded-full bg-[#5B21F0]/30 border border-[#7C1EFB]/40 flex items-center justify-center text-[10px] font-bold text-[#C9B8FF]"
                                title={card.assignee.name}
                              >
                                {initials(card.assignee.name)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-[10.5px] font-mono text-faint mt-2">{card.code}</p>
                      </div>
                    );
                  })}

                  {adding === col.key ? (
                    <div className="bg-raised border border-[#7C1EFB]/40 rounded-[11px] p-2.5">
                      <textarea
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            quickAdd(col.key);
                          }
                          if (e.key === "Escape") setAdding(null);
                        }}
                        onBlur={() => quickAdd(col.key)}
                        placeholder="Título do card…"
                        rows={2}
                        className="w-full bg-transparent text-[14px] text-ink placeholder:text-faint resize-none focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAdding(col.key);
                        setNewTitle("");
                      }}
                      className="w-full flex items-center gap-1.5 text-[13px] text-faint hover:text-ink px-2 py-2 rounded-lg hover:bg-surface transition-all"
                    >
                      <Plus size={14} /> Adicionar card
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openCardId && board && (
        <CardPanel
          cardId={openCardId}
          board={board}
          boardCards={cards.map((c) => ({ id: c.id, code: c.code, title: c.title }))}
          collaborators={collaborators}
          onClose={() => setOpenCardId(null)}
          onChanged={load}
          onOpenCard={(cid) => setOpenCardId(cid)}
          onTagCreated={(tag) => setBoard((b) => (b ? { ...b, tags: [...b.tags, tag] } : b))}
        />
      )}
    </div>
  );
}
