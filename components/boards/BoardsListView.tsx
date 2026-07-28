"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, KanbanSquare, ChevronRight } from "lucide-react";

interface Board {
  id: string;
  name: string;
  team: string | null;
  color: string;
  prefix: string;
  cardCount: number;
}

const COLORS = ["#F59E0B", "#7C1EFB", "#22C55E", "#1440FF", "#EC4899", "#06B6D4", "#EF4444"];

export function BoardsListView({ basePath }: { basePath: string }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [prefix, setPrefix] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/boards");
      setBoards(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setName("");
    setTeam("");
    setPrefix("");
    setColor(COLORS[0]);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          team: team.trim() || null,
          prefix: prefix.trim() || undefined,
          color,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Board criado!");
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao criar o board.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-16 py-14">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.01em] mb-2">Boards</h1>
          <p className="text-base text-dim">Gestão de tarefas em Kanban</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#5B21F0] hover:bg-[#4A1AD0] text-white text-[15px] font-bold px-[22px] py-3.5 rounded-[10px] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo Board
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[14px] bg-surface" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="bg-surface border border-line rounded-[14px] py-[70px] px-5 flex flex-col items-center justify-center gap-3.5">
          <KanbanSquare size={34} strokeWidth={1.6} className="text-faint" />
          <p className="text-base text-dim">Nenhum board ainda. Crie o primeiro para organizar as tarefas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`${basePath}/${b.id}`}
              className="group bg-surface border border-line rounded-[14px] p-6 hover:bg-surface-hover hover:border-line-strong transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-9 rounded-full" style={{ backgroundColor: b.color }} />
                  <div>
                    <p className="text-[19px] font-extrabold text-ink leading-tight">{b.name}</p>
                    {b.team && <p className="text-[13px] text-dim mt-0.5">{b.team}</p>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-faint group-hover:text-brand-soft transition-all" />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <span className="text-[12px] font-mono text-dim bg-surface-hover border border-line rounded-md px-2 py-0.5">
                  {b.prefix}
                </span>
                <span className="text-[13px] text-dim">
                  {b.cardCount} {b.cardCount === 1 ? "card" : "cards"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-raised border-line text-ink max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans">Novo Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-dim block mb-1">Nome do board</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marketing"
                autoFocus
                className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              />
            </div>
            <div>
              <label className="text-xs text-dim block mb-1">Time <span className="opacity-60">(opcional)</span></label>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ex: Marketing / Design"
                className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              />
            </div>
            <div>
              <label className="text-xs text-dim block mb-1">
                Prefixo dos cards <span className="opacity-60">(opcional — ex: MAR → MAR-1)</span>
              </label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Automático a partir do nome"
                className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              />
            </div>
            <div>
              <label className="text-xs text-dim block mb-2">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-raised ring-white/70" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-surface-hover hover:bg-surface-hover text-ink font-semibold text-sm py-2.5 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#5B21F0] hover:bg-[#4A1AD0] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-all"
              >
                {saving ? "Criando..." : "Criar board"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
