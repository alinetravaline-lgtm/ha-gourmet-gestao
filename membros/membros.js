// Área do membro: situação da assinatura, carteira e resgate, indicação, caixas, eventos e dados pessoais.
// A página só exibe e pede ações; benefícios e valores são decididos no servidor.
import {
  brl, competencia, data, dataCivil, dataHora, esc, funcao, mensagem, PLANOS, reaisParaCentavos, ROTULOS, rpc, sb,
  selo, sessaoAtual, toast, topo, urlSite,
} from "../clube/clube.js";

document.getElementById("topo").innerHTML = topo("membros");
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const st = { sessao: null, sit: null, aba: params.get("aba") || "geral", chaveResgate: crypto.randomUUID(), recuperando: false };
const ABAS = [["geral", "Visão geral"], ["carteira", "Carteira"], ["indicacao", "Indicação"], ["caixas", "Caixas"],
  ["eventos", "Eventos"], ["dados", "Meus dados"]];

sb.auth.onAuthStateChange((evento) => {
  if (evento === "PASSWORD_RECOVERY") { st.recuperando = true; telaNovaSenha(); }
  if (evento === "SIGNED_OUT") telaLogin();
});

/* ---------- Login, recuperação de senha ---------- */

function telaLogin(aviso = "") {
  const plano = PLANOS[params.get("plano")] ? params.get("plano") : "";
  app.innerHTML = `<div class="cl-wrap estreito" style="padding:0"><div class="card">
    <div class="card-head"><div><h3>Entrar</h3><div class="sub">Acesse sua assinatura, créditos e indicações.</div></div></div>
    ${aviso ? `<div class="aviso" style="margin-bottom:14px">${aviso}</div>` : ""}
    <form class="form" id="fLogin" novalidate>
      <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
      <label>Senha<input name="senha" type="password" autocomplete="current-password" required /></label>
      <div class="aviso erro" id="erro" hidden></div>
      <button class="btn btn-primary" style="justify-content:center;padding:12px">Entrar</button>
      <p class="hint" style="margin:0;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <a class="link" href="#" id="esqueci">Esqueci minha senha</a>
        <a class="link" href="../cadastro/${plano ? `?plano=${plano}` : ""}">Criar conta</a></p>
    </form></div></div>`;
  const f = document.getElementById("fLogin");
  const erro = document.getElementById("erro");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
    if (error) {
      erro.textContent = /rate|limit/i.test(error.message) ? mensagem("limite_excedido")
        : /confirm/i.test(error.message) ? "Confirme seu e-mail pelo link enviado antes de entrar." : "E-mail ou senha incorretos.";
      erro.hidden = false;
      return;
    }
    iniciar();
  });
  document.getElementById("esqueci").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = f.email.value.trim();
    if (!email) { erro.textContent = "Digite seu e-mail acima."; erro.hidden = false; return; }
    await sb.auth.resetPasswordForEmail(email, { redirectTo: urlSite("membros/") });
    telaLogin("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
  });
}

function telaNovaSenha() {
  app.innerHTML = `<div class="cl-wrap estreito" style="padding:0"><div class="card"><div class="card-head"><h3>Nova senha</h3></div>
    <form class="form" id="fSenha"><label>Nova senha (mínimo 8)<input name="senha" type="password" minlength="8" autocomplete="new-password" required /></label>
    <div class="aviso erro" id="erro" hidden></div><button class="btn btn-primary">Salvar</button></form></div></div>`;
  document.getElementById("fSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = e.target.senha.value;
    const erro = document.getElementById("erro");
    if (senha.length < 8) { erro.textContent = "Use pelo menos 8 caracteres."; erro.hidden = false; return; }
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) { erro.textContent = "Não foi possível salvar. Peça um novo link."; erro.hidden = false; return; }
    st.recuperando = false;
    toast("Senha atualizada");
    iniciar();
  });
}

