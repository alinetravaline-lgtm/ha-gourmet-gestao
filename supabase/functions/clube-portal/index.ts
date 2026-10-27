// Abre o Customer Portal do Stripe somente para o Customer vinculado ao usuário autenticado.
// A configuração do portal (STRIPE_PORTAL_CONFIG_ID) desliga troca de plano e cancela ao fim do período.
import { lerConfig, segredo } from "../_shared/config.ts";
import { cabecalhosCors, ErroHttp, json, respostaDeErro } from "../_shared/http.ts";
import { criarStripe } from "../_shared/stripe.ts";
import { clienteAdmin, rpc, usuarioAutenticado } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  let cors: Record<string, string> = {};
  try {
    const cfg = lerConfig();
    cors = cabecalhosCors(req, cfg.origens);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") throw new ErroHttp(405, "metodo_nao_permitido");
    const admin = clienteAdmin(cfg);
    const user = await usuarioAutenticado(req, admin);
    await rpc(admin, "clube_exigir_limite", { p_chave: `portal:${user.id}`, p_max: 20, p_janela: "1 hour" });

    const { data, error } = await admin.from("clube_clientes_stripe").select("stripe_customer_id")
      .eq("user_id", user.id).maybeSingle();
    if (error) throw new Error(`clientes: ${error.message}`);
    if (!data) throw new ErroHttp(404, "sem_cliente_stripe");

    const portal = await criarStripe(cfg.stripeSecretKey).billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      configuration: segredo("STRIPE_PORTAL_CONFIG_ID"),
      return_url: `${cfg.appUrl}/membros/`,
      locale: "pt-BR",
    });
    return json(200, { url: portal.url }, cors);
  } catch (e) {
    return respostaDeErro(e, cors, "clube-portal");
  }
});
