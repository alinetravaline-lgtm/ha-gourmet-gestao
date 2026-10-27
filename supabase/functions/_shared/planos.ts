// Espelho da tabela public.clube_planos (o banco confere novamente valor e moeda antes de conceder).
export type PlanoChave = "ha_assinatura" | "ha_club";

export const PLANOS: Record<PlanoChave, { nome: string; valorCentavos: number }> = {
  ha_assinatura: { nome: "Assinatura HA Gourmet", valorCentavos: 4990 },
  ha_club: { nome: "HA Gourmet Club", valorCentavos: 9700 },
};

export function ehPlanoChave(v: unknown): v is PlanoChave {
  return v === "ha_assinatura" || v === "ha_club";
}
