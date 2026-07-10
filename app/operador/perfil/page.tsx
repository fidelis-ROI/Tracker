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
    <div className="px-16 py-14">
      <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Painel Pessoal</h1>
      <p className="text-base text-[#8A8FA3] mb-8">Seus dados e informações profissionais</p>

      {loading ? (
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-32 rounded-[14px] bg-white/[0.03]" />
          <Skeleton className="h-48 rounded-[14px] bg-white/[0.03]" />
        </div>
      ) : !profile ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-8 text-center">
          <p className="text-[#8A8FA3] text-sm">Erro ao carregar perfil.</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Identity card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 rounded-2xl flex items-center justify-center">
                <User size={24} className="text-[#A970FF]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <p className="text-[#8A8FA3] text-sm">
                  {profile.role === "gestor_trafego" ? "Gestor de Tráfego" : "Designer"}
                </p>
              </div>
              <span className={`ml-auto inline-block rounded-full px-3.5 py-1.5 text-[13px] font-bold ${profile.active ? "bg-[#5B21F0]/[0.22] text-[#8B6BFF]" : "bg-white/[0.06] border border-white/10 text-[#9BA0B4]"}`}>
                {profile.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profile.adminUser && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-[#8A8FA3] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8A8FA3] mb-0.5">Email de acesso</p>
                    <p className="text-white text-sm">{profile.adminUser.email}</p>
                  </div>
                </div>
              )}

              {profile.hireDate && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-[#8A8FA3] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8A8FA3] mb-0.5">Data de entrada</p>
                    <p className="text-white text-sm">{new Date(profile.hireDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              )}

              {tenure && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-[#A970FF] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#8A8FA3] mb-0.5">Tempo na empresa</p>
                    <p className="text-white text-sm font-semibold">{tenure.label}</p>
                    <p className="text-[#8A8FA3] text-xs">{tenure.days} dias no total</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Briefcase size={16} className="text-[#8A8FA3] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#8A8FA3] mb-0.5">Clientes ativos</p>
                  <p className="text-white text-sm">{activeClients} de {profile.clientPortfolio.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tenure highlight */}
          {tenure && (
            <div className="bg-[#5B21F0]/10 border border-[#5B21F0]/20 rounded-[14px] p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#7C1EFB]/[0.16] rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-[#A970FF]" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{tenure.label} na ROI Tracker</p>
                <p className="text-[#8A8FA3] text-sm">
                  Desde {new Date(profile.hireDate!).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {/* Portfolio */}
          {profile.clientPortfolio.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-5">
              <h3 className="text-base font-bold text-white mb-4">Carteira de Clientes</h3>
              <div className="space-y-2">
                {profile.clientPortfolio.map(cp => (
                  <div key={cp.client.id} className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cp.client.active ? "#8B6BFF" : "#3A3F52" }} />
                    <p className="text-white text-sm flex-1">{cp.client.name}</p>
                    <span className={`text-xs font-semibold ${cp.client.active ? "text-[#8B6BFF]" : "text-[#8A8FA3]"}`}>
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
