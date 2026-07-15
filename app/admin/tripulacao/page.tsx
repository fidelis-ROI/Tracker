"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { NpsLabel } from "@/components/nps/NpsLabel";
import { Plus, Pencil, Lock, KeyRound, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  role: string;
  active: boolean;
  salary?: number | null;
  variable?: number | null;
  hireDate?: string | null;
  adminUser?: { email: string } | null;
  clientPortfolio?: { client: { id: string; name: string } }[];
}

interface CollabWithStats extends Collaborator {
  avg: number;
  count: number;
  expanded: boolean;
}

interface Client { id: string; name: string; }

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  role: z.enum(["gestor_trafego", "designer"]),
  active: z.boolean(),
  salary: z.string().optional(),
  variable: z.string().optional(),
  hireDate: z.string().optional(),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().optional(),
  loginPassword: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

function daysAtCompany(hireDate: string | null | undefined): string {
  if (!hireDate) return "—";
  const hire = new Date(hireDate);
  const diff = Math.floor((Date.now() - hire.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 30) return `${diff} dias`;
  if (diff < 365) return `${Math.floor(diff / 30)} meses`;
  const years = Math.floor(diff / 365);
  const months = Math.floor((diff % 365) / 30);
  return months > 0 ? `${years}a ${months}m` : `${years} ano${years > 1 ? "s" : ""}`;
}

export default function OperadoresPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [collabs, setCollabs] = useState<CollabWithStats[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "gestor_trafego", active: true, createLogin: false },
  });

  const activeValue = watch("active");
  const createLoginValue = watch("createLogin");
  const roleValue = watch("role");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [collabRes, respRes, clientRes] = await Promise.all([
        fetch("/api/admin/collaborators"),
        fetch("/api/admin/responses"),
        fetch("/api/admin/clients"),
      ]);
      const collabData: Collaborator[] = await collabRes.json();
      const respData: Array<{ trafegoCollab: string | null; designerCollab: string | null; trafegoScore: number; designerScore: number | null }> = await respRes.json();
      const clientData: Client[] = await clientRes.json();

      const statsMap = new Map<string, { scores: number[] }>();
      collabData.forEach((c) => statsMap.set(c.id, { scores: [] }));
      respData.forEach((r) => {
        if (r.trafegoCollab && statsMap.has(r.trafegoCollab)) statsMap.get(r.trafegoCollab)!.scores.push(r.trafegoScore);
        if (r.designerCollab && r.designerScore !== null && statsMap.has(r.designerCollab)) statsMap.get(r.designerCollab)!.scores.push(r.designerScore!);
      });

      const enriched: CollabWithStats[] = collabData.map((c) => {
        const s = statsMap.get(c.id)!;
        const avg = s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
        return { ...c, avg: Math.round(avg * 10) / 10, count: s.scores.length, expanded: false };
      });

      setCollabs(enriched);
      setClients(clientData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setSelectedClients([]);
    reset({ name: "", role: "gestor_trafego", active: true, salary: "", variable: "", hireDate: "", createLogin: false, loginEmail: "", loginPassword: "" });
    setOpen(true);
  }

  function openEdit(c: Collaborator) {
    setEditing(c);
    setSelectedClients(c.clientPortfolio?.map(cp => cp.client.id) ?? []);
    reset({
      name: c.name,
      role: c.role as "gestor_trafego" | "designer",
      active: c.active,
      salary: c.salary?.toString() ?? "",
      variable: c.variable?.toString() ?? "",
      hireDate: c.hireDate ? c.hireDate.slice(0, 10) : "",
      createLogin: false,
      loginEmail: c.adminUser?.email ?? "",
      loginPassword: "",
    });
    setOpen(true);
  }

  function toggleClient(id: string) {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleExpand(id: string) {
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        role: data.role,
        active: data.active,
        clientIds: selectedClients,
      };

      if (isAdmin) {
        payload.salary = data.salary ? parseFloat(data.salary) : null;
        payload.variable = data.variable ? parseFloat(data.variable) : null;
        payload.hireDate = data.hireDate || null;
        if (data.createLogin && data.loginEmail && data.loginPassword) {
          payload.createLogin = true;
          payload.loginEmail = data.loginEmail;
          payload.loginPassword = data.loginPassword;
        } else if (editing && data.loginEmail) {
          payload.loginEmail = data.loginEmail;
          if (data.loginPassword) payload.loginPassword = data.loginPassword;
        }
      }

      const url = editing ? `/api/admin/collaborators/${editing.id}` : "/api/admin/collaborators";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      toast.success(editing ? "Operador atualizado!" : "Operador adicionado!");
      load();
      setOpen(false);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Collaborator) {
    if (!window.confirm(`Excluir o operador "${c.name}"? Ele deixará de aparecer nas listagens e perderá o acesso ao portal (o histórico de avaliações recebidas é mantido).`)) return;
    try {
      const res = await fetch(`/api/admin/collaborators/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Operador excluído.");
      load();
    } catch {
      toast.error("Erro ao excluir. Tente novamente.");
    }
  }

  const gestores = collabs.filter((c) => c.role === "gestor_trafego");
  const designers = collabs.filter((c) => c.role === "designer");

  function CollabSection({ items, title }: { items: CollabWithStats[]; title: string }) {
    return (
      <div className="mb-9">
        <h2 className="text-[19px] font-extrabold text-white mb-4">{title}</h2>
        {items.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] p-6 text-center">
            <p className="text-[#8A8FA3] text-sm">Nenhum membro nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden">
                <div className="flex items-center justify-between px-[26px] py-6">
                  <div>
                    <p className="text-[18px] font-bold text-white mb-1">{c.name}</p>
                    <p className="text-sm text-[#8A8FA3]">
                      {c.role === "gestor_trafego" ? "Gestor de Tráfego" : "Designer"}
                      {c.hireDate && <><span className="mx-1">·</span>{daysAtCompany(c.hireDate)}</>}
                    </p>
                  </div>

                  <div className="flex items-center gap-[22px]">
                    <span className="text-xl font-extrabold text-white">{c.count > 0 ? c.avg.toFixed(1) : "—"}</span>

                    {c.count > 0 && <NpsLabel score={Math.round(c.avg)} />}

                    <div className="text-center min-w-[44px]">
                      <span className={`inline-block rounded-full px-3.5 py-1.5 text-[13px] font-bold ${c.active ? "bg-[#5B21F0]/[0.22] text-[#8B6BFF]" : "bg-white/[0.06] border border-white/10 text-[#9BA0B4]"}`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                      <p className="text-[12.5px] text-[#6E7285] mt-1">{c.count} aval.</p>
                    </div>

                    <button onClick={() => openEdit(c)} className="text-[#8A8FA3] hover:text-white transition-all" title="Editar">
                      <Pencil size={16} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c)} className="text-[#8A8FA3] hover:text-red-400 transition-all" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => toggleExpand(c.id)} className="text-[#8A8FA3] hover:text-white transition-all" title="Ver detalhes">
                      {c.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {c.expanded && (
                  <div className="border-t border-white/[0.08] px-[26px] py-5 grid grid-cols-2 gap-4">
                    {isAdmin && (
                      <>
                        <div>
                          <p className="text-xs text-[#8A8FA3] mb-1">Salário</p>
                          <p className="text-white text-sm">
                            {c.salary != null ? `R$ ${c.salary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8A8FA3] mb-1">Variável</p>
                          <p className="text-white text-sm">
                            {c.variable != null ? `R$ ${c.variable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8A8FA3] mb-1">Login</p>
                          <p className="text-white text-sm">{c.adminUser?.email ?? <span className="text-[#8A8FA3]/40">Sem acesso</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8A8FA3] mb-1">Data de entrada</p>
                          <p className="text-white text-sm">
                            {c.hireDate ? new Date(c.hireDate).toLocaleDateString("pt-BR") : "—"}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <p className="text-xs text-[#8A8FA3] mb-2">Carteira de clientes</p>
                      <div className="flex flex-wrap gap-2">
                        {c.clientPortfolio && c.clientPortfolio.length > 0 ? c.clientPortfolio.map(cp => (
                          <span key={cp.client.id} className="px-2.5 py-1 bg-white/[0.07] border border-white/10 rounded-[6px] text-xs text-white">{cp.client.name}</span>
                        )) : <span className="text-[#8A8FA3]/40 text-xs">Nenhum cliente atribuído</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-16 py-14">
      <div className="flex items-start justify-between mb-11">
        <div>
          <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Operadores</h1>
          <p className="text-base text-[#8A8FA3]">Gerencie a equipe de operadores da agência</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#5B21F0] hover:bg-[#4A1AD0] text-white text-[15px] font-bold px-[22px] py-3.5 rounded-[10px] whitespace-nowrap transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo Operador
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[14px] bg-white/[0.03]" />)}
        </div>
      ) : (
        <>
          <CollabSection items={gestores} title="Gestores de Tráfego" />
          <CollabSection items={designers} title="Designers" />
        </>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#12141F] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">
              {editing ? "Editar Operador" : "Novo Operador"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Nome */}
            <div>
              <label className="text-xs text-[#8A8FA3] block mb-1">Nome</label>
              <input
                {...register("name")}
                placeholder="Ex: Lucas Mendes"
                className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Cargo */}
            <div>
              <label className="text-xs text-[#8A8FA3] block mb-1">Cargo</label>
              <select
                {...register("role")}
                className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              >
                <option value="gestor_trafego">Gestor de Tráfego</option>
                <option value="designer">Designer</option>
              </select>
            </div>

            {/* Clientes da carteira */}
            {roleValue === "gestor_trafego" && clients.length > 0 && (
              <div>
                <label className="text-xs text-[#8A8FA3] block mb-2">Carteira de clientes</label>
                <div className="flex flex-wrap gap-2">
                  {clients.map(cl => (
                    <button
                      type="button"
                      key={cl.id}
                      onClick={() => toggleClient(cl.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedClients.includes(cl.id) ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#5B21F0]/50"}`}
                    >
                      {cl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin-only fields */}
            {isAdmin && (
              <div className="border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={12} className="text-[#A970FF]" />
                  <span className="text-xs font-semibold text-[#A970FF] uppercase tracking-widest">Dados Administrativos</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#8A8FA3] block mb-1">Salário (R$)</label>
                    <input
                      {...register("salary")}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8A8FA3] block mb-1">Variável (R$)</label>
                    <input
                      {...register("variable")}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#8A8FA3] block mb-1">Data de entrada</label>
                  <input
                    {...register("hireDate")}
                    type="date"
                    className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] [color-scheme:dark]"
                  />
                </div>

                {/* Login section */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound size={12} className="text-[#8A8FA3]" />
                    <span className="text-xs font-semibold text-[#8A8FA3] uppercase tracking-widest">Acesso ao Operador Portal</span>
                  </div>

                  {editing && editing.adminUser ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[#4ADE80]">✅ Acesso ativo: {editing.adminUser.email}</p>
                      <div>
                        <label className="text-xs text-[#8A8FA3] block mb-1">Novo email de login</label>
                        <input
                          {...register("loginEmail")}
                          type="email"
                          placeholder={editing.adminUser.email}
                          className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#8A8FA3] block mb-1">Nova senha <span className="opacity-60">(deixe em branco para não alterar)</span></label>
                        <input
                          {...register("loginPassword")}
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white">Criar acesso ao portal</p>
                        <Switch checked={!!createLoginValue} onCheckedChange={(v) => setValue("createLogin", v)} className="data-checked:!bg-[#5B21F0]" />
                      </div>
                      {createLoginValue && (
                        <>
                          <div>
                            <label className="text-xs text-[#8A8FA3] block mb-1">Email de login</label>
                            <input
                              {...register("loginEmail")}
                              type="email"
                              placeholder="operador@roi.com.br"
                              className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#8A8FA3] block mb-1">Senha inicial</label>
                            <input
                              {...register("loginPassword")}
                              type="password"
                              placeholder="••••••••"
                              className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active switch */}
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-white">Operador ativo</p>
              <Switch checked={activeValue} onCheckedChange={(v) => setValue("active", v)} className="data-checked:!bg-[#5B21F0]" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-sm py-2.5 rounded-lg transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 bg-[#5B21F0] hover:bg-[#4A1AD0] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-all">
                {saving ? "Salvando..." : editing ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
