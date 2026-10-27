// Administração do Clube. O acesso depende de public.clube_admins (checado no banco em cada função e pela RLS).
// Nada aqui edita saldo diretamente: ajustes passam por funções com motivo obrigatório e auditoria.
import {
  brl, competencia, data, dataCivil, dataHora, esc, funcao, mensagem, modal, PLANOS, reaisParaCentavos, ROTULOS, rpc, sb,
  selo, sessaoAtual, toast, topo, urlSite,
} from "../clube.js";

document.getElementById("topo").innerHTML = topo("admin");
const app = document.getElementById("app");
const ABAS = [["painel", "Painel"], ["membros", "Membros"], ["caixas", "Caixas e sabor"], ["resgates", "Resgates"],
  ["indicacoes", "Indicações"], ["aniversarios", "Aniversários"], ["eventos", "Eventos"], ["entrega", "Regiões de entrega"],
  ["pendencias", "Pendências"]];
const st = { aba: new URLSearchParams(location.search).get("aba") || "painel", busca: "", filtroCaixa: "abertas", membro: null };

const nomePlano = (k) => PLANOS[k]?.nome ?? (k || "—");
const tabela = (cab, linhas, vazio = "Nada por aqui.") => linhas.length
  ? `<div class="table-wrap"><table><thead><tr>${cab.map((c) => `<th${c.startsWith(">") ? ' class="num"' : ""}>${c.replace(/^>/, "")}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>`
  : `<div class="empty">${vazio}</div>`;
const ligar = (sel, fn) => app.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b.dataset, b)));
async function q(promessa) {
  const { data: d, error } = await promessa;
  if (error) throw new Error(error.message);
  return d;
}

async function iniciar() {
  const s = await sessaoAtual();
  if (!s) { location.href = urlSite("membros/"); return; }
  if (!(await rpc("clube_is_admin"))) {
    app.innerHTML = `<div class="aviso erro">Acesso restrito à equipe da loja.</div>`;
    return;
  }
  render();
}

function render() {
  app.innerHTML = `<div class="toolbar"><h2 style="margin:0">Administração do Clube</h2><a class="btn btn-sm" href="../../gestao/">Voltar à gestão</a></div>
    <div class="tabs tabs-membro">${ABAS.map(([k, t]) => `<button data-aba="${k}" class="${k === st.aba ? "active" : ""}">${t}</button>`).join("")}</div>
    <div id="conteudo"><div class="carregando">Carregando…</div></div>`;
  ligar("[data-aba]", (d) => { st.aba = d.aba; render(); });
  const telas = { painel, membros, caixas, resgates, indicacoes, aniversarios, eventos, entrega, pendencias };
  telas[st.aba]().catch((e) => { document.getElementById("conteudo").innerHTML = `<div class="aviso erro">${esc(mensagem(e))}</div>`; });
}
const conteudo = (html) => { document.getElementById("conteudo").innerHTML = html; };

/* ---------- Painel ---------- */
async function painel() {
  const i = await rpc("clube_admin_indicadores");
  const kpi = (rotulo, valor, pe = "") => `<div class="card kpi"><div class="kpi-label">${rotulo}</div><div class="kpi-value">${valor}</div><div class="kpi-foot">${pe}</div></div>`;
  const cred = (k) => i.creditos[k] ?? 0;
  const assin = Object.entries(i.assinaturas).map(([k, n]) => {
    const [plano, status] = k.split(":");
    return `<tr><td>${esc(nomePlano(plano))}</td><td>${selo("assinatura", status)}</td><td class="num">${n}</td></tr>`;
  });
  conteudo(`<div class="grid g-4">
      ${kpi("Com benefício vigente · Assinatura", i.beneficio_vigente.ha_assinatura ?? 0)}
      ${kpi("Com benefício vigente · Club", i.beneficio_vigente.ha_club ?? 0)}
      ${kpi("Pagamentos confirmados", brl(i.pagamentos_confirmados.valor_centavos), `${i.pagamentos_confirmados.quantidade} faturas · reembolsado ${brl(i.pagamentos_confirmados.reembolsado_centavos)}`)}
      ${kpi("Cobranças pendentes", i.pendencias.cobranca_pendente, "past_due / unpaid")}
    </div>
    <div class="grid g-4 mt">
      ${kpi("Exceções abertas", i.pendencias.excecoes_abertas)}
      ${kpi("Resgates aguardando", i.pendencias.resgates_reservados)}
      ${kpi("Caixas a preparar/enviar", i.pendencias.caixas_aguardando)}
      ${kpi("Eventos Stripe com erro", i.pendencias.eventos_stripe_com_erro)}
    </div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-head"><div><h3>Créditos</h3><div class="sub">Crédito emitido é obrigação com o membro, não receita: não entra no faturamento.</div></div></div>
        ${tabela(["Tipo", ">Concedido", ">Usado", ">Vencido", ">Estornado"], ["club_monthly", "referral"].map((t) =>
          `<tr><td>${ROTULOS.credito[t]}</td><td class="num">${brl(cred(`${t}:concessao`))}</td><td class="num">${brl(cred(`${t}:consumo`))}</td><td class="num">${brl(cred(`${t}:expiracao`))}</td><td class="num">${brl(cred(`${t}:reversao`))}</td></tr>`))}</div>
      <div class="card"><div class="card-head"><h3>Indicações e assinaturas</h3></div>
        <ul class="lista-simples" style="margin-bottom:16px">${Object.entries(i.indicacoes).map(([k, n]) => `<li>${selo("indicacao", k)}<b>${n}</b></li>`).join("") || "<li>Nenhuma indicação.</li>"}</ul>
        ${tabela(["Plano", "Situação no Stripe", ">Qtd."], assin, "Nenhuma assinatura ainda.")}</div>
    </div>`);
}

/* ---------- Membros ---------- */
async function membros() {
  const lista = await rpc("clube_admin_membros", { p_busca: st.busca || null });
  conteudo(`<div class="card"><div class="toolbar"><form id="fBusca" class="search" style="flex:1"><input name="b" placeholder="Buscar por nome, e-mail ou código" value="${esc(st.busca)}" /></form></div>
    ${tabela(["Membro", "Plano", "Situação", "Benefício até", ">Saldo", "Aniversário", ""], lista.map((m) => `<tr>
      <td><b>${esc(m.nome || "(sem nome)")}</b><div class="hint">${esc(m.email)} · ${esc(m.codigo_indicacao)}</div></td>
      <td>${esc(nomePlano(m.plano))}</td><td>${m.status_assinatura ? selo("assinatura", m.status_assinatura) : "—"}${m.cancelar_no_fim ? `<div class="hint">cancela ao fim</div>` : ""}</td>
      <td>${data(m.beneficio_ate)}</td><td class="num">${brl(m.saldo_disponivel)}</td><td>${dataCivil(m.nascimento)}</td>
      <td><div class="row-actions" style="opacity:1"><button class="btn btn-sm" data-detalhe="${m.user_id}" data-nome="${esc(m.nome)}">Detalhes</button></div></td></tr>`), "Nenhum membro encontrado.")}
    </div><div id="detalhe"></div>`);
  document.getElementById("fBusca").onsubmit = (e) => { e.preventDefault(); st.busca = e.target.b.value.trim(); membros(); };
  ligar("[data-detalhe]", (d) => detalheMembro(d.detalhe, d.nome));
}

async function detalheMembro(uid, nome) {
  const [lotes, faturas] = await Promise.all([
    q(sb.from("clube_credito_lotes").select("*").eq("user_id", uid).order("criado_em", { ascending: false })),
    q(sb.from("clube_faturas").select("*").eq("user_id", uid).order("registrada_em", { ascending: false }).limit(24)),
  ]);
  document.getElementById("detalhe").innerHTML = `<div class="card mt"><div class="card-head"><h3>${esc(nome || "Membro")}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" id="reconciliar">Reconciliar com o Stripe</button>
      <button class="btn btn-sm" id="creditar">Conceder crédito de ajuste</button></div></div>
    <h4>Créditos</h4>${tabela(["Tipo", "Validade", ">Valor", ">Disponível", ">Reservado", ">Usado", "Situação", ""], lotes.map((l) => `<tr>
      <td>${ROTULOS.credito[l.tipo]}</td><td>${l.expira_em ? `${data(l.inicio)} a ${dataHora(l.expira_em)}` : "sem vencimento"}</td>
      <td class="num">${brl(l.valor_centavos)}</td><td class="num">${brl(l.disponivel_centavos)}</td><td class="num">${brl(l.reservado_centavos)}</td><td class="num">${brl(l.usado_centavos)}</td>
      <td>${l.bloqueado ? `<span class="badge b-red">Bloqueado: ${esc(l.bloqueio_motivo)}</span>` : l.expira_em && new Date(l.expira_em) <= new Date() ? `<span class="badge b-gray">Vencido</span>` : `<span class="badge b-green">Ativo</span>`}</td>
      <td>${l.disponivel_centavos > 0 ? `<button class="btn btn-sm btn-danger" data-estornar="${l.id}" data-max="${l.disponivel_centavos}">Estornar</button>` : ""}</td></tr>`), "Sem créditos.")}
    <h4 class="mt">Faturas</h4>${tabela(["Registrada", "Plano", "Classificação", ">Pago", ">Reembolsado", "Período"], faturas.map((f) => `<tr>
      <td>${dataHora(f.registrada_em)}</td><td>${esc(nomePlano(f.plano_chave))}</td><td>${esc(f.classificacao)}${f.elegivel ? ' <span class="badge b-green">benefício</span>' : ""}${f.em_disputa ? ' <span class="badge b-red">disputa</span>' : ""}</td>
      <td class="num">${brl(f.valor_pago_centavos)}</td><td class="num">${brl(f.valor_reembolsado_centavos)}</td><td>${f.periodo_inicio ? `${data(f.periodo_inicio)} a ${data(f.periodo_fim)}` : "—"}</td></tr>`), "Sem faturas.")}
  </div>`;
  document.getElementById("reconciliar").onclick = async (e) => {
    e.target.disabled = true;
    try { const r = await funcao("clube-admin", { acao: "reconciliar_membro", user_id: uid }); toast(`Reconciliado: ${r.resultado.faturas} fatura(s)`); detalheMembro(uid, nome); }
    catch (err) { toast(mensagem(err)); e.target.disabled = false; }
  };
  document.getElementById("creditar").onclick = () => modal({
    titulo: "Crédito de ajuste", texto: "Cria um crédito sem vencimento (tipo cashback), registrado na auditoria. Use para correções combinadas com o membro.",
    campos: [{ nome: "valor", rotulo: "Valor (R$)", obrigatorio: true }, { nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true }],
    aoConfirmar: async (v) => { await rpc("clube_admin_creditar", { p_user: uid, p_valor: reaisParaCentavos(v.valor), p_motivo: v.motivo }); toast("Crédito concedido"); detalheMembro(uid, nome); },
  });
  document.querySelectorAll("[data-estornar]").forEach((b) => (b.onclick = () => modal({
    titulo: "Estornar crédito disponível", perigo: true, botao: "Estornar",
    texto: `Disponível neste lote: ${brl(+b.dataset.max)}. O estorno fica no extrato do membro e na auditoria.`,
    campos: [{ nome: "valor", rotulo: "Valor (R$)", obrigatorio: true }, { nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true }],
    aoConfirmar: async (v) => { await rpc("clube_admin_estornar_credito", { p_lote: b.dataset.estornar, p_valor: reaisParaCentavos(v.valor), p_motivo: v.motivo }); toast("Estornado"); detalheMembro(uid, nome); },
  })));
}

/* ---------- Caixas e sabor do mês ---------- */
async function caixas() {
  let consulta = sb.from("clube_caixas").select("*, perfil:clube_perfis(nome, telefone), sabor:clube_sabores_mes(nome)")
    .order("competencia", { ascending: false }).order("criado_em").limit(300);
  if (st.filtroCaixa === "abertas") consulta = consulta.in("status", ["aguardando_programacao", "em_preparo", "enviada", "excecao"]);
  const [lista, sabores] = await Promise.all([q(consulta), q(sb.from("clube_sabores_mes").select("*").order("competencia", { ascending: false }).limit(12))]);
  const end = (e) => (e?.cep ? `${esc(e.logradouro)}, ${esc(e.numero)}${e.complemento ? ` – ${esc(e.complemento)}` : ""} · ${esc(e.bairro)} · ${esc(e.cidade)}/${esc(e.uf)} · ${esc(e.cep)}` : "<span class='neg'>sem endereço</span>");
  conteudo(`<div class="grid g-21">
    <div class="card"><div class="toolbar"><h3 style="margin:0">Caixas</h3>
      <div class="tabs">${[["abertas", "Em aberto"], ["todas", "Todas"]].map(([k, t]) => `<button data-filtro="${k}" class="${st.filtroCaixa === k ? "active" : ""}">${t}</button>`).join("")}</div></div>
      ${tabela(["Mês", "Destinatário e endereço", "Sabor", "Status", ""], lista.map((c) => `<tr>
        <td>${competencia(c.competencia)}</td><td style="white-space:normal"><b>${esc(c.destinatario_nome)}</b> <span class="hint">(${esc(c.perfil?.nome)} · ${esc(c.perfil?.telefone ?? "")})</span><div class="hint">${end(c.endereco)}</div></td>
        <td>${esc(c.sabor?.nome ?? "—")}</td><td>${selo("caixa", c.status)}${c.observacao ? `<div class="hint">${esc(c.observacao)}</div>` : ""}</td>
        <td><button class="btn btn-sm" data-caixa="${c.id}" data-status="${c.status}" data-obs="${esc(c.observacao ?? "")}">Atualizar</button></td></tr>`), "Nenhuma caixa.")}</div>
    <div class="card"><div class="card-head"><h3>Sabor do mês</h3><button class="btn btn-sm btn-primary" id="novoSabor">Cadastrar</button></div>
      <ul class="lista-simples">${sabores.map((s) => `<li><span>${competencia(s.competencia)}</span><b>${esc(s.nome)}</b></li>`).join("") || "<li>Nenhum sabor cadastrado.</li>"}</ul>
      <p class="hint">O sabor é ligado às caixas do mesmo mês (competência no fuso de São Paulo).</p></div></div>`);
  ligar("[data-filtro]", (d) => { st.filtroCaixa = d.filtro; caixas(); });
  ligar("[data-caixa]", (d) => modal({
    titulo: "Atualizar caixa",
    campos: [
      { nome: "status", rotulo: "Status", tipo: "select", valor: d.status, opcoes: Object.entries(ROTULOS.caixa).map(([k, [t]]) => [k, t]) },
      { nome: "obs", rotulo: "Observação (visível ao membro)", tipo: "textarea", valor: d.obs },
      { nome: "endereco", rotulo: "Atualizar endereço pelo cadastro atual (só antes do envio)", tipo: "checkbox", valor: false },
    ],
    aoConfirmar: async (v) => { await rpc("clube_admin_caixa_atualizar", { p_caixa: d.caixa, p_status: v.status, p_observacao: v.obs, p_atualizar_endereco: v.endereco }); toast("Caixa atualizada"); caixas(); },
  }));
  document.getElementById("novoSabor").onclick = () => {
    const agora = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
    modal({
      titulo: "Sabor do mês",
      campos: [{ nome: "comp", rotulo: "Mês (AAAA-MM)", valor: agora, obrigatorio: true }, { nome: "nome", rotulo: "Nome do sabor", obrigatorio: true },
        { nome: "desc", rotulo: "Descrição", tipo: "textarea" }],
      aoConfirmar: async (v) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.comp)) throw new Error("valor_invalido");
        await rpc("clube_admin_sabor_salvar", { p_competencia: v.comp, p_nome: v.nome, p_descricao: v.desc }); toast("Sabor salvo"); caixas();
      },
    });
  };
}

/* ---------- Resgates ---------- */
async function resgates() {
  const lista = await q(sb.from("clube_resgates").select("*, perfil:clube_perfis(nome)").order("criado_em", { ascending: false }).limit(150));
  const abertos = lista.filter((r) => r.status === "reservado");
  const linha = (r) => `<tr><td>${dataHora(r.criado_em)}</td><td><b>${esc(r.perfil?.nome)}</b><div class="hint">${esc(r.descricao)}</div></td>
    <td class="num">${brl(r.subtotal_solicitado_centavos)}</td><td class="num">${brl(r.status === "confirmado" ? r.credito_usado_centavos : r.credito_reservado_centavos)}</td>
    <td>${selo("resgate", r.status)}${r.status === "reservado" ? `<div class="hint">reserva até ${dataHora(r.reserva_expira_em)}</div>` : r.a_pagar_centavos != null ? `<div class="hint">pago na loja: ${brl(r.a_pagar_centavos)} (${esc(r.pagamento_complementar_forma)})</div>` : ""}</td>
    <td>${r.status === "reservado" ? `<div style="display:flex;gap:6px"><button class="btn btn-sm btn-primary" data-confirmar="${r.id}" data-sub="${r.subtotal_solicitado_centavos}" data-bps="${r.desconto_bps}">Confirmar</button>
      <button class="btn btn-sm btn-danger" data-cancelar="${r.id}">Cancelar</button></div>` : ""}</td></tr>`;
  conteudo(`<div class="card"><div class="card-head"><div><h3>Aguardando confirmação (${abertos.length})</h3>
      <div class="sub">Confirme só depois de identificar a compra. O valor final é recalculado no servidor; a sobra da reserva volta ao membro.</div></div></div>
      ${tabela(["Pedido", "Membro", ">Produtos", ">Crédito", "Situação", ""], abertos.map(linha), "Nenhuma reserva aberta.")}</div>
    <div class="card mt"><div class="card-head"><h3>Histórico recente</h3></div>${tabela(["Pedido", "Membro", ">Produtos", ">Crédito", "Situação", ""], lista.filter((r) => r.status !== "reservado").map(linha))}</div>`);
  ligar("[data-confirmar]", (d) => modal({
    titulo: "Confirmar uso na loja", botao: "Confirmar uma vez",
    texto: `Desconto aplicado: ${+d.bps / 100}% sobre o valor dos produtos elegíveis (sem frete). A parte não coberta por crédito é registrada como pagamento manual na loja, nunca como cobrança Stripe.`,
    campos: [{ nome: "sub", rotulo: "Valor final dos produtos elegíveis (R$)", valor: (+d.sub / 100).toFixed(2).replace(".", ","), obrigatorio: true },
      { nome: "forma", rotulo: "Como o restante foi pago", tipo: "select", valor: "nenhum", opcoes: [["nenhum", "Nada a pagar"], ["pix", "Pix"], ["dinheiro", "Dinheiro"], ["cartao_maquininha", "Cartão na maquininha"], ["outro", "Outro"]] },
      { nome: "ref", rotulo: "Referência (nº do pedido/comprovante)" }, { nome: "obs", rotulo: "Observação", tipo: "textarea" }],
    aoConfirmar: async (v) => {
      const r = await rpc("clube_admin_confirmar_resgate", { p_resgate: d.confirmar, p_subtotal: reaisParaCentavos(v.sub), p_forma: v.forma, p_referencia: v.ref, p_observacao: v.obs });
      if (!r.ok) throw new Error(r.erro);
      toast(`Confirmado: crédito ${brl(r.resgate.credito_usado_centavos)}, a pagar ${brl(r.resgate.a_pagar_centavos)}`);
      resgates();
    },
  }));
  ligar("[data-cancelar]", (d) => modal({
    titulo: "Cancelar reserva", perigo: true, botao: "Cancelar reserva", texto: "O crédito volta ao membro com a validade original.",
    campos: [{ nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true }],
    aoConfirmar: async (v) => { await rpc("clube_admin_cancelar_resgate", { p_resgate: d.cancelar, p_motivo: v.motivo }); toast("Reserva cancelada"); resgates(); },
  }));
}

/* ---------- Indicações ---------- */
async function indicacoes() {
  const lista = await q(sb.from("clube_indicacoes").select("*, indicado:clube_perfis!clube_indicacoes_indicado_id_fkey(nome), indicador:clube_perfis!clube_indicacoes_indicador_id_fkey(nome)")
    .order("atualizada_em", { ascending: false }).limit(300));
  const pend = lista.filter((i) => i.status === "em_analise" || i.status === "inelegivel");
  const linha = (i) => `<tr><td>${data(i.criado_em)}</td><td><b>${esc(i.indicador?.nome)}</b> indicou <b>${esc(i.indicado?.nome)}</b><div class="hint">código ${esc(i.codigo)} · ${i.origem === "link" ? "pelo link" : "digitado"}</div></td>
    <td>${selo("indicacao", i.status)}${i.motivo ? `<div class="hint" style="white-space:normal">${esc(i.motivo)}</div>` : ""}</td><td>${esc(i.politica_versao ?? "—")}</td>
    <td>${i.status === "em_analise" || i.status === "inelegivel" ? `<div style="display:flex;gap:6px"><button class="btn btn-sm btn-primary" data-decidir="${i.id}" data-ok="1">Aprovar</button><button class="btn btn-sm btn-danger" data-decidir="${i.id}" data-ok="">Rejeitar</button></div>` : ""}</td></tr>`;
  conteudo(`<div class="card"><div class="card-head"><div><h3>Para analisar (${pend.length})</h3><div class="sub">Coincidência de telefone/endereço sozinha não prova fraude: decida com motivo. A aprovação credita R$ 5,00 uma única vez.</div></div></div>
    ${tabela(["Cadastro", "Indicação", "Situação", "Política", ""], pend.map(linha), "Nenhuma indicação pendente de análise.")}</div>
    <div class="card mt"><div class="card-head"><h3>Todas</h3></div>${tabela(["Cadastro", "Indicação", "Situação", "Política", ""], lista.map(linha))}</div>`);
  ligar("[data-decidir]", (d) => modal({
    titulo: d.ok ? "Aprovar indicação" : "Rejeitar indicação", perigo: !d.ok, botao: d.ok ? "Aprovar" : "Rejeitar",
    campos: [{ nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true }],
    aoConfirmar: async (v) => { await rpc("clube_admin_indicacao_decidir", { p_indicacao: d.decidir, p_aprovar: !!d.ok, p_motivo: v.motivo }); toast("Decisão registrada"); indicacoes(); },
  }));
}

/* ---------- Aniversários ---------- */
async function aniversarios() {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const ano = +hoje.slice(0, 4), mes = st.mesAniv ?? +hoje.slice(5, 7);
  const lista = await rpc("clube_admin_aniversariantes", { p_mes: mes, p_ano: ano });
  conteudo(`<div class="card"><div class="toolbar"><div><h3 style="margin:0">Aniversariantes</h3><div class="hint">Presente/surpresa para quem tem a mensalidade em dia no mês. Um registro por membro e ano.</div></div>
      <select id="mes" class="inline">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === mes ? "selected" : ""}>${new Date(2026, i, 1).toLocaleDateString("pt-BR", { month: "long" })}</option>`).join("")}</select></div>
    ${tabela(["Membro", "Nascimento", "Plano vigente", `Presente ${ano}`, ""], lista.map((m) => `<tr><td><b>${esc(m.nome)}</b></td><td>${dataCivil(m.nascimento)}</td>
      <td>${m.vigente ? esc(nomePlano(m.plano)) : `<span class="badge b-gray">sem período pago agora</span>`}</td>
      <td>${m.presente_status ? `<span class="badge b-green">${m.presente_status === "entregue" ? "Entregue" : "Retirado"}</span>` : "—"}</td>
      <td>${!m.presente_status && m.vigente ? `<button class="btn btn-sm btn-primary" data-aniv="${m.user_id}" data-plano="${m.plano}">Registrar</button>` : ""}</td></tr>`), "Nenhum aniversariante neste mês.")}</div>`);
  document.getElementById("mes").onchange = (e) => { st.mesAniv = +e.target.value; aniversarios(); };
  ligar("[data-aniv]", (d) => modal({
    titulo: d.plano === "ha_club" ? "Presente de aniversário" : "Surpresa de aniversário",
    campos: [{ nome: "status", rotulo: "Situação", tipo: "select", valor: "entregue", opcoes: [["entregue", "Entregue"], ["retirado", "Retirado na loja"]] },
      { nome: "tipo", rotulo: "O que foi dado (definido pela loja)", obrigatorio: true }, { nome: "obs", rotulo: "Observação", tipo: "textarea" }],
    aoConfirmar: async (v) => { await rpc("clube_admin_aniversario_registrar", { p_user: d.aniv, p_ano: ano, p_status: v.status, p_tipo_presente: v.tipo, p_observacao: v.obs }); toast("Registrado"); aniversarios(); },
  }));
}

