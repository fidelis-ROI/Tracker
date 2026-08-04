"use client";

import { useRef, useState } from "react";

export interface MentionPerson {
  id: string;
  name: string;
}

// Regex do token @query imediatamente antes do cursor (início ou após espaço).
const TOKEN_RE = /(?:^|\s)@([\p{L}\p{N}._-]*)$/u;

/**
 * Textarea com autocomplete de menções (@pessoa). Ao escolher alguém, insere
 * "@Nome " no texto e chama onPick(id) para o pai registrar quem foi mencionado.
 */
export function MentionTextarea({
  value,
  onChange,
  people,
  onPick,
  placeholder,
  rows = 3,
  className = "",
  onSubmitShortcut,
  onBlur,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  people: MentionPerson[];
  onPick?: (id: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onSubmitShortcut?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const matches =
    query !== null
      ? people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : [];

  function refreshQuery(text: string, caret: number) {
    const m = TOKEN_RE.exec(text.slice(0, caret));
    setQuery(m ? m[1] : null);
    setActive(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    refreshQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function pick(p: MentionPerson) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const upto = value.slice(0, caret).replace(/@([\p{L}\p{N}._-]*)$/u, `@${p.name} `);
    const next = upto + value.slice(caret);
    onChange(next);
    onPick?.(p.id);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(upto.length, upto.length);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && matches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active]); return; }
      if (e.key === "Escape") { e.preventDefault(); setQuery(null); return; }
    }
    if (onSubmitShortcut && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmitShortcut();
    }
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => { setTimeout(() => setQuery(null), 120); onBlur?.(); }}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute z-50 left-2 bottom-full mb-1 w-56 max-h-56 overflow-y-auto bg-raised border border-line rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          {matches.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-all ${i === active ? "bg-[#5B21F0]/20 text-ink" : "text-dim hover:bg-surface-hover hover:text-ink"}`}
            >
              <span className="text-brand-soft font-semibold">@</span>{p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
