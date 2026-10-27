import type Stripe from "npm:stripe@23.0.1";
import { PLANOS, type PlanoChave } from "./planos.ts";

export type Classificacao =
  | "primeira_mensalidade"
  | "mensalidade"
  | "proporcional"
  | "ajuste"
  | "avulsa"
  | "zerada"
  | "fora_do_periodo"
  | "fora_do_fluxo"
  | "invalida"
  | "pendente";

// Formato aceito por public.clube_processar_fatura.
export interface FaturaNormalizada {
  stripe_invoice_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plano_chave: PlanoChave | null;
  stripe_price_id: string | null;
  billing_reason: string | null;
  moeda: string;
  total_centavos: number;
  valor_pago_centavos: number;
  status: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  pago_em: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  classificacao: Classificacao;
  elegivel: boolean;
  motivo: string | null;
  livemode: boolean;
}

// Formato aceito por public.clube_sincronizar_assinatura.
export interface AssinaturaNormalizada {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plano_chave: PlanoChave | null;
  stripe_price_id: string | null;
  status: string;
  cancelar_no_fim: boolean;
  cancelar_em: string | null;
  cancelada_em: string | null;
  encerrada_em: string | null;
  periodo_atual_inicio: string | null;
  periodo_atual_fim: string | null;
  livemode: boolean;
  criada_em: string;
  obtido_em: string;
}

export interface RegrasStripe {
  planoPorPreco: Record<string, PlanoChave>;
  livemode: boolean;
  toleranciaAntesDoPeriodoSeg: number;
}

// Situação transitória (ex.: assinatura ainda "incomplete"): o webhook responde erro e o Stripe/o job tentam de novo.
export class AguardarNovaTentativa extends Error {}

type ComId = string | { id: string } | null | undefined;
const idDe = (x: ComId): string | null => (x == null ? null : typeof x === "string" ? x : x.id);
const iso = (s: number | null | undefined): string | null => (s == null ? null : new Date(s * 1000).toISOString());

export function normalizarAssinatura(sub: Stripe.Subscription, regras: RegrasStripe, obtidoEm: Date): AssinaturaNormalizada {
  const itens = sub.items.data;
  const item = itens.length === 1 && (itens[0].quantity ?? 1) === 1 ? itens[0] : null;
  const preco = item?.price.id ?? itens[0]?.price.id ?? null;
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: idDe(sub.customer) ?? "",
    plano_chave: item && preco ? regras.planoPorPreco[preco] ?? null : null,
    stripe_price_id: preco,
    status: sub.status,
    cancelar_no_fim: sub.cancel_at_period_end,
    cancelar_em: iso(sub.cancel_at),
    cancelada_em: iso(sub.canceled_at),
    encerrada_em: iso(sub.ended_at),
    periodo_atual_inicio: iso(itens[0]?.current_period_start),
    periodo_atual_fim: iso(itens[0]?.current_period_end),
    livemode: sub.livemode,
    criada_em: iso(sub.created) ?? obtidoEm.toISOString(),
    obtido_em: obtidoEm.toISOString(),
  };
}

/**
 * Decide se uma fatura paga autoriza um novo ciclo de benefícios. Só uma mensalidade cheia, de preço permitido,
 * paga por cartão dentro do próprio ciclo e com assinatura em situação compatível é elegível. Todo o resto é
 * registrado sem benefício (o banco abre exceção para análise quando há valor pago).
 */
