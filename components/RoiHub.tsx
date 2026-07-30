"use client";

import { toast } from "sonner";
import { LogoImage } from "@/components/Logo";
import { BookOpen, Download, Copy, ExternalLink, ReceiptText, Info, Palette } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Conteúdo editável — ajuste aqui os links e os dados da empresa.
 * ------------------------------------------------------------------ */
const ABOUT =
  "A ROI é uma agência de performance focada em transformar dados em decisão. " +
  "Este espaço reúne os materiais oficiais da marca e as informações que o time " +
  "precisa no dia a dia.";

const BRAND_MANUAL_URL = ""; // TODO: URL do manual de marca (deixe vazio para ocultar o botão)

// Dados para emissão de nota fiscal. Preencha com os dados reais.
const NF_DATA: { label: string; value: string }[] = [
  { label: "Razão social", value: "" },
  { label: "Nome fantasia", value: "" },
  { label: "CNPJ", value: "" },
  { label: "Inscrição municipal", value: "" },
  { label: "Endereço", value: "" },
  { label: "E-mail financeiro", value: "" },
];

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,20,40,0.05)] ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function RoiHub() {
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  }

  const hasNf = NF_DATA.some((f) => f.value.trim());

  return (
    <div className="px-10 xl:px-16 py-12 max-w-[1100px]">
      <div className="mb-8">
        <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.015em] mb-2">ROI</h1>
        <p className="text-[15px] text-dim">Materiais da marca e informações úteis</p>
      </div>

      {/* Sobre + logo */}
      <Section className="mb-5 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2.5">
            <Info size={16} className="text-brand" />
            <h2 className="text-[17px] font-extrabold text-ink">Sobre a ROI</h2>
          </div>
          <p className="text-[14.5px] text-dim leading-relaxed">{ABOUT}</p>
        </div>
        <div className="flex items-center justify-center md:w-64 bg-canvas border border-line rounded-xl py-8">
          <LogoImage imgClassName="h-11" />
        </div>
      </Section>

      <h2 className="text-[19px] font-extrabold text-ink tracking-[-0.01em] mb-4 mt-8">Links úteis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Manual de marca */}
        <Section>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
              <BookOpen size={18} />
            </span>
            <h3 className="text-[16px] font-bold text-ink">Manual de marca</h3>
          </div>
          <p className="text-[13.5px] text-dim mb-4">Diretrizes de uso do logo, cores, tipografia e tom de voz.</p>
          {BRAND_MANUAL_URL ? (
            <a
              href={BRAND_MANUAL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#5B21F0] hover:bg-[#4A1AD0] text-white text-[14px] font-semibold px-4 py-2 rounded-lg transition-all"
            >
              <ExternalLink size={15} /> Abrir manual
            </a>
          ) : (
            <p className="text-[12.5px] text-faint italic">Link ainda não configurado.</p>
          )}
        </Section>

        {/* Logo */}
        <Section>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
              <Palette size={18} />
            </span>
            <h3 className="text-[16px] font-bold text-ink">Logo</h3>
          </div>
          <p className="text-[13.5px] text-dim mb-4">Arquivos oficiais em PNG (fundo transparente).</p>
          <div className="flex flex-wrap gap-2.5">
            <a
              href="/roi-logo-light.png"
              download="ROI-logo-tema-claro.png"
              className="inline-flex items-center gap-2 bg-surface-hover hover:bg-surface border border-line text-ink text-[13.5px] font-semibold px-3.5 py-2 rounded-lg transition-all"
            >
              <Download size={15} /> Versão fundo claro
            </a>
            <a
              href="/roi-logo-dark.png"
              download="ROI-logo-tema-escuro.png"
              className="inline-flex items-center gap-2 bg-surface-hover hover:bg-surface border border-line text-ink text-[13.5px] font-semibold px-3.5 py-2 rounded-lg transition-all"
            >
              <Download size={15} /> Versão fundo escuro
            </a>
          </div>
        </Section>

        {/* Dados para NF */}
        <Section className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
              <ReceiptText size={18} />
            </span>
            <h3 className="text-[16px] font-bold text-ink">Dados para nota fiscal</h3>
          </div>
          {hasNf ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NF_DATA.filter((f) => f.value.trim()).map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-3 bg-canvas border border-line rounded-lg px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.05em] text-faint uppercase">{f.label}</p>
                    <p className="text-[14px] text-ink truncate">{f.value}</p>
                  </div>
                  <button
                    onClick={() => copy(f.value)}
                    className="text-dim hover:text-ink flex-shrink-0 transition-all"
                    title="Copiar"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-faint italic">
              Dados ainda não preenchidos. Um admin pode configurá-los no arquivo do painel.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
