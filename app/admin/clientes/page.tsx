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
import { Plus, Copy, ExternalLink, Pencil, Lock, Search, Trash2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  hasDesigner: boolean;
  active: boolean;
  brand: "roi" | "nitroads";
  createdAt: string;
  ticket?: number | null;
  contractDate?: string | null;
  services?: string | null;
  operators?: { id: string; name: string }[];
}

interface Collaborator { id: string; name: string; role: string; }

const SERVICE_OPTIONS = ["Tráfego", "Estratégia", "Criativos", "Design", "CRM", "RevOps", "Consultoria", "Social Media", "E-mail Marketing"];

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z.string().min(1, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  hasDesigner: z.boolean(),
  active: z.boolean(),
  brand: z.enum(["roi", "nitroads"]),
  ticket: z.string().optional(),
  contractDate: z.string().optional(),
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
  const [designers, setDesigners] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState("");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hasDesigner: true, active: true, brand: "roi" },
  });

  const nameValue = watch("name");
  const hasDesignerValue = watch("hasDesigner");
  const activeValue = watch("active");
  const brandValue = watch("brand");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, opRes, designerRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/collaborators?role=gestor_trafego"),
        fetch("/api/admin/collaborators?role=designer"),
      ]);
      setClients(await clientRes.json());
      setOperators(await opRes.json());
      setDesigners(await designerRes.json());
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
    setSelectedServices([]);
    setCustomService("");
    reset({ name: "", slug: "", hasDesigner: true, active: true, brand: "roi", ticket: "", contractDate: "" });
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setCreatedClient(null);
    setSelectedOps(client.operators?.map(o => o.id) ?? []);
    setSelectedServices(parseServices(client.services));
    setCustomService("");
    reset({
      name: client.name,
      slug: client.slug,
      hasDesigner: client.hasDesigner,
      active: client.active,
      brand: client.brand,
      ticket: client.ticket?.toString() ?? "",
      contractDate: client.contractDate ? client.contractDate.slice(0, 10) : "",
    });
    setOpen(true);
  }

  function toggleOp(id: string) {
    setSelectedOps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleService(service: string) {
    setSelectedServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
  }

  function addCustomService() {
    const value = customService.trim();
    if (!value || selectedServices.includes(value)) return;
    setSelectedServices(prev => [...prev, value]);
    setCustomService("");
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        slug: data.slug,
        hasDesigner: data.hasDesigner,
        active: data.active,
        brand: data.brand,
        operatorIds: selectedOps,
      };

      if (isAdmin) {
        payload.ticket = data.ticket ? parseFloat(data.ticket) : null;
        payload.contractDate = data.contractDate || null;
        payload.services = selectedServices.length ? selectedServices : null;
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

  async function handleDelete(client: Client) {
    if (!window.confirm(`Excluir o cliente "${client.name}"? Ele deixará de aparecer nas listagens (o histórico de avaliações e dados financeiros é mantido).`)) return;
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Cliente excluído.");
      load();
    } catch {
      toast.error("Erro ao excluir. Tente novamente.");
    }
  }

  const gridCols = isAdmin
    ? "grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.1fr_0.8fr_0.8fr_1fr]"
    : "grid-cols-[1.4fr_1.1fr_0.9fr_1.1fr_0.8fr_0.8fr_1fr]";

  return (
    <div className="px-16 py-14">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[34px] font-extrabold text-white tracking-[-0.01em] mb-2">Clientes</h1>
          <p className="text-base text-[#8A8FA3]">Gerencie os clientes da agência</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#5B21F0] hover:bg-[#4A1AD0] text-white text-[15px] font-bold px-[22px] py-3.5 rounded-[10px] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[14px] bg-white/[0.03]" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-[70px] px-5 flex flex-col items-center justify-center gap-3.5">
          <Search size={34} strokeWidth={1.8} className="text-[#5A5F72]" />
          <p className="text-base text-[#8A8FA3]">Nenhum cliente cadastrado. Adicione o primeiro cliente da agência.</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className={`grid ${gridCols} items-center px-[26px] py-[18px] border-b border-white/[0.08]`}>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">NOME</span>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">SLUG</span>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">MARCA</span>
                {isAdmin && <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">TICKET</span>}
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">OPERADOR</span>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">CRIATIVOS</span>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">STATUS</span>
                <span className="text-xs font-bold tracking-[0.06em] text-[#8A8FA3]">AÇÕES</span>
              </div>

              {clients.map((c, i) => (
                <div
                  key={c.id}
                  className={`grid ${gridCols} items-center px-[26px] py-5 ${i < clients.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                >
                  <span className="text-base font-semibold text-white">{c.name}</span>
                  <span>
                    <code className="inline-block bg-white/[0.07] border border-white/10 rounded-[6px] px-2.5 py-1 text-[13.5px] text-[#B7BBCB] font-mono">
                      /r/{c.slug}
                    </code>
                  </span>
                  <span>
                    {c.brand === "nitroads" ? (
                      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#1440FF]/[0.18] border border-[#1440FF]/30 text-[#5B8DFF]">
                        NitroAds
                      </span>
                    ) : (
                      <span className="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold bg-[#5B21F0]/[0.22] text-[#8B6BFF]">
                        ROI
                      </span>
                    )}
                  </span>
                  {isAdmin && (
                    <span className="text-[14.5px] text-[#B7BBCB]">
                      {c.ticket != null ? `R$ ${c.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : <span className="opacity-40">—</span>}
                    </span>
                  )}
                  <span className="flex flex-wrap gap-1.5">
                    {c.operators && c.operators.length > 0 ? c.operators.map(o => (
                      <span key={o.id} className="bg-white/[0.07] border border-white/10 rounded-[6px] px-3 py-1 text-sm text-white">{o.name}</span>
                    )) : <span className="text-[#8A8FA3]/40 text-xs">—</span>}
                  </span>
                  <span>
                    <span className={cn_pill(c.hasDesigner ? "green" : "neutral")}>
                      {c.hasDesigner ? "Sim" : "Não"}
                    </span>
                  </span>
                  <span>
                    <span className={cn_pill(c.active ? "purple" : "neutral")}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </span>
                  <div className="flex items-center gap-4 text-[#8A8FA3]">
                    <button onClick={() => copyLink(c.slug)} className="hover:text-white transition-all" title="Copiar link">
                      <Copy size={16} />
                    </button>
                    <a href={`/r/${c.slug}`} target="_blank" className="hover:text-white transition-all" title="Abrir formulário">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={() => openEdit(c)} className="hover:text-white transition-all" title="Editar">
                      <Pencil size={16} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c)} className="hover:text-red-400 transition-all" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#12141F] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">
              {editing ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          {createdClient ? (
            <div className="space-y-4">
              <div className="bg-[#5B21F0]/10 border border-[#5B21F0]/30 rounded-xl p-4">
                <p className="text-[#A970FF] font-semibold text-sm mb-2">✅ Cliente cadastrado!</p>
                <p className="text-[#8A8FA3] text-xs mb-3">Link do formulário de avaliação:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#0B0E17] border border-white/10 rounded px-3 py-2 text-xs text-[#A970FF]">
                    {window.location.origin}/r/{createdClient.slug}
                  </code>
                  <button onClick={() => copyLink(createdClient.slug)} className="p-2 bg-[#5B21F0] rounded-lg text-white hover:bg-[#4A1AD0] transition-all">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <button onClick={() => { setOpen(false); setCreatedClient(null); }} className="w-full bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-sm py-2.5 rounded-lg transition-all">
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              {/* Nome */}
              <div>
                <label className="text-xs text-[#8A8FA3] block mb-1">Nome do cliente</label>
                <input
                  {...register("name")}
                  placeholder="Ex: Autoforce SP"
                  className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs text-[#8A8FA3] block mb-1">Slug (URL)</label>
                <div className="flex items-center">
                  <span className="bg-white/[0.06] border border-r-0 border-white/10 rounded-l-lg px-3 py-2.5 text-xs text-[#8A8FA3]">/r/</span>
                  <input
                    {...register("slug")}
                    placeholder="autoforce-sp"
                    className="flex-1 bg-[#0B0E17] border border-white/10 rounded-r-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                  />
                </div>
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              {/* Marca */}
              <div>
                <label className="text-xs text-[#8A8FA3] block mb-2">Marca do cliente</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("brand", "roi")}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${brandValue === "roi" ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#5B21F0]/50"}`}
                  >
                    Cliente ROI
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("brand", "nitroads")}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${brandValue === "nitroads" ? "bg-[#1440FF]/20 border-[#1440FF] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#1440FF]/50"}`}
                  >
                    Cliente NitroAds
                  </button>
                </div>
                <p className="text-xs text-[#8A8FA3]/70 mt-1.5">Define a estética da tela pública de avaliação (/r/{"{"}slug{"}"}).</p>
              </div>

              {/* Operadores */}
              {operators.length > 0 && (
                <div>
                  <label className="text-xs text-[#8A8FA3] block mb-2">Gestor de tráfego responsável</label>
                  <div className="flex flex-wrap gap-2">
                    {operators.map(op => (
                      <button
                        type="button"
                        key={op.id}
                        onClick={() => toggleOp(op.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedOps.includes(op.id) ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#5B21F0]/50"}`}
                      >
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Designer */}
              {hasDesignerValue && designers.length > 0 && (
                <div>
                  <label className="text-xs text-[#8A8FA3] block mb-2">Designer responsável</label>
                  <div className="flex flex-wrap gap-2">
                    {designers.map(d => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleOp(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedOps.includes(d.id) ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#5B21F0]/50"}`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(operators.length > 0 || (hasDesignerValue && designers.length > 0)) && (
                <p className="text-xs text-[#8A8FA3]/70 -mt-2">Define quem é atribuído às avaliações — o cliente não escolhe isso na hora de votar.</p>
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
                      <label className="text-xs text-[#8A8FA3] block mb-1">Ticket (R$)</label>
                      <input
                        {...register("ticket")}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#8A8FA3] block mb-1">Data de contratação</label>
                      <input
                        {...register("contractDate")}
                        type="date"
                        className="w-full bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7C1EFB] [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#8A8FA3] block mb-2">Serviços contratados</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[...new Set([...SERVICE_OPTIONS, ...selectedServices])].map(service => (
                        <button
                          type="button"
                          key={service}
                          onClick={() => toggleService(service)}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedServices.includes(service) ? "bg-[#5B21F0]/20 border-[#5B21F0] text-white" : "bg-[#0B0E17] border-white/10 text-[#8A8FA3] hover:border-[#5B21F0]/50"}`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={customService}
                        onChange={(e) => setCustomService(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomService(); } }}
                        placeholder="Outro serviço..."
                        className="flex-1 bg-[#0B0E17] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8FA3]/50 focus:outline-none focus:ring-2 focus:ring-[#7C1EFB]"
                      />
                      <button
                        type="button"
                        onClick={addCustomService}
                        className="bg-white/[0.06] hover:bg-white/10 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Switches */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white">Contrata serviço de criativos?</p>
                  <p className="text-xs text-[#8A8FA3]">Exibe bloco de avaliação de designer</p>
                </div>
                <Switch checked={hasDesignerValue} onCheckedChange={(v) => setValue("hasDesigner", v)} className="data-checked:!bg-[#5B21F0]" />
              </div>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-white">Cliente ativo</p>
                <Switch checked={activeValue} onCheckedChange={(v) => setValue("active", v)} className="data-checked:!bg-[#5B21F0]" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white font-semibold text-sm py-2.5 rounded-lg transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#5B21F0] hover:bg-[#4A1AD0] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-all">
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

function cn_pill(variant: "purple" | "green" | "neutral") {
  const base = "inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold";
  if (variant === "purple") return `${base} bg-[#5B21F0]/[0.22] text-[#8B6BFF] font-bold`;
  if (variant === "green") return `${base} bg-[#22C55E]/[0.15] border border-[#22C55E]/30 text-[#4ADE80]`;
  return `${base} bg-white/[0.06] border border-white/10 text-[#9BA0B4] font-normal`;
}
