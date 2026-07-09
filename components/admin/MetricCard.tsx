import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  highlight?: boolean;
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, sub, highlight, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[#0A0F1E] p-5 flex flex-col gap-3 transition-all",
        highlight ? "border-[#1440FF]/60 shadow-lg shadow-blue-900/20" : "border-[#1A2140]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            highlight ? "bg-[#1440FF]/20 text-[#1440FF]" : "bg-[#1A2140] text-[#8892A4]"
          )}
        >
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold font-titillium text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-[#8892A4] mt-1 font-manrope">{sub}</p>}
      </div>
    </div>
  );
}
