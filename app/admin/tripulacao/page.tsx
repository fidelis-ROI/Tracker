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
  avatarUrl?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  adminUser?: { email: string; role?: string } | null;
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
  loginRole: z.enum(["operator", "admin"]).optional(),
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
  const loginRoleValue = watch("loginRole");

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
    reset({ name: "", role: "gestor_trafego", active: true, salary: "", variable: "", hireDate: "", createLogin: false, loginEmail: "", loginPassword: "", loginRole: "operator" });
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
      loginRole: (c.adminUser?.role as "operator" | "admin") ?? "operator",
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
          payload.loginRole = data.loginRole ?? "operator";
        } else if (editing && data.loginEmail) {
          payload.loginEmail = data.loginEmail;
          if (data.loginPassword) payload.loginPassword = data.loginPassword;
          payload.loginRole = data.loginRole ?? "operator";
        } else if (editing && editing.adminUser && data.loginRole) {
          // Alterar apenas o nível de acesso de um login existente
          payload.loginRole = data.loginRole;
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
        <h2 className="text-[19px] font-extrabold text-ink mb-4">{title}</h2>
        {items.length === 0 ? (
          <div className="bg-surface border border-line rounded-[14px] p-6 text-center">
            <p className="text-dim text-sm">Nenhum membro nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="bg-surface border border-line rounded-[14px] overflow-hidden">
                <div className="flex items-center justify-between px-[26px] py-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-brand-tint border border-brand/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-brand-soft font-bold text-sm">{c.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[18px] font-bold text-ink">{c.name}</p>
                        {c.adminUser?.role === "admin" && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold bg-[#5B21F0]/[0.22] text-brand-soft">Admin</span>
                        )}
                      </div>
                      <p className="text-sm text-dim">
                        {c.role === "gestor_trafego" ? "Gestor de Tráfego" : "Designer"}
                        {c.hireDate && <><span className="mx-1">·</span>{daysAtCompany(c.hireDate)}</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-[22px]">
                    <span className="text-xl font-extrabold text-ink">{c.count > 0 ? c.avg.toFixed(1) : "—"}</span>

                    {c.count > 0 && <NpsLabel score={Math.round(c.avg)} />}

                    <div className="text-center min-w-[44px]">
                      <span className={`inline-block rounded-full px-3.5 py-1.5 text-[13px] font-bold ${c.active ? "bg-[#5B21F0]/[0.22] text-brand-soft" : "bg-surface-hover border border-line text-dim"}`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                      <p className="text-[12.5px] text-faint mt-1">{c.count} aval.</p>
                    </div>

                    <button onClick={() => openEdit(c)} className="text-dim hover:text-ink transition-all" title="Editar">
                      <Pencil size={16} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c)} className="text-dim hover:text-red-400 transition-all" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => toggleExpand(c.id)} className="text-dim hover:text-ink transition-all" title="Ver detalhes">
                      {c.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {c.expanded && (
                  <div className="border-t border-line px-[26px] py-5 grid grid-cols-2 gap-4">
                    {isAdmin && (
                      <>
                        <div>
                          <p className="text-xs text-dim mb-1">Salário</p>
                          <p className="text-ink text-sm">
                            {c.salary != null ? `R$ ${c.salary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dim mb-1">Variável</p>
                          <p className="text-ink text-sm">
                            {c.variable != null ? `R$ ${c.variable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dim mb-1">Login</p>
                          <p className="text-ink text-sm">{c.adminUser?.email ?? <span className="text-dim/40">Sem acesso</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs text-dim mb-1">Data de entrada</p>
                          <p className="text-ink text-sm">
                            {c.hireDate ? new Date(c.hireDate).toLocaleDateString("pt-BR") : "—"}
                          </p>
                        </div>
                        <div className="col-span-2 border-t border-line pt-3 mt-1">
                          <p className="text-[11px] font-bold text-dim uppercase tracking-widest mb-2.5">Dados pessoais</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-dim mb-1">Nome completo</p>
                              <p className="text-ink text-sm">{c.fullName || <span className="text-dim/40">—</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-dim mb-1">Data de nascimento</p>
                              <p className="text-ink text-sm">{c.birthDate ? new Date(c.birthDate).toLocaleDateString("pt-BR") : <span className="text-dim/40">—</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-dim mb-1">CPF</p>
                              <p className="text-ink text-sm">{c.cpf || <span className="text-dim/40">—</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-dim mb-1">CNPJ</p>
                              <p className="text-ink text-sm">{c.cnpj || <span className="text-dim/40">—</span>}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <p className="text-xs text-dim mb-2">Carteira de clientes</p>
                      <div className="flex flex-wrap gap-2">
                        {c.clientPortfolio && c.clientPortfolio.length > 0 ? c.clientPortfolio.map(cp => (
                          <span key={cp.client.id} className="px-2.5 py-1 bg-surface-hover border border-line rounded-[6px] text-xs text-ink">{cp.client.name}</span>
                        )) : <span className="text-dim/40 text-xs">Nenhum cliente atribuído</span>}
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
          <h1 className="text-[34px] font-extrabold text-ink tracking-[-0.01em] mb-2">Operadores</h1>
          <p className="text-base text-dim">Gerencie a equipe de operadores da agência</p>
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
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[14px] bg-surface" />)}
        </div>
      ) : (
        <>
          <CollabSection items={gestores} title="Gestores de Tráfego" />
          <CollabSection items={designers} title="Designers" />
        </>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-raised border-line text-ink max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">
              {editing ? "Editar Operador" : "Novo Operador"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Nome */}
            <div>
              <label className="text-xs text-dim block mb-1">Nome</label>
              <input
                {...register("name")}
                placeholder="Ex: Lucas Mendes"
                className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Cargo */}
            <div>
              <label className="text-xs text-dim block mb-1">Cargo</label>
              <select
                {...register("role")}
                className="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
              >
                <option value="gestor_trafego">Gestor de Tráfego</option>
                <option value="designer">Designer</option>
              </select>
            </div>

            {/* Clientes da carteira */}
            {roleValue === "gestor_trafego" && clients.length > 0 && (
              <div>
                <label className="text-xs text-dim block mb-2">Carteira de clientes</label>
                <div className="flex flex-wrap gap-2">
                  {clients.map(cl => (
                    <button
                      type="button"
                      key={cl.id}
                      onClick={() => toggleClient(cl.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedClients.includes(cl.id) ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-canvas border-line text-dim hover:border-[#5B21F0]/50"}`}
                    >
                      {cl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin-only fields */}
            {isAdmin && (
              <div className="border border-line rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={12} className="text-brand-soft" />
                  <span className="text-xs font-semibold text-brand-soft uppercase tracking-widest">Dados Administrativos</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-dim block mb-1">Salário (R$)</label>
                    <input
                      {...register("salary")}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dim block mb-1">Variável (R$)</label>
                    <input
                      {...register("variable")}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-dim block mb-1">Data de entrada</label>
                  <input
                    {...register("hireDate")}
                    type="date"
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] [color-scheme:dark]"
                  />
                </div>

                {/* Login section */}
                <div className="border-t border-line pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound size={12} className="text-dim" />
                    <span className="text-xs font-semibold text-dim uppercase tracking-widest">Acesso ao Operador Portal</span>
                  </div>

                  {editing && editing.adminUser ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[#4ADE80]">✅ Acesso ativo: {editing.adminUser.email}</p>
                      <div>
                        <label className="text-xs text-dim block mb-1.5">Nível de acesso</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([["operator", "Operador"], ["admin", "Administrador"]] as const).map(([val, lbl]) => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => setValue("loginRole", val)}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${loginRoleValue === val ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-canvas border-line text-dim hover:border-[#5B21F0]/50"}`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                        {loginRoleValue === "admin" && (
                          <p className="text-[11px] text-brand-soft mt-1.5">Administradores têm acesso total ao painel.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-dim block mb-1">Novo email de login</label>
                        <input
                          {...register("loginEmail")}
                          type="email"
                          placeholder={editing.adminUser.email}
                          className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-dim block mb-1">Nova senha <span className="opacity-60">(deixe em branco para não alterar)</span></label>
                        <input
                          {...register("loginPassword")}
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-ink">Criar acesso ao portal</p>
                        <Switch checked={!!createLoginValue} onCheckedChange={(v) => setValue("createLogin", v)} className="data-checked:!bg-[#5B21F0]" />
                      </div>
                      {createLoginValue && (
                        <>
                          <div>
                            <label className="text-xs text-dim block mb-1">Email de login</label>
                            <input
                              {...register("loginEmail")}
                              type="email"
                              placeholder="operador@roi.com.br"
                              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-dim block mb-1">Senha inicial</label>
                            <input
                              {...register("loginPassword")}
                              type="password"
                              placeholder="••••••••"
                              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-dim block mb-1.5">Nível de acesso</label>
                            <div className="grid grid-cols-2 gap-2">
                              {([["operator", "Operador"], ["admin", "Administrador"]] as const).map(([val, lbl]) => (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => setValue("loginRole", val)}
                                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${loginRoleValue === val ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-canvas border-line text-dim hover:border-[#5B21F0]/50"}`}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>
                            {loginRoleValue === "admin" && (
                              <p className="text-[11px] text-brand-soft mt-1.5">Administradores têm acesso total ao painel.</p>
                            )}
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
              <p className="text-sm text-ink">Operador ativo</p>
              <Switch checked={activeValue} onCheckedChange={(v) => setValue("active", v)} className="data-checked:!bg-[#5B21F0]" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-surface-hover hover:bg-surface-hover text-ink font-semibold text-sm py-2.5 rounded-lg transition-all">
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