/* ---------- Eventos ---------- */
const paraInputLocal = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(" ", "T") : "");
// Campo datetime-local digitado no horário de São Paulo (UTC-3, sem horário de verão desde 2019).
const deInputLocal = (v) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);

async function eventos() {
  const lista = await q(sb.from("clube_eventos").select("*, reservas:clube_evento_reservas(id, status, presenca, perfil:clube_perfis(nome))").order("inicio", { ascending: false }).limit(50));
  conteudo(`<div class="toolbar"><h3 style="margin:0">Eventos presenciais do Club</h3><button class="btn btn-primary btn-sm" data-evento="">Novo evento</button></div>
    ${lista.map((e) => {
      const conf = e.reservas.filter((r) => r.status === "confirmada");
      return `<div class="card mt"><div class="card-head"><div><h3>${esc(e.titulo)} <span class="badge b-${e.status === "publicado" ? "green" : e.status === "cancelado" ? "red" : "gray"}">${esc(e.status)}</span></h3>
        <div class="sub">${dataHora(e.inicio)} – ${dataHora(e.fim)} · ${esc(e.local)} · ${conf.length}${e.capacidade ? `/${e.capacidade}` : ""} confirmados</div></div>
        <button class="btn btn-sm" data-evento="${e.id}">Editar</button></div>
        ${tabela(["Membro", "Presença", ""], conf.map((r) => `<tr><td>${esc(r.perfil?.nome)}</td><td>${esc(r.presenca)}</td>
          <td><div style="display:flex;gap:6px"><button class="btn btn-sm" data-presenca="${r.id}" data-v="presente">Presente</button><button class="btn btn-sm" data-presenca="${r.id}" data-v="ausente">Ausente</button></div></td></tr>`), "Sem confirmações.")}</div>`;
    }).join("") || `<div class="card"><div class="empty">Nenhum evento cadastrado.</div></div>`}`);
  ligar("[data-evento]", (d) => {
    const e = lista.find((x) => x.id === d.evento) ?? {};
    modal({
      titulo: e.id ? "Editar evento" : "Novo evento",
      campos: [{ nome: "titulo", rotulo: "Título", valor: e.titulo, obrigatorio: true }, { nome: "local", rotulo: "Local", valor: e.local, obrigatorio: true },
        { nome: "inicio", rotulo: "Início (horário de Brasília)", tipo: "datetime-local", valor: paraInputLocal(e.inicio), obrigatorio: true, cheio: false },
        { nome: "fim", rotulo: "Fim", tipo: "datetime-local", valor: paraInputLocal(e.fim), obrigatorio: true, cheio: false },
        { nome: "capacidade", rotulo: "Capacidade (vazio = sem limite)", tipo: "number", valor: e.capacidade ?? "", cheio: false },
        { nome: "status", rotulo: "Status", tipo: "select", valor: e.status ?? "rascunho", opcoes: [["rascunho", "Rascunho"], ["publicado", "Publicado"], ["cancelado", "Cancelado"]], cheio: false },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", valor: e.descricao }],
      aoConfirmar: async (v) => {
        await rpc("clube_admin_evento_salvar", { p: { id: e.id ?? null, titulo: v.titulo, local: v.local, descricao: v.descricao, inicio: deInputLocal(v.inicio), fim: deInputLocal(v.fim), capacidade: v.capacidade, status: v.status } });
        toast("Evento salvo"); eventos();
      },
    });
  });
  ligar("[data-presenca]", async (d) => { try { await rpc("clube_admin_presenca", { p_reserva: d.presenca, p_presenca: d.v }); eventos(); } catch (e) { toast(mensagem(e)); } });
}

/* ---------- Regiões de entrega ---------- */
async function entrega() {
  const lista = await q(sb.from("clube_cobertura_entrega").select("*").order("cep_prefixo"));
  conteudo(`<div class="card"><div class="card-head"><div><h3>Regiões atendidas pela caixa mensal</h3>
      <div class="sub">A Assinatura HA Gourmet só pode ser contratada por quem tem CEP começando com um prefixo ativo. Frete, data de corte e calendário ainda estão pendentes de definição (docs/regras-negocio.md).</div></div>
      <button class="btn btn-sm btn-primary" data-cob="">Adicionar</button></div>
    ${tabela(["Prefixo do CEP", "Descrição", "Situação", ""], lista.map((c) => `<tr><td><b>${esc(c.cep_prefixo)}</b></td><td>${esc(c.descricao)}</td>
      <td>${c.ativo ? '<span class="badge b-green">Ativa</span>' : '<span class="badge b-gray">Inativa</span>'}</td>
      <td><button class="btn btn-sm" data-cob="${esc(c.cep_prefixo)}" data-desc="${esc(c.descricao)}" data-ativo="${c.ativo ? 1 : ""}">Editar</button></td></tr>`), "Nenhuma região cadastrada: a venda do plano com caixa está fechada.")}</div>`);
  ligar("[data-cob]", (d) => modal({
    titulo: "Região de entrega",
    campos: [{ nome: "prefixo", rotulo: "Prefixo do CEP (2 a 8 números)", valor: d.cob, obrigatorio: true }, { nome: "desc", rotulo: "Descrição", valor: d.desc ?? "", obrigatorio: true },
      { nome: "ativo", rotulo: "Ativa", tipo: "checkbox", valor: d.cob ? !!d.ativo : true }],
    aoConfirmar: async (v) => { await rpc("clube_admin_cobertura_salvar", { p_prefixo: v.prefixo, p_descricao: v.desc, p_ativo: v.ativo }); toast("Região salva"); entrega(); },
  }));
}

/* ---------- Pendências ---------- */
async function pendencias() {
  const [exc, eventosStripe, faturas, bloqueados] = await Promise.all([
    q(sb.from("clube_excecoes").select("*").eq("status", "aberta").order("criado_em", { ascending: false }).limit(200)),
    q(sb.from("clube_stripe_eventos").select("*").in("status", ["erro", "recebido", "processando"]).order("recebido_em").limit(100)),
    q(sb.from("clube_faturas").select("*, perfil:clube_perfis(nome), periodos:clube_periodos(id)").eq("status", "paid").eq("elegivel", false)
      .not("classificacao", "in", "(avulsa,pendente)").order("registrada_em", { ascending: false }).limit(100)),
    q(sb.from("clube_credito_lotes").select("*, perfil:clube_perfis(nome)").eq("bloqueado", true).limit(100)),
  ]);
  conteudo(`<div class="card"><div class="card-head"><div><h3>Exceções abertas (${exc.length})</h3><div class="sub">Situações que o sistema não resolve sozinho (reembolso de benefício já usado, disputas, ciclo sobreposto…).</div></div></div>
      ${tabela(["Quando", "Tipo", "Referência", "Detalhes", ""], exc.map((x) => `<tr><td>${dataHora(x.criado_em)}</td><td><b>${esc(x.tipo)}</b></td><td>${esc(x.referencia)}</td>
        <td style="white-space:normal"><code>${esc(JSON.stringify(x.detalhes))}</code></td><td><button class="btn btn-sm" data-resolver="${x.id}">Resolver</button></td></tr>`), "Nenhuma exceção aberta.")}</div>
    <div class="card mt"><div class="card-head"><div><h3>Faturas pagas sem benefício (${faturas.length})</h3><div class="sub">Concessão manual usa a mesma rotina do webhook: não duplica e respeita ciclos sobrepostos.</div></div></div>
      ${tabela(["Membro", "Fatura", "Classificação", ">Pago", ""], faturas.map((f) => `<tr><td>${esc(f.perfil?.nome)}</td><td>${esc(f.stripe_invoice_id)}<div class="hint">${f.periodo_inicio ? `${data(f.periodo_inicio)} a ${data(f.periodo_fim)}` : ""}</div></td>
        <td>${esc(f.classificacao)}<div class="hint">${esc(f.motivo ?? "")}</div></td><td class="num">${brl(f.valor_pago_centavos)}</td>
        <td>${!f.periodos?.length && f.plano_chave && f.periodo_inicio ? `<button class="btn btn-sm" data-conceder="${f.id}">Conceder ciclo</button>` : ""}</td></tr>`), "Nenhuma.")}</div>
    <div class="card mt"><div class="card-head"><div><h3>Webhooks não concluídos (${eventosStripe.length})</h3><div class="sub">O job reprocessa sozinho; use o botão para forçar agora.</div></div></div>
      ${tabela(["Recebido", "Evento", "Tentativas", "Último erro", ""], eventosStripe.map((ev) => `<tr><td>${dataHora(ev.recebido_em)}</td><td><b>${esc(ev.tipo)}</b><div class="hint">${esc(ev.id)}</div></td>
        <td>${ev.tentativas}</td><td style="white-space:normal">${esc(ev.ultimo_erro ?? "")}</td><td><button class="btn btn-sm" data-reprocessar="${esc(ev.id)}">Reprocessar</button></td></tr>`), "Tudo processado.")}</div>
    <div class="card mt"><div class="card-head"><h3>Créditos bloqueados (${bloqueados.length})</h3></div>
      ${tabela(["Membro", "Tipo", "Motivo", ">Disponível", ">Reservado", ""], bloqueados.map((l) => `<tr><td>${esc(l.perfil?.nome)}</td><td>${ROTULOS.credito[l.tipo]}</td><td>${esc(l.bloqueio_motivo)}</td>
        <td class="num">${brl(l.disponivel_centavos)}</td><td class="num">${brl(l.reservado_centavos)}</td>
        <td>${l.bloqueio_motivo !== "reembolso" ? `<button class="btn btn-sm" data-desbloquear="${l.id}">Desbloquear</button>` : ""}</td></tr>`), "Nenhum.")}</div>`);
  const comMotivo = (titulo, fn) => modal({ titulo, campos: [{ nome: "motivo", rotulo: "Motivo / resolução", tipo: "textarea", obrigatorio: true }], aoConfirmar: async (v) => { await fn(v.motivo); toast("Feito"); pendencias(); } });
  ligar("[data-resolver]", (d) => comMotivo("Resolver exceção", (m) => rpc("clube_admin_excecao_resolver", { p_id: d.resolver, p_resolucao: m })));
  ligar("[data-conceder]", (d) => comMotivo("Conceder ciclo manualmente", (m) => rpc("clube_admin_conceder_fatura", { p_fatura: d.conceder, p_motivo: m })));
  ligar("[data-desbloquear]", (d) => comMotivo("Desbloquear crédito", (m) => rpc("clube_admin_lote_desbloquear", { p_lote: d.desbloquear, p_motivo: m })));
  ligar("[data-reprocessar]", async (d, b) => {
    b.disabled = true;
    try { const r = await funcao("clube-admin", { acao: "reprocessar_evento", evento_id: d.reprocessar }); toast(`Resultado: ${r.resultado}`); pendencias(); }
    catch (e) { toast(mensagem(e)); b.disabled = false; }
  });
}

iniciar();