/* ---------- Carregamento ---------- */

async function iniciar() {
  st.sessao = await sessaoAtual();
  if (st.recuperando) return;
  if (!st.sessao) return telaLogin();
  try {
    await rpc("clube_garantir_perfil");
    st.sit = await rpc("clube_minha_situacao");
    render();
    if (params.get("checkout") === "retorno") acompanharConfirmacao();
    if (params.get("checkout") === "cancelado") {
      toast("Pagamento não concluído. Nada foi cobrado; você pode tentar de novo quando quiser.");
      history.replaceState(null, "", location.pathname);
    }
  } catch (e) {
    app.innerHTML = `<div class="aviso erro">${esc(mensagem(e))}</div>`;
  }
}

async function recarregar() {
  st.sit = await rpc("clube_minha_situacao");
  render();
}

const planoAtual = () => st.sit.beneficio_vigente?.plano || st.sit.assinatura?.plano || null;

function render() {
  const s = st.sit;
  const abas = ABAS.filter(([k]) => k !== "caixas" || planoAtual() === "ha_assinatura")
    .filter(([k]) => k !== "eventos" || planoAtual() === "ha_club");
  if (!abas.some(([k]) => k === st.aba)) st.aba = "geral";
  app.innerHTML = `
    <div class="toolbar"><div><h2 style="margin:0">Olá, ${esc(s.perfil?.nome?.split(" ")[0] || "membro")}</h2>
      <div class="hint">${esc(st.sessao.user.email)}${s.admin ? ` · <a class="link" href="../clube/admin/">Administração</a>` : ""}</div></div>
      <button class="btn btn-sm" id="sair">Sair</button></div>
    <div id="banner"></div>
    <div class="tabs tabs-membro">${abas.map(([k, t]) => `<button data-aba="${k}" class="${k === st.aba ? "active" : ""}">${t}</button>`).join("")}</div>
    <div id="conteudo"><div class="carregando">Carregando…</div></div>`;
  document.getElementById("sair").onclick = () => sb.auth.signOut();
  app.querySelectorAll("[data-aba]").forEach((b) => (b.onclick = () => { st.aba = b.dataset.aba; render(); }));
  const telas = { geral: abaGeral, carteira: abaCarteira, indicacao: abaIndicacao, caixas: abaCaixas, eventos: abaEventos, dados: abaDados };
  Promise.resolve(telas[st.aba]()).catch((e) => {
    document.getElementById("conteudo").innerHTML = `<div class="aviso erro">${esc(mensagem(e))}</div>`;
  });
}

// Retorno do Checkout: só acompanha. Quem libera benefício é o webhook, após confirmar o pagamento.
async function acompanharConfirmacao() {
  const banner = () => document.getElementById("banner");
  const mostrar = (html, cls = "") => { if (banner()) banner().innerHTML = `<div class="aviso ${cls}" style="margin-bottom:16px">${html}</div>`; };
  for (let i = 0; i < 30; i++) {
    if (st.sit.beneficio_vigente) {
      mostrar("<b>Pagamento confirmado!</b> Seus benefícios já estão liberados.", "ok");
      history.replaceState(null, "", location.pathname);
      return;
    }
    mostrar("<b>Pagamento em confirmação.</b> Assim que o Stripe confirmar a cobrança, seus benefícios aparecem aqui. Você pode fechar esta página.");
    await new Promise((r) => setTimeout(r, 4000));
    st.sit = await rpc("clube_minha_situacao");
    if (st.sit.beneficio_vigente) render();
  }
  mostrar("A confirmação está demorando mais que o normal. Os benefícios serão liberados automaticamente quando o pagamento for confirmado.");
}

/* ---------- Visão geral ---------- */

