// Configura no Stripe (modo de teste por padrão) os dois preços mensais, o Customer Portal e o endpoint de webhook.
// Idempotente: reutiliza o que já existe (lookup_key, metadata e URL). Não grava segredos em arquivo.
//
// Uso (PowerShell):
//   $env:STRIPE_SECRET_KEY = "sk_test_..."           # nunca cole a chave em chat ou commit
//   $env:CLUBE_APP_URL = "https://seu-dominio"       # URL pública do site
//   $env:CLUBE_WEBHOOK_URL = "https://<ref>.supabase.co/functions/v1/clube-stripe-webhook"
//   node scripts/stripe-configurar.mjs [--permitir-producao] [--gravar-env supabase/functions/.env]
// Com --gravar-env, a chave, os IDs e o segredo do webhook vão direto para o arquivo (fora do git), sem aparecer
// no terminal; depois: npx supabase secrets set --env-file supabase/functions/.env
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const API_VERSION = "2026-09-30.endive";
const PLANOS = [
  { chave: "ha_assinatura", nome: "Assinatura HA Gourmet", valor: 4990 },
  { chave: "ha_club", nome: "HA Gourmet Club", valor: 9700 },
];
const EVENTOS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "charge.refunded",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
];

const chave = process.env.STRIPE_SECRET_KEY ?? "";
const appUrl = (process.env.CLUBE_APP_URL ?? "").replace(/\/+$/, "");
const webhookUrl = process.env.CLUBE_WEBHOOK_URL ?? "";
const iEnv = process.argv.indexOf("--gravar-env");
const arquivoEnv = iEnv > -1 ? process.argv[iEnv + 1] : null;
if (iEnv > -1 && !arquivoEnv) {
  console.error("Informe o arquivo depois de --gravar-env.");
  process.exit(1);
}
if (!/^(sk|rk)_(test|live)_/.test(chave) || !/^https:\/\//.test(appUrl) || !/^https:\/\//.test(webhookUrl)) {
  console.error("Defina STRIPE_SECRET_KEY, CLUBE_APP_URL e CLUBE_WEBHOOK_URL (https).");
  process.exit(1);
}
if (chave.includes("_live_") && !process.argv.includes("--permitir-producao")) {
  console.error("Chave de produção detectada. Rode primeiro em modo de teste; use --permitir-producao só na virada combinada.");
  process.exit(1);
}

function form(obj, prefixo = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const nome = prefixo ? `${prefixo}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => (typeof item === "object" ? form(item, `${nome}[${i}]`, out) : out.append(`${nome}[]`, String(item))));
    } else if (v !== null && typeof v === "object") form(v, nome, out);
    else out.append(nome, String(v));
  }
  return out;
}

async function stripe(metodo, caminho, corpo) {
  const r = await fetch(`https://api.stripe.com/v1/${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${chave}`,
      "Stripe-Version": API_VERSION,
      ...(corpo ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: corpo ? form(corpo) : undefined,
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(`${metodo} ${caminho}: ${dados.error?.message ?? r.status}`);
  return dados;
}

const precos = {};
for (const p of PLANOS) {
  const existentes = await stripe("GET", `prices?active=true&lookup_keys[]=${p.chave}&expand[]=data.product`);
  let preco = existentes.data[0];
  if (preco && (preco.unit_amount !== p.valor || preco.currency !== "brl" || preco.recurring?.interval !== "month")) {
    throw new Error(`Preço ${p.chave} existe com valor/moeda/intervalo diferente. Revise no painel antes de continuar.`);
  }
  if (!preco) {
    const produto = await stripe("POST", "products", { name: p.nome, metadata: { clube_plano: p.chave } });
    preco = await stripe("POST", "prices", {
      product: produto.id,
      currency: "brl",
      unit_amount: p.valor,
      recurring: { interval: "month" },
      lookup_key: p.chave,
      nickname: `${p.nome} (mensal)`,
      metadata: { clube_plano: p.chave },
    });
  }
  precos[p.chave] = preco.id;
}

const portalCorpo = {
  business_profile: { headline: "HA Gourmet — sua assinatura" },
  default_return_url: `${appUrl}/membros/`,
  features: {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    customer_update: { enabled: false },
    subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
    // Troca de plano desligada: ajustes proporcionais e benefícios em dobro ainda não estão tratados.
    subscription_update: { enabled: false },
  },
  metadata: { clube: "ha-gourmet" },
};
const portais = await stripe("GET", "billing_portal/configurations?active=true&limit=100");
const portalExistente = portais.data.find((c) => c.metadata?.clube === "ha-gourmet");
const portal = portalExistente
  ? await stripe("POST", `billing_portal/configurations/${portalExistente.id}`, portalCorpo)
  : await stripe("POST", "billing_portal/configurations", portalCorpo);

const endpoints = await stripe("GET", "webhook_endpoints?limit=100");
const endpointExistente = endpoints.data.find((e) => e.url === webhookUrl);
let segredoNovo = null;
if (endpointExistente) {
  if (endpointExistente.api_version !== API_VERSION) {
    console.warn(`Atenção: o endpoint existente usa a versão ${endpointExistente.api_version}; crie outro com ${API_VERSION}.`);
  }
  await stripe("POST", `webhook_endpoints/${endpointExistente.id}`, { enabled_events: EVENTOS });
} else {
  const criado = await stripe("POST", "webhook_endpoints", {
    url: webhookUrl,
    enabled_events: EVENTOS,
    api_version: API_VERSION,
    description: "HA Gourmet Clube",
  });
  segredoNovo = criado.secret;
}

if (arquivoEnv) {
  const valores = {
    CLUBE_APP_URL: appUrl,
    STRIPE_SECRET_KEY: chave,
    STRIPE_PRICE_HA_ASSINATURA: precos.ha_assinatura,
    STRIPE_PRICE_HA_CLUB: precos.ha_club,
    STRIPE_PORTAL_CONFIG_ID: portal.id,
    ...(segredoNovo ? { STRIPE_WEBHOOK_SECRET: segredoNovo } : {}),
  };
  const linhas = existsSync(arquivoEnv) ? readFileSync(arquivoEnv, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/) : [];
  for (const [nome, valor] of Object.entries(valores)) {
    const i = linhas.findIndex((l) => new RegExp(`^#?\\s*${nome}=`).test(l));
    if (i > -1) linhas[i] = `${nome}=${valor}`;
    else linhas.push(`${nome}=${valor}`);
  }
  writeFileSync(arquivoEnv, linhas.join("\n").replace(/\n*$/, "\n"));
  console.log(`\nGravado em ${arquivoEnv}: ${Object.keys(valores).join(", ")}`);
  if (!segredoNovo) console.log("STRIPE_WEBHOOK_SECRET não mudou (endpoint já existia): confira se ele já está no arquivo.");
  console.log("Próximo passo: npx supabase secrets set --env-file " + arquivoEnv);
  process.exit(0);
}

console.log("\nConfigure estes Secrets nas Edge Functions (supabase secrets set ...):");
console.log(`  STRIPE_PRICE_HA_ASSINATURA=${precos.ha_assinatura}`);
console.log(`  STRIPE_PRICE_HA_CLUB=${precos.ha_club}`);
console.log(`  STRIPE_PORTAL_CONFIG_ID=${portal.id}`);
if (segredoNovo) {
  console.log("  STRIPE_WEBHOOK_SECRET=<exibido uma única vez abaixo; copie direto para o Secret e limpe o terminal>");
  console.log(`  ${segredoNovo}`);
} else {
  console.log("  STRIPE_WEBHOOK_SECRET já existente (consulte em Developers > Webhooks, se necessário).");
}
