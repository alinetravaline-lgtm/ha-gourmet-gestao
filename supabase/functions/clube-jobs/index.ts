// Rotinas chamadas pelo Supabase Cron (pg_net) com o segredo CLUBE_JOBS_SECRET:
//   manutencao  -> vencimentos, reservas e sessões (o mesmo SQL que o cron também roda direto)
//   reprocessar -> eventos de webhook com erro ou sem conclusão, relidos no Stripe
//   reconciliar -> assinaturas, faturas pagas e checkouts recentes relidos no Stripe (recupera notificações perdidas)
import { lerConfig, segredo } from "../_shared/config.ts";
import { ErroHttp, iguaisEmTempoConstante, json, lerJson, registrar, respostaDeErro } from "../_shared/http.ts";
import {
  type Contexto,
  processarCheckoutConcluido,
  processarEvento,
  reconciliarCliente,
} from "../_shared/sincronizacao.ts";
import { criarStripe } from "../_shared/stripe.ts";
import { clienteAdmin, rpc } from "../_shared/supabase.ts";

type Acao = "manutencao" | "reprocessar" | "reconciliar";
const ACOES: readonly Acao[] = ["manutencao", "reprocessar", "reconciliar"];
const ehAcao = (v: unknown): v is Acao => ACOES.includes(v as Acao);

const MAX_TENTATIVAS = 12;
const LOTE_CLIENTES = 100;

async function reprocessar(ctx: Contexto) {
  const agora = new Date();
  const { data, error } = await ctx.admin.from("clube_stripe_eventos").select("id")
    .in("status", ["recebido", "processando", "erro"])
    .lt("recebido_em", new Date(agora.getTime() - 5 * 60_000).toISOString())
    .lt("tentativas", MAX_TENTATIVAS)
    .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora.toISOString()}`)
    .order("recebido_em").limit(50);
  if (error) throw new Error(`eventos: ${error.message}`);
  const r = { processados: 0, repetidos: 0, falhas: 0 };
  for (const { id } of data) {
    try {
      const ev = await ctx.stripe.events.retrieve(id);
      if ((await processarEvento(ctx, ev)) === "processado") r.processados++;
      else r.repetidos++;
    } catch (e) {
      r.falhas++;
      registrar("clube-jobs:reprocessar", e, { evento: id });
      await ctx.admin.rpc("clube_evento_falhou", { p_id: id, p_erro: e instanceof Error ? e.message : String(e) });
    }
  }
  return r;
}

async function reconciliar(ctx: Contexto) {
  const desde = new Date(Date.now() - 45 * 86_400_000);
  const [ativas, recentes, sessoes] = await Promise.all([
    ctx.admin.from("clube_assinaturas").select("stripe_customer_id, sincronizada_em")
      .or(`status.neq.canceled,encerrada_em.gte.${desde.toISOString()}`)
      .order("sincronizada_em").limit(LOTE_CLIENTES),
    ctx.admin.from("clube_clientes_stripe").select("stripe_customer_id").gte("criado_em", desde.toISOString())
      .limit(LOTE_CLIENTES),
    ctx.admin.from("clube_checkout_sessoes").select("id, stripe_session_id").eq("status", "aberta")
      .lt("criado_em", new Date(Date.now() - 30 * 60_000).toISOString()).limit(50),
  ]);
  for (const q of [ativas, recentes, sessoes]) if (q.error) throw new Error(`reconciliar: ${q.error.message}`);

  const r = { clientes: 0, assinaturas: 0, faturas: 0, checkouts: 0, falhas: 0 };
  const clientes = new Set([...(ativas.data ?? []), ...(recentes.data ?? [])].map((x) => x.stripe_customer_id));
  for (const cus of clientes) {
    try {
      const x = await reconciliarCliente(ctx, cus, desde);
      r.clientes++;
      r.assinaturas += x.assinaturas;
      r.faturas += x.faturas;
    } catch (e) {
      r.falhas++;
      registrar("clube-jobs:reconciliar", e, { cliente: cus });
    }
  }
  for (const s of sessoes.data ?? []) {
    try {
      const cs = await ctx.stripe.checkout.sessions.retrieve(s.stripe_session_id);
      if (cs.status === "complete") await processarCheckoutConcluido(ctx, cs.id, null);
      else if (cs.status === "expired") {
        await rpc(ctx.admin, "clube_checkout_encerrar", {
          p_sessao: s.id,
          p_stripe_session: null,
          p_status: "expirada",
          p_evento: null,
        });
      }
      r.checkouts++;
    } catch (e) {
      r.falhas++;
      registrar("clube-jobs:checkout", e, { sessao: s.id });
    }
  }
  return r;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") throw new ErroHttp(405, "metodo_nao_permitido");
    const esperado = segredo("CLUBE_JOBS_SECRET");
    if (!iguaisEmTempoConstante(req.headers.get("x-clube-job-secret") ?? "", esperado)) {
      throw new ErroHttp(401, "nao_autorizado");
    }
    const { acao } = await lerJson(req);
    if (!ehAcao(acao)) throw new ErroHttp(400, "acao_invalida");
    const cfg = lerConfig();
    const ctx: Contexto = { cfg, stripe: criarStripe(cfg.stripeSecretKey), admin: clienteAdmin(cfg) };

    const { data: exec, error } = await ctx.admin.from("clube_execucoes_job").insert({ job: acao }).select("id").single();
    if (error) throw new Error(`execução: ${error.message}`);
    try {
      let resultado: unknown;
      switch (acao) {
        case "manutencao":
          resultado = await rpc(ctx.admin, "clube_job_manutencao", {});
          break;
        case "reprocessar":
          resultado = await reprocessar(ctx);
          break;
        case "reconciliar":
          resultado = await reconciliar(ctx);
          break;
        default: {
          const inesperada: never = acao;
          throw new Error(`ação ${inesperada}`);
        }
      }
      await ctx.admin.from("clube_execucoes_job").update({ concluido_em: new Date().toISOString(), resultado })
        .eq("id", exec.id);
      return json(200, { ok: true, resultado });
    } catch (e) {
      await ctx.admin.from("clube_execucoes_job").update({
        concluido_em: new Date().toISOString(),
        erro: (e instanceof Error ? e.message : String(e)).slice(0, 500),
      }).eq("id", exec.id);
      throw e;
    }
  } catch (e) {
    return respostaDeErro(e, {}, "clube-jobs");
  }
});