const BENEFICIOS = {
  ha_assinatura: ["Caixa mensal com 12 doces gourmet no endereço cadastrado", "1 sabor novo e exclusivo por mês (na caixa)",
    "5% de desconto em compras de produtos", "R$ 5,00 de cashback por indicação que assinar", "Surpresa no mês do aniversário"],
  ha_club: ["R$ 90,00 de crédito mensal em produtos (não acumulativo)", "5% de desconto em compras de produtos",
    "1 evento presencial por mês", "R$ 5,00 de cashback por indicação que assinar", "Presente no mês do aniversário"],
};

function cartaoPlano(chave, destaque) {
  return `<article class="plano ${chave === "ha_club" ? "club" : ""}" style="${destaque ? "box-shadow:0 0 0 3px var(--gold)" : ""}">
    <h3>${PLANOS[chave].nome}</h3><div class="preco">${brl(PLANOS[chave].preco)} <small>/ mês</small></div>
    <ul>${BENEFICIOS[chave].map((b) => `<li>${b}</li>`).join("")}</ul>
    <button class="btn btn-primary" data-assinar="${chave}">Assinar ${PLANOS[chave].nome}</button></article>`;
}

function abaGeral() {
  const s = st.sit, a = s.assinatura, v = s.beneficio_vigente;
  const el = document.getElementById("conteudo");
  const incompleto = !s.perfil_completo
    ? `<div class="aviso" style="margin-bottom:16px">Complete seus dados (telefone, nascimento e endereço) em <a class="link" href="#" data-ir="dados">Meus dados</a> para poder assinar.</div>` : "";
  const vivo = a && ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(a.status);
  if (!vivo && !v) {
    const escolhido = params.get("plano");
    el.innerHTML = `${incompleto}${a ? `<div class="aviso" style="margin-bottom:16px">Sua assinatura anterior está ${esc(ROTULOS.assinatura[a.status]?.[0] ?? a.status).toLowerCase()}. Você pode assinar novamente.</div>` : ""}
      ${s.checkout?.status === "aberta" ? `<div class="aviso" style="margin-bottom:16px">Você iniciou uma contratação. Clique em assinar para continuar de onde parou.</div>` : ""}
      <div class="planos" style="margin-top:0">${cartaoPlano("ha_assinatura", escolhido === "ha_assinatura")}${cartaoPlano("ha_club", escolhido === "ha_club")}</div>
      <p class="hint">Pagamento mensal recorrente no cartão de crédito, processado pelo Stripe. Cancelamento a qualquer momento, com efeito ao fim do mês pago.</p>`;
  } else {
    const plano = v?.plano || a?.plano;
    const pendente = a && ["past_due", "unpaid"].includes(a.status);
    el.innerHTML = `${incompleto}
      ${pendente ? `<div class="alert red" style="margin-bottom:16px"><div><b>Pagamento pendente</b><span>A última cobrança não foi aprovada. Atualize o cartão em “Gerenciar cobrança”. Novos benefícios só são liberados após o pagamento.</span></div></div>` : ""}
      <div class="grid g-2">
        <div class="card"><div class="card-head"><div><h3>${esc(PLANOS[plano]?.nome ?? "Assinatura")}</h3>
          <div class="sub">${a ? selo("assinatura", a.status) : ""}</div></div></div>
          <ul class="lista-simples">
            <li><span>Benefícios do período pago</span><b>${v ? `${data(v.inicio)} a ${data(v.fim)}` : "aguardando confirmação de pagamento"}</b></li>
            ${a?.cancelar_no_fim ? `<li><span>Cancelamento agendado</span><b>sem renovação após ${data(a.cancelar_em || a.periodo_atual_fim)}</b></li>`
              : a?.status === "active" ? `<li><span>Próxima renovação</span><b>${data(a.periodo_atual_fim)}</b></li>` : ""}
            ${v && v.situacao !== "pago" ? `<li><span>Situação do pagamento</span><b>${esc(v.situacao.replace("_", " "))}</b></li>` : ""}
          </ul>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
            ${s.tem_cliente_stripe ? `<button class="btn btn-primary" id="portal">Gerenciar cobrança e cartão</button>` : ""}
          </div>
          <p class="hint">No portal você atualiza o cartão, vê as faturas e pode cancelar (vale ao fim do período pago). Para trocar de plano, fale com a loja.</p>
        </div>
        <div class="card"><div class="card-head"><h3>Seus benefícios</h3></div>
          <ul class="lista-simples">${(BENEFICIOS[plano] ?? []).map((b) => `<li>${b}</li>`).join("")}</ul>
          ${v ? "" : `<p class="hint">Os benefícios ficam disponíveis enquanto houver um período pago vigente.</p>`}
        </div>
      </div>`;
  }
  el.querySelectorAll("[data-ir]").forEach((x) => (x.onclick = (e) => { e.preventDefault(); st.aba = x.dataset.ir; render(); }));
  el.querySelectorAll("[data-assinar]").forEach((b) => (b.onclick = () => assinar(b.dataset.assinar, b)));
  const portal = document.getElementById("portal");
  if (portal) portal.onclick = () => abrirPortal(portal);
}

