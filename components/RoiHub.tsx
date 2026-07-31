"use client";

import { toast } from "sonner";
import { LogoImage } from "@/components/Logo";
import {
  BookOpen, Download, Copy, ExternalLink, ReceiptText, Info, Palette,
  FolderOpen, ClipboardCheck, KeyRound,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Conteúdo editável — ajuste aqui os links e os dados da empresa.
 * ------------------------------------------------------------------ */
const ABOUT =
  "A ROI é uma agência de performance focada em transformar dados em decisão. " +
  "Este espaço reúne os materiais oficiais da marca e os acessos que o time " +
  "precisa no dia a dia.";

type LinkCard = { title: string; desc: string; url: string; icon: React.ElementType };

const LINKS: LinkCard[] = [
  {
    title: "Manual de marca",
    desc: "Diretrizes de uso do logo, cores, tipografia e tom de voz.",
    url: "https://drive.google.com/drive/folders/1-J6dvEBKyfZvgrD-2gj8skrVvZJyoU8l?usp=sharing",
    icon: BookOpen,
  },
  {
    title: "Manual de boas práticas",
    desc: "Padrões e recomendações internas do time ROI.",
    url: "https://drive.google.com/drive/folders/1W9Rds_V2iG2tcr6Xllh2lMvXvDRkD11N?usp=sharing",
    icon: ClipboardCheck,
  },
  {
    title: "Drive ROI Design",
    desc: "Pasta com todos os materiais de design da ROI.",
    url: "https://drive.google.com/drive/folders/1lJ6ViEmXV-SKQBY7Z2YXseX5vz58L4Oc?usp=sharing",
    icon: FolderOpen,
  },
  {
    title: "Logins e acessos",
    desc: "Central de acessos e credenciais do time (Notion).",
    url: "https://app.notion.com/p/roipartners/Acessos-Geral-30c5114aa812801d99abd7a2e3e9154c",
    icon: KeyRound,
  },
];

// Pasta oficial com os arquivos de logo no Drive.
const LOGO_DRIVE_URL = "https://drive.google.com/drive/folders/1GP8D3xf0pW2XPBE3TZZt0HKXaRau3m0y?usp=sharing";

// Dados para emissão de nota fiscal.
const NF_DATA: { label: string; value: string }[] = [
  { label: "Razão social / Nome empresarial", value: "53.020.275 RODRIGO FIDELIS NOGUEIRA VASCONCELOS" },
  { label: "CNPJ", value: "53.020.275/0001-53" },
  { label: "Endereço", value: "Rua Rio de Janeiro, 1436, Apto 1501, Lourdes, Belo Horizonte, MG" },
  { label: "CEP", value: "30.160-042" },
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
        {LINKS.map((l) => (
          <Section key={l.title}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <l.icon size={18} />
              </span>
              <h3 className="text-[16px] font-bold text-ink">{l.title}</h3>
            </div>
            <p className="text-[13.5px] text-dim mb-4">{l.desc}</p>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#5B21F0] hover:bg-[#4A1AD0] text-white text-[14px] font-semibold px-4 py-2 rounded-lg transition-all"
            >
              <ExternalLink size={15} /> Abrir
            </a>
          </Section>
        ))}

        {/* Logo — download dos PNGs + pasta no Drive */}
        <Section className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
              <Palette size={18} />
            </span>
            <h3 className="text-[16px] font-bold text-ink">Logo</h3>
          </div>
          <p className="text-[13.5px] text-dim mb-4">Arquivos oficiais em PNG (fundo transparente) ou a pasta completa no Drive.</p>
          <div className="flex flex-wrap gap-2.5">
            <a
              href="/roi-logo-light.png"
              download="ROI-logo-tema-claro.png"
              className="inline-flex items-center gap-2 bg-surface-hover hover:bg-surface border border-line text-ink text-[13.5px] font-semibold px-3.5 py-2 rounded-lg transition-all"
            >
              <Download size={15} /> PNG · fundo claro
            </a>
            <a
              href="/roi-logo-dark.png"
              download="ROI-logo-tema-escuro.png"
              className="inline-flex items-center gap-2 bg-surface-hover hover:bg-surface border border-line text-ink text-[13.5px] font-semibold px-3.5 py-2 rounded-lg transition-all"
            >
              <Download size={15} /> PNG · fundo escuro
            </a>
            <a
              href={LOGO_DRIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-surface-hover hover:bg-surface border border-line text-ink text-[13.5px] font-semibold px-3.5 py-2 rounded-lg transition-all"
            >
              <ExternalLink size={15} /> Todos os logos (Drive)
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
                  <button onClick={() => copy(f.value)} className="text-dim hover:text-ink flex-shrink-0 transition-all" title="Copiar">
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-faint italic">
              Dados ainda não preenchidos. Configure em <span className="font-mono not-italic">components/RoiHub.tsx</span> (constante <span className="font-mono not-italic">NF_DATA</span>).
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
