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
            "w-11 h-11 rounded-lg border text-sm font-bold font-titillium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#1440FF] focus:ring-offset-2 focus:ring-offset-[#00020A]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value === i
              ? "bg-[#1440FF] border-[#1440FF] text-white shadow-lg shadow-blue-900/40 scale-110"
              : "bg-[#0A0F1E] border-[#1A2140] text-[#8892A4] hover:border-[#1440FF] hover:text-white hover:bg-[#1440FF]/10"
          )}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
