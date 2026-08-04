"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, AtSign, UserPlus, Check } from "lucide-react";

interface Notif {
  id: string;
  type: string; // "assigned" | "mention"
  actorName: string;
  cardId: string | null;
  boardId: string | null;
  cardCode: string | null;
  cardTitle: string | null;
  context: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function label(n: Notif) {
  if (n.type === "assigned") return `${n.actorName} atribuiu um card a você`;
  if (n.type === "mention") {
    const onde = n.context === "description" ? "na descrição" : "em um comentário";
    return `${n.actorName} mencionou você ${onde}`;
  }
  return n.actorName;
}

export function NotificationBell({ boardsBase }: { boardsBase: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markAll() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function openNotif(n: Notif) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
    }
    if (n.boardId && n.cardId) {
      router.push(`${boardsBase}/${n.boardId}?card=${n.cardId}`);
    } else if (n.boardId) {
      router.push(`${boardsBase}/${n.boardId}`);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-[10px] flex items-center justify-center text-dim hover:text-ink hover:bg-surface-hover border border-transparent transition-all"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#5B21F0] text-white text-[10.5px] font-bold flex items-center justify-center border-2 border-canvas">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-[330px] bg-raised border border-line rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.28)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-[14px] font-bold text-ink">Notificações</span>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-[12px] text-dim hover:text-ink transition-all">
                <Check size={13} /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-faint">Nenhuma notificação.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotif(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-line last:border-0 transition-all hover:bg-surface-hover ${n.read ? "" : "bg-[#5B21F0]/[0.06]"}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === "mention" ? "bg-[#1440FF]/20 text-info" : "bg-[#5B21F0]/20 text-brand-soft"}`}>
                    {n.type === "mention" ? <AtSign size={15} /> : <UserPlus size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink leading-snug">{label(n)}</p>
                    {(n.cardCode || n.cardTitle) && (
                      <p className="text-[12px] text-dim truncate mt-0.5">
                        {n.cardCode ? <span className="font-mono text-faint">{n.cardCode}</span> : null} {n.cardTitle}
                      </p>
                    )}
                    <p className="text-[11px] text-faint mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#5B21F0] flex-shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
