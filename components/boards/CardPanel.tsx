"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import type { BoardMeta, Collaborator } from "@/components/boards/types";
import {
  X, Trash2, Plus, Paperclip, GitBranch, Link2, Send, CheckSquare, Square, Clock, MessageSquare,
} from "lucide-react";

const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "A Fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "review", label: "Em Revisão" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Concluído" },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.key, s.label]));

const RELATION_OPTIONS = [
  { key: "relacionado", label: "relacionado" },
  { key: "bloqueia", label: "bloqueia" },
  { key: "bloqueado_por", label: "bloqueado por" },
  { key: "duplica", label: "duplica" },
];

const TAG_COLORS = ["#7C1EFB", "#22C55E", "#F59E0B", "#1440FF", "#EC4899", "#06B6D4", "#EF4444", "#8A8FA3"];

interface FullCard {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  createdByName: string | null;
  parentId: string | null;
  assignee: { id: string; name: string } | null;
  coAssignee: { id: string; name: string } | null;
  tag: { id: string; name: string; color: string } | null;
  parent: { id: string; code: string; title: string } | null;
  checklist: { id: string; text: string; done: boolean }[];
  attachments: { id: string; filename: string; mimeType: string; size: number; dataUrl: string; createdAt: string }[];
  subtasks: { id: string; code: string; title: string; status: string; assignee: { name: string } | null }[];
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
  activities: { id: string; actorName: string; type: string; detail: string | null; createdAt: string }[];
  relations: { id: string; type: string; card: { id: string; code: string; title: string; status: string } }[];
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CardPanel({
  cardId, board, boardCards, collaborators, onClose, onChanged, onOpenCard, onTagCreated,
}: {
  cardId: string;
  board: BoardMeta;
  boardCards: { id: string; code: string; title: string }[];
  collaborators: Collaborator[];
  onClose: () => void;
  onChanged: () => void;
  onOpenCard: (id: string) => void;
  onTagCreated: (tag: { id: string; name: string; color: string }) => void;
}) {
  const [card, setCard] = useState<FullCard | null>(null);
  const [tab, setTab] = useState<"comments" | "timeline">("comments");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [checkText, setCheckText] = useState("");
  const [comment, setComment] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [relTo, setRelTo] = useState("");
  const [relType, setRelType] = useState("relacionado");
  const [newTag, setNewTag] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCard = useCallback(async () => {
    const res = await fetch(`/api/admin/cards/${cardId}`);
    if (res.ok) {
      const data: FullCard = await res.json();
      setCard(data);
      setTitle(data.title);
      setDesc(data.description ?? "");
    }
  }, [cardId]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  async function patch(body: Record<string, unknown>, reloadBoard = true) {
    const res = await fetch(`/api/admin/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Não foi possível salvar.");
      return;
    }
    await loadCard();
    if (reloadBoard) onChanged();
  }

  async function addChecklist() {
    const text = checkText.trim();
    if (!text) return;
    setCheckText("");
    await fetch(`/api/admin/cards/${cardId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    loadCard();
    onChanged();
  }
  async function toggleChecklist(itemId: string, done: boolean) {
    await fetch(`/api/admin/cards/${cardId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, done }),
    });
    loadCard();
    onChanged();
  }
  async function delChecklist(itemId: string) {
    await fetch(`/api/admin/cards/${cardId}/checklist?itemId=${itemId}`, { method: "DELETE" });
    loadCard();
    onChanged();
  }

  async function addComment() {
    const body = comment.trim();
    if (!body) return;
    setComment("");
    await fetch(`/api/admin/cards/${cardId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    loadCard();
  }

  async function addSubtask() {
    const t = subTitle.trim();
    if (!t) return;
    setSubTitle("");
    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.id, title: t, parentId: cardId }),
    });
    loadCard();
    onChanged();
  }

  async function addRelation() {
    if (!relTo) return;
    const res = await fetch(`/api/admin/cards/${cardId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: relTo, type: relType }),
    });
    if (!res.ok) {
      toast.error("Não foi possível vincular.");
      return;
    }
    setRelTo("");
    loadCard();
  }
  async function delRelation(relId: string) {
    await fetch(`/api/admin/cards/${cardId}/relations?relId=${relId}`, { method: "DELETE" });
    loadCard();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Arquivo muito grande (máx. 1,5 MB).");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const res = await fetch(`/api/admin/cards/${cardId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    if (!res.ok) {
      toast.error("Falha ao anexar.");
      return;
    }
    loadCard();
    onChanged();
  }
  async function delAttachment(attId: string) {
    await fetch(`/api/admin/cards/${cardId}/attachments?attId=${attId}`, { method: "DELETE" });
    loadCard();
    onChanged();
  }

  async function createTag() {
    const name = newTag.trim();
    if (!name) return;
    const color = TAG_COLORS[board.tags.length % TAG_COLORS.length];
    const res = await fetch(`/api/admin/boards/${board.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      toast.error("Erro ao criar tag.");
      return;
    }
    const tag = await res.json();
    onTagCreated(tag);
    setNewTag("");
    setShowNewTag(false);
    patch({ tagId: tag.id });
  }

  async function deleteCard() {
    if (!window.confirm("Excluir este card? Essa ação remove também subtarefas, comentários e anexos.")) return;
    await fetch(`/api/admin/cards/${cardId}`, { method: "DELETE" });
    onClose();
    onChanged();
  }

  const input =
    "w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]";
  const sideLabel = "text-[11px] font-bold tracking-[0.06em] text-[#6E7285] uppercase mb-2 block";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[1040px] h-full bg-[#0B0E17] border-l border-white/10 shadow-2xl flex flex-col animate-[roi-fade-up_0.2s_ease-out]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-mono text-[#8A8FA3]">{card?.code ?? "…"}</span>
            {card?.parent && (
              <button
                onClick={() => onOpenCard(card.parent!.id)}
                className="text-[12px] text-[#A970FF] hover:underline flex items-center gap-1"
              >
                <GitBranch size={12} /> subtarefa de {card.parent.code}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={deleteCard} className="text-[#8A8FA3] hover:text-red-400 transition-all" title="Excluir card">
              <Trash2 size={17} />
            </button>
            <button onClick={onClose} className="text-[#8A8FA3] hover:text-white transition-all">
              <X size={19} />
            </button>
          </div>
        </div>

        {!card ? (
          <div className="flex-1 flex items-center justify-center text-[#8A8FA3]">Carregando…</div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main column */}
            <div className="flex-1 overflow-y-auto px-8 py-7">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== card.title && patch({ title: title.trim() })}
                rows={1}
                className="w-full bg-transparent text-[26px] font-extrabold text-white tracking-[-0.01em] resize-none focus:outline-none mb-7 leading-tight"
              />

              {/* Descrição */}
              <p className="text-[13px] font-semibold text-[#8A8FA3] mb-2">Descrição</p>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => desc !== (card.description ?? "") && patch({ description: desc || null }, false)}
                placeholder="Escreva uma descrição…"
                rows={4}
                className={`${input} mb-8 resize-y`}
              />

              {/* Checklist */}
              <SectionTitle icon={<CheckSquare size={15} />} title="Checklist"
                right={card.checklist.length > 0 ? `${card.checklist.filter((c) => c.done).length}/${card.checklist.length}` : undefined} />
              <div className="space-y-1.5 mb-3">
                {card.checklist.map((it) => (
                  <div key={it.id} className="flex items-center gap-2.5 group">
                    <button onClick={() => toggleChecklist(it.id, !it.done)} className="text-[#8A8FA3] hover:text-white">
                      {it.done ? <CheckSquare size={16} className="text-[#22C55E]" /> : <Square size={16} />}
                    </button>
                    <span className={`text-[14px] flex-1 ${it.done ? "line-through text-[#6E7285]" : "text-white"}`}>{it.text}</span>
                    <button onClick={() => delChecklist(it.id)} className="text-[#4B4F63] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-8">
                <input
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChecklist())}
                  placeholder="Adicionar item…"
                  className={input}
                />
                <button onClick={addChecklist} className="bg-[#5B21F0] hover:bg-[#4A1AD0] text-white px-3 rounded-lg transition-all">
                  <Plus size={16} />
                </button>
              </div>

              {/* Anexos */}
              <SectionTitle icon={<Paperclip size={15} />} title="Anexos" />
              <div className="space-y-2 mb-3">
                {card.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 group">
                    <Paperclip size={14} className="text-[#8A8FA3]" />
                    <a href={a.dataUrl} download={a.filename} className="text-[14px] text-white hover:text-[#A970FF] flex-1 truncate">
                      {a.filename}
                    </a>
                    <span className="text-[12px] text-[#6E7285]">{humanSize(a.size)}</span>
                    <button onClick={() => delAttachment(a.id)} className="text-[#4B4F63] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-white/[0.14] rounded-lg py-4 text-[13.5px] text-[#8A8FA3] hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-2 mb-8"
              >
                <Paperclip size={14} /> Anexar arquivo (máx. 1,5 MB)
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

              {/* Subtarefas */}
              <SectionTitle icon={<GitBranch size={15} />} title="Subtarefas" />
              <div className="space-y-1.5 mb-3">
                {card.subtasks.length === 0 && <p className="text-[13px] text-[#6E7285]">Nenhuma subtarefa.</p>}
                {card.subtasks.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onOpenCard(s.id)}
                    className="w-full flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-white/[0.16] transition-all text-left"
                  >
                    <span className="text-[11px] font-semibold rounded px-1.5 py-0.5 bg-white/[0.06] text-[#8A8FA3]">{STATUS_LABEL[s.status]}</span>
                    <span className="text-[14px] text-white flex-1 truncate">{s.title}</span>
                    <span className="text-[11px] font-mono text-[#4B4F63]">{s.code}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-8">
                <input
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                  placeholder="Nova subtarefa…"
                  className={input}
                />
                <button onClick={addSubtask} className="bg-[#5B21F0] hover:bg-[#4A1AD0] text-white px-3 rounded-lg transition-all">
                  <Plus size={16} />
                </button>
              </div>

              {/* Relações */}
              <SectionTitle icon={<Link2 size={15} />} title="Relações" />
              <div className="space-y-1.5 mb-3">
                {card.relations.length === 0 && <p className="text-[13px] text-[#6E7285]">Nenhuma relação.</p>}
                {card.relations.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 group">
                    <span className="text-[11px] font-semibold text-[#A970FF] bg-[#7C1EFB]/15 rounded px-1.5 py-0.5 whitespace-nowrap">{r.type}</span>
                    <button onClick={() => onOpenCard(r.card.id)} className="text-[14px] text-white hover:text-[#A970FF] flex-1 truncate text-left">
                      {r.card.title}
                    </button>
                    <span className="text-[11px] font-mono text-[#4B4F63]">{r.card.code}</span>
                    <button onClick={() => delRelation(r.id)} className="text-[#4B4F63] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-8">
                <select value={relType} onChange={(e) => setRelType(e.target.value)} className={`${input} max-w-[150px]`}>
                  {RELATION_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key} className="bg-[#12141F]">{o.label}</option>
                  ))}
                </select>
                <select value={relTo} onChange={(e) => setRelTo(e.target.value)} className={input}>
                  <option value="" className="bg-[#12141F]">— escolher card —</option>
                  {boardCards.filter((c) => c.id !== cardId).map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#12141F]">{c.code} · {c.title}</option>
                  ))}
                </select>
                <button onClick={addRelation} disabled={!relTo} className="bg-[#5B21F0] hover:bg-[#4A1AD0] disabled:opacity-40 text-white px-3 rounded-lg transition-all">
                  <Plus size={16} />
                </button>
              </div>

              {/* Comentários / Timeline */}
              <div className="flex items-center gap-5 border-b border-white/[0.08] mb-4">
                <button
                  onClick={() => setTab("comments")}
                  className={`pb-2.5 text-[15px] font-semibold border-b-2 -mb-px transition-all ${tab === "comments" ? "text-white border-[#7C1EFB]" : "text-[#8A8FA3] border-transparent"}`}
                >
                  <span className="flex items-center gap-1.5"><MessageSquare size={15} /> Comentários</span>
                </button>
                <button
                  onClick={() => setTab("timeline")}
                  className={`pb-2.5 text-[15px] font-semibold border-b-2 -mb-px transition-all ${tab === "timeline" ? "text-white border-[#7C1EFB]" : "text-[#8A8FA3] border-transparent"}`}
                >
                  <span className="flex items-center gap-1.5"><Clock size={15} /> Timeline</span>
                </button>
              </div>

              {tab === "comments" ? (
                <div>
                  <div className="flex gap-2 mb-5">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && addComment()}
                      placeholder="Escrever comentário… (Ctrl+Enter para enviar)"
                      rows={2}
                      className={`${input} resize-y`}
                    />
                    <button onClick={addComment} className="bg-[#5B21F0] hover:bg-[#4A1AD0] text-white px-3 rounded-lg self-stretch transition-all">
                      <Send size={16} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {card.comments.length === 0 && <p className="text-[13px] text-[#6E7285]">Sem comentários ainda.</p>}
                    {card.comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#5B21F0]/30 border border-[#7C1EFB]/40 flex items-center justify-center text-[11px] font-bold text-[#C9B8FF] flex-shrink-0">
                          {c.authorName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13.5px] font-semibold text-white">{c.authorName}</span>
                            <span className="text-[11.5px] text-[#6E7285]">{fmtDateTime(c.createdAt)}</span>
                          </div>
                          <p className="text-[14px] text-[#C7CBD9] whitespace-pre-wrap">{c.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {card.activities.length === 0 && <p className="text-[13px] text-[#6E7285]">Sem atividades.</p>}
                  {card.activities.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 text-[13.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C1EFB] flex-shrink-0" />
                      <span className="text-white font-medium">{a.actorName}</span>
                      <span className="text-[#8A8FA3]">{a.detail ?? a.type}</span>
                      <span className="text-[11.5px] text-[#4B4F63] ml-auto">{fmtDateTime(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-[300px] flex-shrink-0 border-l border-white/[0.08] overflow-y-auto px-6 py-7 space-y-6">
              <div>
                <span className={sideLabel}>Responsável</span>
                <select
                  value={card.assignee?.id ?? ""}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                  className={input}
                >
                  <option value="" className="bg-[#12141F]">— sem responsável —</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#12141F]">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className={sideLabel}>Co-responsável</span>
                <select
                  value={card.coAssignee?.id ?? ""}
                  onChange={(e) => patch({ coAssigneeId: e.target.value || null }, false)}
                  className={input}
                >
                  <option value="" className="bg-[#12141F]">— sem co-responsável —</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#12141F]">{c.name}</option>
                  ))}
                </select>
              </div>

              {card.createdByName && (
                <div>
                  <span className={sideLabel}>Criado por</span>
                  <p className="text-[14px] text-white">{card.createdByName}</p>
                </div>
              )}

              <div>
                <span className={sideLabel}>Status</span>
                <select value={card.status} onChange={(e) => patch({ status: e.target.value })} className={input}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key} className="bg-[#12141F]">{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className={sideLabel}>Tag</span>
                <select
                  value={card.tag?.id ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new") { setShowNewTag(true); return; }
                    patch({ tagId: e.target.value || null });
                  }}
                  className={input}
                >
                  <option value="" className="bg-[#12141F]">— sem tag —</option>
                  {board.tags.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#12141F]">{t.name}</option>
                  ))}
                  <option value="__new" className="bg-[#12141F]">+ nova tag…</option>
                </select>
                {showNewTag && (
                  <div className="flex gap-2 mt-2">
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createTag())}
                      placeholder="Nome da tag"
                      autoFocus
                      className={input}
                    />
                    <button onClick={createTag} className="bg-[#5B21F0] hover:bg-[#4A1AD0] text-white px-3 rounded-lg text-sm transition-all">OK</button>
                  </div>
                )}
              </div>

              <div>
                <span className={sideLabel}>Início</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(card.startDate)}
                  onChange={(e) => patch({ startDate: e.target.value || null }, false)}
                  className={`${input} [color-scheme:dark]`}
                />
              </div>

              <div>
                <span className={sideLabel}>Vencimento</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(card.dueDate)}
                  onChange={(e) => patch({ dueDate: e.target.value || null })}
                  className={`${input} [color-scheme:dark]`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, right }: { icon: React.ReactNode; title: string; right?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#A970FF]">{icon}</span>
      <span className="text-[15px] font-bold text-white">{title}</span>
      {right && <span className="text-[12px] text-[#6E7285]">{right}</span>}
    </div>
  );
}
