import type { ConfigClube } from "./config.ts";
import { AguardarNovaTentativa, avaliarFatura, normalizarAssinatura, type RegrasStripe } from "./fatura.ts";
import type { Stripe } from "./stripe.ts";
import { type Admin, rpc } from "./supabase.ts";

// Webhook, job de reconciliação e ação administrativa usam exatamente estas rotinas. Elas sempre leem o objeto
// atual no Stripe (nunca confiam só no payload do evento) e chamam funções SQL idempotentes.
export interface Contexto {
  cfg: ConfigClube;
  stripe: Stripe;
  admin: Admin;
}

type ComId = string | { id: string } | null | undefined;
const idDe = (x: ComId): string | null => (x == null ? null : typeof x === "string" ? x : x.id);

async function regras(ctx: Contexto): Promise<RegrasStripe> {
  const { data, error } = await ctx.admin.from("clube_politicas").select("dados")
    .lte("vigente_desde", new Date().toISOString()).order("vigente_desde", { ascending: false }).limit(1).single();
  if (error) throw new Error(`política: ${error.message}`);
  return {
    planoPorPreco: ctx.cfg.planoPorPreco,
    livemode: ctx.cfg.livemode,
    toleranciaAntesDoPeriodoSeg: Number(data.dados.tolerancia_pagamento_antes_periodo_seg),
  };
}

export async function sincronizarAssinatura(ctx: Contexto, subId: string, eventoId: string | null) {
  const sub = await ctx.stripe.subscriptions.retrieve(subId);
  const obtidoEm = new Date();
  await rpc(ctx.admin, "clube_sincronizar_assinatura", {
    p: normalizarAssinatura(sub, await regras(ctx), obtidoEm),
    p_evento: eventoId,
  });
  return sub;
}

async function todasAsLinhas(ctx: Contexto, inv: Stripe.Invoice): Promise<Stripe.InvoiceLineItem[]> {
  if (!inv.lines.has_more) return inv.lines.data;
  const linhas: Stripe.InvoiceLineItem[] = [];
  for await (const l of ctx.stripe.invoices.listLineItems(inv.id, { limit: 100 })) linhas.push(l);
  return linhas;
}

export async function processarFatura(ctx: Contexto, invoiceId: string, eventoId: string | null) {
  const inv = await ctx.stripe.invoices.retrieve(invoiceId, { expand: ["payments"] });
  const subId = idDe(inv.parent?.subscription_details?.subscription);
  const sub = subId ? await sincronizarAssinatura(ctx, subId, null) : null;
  const normalizada = avaliarFatura(inv, await todasAsLinhas(ctx, inv), sub, await regras(ctx));
  return await rpc(ctx.admin, "clube_processar_fatura", { p: normalizada, p_evento: eventoId });
}

export async function processarCheckoutConcluido(ctx: Contexto, sessionId: string, eventoId: string | null) {
  const s = await ctx.stripe.checkout.sessions.retrieve(sessionId);
  if (s.mode !== "subscription" || !s.subscription) {
    await rpc(ctx.admin, "clube_evento_concluir", { p_id: eventoId, p_status: "ignorado" });
    return;
  }
  const sub = await sincronizarAssinatura(ctx, idDe(s.subscription)!, null);
  await rpc(ctx.admin, "clube_vincular_checkout", {
    p: {
      stripe_session_id: s.id,
      client_reference_id: s.client_reference_id,
      stripe_customer_id: idDe(s.customer),
      stripe_subscription_id: sub.id,
    },
    p_evento: eventoId,
  });
  // Cobre o caso de invoice.paid ter chegado antes ou se perdido: mesma rotina idempotente.
  const fatura = idDe(sub.latest_invoice);
  if (fatura) await processarFatura(ctx, fatura, null);
}

export async function processarReembolsos(ctx: Contexto, chargeId: string, eventoId: string | null) {
  const ch = await ctx.stripe.charges.retrieve(chargeId, { expand: ["refunds"] });
  await rpc(ctx.admin, "clube_registrar_reembolso", {
    p: {
      stripe_charge_id: ch.id,
      stripe_payment_intent_id: idDe(ch.payment_intent),
      valor_reembolsado_centavos: ch.amount_refunded,
      reembolsos: (ch.refunds?.data ?? []).map((r) => ({
        id: r.id,
        valor_centavos: r.amount,
        status: r.status,
        motivo: r.reason,
      })),
    },
    p_evento: eventoId,
  });
}

