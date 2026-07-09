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

        // Verifica se já respondeu
        const month = currentMonth();
        const checkRes = await fetch(`/api/nps/check?clientId=${data.id}&month=${month}`);
        if (checkRes.ok) {
          const check = await checkRes.json();
          if (check.submitted) { setAlreadySubmitted(true); }
        }

        // Carrega colaboradores
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
      <div className="min-h-screen bg-[#00020A] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-8 w-48 bg-[#1A2140]" />
          <Skeleton className="h-4 w-72 bg-[#1A2140]" />
          <Skeleton className="h-40 w-full bg-[#1A2140] rounded-xl" />
          <Skeleton className="h-40 w-full bg-[#1A2140] rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#00020A] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-4">🏁</p>
        <h1 className="text-2xl font-bold font-titillium text-white">Autódromo não encontrado</h1>
        <p className="text-[#8892A4] mt-2 font-manrope">Este link não corresponde a nenhum piloto cadastrado.</p>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-[#00020A] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-4">⏱️</p>
        <h1 className="text-2xl font-bold font-titillium text-white">Pit Stop já realizado!</h1>
        <p className="text-[#8892A4] mt-2 font-manrope max-w-sm">
          Você já enviou sua avaliação de {monthLabel(currentMonth())}. Volte no próximo mês, Piloto!
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#00020A] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-bounce text-6xl mb-6">🏁</div>
        <h1 className="text-3xl font-bold font-titillium text-white mb-2">
          Pit Stop concluído.
        </h1>
        <p className="text-xl font-titillium text-[#1440FF] font-semibold">Obrigado, Piloto.</p>
        <p className="text-[#8892A4] mt-3 font-manrope max-w-sm">
          Sua telemetria foi recebida pela escuderia. Isso nos faz andar mais rápido na próxima volta.
        </p>
        <p className="text-2xl mt-6">Go Racers! 🚀</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00020A] py-10 px-4">
      {/* Header */}
      <header className="text-center mb-10 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#1440FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold font-titillium text-sm">N</span>
          </div>
          <span className="text-white font-bold font-titillium text-lg">NitroADS Tracker</span>
        </div>
        <h1 className="text-3xl font-bold font-titillium text-white mb-2">
          Pit Stop Report
        </h1>
        <p className="text-xl font-titillium text-[#1440FF] font-semibold">{client?.name}</p>
        <p className="text-[#8892A4] mt-2 font-manrope text-sm">
          Sua avaliação é o combustível da nossa escuderia.
        </p>
        <div className="mt-3 inline-block px-3 py-1 rounded-full border border-[#1A2140] bg-[#0A0F1E] text-[#8892A4] text-xs font-manrope">
          Avaliação de {monthLabel(currentMonth())}
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto space-y-6">
        {/* Bloco 1: Tráfego */}
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-6">
          <h2 className="text-base font-semibold font-titillium text-white mb-1">
            Operação de Tráfego
          </h2>
          <p className="text-sm text-[#8892A4] font-manrope mb-4">
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
            <p className="text-red-400 text-xs mt-2 font-manrope">{errors.trafegoScore.message}</p>
          )}

          {gestores.length > 0 && (
            <div className="mt-4">
              <label className="text-xs text-[#8892A4] font-manrope mb-1.5 block">
                Qual gestor avaliou? (opcional)
              </label>
              <Select onValueChange={(v) => setValue("trafegoCollab", v as string | undefined)}>
                <SelectTrigger className="bg-[#00020A] border-[#1A2140] text-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0F1E] border-[#1A2140]">
                  {gestores.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-white hover:bg-[#1A2140]">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Bloco 2: Criativos (condicional) */}
        {client?.hasDesigner && (
          <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-6">
            <h2 className="text-base font-semibold font-titillium text-white mb-1">
              Criativos
            </h2>
            <p className="text-sm text-[#8892A4] font-manrope mb-4">
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
                <label className="text-xs text-[#8892A4] font-manrope mb-1.5 block">
                  Qual designer avaliou? (opcional)
                </label>
                <Select onValueChange={(v) => setValue("designerCollab", v as string | undefined)}>
                  <SelectTrigger className="bg-[#00020A] border-[#1A2140] text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0F1E] border-[#1A2140]">
                    {designers.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-white hover:bg-[#1A2140]">
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
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-6">
          <h2 className="text-base font-semibold font-titillium text-white mb-1">
            Mensagem para a Equipe
          </h2>
          <p className="text-sm text-[#8892A4] font-manrope mb-4">
            Deixe seu recado. O que foi bem? O que podemos melhorar?
          </p>
          <textarea
            {...{
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setValue("feedback", e.target.value),
            }}
            placeholder="Seja o nosso engenheiro de pista — todo feedback nos faz andar mais rápido."
            rows={4}
            className="w-full bg-[#00020A] border border-[#1A2140] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#8892A4] font-manrope resize-none focus:outline-none focus:ring-2 focus:ring-[#1440FF] focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#1440FF] hover:bg-[#0027D4] disabled:opacity-60 text-white font-bold font-titillium text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin text-lg">⚙️</span>
              Enviando telemetria...
            </>
          ) : (
            "Enviar Telemetria →"
          )}
        </button>

        <p className="text-center text-xs text-[#8892A4] font-manrope pb-4">
          Performance & Resultados — NitroADS Tracker
        </p>
      </form>
    </div>
  );
}
