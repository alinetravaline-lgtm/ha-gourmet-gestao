import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import type Stripe from "npm:stripe@23.0.1";
import { AguardarNovaTentativa, avaliarFatura, normalizarAssinatura, type RegrasStripe } from "./fatura.ts";

const REGRAS: RegrasStripe = {
  planoPorPreco: { price_assinatura: "ha_assinatura", price_club: "ha_club" },
  livemode: false,
  toleranciaAntesDoPeriodoSeg: 86_400,
};
const t = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const INI = t("2026-10-05T12:00:00Z");
const FIM = t("2026-11-05T12:00:00Z");

function linha(opcoes: { preco?: string; valor?: number; prorata?: boolean; avulsa?: boolean; ini?: number; fim?: number } = {}) {
  return {
    id: "il_1",
    amount: opcoes.valor ?? 9700,
    quantity: 1,
    period: { start: opcoes.ini ?? INI, end: opcoes.fim ?? FIM },
    pricing: { type: "price_details", price_details: { price: opcoes.preco ?? "price_club", product: "prod_1" } },
    parent: opcoes.avulsa
      ? { type: "invoice_item_details", invoice_item_details: { invoice_item: "ii_1" }, subscription_item_details: null }
      : {
        type: "subscription_item_details",
        invoice_item_details: null,
        subscription_item_details: { proration: opcoes.prorata ?? false, subscription: "sub_1", subscription_item: "si_1" },
      },
  } as unknown as Stripe.InvoiceLineItem;
}

function fatura(opcoes: Partial<{
  status: string;
  pago: number;
  pagoEm: number | null;
  motivo: string;
  livemode: boolean;
  semSub: boolean;
  semPagamento: boolean;
  moeda: string;
}> = {}) {
  return {
    id: "in_1",
    customer: "cus_1",
    currency: opcoes.moeda ?? "brl",
    livemode: opcoes.livemode ?? false,
    status: opcoes.status ?? "paid",
    total: 9700,
    amount_paid: opcoes.pago ?? 9700,
    billing_reason: opcoes.motivo ?? "subscription_cycle",
    status_transitions: { paid_at: opcoes.pagoEm === undefined ? INI + 30 : opcoes.pagoEm },
    parent: opcoes.semSub ? null : { type: "subscription_details", subscription_details: { subscription: "sub_1" } },
    payments: {
      data: opcoes.semPagamento ? [] : [{
        status: "paid",
        payment: { type: "payment_intent", payment_intent: "pi_1", charge: "ch_1" },
      }],
    },
  } as unknown as Stripe.Invoice;
}

function assinatura(status = "active", endedAt: number | null = null) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status,
    ended_at: endedAt,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    livemode: false,
    created: INI,
    items: { data: [{ quantity: 1, price: { id: "price_club" }, current_period_start: INI, current_period_end: FIM }] },
  } as unknown as Stripe.Subscription;
}

const avaliar = (f = fatura(), l = [linha()], s: Stripe.Subscription | null = assinatura()) => avaliarFatura(f, l, s, REGRAS);

Deno.test("mensalidade cheia, preço permitido e paga no ciclo é elegível", () => {
  const r = avaliar();
  assertEquals([r.classificacao, r.elegivel, r.plano_chave], ["mensalidade", true, "ha_club"]);
  assertEquals([r.periodo_inicio, r.periodo_fim], ["2026-10-05T12:00:00.000Z", "2026-11-05T12:00:00.000Z"]);
  assertEquals([r.stripe_payment_intent_id, r.stripe_charge_id], ["pi_1", "ch_1"]);
});

Deno.test("primeiro pagamento é classificado como primeira mensalidade", () => {
  assertEquals(avaliar(fatura({ motivo: "subscription_create" })).classificacao, "primeira_mensalidade");
});

Deno.test("plano de R$ 49,90 é reconhecido pelo preço e pelo valor", () => {
  const r = avaliar(fatura({ pago: 4990 }), [linha({ preco: "price_assinatura", valor: 4990 })]);
  assertEquals([r.plano_chave, r.elegivel], ["ha_assinatura", true]);
});

Deno.test("cobrança falhada ou em aberto não concede", () => {
  const r = avaliar(fatura({ status: "open", pago: 0, pagoEm: null }));
  assertEquals([r.classificacao, r.elegivel], ["pendente", false]);
});

Deno.test("fatura zerada (cupom de 100%) não concede", () => {
  assertEquals(avaliar(fatura({ pago: 0 })).classificacao, "zerada");
});