export function avaliarFatura(
  inv: Stripe.Invoice,
  linhas: Stripe.InvoiceLineItem[],
  sub: Stripe.Subscription | null,
  regras: RegrasStripe,
): FaturaNormalizada {
  const subId = idDe(inv.parent?.subscription_details?.subscription);
  const pagamento = (inv.payments?.data ?? []).find((p) =>
    p.status === "paid" && (p.payment.type === "payment_intent" || p.payment.type === "charge")
  );
  const linhasPlano = linhas.filter((l) =>
    l.parent?.type === "subscription_item_details" && l.parent.subscription_item_details?.proration !== true
  );
  const proporcionais = linhas.filter((l) => l.parent?.subscription_item_details?.proration === true);
  const outrasLinhas = linhas.length - linhasPlano.length - proporcionais.length;
  const linha = linhasPlano.length === 1 ? linhasPlano[0] : null;
  const preco = linha ? idDe(linha.pricing?.price_details?.price) : null;
  const plano = preco ? regras.planoPorPreco[preco] ?? null : null;
  const pagoEm = inv.status_transitions.paid_at;

  const base: Omit<FaturaNormalizada, "classificacao" | "elegivel" | "motivo"> = {
    stripe_invoice_id: inv.id,
    stripe_customer_id: idDe(inv.customer),
    stripe_subscription_id: subId,
    plano_chave: plano,
    stripe_price_id: preco,
    billing_reason: inv.billing_reason,
    moeda: inv.currency,
    total_centavos: inv.total,
    valor_pago_centavos: inv.amount_paid,
    status: inv.status ?? "desconhecido",
    periodo_inicio: linha ? iso(linha.period.start) : null,
    periodo_fim: linha ? iso(linha.period.end) : null,
    pago_em: iso(pagoEm),
    stripe_payment_intent_id: pagamento ? idDe(pagamento.payment.payment_intent) : null,
    stripe_charge_id: pagamento ? idDe(pagamento.payment.charge) : null,
    livemode: inv.livemode,
  };
  const r = (classificacao: Classificacao, elegivel: boolean, motivo: string | null): FaturaNormalizada => ({
    ...base,
    classificacao,
    elegivel,
    motivo,
  });

  if (inv.livemode !== regras.livemode) return r("invalida", false, "ambiente_divergente");
  if (!subId) return r("avulsa", false, null);
  if (inv.status !== "paid") return r("pendente", false, `status_${inv.status}`);
  if (inv.currency !== "brl") return r("invalida", false, "moeda_divergente");
  if (!linha) return r(proporcionais.length ? "proporcional" : "invalida", false, "sem_linha_unica_de_mensalidade");
  if (!plano) return r("invalida", false, "preco_nao_permitido");
  if (linha.quantity !== 1) return r("invalida", false, "quantidade_divergente");
  if (linha.amount !== PLANOS[plano].valorCentavos) return r("invalida", false, "valor_da_linha_divergente");
  if (proporcionais.length || outrasLinhas) return r("ajuste", false, "linhas_extras");
  if (inv.amount_paid === 0) return r("zerada", false, "fatura_zerada");
  if (inv.amount_paid < PLANOS[plano].valorCentavos) return r("invalida", false, "valor_pago_menor_que_o_plano");
  if (!pagamento) return r("fora_do_fluxo", false, "sem_pagamento_por_cartao");
  if (inv.billing_reason !== "subscription_create" && inv.billing_reason !== "subscription_cycle") {
    return r("ajuste", false, `motivo_${inv.billing_reason}`);
  }
  if (pagoEm == null) return r("invalida", false, "sem_data_de_pagamento");
  if (pagoEm < linha.period.start - regras.toleranciaAntesDoPeriodoSeg || pagoEm >= linha.period.end) {
    return r("fora_do_periodo", false, "pago_fora_do_ciclo");
  }

  if (!sub || sub.id !== subId) throw new AguardarNovaTentativa("assinatura_nao_carregada");
  if (sub.status === "incomplete") throw new AguardarNovaTentativa("assinatura_incompleta");
  const compativel = sub.status === "active" || sub.status === "past_due" ||
    (sub.status === "canceled" && (sub.ended_at ?? 0) >= linha.period.end - 60);
  if (!compativel) return r("invalida", false, `assinatura_${sub.status}`);

  return r(inv.billing_reason === "subscription_create" ? "primeira_mensalidade" : "mensalidade", true, null);
}
