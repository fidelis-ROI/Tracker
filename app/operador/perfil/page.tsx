"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Calendar, Briefcase, Mail, Clock } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  role: string;
  active: boolean;
  hireDate: string | null;
  adminUser: { email: string } | null;
  clientPortfolio: { client: { id: string; name: string; slug: string; active: boolean } }[];
}

function daysAtCompany(hireDate: string | null): { label: string; days: number } | null {
  if (!hireDate) return null;
  const hire = new Date(hireDate);
  const diff = Math.floor((Date.now() - hire.getTime()) / (1000 * 60 * 60 * 24));
  const years = Math.floor(diff / 365);
  const months = Math.floor((diff % 365) / 30);
  const days = diff % 30;

  let label = "";
  if (years > 0) label += `${years} ano${years > 1 ? "s" : ""}`;
  if (months > 0) label += `${label ? " e " : ""}${months} ${months > 1 ? "meses" : "mês"}`;
  if (!years && !months) label = `${days} dia${days !== 1 ? "s" : ""}`;

  return { label, days: diff };
}

export default function OperadorPerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operador/profile")
      .then(r => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const tenure = profile?.hireDate ? daysAtCompany(profile.hireDate) : null;
  const activeClients = profile?.clientPortfolio.filter(cp => cp.client.active).length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-titillium text-white">Painel Pessoal</h1>
        <p className="text-[#8892A4] font-manrope text-sm mt-1">Seus dados e informações profissionais</p>
      </div>

      {loading ? (
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-32 rounded-xl bg-[#0A0F1E]" />
          <Skeleton className="h-48 rounded-xl bg-[#0A0F1E]" />
        </div>
      ) : !profile ? (
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-8 text-center">
          <p className="text-[#8892A4] font-manrope text-sm">Erro ao carregar perfil.</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Identity card */}
          <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#1440FF]/20 border border-[#1440FF]/30 rounded-2xl flex items-center justify-center">
                <User size={24} className="text-[#1440FF]" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-titillium text-white">{profile.name}</h2>
                <p className="text-[#8892A4] font-manrope text-sm">
                  {profile.role === "gestor_trafego" ? "Gestor de Tráfego" : "Designer"}
                </p>
              </div>
              <span className={`ml-auto text-xs font-semibold font-titillium px-2 py-0.5 rounded-full border ${profile.active ? "border-blue-800 text-[#1440FF] bg-blue-900/20" : "border-[#1A2140] text-[#8892A4]"}`}>
                {profile.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profile.adminUser && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-[#8892A4] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8892A4] font-manrope mb-0.5">Email de acesso</p>
                    <p className="text-white font-manrope text-sm">{profile.adminUser.email}</p>
                  </div>
                </div>
              )}

              {profile.hireDate && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-[#8892A4] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8892A4] font-manrope mb-0.5">Data de entrada</p>
                    <p className="text-white font-manrope text-sm">{new Date(profile.hireDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              )}

              {tenure && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-[#1440FF] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8892A4] font-manrope mb-0.5">Tempo na empresa</p>
                    <p className="text-white font-manrope text-sm font-semibold">{tenure.label}</p>
                    <p className="text-[#8892A4] text-xs font-manrope">{tenure.days} dias no total</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Briefcase size={16} className="text-[#8892A4] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#8892A4] font-manrope mb-0.5">Clientes ativos</p>
                  <p className="text-white font-manrope text-sm">{activeClients} de {profile.clientPortfolio.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tenure highlight */}
          {tenure && (
            <div className="bg-[#1440FF]/10 border border-[#1440FF]/20 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1440FF]/20 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-[#1440FF]" />
              </div>
              <div>
                <p className="text-white font-bold font-titillium text-lg">{tenure.label} na NitroADS</p>
                <p className="text-[#8892A4] font-manrope text-sm">
                  Desde {new Date(profile.hireDate!).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {/* Portfolio */}
          {profile.clientPortfolio.length > 0 && (
            <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-5">
              <h3 className="text-base font-bold font-titillium text-white mb-4">Carteira de Clientes</h3>
              <div className="space-y-2">
                {profile.clientPortfolio.map(cp => (
                  <div key={cp.client.id} className="flex items-center gap-3 py-2 border-b border-[#1A2140]/40 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cp.client.active ? "#1440FF" : "#1A2140" }} />
                    <p className="text-white font-manrope text-sm flex-1">{cp.client.name}</p>
                    <span className={`text-xs font-titillium ${cp.client.active ? "text-[#1440FF]" : "text-[#8892A4]"}`}>
                      {cp.client.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