export async function processarDisputa(ctx: Contexto, disputeId: string, eventoId: string | null) {
  const d = await ctx.stripe.disputes.retrieve(disputeId);
  await rpc(ctx.admin, "clube_registrar_disputa", {
    p: {
      stripe_dispute_id: d.id,
      stripe_charge_id: idDe(d.charge),
      stripe_payment_intent_id: idDe(d.payment_intent),
      valor_centavos: d.amount,
      status: d.status,
      motivo: d.reason,
    },
    p_evento: eventoId,
  });
}

async function tratarEvento(ctx: Contexto, ev: Stripe.Event) {
  switch (ev.type) {
    case "checkout.session.completed":
      return await processarCheckoutConcluido(ctx, ev.data.object.id, ev.id);
    case "checkout.session.expired":
      return await rpc(ctx.admin, "clube_checkout_encerrar", {
        p_sessao: null,
        p_stripe_session: ev.data.object.id,
        p_status: "expirada",
        p_evento: ev.id,
      });
    case "invoice.paid":
    case "invoice.payment_failed":
      return await processarFatura(ctx, ev.data.object.id!, ev.id);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return await sincronizarAssinatura(ctx, ev.data.object.id, ev.id);
    case "charge.refunded":
      return await processarReembolsos(ctx, ev.data.object.id, ev.id);
    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const charge = idDe(ev.data.object.charge);
      if (charge) return await processarReembolsos(ctx, charge, ev.id);
      return await rpc(ctx.admin, "clube_evento_concluir", { p_id: ev.id, p_status: "ignorado" });
    }
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
    case "charge.dispute.funds_withdrawn":
    case "charge.dispute.funds_reinstated":
      return await processarDisputa(ctx, ev.data.object.id, ev.id);
    default:
      // Tipos não assinados para o Clube: registrados e ignorados.
      return await rpc(ctx.admin, "clube_evento_concluir", { p_id: ev.id, p_status: "ignorado" });
  }
}

const objetoId = (ev: Stripe.Event): string | null => {
  const o = ev.data.object as { id?: string };
  return typeof o.id === "string" ? o.id : null;
};

/** Registro durável + deduplicação por evento. Só retorna sem erro quando os efeitos já foram gravados. */
export async function processarEvento(ctx: Contexto, ev: Stripe.Event): Promise<"processado" | "repetido"> {
  const situacao = await rpc<string>(ctx.admin, "clube_evento_receber", {
    p_id: ev.id,
    p_tipo: ev.type,
    p_objeto: objetoId(ev),
    p_livemode: ev.livemode,
    p_criado: new Date(ev.created * 1000).toISOString(),
  });
  if (situacao !== "processar") return "repetido";
  try {
    await tratarEvento(ctx, ev);
    return "processado";
  } catch (e) {
    const motivo = e instanceof AguardarNovaTentativa ? `aguardando: ${e.message}` : e instanceof Error ? e.message : String(e);
    await ctx.admin.rpc("clube_evento_falhou", { p_id: ev.id, p_erro: motivo });
    throw e;
  }
}

/** Reconciliação: relê assinaturas e faturas pagas recentes do Stripe e reaplica as mesmas rotinas idempotentes. */
export async function reconciliarCliente(ctx: Contexto, customerId: string, desde: Date) {
  const resumo = { assinaturas: 0, faturas: 0 };
  for await (const sub of ctx.stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    await sincronizarAssinatura(ctx, sub.id, null);
    resumo.assinaturas++;
  }
  for await (
    const inv of ctx.stripe.invoices.list({
      customer: customerId,
      status: "paid",
      created: { gte: Math.floor(desde.getTime() / 1000) },
      limit: 100,
    })
  ) {
    await processarFatura(ctx, inv.id, null);
    resumo.faturas++;
  }
  return resumo;
}
