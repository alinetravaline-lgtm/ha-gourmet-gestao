// Base compartilhada da LP, cadastro, área de membros e administração do Clube.
// Usa apenas a chave publicável; toda regra financeira e de autorização roda no banco/Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const cfg = window.HAG_CLUBE;
export const sb = createClient(cfg.supabaseUrl, cfg.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "hag-clube-auth" },
});

export const PLANOS = {
  ha_assinatura: { nome: "Assinatura HA Gourmet", preco: 4990 },
  ha_club: { nome: "HA Gourmet Club", preco: 9700 },
};

export const ROTULOS = {
  assinatura: {
    active: ["Ativa", "green"], past_due: ["Pagamento pendente", "red"], unpaid: ["Não paga", "red"],
    canceled: ["Cancelada", "gray"], incomplete: ["Aguardando pagamento", "yellow"],
    incomplete_expired: ["Pagamento não concluído", "gray"], trialing: ["Em teste", "yellow"], paused: ["Pausada", "gray"],
  },
  caixa: {
    aguardando_programacao: ["Aguardando programação", "gray"], em_preparo: ["Em preparo", "yellow"],
    enviada: ["Enviada / saiu para entrega", "gold"], entregue: ["Entregue", "green"], excecao: ["Em análise", "red"],
  },
  resgate: {
    reservado: ["Reservado: aguardando a loja", "yellow"], confirmado: ["Confirmado", "green"],
    cancelado: ["Cancelado", "gray"], expirado: ["Expirado", "gray"],
  },
  indicacao: {
    pendente: ["Aguardando 1º pagamento", "gray"], em_analise: ["Em análise pela loja", "yellow"],
    recompensada: ["R$ 5,00 creditado", "green"], inelegivel: ["Não elegível", "gray"],
    revertida: ["Revertida (pagamento estornado)", "red"], rejeitada: ["Não aprovada", "red"],
  },
  lancamento: {
    concessao: "Crédito concedido", reserva: "Reservado", liberacao: "Reserva devolvida", consumo: "Usado",
    expiracao: "Vencido", reversao: "Estornado",
  },
  credito: { club_monthly: "Crédito mensal do Club", referral: "Cashback de indicação" },
};
export const selo = (grupo, valor) => {
  const [texto, cor] = ROTULOS[grupo][valor] ?? [valor, "gray"];
  return `<span class="badge b-${cor}">${esc(texto)}</span>`;
};

