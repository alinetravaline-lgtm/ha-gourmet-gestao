// Ações administrativas que dependem do Stripe. O papel vem de public.clube_admins (nunca de metadata do usuário)
// e cada ação fica registrada na auditoria. Reaproveita as mesmas rotinas idempotentes do webhook.
import { lerConfig } from "../_shared/config.ts";
import { cabecalhosCors, ErroHttp, json, lerJson, respostaDeErro } from "../_shared/http.ts";
import { type Contexto, processarEvento, reconciliarCliente } from "../_shared/sincronizacao.ts";
import { criarStripe } from "../_shared/stripe.ts";
import { clienteAdmin, ehAdmin, rpc, usuarioAutenticado } from "../_shared/supabase.ts";

type Acao = "reprocessar_evento" | "reconciliar_membro";
const ehAcao = (v: unknown): v is Acao => v === "reprocessar_evento" || v === "reconciliar_membro";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  let cors: Record<string, string> = {};
  try {
    const cfg = lerConfig();
    cors = cabecalhosCors(req, cfg.origens);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") throw new ErroHttp(405, "metodo_nao_permitido");
    const admin = clienteAdmin(cfg);
    const user = await usuarioAutenticado(req, admin);
    if (!(await ehAdmin(admin, user.id))) throw new ErroHttp(403, "acesso_negado");
    await rpc(admin, "clube_exigir_limite", { p_chave: `admin:${user.id}`, p_max: 60, p_janela: "1 hour" });

    const corpo = await lerJson(req);
    const acao = corpo.acao;
    if (!ehAcao(acao)) throw new ErroHttp(400, "acao_invalida");
    const ctx: Contexto = { cfg, stripe: criarStripe(cfg.stripeSecretKey), admin };

    let resultado: unknown;
    let alvo: string;
    switch (acao) {
      case "reprocessar_evento": {
        alvo = String(corpo.evento_id ?? "");
        if (!/^evt_[A-Za-z0-9]+$/.test(alvo)) throw new ErroHttp(400, "evento_invalido");
        resultado = await processarEvento(ctx, await ctx.stripe.events.retrieve(alvo));
        break;
      }
      case "reconciliar_membro": {
        alvo = String(corpo.user_id ?? "");
        if (!UUID.test(alvo)) throw new ErroHttp(400, "membro_invalido");
        const { data, error } = await admin.from("clube_clientes_stripe").select("stripe_customer_id")
          .eq("user_id", alvo).maybeSingle();
        if (error) throw new Error(`clientes: ${error.message}`);
        if (!data) throw new ErroHttp(404, "sem_cliente_stripe");
        resultado = await reconciliarCliente(ctx, data.stripe_customer_id, new Date(Date.now() - 400 * 86_400_000));
        break;
      }
      default: {
        const inesperada: never = acao;
        throw new ErroHttp(400, `acao_invalida:${inesperada}`);
      }
    }
    await rpc(admin, "clube_auditar", {
      p_autor: user.id,
      p_acao: acao,
      p_alvo_tipo: acao === "reprocessar_evento" ? "evento_stripe" : "membro",
      p_alvo_id: alvo,
      p_motivo: null,
      p_dados: { resultado },
    });
    return json(200, { ok: true, resultado }, cors);
  } catch (e) {
    return respostaDeErro(e, cors, "clube-admin");
  }
});
