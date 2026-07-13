"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  domain: "Use um e-mail @roipartners.com.br para entrar com Google.",
  not_registered: "Seu e-mail ainda não tem acesso cadastrado. Fale com um admin.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(ERROR_MESSAGES[error] ?? "Não foi possível entrar. Tente novamente.");
    }
  }, [searchParams]);

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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/admin/dashboard" });
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

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full mt-9 bg-white hover:bg-[#F2F2F2] disabled:opacity-60 border-none rounded-xl px-[18px] py-[14px] text-[15px] font-bold text-[#12141c] flex items-center justify-center gap-2.5 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
          </svg>
          {googleLoading ? "Conectando..." : "Entrar com Google Workspace"}
        </button>

        <div className="w-full flex items-center gap-3 mt-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[12px] text-[#525C7A]">ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-6">
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
