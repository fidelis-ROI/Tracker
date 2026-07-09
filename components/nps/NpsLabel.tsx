import { cn } from "@/lib/utils";

interface NpsLabelProps {
  score: number;
  className?: string;
}

export function getNpsCategory(score: number) {
  if (score <= 6) return { label: "Detrator", emoji: "🔴", color: "text-red-400", bg: "bg-red-900/30 border-red-800" };
  if (score <= 8) return { label: "Neutro", emoji: "🟡", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-800" };
  return { label: "Promotor", emoji: "🟢", color: "text-green-400", bg: "bg-green-900/30 border-green-800" };
}

export function NpsLabel({ score, className }: NpsLabelProps) {
  const { label, emoji, color, bg } = getNpsCategory(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold font-titillium",
        bg,
        color,
        className
      )}
    >
      {emoji} {label}
    </span>
  );
}
