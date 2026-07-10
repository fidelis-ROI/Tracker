"use client";

import { cn } from "@/lib/utils";

interface RatingScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingScale({ value, onChange, disabled }: RatingScaleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          className={cn(
            "w-11 h-11 rounded-lg border text-sm font-bold transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] focus:ring-offset-2 focus:ring-offset-[#0B0E17]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value === i
              ? "bg-[#7919FF] border-[#7919FF] text-white shadow-lg shadow-[#7919FF]/40 scale-110"
              : "bg-white/[0.03] border-white/10 text-[#8A8FA3] hover:border-[#7919FF] hover:text-white hover:bg-[#7919FF]/10"
          )}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