const FUSO = "America/Sao_Paulo";
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const brl = (centavos) => ((centavos ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const data = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO }) : "—");
export const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" }) : "—");
// Data de nascimento é uma data civil (sem fuso): formatar sem converter.
export const dataCivil = (d) => (d ? d.split("-").reverse().join("/") : "—");
export const competencia = (c) => {
  if (!c) return "—";
  const [a, m] = c.split("-");
  return new Date(Date.UTC(+a, +m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
};
export const reaisParaCentavos = (txt) => {
  const s = String(txt ?? "").replace(/[R$\s.]/g, "").replace(",", ".");
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : NaN;
};

const MENSAGENS = {
  nao_autenticado: "Sua sessão expirou. Entre novamente.",
  acesso_negado: "Você não tem permissão para esta ação.",
  limite_excedido: "Muitas tentativas em pouco tempo. Aguarde alguns minutos.",
  perfil_incompleto: "Complete nome, telefone, data de nascimento e endereço em “Meus dados” antes de assinar.",
  regiao_nao_atendida: "Ainda não entregamos a caixa mensal no seu CEP. Fale com a loja ou conheça o HA Gourmet Club.",
  ja_assinante: "Você já tem uma assinatura. Para trocar de plano, fale com a loja.",
  em_andamento: "Já existe uma contratação em andamento. Aguarde alguns segundos e tente de novo.",
  plano_invalido: "Plano inválido.",
  sem_cliente_stripe: "Ainda não há cobrança vinculada à sua conta.",
  servico_nao_configurado: "Pagamentos ainda não configurados neste ambiente.",
  nome_invalido: "Informe o nome completo.",
  telefone_invalido: "Telefone inválido. Use DDD + número.",
  nascimento_invalido: "Data de nascimento inválida.",
  nascimento_bloqueado: "A data de nascimento já foi informada. Para corrigir, fale com a loja.",
  cep_invalido: "CEP inválido (8 números).",
  uf_invalida: "UF inválida (2 letras).",
  endereco_invalido: "Confira os campos do endereço.",
  valor_invalido: "Valor inválido.",
  descricao_invalida: "Descreva o que você quer comprar.",
  sem_beneficio: "Você não tem crédito disponível nem desconto vigente para usar agora.",
  saldo_alterado: "Seu saldo mudou durante a solicitação. Tente novamente.",
  resgate_inexistente: "Solicitação não encontrada.",
  evento_indisponivel: "Evento indisponível.",
  evento_encerrado: "Este evento já começou ou terminou.",
  evento_lotado: "Vagas esgotadas.",
  exclusivo_club: "Eventos presenciais são exclusivos do HA Gourmet Club com mensalidade em dia.",
  motivo_obrigatorio: "Informe o motivo (mínimo de 5 caracteres).",
  pagamento_complementar_obrigatorio: "Há valor a pagar: informe como o restante foi pago.",
  credito_bloqueado: "Crédito bloqueado por reembolso ou disputa. Analise a exceção antes de confirmar.",
  reserva_expirada: "A reserva venceu e o crédito foi devolvido. Peça uma nova solicitação.",
  presente_ja_registrado: "Presente de aniversário já registrado para este membro neste ano.",
  nascimento_ausente: "Membro sem data de nascimento cadastrada.",
  caixa_ja_enviada: "Caixa já enviada: o endereço histórico não pode ser trocado.",
  fatura_nao_elegivel: "Esta fatura não pode gerar benefício (não paga, reembolsada, em disputa ou incompleta).",
  periodo_sobreposto: "Já existe um ciclo pago sobreposto a este período.",
  lote_estornado: "Lote estornado por reembolso não pode ser desbloqueado.",
};

export function mensagem(e) {
  const codigo = typeof e === "string" ? e : e?.codigo || e?.message || "";
  return MENSAGENS[codigo] || (codigo && /^[a-z_]+$/.test(codigo) ? `Não foi possível concluir (${codigo}).` : "Não foi possível concluir. Tente novamente.");
}

export class ErroClube extends Error {
  constructor(codigo) {
    super(codigo);
    this.codigo = codigo;
  }
}

export async function rpc(nome, args = {}) {
  const { data: d, error } = await sb.rpc(nome, args);
  if (error) throw new ErroClube(error.message);
  return d;
}

export async function funcao(nome, corpo = {}) {
  const { data: d, error } = await sb.functions.invoke(nome, { body: corpo });
  if (error) {
    let codigo = "erro_interno";
    try { codigo = (await error.context.json()).erro || codigo; } catch { /* resposta sem corpo JSON */ }
    throw new ErroClube(codigo);
  }
  return d;
}

export async function sessaoAtual() {
  const { data: d } = await sb.auth.getSession();
  return d.session;
}

export function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Código vindo do link (?ref=) só pré-preenche o cadastro; a validação e a atribuição acontecem no servidor.
export function guardarRefDaUrl() {
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref && /^[A-Za-z0-9]{8}$/.test(ref)) sessionStorage.setItem("hag_ref", ref.toUpperCase());
  return sessionStorage.getItem("hag_ref");
}

/** Modal simples com formulário. campos: [{ nome, rotulo, tipo, valor, opcoes, obrigatorio, dica, cheio }] */
export function modal({ titulo, texto = "", campos = [], botao = "Confirmar", perigo = false, aoConfirmar }) {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  const campo = (c) => {
    const id = `m_${c.nome}`;
    const attrs = `id="${id}" name="${c.nome}" ${c.obrigatorio ? "required" : ""}`;
    let input;
    if (c.tipo === "select") {
      input = `<select ${attrs}>${c.opcoes.map(([v, r]) => `<option value="${esc(v)}" ${v === c.valor ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>`;
    } else if (c.tipo === "textarea") {
      input = `<textarea class="campo" rows="3" ${attrs}>${esc(c.valor ?? "")}</textarea>`;
    } else if (c.tipo === "checkbox") {
      input = `<input type="checkbox" ${attrs} ${c.valor ? "checked" : ""} style="width:auto" />`;
    } else {
      input = `<input type="${c.tipo || "text"}" ${attrs} value="${esc(c.valor ?? "")}" ${c.tipo === "number" ? 'step="any"' : ""} />`;
    }
    return `<label class="${c.cheio === false ? "" : "full"}">${esc(c.rotulo)}${input}${c.dica ? `<span class="hint">${esc(c.dica)}</span>` : ""}</label>`;
  };
  bg.innerHTML = `<form class="modal" novalidate>
    <div class="modal-head"><h3>${esc(titulo)}</h3><button type="button" class="btn btn-ghost" data-fechar>✕</button></div>
    <div class="modal-body">${texto ? `<p class="full hint" style="margin:0">${texto}</p>` : ""}${campos.map(campo).join("")}
      <div class="full aviso erro" data-erro hidden></div></div>
    <div class="modal-foot"><button type="button" class="btn" data-fechar>Voltar</button>
      <button type="submit" class="btn ${perigo ? "btn-danger" : "btn-primary"}">${esc(botao)}</button></div></form>`;
  const fechar = () => bg.remove();
  bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-fechar]")) fechar(); });
  const form = bg.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valores = {};
    for (const c of campos) {
      const el = form.elements[c.nome];
      valores[c.nome] = c.tipo === "checkbox" ? el.checked : el.value.trim();
      if (c.obrigatorio && valores[c.nome] === "") {
        const aviso = form.querySelector("[data-erro]");
        aviso.textContent = `Preencha: ${c.rotulo}`;
        aviso.hidden = false;
        return;
      }
    }
    const botaoEl = form.querySelector('button[type="submit"]');
    botaoEl.disabled = true;
    try {
      await aoConfirmar(valores);
      fechar();
    } catch (err) {
      const aviso = form.querySelector("[data-erro]");
      aviso.textContent = mensagem(err);
      aviso.hidden = false;
      botaoEl.disabled = false;
    }
  });
  document.body.appendChild(bg);
  form.querySelector("input, select, textarea")?.focus();
}

// Raiz do site relativa à página atual (mesma convenção do app de gestão), para funcionar em subpasta.
export const BASE = window.HAG_BASE || "../";
export const urlSite = (caminho) => new URL(BASE + caminho, location.href).href;

export function topo(atual) {
  const link = (caminho, texto, extra = "") =>
    `<a href="${BASE}${caminho}" ${extra}>${texto}</a>`;
  return `<header class="cl-top">
    <a href="${BASE}clube/" class="brand"><div class="brand-logo">H&amp;A</div><div><div class="brand-name">HA Gourmet</div><div class="brand-sub">Assinaturas</div></div></a>
    <nav>${link("clube/#planos", "Planos")}${link("membros/", "Área do membro", atual === "membros" ? 'aria-current="page"' : "")}${
      atual === "lp" ? link("cadastro/", "Assinar", 'class="cta"') : ""}</nav>
  </header>`;
}
