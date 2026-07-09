"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Copy, ExternalLink, Pencil, Lock } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  hasDesigner: boolean;
  active: boolean;
  createdAt: string;
  ticket?: number | null;
  contractDate?: string | null;
  services?: string | null;
  operators?: { id: string; name: string }[];
}

interface Collaborator { id: string; name: string; role: string; }

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z.string().min(1, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  hasDesigner: z.boolean(),
  active: z.boolean(),
  ticket: z.string().optional(),
  contractDate: z.string().optional(),
  services: z.string().optional(),
  operatorIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseServices(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export default function ClientesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [clients, setClients] = useState<Client[]>([]);
  const [operators, setOperators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hasDesigner: true, active: true },
  });

  const nameValue = watch("name");
  const hasDesignerValue = watch("hasDesigner");
  const activeValue = watch("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, opRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/collaborators?role=gestor_trafego"),
      ]);
      setClients(await clientRes.json());
      setOperators(await opRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!editing) {
      setValue("slug", generateSlug(nameValue || ""));
    }
  }, [nameValue, editing, setValue]);

  function openCreate() {
    setEditing(null);
    setCreatedClient(null);
    setSelectedOps([]);
    reset({ name: "", slug: "", hasDesigner: true, active: true, ticket: "", contractDate: "", services: "" });
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setCreatedClient(null);
    setSelectedOps(client.operators?.map(o => o.id) ?? []);
    const services = parseServices(client.services);
    reset({
      name: client.name,
      slug: client.slug,
      hasDesigner: client.hasDesigner,
      active: client.active,
      ticket: client.ticket?.toString() ?? "",
      contractDate: client.contractDate ? client.contractDate.slice(0, 10) : "",
      services: services.join(", "),
    });
    setOpen(true);
  }

  function toggleOp(id: string) {
    setSelectedOps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        slug: data.slug,
        hasDesigner: data.hasDesigner,
        active: data.active,
        operatorIds: selectedOps,
      };

      if (isAdmin) {
        payload.ticket = data.ticket ? parseFloat(data.ticket) : null;
        payload.contractDate = data.contractDate || null;
        payload.services = data.services
          ? data.services.split(",").map(s => s.trim()).filter(Boolean)
          : null;
      }

      const url = editing ? `/api/admin/clients/${editing.id}` : "/api/admin/clients";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) { toast.error("Este slug já está em uso."); return; }
      if (!res.ok) throw new Error();

      const saved: Client = await res.json();
      if (!editing) setCreatedClient(saved);
      toast.success(editing ? "Cliente atualizado!" : "Novo cliente cadastrado!");
      load();
      if (editing) setOpen(false);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`);
    toast.success("Link copiado!");
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes da agência"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#1440FF] hover:bg-[#0027D4] text-white text-sm font-semibold font-titillium px-4 py-2.5 rounded-lg transition-all"
          >
            <Plus size={16} />
            Novo Cliente
          </button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-[#0A0F1E]" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🏎️</p>
          <p className="text-white font-titillium font-semibold mb-1">Nenhum cliente cadastrado</p>
          <p className="text-[#8892A4] font-manrope text-sm">Adicione o primeiro cliente da agência.</p>
        </div>
      ) : (
        <div className="bg-[#0A0F1E] border border-[#1A2140] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A2140]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Slug</th>
                  {isAdmin && <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Ticket</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Operador</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Criativos</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#8892A4] uppercase tracking-widest font-titillium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[#1A2140]/50 ${i % 2 === 1 ? "bg-[#1A2140]/10" : ""}`}>
                    <td className="px-5 py-3 text-white font-manrope font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <code className="text-[#8892A4] font-manrope text-xs bg-[#1A2140] px-2 py-0.5 rounded">/r/{c.slug}</code>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-[#8892A4] font-manrope text-xs">
                        {c.ticket != null ? `R$ ${c.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : <span className="opacity-40">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.operators && c.operators.length > 0 ? c.operators.map(o => (
                          <span key={o.id} className="px-1.5 py-0.5 bg-[#1A2140] rounded text-xs text-white font-manrope">{o.name}</span>
                        )) : <span className="text-[#8892A4]/40 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold font-titillium px-2 py-0.5 rounded-full border ${c.hasDesigner ? "border-green-800 text-green-400 bg-green-900/20" : "border-[#1A2140] text-[#8892A4]"}`}>
                        {c.hasDesigner ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold font-titillium px-2 py-0.5 rounded-full border ${c.active ? "border-blue-800 text-[#1440FF] bg-blue-900/20" : "border-[#1A2140] text-[#8892A4]"}`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(c.slug)} className="p-1.5 rounded hover:bg-[#1A2140] text-[#8892A4] hover:text-white transition-all" title="Copiar link">
                          <Copy size={14} />
                        </button>
                        <a href={`/r/${c.slug}`} target="_blank" className="p-1.5 rounded hover:bg-[#1A2140] text-[#8892A4] hover:text-white transition-all" title="Abrir formulário">
                          <ExternalLink size={14} />
                        </a>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-[#1A2140] text-[#8892A4] hover:text-white transition-all" title="Editar">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0A0F1E] border-[#1A2140] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-titillium">
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          {createdClient ? (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <p className="text-green-400 font-semibold font-titillium text-sm mb-2">✅ Cliente cadastrado!</p>
                <p className="text-[#8892A4] text-xs font-manrope mb-3">Link do Pit Stop Report:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#00020A] border border-[#1A2140] rounded px-3 py-2 text-xs text-[#1440FF] font-manrope">
                    {window.location.origin}/r/{createdClient.slug}
                  </code>
                  <button onClick={() => copyLink(createdClient.slug)} className="p-2 bg-[#1440FF] rounded-lg text-white hover:bg-[#0027D4] transition-all">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <button onClick={() => { setOpen(false); setCreatedClient(null); }} className="w-full bg-[#1A2140] hover:bg-[#1A2140]/80 text-white font-semibold font-titillium text-sm py-2.5 rounded-lg transition-all">
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              {/* Nome */}
              <div>
                <label className="text-xs text-[#8892A4] font-manrope block mb-1">Nome do cliente</label>
                <input
                  {...register("name")}
                  placeholder="Ex: Autoforce SP"
                  className="w-full bg-[#00020A] border border-[#1A2140] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs text-[#8892A4] font-manrope block mb-1">Slug (URL)</label>
                <div className="flex items-center">
                  <span className="bg-[#1A2140] border border-r-0 border-[#1A2140] rounded-l-lg px-3 py-2.5 text-xs text-[#8892A4] font-manrope">/r/</span>
                  <input
                    {...register("slug")}
                    placeholder="autoforce-sp"
                    className="flex-1 bg-[#00020A] border border-[#1A2140] rounded-r-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
                  />
                </div>
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              {/* Operadores */}
              {operators.length > 0 && (
                <div>
                  <label className="text-xs text-[#8892A4] font-manrope block mb-2">Operadores responsáveis</label>
                  <div className="flex flex-wrap gap-2">
                    {operators.map(op => (
                      <button
                        type="button"
                        key={op.id}
                        onClick={() => toggleOp(op.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-manrope border transition-all ${selectedOps.includes(op.id) ? "bg-[#1440FF]/20 border-[#1440FF] text-white" : "bg-[#00020A] border-[#1A2140] text-[#8892A4] hover:border-[#1440FF]/50"}`}
                      >
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin-only fields */}
              {isAdmin && (
                <div className="border border-[#1A2140] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={12} className="text-[#1440FF]" />
                    <span className="text-xs font-semibold text-[#1440FF] font-titillium uppercase tracking-widest">Dados Administrativos</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#8892A4] font-manrope block mb-1">Ticket (R$)</label>
                      <input
                        {...register("ticket")}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full bg-[#00020A] border border-[#1A2140] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#8892A4] font-manrope block mb-1">Data de contratação</label>
                      <input
                        {...register("contractDate")}
                        type="date"
                        className="w-full bg-[#00020A] border border-[#1A2140] rounded-lg px-3 py-2 text-sm text-white font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF] [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#8892A4] font-manrope block mb-1">Serviços contratados <span className="opacity-60">(separados por vírgula)</span></label>
                    <input
                      {...register("services")}
                      placeholder="Tráfego pago, Social media, E-mail marketing"
                      className="w-full bg-[#00020A] border border-[#1A2140] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8892A4]/50 font-manrope focus:outline-none focus:ring-2 focus:ring-[#1440FF]"
                    />
                  </div>
                </div>
              )}

              {/* Switches */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white font-manrope">Contrata serviço de criativos?</p>
                  <p className="text-xs text-[#8892A4] font-manrope">Exibe bloco de avaliação de designer</p>
                </div>
                <Switch checked={hasDesignerValue} onCheckedChange={(v) => setValue("hasDesigner", v)} />
              </div>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-white font-manrope">Cliente ativo</p>
                <Switch checked={activeValue} onCheckedChange={(v) => setValue("active", v)} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-[#1A2140] hover:bg-[#1A2140]/80 text-white font-semibold font-titillium text-sm py-2.5 rounded-lg transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#1440FF] hover:bg-[#0027D4] disabled:opacity-60 text-white font-semibold font-titillium text-sm py-2.5 rounded-lg transition-all">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
