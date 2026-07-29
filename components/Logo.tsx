import { cn } from "@/lib/utils";

/**
 * Logo oficial ROI. Duas artes (tema claro/escuro) trocadas por CSS conforme
 * a classe .dark no <html> — sem flash de hidratação.
 * `roi-logo-light.png` = wordmark escuro (fundo claro).
 * `roi-logo-dark.png`  = wordmark branco (fundo escuro).
 * Imagem simples (não next/image) — é um asset pequeno e evita depender do
 * otimizador de imagens em produção.
 */
export function LogoImage({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/roi-logo-light.png" alt="ROI" className={cn("w-auto dark:hidden", imgClassName)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/roi-logo-dark.png" alt="ROI" className={cn("w-auto hidden dark:block", imgClassName)} />
    </span>
  );
}

/** Logo + subtítulo (usado nas sidebars). */
export function Logo({
  subtitle,
  imgClassName = "h-8",
  className,
}: {
  subtitle?: string;
  imgClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <LogoImage imgClassName={imgClassName} />
      {subtitle && <span className="text-dim text-[12.5px] leading-tight">{subtitle}</span>}
    </div>
  );
}
