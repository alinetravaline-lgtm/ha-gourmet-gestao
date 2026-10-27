import type { PlanoChave } from "./planos.ts";

export interface ConfigClube {
  supabaseUrl: string;
  supabaseSecretKey: string;
  stripeSecretKey: string;
  livemode: boolean;
  precoPorPlano: Record<PlanoChave, string>;
  planoPorPreco: Record<string, PlanoChave>;
  appUrl: string;
  origens: string[];
}

export class ErroConfig extends Error {}

function obrigatoria(nome: string, faltando: string[]): string {
  const v = Deno.env.get(nome)?.trim();
  if (!v) faltando.push(nome);
  return v ?? "";
}

// Segredos ficam nos Secrets das Edge Functions; mensagens de erro citam só os nomes, nunca os valores.
export function lerConfig(): ConfigClube {
  const faltando: string[] = [];
  const supabaseUrl = obrigatoria("SUPABASE_URL", faltando);
  const supabaseSecretKey = Deno.env.get("CLUBE_SUPABASE_SECRET_KEY")?.trim() ||
    obrigatoria("SUPABASE_SERVICE_ROLE_KEY", faltando);
  const stripeSecretKey = obrigatoria("STRIPE_SECRET_KEY", faltando);
  const precoAssinatura = obrigatoria("STRIPE_PRICE_HA_ASSINATURA", faltando);
  const precoClub = obrigatoria("STRIPE_PRICE_HA_CLUB", faltando);
  const appUrl = obrigatoria("CLUBE_APP_URL", faltando).replace(/\/+$/, "");
  if (faltando.length) throw new ErroConfig(`Configuração ausente: ${faltando.join(", ")}`);
  if (!/^(sk|rk)_(test|live)_/.test(stripeSecretKey)) throw new ErroConfig("STRIPE_SECRET_KEY em formato inesperado");
  if (!/^price_/.test(precoAssinatura) || !/^price_/.test(precoClub) || precoAssinatura === precoClub) {
    throw new ErroConfig("STRIPE_PRICE_HA_ASSINATURA/STRIPE_PRICE_HA_CLUB inválidos");
  }
  const origens = (Deno.env.get("CLUBE_ALLOWED_ORIGINS") ?? new URL(appUrl).origin)
    .split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
  return {
    supabaseUrl,
    supabaseSecretKey,
    stripeSecretKey,
    livemode: /^(sk|rk)_live_/.test(stripeSecretKey),
    precoPorPlano: { ha_assinatura: precoAssinatura, ha_club: precoClub },
    planoPorPreco: { [precoAssinatura]: "ha_assinatura", [precoClub]: "ha_club" },
    appUrl,
    origens,
  };
}

export function segredo(nome: string): string {
  const v = Deno.env.get(nome)?.trim();
  if (!v) throw new ErroConfig(`Configuração ausente: ${nome}`);
  return v;
}