Deno.test("preço desconhecido, valor divergente ou moeda diferente são inválidos", () => {
  assertEquals(avaliar(fatura(), [linha({ preco: "price_outro" })]).motivo, "preco_nao_permitido");
  assertEquals(avaliar(fatura(), [linha({ valor: 9000 })]).motivo, "valor_da_linha_divergente");
  assertEquals(avaliar(fatura({ moeda: "usd" })).motivo, "moeda_divergente");
  assertEquals(avaliar(fatura({ pago: 5000 })).motivo, "valor_pago_menor_que_o_plano");
});

Deno.test("proporcionalidade e linhas avulsas não autorizam benefício mensal", () => {
  assertEquals(avaliar(fatura(), [linha({ prorata: true })]).classificacao, "proporcional");
  assertEquals(avaliar(fatura(), [linha(), linha({ prorata: true, valor: -500 })]).classificacao, "ajuste");
  assertEquals(avaliar(fatura(), [linha(), linha({ avulsa: true, valor: 1500 })]).classificacao, "ajuste");
  assertEquals(avaliar(fatura({ motivo: "subscription_update" })).classificacao, "ajuste");
  assertEquals(avaliar(fatura({ motivo: "manual" })).elegivel, false);
});

Deno.test("fatura sem assinatura é compra avulsa", () => {
  const r = avaliar(fatura({ semSub: true }), [linha({ avulsa: true })], null);
  assertEquals([r.classificacao, r.elegivel], ["avulsa", false]);
});

Deno.test("marcada como paga fora do fluxo (sem pagamento por cartão) vai para análise", () => {
  assertEquals(avaliar(fatura({ semPagamento: true })).classificacao, "fora_do_fluxo");
});

Deno.test("pagamento atrasado dentro do ciclo vale, sem estender validade; depois do fim, não", () => {
  const atrasado = avaliar(fatura({ pagoEm: FIM - 3600 }));
  assertEquals([atrasado.elegivel, atrasado.periodo_fim], [true, "2026-11-05T12:00:00.000Z"]);
  assertEquals(avaliar(fatura({ pagoEm: FIM })).classificacao, "fora_do_periodo");
  assertEquals(avaliar(fatura({ pagoEm: INI - 2 * 86_400 })).classificacao, "fora_do_periodo");
  assertEquals(avaliar(fatura({ pagoEm: INI - 3600 })).elegivel, true);
});

Deno.test("ambiente diferente (teste x produção) nunca concede", () => {
  assertEquals(avaliar(fatura({ livemode: true })).motivo, "ambiente_divergente");
});

Deno.test("assinatura incompleta pede nova tentativa; cancelada ao fim do ciclo pago vale", () => {
  assertThrows(() => avaliar(fatura(), [linha()], assinatura("incomplete")), AguardarNovaTentativa);
  assertThrows(() => avaliar(fatura(), [linha()], null), AguardarNovaTentativa);
  assertEquals(avaliar(fatura(), [linha()], assinatura("canceled", FIM)).elegivel, true);
  assertEquals(avaliar(fatura(), [linha()], assinatura("canceled", INI + 86_400)).classificacao, "invalida");
  assertEquals(avaliar(fatura(), [linha()], assinatura("past_due")).elegivel, true);
  assertEquals(avaliar(fatura(), [linha()], assinatura("incomplete_expired")).elegivel, false);
});

Deno.test("ciclos em meses de 28/29/30/31 dias usam exatamente o período do Stripe", () => {
  const ini = t("2028-01-31T03:00:00Z"), fim = t("2028-02-29T03:00:00Z");
  const r = avaliar(fatura({ pagoEm: ini + 60 }), [linha({ ini, fim })]);
  assertEquals([r.periodo_inicio, r.periodo_fim, r.elegivel], ["2028-01-31T03:00:00.000Z", "2028-02-29T03:00:00.000Z", true]);
});

Deno.test("assinatura normalizada usa o período do item e o plano pelo preço", () => {
  const s = normalizarAssinatura(assinatura(), REGRAS, new Date("2026-10-06T00:00:00Z"));
  assertEquals([s.plano_chave, s.periodo_atual_inicio, s.periodo_atual_fim], ["ha_club", "2026-10-05T12:00:00.000Z", "2026-11-05T12:00:00.000Z"]);
  const dois = { ...assinatura(), items: { data: [assinatura().items.data[0], assinatura().items.data[0]] } } as Stripe.Subscription;
  assertEquals(normalizarAssinatura(dois, REGRAS, new Date()).plano_chave, null);
});
