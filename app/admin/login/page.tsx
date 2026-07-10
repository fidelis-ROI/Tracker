"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciais inválidas. Verifique e tente novamente.");
        return;
      }

      // Verifica role para redirecionar corretamente
      const session = await getSession();
      if (session?.user?.role === "operator") {
        router.push("/operador/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] flex flex-col items-center animate-[roi-fade-up_0.5s_ease-out]">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-white flex items-center justify-center p-4 mb-[22px] shadow-[0_8px_30px_rgba(121,25,255,0.35)]">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M4 16L10 10L14 14L20 6" stroke="#7919FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 6H20V12" stroke="#7919FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-[30px] font-extrabold text-[#F5F7FF] tracking-[-0.02em] text-center">ROI Tracker</h1>
        <p className="text-[15px] text-[#7C86A8] mt-1.5 text-center">Central de Performance</p>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-10">
          <div>
            <label className="text-[11px] font-bold tracking-[0.08em] text-[#6B7494] block mb-2">E-MAIL DE ACESSO</label>
            <input
              {...register("email")}
              type="email"
              placeholder="contato@roi.com.br"
              autoComplete="email"
              className="w-full box-border bg-[#EEF1FA] border-none rounded-xl px-[18px] py-4 text-[15px] text-[#12141c] placeholder:text-[#12141c]/40 outline-none focus:ring-2 focus:ring-[#7919FF] transition-all"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="mt-[22px]">
            <label className="text-[11px] font-bold tracking-[0.08em] text-[#6B7494] block mb-2">SENHA</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••••••••"
              autoComplete="current-password"
              className="w-full box-border bg-[#EEF1FA] border-none rounded-xl px-[18px] py-4 text-[15px] text-[#12141c] placeholder:text-[#12141c]/40 outline-none focus:ring-2 focus:ring-[#7919FF] transition-all"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-7 bg-[#7919FF] hover:bg-[#6A0FE8] disabled:opacity-60 border-none rounded-xl px-[18px] py-[17px] text-[15px] font-bold text-white flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(121,25,255,0.4)] transition-all"
          >
            {loading ? "Conectando..." : "Acessar painel"}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>

        <p className="mt-[26px] text-[13px] text-[#525C7A] text-center">Dados que viram decisão.</p>
      </div>
    </div>
  );
}
