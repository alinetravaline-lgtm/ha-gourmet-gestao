// Teste ponta a ponta contra o Supabase local (supabase start): Auth real, PostgREST, RLS e as consultas das telas.
// Simula o Stripe chamando, com a chave secreta local, as mesmas funções SQL que o webhook chama.
// Uso: supabase start && node scripts/testar-api-local.mjs   (nunca aponte para um projeto real)
import { execSync } from "node:child_process";
import assert from "node:assert/strict";

const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const URL_API = status.API_URL;
const PUB = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const SEC = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_API)) throw new Error("Este teste só roda contra o Supabase local.");

const sufixo = Date.now().toString(36);
async function chamar(caminho, { metodo = "GET", corpo, token, chave = PUB, prefer } = {}) {
  const r = await fetch(`${URL_API}${caminho}`, {
    method: metodo,
    headers: {
      apikey: chave,
      Authorization: `Bearer ${token ?? chave}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}
const rpc = (nome, args, token, chave) => chamar(`/rest/v1/rpc/${nome}`, { metodo: "POST", corpo: args, token, chave });
const servico = (nome, args) => rpc(nome, args, SEC, SEC);
async function ok(promessa, rotulo) {
  const r = await promessa;
  assert.ok(r.status < 300, `${rotulo}: HTTP ${r.status} ${JSON.stringify(r.dados)}`);
  return r.dados;
}
async function cadastrar(nome, extra = {}) {
  const r = await ok(chamar("/auth/v1/signup", {
    metodo: "POST",
    corpo: { email: `${nome}.${sufixo}@teste.invalid`, password: "senha-de-teste-123", data: { nome: `${nome} Teste`, telefone: `1190000${Math.floor(Math.random() * 9000 + 1000)}`, nascimento: "1990-06-15", ...extra } },
  }), `cadastro ${nome}`);
  assert.ok(r.access_token, "o Auth local deve devolver sessão (confirmação de e-mail desligada)");
  return { id: r.user.id, token: r.access_token };
}
const passo = (t) => console.log(`✓ ${t}`);

const ana = await cadastrar("ana");
const sitAna = await ok(rpc("clube_minha_situacao", {}, ana.token), "situação ana");
const codigo = sitAna.perfil.codigo_indicacao;
assert.match(codigo, /^[A-HJ-NP-Z2-9]{8}$/);
passo("gatilho do Auth cria perfil e código de indicação");

const validacao = await ok(rpc("clube_validar_codigo", { p_codigo: codigo.toLowerCase() }), "validar como anônimo");
assert.equal(validacao.valido, true);
const bia = await cadastrar("bia", { ref: codigo, ref_origem: "link" });
const caio = await cadastrar("caio", { ref: "ZZZZZZZZ" });
const indAna = await ok(chamar(`/rest/v1/clube_indicacoes?indicador_id=eq.${ana.id}&select=status,origem,indicado_id`, { token: ana.token }), "indicações da ana");
assert.equal(indAna.length, 1);
assert.deepEqual([indAna[0].status, indAna[0].origem, indAna[0].indicado_id], ["pendente", "link", bia.id]);
assert.equal((await ok(chamar("/rest/v1/clube_indicacoes?select=id", { token: caio.token }), "caio")).length, 0);
passo("indicação pelo link atribuída; código inválido não bloqueia o cadastro");

assert.equal((await ok(chamar(`/rest/v1/clube_perfis?user_id=eq.${ana.id}`, { token: bia.token }), "perfil alheio")).length, 0);
assert.equal((await chamar(`/rest/v1/clube_perfis?user_id=eq.${ana.id}`)).status >= 400, true);
const patch = await chamar(`/rest/v1/clube_perfis?user_id=eq.${bia.id}`, { metodo: "PATCH", corpo: { codigo_indicacao: "AAAAAAAA" }, token: bia.token });
assert.ok(patch.status >= 400, "membro não altera o próprio código");
const insAdmin = await chamar("/rest/v1/clube_admins", { metodo: "POST", corpo: { user_id: bia.id }, token: bia.token });
assert.ok(insAdmin.status >= 400, "membro não se promove a admin");
const fatFalsa = await rpc("clube_processar_fatura", { p: {}, p_evento: null }, bia.token);
assert.ok(fatFalsa.status >= 400 && /permission denied/.test(JSON.stringify(fatFalsa.dados)), "membro não chama rotina do servidor");
const creditoFalso = await rpc("clube_admin_creditar", { p_user: bia.id, p_valor: 1000, p_motivo: "tentativa" }, bia.token);
assert.match(JSON.stringify(creditoFalso.dados), /acesso_negado/);
passo("RLS e privilégios via API: sem leitura alheia, sem escrita direta, sem rotina privilegiada");

const endereco = { cep: "01310-100", logradouro: "Av. de Teste", numero: "1000", bairro: "Bela Vista", cidade: "São Paulo", uf: "sp" };
for (const u of [ana, bia]) {
  await ok(rpc("clube_salvar_perfil", { p_nome: "Pessoa Teste", p_telefone: `11 9${Math.floor(Math.random() * 9e7 + 1e7)}`, p_nascimento: null, p_endereco: endereco }, u.token), "salvar perfil");
}
await ok(servico("clube_checkout_cliente", { p_user: ana.id, p_customer: `cus_ana${sufixo}`, p_livemode: false }), "cliente");
await ok(servico("clube_checkout_cliente", { p_user: bia.id, p_customer: `cus_bia${sufixo}`, p_livemode: false }), "cliente");
const agora = Date.now(), dia = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
async function pagar(u, plano, valor, nome) {
  const sub = `sub_${nome}${sufixo}`;
  await ok(servico("clube_sincronizar_assinatura", { p_evento: null, p: {
    stripe_subscription_id: sub, stripe_customer_id: `cus_${nome}${sufixo}`, plano_chave: plano, stripe_price_id: `price_${plano}`,
    status: "active", cancelar_no_fim: false, periodo_atual_inicio: iso(agora - dia), periodo_atual_fim: iso(agora + 29 * dia),
    livemode: false, criada_em: iso(agora - dia), obtido_em: iso(agora) } }), "sincronizar assinatura");
  await ok(servico("clube_processar_fatura", { p_evento: null, p: {
    stripe_invoice_id: `in_${nome}${sufixo}`, stripe_customer_id: `cus_${nome}${sufixo}`, stripe_subscription_id: sub, plano_chave: plano,
    stripe_price_id: `price_${plano}`, billing_reason: "subscription_create", moeda: "brl", total_centavos: valor, valor_pago_centavos: valor,
    status: "paid", periodo_inicio: iso(agora - dia), periodo_fim: iso(agora + 29 * dia), pago_em: iso(agora - dia + 60_000),
    stripe_payment_intent_id: `pi_${nome}${sufixo}`, stripe_charge_id: `ch_${nome}${sufixo}`, classificacao: "primeira_mensalidade",
    elegivel: true, motivo: null, livemode: false } }), "processar fatura");
}
await pagar(ana, "ha_club", 9700, "ana");
await pagar(bia, "ha_assinatura", 4990, "bia");
const sit2 = await ok(rpc("clube_minha_situacao", {}, ana.token), "situação ana 2");
assert.equal(sit2.saldos.club_monthly.disponivel, 9000);
assert.equal(sit2.saldos.referral.disponivel, 500);
assert.equal(sit2.beneficio_vigente.plano, "ha_club");
passo("pagamento confirmado concede R$ 90 (Club) e R$ 5 à indicadora; caixa para a Assinatura");

const caixas = await ok(chamar(`/rest/v1/clube_caixas?select=*,sabor:clube_sabores_mes(nome,descricao)&user_id=eq.${bia.id}`, { token: bia.token }), "caixas (tela)");
assert.equal(caixas.length, 1);
const extrato = await ok(chamar(`/rest/v1/clube_carteira_lancamentos?select=id,tipo,valor_centavos,motivo,criado_em,lote:clube_credito_lotes(tipo,expira_em)&user_id=eq.${ana.id}`, { token: ana.token }), "extrato (tela)");
assert.equal(extrato.length, 2);
const simulacao = await ok(rpc("clube_simular_resgate", { p_subtotal: 10000 }, ana.token), "simular");
assert.deepEqual([simulacao.desconto_centavos, simulacao.credito_centavos, simulacao.a_pagar_centavos], [500, 9500, 0]);
const chave = crypto.randomUUID();
const [r1, r2] = await Promise.all([
  rpc("clube_solicitar_resgate", { p_subtotal: 10000, p_descricao: "Duplo clique", p_chave: chave }, ana.token),
  rpc("clube_solicitar_resgate", { p_subtotal: 10000, p_descricao: "Duplo clique", p_chave: chave }, ana.token),
]);
assert.equal(r1.dados.id, r2.dados.id, "duplo clique com a mesma chave gera uma única reserva");
passo("telas do membro (caixas, extrato) e resgate idempotente funcionam pela API");

const adm = await cadastrar("adm");
await ok(chamar("/rest/v1/clube_admins", { metodo: "POST", corpo: { user_id: adm.id, observacao: "teste local" }, token: SEC, chave: SEC, prefer: "return=minimal" }), "conceder admin (servidor)");
assert.equal(await ok(rpc("clube_is_admin", {}, adm.token), "is_admin"), true);
const consultasAdmin = [
  "/rest/v1/clube_caixas?select=*,perfil:clube_perfis(nome,telefone),sabor:clube_sabores_mes(nome)",
  "/rest/v1/clube_resgates?select=*,perfil:clube_perfis(nome)",
  "/rest/v1/clube_indicacoes?select=*,indicado:clube_perfis!clube_indicacoes_indicado_id_fkey(nome),indicador:clube_perfis!clube_indicacoes_indicador_id_fkey(nome)",
  "/rest/v1/clube_eventos?select=*,reservas:clube_evento_reservas(id,status,presenca,perfil:clube_perfis(nome))",
  "/rest/v1/clube_faturas?select=*,perfil:clube_perfis(nome),periodos:clube_periodos(id)&status=eq.paid&elegivel=eq.false&classificacao=not.in.(avulsa,pendente)",
  "/rest/v1/clube_credito_lotes?select=*,perfil:clube_perfis(nome)&bloqueado=eq.true",
];
for (const c of consultasAdmin) await ok(chamar(c, { token: adm.token }), `consulta admin ${c.split("?")[0]}`);
const membros = await ok(rpc("clube_admin_membros", { p_busca: sufixo }, adm.token), "lista de membros");
assert.ok(membros.length >= 3 && membros.every((m) => m.email.includes(sufixo)));
await ok(rpc("clube_admin_indicadores", {}, adm.token), "indicadores");
const resgate = await ok(rpc("clube_admin_confirmar_resgate", { p_resgate: r1.dados.id, p_subtotal: 10000, p_forma: "nenhum", p_referencia: "balcão", p_observacao: null }, adm.token), "confirmar");
assert.equal(resgate.resgate.credito_usado_centavos, 9500);
assert.equal((await ok(chamar("/rest/v1/clube_perfis?select=user_id", { token: ana.token }), "membro após admin")).length, 1);
passo("admin: papel só via tabela do servidor, consultas da tela e confirmação de resgate funcionam");

console.log("\nOK: teste ponta a ponta pela API local concluído");
