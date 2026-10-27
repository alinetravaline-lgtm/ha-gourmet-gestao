// Endpoint público de webhooks do Stripe. Verifica a assinatura com o corpo bruto, registra o evento de forma
// durável e só responde 2xx depois que os efeitos foram gravados (ou o evento é repetido/ignorado).
// Qualquer falha devolve 5xx: o Stripe reenvia e o job "reprocessar" também tenta de novo.
import { lerConfig, segredo } from "../_shared/config.ts";
import { json, registrar } from "../_shared/http.ts";
import { processarEvento } from "../_shared/sincronizacao.ts";
import { criarStripe, cryptoProvider, Stripe, STRIPE_API_VERSION } from "../_shared/stripe.ts";
import { clienteAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { erro: "metodo_nao_permitido" });
  let cfg, segredoWebhook;
  try {
    cfg = lerConfig();
    segredoWebhook = segredo("STRIPE_WEBHOOK_SECRET");
  } catch (e) {
    registrar("clube-stripe-webhook:config", e);
    return json(503, { erro: "servico_nao_configurado" });
  }

  const assinatura = req.headers.get("stripe-signature");
  if (!assinatura) return json(400, { erro: "assinatura_ausente" });
  const corpo = await req.text();
  const stripe = criarStripe(cfg.stripeSecretKey);
  let ev: Stripe.Event;
  try {
    ev = await stripe.webhooks.constructEventAsync(corpo, assinatura, segredoWebhook, undefined, cryptoProvider);
  } catch {
    return json(400, { erro: "assinatura_invalida" });
  }
  if (ev.livemode !== cfg.livemode) {
    registrar("clube-stripe-webhook", new Error("evento de outro ambiente"), { evento: ev.id });
    return json(400, { erro: "ambiente_divergente" });
  }
  if (ev.api_version && ev.api_version !== STRIPE_API_VERSION) {
    registrar("clube-stripe-webhook", new Error(`versão do endpoint ${ev.api_version} difere de ${STRIPE_API_VERSION}`), {
      evento: ev.id,
    });
  }

  try {
    const resultado = await processarEvento({ cfg, stripe, admin: clienteAdmin(cfg) }, ev);
    return json(200, { recebido: true, resultado });
  } catch (e) {
    registrar("clube-stripe-webhook", e, { evento: ev.id, tipo: ev.type });
    return json(500, { erro: "falha_no_processamento" });
  }
});
