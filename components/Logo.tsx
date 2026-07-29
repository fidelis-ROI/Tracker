import { cn } from "@/lib/utils";

/**
 * Marca ROI (símbolo roxo). Reconstruído em SVG a partir do logo enviado —
 * barra superior + flâmula apontada + quadrado inferior. Sempre roxo (funciona
 * nos dois temas).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 29 40" fill="none" className={cn("w-auto", className)} aria-hidden="true">
      <rect x="0" y="0" width="29" height="11" rx="3" fill="#7C1EFB" />
      <path d="M17.5 14.5 H29 V40 L17.5 27 Z" fill="#7C1EFB" />
      <rect x="0" y="28.5" width="11" height="11" rx="3" fill="#7C1EFB" />
    </svg>
  );
}

/**
 * Logo completa: símbolo + wordmark "ROI" (herda a cor do texto, então fica
 * preto no tema claro e branco no escuro) + subtítulo opcional.
 */
export function Logo({
  subtitle,
  markClassName = "h-9",
  wordClassName = "text-[23px]",
  className,
}: {
  subtitle?: string;
  markClassName?: string;
  wordClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={cn("flex-shrink-0", markClassName)} />
      <div className="leading-none">
        <span className={cn("block font-manrope font-extrabold text-ink tracking-[-0.03em]", wordClassName)}>ROI</span>
        {subtitle && <span className="block text-dim text-[12.5px] mt-1 leading-tight">{subtitle}</span>}
      </div>
    </div>
  );
}