async function assinar(plano, botao) {
  if (!st.sit.perfil_completo) { toast("Complete seus dados antes de assinar"); st.aba = "dados"; render(); return; }
  botao.disabled = true;
  try {
    const r = await funcao("clube-checkout", { plano });
    if (r.url) { location.href = r.url; return; }
    toast("Seu pagamento já foi enviado e está em confirmação.");
    await recarregar();
  } catch (e) {
    toast(mensagem(e));
  } finally {
    botao.disabled = false;
  }
}

async function abrirPortal(botao) {
  botao.disabled = true;
  try { location.href = (await funcao("clube-portal")).url; } catch (e) { toast(mensagem(e)); botao.disabled = false; }
}

/* ---------- Carteira e resgate ---------- */

async function abaCarteira() {
  const el = document.getElementById("conteudo");
  const uid = st.sessao.user.id;
  const [{ data: resgates }, { data: extrato }] = await Promise.all([
    sb.from("clube_resgates").select("*").eq("user_id", uid).order("criado_em", { ascending: false }).limit(20),
    sb.from("clube_carteira_lancamentos").select("id, tipo, valor_centavos, motivo, criado_em, lote:clube_credito_lotes(tipo, expira_em)")
      .eq("user_id", uid).order("criado_em", { ascending: false }).limit(60),
  ]);
  const saldos = st.sit.saldos;
  const bloco = (tipo) => {
    const x = saldos[tipo] ?? {};
    return `<div class="card"><div class="card-head"><div><h3>${ROTULOS.credito[tipo]}</h3>
      <div class="sub">${tipo === "club_monthly" ? (x.proximo_vencimento ? `Vence em ${dataHora(x.proximo_vencimento)}` : "Válido durante o período pago") : "Separado do crédito mensal"}</div></div></div>
      <div class="kpi-value">${brl(x.disponivel)}</div><div class="hint">disponível agora</div>
      <ul class="lista-simples" style="margin-top:10px">
        <li><span>Reservado</span><b>${brl(x.reservado)}</b></li><li><span>Usado</span><b>${brl(x.usado)}</b></li>
        <li><span>Vencido</span><b>${brl(x.expirado)}</b></li><li><span>Estornado</span><b>${brl(x.revertido)}</b></li>
        ${x.bloqueado ? `<li><span>Bloqueado para análise</span><b>${brl(x.bloqueado)}</b></li>` : ""}
      </ul></div>`;
  };
  el.innerHTML = `
    <div class="grid g-2">${bloco("club_monthly")}${bloco("referral")}</div>
    <div class="card mt"><div class="card-head"><div><h3>Usar crédito e desconto em uma compra</h3>
      <div class="sub">Informe o valor dos produtos que você vai comprar na loja. Reservamos o crédito e a loja confirma a compra e o valor final.</div></div></div>
      <form class="form" id="fResgate" novalidate>
        <div class="linha"><label>Valor dos produtos (R$)<input name="valor" inputmode="decimal" placeholder="100,00" required /></label>
        <label>O que você quer comprar<input name="descricao" maxlength="300" placeholder="Ex.: caixa de brigadeiros 24 un." required /></label></div>
        <div id="simulacao"></div>
        <div class="aviso erro" id="erroResgate" hidden></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="simular">Simular</button>
          <button class="btn btn-primary">Solicitar uso</button></div>
        <p class="hint" style="margin:0">O desconto de 5% vale para produtos (não para frete nem mensalidade) e é aplicado antes do crédito. Usamos primeiro o crédito que vence antes. A parte que faltar é paga na loja.</p>
      </form></div>
    <div class="card mt"><div class="card-head"><h3>Minhas solicitações</h3></div>
      ${resgates?.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Compra</th><th>Situação</th><th class="num">Crédito</th><th class="num">A pagar</th><th></th></tr></thead><tbody>
        ${resgates.map((r) => `<tr><td>${dataHora(r.criado_em)}</td><td>${esc(r.descricao)}</td><td>${selo("resgate", r.status)}${r.status === "reservado" ? `<div class="hint">até ${dataHora(r.reserva_expira_em)}</div>` : ""}</td>
          <td class="num">${brl(r.status === "confirmado" ? r.credito_usado_centavos : r.credito_reservado_centavos)}</td>
          <td class="num">${r.a_pagar_centavos != null ? brl(r.a_pagar_centavos) : "—"}</td>
          <td>${r.status === "reservado" ? `<button class="btn btn-sm btn-danger" data-cancelar="${r.id}">Cancelar</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty">Nenhuma solicitação ainda.</div>`}</div>
    <div class="card mt"><div class="card-head"><h3>Extrato</h3></div>
      ${extrato?.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Movimento</th><th>Crédito</th><th class="num">Valor</th><th>Detalhe</th></tr></thead><tbody>
        ${extrato.map((l) => `<tr><td>${dataHora(l.criado_em)}</td><td>${ROTULOS.lancamento[l.tipo]}</td><td>${ROTULOS.credito[l.lote?.tipo] ?? ""}</td>
          <td class="num ${l.tipo === "concessao" || l.tipo === "liberacao" ? "pos" : ""}">${brl(l.valor_centavos)}</td><td>${esc(l.motivo ?? "")}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty">Sem movimentações.</div>`}</div>`;

  const f = document.getElementById("fResgate");
  const erro = document.getElementById("erroResgate");
  const valor = () => reaisParaCentavos(f.valor.value);
  document.getElementById("simular").onclick = async () => {
    erro.hidden = true;
    try {
      const c = await rpc("clube_simular_resgate", { p_subtotal: valor() });
      document.getElementById("simulacao").innerHTML = `<ul class="lista-simples">
        <li><span>Produtos</span><b>${brl(c.subtotal_centavos)}</b></li>
        <li><span>Desconto (${c.desconto_bps / 100}%)</span><b>− ${brl(c.desconto_centavos)}</b></li>
        <li><span>Crédito usado</span><b>− ${brl(c.credito_centavos)}</b></li>
        <li><span>A pagar na loja (sem frete)</span><b>${brl(c.a_pagar_centavos)}</b></li></ul>`;
    } catch (e) { erro.textContent = mensagem(e); erro.hidden = false; }
  };
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const botao = f.querySelector("button.btn-primary");
    botao.disabled = true;
    try {
      await rpc("clube_solicitar_resgate", { p_subtotal: valor(), p_descricao: f.descricao.value.trim(), p_chave: st.chaveResgate });
      st.chaveResgate = crypto.randomUUID();
      toast("Crédito reservado. Apresente-se na loja para concluir a compra.");
      await recarregar();
    } catch (err) {
      erro.textContent = mensagem(err);
      erro.hidden = false;
      botao.disabled = false;
    }
  });
  el.querySelectorAll("[data-cancelar]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await rpc("clube_cancelar_resgate", { p_resgate: b.dataset.cancelar }); toast("Reserva cancelada"); await recarregar(); }
    catch (e) { toast(mensagem(e)); b.disabled = false; }
  }));
}

/* ---------- Indicação ---------- */

async function abaIndicacao() {
  const el = document.getElementById("conteudo");
  const codigo = st.sit.perfil?.codigo_indicacao ?? "";
  const link = `${urlSite("cadastro/")}?ref=${codigo}`;
  const { data: conv } = await sb.from("clube_indicacoes").select("id, status, criado_em, qualificada_em")
    .eq("indicador_id", st.sessao.user.id).order("criado_em", { ascending: false });
  const ganho = st.sit.saldos.referral ?? {};
  el.innerHTML = `<div class="grid g-2">
    <div class="card"><div class="card-head"><div><h3>Seu código</h3><div class="sub">Compartilhe o código ou o link. Você ganha R$ 5,00 em crédito quando o amigo assina e o primeiro pagamento é confirmado.</div></div></div>
      <div class="codigo-ind">${esc(codigo)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn" data-copiar="${esc(codigo)}">Copiar código</button>
        <button class="btn btn-primary" data-copiar="${esc(link)}">Copiar link</button></div>
      <p class="hint" style="word-break:break-all">${esc(link)}</p></div>
    <div class="card"><div class="card-head"><h3>Seus ganhos</h3></div>
      <div class="kpi-value">${brl(ganho.disponivel)}</div><div class="hint">cashback disponível</div>
      <ul class="lista-simples" style="margin-top:10px"><li><span>Indicações</span><b>${conv?.length ?? 0}</b></li>
        <li><span>Recompensadas</span><b>${conv?.filter((c) => c.status === "recompensada").length ?? 0}</b></li></ul></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Conversões</h3><div class="sub">Por privacidade, não mostramos dados das pessoas indicadas.</div></div></div>
    ${conv?.length ? `<ul class="lista-simples">${conv.map((c, i) => `<li><span>Indicação ${conv.length - i} · cadastro em ${data(c.criado_em)}</span>${selo("indicacao", c.status)}</li>`).join("")}</ul>`
      : `<div class="empty">Ninguém se cadastrou com seu código ainda.</div>`}</div>`;
  el.querySelectorAll("[data-copiar]").forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copiar); toast("Copiado!"); } catch { toast("Não foi possível copiar"); }
  }));
}

/* ---------- Caixas ---------- */

const enderecoTxt = (e) => (e?.cep ? `${esc(e.logradouro)}, ${esc(e.numero)}${e.complemento ? ` – ${esc(e.complemento)}` : ""} · ${esc(e.bairro)} · ${esc(e.cidade)}/${esc(e.uf)} · CEP ${esc(e.cep)}` : "Endereço não informado");

async function abaCaixas() {
  const el = document.getElementById("conteudo");
  const { data: caixas, error } = await sb.from("clube_caixas").select("*, sabor:clube_sabores_mes(nome, descricao)")
    .eq("user_id", st.sessao.user.id).order("competencia", { ascending: false });
  if (error) throw error;
  el.innerHTML = `<div class="card"><div class="card-head"><div><h3>Minhas caixas</h3><div class="sub">Uma caixa por mês pago. Pagamento confirmado não significa que a caixa já saiu: acompanhe o status.</div></div></div>
    ${caixas.length ? `<div class="table-wrap"><table><thead><tr><th>Mês</th><th>Status</th><th>Sabor do mês</th><th>Entrega para</th></tr></thead><tbody>
      ${caixas.map((c) => `<tr><td>${competencia(c.competencia)}</td><td>${selo("caixa", c.status)}${c.observacao ? `<div class="hint">${esc(c.observacao)}</div>` : ""}</td>
        <td>${c.sabor ? `<b>${esc(c.sabor.nome)}</b>${c.sabor.descricao ? `<div class="hint">${esc(c.sabor.descricao)}</div>` : ""}` : `<span class="hint">a definir</span>`}</td>
        <td style="white-space:normal"><b>${esc(c.destinatario_nome)}</b><div class="hint">${enderecoTxt(c.endereco)}</div></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">Sua primeira caixa aparece aqui depois da confirmação do pagamento.</div>`}
    <p class="hint">Mudou de endereço? Atualize em “Meus dados”. Caixas já registradas mantêm o endereço da época; fale com a loja se precisar alterar uma caixa ainda não enviada.</p></div>`;
}

/* ---------- Eventos (Club) ---------- */

async function abaEventos() {
  const el = document.getElementById("conteudo");
  const [{ data: eventos, error }, { data: minhas }] = await Promise.all([
    sb.from("clube_eventos").select("*").gt("fim", new Date().toISOString()).order("inicio"),
    sb.from("clube_evento_reservas").select("evento_id, status, presenca").eq("user_id", st.sessao.user.id),
  ]);
  if (error) throw error;
  const minha = (id) => minhas?.find((r) => r.evento_id === id && r.status === "confirmada");
  const club = st.sit.beneficio_vigente?.plano === "ha_club";
  el.innerHTML = `${club ? "" : `<div class="aviso" style="margin-bottom:16px">A confirmação de presença fica disponível com a mensalidade do Club em dia.</div>`}
    ${eventos.length ? `<div class="grid g-2">${eventos.map((e) => `<div class="card"><div class="card-head"><div><h3>${esc(e.titulo)}</h3>
      <div class="sub">${dataHora(e.inicio)} · ${esc(e.local)}</div></div>${minha(e.id) ? `<span class="badge b-green">Presença confirmada</span>` : ""}</div>
      ${e.descricao ? `<p style="white-space:pre-line;margin-top:0">${esc(e.descricao)}</p>` : ""}
      ${e.capacidade ? `<p class="hint">Vagas limitadas: ${e.capacidade}</p>` : ""}
      ${club && new Date(e.inicio) > new Date() ? (minha(e.id) ? `<button class="btn btn-sm btn-danger" data-sair="${e.id}">Cancelar presença</button>`
        : `<button class="btn btn-sm btn-primary" data-ir="${e.id}">Confirmar presença</button>`) : ""}
    </div>`).join("")}</div>` : `<div class="card"><div class="empty">A agenda do próximo evento será publicada aqui.</div></div>`}`;
  el.querySelectorAll("[data-ir]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await rpc("clube_evento_reservar", { p_evento: b.dataset.ir }); toast("Presença confirmada"); render(); }
    catch (e) { toast(mensagem(e)); b.disabled = false; }
  }));
  el.querySelectorAll("[data-sair]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await rpc("clube_evento_cancelar", { p_evento: b.dataset.sair }); toast("Presença cancelada"); render(); }
    catch (e) { toast(mensagem(e)); b.disabled = false; }
  }));
}

/* ---------- Meus dados ---------- */

function abaDados() {
  const el = document.getElementById("conteudo");
  const p = st.sit.perfil ?? {}, e = st.sit.endereco ?? {};
  const fone = p.telefone ? p.telefone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "";
  el.innerHTML = `<div class="grid g-21">
    <div class="card"><div class="card-head"><h3>Dados pessoais e endereço</h3></div>
      <form class="form" id="fDados" novalidate>
        <label>Nome completo<input name="nome" value="${esc(p.nome)}" maxlength="120" required /></label>
        <div class="linha"><label>Telefone com DDD<input name="telefone" type="tel" value="${esc(fone)}" required /></label>
          <label>Data de nascimento<input name="nascimento" type="date" value="${esc(p.nascimento ?? "")}" ${p.nascimento ? "disabled" : ""} />
          ${p.nascimento ? `<span class="hint">${dataCivil(p.nascimento)} · para corrigir, fale com a loja</span>` : ""}</label></div>
        <div class="linha3"><label>CEP<input name="cep" inputmode="numeric" maxlength="9" value="${esc(e.cep ?? "")}" required /></label>
          <label>UF<input name="uf" maxlength="2" value="${esc(e.uf ?? "")}" style="text-transform:uppercase" required /></label>
          <label>Número<input name="numero" maxlength="20" value="${esc(e.numero ?? "")}" required /></label></div>
        <label>Rua / logradouro<input name="logradouro" maxlength="160" value="${esc(e.logradouro ?? "")}" required /></label>
        <div class="linha"><label>Complemento<input name="complemento" maxlength="80" value="${esc(e.complemento ?? "")}" /></label>
          <label>Bairro<input name="bairro" maxlength="80" value="${esc(e.bairro ?? "")}" required /></label></div>
        <div class="linha"><label>Cidade<input name="cidade" maxlength="80" value="${esc(e.cidade ?? "")}" required /></label>
          <label>Ponto de referência<input name="referencia" maxlength="160" value="${esc(e.referencia ?? "")}" /></label></div>
        <label>Destinatário da caixa (opcional, para presentear)<input name="destinatario" maxlength="120" value="${esc(e.destinatario ?? "")}" placeholder="Em branco: seu nome" />
          <span class="hint">A caixa pode ir para outra pessoa neste endereço; isso não cria outra conta nem outra assinatura.</span></label>
        <div class="aviso erro" id="erroDados" hidden></div>
        <button class="btn btn-primary">Salvar dados</button>
      </form></div>
    <div><div class="card"><div class="card-head"><h3>E-mail de acesso</h3></div>
      <form class="form" id="fEmail"><label>Novo e-mail<input name="email" type="email" required /></label>
        <button class="btn">Alterar e-mail</button><p class="hint" style="margin:0">Enviaremos um link de confirmação; a troca só vale após confirmar.</p></form></div>
      <div class="card mt"><div class="card-head"><h3>Senha</h3></div>
      <form class="form" id="fSenha"><label>Nova senha (mínimo 8)<input name="senha" type="password" minlength="8" autocomplete="new-password" required /></label>
        <button class="btn">Alterar senha</button></form></div></div>
  </div>`;

  document.getElementById("fDados").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target, erro = document.getElementById("erroDados");
    erro.hidden = true;
    try {
      await rpc("clube_salvar_perfil", {
        p_nome: f.nome.value.trim(),
        p_telefone: f.telefone.value,
        p_nascimento: f.nascimento.disabled ? null : f.nascimento.value || null,
        p_endereco: {
          cep: f.cep.value, uf: f.uf.value, numero: f.numero.value, logradouro: f.logradouro.value, complemento: f.complemento.value,
          bairro: f.bairro.value, cidade: f.cidade.value, referencia: f.referencia.value, destinatario: f.destinatario.value,
        },
      });
      toast("Dados salvos");
      await recarregar();
    } catch (err) { erro.textContent = mensagem(err); erro.hidden = false; }
  });
  document.getElementById("fEmail").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const { error } = await sb.auth.updateUser({ email: ev.target.email.value.trim() }, { emailRedirectTo: urlSite("membros/") });
    toast(error ? "Não foi possível alterar o e-mail" : "Confira a caixa de entrada para confirmar o novo e-mail");
  });
  document.getElementById("fSenha").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (ev.target.senha.value.length < 8) { toast("Use pelo menos 8 caracteres"); return; }
    const { error } = await sb.auth.updateUser({ password: ev.target.senha.value });
    toast(error ? "Não foi possível alterar a senha" : "Senha alterada");
    ev.target.reset();
  });
}

iniciar();
