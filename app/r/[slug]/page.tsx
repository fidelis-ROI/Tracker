"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RatingScale } from "@/components/nps/RatingScale";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Check } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  hasDesigner: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
}

const formSchema = z.object({
  trafegoScore: z.number().min(0).max(10),
  trafegoCollab: z.string().optional(),
  designerScore: z.number().min(0).max(10).optional(),
  designerCollab: z.string().optional(),
  feedback: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof formSchema>;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${months[parseInt(m) - 1]} ${year}`;
}

export default function NpsFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [gestores, setGestores] = useState<Collaborator[]>([]);
  const [designers, setDesigners] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const trafegoScore = watch("trafegoScore");
  const designerScore = watch("designerScore");

  useEffect(() => {
    async function loadClient() {
      try {
        const res = await fetch(`/api/public/client?slug=${slug}`);
        if (!res.ok) { setNotFound(true); return; }
        const data: Client = await res.json();
        setClient(data);

        const month = currentMonth();
        const checkRes = await fetch(`/api/nps/check?clientId=${data.id}&month=${month}`);
        if (checkRes.ok) {
          const check = await checkRes.json();
          if (check.submitted) { setAlreadySubmitted(true); }
        }

        const [g, d] = await Promise.all([
          fetch("/api/public/collaborators?role=gestor_trafego").then(r => r.json()),
          fetch("/api/public/collaborators?role=designer").then(r => r.json()),
        ]);
        setGestores(g);
        setDesigners(d);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [slug]);

  async function onSubmit(data: FormData) {
    if (!client) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          month: currentMonth(),
          ...data,
        }),
      });

      if (res.status === 409) {
        setAlreadySubmitted(true);
        return;
      }

      if (!res.ok) throw new Error("Erro ao enviar");

      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-8 w-48 bg-white/[0.06]" />
          <Skeleton className="h-4 w-72 bg-white/[0.06]" />
          <Skeleton className="h-40 w-full bg-white/[0.06] rounded-[14px]" />
          <Skeleton className="h-40 w-full bg-white/[0.06] rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center p-6 text-center">
        <Search size={40} strokeWidth={1.8} className="text-[#5A5F72] mb-4" />
        <h1 className="text-2xl font-bold text-white">Link não encontrado</h1>
        <p className="text-[#8A8FA3] mt-2">Este link não corresponde a nenhum cliente cadastrado.</p>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 flex items-center justify-center mb-5">
          <Check size={26} className="text-[#A970FF]" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-white">Avaliação já enviada</h1>
        <p className="text-[#8A8FA3] mt-2 max-w-sm">
          Você já enviou sua avaliação de {monthLabel(currentMonth())}. Volte no próximo mês para avaliar novamente.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 flex items-center justify-center mb-5">
          <Check size={26} className="text-[#A970FF]" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-[-0.01em]">
          Avaliação enviada.
        </h1>
        <p className="text-xl font-bold text-[#A970FF]">Obrigado pelo seu feedback.</p>
        <p className="text-[#8A8FA3] mt-3 max-w-sm">
          Sua resposta foi registrada e vai nos ajudar a entregar um serviço ainda melhor.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E17] py-14 px-4">
      {/* Header */}
      <header className="text-center mb-10 max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-[0_8px_30px_rgba(121,25,255,0.35)] mb-5 p-3">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M4 16L10 10L14 14L20 6" stroke="#7919FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 6H20V12" stroke="#7919FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-[-0.01em]">
          Pesquisa de Satisfação
        </h1>
        <p className="text-xl font-bold text-[#A970FF]">{client?.name}</p>
        <p className="text-[#8A8FA3] mt-2 text-sm">
          Sua avaliação nos ajuda a melhorar continuamente.
        </p>
        <div className="mt-3 inline-block px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[#8A8FA3] text-xs">
          Avaliação de {monthLabel(currentMonth())}
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto space-y-5">
        {/* Bloco 1: Aquisição */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-6">
          <h2 className="text-base font-bold text-white mb-1">
            Operação de Tráfego
          </h2>
          <p className="text-sm text-[#8A8FA3] mb-4">
            Como foi a performance do seu Gestor de Tráfego este mês?
          </p>

          <RatingScale
            value={trafegoScore ?? null}
            onChange={(v) => setValue("trafegoScore", v, { shouldValidate: true })}
          />

          {trafegoScore !== undefined && (
            <div className="mt-3">
              <NpsLabel score={trafegoScore} />
            </div>
          )}

          {errors.trafegoScore && (
            <p className="text-red-400 text-xs mt-2">{errors.trafegoScore.message}</p>
          )}

          {gestores.length > 0 && (
            <div className="mt-4">
              <label className="text-xs text-[#8A8FA3] mb-1.5 block">
                Qual gestor avaliou? (opcional)
              </label>
              <Select onValueChange={(v) => setValue("trafegoCollab", v as string | undefined)}>
                <SelectTrigger className="bg-[#0B0E17] border-white/10 text-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-[#12141F] border-white/10">
                  {gestores.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-white hover:bg-white/[0.06]">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Bloco 2: Entrega (condicional) */}
        {client?.hasDesigner && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-6">
            <h2 className="text-base font-bold text-white mb-1">
              Criativos
            </h2>
            <p className="text-sm text-[#8A8FA3] mb-4">
              E os criativos entregues este mês?
            </p>

            <RatingScale
              value={designerScore ?? null}
              onChange={(v) => setValue("designerScore", v, { shouldValidate: true })}
            />

            {designerScore !== undefined && (
              <div className="mt-3">
                <NpsLabel score={designerScore} />
              </div>
            )}

            {designers.length > 0 && (
              <div className="mt-4">
                <label className="text-xs text-[#8A8FA3] mb-1.5 block">
                  Qual designer avaliou? (opcional)
                </label>
                <Select onValueChange={(v) => setValue("designerCollab", v as string | undefined)}>
                  <SelectTrigger className="bg-[#0B0E17] border-white/10 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12141F] border-white/10">
                    {designers.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-white hover:bg-white/[0.06]">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Bloco 3: Feedback */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-6">
          <h2 className="text-base font-bold text-white mb-1">
            Mensagem para a Equipe
          </h2>
          <p className="text-sm text-[#8A8FA3] mb-4">
            Deixe seu recado. O que foi bem? O que podemos melhorar?
          </p>
          <textarea
            {...{
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setValue("feedback", e.target.value),
            }}
            placeholder="Todo feedback nos ajuda a entregar um trabalho melhor."
            rows={4}
            className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#8A8FA3] resize-none focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#7919FF] hover:bg-[#6A0FE8] disabled:opacity-60 text-white font-bold text-base py-4 rounded-xl transition-all duration-200 shadow-[0_10px_24px_rgba(121,25,255,0.4)] flex items-center justify-center gap-2"
        >
          {submitting ? "Enviando..." : "Enviar Avaliação"}
        </button>

        <p className="text-center text-xs text-[#8A8FA3] pb-4">
          ROI Tracker — Dados que viram decisão.
        </p>
      </form>
    </div>
  );
}
