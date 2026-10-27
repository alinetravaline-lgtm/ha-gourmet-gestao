import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { ConfigClube } from "./config.ts";
import { type Contexto, processarEvento } from "./sincronizacao.ts";
import { criarStripe, cryptoProvider, type Stripe } from "./stripe.ts";
import type { Admin } from "./supabase.ts";

const CFG: ConfigClube = {
  supabaseUrl: "http://local",
  supabaseSecretKey: "x",
  stripeSecretKey: "sk_test_x",
  livemode: false,
  precoPorPlano: { ha_assinatura: "price_assinatura", ha_club: "price_club" },
  planoPorPreco: { price_assinatura: "ha_assinatura", price_club: "ha_club" },
  appUrl: "https://exemplo.invalid",
  origens: [],
};

const INI = 1_790_000_000, FIM = INI + 30 * 86_400;

function falsoStripe(chamadas: string[]) {
  return {
    invoices: {
      retrieve: (id: string) => {
        chamadas.push(`stripe.invoice:${id}`);
        return Promise.resolve({
          id, customer: "cus_1", currency: "brl", livemode: false, status: "paid", total: 9700, amount_paid: 9700,
          billing_reason: "subscription_cycle", status_transitions: { paid_at: INI + 60 },
          parent: { type: "subscription_details", subscription_details: { subscription: "sub_1" } },
          payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: "pi_1" } }] },
          lines: {
            has_more: false,
            data: [{
              amount: 9700, quantity: 1, period: { start: INI, end: FIM },
              pricing: { price_details: { price: "price_club" } },
              parent: { type: "subscription_item_details", subscription_item_details: { proration: false } },
            }],
          },
        });
      },
    },
    subscriptions: {
      retrieve: (id: string) => {
        chamadas.push(`stripe.subscription:${id}`);
        return Promise.resolve({
          id, customer: "cus_1", status: "active", ended_at: null, cancel_at_period_end: false, cancel_at: null,
          canceled_at: null, livemode: false, created: INI,
          items: { data: [{ quantity: 1, price: { id: "price_club" }, current_period_start: INI, current_period_end: FIM }] },
        });
      },
    },
  } as unknown as Stripe;
}

function falsoAdmin(chamadas: string[], opcoes: { situacao?: string; falharEm?: string } = {}) {
  const args: Record<string, unknown> = {};
  const admin = {
    rpc: (nome: string, a: Record<string, unknown>) => {
      chamadas.push(`rpc:${nome}`);
      args[nome] = a;
      if (nome === opcoes.falharEm) return Promise.resolve({ data: null, error: { message: "falha simulada" } });
      if (nome === "clube_evento_receber") return Promise.resolve({ data: opcoes.situacao ?? "processar", error: null });
      return Promise.resolve({ data: {}, error: null });
    },
    from: () => ({
      select: () => ({
        lte: () => ({
          order: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data: { dados: { tolerancia_pagamento_antes_periodo_seg: 86400 } }, error: null }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as Admin;
  return { admin, args };
}

const evento = (tipo: string, objeto: Record<string, unknown>) =>
  ({ id: "evt_1", type: tipo, livemode: false, created: INI, data: { object: objeto } }) as unknown as Stripe.Event;

Deno.test("invoice.paid relê fatura e assinatura no Stripe, sincroniza antes e conclui o evento junto com a fatura", async () => {
  const chamadas: string[] = [];
  const { admin, args } = falsoAdmin(chamadas);
  const ctx: Contexto = { cfg: CFG, stripe: falsoStripe(chamadas), admin };
  assertEquals(await processarEvento(ctx, evento("invoice.paid", { id: "in_1" })), "processado");
  assertEquals(chamadas, [
    "rpc:clube_evento_receber",
    "stripe.invoice:in_1",
    "stripe.subscription:sub_1",
    "rpc:clube_sincronizar_assinatura",
    "rpc:clube_processar_fatura",
  ]);
  const p = (args.clube_processar_fatura as { p: { elegivel: boolean; plano_chave: string }; p_evento: string });
  assertEquals([p.p.elegivel, p.p.plano_chave, p.p_evento], [true, "ha_club", "evt_1"]);
  assertEquals((args.clube_sincronizar_assinatura as { p_evento: string | null }).p_evento, null);
});

Deno.test("evento já processado não executa nada de novo", async () => {
  const chamadas: string[] = [];
  const { admin } = falsoAdmin(chamadas, { situacao: "processado" });
  const ctx: Contexto = { cfg: CFG, stripe: falsoStripe(chamadas), admin };
  assertEquals(await processarEvento(ctx, evento("invoice.paid", { id: "in_1" })), "repetido");
  assertEquals(chamadas, ["rpc:clube_evento_receber"]);
});

Deno.test("falha no banco marca o evento para nova tentativa e propaga o erro (webhook responde 5xx)", async () => {
  const chamadas: string[] = [];
  const { admin } = falsoAdmin(chamadas, { falharEm: "clube_processar_fatura" });
  const ctx: Contexto = { cfg: CFG, stripe: falsoStripe(chamadas), admin };
  await assertRejects(() => processarEvento(ctx, evento("invoice.paid", { id: "in_1" })));
  assertEquals(chamadas.at(-1), "rpc:clube_evento_falhou");
});

Deno.test("tipo de evento não usado pelo Clube é registrado e ignorado", async () => {
  const chamadas: string[] = [];
  const { admin, args } = falsoAdmin(chamadas);
  const ctx: Contexto = { cfg: CFG, stripe: falsoStripe(chamadas), admin };
  await processarEvento(ctx, evento("customer.created", { id: "cus_1" }));
  assertEquals((args.clube_evento_concluir as { p_status: string }).p_status, "ignorado");
});

Deno.test("assinatura do webhook é verificada sobre o corpo bruto", async () => {
  const stripe = criarStripe("sk_test_x");
  const corpo = JSON.stringify({ id: "evt_1", object: "event", type: "invoice.paid", data: { object: { id: "in_1" } } });
  const segredo = "whsec_teste";
  const cabecalho = await stripe.webhooks.generateTestHeaderStringAsync({ payload: corpo, secret: segredo, cryptoProvider });
  const ev = await stripe.webhooks.constructEventAsync(corpo, cabecalho, segredo, undefined, cryptoProvider);
  assertEquals(ev.id, "evt_1");
  await assertRejects(() =>
    stripe.webhooks.constructEventAsync(corpo.replace("in_1", "in_2"), cabecalho, segredo, undefined, cryptoProvider)
  );
});
