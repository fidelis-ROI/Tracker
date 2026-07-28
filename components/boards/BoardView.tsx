"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CardPanel } from "@/components/boards/CardPanel";
import type { KanbanCard, BoardMeta, Collaborator } from "@/components/boards/types";
import { ArrowLeft, Plus, MessageSquare, Paperclip, CheckSquare, GitBranch } from "lucide-react";

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

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
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

  const byColumn = (status: string) =>
    cards.filter((c) => c.status === status).sort((a, b) => a.order - b.order);

  return (
    <div className="px-8 py-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <Link href={basePath} className="flex items-center gap-1.5 text-[13px] text-[#8A8FA3] hover:text-white transition-all mb-2">
            <ArrowLeft size={14} /> Boards
          </Link>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 rounded-full" style={{ backgroundColor: board?.color ?? "#8A8FA3" }} />
            <div>
              <h1 className="text-[26px] font-extrabold text-white tracking-[-0.01em] leading-tight">
                {board?.name ?? <span className="opacity-40">Carregando…</span>}
              </h1>
              {board?.team && <p className="text-[13px] text-[#8A8FA3]">{board.team}</p>}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-6 gap-4 flex-1">
          {COLUMNS.map((c) => (
            <Skeleton key={c.key} className="rounded-[14px] bg-white/[0.03]" />
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
                    : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLUMN_ACCENT[col.key] }} />
                    <span className="text-[14px] font-bold text-white">{col.label}</span>
                    <span className="text-[12px] text-[#6E7285]">{colCards.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAdding(col.key);
                      setNewTitle("");
                    }}
                    className="text-[#8A8FA3] hover:text-white transition-all"
                    title="Adicionar card"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {colCards.map((card) => {
                    const due = dueLabel(card.dueDate);
                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDragId(card.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setOpenCardId(card.id)}
                        className={`bg-[#12141F] border border-white/[0.09] rounded-[11px] p-3.5 cursor-pointer hover:border-white/[0.18] transition-all ${
                          dragId === card.id ? "opacity-40" : ""
                        }`}
                      >
                        {card.tag && (
                          <span
                            className="inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 mb-2"
                            style={{ backgroundColor: `${card.tag.color}22`, color: card.tag.color }}
                          >
                            {card.tag.name}
                          </span>
                        )}
                        <p className="text-[14.5px] font-semibold text-white leading-snug mb-2.5">{card.title}</p>

                        {due && (
                          <span
                            className={`inline-block text-[11px] font-semibold rounded-md px-2 py-0.5 mb-2 ${
                              due.overdue
                                ? "bg-red-500/15 text-red-400"
                                : due.soon
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/[0.06] text-[#8A8FA3]"
                            }`}
                          >
                            {due.label}
                          </span>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2.5 text-[11.5px] text-[#6E7285]">
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
                        <p className="text-[10.5px] font-mono text-[#4B4F63] mt-2">{card.code}</p>
                      </div>
                    );
                  })}

                  {adding === col.key ? (
                    <div className="bg-[#12141F] border border-[#7C1EFB]/40 rounded-[11px] p-2.5">
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
                        className="w-full bg-transparent text-[14px] text-white placeholder:text-[#6E7285] resize-none focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAdding(col.key);
                        setNewTitle("");
                      }}
                      className="w-full flex items-center gap-1.5 text-[13px] text-[#6E7285] hover:text-white px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
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
