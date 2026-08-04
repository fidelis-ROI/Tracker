// Cargos de colaborador (separado do nível de acesso do login: operator | admin).
export const COLLAB_ROLES = ["gestor_trafego", "lider", "designer"] as const;
export type CollabRole = (typeof COLLAB_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  gestor_trafego: "Gestor de Tráfego",
  lider: "Líder",
  designer: "Designer",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
