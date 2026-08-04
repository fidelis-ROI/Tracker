"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Calendar, Briefcase, Mail, Clock, Camera, IdCard, Landmark } from "lucide-react";
import { roleLabel } from "@/lib/roles";

interface Profile {
  id: string;
  name: string;
  role: string;
  active: boolean;
  hireDate: string | null;
  fullName: string | null;
  birthDate: string | null;
  cpf: string | null;
  cnpj: string | null;
  avatarUrl: string | null;
  bankHolder: string | null;
  bankInstitution: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  pixKey: string | null;
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

const inputCls =
  "w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] [color-scheme:dark]";

export default function OperadorPerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bankHolder, setBankHolder] = useState("");
  const [bankInstitution, setBankInstitution] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [pixKey, setPixKey] = useState("");

  useEffect(() => {
    fetch("/api/operador/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile(p);
        setFullName(p.fullName ?? "");
        setBirthDate(p.birthDate ? p.birthDate.slice(0, 10) : "");
        setCpf(p.cpf ?? "");
        setCnpj(p.cnpj ?? "");
        setAvatarUrl(p.avatarUrl ?? null);
        setBankHolder(p.bankHolder ?? "");
        setBankInstitution(p.bankInstitution ?? "");
        setBankAgency(p.bankAgency ?? "");
        setBankAccount(p.bankAccount ?? "");
        setPixKey(p.pixKey ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 900_000) {
      toast.error("Imagem muito grande (máx. 900 KB).");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setAvatarUrl(dataUrl);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/operador/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, birthDate: birthDate || null, cpf, cnpj, avatarUrl, bankHolder, bankInstitution, bankAgency, bankAccount, pixKey }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dados salvos!");
      setProfile((p) => (p ? { ...p, fullName, birthDate: birthDate || null, cpf, cnpj, avatarUrl, bankHolder, bankInstitution, bankAgency, bankAccount, pixKey } : p));
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const tenure = profile?.hireDate ? daysAtCompany(profile.hireDate) : null;
  const activeClients = profile?.clientPortfolio.filter((cp) => cp.client.active).length ?? 0;

  return (
    <div className="px-16 py-14">
      <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.01em] mb-2">Perfil</h1>
      <p className="text-base text-dim mb-8">Seus dados e informações profissionais</p>

      {loading ? (
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-32 rounded-2xl bg-surface" />
          <Skeleton className="h-56 rounded-2xl bg-surface" />
        </div>
      ) : !profile ? (
        <div className="bg-surface border border-line rounded-2xl p-8 text-center">
          <p className="text-dim text-sm">Erro ao carregar perfil.</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Identity card */}
          <div className="bg-surface border border-line rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-tint border border-brand/40 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={26} className="text-brand-soft" />
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#5B21F0] hover:bg-[#4A1AD0] text-white flex items-center justify-center border-2 border-surface transition-all"
                  title="Trocar foto"
                >
                  <Camera size={13} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">{profile.fullName || profile.name}</h2>
                <p className="text-dim text-sm">{roleLabel(profile.role)}</p>
              </div>
              <span className={`ml-auto inline-block rounded-full px-3.5 py-1.5 text-[13px] font-bold ${profile.active ? "bg-brand-tint text-brand" : "bg-surface-hover border border-line text-dim"}`}>
                {profile.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profile.adminUser && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-dim mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-dim mb-0.5">Email de acesso</p>
                    <p className="text-ink text-sm">{profile.adminUser.email}</p>
                  </div>
                </div>
              )}
              {profile.hireDate && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-dim mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-dim mb-0.5">Data de entrada</p>
                    <p className="text-ink text-sm">{new Date(profile.hireDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              )}
              {tenure && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-brand-soft mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-dim mb-0.5">Tempo na empresa</p>
                    <p className="text-ink text-sm font-semibold">{tenure.label}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Briefcase size={16} className="text-dim mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-dim mb-0.5">Clientes ativos</p>
                  <p className="text-ink text-sm">{activeClients} de {profile.clientPortfolio.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dados pessoais (editável) */}
          <div className="bg-surface border border-line rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <IdCard size={17} className="text-brand" />
              <h3 className="text-[16px] font-bold text-ink">Meus dados pessoais</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-dim block mb-1.5">Nome completo</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-dim block mb-1.5">Data de nascimento</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-dim block mb-1.5">CPF</label>
                <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-dim block mb-1.5">CNPJ</label>
                <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" className={inputCls} />
              </div>
            </div>

            {/* Conta bancária */}
            <div className="border-t border-line mt-6 pt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Landmark size={16} className="text-brand" />
                <h4 className="text-[15px] font-bold text-ink">Conta bancária</h4>
              </div>
              <p className="text-[12.5px] text-warning mb-4">⚠️ A conta bancária precisa estar vinculada ao seu CNPJ.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-dim block mb-1.5">Nome do titular</label>
                  <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Nome como consta na conta (CNPJ)" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-dim block mb-1.5">Instituição / Banco</label>
                  <input value={bankInstitution} onChange={(e) => setBankInstitution(e.target.value)} placeholder="Ex: Nubank, Itaú…" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-dim block mb-1.5">Agência</label>
                  <input value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="0000" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-dim block mb-1.5">Conta</label>
                  <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="00000000-0" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-dim block mb-1.5">Chave PIX</label>
                  <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CNPJ, e-mail, telefone…" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={save}
                disabled={saving}
                className="bg-[#5B21F0] hover:bg-[#4A1AD0] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                {saving ? "Salvando…" : "Salvar dados"}
              </button>
            </div>
            <p className="text-[12px] text-faint mt-3">Estes dados ficam visíveis apenas para você e para os administradores.</p>
          </div>

          {/* Portfolio */}
          {profile.clientPortfolio.length > 0 && (
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,20,40,0.05)]">
              <h3 className="text-base font-bold text-ink mb-4">Carteira de Clientes</h3>
              <div className="space-y-2">
                {profile.clientPortfolio.map((cp) => (
                  <div key={cp.client.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cp.client.active ? "#8B6BFF" : "#3A3F52" }} />
                    <p className="text-ink text-sm flex-1">{cp.client.name}</p>
                    <span className={`text-xs font-semibold ${cp.client.active ? "text-brand-soft" : "text-dim"}`}>
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
