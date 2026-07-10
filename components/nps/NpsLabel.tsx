import { cn } from "@/lib/utils";

interface NpsLabelProps {
  score: number;
  className?: string;
}

export function getNpsCategory(score: number) {
  if (score <= 6) return { label: "Detrator", dot: "bg-[#F87171]", text: "text-[#F87171]", bg: "bg-[#EF4444]/[0.12] border-[#EF4444]/30" };
  if (score <= 8) return { label: "Neutro", dot: "bg-[#EAB308]", text: "text-[#EAB308]", bg: "bg-[#EAB308]/[0.12] border-[#EAB308]/30" };
  return { label: "Promotor", dot: "bg-[#4ADE80]", text: "text-[#4ADE80]", bg: "bg-[#22C55E]/[0.12] border-[#22C55E]/30" };
}

export function NpsLabel({ score, className }: NpsLabelProps) {
  const { label, dot, text, bg } = getNpsCategory(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[13px] font-semibold",
        bg,
        text,
        className
      )}
    >
      <span className={cn("w-[7px] h-[7px] rounded-full", dot)} />
      {label}
    </span>
  );
}
