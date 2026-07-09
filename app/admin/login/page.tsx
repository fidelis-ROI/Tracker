"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Gauge } from "lucide-react";

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
    <div className="min-h-screen bg-[#00020A] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1440FF] rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
            <Gauge size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-titillium text-white">NitroADS Tracker</h1>
          <p className="text-[#8892A4] text-sm font-manrope mt-1">Torre de Comando</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium block mb-1.5">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="seu@email.com.br"
              autoComplete="email"
              className="w-full bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF] focus:border-transparent transition-all"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1 font-manrope">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium block mb-1.5">Senha</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-[#0A0F1E] border border-[#1A2140] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF] focus:border-transparent transition-all"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1 font-manrope">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1440FF] hover:bg-[#0027D4] disabled:opacity-60 text-white font-bold font-titillium text-sm py-3.5 rounded-xl transition-all duration-200 mt-2 shadow-lg shadow-blue-900/30"
          >
            {loading ? "Conectando..." : "Entrar na Torre de Comando →"}
          </button>
        </form>

        <p className="text-center text-xs text-[#8892A4]/50 font-manrope mt-8">
          Performance & Resultados — Go Racers! 🏎️
        </p>
      </div>
    </div>
  );
}
