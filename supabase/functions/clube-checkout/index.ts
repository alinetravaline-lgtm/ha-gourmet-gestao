// Cria (ou reaproveita) a sessão do Stripe Checkout para o usuário autenticado. Valor, cliente e plano pago nunca
// vêm do navegador: só a chave do plano, validada aqui e no banco.
import { type ConfigClube, lerConfig } from "../_shared/config.ts";
import { cabecalhosCors, ErroHttp, json, lerJson, respostaDeErro } from "../_shared/http.ts";
import { ehPlanoChave, type PlanoChave } from "../_shared/planos.ts";
import { criarStripe, type Stripe } from "../_shared/stripe.ts";
import { type Admin, clienteAdmin, rpc, usuarioAutenticado } from "../_shared/supabase.ts";

type Preparo =
  | { erro: string }
  | { acao: "criar"; sessao_id: string; stripe_customer_id: string | null }
  | { acao: "reutilizar"; sessao_id: string; url: string; stripe_session_id: string }
  | { acao: "substituir"; sessao_id: string; stripe_session_id: string | null };

interface Pedido {
  cfg: ConfigClube;
  admin: Admin;
  stripe: Stripe;
  userId: string;
  email: string | undefined;
  plano: PlanoChave;
}

const iso = (s: number) => new Date(s * 1000).toISOString();

async function encerrar(admin: Admin, sessaoId: string, status: "expirada" | "falhou" | "cancelada") {
  await rpc(admin, "clube_checkout_encerrar", { p_sessao: sessaoId, p_stripe_session: null, p_status: status, p_evento: null });
}

async function criarSessao(p: Pedido, sessaoId: string, clienteExistente: string | null): Promise<string> {
  try {
    let cliente = clienteExistente;
    if (!cliente) {
      const c = await p.stripe.customers.create(
        { email: p.email, metadata: { user_id: p.userId } },
        { idempotencyKey: `clube-cliente-${p.userId}` },
      );
      cliente = await rpc<string>(p.admin, "clube_checkout_cliente", {
        p_user: p.userId,
        p_customer: c.id,
        p_livemode: c.livemode,
      });
    }
    const s = await p.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: cliente,
      client_reference_id: p.userId,
      line_items: [{ price: p.cfg.precoPorPlano[p.plano], quantity: 1 }],
      allowed_payment_method_types: ["card"],
      locale: "pt-BR",
      success_url: `${p.cfg.appUrl}/membros/?checkout=retorno&sessao={CHECKOUT_SESSION_ID}`,
      cancel_url: `${p.cfg.appUrl}/membros/?checkout=cancelado`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      metadata: { user_id: p.userId, plano: p.plano, sessao_id: sessaoId },
      subscription_data: { metadata: { user_id: p.userId, plano: p.plano } },
    }, { idempotencyKey: `clube-checkout-${sessaoId}` });
    if (!s.url) throw new Error("Checkout sem URL");
    await rpc(p.admin, "clube_checkout_aberta", {
      p_sessao: sessaoId,
      p_stripe_session: s.id,
      p_url: s.url,
      p_expira: iso(s.expires_at),
    });
    return s.url;
  } catch (e) {
    await encerrar(p.admin, sessaoId, "falhou");
    throw e;
  }
}

async function iniciar(p: Pedido): Promise<{ url: string } | { status: "em_confirmacao" }> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const prep = await rpc<Preparo>(p.admin, "clube_checkout_preparar", { p_user: p.userId, p_plano: p.plano });
    if ("erro" in prep) throw new ErroHttp(409, prep.erro);
    switch (prep.acao) {
      case "criar":
        return { url: await criarSessao(p, prep.sessao_id, prep.stripe_customer_id) };
      case "reutilizar": {
        const s = await p.stripe.checkout.sessions.retrieve(prep.stripe_session_id);
        if (s.status === "complete") return { status: "em_confirmacao" };
        if (s.status === "open" && s.url) return { url: s.url };
        await encerrar(p.admin, prep.sessao_id, "expirada");
        continue;
      }
      case "substituir": {
        if (prep.stripe_session_id) {
          const s = await p.stripe.checkout.sessions.retrieve(prep.stripe_session_id);
          if (s.status === "complete") return { status: "em_confirmacao" };
          if (s.status === "open") await p.stripe.checkout.sessions.expire(s.id);
        }
        await encerrar(p.admin, prep.sessao_id, "cancelada");
        continue;
      }
      default: {
        const inesperado: never = prep;
        throw new Error(`Preparo inesperado: ${JSON.stringify(inesperado)}`);
      }
    }
  }
  throw new ErroHttp(409, "em_andamento");
}

Deno.serve(async (req) => {
  let cors: Record<string, string> = {};
  try {
    const cfg = lerConfig();
    cors = cabecalhosCors(req, cfg.origens);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") throw new ErroHttp(405, "metodo_nao_permitido");
    const admin = clienteAdmin(cfg);
    const user = await usuarioAutenticado(req, admin);
    const corpo = await lerJson(req);
    if (!ehPlanoChave(corpo.plano)) throw new ErroHttp(400, "plano_invalido");
    await rpc(admin, "clube_exigir_limite", { p_chave: `checkout:${user.id}`, p_max: 10, p_janela: "1 hour" });
    const resultado = await iniciar({
      cfg,
      admin,
      stripe: criarStripe(cfg.stripeSecretKey),
      userId: user.id,
      email: user.email,
      plano: corpo.plano,
    });
    return json(200, resultado, cors);
  } catch (e) {
    return respostaDeErro(e, cors, "clube-checkout");
  }
});
