/* ================= HA Gourmet · Plataforma de Gestão ================= */
const STORE_KEY = "hagourmet_gestao_v1";
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CANAIS_VENDA = ["Outbound", "iFood", "Revenda", "Encomenda"];
const CORES = { Outbound: "#306c62", iFood: "#d24b4b", Revenda: "#c5a059", Encomenda: "#3c78c8", "Paçoca": "#2f9e6b" };

const $ = (s) => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0);
const parseNum = (v) => {
  if (typeof v === "number") return v;
  let s = String(v || "").replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const brl = (v) => (v < 0 ? "-" : "") + "R$ " + Math.abs(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlU = (v) => "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: v < 0.1 ? 4 : 2 });
const pct = (v) => (isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
const int = (v) => Math.round(v || 0).toLocaleString("pt-BR");
const ddmm = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const monthOf = (iso) => +iso.slice(5, 7);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- Ícones ---------- */
const ICONS = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  pkg: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
  pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  clip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  gear: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;

/* ---------- Dados ---------- */
function linkReceitas(insumos) {
  const s = JSON.parse(JSON.stringify(SEED));
  const link = (nome) => { const ins = insumos.find((i) => i.nome === nome); return ins ? { insumoId: ins.id } : { nome }; };
  return {
    sabores: s.sabores.map((sb) => ({
      nome: sb.nome,
      rend: sb.rend,
      lote: sb.lote.map(([n, q]) => ({ ...link(n), qtd: q })),
      porUn: sb.porUn.map(([n, q]) => ({ ...link(n), qtd: q })),
    })),
    barras: s.barras.map((b) => ({
      nome: b.nome,
      linha: s.barrasTrufadas.includes(b.nome) ? "trufada" : "gourmet",
      itens: b.itens.map(([n, q, unid, valorUnit]) => (unid ? { nome: n, qtd: q, unid, valorUnit } : { ...link(n), qtd: q })),
    })),
  };
}
function buildSeed() {
  const s = JSON.parse(JSON.stringify(SEED));
  const item = ([nome, custo, rend, unid]) => ({ id: uid(), nome, custo, rend, unid });
  const produtos = s.produtos.map((p) => ({ id: uid(), ...p }));
  const qtdInicial = {};
  const pre = { "Outbound|Caixa Copinho 4un": 20, "Outbound|Caixa Copinho 9un": 100, "Revenda|Caixa Bolinha 9un": 30, "Revenda|Copinho unidade": 20 };
  produtos.forEach((p) => { if (pre[p.canal + "|" + p.nome]) qtdInicial[p.id] = pre[p.canal + "|" + p.nome]; });
  const insumos = s.insumos.map(item);
  return {
    config: s.config,
    insumos,
    ...linkReceitas(insumos),
    materiais: s.materiais.map(item),
    variaveis: s.variaveis.map(item),
    embalagens: s.embalagens.map((e) => ({ id: uid(), nome: e.nome, uso: e.uso, itens: e.itens.map(([material, qtd]) => ({ material, qtd })) })),
    formatos: s.formatos,
    canais: s.canais,
    params: s.params,
    produtos,
    vendas: s.vendas.map((v) => ({ id: uid(), ...v })),
    pacoca: s.pacoca.map(([data, qtd, pix, especie, insumos, gasolina, maoObra]) => ({ id: uid(), data, qtd, pix, especie, insumos, gasolina, maoObra })),
    fixos: [
      { id: uid(), nome: "Pró-labore", valor: 0 },
      { id: uid(), nome: "Marketing", valor: 0 },
      { id: uid(), nome: "INSS", valor: 0 },
      { id: uid(), nome: "Emissão de NF-e", valor: 0 },
      { id: uid(), nome: "Telefonia / Internet", valor: 0 },
    ],
    sim: { canal: "Outbound", semanas: 4, qtd: qtdInicial, fixos: { Gasolina: 107.4, "Comissão vendedor": 0, "Alimentação vendedor": 0, Marketing: 0, "Pró-labore": 0 } },
    pacocaCusto: s.pacocaCusto.map(([nome, valor]) => ({ id: uid(), nome, valor })),
    pacocaCompra: s.pacocaCompra.map(([nome, qtd, valor]) => ({ id: uid(), nome, qtd, valor })),
    pacocaSim: s.pacocaSim,
    receitasVistas: true,
    caixasVistas: true,
    cxHistVistas: true,
    caixas: s.caixas,
    fixosPacoca: [
      { id: uid(), nome: "Pró-labore (paçoca)", valor: 0 },
      { id: uid(), nome: "Marketing (paçoca)", valor: 0 },
    ],
    projecao: { doces: { caixasFds: 80, pctG: 70, fds: 4, mix: {} } },
    pagamentos: [],
    contasIgnoradas: [],
    contasAutoV1: true,
    impostoPacV1: true,
    impGeraisV1: true,
    dupImpV1: true,
    vencImpV1: true,
    impostosGerais: { dasPct: 4.5, dasDia: 20, fixos: [{ id: uid(), nome: "DARF", valor: 178.3, dia: 20, mesSeguinte: true }, { id: uid(), nome: "Contabilidade", valor: 350, dia: 30 }] },
    darfMesSeguinteV1: true,
    custosVar: [],
    estoque: {
      saldos: {},
      movs: [],
      pacocaItens: [
        { id: uid(), nome: "Paçoquita", unid: "un", consumo: 6, custo: 20 / 112, pacote: 112, imposto: 2, usaPacote: true },
        { id: uid(), nome: "Saquinho", unid: "un", consumo: 1, custo: 0.05, pacote: 1 },
        { id: uid(), nome: "Papel", unid: "folha", consumo: 1, custo: 0.03, pacote: 1 },
        { id: uid(), nome: "Fita durex", unid: "rolo", consumo: 0, custo: 3.64, pacote: 1 },
      ],
    },
    vendedor: {
      tipos: s.vendedor.tipos,
      combos: {
        doces: s.vendedor.combos.doces.map((c) => ({ id: uid(), ...c })),
        pacoca: s.vendedor.combos.pacoca.map((c) => ({ id: uid(), ...c })),
      },
      pag: { doces: "pix", pacoca: "pix" },
      registros: [],
    },
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrar(JSON.parse(raw));
  } catch (e) { /* dados corrompidos */ }
  return buildSeed();
}
// Completa dados salvos por versões anteriores da plataforma
function migrar(data) {
  const seed = buildSeed();
  // Receitas e insumos acrescentados depois (Café, Beijinho, Ganache, Essência de coco)
  if (!data.receitasVistas && data.insumos && data.sabores?.[0]?.lote) {
    seed.insumos.forEach((si) => { if (!data.insumos.some((i) => i.nome === si.nome)) data.insumos.push(si); });
    linkReceitas(data.insumos).sabores.forEach((s) => { if (!data.sabores.some((x) => x.nome === s.nome)) data.sabores.push(s); });
    data.receitasVistas = true;
  }
  // Composição das caixas: massa das caixas passa a vir dos docinhos de cada caixa
  if (!data.caixasVistas && data.sabores?.[0]?.lote) {
    data.sabores.forEach((s) => { if (["Café", "Beijinho"].includes(s.nome) && !+s.rend[3] && +s.rend[4] === 83) s.rend[3] = 71; });
    (data.params || []).forEach((p) => {
      if (p.key === "massaBol4" && p.fonte?.tipo === "receita") p.fonte = { tipo: "caixa", key: "P" };
      if (p.key === "massaBol9" && p.fonte?.tipo === "receita") p.fonte = { tipo: "caixa", key: "G" };
    });
    data.caixasVistas = true;
  }
  // Caixas P/G por semana vindas dos comentários da planilha (HISTÓRICO FATURAMENTO)
  if (!data.cxHistVistas && Array.isArray(data.vendas)) {
    seed.vendas.filter((s) => "cxP" in s).forEach((s) => {
      const v = data.vendas.find((x) => x.canal === s.canal && x.inicio === s.inicio);
      if (v && !("cxP" in v)) Object.assign(v, { cxP: s.cxP, cxG: s.cxG, detalheCx: s.detalheCx });
    });
    data.cxHistVistas = true;
  }
  // Contas a pagar passam a ser geradas sozinhas, por lançamento: saem as contas mensais em aberto do gerador antigo
  if (!data.contasAutoV1) {
    data.pagamentos = (data.pagamentos || []).filter((p) => p.pago || !String(p.ref || "").startsWith("auto:"));
    if (Array.isArray(data.fixos)) {
      if (!data.fixos.some((f) => /inss/i.test(f.nome))) data.fixos.push({ id: uid(), nome: "INSS", valor: 0 });
      if (!data.fixos.some((f) => /nf-?e|nota fiscal/i.test(f.nome))) data.fixos.push({ id: uid(), nome: "Emissão de NF-e", valor: 0 });
    }
    data.contasAutoV1 = true;
  }
  // Imposto da NF-e da paçoquita sai do custo da caixa (R$ 22 = R$ 20 + R$ 2) e da despesa fixa "NF-e", e vira uma linha própria
  if (!data.impostoPacV1 && data.estoque?.pacocaItens) {
    const pq = data.estoque.pacocaItens.find((i) => /pa[çc]oquita/i.test(i.nome));
    if (pq && !("imposto" in pq)) {
      const caixa = (+pq.custo || 0) * (+pq.pacote || 1);
      if (Math.abs(caixa - 22) < 0.06) Object.assign(pq, { custo: 20 / (+pq.pacote || 112), imposto: 2 });
      else if (+pq.pacote === 1 && Math.abs(+pq.custo - 0.1783) < 0.001) Object.assign(pq, { custo: 20 / 112, pacote: 112, imposto: 2 });
      if (+pq.imposto) data.fixosPacoca = (data.fixosPacoca || []).filter((f) => !/^\s*(imposto\s*)?nf-?e\s*$/i.test(f.nome));
    }
    data.impostoPacV1 = true;
  }
  // DAS, DARF e contabilidade passam a ser do negócio todo (DRE unificado); a contabilidade sai das despesas fixas dos doces
  if (!data.impGeraisV1) {
    const contab = (data.fixos || []).find((f) => /contab|contador/i.test(f.nome));
    data.fixos = (data.fixos || []).filter((f) => f !== contab);
    data.impostosGerais = data.impostosGerais || { dasPct: 4.5, dasDia: 20, fixos: [{ id: uid(), nome: "DARF", valor: 178.3, dia: 20 }, { id: uid(), nome: "Contabilidade", valor: +contab?.valor || 350, dia: 10 }] };
    data.impGeraisV1 = true;
  }
  if (!data.darfMesSeguinteV1) {
    (data.impostosGerais?.fixos || []).forEach((f) => { if (/darf/i.test(f.nome) && !("mesSeguinte" in f)) f.mesSeguinte = true; });
    data.darfMesSeguinteV1 = true;
  }
  if (data.estoque?.coberturaPac && !("semanas" in data.estoque.coberturaPac)) { delete data.estoque.coberturaPac.dias; data.estoque.coberturaPac.semanas = 2; }
  // DARF, DAS e contabilidade são do negócio todo: saem das despesas fixas das áreas para não contar duas vezes
  if (!data.dupImpV1 && data.impostosGerais) {
    const repetido = (f) => /darf|contab|contador|^\s*das\b/i.test(f.nome);
    const removidos = [...(data.fixos || []), ...(data.fixosPacoca || [])].filter(repetido).map((f) => f.id);
    data.fixos = (data.fixos || []).filter((f) => !repetido(f));
    data.fixosPacoca = (data.fixosPacoca || []).filter((f) => !repetido(f));
    data.pagamentos = (data.pagamentos || []).filter((p) => p.pago || !removidos.some((id) => String(p.auto || "").startsWith(`fixo:${id}:`) || String(p.auto || "").startsWith(`fixopac:${id}:`)));
    data.dupImpV1 = true;
  }
  // "Taxa NF-e" cadastrada como insumo à parte vira o imposto da paçoquita (mesmo custo por pacote, mas aparece como imposto)
  if (!data.nfeItemV1 && data.estoque?.pacocaItens) {
    const itens = data.estoque.pacocaItens, pq = itens.find((i) => i.usaPacote), taxa = itens.find((i) => !i.usaPacote && /nf-?e|nota fiscal/i.test(i.nome));
    if (pq && taxa && !+pq.imposto) {
      const porPac = +data.pacocaSim?.porPacote || 1, usoTaxa = taxa.usaPacote ? porPac : +taxa.consumo || 0, usoPq = porPac;
      const impostoPorPacote = usoTaxa * (+taxa.custo || 0);
      if (impostoPorPacote > 0) { pq.imposto = round2((impostoPorPacote * (+pq.pacote || 1)) / usoPq); data.estoque.pacocaItens = itens.filter((i) => i !== taxa); }
    }
    data.nfeItemV1 = true;
  }
  if (!data.vencImpV1 && data.impostosGerais?.fixos) {
    data.impostosGerais.fixos.forEach((f) => {
      if (/darf/i.test(f.nome)) Object.assign(f, { dia: 20, mesSeguinte: true });
      if (/contab|contador/i.test(f.nome)) Object.assign(f, { dia: 30, mesSeguinte: false });
    });
    data.vencImpV1 = true;
  }
  if (!Array.isArray(data.perdas)) data.perdas = [];
  if (data.pacocaSim && !data.pacocaSim.fixos) data.pacocaSim.fixos = { "Comissão vendedor": 0, "Alimentação vendedor": 0, Marketing: 0 };
  if (data.pacocaSim?.fixos && !data.pacSimDiaV1) {
    Object.keys(data.pacocaSim.fixos).forEach((k) => { data.pacocaSim.fixos[k] = Math.round(((+data.pacocaSim.fixos[k] || 0) / 6) * 100) / 100; });
    data.pacSimDiaV1 = true;
  }
  Object.keys(seed).forEach((k) => { if (!(k in data)) data[k] = seed[k]; });
  data.vendedor.registros = data.vendedor.registros || [];
  (data.pagamentos || []).forEach((p) => { if (p.categoria === "Fornecedor / insumos") p.categoria = "Insumos"; });
  // Paçoca vendida em pacotes: a paçoquita passa a ser contada em unidades (6 por pacote)
  if (data.pacocaSim && !("porPacote" in data.pacocaSim)) data.pacocaSim.porPacote = 6;
  if (data.pacocaSim && +data.pacocaSim.naoRecPct === 16.7) data.pacocaSim.naoRecPct = 20;
  (data.estoque?.pacocaItens || []).forEach((i) => {
    if (i.nome === "Paçoquita" && !("usaPacote" in i)) { i.usaPacote = true; if (+i.custo === 1.07) i.custo = 0.1783; }
  });
  const nomesItensPac = (data.estoque?.pacocaItens || []).map((i) => i.nome);
  if (data.pacocaCusto && nomesItensPac.length) data.pacocaCusto = data.pacocaCusto.filter((c) => !nomesItensPac.includes(c.nome));
  (data.vendedor?.tipos?.pacoca || []).forEach((t) => { if (t.key === "U" && t.nome === "Paçoca") { t.nome = "Pacote de paçoca"; t.desc = "pacote c/ 6"; } });
  if (!data.sabores?.[0]?.lote || !data.barras?.[0]?.itens) Object.assign(data, linkReceitas(data.insumos));
  Object.entries(seed.canais).forEach(([k, c]) => { if (data.canais[k] && !data.canais[k].taxas) data.canais[k].taxas = c.taxas; });
  const nomesAntigos = { Pequena: "Cx P", Grande: "Cx G", "1 Pequena": "1 Cx P", "2 Pequenas": "2 Cx P", "1 Grande": "1 Cx G" };
  data.vendedor.tipos.doces.forEach((t) => { if (nomesAntigos[t.nome]) t.nome = nomesAntigos[t.nome]; });
  data.vendedor.combos.doces.forEach((c) => { if (nomesAntigos[c.nome]) c.nome = nomesAntigos[c.nome]; });
  data.vendedor.combos.pacoca = data.vendedor.combos.pacoca.filter((c) => !(c.nome === "1 Paçoca" && c.itens.U === 1));
  // Kits antigos tinham valores fixos; agora cada item aponta para um material da tela Insumos
  if (Array.isArray(data.embalagens?.[0]?.itens?.[0])) data.embalagens = seed.embalagens;
  seed.params.forEach((sp) => {
    const p = data.params.find((x) => x.key === sp.key);
    if (!p) data.params.push(sp);
    else if (sp.fonte && !("fonte" in p)) p.fonte = sp.fonte;
  });
  data.barras.forEach((b) => { if (!b.linha) b.linha = SEED.barrasTrufadas.includes(b.nome) ? "trufada" : "gourmet"; });
  data.params.forEach((p) => { if (p.fonte?.tipo === "barra" && p.fonte.criterio !== "barra" && !p.fonte.linha) p.fonte.linha = "gourmet"; });
  data.variaveis.forEach((v) => { if (/^Mão-de-obra Cx[49]$/.test(v.nome) && +v.custo === 600 && +v.rend === 1000) v.rend = 1200; });
  data.produtos.forEach((p) => (p.itens || []).forEach((i) => {
    if (i.regra?.formato === "Bolinha") { delete i.regra; i.param = "massaBol4"; i.nome = "Massa bolinha"; }
  }));
  const ligado = (p) => p.itens?.some((i) => i.param || i.kit || i.material);
  data.produtos.forEach((p) => {
    const s = seed.produtos.find((x) => x.canal === p.canal && x.nome === p.nome);
    if (s && !ligado(p)) { p.itens = s.itens; delete p.custoFixo; delete p.taxaPct; }
  });
  return data;
}
const salvarLocal = () => localStorage.setItem(STORE_KEY, JSON.stringify(db));
// Estado compartilhado na nuvem; as vendas do vendedor sincronizam uma a uma (ver Sync.putRegistro)
const estadoSemRegistros = () => ({ ...db, vendedor: { ...db.vendedor, registros: [] } });
function save() {
  resetCarga();
  if (typeof sincronizarContasAuto === "function") sincronizarContasAuto();
  salvarLocal();
  if (typeof Sync !== "undefined") Sync.saveEstado(estadoSemRegistros());
}
let db = load();

const ui = { mes: 0, vendasCanal: "Todos", vendasMes: 0, pacMes: null, prodCanal: "Outbound", insTab: "insumos", busca: "", recTab: "doces", sabor: 0, barra: 0, dreMes: 0, pgTipo: "pagar", pgStatus: "pendente", pgMes: 0, estTab: { doces: "prontos", pacoca: "itens" }, estSoAlerta: false, dreMesPac: 0 };

/* ---------- Cálculos ---------- */
const recVenda = (v) => (+v.cartao || 0) + (+v.pix || 0) + (+v.especie || 0);
const custoVenda = (v) => (+v.insumos || 0) + (+v.gasolina || 0) + (+v.comissoes || 0) + (+v.perdas || 0) + (+v.outros || 0);
const lucroVenda = (v) => recVenda(v) - custoVenda(v);
// Custo de um pacote = insumos da paçoca (uso por pacote × custo unitário) + outros custos por pacote (ex.: mão de obra)
const custoInsumosPacote = () => sum(db.estoque?.pacocaItens || [], (i) => consumoPacote(i) * (+i.custo || 0));
// Imposto / taxa de NF-e pago junto com a compra do insumo (R$ por embalagem), separado do custo para aparecer no DRE
const impostoUnitItem = (i) => (+i.imposto || 0) / (+i.pacote || 1);
const impostoPacote = () => sum(db.estoque?.pacocaItens || [], (i) => consumoPacote(i) * impostoUnitItem(i));
// Impostos e contabilidade "derretidos" no pacote: carga % sobre o que de fato é recebido (preço − não recebido)
const impostoVendaPacote = () => (+db.config.precoPacoca || 0) * (1 - naoRecPctPacoca() / 100) * cargaImpostosPct("pacoca") / 100;
const custoUnitPacoca = () => custoInsumosPacote() + impostoPacote() + impostoVendaPacote() + sum(db.pacocaCusto, (c) => +c.valor || 0);
const areaCV = (c) => c.area || "doces";
// Pix confiança: parte do valor entregue não é paga; a margem da paçoca já desconta esse percentual
const naoRecPctPacoca = () => +db.pacocaSim?.naoRecPct || 0;
const lucroPacoca = (preco, pacotes = 1) => preco * (1 - naoRecPctPacoca() / 100) - custoUnitPacoca() * pacotes;
const recPac = (p) => (+p.pix || 0) + (+p.especie || 0);
// Registros antigos (planilha) têm o imposto dentro de "insumos"; os novos guardam o imposto à parte
const impostoReg = (p) => ("imposto" in p ? +p.imposto || 0 : Math.min(+p.insumos || 0, (+p.qtd || 0) * impostoPacote()));
const insumosReg = (p) => ("imposto" in p ? +p.insumos || 0 : (+p.insumos || 0) - impostoReg(p));
const custoPac = (p) => (+p.insumos || 0) + (+p.imposto || 0) + (+p.gasolina || 0) + (+p.maoObra || 0);
const lucroPac = (p) => recPac(p) - custoPac(p);
const esperadoPac = (p) => (+p.qtd || 0) * db.config.precoPacoca;
const naoRecPac = (p) => esperadoPac(p) - recPac(p);

const insById = (id) => db.insumos.find((i) => i.id === id);
const custoUnitItem = (it) => { const ins = it.insumoId && insById(it.insumoId); return ins ? (ins.rend ? ins.custo / ins.rend : 0) : +it.valorUnit || 0; };
const nomeItem = (it) => (it.insumoId && insById(it.insumoId)?.nome) || it.nome || "Item removido";
const unidItem = (it) => (it.insumoId && insById(it.insumoId)?.unid) || it.unid || "";
const custoLote = (s) => sum(s.lote, (it) => (+it.qtd || 0) * custoUnitItem(it));
const custoSabor = (s, j) => (s.rend[j] ? custoLote(s) / s.rend[j] : 0) + sum(s.porUn, (it) => (+it.qtd[j] || 0) * custoUnitItem(it));
const custoBarra = (b) => sum(b.itens, (it) => (+it.qtd || 0) * custoUnitItem(it));
// Arredondado ao centavo, como aparece na ficha técnica
function massaMax(regra) {
  const i = db.formatos.findIndex((f) => f.nome === regra.formato);
  const vals = db.sabores.filter((s) => !(regra.ignorar || []).includes(s.nome) && +s.rend[i] > 0).map((s) => custoSabor(s, i));
  return vals.length ? Math.round(Math.max(...vals) * 100) / 100 : 0;
}
const materialUnit = (nome) => { const m = db.materiais.find((x) => x.nome === nome); return m && m.rend ? m.custo / m.rend : 0; };
const kitItemValor = (i) => (+i.qtd || 0) * materialUnit(i.material);
const kitTotal = (nome) => { const k = db.embalagens.find((e) => e.nome === nome); return k ? sum(k.itens, kitItemValor) : 0; };
const round2 = (v) => Math.round(v * 100) / 100;
// Valor de um custo padrão a partir da tela de origem (arredondado ao centavo, como aparece nas fichas)
// Composição das caixas (docinhos por sabor)
const caixaDe = (key) => db.caixas?.[key] || { formato: "Bolinha", itens: {} };
const unidadesCaixa = (key) => sum(Object.values(caixaDe(key).itens), (q) => +q || 0);
function custoMassaCaixa(key) {
  const c = caixaDe(key), j = db.formatos.findIndex((f) => f.nome === c.formato);
  return sum(Object.entries(c.itens), ([nome, q]) => { const s = db.sabores.find((x) => x.nome === nome); return s && +q ? +q * custoSabor(s, j) : 0; });
}
const nomeCurto = (n) => n.replace(/^Mousse de /, "").replace(/^Brigadeiro de /, "");
const composicaoTxt = (key) => Object.entries(caixaDe(key).itens).filter(([, q]) => +q).map(([n, q]) => (+q > 1 ? `${q}× ${nomeCurto(n)}` : nomeCurto(n))).join(", ");
function valorFonte(f) {
  if (f.tipo === "caixa") { const u = unidadesCaixa(f.key); return u ? round2(custoMassaCaixa(f.key) / u) : 0; }
  if (f.tipo === "variavel") { const v = db.variaveis.find((x) => x.nome === f.nome); return v && v.rend ? v.custo / v.rend : 0; }
  let vals = [];
  if (f.tipo === "receita") {
    const j = db.formatos.findIndex((x) => x.nome === f.formato);
    const sabs = (f.criterio === "sabor" ? db.sabores.filter((s) => s.nome === f.sabor) : db.sabores.filter((s) => !(f.ignorar || []).includes(s.nome))).filter((s) => +s.rend[j] > 0);
    vals = sabs.map((s) => custoSabor(s, j));
  }
  if (f.tipo === "barra") {
    const bs = f.criterio === "barra" ? db.barras.filter((b) => b.nome === f.barra) : db.barras.filter((b) => !f.linha || b.linha === f.linha);
    vals = bs.map(custoBarra);
  }
  if (!vals.length) return 0;
  return round2(f.criterio === "media" ? sum(vals) / vals.length : Math.max(...vals));
}
function paramVal(key) {
  const p = db.params.find((x) => x.key === key);
  return p ? (p.fonte ? valorFonte(p.fonte) : +p.valor || 0) : 0;
}
function descFonte(f) {
  if (!f) return "Valor digitado";
  if (f.tipo === "caixa") return `Composição da ${tiposArea("doces").find((t) => t.key === f.key)?.nome || "caixa"} (média por doce)`;
  if (f.tipo === "variavel") return `Insumos › Custos variáveis: ${f.nome}`;
  if (f.tipo === "receita") return f.criterio === "sabor" ? `Ficha: ${f.sabor} (${f.formato.toLowerCase()})` : `Fichas: ${f.criterio === "media" ? "média" : "maior custo"} de ${f.formato.toLowerCase()}${f.ignorar?.length ? ` (sem ${f.ignorar.join(", ")})` : ""}`;
  if (f.tipo === "barra") return f.criterio === "barra" ? `Ficha: barra ${f.barra}` : `Fichas: ${f.criterio === "media" ? "média" : "maior custo"} das barras${f.linha ? ` ${f.linha === "gourmet" ? "gourmet" : "trufadas"}` : ""}`;
  return "";
}
function valorItem(it) {
  if (it.regra) return massaMax(it.regra);
  if (it.param) return paramVal(it.param);
  if (it.kit) return kitTotal(it.kit);
  if (it.material) return materialUnit(it.material);
  return +it.valor || 0;
}
// Onde o valor do item é alterado (null = valor próprio do produto)
function fonteItem(it) {
  if (it.regra) return { tag: "regra", onde: "Fichas Técnicas (maior custo de massa)", href: "receitas" };
  if (it.param) {
    const f = db.params.find((x) => x.key === it.param)?.fonte;
    if (f?.tipo === "caixa") return { tag: "caixa", onde: `${descFonte(f)}: ${composicaoTxt(f.key)}`, href: "receitas" };
    if (f?.tipo === "receita" || f?.tipo === "barra") return { tag: "ficha", onde: descFonte(f), href: "receitas" };
    if (f?.tipo === "variavel") return { tag: "insumo", onde: descFonte(f), href: "insumos" };
    return { tag: "padrão", onde: "Personalizar custos", href: "personalizar" };
  }
  if (it.kit) return { tag: "kit", onde: `Embalagens (kit ${it.kit})`, href: "embalagens" };
  if (it.material) return { tag: "insumo", onde: "Insumos > Embalagens & materiais", href: "insumos" };
  return null;
}
const custoBase = (p) => (p.itens ? sum(p.itens, (it) => (+it.qtd || 0) * valorItem(it)) : +p.custoFixo || 0);
const taxaCanal = (canal) => sum(db.canais[canal]?.taxas || [], (t) => +t.pct || 0);
const custoProd = (p) => custoBase(p) + (p.preco * (taxaCanal(p.canal) + cargaImpostosPct("doces"))) / 100;
const lucroProd = (p) => p.preco - custoProd(p);
const margemProd = (p) => (p.preco ? (lucroProd(p) / p.preco) * 100 : 0);
const precoAlvo = (p, alvo) => { const d = 1 - (taxaCanal(p.canal) + cargaImpostosPct("doces")) / 100 - alvo / 100; return d > 0 ? custoBase(p) / d : null; };
/* ---------- Impostos do negócio todo (DAS, DARF, contabilidade) ---------- */
// Calculados sobre doces + paçoca juntos. Cada área recebe a sua parte: o DAS sobre o próprio faturamento e
// os valores fixos (DARF, contabilidade) numa divisão fixa (padrão 50/50) ou pela participação no faturamento do mês.
const impGerais = () => db.impostosGerais || { dasPct: 0, fixos: [] };
const dasPct = () => +impGerais().dasPct || 0;
const fixosGeraisTot = () => sum(impGerais().fixos || [], (f) => +f.valor || 0);
const rateioPorFaturamento = () => impGerais().rateioModo === "faturamento";
const pctFixosDoces = () => (impGerais().rateioDoces ?? 50);
// Fração dos valores fixos que cabe à área (m = 0: ano todo)
function shareFixos(m, area) {
  if (!area) return 1;
  if (!rateioPorFaturamento()) return (area === "doces" ? pctFixosDoces() : 100 - pctFixosDoces()) / 100;
  const rT = resumo(m).receita;
  return rT ? resumo(m, area).receita / rT : 0;
}
function rateioImpostos(m, area) {
  const fixos = impGerais().fixos || [];
  if (!m) {
    const partes = mesesComDados().map((x) => rateioImpostos(x, area));
    const itens = fixos.map((f, i) => ({ nome: f.nome, valor: sum(partes, (p) => p.itens[i].valor) }));
    const das = sum(partes, (p) => p.das), tf = sum(itens, (x) => x.valor);
    return { das, itens, fixos: tf, total: das + tf, share: shareFixos(0, area) };
  }
  const rT = resumo(m).receita, rA = area ? resumo(m, area).receita : rT;
  const share = shareFixos(m, area);
  const itens = fixos.map((f) => ({ nome: f.nome, valor: (+f.valor || 0) * share }));
  const das = (rA * dasPct()) / 100, tf = sum(itens, (x) => x.valor);
  return { das, itens, fixos: tf, total: das + tf, share };
}
// Faturamento médio (da área ou do negócio) nos últimos 3 meses com vendas: base para "derreter" os fixos no preço
function faturamentoMedioMensal(area) {
  const ms = mesesComDados(area).filter((m) => resumo(m, area).receita > 0).slice(-3);
  return ms.length ? sum(ms, (m) => resumo(m, area).receita) / ms.length : 0;
}
// Parte mensal dos fixos (DARF, contabilidade) que a área precisa cobrir
const fixosMesArea = (area) => fixosGeraisTot() * (rateioPorFaturamento() && area ? (faturamentoMedioMensal() ? faturamentoMedioMensal(area) / faturamentoMedioMensal() : 0) : shareFixos(0, area));
var cacheCarga = {};
function resetCarga() { cacheCarga = {}; }
// % do preço de venda que vai para impostos e contabilidade: DAS + parte da área nos fixos ÷ faturamento médio da área
function cargaImpostosPct(area) {
  const k = area || "todos";
  if (!(k in cacheCarga)) { const fat = faturamentoMedioMensal(area); cacheCarga[k] = dasPct() + (fat ? (fixosMesArea(area) / fat) * 100 : 0); }
  return cacheCarga[k];
}
const cargaFixosPct = (area) => cargaImpostosPct(area) - dasPct();
function statusMargem(m, canal) {
  const c = db.canais[canal] || { alvoMin: 30 };
  if (m >= c.alvoMin) return "green";
  if (m >= c.alvoMin * 0.75 && m > 0) return "yellow";
  return "red";
}
const statusLabel = { green: "Saudável", yellow: "Atenção", red: "Crítico" };

// area: "doces" (só canais de doces finos), "pacoca" (só paçoca) ou vazio (negócio todo)
function mesesComDados(area) {
  const set = new Set([
    ...(area === "pacoca" ? [] : db.vendas.map((v) => monthOf(v.inicio))),
    ...(area === "doces" ? [] : db.pacoca.map((p) => monthOf(p.data))),
    ...db.custosVar.filter((c) => !area || areaCV(c) === area).map((c) => +c.mes),
    ...perdasDe(area).map((p) => monthOf(p.data)),
  ]);
  return [...set].sort((a, b) => a - b);
}
function resumo(m, area) {
  const vendas = area === "pacoca" ? [] : db.vendas.filter((v) => !m || monthOf(v.inicio) === m);
  const pac = area === "doces" ? [] : db.pacoca.filter((p) => !m || monthOf(p.data) === m);
  const porCanal = {};
  CANAIS_VENDA.forEach((c) => { const r = sum(vendas.filter((v) => v.canal === c), recVenda); if (r) porCanal[c] = r; });
  const pacRec = sum(pac, recPac);
  if (pacRec) porCanal["Paçoca"] = pacRec;
  const receita = sum(vendas, recVenda) + pacRec;
  const insumos = sum(vendas, (v) => +v.insumos || 0) + sum(pac, insumosReg);
  const impostos = sum(pac, impostoReg);
  const gasolina = sum(vendas, (v) => +v.gasolina || 0) + sum(pac, (p) => +p.gasolina || 0);
  const comissoes = sum(vendas, (v) => +v.comissoes || 0) + sum(pac, (p) => +p.maoObra || 0);
  const perdasEst = sum(perdasDe(area, m), (p) => +p.valor || 0);
  const perdas = sum(vendas, (v) => (+v.perdas || 0) + (+v.outros || 0)) + perdasEst;
  // Custos variáveis lançados no DRE (doces finos), pelo mês de referência
  const cvs = db.custosVar.filter((c) => (!m || +c.mes === m) && (!area || areaCV(c) === area));
  const custosVar = sum(cvs, (c) => +c.valor || 0);
  const custos = insumos + impostos + gasolina + comissoes + perdas + custosVar;
  const qtd = sum(vendas, (v) => +v.qtd || 0) + sum(pac, (p) => +p.qtd || 0);
  const cxP = sum(vendas, (v) => +v.cxP || 0), cxG = sum(vendas, (v) => +v.cxG || 0);
  return { receita, custos, lucro: receita - custos, qtd, cxP, cxG, porCanal, insumos, impostos, gasolina, comissoes, perdas, perdasEst, custosVar, cvs, vendas, pac };
}

/* ---------- Gráficos ---------- */
let charts = [];
function destroyCharts() { charts.forEach((c) => c.destroy()); charts = []; }
function chart(id, cfg) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  charts.push(new Chart(el, cfg));
}
if (window.Chart) {
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = "#6e7b70";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.borderColor = "#ece7da";
  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.elements.line.tension = 0.35;
  Chart.defaults.elements.point.radius = 2.5;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.interaction.mode = "index";
  Chart.defaults.interaction.intersect = false;
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: "#ffffff", titleColor: "#233329", bodyColor: "#4a5a50", borderColor: "#e2dccb", borderWidth: 1,
    padding: 12, cornerRadius: 12, boxPadding: 4, usePointStyle: true, titleFont: { weight: "700" },
  });
}
const moneyTick = (v) => "R$ " + Number(v).toLocaleString("pt-BR");
const tooltipBRL = { callbacks: { label: (c) => ` ${c.dataset.label || c.label}: ${brl(c.parsed.y ?? c.parsed)}` } };

/* ---------- UI helpers ---------- */
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
const kpi = (label, value, foot, ic, cls = "") => `
  <div class="card kpi">
    <div class="kpi-label"><span class="kpi-icon">${icon(ic)}</span>${label}</div>
    <div class="kpi-value ${cls}">${value}</div>
    ${foot ? `<div class="kpi-foot">${foot}</div>` : ""}
  </div>`;
const tabs = (items, active, act) => `<div class="tabs">${items.map((i) => {
  const [val, label] = Array.isArray(i) ? i : [i, i];
  return `<button class="${String(val) === String(active) ? "active" : ""}" data-act="${act}" data-val="${esc(val)}">${label}</button>`;
}).join("")}</div>`;
const rowActions = (kind, id) => `<div class="row-actions">
  <button class="btn btn-ghost btn-sm" title="Editar" data-act="edit-${kind}" data-id="${id}">${icon("edit")}</button>
  <button class="btn btn-ghost btn-sm btn-danger" title="Excluir" data-act="del-${kind}" data-id="${id}">${icon("trash")}</button></div>`;
const setActions = (html) => { $("#topActions").innerHTML = html; };
const mesSelect = (val, act, area, todos = "Todos os meses") => `<select class="inline" data-act="${act}">
  <option value="0">${todos}</option>
  ${mesesComDados(area).map((m) => `<option value="${m}" ${+val === m ? "selected" : ""}>${MESES_FULL[m - 1]}</option>`).join("")}
</select>`;

/* ---------- Formulário modal ---------- */
function openForm({ title, fields, values = {}, preview, onSave, saveLabel = "Salvar" }) {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  const fieldHtml = fields.map((f) => {
    const v = values[f.key] ?? f.default ?? "";
    let input;
    if (f.type === "select") {
      input = `<select name="${f.key}">${f.options.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (f.type === "date") {
      input = `<input type="date" name="${f.key}" value="${esc(v)}" />`;
    } else if (f.type === "num") {
      const shown = v === "" ? "" : String(v).replace(".", ",");
      input = `<input type="text" inputmode="decimal" name="${f.key}" value="${esc(shown)}" placeholder="0" />`;
    } else {
      input = `<input type="text" name="${f.key}" value="${esc(v)}" ${f.readonly ? 'readonly style="background:#f6f1ea"' : ""} />`;
    }
    return `<label class="${f.full ? "full" : ""}">${f.label}${input}</label>`;
  }).join("");
  bg.innerHTML = `<div class="modal" role="dialog">
    <div class="modal-head"><h3>${title}</h3><button class="btn btn-ghost" data-close>${icon("x")}</button></div>
    <form class="modal-body">${fieldHtml}${preview ? '<div class="modal-preview" id="formPreview"></div>' : ""}</form>
    <div class="modal-foot"><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-save>${saveLabel}</button></div>
  </div>`;
  document.body.appendChild(bg);
  const form = bg.querySelector("form");
  const read = () => {
    const out = {};
    fields.forEach((f) => { const el = form.elements[f.key]; out[f.key] = f.type === "num" ? parseNum(el.value) : el.value.trim(); });
    return out;
  };
  const upd = () => { if (preview) bg.querySelector("#formPreview").innerHTML = preview(read()); };
  upd();
  form.addEventListener("input", upd);
  const close = () => bg.remove();
  bg.addEventListener("click", (e) => {
    if (e.target === bg || e.target.closest("[data-close]")) close();
    if (e.target.closest("[data-save]")) {
      const vals = read();
      const req = fields.find((f) => f.required && !vals[f.key]);
      if (req) { toast(`Preencha o campo "${req.label}"`); return; }
      onSave(vals); save(); close(); render();
    }
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  setTimeout(() => form.querySelector("input,select")?.focus(), 30);
}
function confirmDel(msg, fn) { if (confirm(msg)) { fn(); save(); render(); toast("Excluído"); } }

/* =================== PÁGINAS =================== */
const AREAS = {
  pacoca: { nome: "Paçoca", desc: "Vendas diárias, recebimentos, custos e compra mensal da paçoca", inicial: "pacoca-painel", cor: "#2f9e6b" },
  doces: { nome: "Doces Finos", desc: "Brigadeiros, mousses e barras: vendas por canal, preços, fichas técnicas e DRE", inicial: "painel", cor: "#c5a059" },
  geral: { nome: "Negócio todo", desc: "Painel e DRE unificados de doces + paçoca, com DAS, DARF e contabilidade divididos entre as áreas", inicial: "painel-geral", cor: "#306c62" },
};
const PAGES = [
  { id: "inicio", label: "Início", icon: "dash", sub: "Escolha a área que deseja gerenciar" },
  { id: "pacoca-painel", area: "pacoca", label: "Painel", icon: "dash", sub: "Visão geral da paçoca", section: "Visão geral" },
  { id: "vendedor-pacoca", area: "pacoca", label: "Área do vendedor", icon: "cart", sub: "Contador rápido de vendas da paçoca", section: "Operação" },
  { id: "pedidos-pacoca", area: "pacoca", label: "Pedidos", icon: "clip", sub: "Pedido de produção para a mão de obra terceirizada" },
  { id: "pacoca", area: "pacoca", label: "Vendas diárias", icon: "cal", sub: "Registro diário de vendas da paçoca" },
  { id: "simulador-pacoca", area: "pacoca", label: "Simulador", icon: "calc", sub: "Projete quanto vai gastar e lucrar por dia de venda e no mês" },
  { id: "estoque-pacoca", area: "pacoca", label: "Estoque", icon: "pkg", sub: "Saldo de paçoquitas e materiais, com baixa automática das vendas" },
  { id: "perdas-pacoca", area: "pacoca", label: "Perdas", icon: "alert", sub: "Pacote, embalagem ou material perdido: baixa no estoque e entra no DRE" },
  { id: "insumos-pacoca", area: "pacoca", label: "Insumos", icon: "pkg", sub: "Custo de compra dos insumos e ficha do pacote", section: "Cadastros" },
  { id: "dre-pacoca", area: "pacoca", label: "DRE", icon: "pie", sub: "Demonstrativo de resultado da paçoca", section: "Financeiro" },
  { id: "pagamentos-pacoca", area: "pacoca", label: "Pagamentos", icon: "wallet", sub: "Contas a pagar e a receber: o que já foi pago e o que está pendente" },
  { id: "pacoca-custos", area: "pacoca", label: "Personalizar custos", icon: "gear", sub: "Custo por paçoca, preço e compra mensal", section: "Configurações" },
  { id: "equipe-pacoca", area: "pacoca", label: "Equipe & App", icon: "cart", sub: "Sincronização entre celulares e app do vendedor" },
  { id: "painel", area: "doces", label: "Painel", icon: "dash", sub: "Visão geral dos doces finos", section: "Visão geral" },
  { id: "vendedor-doces", area: "doces", label: "Área do vendedor", icon: "cart", sub: "Contador rápido de vendas com combos", section: "Operação" },
  { id: "pedidos-doces", area: "doces", label: "Pedidos", icon: "clip", sub: "Pedido de produção para a mão de obra terceirizada" },
  { id: "vendas", area: "doces", label: "Vendas", icon: "trend", sub: "Faturamento semanal por canal de venda" },
  { id: "estoque", area: "doces", label: "Estoque", icon: "pkg", sub: "Caixas prontas, ingredientes e embalagens, com baixa automática" },
  { id: "perdas-doces", area: "doces", label: "Perdas", icon: "alert", sub: "Caixa, embalagem ou material perdido: baixa no estoque e entra no DRE" },
  { id: "produtos", area: "doces", label: "Produtos & Preços", icon: "tag", sub: "Custo, preço e margem de cada produto por canal" },
  { id: "simulador", area: "doces", label: "Simulador", icon: "calc", sub: "Projete quanto vai lucrar no mês" },
  { id: "receitas", area: "doces", label: "Fichas Técnicas", icon: "book", sub: "Custo por receita, sabor e formato", section: "Cadastros" },
  { id: "insumos", area: "doces", label: "Insumos", icon: "pkg", sub: "Tabela de custos de compra e custo unitário" },
  { id: "embalagens", area: "doces", label: "Embalagens", icon: "gift", sub: "Kits de embalagem e custo por unidade" },
  { id: "dre", area: "doces", label: "DRE", icon: "pie", sub: "Demonstrativo de resultado dos doces finos", section: "Financeiro" },
  { id: "pagamentos", area: "doces", label: "Pagamentos", icon: "wallet", sub: "Contas a pagar e a receber: o que já foi pago e o que está pendente" },
  { id: "personalizar", area: "doces", label: "Personalizar custos", icon: "gear", sub: "Taxas, metas de margem e custos padrão — tudo que mexe no custo", section: "Configurações" },
  { id: "equipe", area: "doces", label: "Equipe & App", icon: "cart", sub: "Sincronização entre celulares e app do vendedor" },
  { id: "painel-geral", area: "geral", label: "Painel", icon: "dash", sub: "Visão geral de doces + paçoca juntos", section: "Visão geral" },
  { id: "simulador-geral", area: "geral", label: "Simulador", icon: "calc", sub: "Doces (por semana) + paçoca (por dia) juntos: quanto vai gastar e lucrar no mês" },
  { id: "dre-geral", area: "geral", label: "DRE unificado", icon: "pie", sub: "Doces + paçoca, com impostos e contabilidade divididos entre as áreas", section: "Financeiro" },
  { id: "pagamentos-geral", area: "geral", label: "Pagamentos", icon: "wallet", sub: "Todas as contas: doces, paçoca e impostos do negócio" },
];

/* ---------- Personalizar custos ---------- */
// Opções de origem de um custo padrão: valor digitado, fichas técnicas ou insumos
const SEM_PISTACHE = ["Brigadeiro de Pistache"];
function opcoesFonte(p) {
  const o = [["manual", "Valor digitado"]];
  if (/^massaB(ol)/.test(p.key) || /^massaCop/.test(p.key)) {
    const formato = /Cop/.test(p.key) ? "Copinho" : "Bolinha";
    tiposArea("doces").forEach((t) => o.push([`caixa:${t.key}`, `Composição da ${t.nome} (${composicaoTxt(t.key)})`]));
    o.push([`max:${formato}`, `Fichas: maior custo de ${formato.toLowerCase()} (sem pistache)`], [`media:${formato}`, `Fichas: média de ${formato.toLowerCase()} (sem pistache)`]);
    db.sabores.forEach((s) => o.push([`sabor:${formato}:${s.nome}`, `Ficha: ${s.nome}`]));
  } else if (p.key === "massaBarra" || p.key === "massaTrufada") {
    [["gourmet", "gourmet"], ["trufada", "trufadas"]].forEach(([l, n]) => o.push([`bmax:${l}`, `Fichas: maior custo das barras ${n}`], [`bmedia:${l}`, `Fichas: média das barras ${n}`]));
    db.barras.forEach((b) => o.push([`barra:${b.nome}`, `Ficha: barra ${b.nome}`]));
  } else if (/^maoObra/.test(p.key)) {
    db.variaveis.forEach((v) => o.push([`var:${v.nome}`, `Insumos › ${v.nome}`]));
  }
  return o;
}
function fonteAtual(p) {
  const f = p.fonte;
  if (!f) return "manual";
  if (f.tipo === "caixa") return `caixa:${f.key}`;
  if (f.tipo === "variavel") return `var:${f.nome}`;
  if (f.tipo === "barra") return f.criterio === "barra" ? `barra:${f.barra}` : `${f.criterio === "media" ? "bmedia" : "bmax"}:${f.linha || "gourmet"}`;
  return f.criterio === "sabor" ? `sabor:${f.formato}:${f.sabor}` : `${f.criterio}:${f.formato}`;
}
function aplicarFonte(p, v) {
  if (v === "manual") { p.valor = paramVal(p.key); delete p.fonte; return; }
  const [t, a] = v.split(":");
  if (t === "caixa") p.fonte = { tipo: "caixa", key: a };
  else if (t === "var") p.fonte = { tipo: "variavel", nome: v.slice(4) };
  else if (t === "bmax" || t === "bmedia") p.fonte = { tipo: "barra", criterio: t === "bmax" ? "max" : "media", linha: a };
  else if (t === "barra") p.fonte = { tipo: "barra", criterio: "barra", barra: v.slice(6) };
  else if (t === "sabor") p.fonte = { tipo: "receita", formato: a, criterio: "sabor", sabor: v.split(":").slice(2).join(":") };
  else p.fonte = { tipo: "receita", formato: a, criterio: t, ignorar: SEM_PISTACHE };
}
function resumoCanaisHtml() {
  return Object.keys(db.canais).map((k) => {
    const ps = db.produtos.filter((p) => p.canal === k);
    const m = ps.length ? sum(ps, margemProd) / ps.length : 0;
    const ruins = ps.filter((p) => statusMargem(margemProd(p), k) !== "green").length;
    return `<div class="stat"><small>${k} · margem média</small><strong class="${statusMargem(m, k) === "green" ? "pos" : "neg"}">${pct(m)}</strong>
      <div class="hint">${ruins ? `${ruins} produto(s) abaixo da meta` : "Todos dentro da meta"}</div></div>`;
  }).join("");
}
function viewPersonalizar() {
  const usos = (key) => db.produtos.filter((p) => p.itens?.some((i) => i.param === key)).length;
  const grupos = [...new Set(db.params.map((p) => p.grupo))];
  const onde = [
    ["Gramas das receitas e rendimento", "Fichas Técnicas", "receitas"],
    ["Preço de compra de ingredientes e materiais", "Insumos", "insumos"],
    ["Itens e valores de cada kit de embalagem", "Embalagens", "embalagens"],
    ["Preço de venda e quantidades de cada produto", "Produtos & Preços", "produtos"],
    ["Despesas semanais (gasolina, vendedor, marketing)", "Simulador", "simulador"],
    ["Despesas fixas do mês (pró-labore, contador...)", "DRE", "dre"],
    ["Custo, preço e compra da paçoca", "Paçoca · Personalizar custos", "pacoca-custos"],
  ];
  return `
  <div class="card"><div class="card-head"><div><h3>Impacto nas margens</h3><div class="sub">Atualiza enquanto você altera os valores abaixo</div></div></div>
    <div class="grid g-3" id="persResumo" style="gap:12px">${resumoCanaisHtml()}</div></div>

  <div class="card mt"><div class="card-head"><div><h3>Canais de venda: metas e taxas</h3><div class="sub">As taxas são cobradas sobre o preço de venda de todos os produtos do canal</div></div></div>
    <div class="grid g-3">${Object.entries(db.canais).map(([k, c]) => `
      <div class="prod">
        <h4>${k}</h4>
        <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(50px,90px)"><span>Meta mínima de margem (%)</span>${numIn("can-min", c.alvoMin, `data-canal="${k}"`)}</div>
        <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(50px,90px)"><span>Meta máxima de margem (%)</span>${numIn("can-max", c.alvoMax, `data-canal="${k}"`)}</div>
        <div class="hint" style="margin-top:4px"><b>Taxas sobre o preço</b></div>
        ${(c.taxas || []).map((t, i) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(44px,80px) 34px">
          <input data-act="tx-nome" data-canal="${k}" data-i="${i}" value="${esc(t.nome)}" style="text-align:left" />${numIn("tx-pct", t.pct, `data-canal="${k}" data-i="${i}"`)}
          <button class="btn btn-ghost btn-sm btn-danger" data-act="del-taxa" data-val="${k}" data-i="${i}">${icon("trash")}</button></div>`).join("") || '<div class="hint">Nenhuma taxa neste canal.</div>'}
        <button class="btn btn-sm" data-act="add-taxa" data-val="${k}">${icon("plus")}Adicionar taxa</button>
      </div>`).join("")}</div></div>

  <div class="card mt"><div class="card-head"><div><h3>Custos padrão dos produtos</h3><div class="sub">Escolha de onde vem cada valor. Ligado a uma ficha ou insumo, ele se atualiza sozinho quando a origem muda.</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Custo</th><th>Vem de</th><th class="num">Valor atual</th><th class="num">Usado em</th></tr></thead><tbody>
    ${grupos.map((g) => `<tr><td colspan="4" class="vend-sec" style="padding-top:16px">${esc(g)}</td></tr>
      ${db.params.filter((p) => p.grupo === g).map((p) => { const o = opcoesFonte(p); return `<tr>
        <td><b>${esc(p.nome)}</b></td>
        <td>${o.length > 1 ? `<select class="inline" data-act="par-fonte" data-key="${p.key}">${o.map(([v, l]) => `<option value="${esc(v)}" ${v === fonteAtual(p) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : '<span class="hint">Valor digitado</span>'}</td>
        <td class="num">${p.fonte ? `<b data-pv="${p.key}">${brlU(paramVal(p.key))}</b>` : numIn("par-val", p.valor, `data-key="${p.key}"`)}</td>
        <td class="num hint">${usos(p.key)} produto(s)</td></tr>`; }).join("")}`).join("")}
    </tbody></table></div></div>

  <div class="card mt"><div class="card-head"><div><h3>Outros lugares onde você altera custos</h3><div class="sub">Tudo que entra no custo pode ser editado — veja onde fica cada coisa</div></div></div>
    <div class="table-wrap"><table><tbody>${onde.map(([o, t, h]) => `<tr><td>${o}</td><td class="num"><a class="btn btn-sm" href="#${h}">Abrir ${t} →</a></td></tr>`).join("")}</tbody></table></div></div>`;
}

/* ---------- Início ---------- */
function viewInicio() {
  const card = (key) => {
    const a = AREAS[key];
    const meses = mesesComDados(key);
    const ult = meses[meses.length - 1];
    const r = resumo(ult, key);
    const m = r.receita ? (r.lucro / r.receita) * 100 : 0;
    const tot = resumo(0, key);
    return `<a class="area-card" href="#${a.inicial}" style="--area:${a.cor}">
      <div class="area-top"><span class="area-icon">${icon(key === "pacoca" ? "cal" : "gift")}</span><span class="area-go">Entrar →</span></div>
      <h2>${a.nome}</h2><p>${a.desc}</p>
      <div class="hint" style="margin-top:6px">Último mês com movimento: <b>${ult ? MESES_FULL[ult - 1] : "—"}</b></div>
      <div class="area-stats" style="margin-top:0">
        <div><small>Faturamento</small><strong>${brl(r.receita)}</strong></div>
        <div><small>Lucro</small><strong class="${r.lucro >= 0 ? "pos" : "neg"}">${brl(r.lucro)}</strong></div>
        <div><small>Margem</small><strong>${pct(m)}</strong></div>
      </div>
      <div class="area-foot">Acumulado no ano: ${brl(tot.receita)} faturados · ${brl(tot.lucro)} de lucro</div>
    </a>`;
  };
  const cardGeral = () => {
    const meses = mesesComDados(), ult = meses[meses.length - 1], r = resumo(ult), rat = rateioImpostos(ult);
    const fx = sum(db.fixos, (f) => +f.valor || 0) + sum(db.fixosPacoca, (f) => +f.valor || 0), resultado = r.lucro - rat.total - fx;
    return `<a class="area-card" href="#painel-geral" style="--area:${AREAS.geral.cor}">
      <div class="area-top"><span class="area-icon">${icon("pie")}</span><span class="area-go">Entrar →</span></div>
      <h2>Negócio todo</h2><p>${AREAS.geral.desc}</p>
      <div class="hint" style="margin-top:6px">Último mês com movimento: <b>${ult ? MESES_FULL[ult - 1] : "—"}</b></div>
      <div class="area-stats" style="margin-top:0">
        <div><small>Faturamento</small><strong>${brl(r.receita)}</strong></div>
        <div><small>Impostos</small><strong class="neg">${brl(rat.total)}</strong></div>
        <div><small>Resultado</small><strong class="${resultado >= 0 ? "pos" : "neg"}">${brl(resultado)}</strong></div>
      </div>
      <div class="area-foot">Impostos no preço: doces ${pct(cargaImpostosPct("doces"))} · paçoca ${pct(cargaImpostosPct("pacoca"))}</div>
    </a>`;
  };
  const g = resumo(0);
  return `<div class="home">
    <div class="home-head"><div class="brand-logo big">H&amp;A</div><h1>HA La Vie</h1><p>Escolha a área que deseja gerenciar</p></div>
    <div class="area-grid">${card("pacoca")}${card("doces")}${cardGeral()}</div>
    <div class="home-total">Negócio todo em ${db.config.ano}: <b>${brl(g.receita)}</b> faturados e <b class="${g.lucro >= 0 ? "pos" : "neg"}">${brl(g.lucro)}</b> de lucro</div>
  </div>`;
}

/* ---------- Painel (Doces Finos) ---------- */
function alertas() {
  const out = [];
  db.produtos.forEach((p) => {
    const m = margemProd(p);
    const st = statusMargem(m, p.canal);
    if (st !== "green") {
      const alvo = db.canais[p.canal]?.alvoMin ?? 30;
      const sug = precoAlvo(p, alvo);
      out.push({ tipo: st === "red" ? "red" : "yellow", t: `${p.nome} (${p.canal}) com margem de ${pct(m)}`, d: `Meta do canal: a partir de ${alvo}%. ${sug ? `Preço sugerido: ${brl(sug)}.` : ""}` });
    }
  });
  const pb = pedidoBase(), comprar = itensEstoque("doces").filter((i) => pb.faltam.includes(i.ref));
  if (comprar.length) out.push({ tipo: "red", t: `Comprar ${comprar.length} item(ns): o estoque faz só ${int(pb.capacidade)} de ${int(pb.n)} caixas`, d: `${comprar.slice(0, 4).map((i) => i.nome).join(", ")}${comprar.length > 4 ? "…" : ""}. Pedido comum: ${pb.G} Cx G + ${pb.P} Cx P. Veja a tela Estoque.` });
  const est = alertasEstoque("doces").filter((i) => !pb.faltam.includes(i.ref));
  if (est.length) out.push({ tipo: "yellow", t: `${est.length} item(ns) do estoque abaixo do mínimo`, d: `${est.slice(0, 4).map((i) => i.nome).join(", ")}${est.length > 4 ? "…" : ""}. Veja a tela Estoque.` });
  const semanasPrejuizo = db.vendas.filter((v) => v.canal === "Outbound" && lucroVenda(v) < 0);
  if (semanasPrejuizo.length) out.push({ tipo: "yellow", t: `${semanasPrejuizo.length} semana(s) com prejuízo no Outbound`, d: `Semanas com custos (gasolina/insumos) e sem vendas lançadas. Confira se faltam lançamentos.` });
  const melhores = [...db.produtos].sort((a, b) => margemProd(b) - margemProd(a))[0];
  if (melhores) out.push({ tipo: "green", t: `Destaque: ${melhores.nome} (${melhores.canal})`, d: `Melhor margem da casa: ${pct(margemProd(melhores))} — lucro de ${brl(lucroProd(melhores))} por venda.` });
  return out;
}

function viewPainel() {
  setActions(mesSelect(ui.mes, "set-mes", "doces"));
  const r = resumo(ui.mes, "doces");
  const margem = r.receita ? (r.lucro / r.receita) * 100 : 0;
  const ticket = r.qtd ? r.receita / r.qtd : 0;
  const canais = Object.keys(r.porCanal);
  const al = alertas();
  return `
  <div class="grid g-4">
    ${kpi("Faturamento", brl(r.receita), ui.mes ? MESES_FULL[ui.mes - 1] : "Todo o período", "money")}
    ${kpi("Lucro líquido", brl(r.lucro), `Custos: ${brl(r.custos)}`, "wallet", r.lucro >= 0 ? "pos" : "neg")}
    ${kpi("Margem de lucro", pct(margem), margem >= 50 ? '<span class="badge b-green">Saudável</span>' : '<span class="badge b-yellow">Abaixo de 50%</span>', "percent")}
    ${kpi("Itens vendidos", int(r.qtd), `Ticket médio: ${brl(ticket)}`, "cart")}
  </div>
  <div class="grid g-21 mt">
    <div class="card"><div class="card-head"><div><h3>Faturamento x Lucro por mês</h3><div class="sub">Todos os canais de doces finos</div></div></div><div class="chart-box"><canvas id="chMes"></canvas></div></div>
    <div class="card"><div class="card-head"><div><h3>Faturamento por canal</h3><div class="sub">${ui.mes ? MESES_FULL[ui.mes - 1] : "Todo o período"}</div></div></div>
      ${canais.length ? '<div class="chart-box"><canvas id="chCanal"></canvas></div>' : '<div class="empty">Sem vendas no período</div>'}</div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Pontos de atenção</h3><div class="sub">Gerados automaticamente a partir dos seus dados</div></div></div>
      <div class="alert-list">${al.map((a) => `<div class="alert ${a.tipo}">${icon(a.tipo === "green" ? "check" : "alert")}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></div>`).join("")}</div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Resultado por canal</h3><div class="sub">${ui.mes ? MESES_FULL[ui.mes - 1] : "Todo o período"}</div></div></div>
      <div class="table-wrap"><table><thead><tr><th>Canal</th><th class="num">Faturamento</th><th class="num">Lucro</th><th class="num">Margem</th></tr></thead><tbody>
      ${CANAIS_VENDA.map((c) => {
        const rec = sum(r.vendas.filter((v) => v.canal === c), recVenda);
        const luc = sum(r.vendas.filter((v) => v.canal === c), lucroVenda);
        if (!rec && !luc) return "";
        const m = rec ? (luc / rec) * 100 : 0;
        return `<tr><td><span class="badge" style="background:${CORES[c]}1a;color:${CORES[c]}">● ${c}</span></td><td class="num">${brl(rec)}</td><td class="num ${luc >= 0 ? "pos" : "neg"}">${brl(luc)}</td><td class="num">${pct(m)}</td></tr>`;
      }).join("")}
      </tbody><tfoot><tr><td>Total</td><td class="num">${brl(r.receita)}</td><td class="num">${brl(r.lucro)}</td><td class="num">${pct(margem)}</td></tr></tfoot></table></div>
    </div>
  </div>
  ${resumoMensalDoces()}`;
}
// Histórico mês a mês dos doces finos (mesma ideia do resumo da paçoca)
function resumoMensalDoces() {
  const meses = mesesComDados("doces");
  if (!meses.length) return "";
  const rs = meses.map((m) => ({ m, r: resumo(m, "doces") }));
  const outros = (r) => r.comissoes + r.perdas + r.custosVar;
  const tot = resumo(0, "doces");
  return `<div class="card mt"><div class="card-head"><div><h3>Resumo por mês</h3><div class="sub">Totais consolidados dos lançamentos semanais de vendas</div></div><a class="btn btn-sm" href="#vendas">Ver lançamentos</a></div>
    <div class="table-wrap"><table><thead><tr><th>Mês</th><th class="num hide-m">Semanas</th><th class="num">Vendas</th><th class="num" title="Caixas pequenas (4 un)">Cx P</th><th class="num" title="Caixas grandes (9 un)">Cx G</th><th class="num">Faturamento</th><th class="num hide-m">Insumos</th><th class="num hide-m">Gasolina</th><th class="num hide-m">Outros custos</th><th class="num">Lucro</th><th class="num">Margem</th></tr></thead>
    <tbody>${rs.map(({ m, r }) => `<tr class="${ui.mes === m ? "row-sel" : ""}"><td><b>${MESES_FULL[m - 1]}</b></td><td class="num hide-m">${r.vendas.length}</td><td class="num">${int(r.qtd)}</td><td class="num">${int(r.cxP)}</td><td class="num">${int(r.cxG)}</td><td class="num">${brl(r.receita)}</td>
      <td class="num hide-m">${brl(r.insumos)}</td><td class="num hide-m">${brl(r.gasolina)}</td><td class="num hide-m">${brl(outros(r))}</td>
      <td class="num ${r.lucro >= 0 ? "pos" : "neg"}"><b>${brl(r.lucro)}</b></td><td class="num">${pct(r.receita ? (r.lucro / r.receita) * 100 : 0)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td>Total</td><td class="num hide-m">${tot.vendas.length}</td><td class="num">${int(tot.qtd)}</td><td class="num">${int(tot.cxP)}</td><td class="num">${int(tot.cxG)}</td><td class="num">${brl(tot.receita)}</td><td class="num hide-m">${brl(tot.insumos)}</td><td class="num hide-m">${brl(tot.gasolina)}</td><td class="num hide-m">${brl(outros(tot))}</td><td class="num">${brl(tot.lucro)}</td><td class="num">${pct(tot.receita ? (tot.lucro / tot.receita) * 100 : 0)}</td></tr></tfoot></table></div>
  </div>`;
}
function afterPainel() {
  const meses = mesesComDados("doces");
  const rs = meses.map((m) => resumo(m, "doces"));
  chart("chMes", {
    type: "bar",
    data: { labels: meses.map((m) => MESES[m - 1]), datasets: [
      { label: "Faturamento", data: rs.map((r) => r.receita), backgroundColor: "#c5a059", borderRadius: 8, maxBarThickness: 46 },
      { label: "Lucro", data: rs.map((r) => r.lucro), backgroundColor: "#306c62", borderRadius: 8, maxBarThickness: 46 },
    ] },
    options: { maintainAspectRatio: false, plugins: { tooltip: tooltipBRL }, scales: { y: { ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { grid: { display: false } } } },
  });
  const r = resumo(ui.mes, "doces");
  const labels = Object.keys(r.porCanal);
  chart("chCanal", {
    type: "doughnut",
    data: { labels, datasets: [{ data: labels.map((l) => r.porCanal[l]), backgroundColor: labels.map((l) => CORES[l]), borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${brl(c.parsed)}` } } } },
  });
}

/* ---------- Vendas ---------- */
const vendaFields = [
  { key: "canal", label: "Canal de venda", type: "select", options: CANAIS_VENDA, full: true },
  { key: "inicio", label: "Início da semana", type: "date", required: true },
  { key: "fim", label: "Fim da semana", type: "date", required: true },
  { key: "qtd", label: "Nº de vendas", type: "num" },
  { key: "cxP", label: "Caixas pequenas vendidas (4 un)", type: "num" },
  { key: "cxG", label: "Caixas grandes vendidas (9 un)", type: "num" },
  { key: "cartao", label: "Recebido no cartão (R$)", type: "num" },
  { key: "pix", label: "Recebido no Pix (R$)", type: "num" },
  { key: "especie", label: "Recebido em espécie (R$)", type: "num" },
  { key: "insumos", label: "Gasto com insumos (R$)", type: "num" },
  { key: "gasolina", label: "Gasolina (R$)", type: "num" },
  { key: "comissoes", label: "Comissões / vendedor (R$)", type: "num" },
  { key: "perdas", label: "Perdas (R$)", type: "num" },
  { key: "outros", label: "Outras despesas (R$)", type: "num", full: true },
];
const vendaPreview = (v) => `<span>Faturamento: ${brl(recVenda(v))}</span><span class="${lucroVenda(v) >= 0 ? "pos" : "neg"}">Lucro: ${brl(lucroVenda(v))}</span>`;
function formVenda(v) {
  const hoje = new Date().toISOString().slice(0, 10);
  openForm({
    title: v ? "Editar venda" : "Lançar vendas da semana",
    fields: vendaFields,
    values: v || { canal: ui.vendasCanal !== "Todos" ? ui.vendasCanal : "Outbound", inicio: hoje, fim: hoje },
    preview: vendaPreview,
    onSave: (vals) => { if (v) Object.assign(v, vals); else db.vendas.push({ id: uid(), ...vals }); toast("Venda salva"); },
  });
}
function viewVendas() {
  setActions(`${mesSelect(ui.vendasMes, "set-vmes")}<button class="btn btn-primary" data-act="new-venda">${icon("plus")}Lançar vendas</button>`);
  const lista = db.vendas
    .filter((v) => (ui.vendasCanal === "Todos" || v.canal === ui.vendasCanal) && (!ui.vendasMes || monthOf(v.inicio) === ui.vendasMes))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const rec = sum(lista, recVenda), cus = sum(lista, custoVenda), qtd = sum(lista, (v) => +v.qtd || 0);
  return `
  <div class="toolbar">${tabs(["Todos", ...CANAIS_VENDA], ui.vendasCanal, "set-vcanal")}</div>
  <div class="grid g-4">
    ${kpi("Faturamento", brl(rec), `${lista.length} lançamento(s)`, "money")}
    ${kpi("Custos", brl(cus), "Insumos, gasolina, comissões e perdas", "wallet")}
    ${kpi("Lucro", brl(rec - cus), rec ? `Margem de ${pct(((rec - cus) / rec) * 100)}` : "", "trend", rec - cus >= 0 ? "pos" : "neg")}
    ${kpi("Nº de vendas", int(qtd), `Ticket médio: ${brl(qtd ? rec / qtd : 0)}`, "cart")}
  </div>
  <div class="card mt">
    <div class="card-head"><div><h3>Lançamentos semanais</h3><div class="sub">Clique no lápis para editar qualquer linha</div></div></div>
    ${lista.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Semana</th><th>Canal</th><th class="num">Vendas</th><th class="num" title="Caixas pequenas (4 un)">Cx P</th><th class="num" title="Caixas grandes (9 un)">Cx G</th><th class="num">Cartão</th><th class="num">Pix</th><th class="num">Espécie</th><th class="num">Faturamento</th><th class="num">Insumos</th><th class="num">Gasolina</th><th class="num">Comissões</th><th class="num">Perdas</th><th class="num">Lucro</th><th></th></tr></thead>
      <tbody>${lista.map((v) => `<tr>
        <td>${ddmm(v.inicio)} a ${ddmm(v.fim)}</td>
        <td><span class="badge" style="background:${CORES[v.canal]}1a;color:${CORES[v.canal]}">${v.canal}</span></td>
        <td class="num">${int(v.qtd)}</td>
        <td class="num" title="${esc(v.detalheCx || "")}">${+v.cxP ? int(v.cxP) : "—"}</td><td class="num" title="${esc(v.detalheCx || "")}">${+v.cxG ? int(v.cxG) : "—"}</td>
        <td class="num">${brl(v.cartao)}</td><td class="num">${brl(v.pix)}</td><td class="num">${brl(v.especie)}</td>
        <td class="num"><b>${brl(recVenda(v))}</b></td><td class="num">${brl(v.insumos)}</td><td class="num">${brl(v.gasolina)}</td><td class="num">${brl(v.comissoes)}</td><td class="num">${brl((+v.perdas || 0) + (+v.outros || 0))}</td>
        <td class="num ${lucroVenda(v) >= 0 ? "pos" : "neg"}"><b>${brl(lucroVenda(v))}</b></td>
        <td>${rowActions("venda", v.id)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="num">${int(qtd)}</td><td class="num">${int(sum(lista, (v) => +v.cxP || 0))}</td><td class="num">${int(sum(lista, (v) => +v.cxG || 0))}</td><td class="num">${brl(sum(lista, (v) => +v.cartao || 0))}</td><td class="num">${brl(sum(lista, (v) => +v.pix || 0))}</td><td class="num">${brl(sum(lista, (v) => +v.especie || 0))}</td><td class="num">${brl(rec)}</td><td class="num">${brl(sum(lista, (v) => +v.insumos || 0))}</td><td class="num">${brl(sum(lista, (v) => +v.gasolina || 0))}</td><td class="num">${brl(sum(lista, (v) => +v.comissoes || 0))}</td><td class="num">${brl(sum(lista, (v) => (+v.perdas || 0) + (+v.outros || 0)))}</td><td class="num">${brl(rec - cus)}</td><td></td></tr></tfoot>
    </table></div>` : `<div class="empty">Nenhuma venda lançada aqui ainda.<br/><br/><button class="btn btn-primary" data-act="new-venda">${icon("plus")}Lançar primeira venda</button></div>`}
  </div>`;
}

/* ---------- Paçoca ---------- */
const pacFields = [
  { key: "data", label: "Data", type: "date", required: true, full: true },
  { key: "qtd", label: "Pacotes vendidos", type: "num" },
  { key: "pix", label: "Recebido no Pix (R$)", type: "num" },
  { key: "especie", label: "Recebido em espécie (R$)", type: "num" },
  { key: "insumos", label: "Custo de insumos (R$)", type: "num" },
  { key: "imposto", label: "Imposto NF-e (R$)", type: "num" },
  { key: "gasolina", label: "Gasolina (R$)", type: "num" },
  { key: "maoObra", label: "Mão de obra (R$)", type: "num" },
];
function formPac(p) {
  openForm({
    title: p ? "Editar dia" : "Registrar dia de vendas",
    fields: pacFields,
    values: p ? { ...p, insumos: round2(insumosReg(p)), imposto: round2(impostoReg(p)) } : { data: new Date().toISOString().slice(0, 10), gasolina: 11.02, imposto: 0 },
    preview: (v) => `<span>Recebido: ${brl(recPac(v))}</span><span>Não recebido: ${brl(naoRecPac(v))}</span><span class="${lucroPac(v) >= 0 ? "pos" : "neg"}">Lucro: ${brl(lucroPac(v))}</span>`,
    onSave: (vals) => { if (p) Object.assign(p, vals); else db.pacoca.push({ id: uid(), ...vals }); toast("Dia registrado"); },
  });
}
function viewPacoca() {
  const meses = [...new Set(db.pacoca.map((p) => monthOf(p.data)))].sort((a, b) => a - b);
  if (ui.pacMes === null) ui.pacMes = meses[meses.length - 1] || 0;
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Preço unitário
    <input class="inline" style="width:90px" inputmode="decimal" data-act="set-preco-pac" value="${String(db.config.precoPacoca).replace(".", ",")}" /></label>
    <button class="btn btn-primary" data-act="new-pac">${icon("plus")}Registrar dia</button>`);
  const lista = db.pacoca.filter((p) => !ui.pacMes || monthOf(p.data) === ui.pacMes).sort((a, b) => a.data.localeCompare(b.data));
  const qtd = sum(lista, (p) => +p.qtd || 0), rec = sum(lista, recPac), luc = sum(lista, lucroPac), nr = sum(lista, naoRecPac), esp = sum(lista, esperadoPac);
  const taxa = esp ? (nr / esp) * 100 : 0;
  return `
  <div class="toolbar">${tabs([[0, "Todos"], ...meses.map((m) => [m, MESES_FULL[m - 1]])], ui.pacMes, "set-pmes")}</div>
  <div class="grid g-4">
    ${kpi("Pacotes vendidos", int(qtd), `${lista.length} dia(s) de venda · média ${int(lista.length ? qtd / lista.length : 0)}/dia`, "cart")}
    ${kpi("Recebido", brl(rec), `Esperado: ${brl(esp)}`, "money")}
    ${kpi("Lucro", brl(luc), rec ? `Margem de ${pct((luc / rec) * 100)}` : "", "wallet", luc >= 0 ? "pos" : "neg")}
    ${kpi("Não recebido", brl(nr), `<span class="badge ${taxa > naoRecPctPacoca() ? "b-red" : "b-green"}">${pct(taxa)} do esperado · previsão ${pct(naoRecPctPacoca())}</span>`, "alert", nr > 0 ? "neg" : "")}
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Vendas por dia</h3><div class="sub">Recebido x lucro de cada dia</div></div></div>
    ${lista.length ? '<div class="chart-box sm"><canvas id="chPac"></canvas></div>' : '<div class="empty">Sem registros</div>'}</div>
  <div class="card mt"><div class="card-head"><div><h3>Registro diário</h3><div class="sub">"Não recebido" = vendas × preço unitário − valor recebido</div></div></div>
    ${lista.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th class="num">Vendidas</th><th class="num">Pix</th><th class="num">Espécie</th><th class="num">Recebido</th><th class="num">Não recebido</th><th class="num">Insumos</th><th class="num hint">NF-e (já inclusa)</th><th class="num">Gasolina</th><th class="num">Mão de obra</th><th class="num">Lucro</th><th></th></tr></thead>
    <tbody>${lista.map((p) => { const n = naoRecPac(p); return `<tr>
      <td>${ddmm(p.data)}</td><td class="num">${int(p.qtd)}</td><td class="num">${brl(p.pix)}</td><td class="num">${brl(p.especie)}</td><td class="num"><b>${brl(recPac(p))}</b></td>
      <td class="num">${n > 0 ? `<span class="badge b-red">${brl(n)}</span>` : `<span class="badge b-green">${brl(n)}</span>`}</td>
      <td class="num">${brl(insumosReg(p) + impostoReg(p))}</td><td class="num hint">${brl(impostoReg(p))}</td><td class="num">${brl(p.gasolina)}</td><td class="num">${brl(p.maoObra)}</td>
      <td class="num ${lucroPac(p) >= 0 ? "pos" : "neg"}"><b>${brl(lucroPac(p))}</b></td><td>${rowActions("pac", p.id)}</td></tr>`; }).join("")}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${int(qtd)}</td><td class="num">${brl(sum(lista, (p) => +p.pix || 0))}</td><td class="num">${brl(sum(lista, (p) => +p.especie || 0))}</td><td class="num">${brl(rec)}</td><td class="num">${brl(nr)}</td><td class="num">${brl(sum(lista, (p) => insumosReg(p) + impostoReg(p)))}</td><td class="num hint">${brl(sum(lista, impostoReg))}</td><td class="num">${brl(sum(lista, (p) => +p.gasolina || 0))}</td><td class="num">${brl(sum(lista, (p) => +p.maoObra || 0))}</td><td class="num">${brl(luc)}</td><td></td></tr></tfoot>
    </table></div>` : ""}
  </div>`;
}
function afterPacoca() {
  const lista = db.pacoca.filter((p) => !ui.pacMes || monthOf(p.data) === ui.pacMes).sort((a, b) => a.data.localeCompare(b.data));
  chart("chPac", {
    type: "bar",
    data: { labels: lista.map((p) => ddmm(p.data)), datasets: [
      { label: "Recebido", data: lista.map(recPac), backgroundColor: "#c5a059", borderRadius: 6, maxBarThickness: 34, order: 2 },
      { label: "Lucro", data: lista.map(lucroPac), type: "line", borderColor: "#2f9e6b", backgroundColor: "#2f9e6b", tension: .35, pointRadius: 3, order: 1 },
    ] },
    options: { maintainAspectRatio: false, plugins: { tooltip: tooltipBRL }, scales: { y: { ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { grid: { display: false } } } },
  });
}

/* ---------- Produtos & Preços ---------- */
function prodStats(p) {
  const m = margemProd(p), st = statusMargem(m, p.canal), c = db.canais[p.canal] || { alvoMin: 30, alvoMax: 100 };
  const sug = precoAlvo(p, c.alvoMin);
  const w = Math.max(0, Math.min(100, m));
  return `
    <div class="prod-stats">
      <div class="stat"><small>Custo total</small><strong>${brl(custoProd(p))}</strong></div>
      <div class="stat"><small>Lucro / venda</small><strong class="${lucroProd(p) >= 0 ? "pos" : "neg"}">${brl(lucroProd(p))}</strong></div>
      <div class="stat"><small>Margem</small><strong class="${st === "green" ? "pos" : st === "red" ? "neg" : ""}">${pct(m)}</strong></div>
    </div>
    <div class="meter"><span class="band" style="left:${c.alvoMin}%;width:${Math.min(100, c.alvoMax) - c.alvoMin}%"></span><i style="width:${w}%;background:var(--${st === "green" ? "green" : st === "yellow" ? "yellow" : "red"})"></i></div>
    <div class="hint">${st === "green" ? `Dentro da meta do canal (${c.alvoMin}%${c.alvoMax < 100 ? "–" + c.alvoMax + "%" : "+"}).` : sug ? `Para chegar a ${c.alvoMin}% de margem, venda a <b>${brl(sug)}</b>.` : "Revise os custos deste produto."}</div>`;
}
function compHtml(p) {
  const linhas = (p.itens || [{ nome: "Custo", qtd: 1, valor: p.custoFixo }]).map((it) => {
    const v = valorItem(it), f = fonteItem(it);
    return `<li><span>${esc(it.nome)}${f ? ` <a class="badge b-gold" href="#${f.href}" title="Altere em: ${esc(f.onde)}">${f.tag}</a>` : ""}</span><span>${int(it.qtd)} × ${brlU(v)}</span><span>${brl((+it.qtd || 0) * v)}</span></li>`;
  });
  (db.canais[p.canal]?.taxas || []).forEach((t) => {
    linhas.push(`<li><span>${esc(t.nome)} <a class="badge b-gold" href="#personalizar" title="Altere em: Personalizar custos">taxa</a></span><span>${pct(t.pct)} de ${brl(p.preco)}</span><span>${brl((p.preco * t.pct) / 100)}</span></li>`);
  });
  const carga = cargaImpostosPct("doces");
  if (carga) linhas.push(`<li><span>Impostos e contabilidade <a class="badge b-gold" href="#dre-geral" title="Altere em: DRE unificado">imposto</a></span><span>${pct(carga)} de ${brl(p.preco)}</span><span>${brl((p.preco * carga) / 100)}</span></li>`);
  return `<ul class="recipe-ings">${linhas.join("")}</ul>
    <div class="recipe-total"><span>Custo total</span><span>${brl(custoProd(p))}</span></div>
    ${carga ? `<div class="hint" style="margin-top:6px">Impostos: DAS ${pct(dasPct())} + DARF e contabilidade ${pct(cargaFixosPct("doces"))} (parte dos doces: ${brl(fixosMesArea("doces"))}/mês ÷ faturamento médio dos doces de ${brl(faturamentoMedioMensal("doces"))}).</div>` : ""}
    <div class="hint" style="margin-top:6px">As etiquetas mostram onde cada valor é alterado — clique nelas para ir até lá.</div>`;
}
const ITENS_PADRAO = [
  { nome: "Massa", qtd: 1, valor: 0 }, { nome: "Embalagem", qtd: 1, valor: 0 },
  { nome: "Mão de obra", qtd: 1, valor: 0 }, { nome: "Frete / comissão", qtd: 1, valor: 0 },
];
function formProd(p) {
  const itens = JSON.parse(JSON.stringify(p?.itens || ITENS_PADRAO));
  const fields = [
    { key: "canal", label: "Canal", type: "select", options: Object.keys(db.canais) },
    { key: "nome", label: "Nome do produto", required: true },
    { key: "preco", label: "Preço de venda (R$)", type: "num", full: true },
    ...itens.flatMap((it, i) => [
      { key: "q" + i, label: `${it.nome} · quantidade`, type: "num" },
      fonteItem(it)
        ? { key: "r" + i, label: `${it.nome} · altere em ${fonteItem(it).onde}`, readonly: true }
        : { key: "v" + i, label: `${it.nome} · valor unitário (R$)`, type: "num" },
    ]),
  ];
  const values = { canal: p?.canal || ui.prodCanal, nome: p?.nome || "", preco: p?.preco ?? 0 };
  itens.forEach((it, i) => { values["q" + i] = it.qtd; if (fonteItem(it)) values["r" + i] = brlU(valorItem(it)); else values["v" + i] = it.valor; });
  const montar = (v) => ({
    canal: v.canal, nome: v.nome, preco: v.preco,
    itens: itens.map((it, i) => ({ ...it, qtd: v["q" + i], ...(fonteItem(it) ? {} : { valor: v["v" + i] }) })),
  });
  openForm({
    title: p ? "Editar produto" : "Novo produto",
    fields,
    values,
    preview: (v) => { const t = montar(v); return `<span>Custo: ${brl(custoProd(t))}</span><span>Lucro: ${brl(lucroProd(t))}</span><span>Margem: ${pct(margemProd(t))}</span>`; },
    onSave: (v) => { const t = montar(v); if (p) { Object.assign(p, t); delete p.custoFixo; } else db.produtos.push({ id: uid(), ...t }); toast("Produto salvo"); },
  });
}
function viewProdutos() {
  setActions(`<button class="btn btn-primary" data-act="new-prod">${icon("plus")}Novo produto</button>`);
  const c = db.canais[ui.prodCanal];
  const lista = db.produtos.filter((p) => p.canal === ui.prodCanal);
  const nomes = [...new Set(db.produtos.map((p) => p.nome))];
  const canais = Object.keys(db.canais);
  return `
  <div class="toolbar">${tabs(canais, ui.prodCanal, "set-pcanal")}
    <div class="chip-row"><span class="badge b-gold">${esc(c.descricao)}</span><span class="badge b-green">Meta de margem: ${c.alvoMin}%${c.alvoMax < 100 ? "–" + c.alvoMax + "%" : "+"}</span>
      ${taxaCanal(ui.prodCanal) ? `<span class="badge b-red">Taxas: ${pct(taxaCanal(ui.prodCanal))} do preço</span>` : ""}<a class="btn btn-sm" href="#personalizar">Alterar metas e taxas</a></div></div>
  <div class="grid g-3">${lista.map((p) => { const st = statusMargem(margemProd(p), p.canal); return `
    <div class="prod" data-prod="${p.id}">
      <div class="prod-top"><div><h4>${esc(p.nome)}</h4><div class="hint">${taxaCanal(p.canal) + cargaImpostosPct("doces") ? `Custo ${brl(custoBase(p))} + ${pct(taxaCanal(p.canal) + cargaImpostosPct("doces"))} de taxas e impostos sobre o preço` : `Custo ${brl(custoBase(p))}`}</div></div>
        <span class="badge b-${st}" data-badge>${statusLabel[st]}</span></div>
      <div class="price-row"><label>Preço de venda</label><input inputmode="decimal" data-act="set-preco" data-id="${p.id}" value="${String(p.preco).replace(".", ",")}" />
        ${rowActions("prod", p.id)}</div>
      <div data-stats>${prodStats(p)}</div>
      <details class="comp"><summary>Ver composição do custo</summary><div data-comp>${compHtml(p)}</div></details>
    </div>`; }).join("")}</div>
  <div class="card mt"><div class="card-head"><div><h3>Comparativo de margem entre canais</h3><div class="sub">Mesmo produto, margens diferentes em cada canal</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Produto</th>${canais.map((k) => `<th class="num">${k}</th>`).join("")}</tr></thead><tbody>
    ${nomes.map((n) => `<tr><td>${esc(n)}</td>${canais.map((k) => { const p = db.produtos.find((x) => x.nome === n && x.canal === k); if (!p) return '<td class="num"><span class="badge b-gray">—</span></td>'; const m = margemProd(p); return `<td class="num"><span class="badge b-${statusMargem(m, k)}">${pct(m)}</span> <span class="hint">${brl(p.preco)}</span></td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div></div>`;
}
function updateProdCard(id) {
  const p = db.produtos.find((x) => x.id === id);
  const card = document.querySelector(`[data-prod="${id}"]`);
  if (!p || !card) return;
  const st = statusMargem(margemProd(p), p.canal);
  card.querySelector("[data-stats]").innerHTML = prodStats(p);
  card.querySelector("[data-comp]").innerHTML = compHtml(p);
  const b = card.querySelector("[data-badge]");
  b.className = `badge b-${st}`; b.textContent = statusLabel[st];
}

/* ---------- Simuladores: quanto vai gastar com cada coisa ---------- */
const ORDEM_GASTOS = ["Ingredientes", "Embalagens e materiais", "Mão de obra", "Gasolina", "Comissões e frete", "Taxas do canal", "Impostos", "Despesas fixas", "Outros custos"];
function categoriaItem(it) {
  if (it.regra) return "Ingredientes";
  if (it.param) {
    const g = db.params.find((x) => x.key === it.param)?.grupo || "";
    if (/massa/i.test(g)) return "Ingredientes";
    if (/m[ãa]o/i.test(g)) return "Mão de obra";
    if (/comiss|entrega/i.test(g)) return "Comissões e frete";
    if (/embal/i.test(g)) return "Embalagens e materiais";
  }
  if (it.kit || it.material) return "Embalagens e materiais";
  const n = it.nome || "";
  if (/m[ãa]o/i.test(n)) return "Mão de obra";
  if (/frete|comiss/i.test(n)) return "Comissões e frete";
  if (/embal|caixa|fita|adesiv|sacol/i.test(n)) return "Embalagens e materiais";
  return "Ingredientes";
}
const grupoDespesa = (nome) => (/gasol/i.test(nome) ? "Gasolina" : /comiss/i.test(nome) ? "Comissões e frete" : /m[ãa]o de obra/i.test(nome) ? "Mão de obra" : "Despesas fixas");
// Linhas de gasto { grupo, nome, mes } a partir de valores semanais (doces) ou mensais (paçoca)
function novoAcumulador() {
  const g = {};
  const add = (grupo, nome, mes) => { if (!(mes > 0.004)) return; const k = grupo + "|" + nome; g[k] = g[k] || { grupo, nome, mes: 0 }; g[k].mes += mes; };
  return { add, linhas: () => Object.values(g) };
}
// Impostos do negócio que cabem à área no mês: DAS sobre o faturamento projetado + parte de DARF, contabilidade...
function impostosSimulados(acc, area, recMes) {
  acc.add("Impostos", `DAS ${pct(dasPct())} sobre o faturamento`, (recMes * dasPct()) / 100);
  (impGerais().fixos || []).forEach((f) => acc.add("Impostos", `${f.nome} (parte ${area === "pacoca" ? "da paçoca" : "dos doces"}: ${pct(shareFixos(0, area) * 100)})`, (+f.valor || 0) * shareFixos(0, area)));
  (area === "pacoca" ? db.fixosPacoca : db.fixos).forEach((f) => acc.add("Despesas fixas", `${f.nome} (DRE)`, +f.valor || 0));
}
function gastosSimDoces() {
  const s = db.sim, semanas = Math.max(1, +s.semanas || 1), acc = novoAcumulador();
  let recSem = 0, un = 0;
  db.produtos.filter((p) => p.canal === s.canal).forEach((p) => {
    const q = +s.qtd[p.id] || 0;
    if (!q) return;
    recSem += q * p.preco; un += q;
    (p.itens || [{ nome: "Custo", qtd: 1, valor: p.custoFixo }]).forEach((it) => { const cat = categoriaItem(it); acc.add(cat, cat, q * (+it.qtd || 0) * valorItem(it) * semanas); });
    (db.canais[p.canal]?.taxas || []).forEach((t) => acc.add("Taxas do canal", t.nome, ((q * p.preco * (+t.pct || 0)) / 100) * semanas));
  });
  const variavelMes = sum(acc.linhas(), (l) => l.mes) + (recSem * semanas * dasPct()) / 100;
  Object.entries(s.fixos).forEach(([k, v]) => acc.add(grupoDespesa(k), k, (+v || 0) * semanas));
  impostosSimulados(acc, "doces", recSem * semanas);
  return { recMes: recSem * semanas, semanas, div: semanas, linhas: acc.linhas(), variavelMes, unMes: un * semanas, periodo: "semana" };
}
function gastosSimPacoca() {
  const s = db.pacocaSim, dias = +s.dias || 0, qtd = (+s.porDia || 0) * dias, acc = novoAcumulador();
  const esperado = qtd * (+db.config.precoPacoca || 0), recMes = esperado * (1 - naoRecPctPacoca() / 100);
  db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0).forEach((i) => acc.add(i.usaPacote ? "Ingredientes" : "Embalagens e materiais", i.nome, qtd * consumoPacote(i) * (+i.custo || 0)));
  acc.add("Impostos", "Imposto NF-e da paçoquita", qtd * impostoPacote());
  db.pacocaCusto.forEach((c) => acc.add(/m[ãa]o/i.test(c.nome) ? "Mão de obra" : "Outros custos", c.nome, qtd * (+c.valor || 0)));
  const variavelMes = sum(acc.linhas(), (l) => l.mes) + (recMes * dasPct()) / 100;
  acc.add("Gasolina", "Gasolina", (+s.gasolinaDia || 0) * dias);
  Object.entries(s.fixos || {}).forEach(([k, v]) => acc.add(grupoDespesa(k), k, (+v || 0) * dias));
  impostosSimulados(acc, "pacoca", recMes);
  return { recMes, esperado, div: Math.max(1, dias), linhas: acc.linhas(), variavelMes, unMes: qtd, periodo: "dia de venda" };
}
function gastosHtml(g) {
  const tot = sum(g.linhas, (l) => l.mes), lucroMes = g.recMes - tot, sem = (v) => v / g.div;
  const grupos = [...ORDEM_GASTOS.filter((o) => g.linhas.some((l) => l.grupo === o)), ...new Set(g.linhas.map((l) => l.grupo).filter((x) => !ORDEM_GASTOS.includes(x)))];
  const pctF = (v) => (g.recMes ? pct((v / g.recMes) * 100) : "—");
  const linha = (cls, nome, mes, neg = true) => `<tr class="${cls}"><td>${nome}</td><td class="num ${neg && mes ? "neg" : ""}">${neg && mes ? "−" : ""}${brl(sem(Math.abs(mes)))}</td><td class="num ${neg && mes ? "neg" : ""}">${neg && mes ? "−" : ""}${brl(Math.abs(mes))}</td><td class="num hint">${pctF(Math.abs(mes))}</td></tr>`;
  return `<div class="table-wrap"><table class="dre"><thead><tr><th>Gasto</th><th class="num">Por ${g.periodo}</th><th class="num">No mês</th><th class="num">% do faturamento</th></tr></thead><tbody>
    ${linha("total", g.esperado ? "FATURAMENTO (recebido)" : "FATURAMENTO", g.recMes, false)}
    ${g.esperado ? `<tr class="row-off"><td>&nbsp;&nbsp;&nbsp;&nbsp;Não recebido (${pct(naoRecPctPacoca())} · pix confiança) · informativo</td><td class="num">${brl(sem(g.esperado - g.recMes))}</td><td class="num">${brl(g.esperado - g.recMes)}</td><td></td></tr>` : ""}
    ${grupos.map((gr) => { const ls = g.linhas.filter((l) => l.grupo === gr), sub = sum(ls, (l) => l.mes);
      const unico = ls.length === 1 && ls[0].nome === gr;
      return linha("total", gr.toUpperCase(), sub) + (unico ? "" : ls.sort((a, b) => b.mes - a.mes).map((l) => linha("", "&nbsp;&nbsp;&nbsp;&nbsp;" + esc(l.nome), l.mes)).join("")); }).join("")}
    ${linha("total", "TOTAL DE GASTOS", tot)}
    <tr class="result"><td>(=) LUCRO LÍQUIDO</td><td class="num ${lucroMes < 0 ? "neg" : ""}">${brl(sem(lucroMes))}</td><td class="num ${lucroMes < 0 ? "neg" : ""}">${brl(lucroMes)}</td><td class="num">${pctF(lucroMes)}</td></tr>
  </tbody></table></div>`;
}

/* ---------- Simulador ---------- */
function simCalc() {
  const s = db.sim;
  const rows = db.produtos.filter((p) => p.canal === s.canal).map((p) => { const q = +s.qtd[p.id] || 0, r = q * p.preco; return { p, q, r, l: r - q * custoProd(p) }; });
  const g = gastosSimDoces(), tot = sum(g.linhas, (l) => l.mes), fixMes = tot - g.variavelMes, lucroMes = g.recMes - tot;
  const contrib = g.unMes ? (g.recMes - g.variavelMes) / g.unMes : 0;
  return { rows, g, rec: g.recMes / g.semanas, cus: g.variavelMes / g.semanas, fixSem: fixMes / g.semanas, lucroSem: lucroMes / g.semanas, semanas: g.semanas, recMes: g.recMes, lucroMes,
    margem: g.recMes ? (lucroMes / g.recMes) * 100 : 0, equilibrio: contrib > 0 ? Math.ceil(fixMes / g.semanas / contrib) : null };
}
function simResultHtml() {
  const r = simCalc();
  return `
    <div class="big-result"><small>Lucro líquido previsto no mês</small><div>${brl(r.lucroMes)}</div><small>${brl(r.lucroSem)} por semana · ${r.semanas} semana(s)</small></div>
    <div class="grid g-2 mt" style="gap:12px">
      <div class="stat"><small>Faturamento no mês</small><strong>${brl(r.recMes)}</strong></div>
      <div class="stat"><small>Margem líquida</small><strong class="${r.margem >= 0 ? "pos" : "neg"}">${pct(r.margem)}</strong></div>
      <div class="stat"><small>Custos variáveis / mês</small><strong>${brl(r.cus * r.semanas)}</strong><div class="hint">material, mão de obra, comissões, taxas e DAS</div></div>
      <div class="stat"><small>Despesas fixas / mês</small><strong>${brl(r.fixSem * r.semanas)}</strong><div class="hint">gasolina, despesas da semana, DARF, contabilidade</div></div>
    </div>
    <div class="alert ${r.equilibrio === null ? "yellow" : "green"} mt">${icon(r.equilibrio === null ? "alert" : "check")}<div><b>Ponto de equilíbrio</b>
      <span>${r.equilibrio === null ? "Informe quantidades para calcular." : `Você precisa vender <strong>${int(r.equilibrio)} itens por semana</strong> (no mix atual) para pagar as despesas fixas.`}</span></div></div>`;
}
function viewSimulador() {
  const s = db.sim;
  const r = simCalc();
  setActions(`<button class="btn" data-act="sim-zerar">Zerar quantidades</button>`);
  const hist = histSemanasHtml();
  return `${hist ? `${hist}
  <div class="chip-row" style="margin:10px 0 18px;align-items:center"><span class="hint">Preencher a semana do simulador (Cx P e Cx G) com:</span>
    <button class="btn btn-sm" data-act="sim-hist" data-val="0">Média geral</button>
    ${[1, 2, 3, 4].map((n) => `<button class="btn btn-sm" data-act="sim-hist" data-val="${n}">${n}ª semana</button>`).join("")}</div>` : ""}
  <div class="toolbar">${tabs(Object.keys(db.canais), s.canal, "set-simcanal")}<span class="hint">Digite quantas unidades pretende vender por semana — o resultado atualiza na hora.</span></div>
  <div class="grid g-21">
    <div class="card">
      <div class="card-head"><div><h3>Vendas previstas por semana · ${s.canal}</h3><div class="sub">Preços e custos vêm da tela Produtos & Preços</div></div></div>
      <div class="sim-row head"><span>Produto</span><span style="text-align:center">Qtd/semana</span><span class="num">Faturamento</span><span class="num">Lucro</span></div>
      ${r.rows.map(({ p, q, r: rec, l }) => `<div class="sim-row"><span>${esc(p.nome)} <span class="hint">· ${brl(p.preco)}</span></span>
        <input inputmode="numeric" data-act="sim-qtd" data-id="${p.id}" value="${q || ""}" placeholder="0" />
        <span class="num" data-simrec="${p.id}">${brl(rec)}</span><span class="num" data-simluc="${p.id}">${brl(l)}</span></div>`).join("")}
      <h3 style="font-size:14px;margin:22px 0 8px">Despesas fixas por semana</h3>
      ${Object.entries(s.fixos).map(([k, v]) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px)"><span>${esc(k)}</span><input inputmode="decimal" data-act="sim-fixo" data-key="${esc(k)}" value="${String(v || "").replace(".", ",")}" placeholder="0" /></div>`).join("")}
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px);border:0"><span><b>Semanas de venda no mês</b></span><input inputmode="numeric" data-act="sim-semanas" value="${s.semanas}" /></div>
    </div>
    <div class="card" id="simResult">${simResultHtml()}</div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Quanto você vai gastar · ${esc(s.canal)}</h3><div class="sub">Calculado a partir das vendas que você projetou acima: composição de cada produto, taxas, despesas da semana e impostos reais (DAS sobre a venda e a parte dos doces em DARF e contabilidade)</div></div></div>
    <div id="simGastos">${gastosHtml(r.g)}</div></div>`;
}
function refreshSim() {
  simCalc().rows.forEach(({ p, r, l }) => {
    const a = document.querySelector(`[data-simrec="${p.id}"]`), b = document.querySelector(`[data-simluc="${p.id}"]`);
    if (a) a.textContent = brl(r);
    if (b) b.textContent = brl(l);
  });
  $("#simResult").innerHTML = simResultHtml();
  if ($("#simGastos")) $("#simGastos").innerHTML = gastosHtml(gastosSimDoces());
}

/* ---------- Fichas técnicas ---------- */
const numIn = (act, val, attrs = "") => `<input class="tbl-input" inputmode="decimal" data-act="${act}" ${attrs} value="${String(+val || 0).replace(".", ",")}" />`;
// Formato sem rendimento cadastrado não tem custo por unidade
const custoSaborTxt = (s, j) => (+s.rend[j] > 0 ? brl(custoSabor(s, j)) : "—");
function matrizSabores() {
  return db.sabores.map((s, k) => `<tr class="${k === ui.sabor ? "row-sel" : ""}"><td><a class="link" data-act="set-sabor" data-val="${k}">${esc(s.nome)}</a></td>${db.formatos.map((f, j) => `<td class="num">${custoSaborTxt(s, j)}<div class="hint">${+s.rend[j] > 0 ? `rende ${int(s.rend[j])}` : "sem rendimento"}</div></td>`).join("")}</tr>`).join("");
}
function formNovaReceita(tipo) {
  openForm({
    title: tipo === "barra" ? "Nova barra de chocolate" : "Nova receita de doce",
    fields: [{ key: "nome", label: "Nome", required: true, full: true }],
    onSave: (v) => {
      const lista = tipo === "barra" ? db.barras : db.sabores;
      if (lista.some((x) => x.nome.toLowerCase() === v.nome.toLowerCase())) { toast("Já existe uma receita com esse nome"); return; }
      const cob = db.insumos.find((i) => i.nome === "Cobertura Meio Amargo Gotas 2,05kg"), gas = db.insumos.find((i) => i.nome === "Gás");
      if (tipo === "barra") { db.barras.push({ nome: v.nome, linha: "gourmet", itens: [] }); ui.barra = db.barras.length - 1; }
      else {
        db.sabores.push({ nome: v.nome, rend: [0, 0, 0, 0, 0, 0], lote: [],
          porUn: [...(cob ? [{ insumoId: cob.id, qtd: [20, 30, 0, 0, 7, 0] }] : []), ...(gas ? [{ insumoId: gas.id, qtd: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01] }] : [])] });
        ui.sabor = db.sabores.length - 1;
      }
      toast("Receita criada — adicione os ingredientes e o rendimento");
    },
  });
}
function matrizBarras() {
  return db.barras.map((b, k) => `<tr class="${k === ui.barra ? "row-sel" : ""}"><td><a class="link" data-act="set-barra" data-val="${k}">Barra ${esc(b.nome)}</a></td><td class="num"><b>${brl(custoBarra(b))}</b></td></tr>`).join("");
}
function viewCaixas() {
  return `<div class="grid g-2">${tiposArea("doces").map((t) => {
    const c = caixaDe(t.key), j = db.formatos.findIndex((f) => f.nome === c.formato), un = unidadesCaixa(t.key), esperado = infoCaixa(t.key).un;
    return `<div class="card"><div class="card-head"><div><h3>${esc(t.nome)} <span class="hint">(${esc(t.desc)})</span></h3><div class="sub">${esc(composicaoTxt(t.key)) || "Nenhum docinho definido"}</div></div>
        <select class="inline" data-act="cx-formato" data-key="${t.key}">${db.formatos.map((f) => `<option ${f.nome === c.formato ? "selected" : ""}>${esc(f.nome)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="compact"><thead><tr><th>Sabor</th><th class="num">Qtd na caixa</th><th class="num">Custo un.</th><th class="num">Subtotal</th></tr></thead><tbody>
      ${db.sabores.map((s) => { const q = +c.itens[s.nome] || 0, temRend = +s.rend[j] > 0; return `<tr class="${q ? "" : "row-off"}"><td>${esc(s.nome)}${!temRend ? ' <span class="badge b-red" title="Sem rendimento nesse formato">sem rendimento</span>' : ""}</td>
        <td class="num">${numIn("cx-qtd", q, `data-key="${t.key}" data-sabor="${esc(s.nome)}"`)}</td>
        <td class="num">${temRend ? brl(custoSabor(s, j)) : "—"}</td><td class="num">${q && temRend ? brl(q * custoSabor(s, j)) : "—"}</td></tr>`; }).join("")}
      </tbody><tfoot><tr><td>Total</td><td class="num ${un === esperado ? "pos" : "neg"}">${int(un)} de ${int(esperado)}</td><td></td><td class="num">${brl(custoMassaCaixa(t.key))}</td></tr></tfoot></table></div>
      ${un !== esperado ? `<div class="alert yellow mt">${icon("alert")}<div><b>A caixa tem ${int(esperado)} lugares e a composição soma ${int(un)}</b><span>Ajuste as quantidades.</span></div></div>` : ""}
      <div class="hint" style="margin-top:8px">Custo da massa por caixa: <b>${brl(custoMassaCaixa(t.key))}</b> (média ${brl(un ? custoMassaCaixa(t.key) / un : 0)} por doce). Usado nos produtos, no vendedor e na projeção de compra.</div></div>`;
  }).join("")}</div>`;
}
function viewReceitas() {
  setActions(ui.recTab === "caixas" ? "" : `<button class="btn btn-primary" data-act="rec-nova" data-val="${ui.recTab === "barras" ? "barra" : "doce"}">${icon("plus")}${ui.recTab === "barras" ? "Nova barra" : "Nova receita"}</button>`);
  const head = `<div class="toolbar">${tabs([["doces", "Doces (brigadeiros e mousses)"], ["caixas", "Caixas (docinhos por caixa)"], ["barras", "Barras de chocolate"]], ui.recTab, "set-rectab")}
    <span class="hint">Altere as quantidades nos campos — os custos são recalculados na hora com os preços da tela Insumos.</span></div>`;
  if (ui.recTab === "caixas") return head + viewCaixas();
  if (ui.recTab === "barras") {
    const b = db.barras[ui.barra] || db.barras[0];
    return head + `<div class="grid g-21">
      <div class="card"><div class="card-head"><div><h3>Barra ${esc(b.nome)}</h3><div class="sub">Ingredientes para 1 barra de 300g ·
          linha <select class="inline" data-act="bar-linha" style="padding:3px 8px"><option value="gourmet" ${b.linha !== "trufada" ? "selected" : ""}>gourmet</option><option value="trufada" ${b.linha === "trufada" ? "selected" : ""}>trufada</option></select></div></div>
        <div style="display:flex;gap:6px"><button class="btn btn-sm" data-act="add-ing" data-val="barra">${icon("plus")}Ingrediente</button>
        <button class="btn btn-ghost btn-sm btn-danger" title="Excluir barra" data-act="rec-excluir" data-val="barra">${icon("trash")}</button></div></div>
        <div class="table-wrap"><table><thead><tr><th>Ingrediente</th><th class="num">Quantidade</th><th class="num">Custo unitário</th><th class="num">Total</th><th></th></tr></thead>
        <tbody>${b.itens.map((it, i) => `<tr><td>${esc(nomeItem(it))}</td>
          <td class="num">${numIn("bar-qtd", it.qtd, `data-i="${i}"`)} <span class="hint">${esc(unidItem(it))}</span></td>
          <td class="num">${brlU(custoUnitItem(it))}<span class="hint">/${esc(unidItem(it))}</span></td>
          <td class="num" data-rc="b${i}">${brl(it.qtd * custoUnitItem(it))}</td>
          <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" title="Trocar ingrediente / marca" data-act="trocar-ing" data-val="barra" data-i="${i}">⇄</button><button class="btn btn-ghost btn-sm btn-danger" data-act="del-ing" data-val="barra" data-i="${i}">${icon("trash")}</button></td></tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="3">Custo da massa da barra</td><td class="num" data-rc="bt">${brl(custoBarra(b))}</td><td></td></tr></tfoot></table></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>Todas as barras</h3><div class="sub">Clique para editar</div></div></div>
        <div class="table-wrap"><table><thead><tr><th>Barra</th><th class="num">Custo</th></tr></thead><tbody id="barMatrix">${matrizBarras()}</tbody></table></div>
      </div></div>`;
  }
  const s = db.sabores[ui.sabor] || db.sabores[0];
  return head + `
  <div class="card"><div class="card-head"><div><h3>Custo por unidade em cada formato</h3><div class="sub">Clique em um sabor para editar a receita</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Sabor</th>${db.formatos.map((f) => `<th class="num">${f.nome}<br/><span style="text-transform:none;font-weight:500">${f.peso}</span></th>`).join("")}</tr></thead>
    <tbody id="recMatrix">${matrizSabores()}</tbody></table></div></div>
  <div class="toolbar mt" style="margin-bottom:0">${tabs(db.sabores.map((x, k) => [k, x.nome]), ui.sabor, "set-sabor")}</div>
  <div class="grid mt">
    <div class="card"><div class="card-head"><div><h3>${esc(s.nome)} · receita (1 lote)</h3><div class="sub">Quantidades na unidade de compra do insumo (g, ml, un)</div></div>
      <div style="display:flex;gap:6px"><button class="btn btn-sm" data-act="add-ing" data-val="lote">${icon("plus")}Ingrediente</button>
      <button class="btn btn-ghost btn-sm btn-danger" title="Excluir receita" data-act="rec-excluir" data-val="doce">${icon("trash")}</button></div></div>
      <div class="table-wrap"><table><thead><tr><th>Ingrediente</th><th class="num">Quantidade</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${s.lote.map((it, i) => `<tr><td>${esc(nomeItem(it))}<div class="hint">${brlU(custoUnitItem(it))}/${esc(unidItem(it))}</div></td>
        <td class="num">${numIn("rec-lote", it.qtd, `data-i="${i}"`)} <span class="hint">${esc(unidItem(it))}</span></td>
        <td class="num" data-rc="l${i}">${brl(it.qtd * custoUnitItem(it))}</td>
        <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" title="Trocar ingrediente / marca" data-act="trocar-ing" data-val="lote" data-i="${i}">⇄</button><button class="btn btn-ghost btn-sm btn-danger" data-act="del-ing" data-val="lote" data-i="${i}">${icon("trash")}</button></td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">Custo do lote</td><td class="num" data-rc="lt">${brl(custoLote(s))}</td><td></td></tr></tfoot></table></div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Rendimento e gasto por unidade</h3><div class="sub">Por formato: unidades por lote e gramas de cobertura/recheio em cada doce</div></div></div>
      <div class="table-wrap"><table class="compact"><thead><tr><th></th>${db.formatos.map((f) => `<th class="num">${f.nome}</th>`).join("")}</tr></thead>
      <tbody>
        <tr><td><b>Rende (un)</b></td>${db.formatos.map((f, j) => `<td class="num">${numIn("rec-rend", s.rend[j], `data-j="${j}"`)}</td>`).join("")}</tr>
        ${s.porUn.map((it, i) => `<tr><td>${esc(nomeItem(it))} <span class="hint">(${esc(unidItem(it))}/un)</span> <button class="btn btn-ghost btn-sm" title="Trocar ingrediente / marca" data-act="trocar-ing" data-val="porun" data-i="${i}">⇄</button></td>${db.formatos.map((f, j) => `<td class="num">${numIn("rec-porun", it.qtd[j], `data-i="${i}" data-j="${j}"`)}</td>`).join("")}</tr>`).join("")}
      </tbody>
      <tfoot><tr><td>Custo por unidade</td>${db.formatos.map((f, j) => `<td class="num" data-rc="f${j}">${custoSaborTxt(s, j)}</td>`).join("")}</tr></tfoot></table></div>
      <div class="hint" style="margin-top:8px">Formato com rendimento 0 fica sem custo ("—") e não entra no cálculo das massas dos produtos.</div>
    </div>
  </div>`;
}
function refreshReceita() {
  const set = (k, v) => { const el = document.querySelector(`[data-rc="${k}"]`); if (el) el.textContent = v; };
  if (ui.recTab === "barras") {
    const b = db.barras[ui.barra];
    b.itens.forEach((it, i) => set("b" + i, brl(it.qtd * custoUnitItem(it))));
    set("bt", brl(custoBarra(b)));
    $("#barMatrix").innerHTML = matrizBarras();
    return;
  }
  const s = db.sabores[ui.sabor];
  s.lote.forEach((it, i) => set("l" + i, brl(it.qtd * custoUnitItem(it))));
  set("lt", brl(custoLote(s)));
  db.formatos.forEach((f, j) => set("f" + j, custoSaborTxt(s, j)));
  $("#recMatrix").innerHTML = matrizSabores();
}
// Troca o ingrediente de uma receita (marca, outro insumo) sem precisar excluir e incluir de novo
function itemReceita(destino, i) {
  if (destino === "barra") return db.barras[ui.barra].itens[i];
  if (destino === "porun") return db.sabores[ui.sabor].porUn[i];
  return db.sabores[ui.sabor].lote[i];
}
function todosItensReceitas() {
  return [...db.sabores.flatMap((s) => [...s.lote, ...s.porUn]), ...db.barras.flatMap((b) => b.itens)];
}
function formTrocarIngrediente(destino, i) {
  const it = itemReceita(destino, i), atual = insById(it.insumoId);
  if (!atual) { toast("Ingrediente sem insumo ligado"); return; }
  const usos = todosItensReceitas().filter((x) => x.insumoId === atual.id).length;
  const MANTER = `Manter "${atual.nome}" e só mudar nome/preço`, NOVA = "+ Cadastrar nova marca a partir deste";
  const palavras = (n) => n.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const parecido = (x) => palavras(x.nome).filter((w) => palavras(atual.nome).includes(w)).length;
  const outros = db.insumos.filter((x) => x.id !== atual.id).sort((a, b) => parecido(b) - parecido(a) || (b.unid === atual.unid) - (a.unid === atual.unid) || a.nome.localeCompare(b.nome));
  const ONDE = ["Só nesta receita", `Em todas as receitas (${usos} uso${usos > 1 ? "s" : ""})`];
  openForm({
    title: `Trocar ingrediente · ${atual.nome}`,
    fields: [
      { key: "para", label: "Trocar por", type: "select", options: [...outros.map((x) => x.nome), NOVA, MANTER], full: true },
      { key: "onde", label: "Onde trocar", type: "select", options: ONDE, full: true },
      { key: "nome", label: "Nome / marca (para nova marca ou para mudar este)", full: true },
      { key: "custo", label: "Custo de compra (R$ por embalagem)", type: "num" },
      { key: "rend", label: `Quantidade na embalagem (${atual.unid})`, type: "num" },
    ],
    values: { para: (outros.find((x) => parecido(x) > 0 && x.unid === atual.unid) || outros.find((x) => x.unid === atual.unid))?.nome || NOVA, onde: ONDE[0], nome: atual.nome, custo: atual.custo, rend: atual.rend },
    saveLabel: "Trocar",
    preview: (v) => {
      const unit = (x) => (x.rend ? x.custo / x.rend : 0);
      if (v.para === MANTER) return `<span>"${esc(atual.nome)}" passa a se chamar <b>${esc(v.nome || atual.nome)}</b>, a ${brlU(v.rend ? v.custo / v.rend : 0)}/${esc(atual.unid)}, em todas as ${usos} receita(s).</span>`;
      if (v.para === NOVA) return `<span>Cria <b>${esc(v.nome || "")}</b> (${brlU(v.rend ? v.custo / v.rend : 0)}/${esc(atual.unid)}) em Insumos e usa ${v.onde === ONDE[0] ? "nesta receita" : "em todas as receitas"}. "${esc(atual.nome)}" continua cadastrado.</span>`;
      const novo = db.insumos.find((x) => x.nome === v.para);
      if (!novo) return "";
      const aviso = novo.unid !== atual.unid ? `<span class="neg">Atenção: unidade diferente (${esc(atual.unid)} → ${esc(novo.unid)}). Confira a quantidade depois.</span>` : "";
      return `<span>${brlU(unit(atual))}/${esc(atual.unid)} → <b>${brlU(unit(novo))}/${esc(novo.unid)}</b></span>${aviso}`;
    },
    onSave: (v) => {
      if (v.para === MANTER) {
        Object.assign(atual, { nome: (v.nome || atual.nome).trim(), custo: v.custo, rend: v.rend || atual.rend });
        toast(`Insumo atualizado em ${usos} receita(s)`);
        return;
      }
      let novo = db.insumos.find((x) => x.nome === v.para);
      if (v.para === NOVA) {
        const nome = (v.nome || "").trim();
        if (!nome || nome === atual.nome) { toast("Digite o nome da nova marca"); return; }
        novo = db.insumos.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
        if (!novo) { novo = { ...atual, id: uid(), nome, custo: v.custo, rend: v.rend || atual.rend }; db.insumos.push(novo); }
      }
      if (!novo) return;
      const alvos = v.onde === ONDE[0] ? [it] : todosItensReceitas().filter((x) => x.insumoId === atual.id);
      alvos.forEach((x) => { x.insumoId = novo.id; });
      toast(`${atual.nome} → ${novo.nome} · ${alvos.length} receita(s) recalculada(s)`);
    },
  });
}
function formIngrediente(destino) {
  openForm({
    title: "Adicionar ingrediente",
    fields: [
      { key: "insumo", label: "Insumo (da tela Insumos)", type: "select", options: db.insumos.map((i) => i.nome), full: true },
      { key: "qtd", label: "Quantidade", type: "num", full: true },
    ],
    onSave: (v) => {
      const ins = db.insumos.find((i) => i.nome === v.insumo);
      const alvo = destino === "barra" ? db.barras[ui.barra].itens : db.sabores[ui.sabor].lote;
      alvo.push({ insumoId: ins.id, qtd: v.qtd });
      toast("Ingrediente adicionado");
    },
  });
}

/* ---------- Insumos ---------- */
const INS_TABS = { insumos: "Ingredientes", materiais: "Embalagens & materiais", variaveis: "Custos variáveis" };
const insFields = [
  { key: "nome", label: "Item", required: true, full: true },
  { key: "custo", label: "Custo de compra (R$)", type: "num" },
  { key: "rend", label: "Rendimento (quantidade)", type: "num" },
  { key: "unid", label: "Unidade (g, ml, un...)", full: true },
];
// Onde cada insumo entra no custo (fichas, kits, produtos e custos padrão)
function usoInsumo(tab, it) {
  const out = [];
  if (tab === "insumos") {
    db.sabores.forEach((s) => { if ([...s.lote, ...s.porUn].some((x) => x.insumoId === it.id)) out.push(`Ficha ${s.nome}`); });
    db.barras.forEach((b) => { if (b.itens.some((x) => x.insumoId === it.id)) out.push(`Barra ${b.nome}`); });
  }
  if (tab === "materiais") {
    db.embalagens.forEach((e) => { if (e.itens.some((x) => x.material === it.nome)) out.push(`Kit ${e.nome}`); });
    db.produtos.forEach((p) => { if (p.itens?.some((x) => x.material === it.nome)) out.push(`${p.nome} (${p.canal})`); });
  }
  if (tab === "variaveis") db.params.forEach((p) => { if (p.fonte?.tipo === "variavel" && p.fonte.nome === it.nome) out.push(p.nome); });
  return out;
}
function renomearReferencias(tab, antigo, novo) {
  if (tab === "materiais") {
    db.embalagens.forEach((e) => e.itens.forEach((x) => { if (x.material === antigo) x.material = novo; }));
    db.produtos.forEach((p) => (p.itens || []).forEach((x) => { if (x.material === antigo) { x.material = novo; if (x.nome === antigo) x.nome = novo; } }));
  }
  if (tab === "variaveis") db.params.forEach((p) => { if (p.fonte?.tipo === "variavel" && p.fonte.nome === antigo) p.fonte.nome = novo; });
}
function formIns(it) {
  const tab = ui.insTab;
  openForm({
    title: it ? "Editar item" : `Novo item · ${INS_TABS[tab]}`,
    fields: insFields,
    values: it || { rend: 1, unid: "un" },
    preview: (v) => `<span>Custo unitário</span><span>${brlU(v.rend ? v.custo / v.rend : 0)} por ${esc(v.unid || "un")}</span>`,
    onSave: (vals) => {
      if (it) {
        if (vals.nome !== it.nome) renomearReferencias(tab, it.nome, vals.nome);
        Object.assign(it, vals);
        const u = usoInsumo(tab, it);
        toast(u.length ? `Salvo · recalculado em ${u.length} lugar(es) e nos produtos ligados` : "Item salvo");
      } else { db[tab].push({ id: uid(), ...vals }); toast("Item salvo"); }
    },
  });
}
function viewInsumos() {
  setActions(`<div class="search">${icon("search")}<input placeholder="Buscar item..." data-act="busca" value="${esc(ui.busca)}" /></div><button class="btn btn-primary" data-act="new-ins">${icon("plus")}Novo item</button>`);
  const q = ui.busca.toLowerCase();
  const lista = db[ui.insTab].filter((i) => i.nome.toLowerCase().includes(q));
  return `
  <div class="toolbar">${tabs(Object.entries(INS_TABS).map(([k, v]) => [k, `${v} <span class="badge b-gray">${db[k].length}</span>`]), ui.insTab, "set-instab")}</div>
  <div class="card">
    <div class="card-head"><div><h3>${INS_TABS[ui.insTab]}</h3><div class="sub">Custo unitário = custo de compra ÷ rendimento. Alterou aqui, recalcula fichas, kits, produtos, margens e DRE.</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Custo de compra</th><th class="num">Rendimento</th><th class="num">Custo unitário</th><th>Usado em</th><th></th></tr></thead>
    <tbody>${lista.map((i) => { const u = usoInsumo(ui.insTab, i); return `<tr><td>${esc(i.nome)}</td><td class="num">${brl(i.custo)}</td><td class="num">${int(i.rend)} ${esc(i.unid)}</td><td class="num"><b>${brlU(i.rend ? i.custo / i.rend : 0)}</b> <span class="hint">/${esc(i.unid)}</span></td>
      <td>${u.length ? `<span class="badge b-gold" title="${esc(u.join(" · "))}">${u.length} ${u.length === 1 ? "lugar" : "lugares"}</span> <span class="hint uso-lista">${esc(u.slice(0, 2).join(", "))}${u.length > 2 ? "…" : ""}</span>` : '<span class="hint">Não usado</span>'}</td>
      <td>${rowActions("ins", i.id)}</td></tr>`; }).join("") || '<tr><td colspan="6" class="empty">Nenhum item encontrado</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ---------- Embalagens ---------- */
const matUnid = (nome) => db.materiais.find((x) => x.nome === nome)?.unid || "un";
function usoKit(nome) { return db.produtos.filter((p) => p.itens?.some((i) => i.kit === nome)); }
function formEmbItem(e) {
  openForm({
    title: `Adicionar item · ${e.nome}`,
    fields: [
      { key: "material", label: "Material (da tela Insumos › Embalagens & materiais)", type: "select", options: db.materiais.map((m) => m.nome), full: true },
      { key: "qtd", label: "Quantidade por kit", type: "num", full: true },
    ],
    values: { qtd: 1 },
    preview: (v) => `<span>Custo do item</span><span>${brl((v.qtd || 0) * materialUnit(v.material))}</span>`,
    onSave: (v) => { e.itens.push({ material: v.material, qtd: v.qtd }); toast("Item adicionado ao kit"); },
  });
}
function viewEmbalagens() {
  return `<div class="toolbar"><span class="hint">Os preços vêm da tela <a class="link" href="#insumos">Insumos › Embalagens & materiais</a>. Altere as quantidades aqui — kits, produtos e margens se atualizam na hora.</span></div>
  <div class="grid g-3">${db.embalagens.map((e) => { const usados = usoKit(e.nome); return `
    <div class="card" data-kit="${e.id}"><div class="card-head"><div><h3>${esc(e.nome)}</h3><div class="sub">Usado em: ${esc(e.uso)}${usados.length ? ` · ${usados.length} produto(s)` : ""}</div></div>
      <button class="btn btn-ghost btn-sm" title="Adicionar item" data-act="emb-add" data-id="${e.id}">${icon("plus")}</button></div>
    <div class="table-wrap"><table class="compact"><tbody>
    ${e.itens.map((i, k) => `<tr><td>${esc(i.material)}<div class="hint">${brlU(materialUnit(i.material))}/${esc(matUnid(i.material))}</div></td>
      <td class="num">${numIn("emb-qtd", i.qtd, `data-id="${e.id}" data-i="${k}"`)} <span class="hint">${esc(matUnid(i.material))}</span></td>
      <td class="num" data-ek="${e.id}-${k}">${brl(kitItemValor(i))}</td>
      <td><button class="btn btn-ghost btn-sm btn-danger" data-act="emb-del" data-id="${e.id}" data-i="${k}">${icon("trash")}</button></td></tr>`).join("")}
    </tbody></table></div>
    <div class="recipe-total"><span>Custo por embalagem</span><span data-et="${e.id}">${brl(kitTotal(e.nome))}</span></div></div>`; }).join("")}</div>`;
}
function refreshKit(e) {
  e.itens.forEach((i, k) => { const el = document.querySelector(`[data-ek="${e.id}-${k}"]`); if (el) el.textContent = brl(kitItemValor(i)); });
  const t = document.querySelector(`[data-et="${e.id}"]`); if (t) t.textContent = brl(kitTotal(e.nome));
}

/* ---------- DRE ---------- */
const CATS_VAR = ["Insumos extras", "Embalagens", "Entrega / frete", "Comissões", "Taxas de cartão / apps", "Perdas", "Marketing por venda", "Outros"];
const mesAtual = () => new Date().getMonth() + 1;
function formCustoVar(c, area = "doces") {
  openForm({
    title: c ? "Editar custo variável" : "Novo custo variável",
    fields: [
      { key: "descricao", label: "Descrição", required: true, full: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATS_VAR },
      { key: "mes", label: "Mês de referência", type: "select", options: MESES_FULL },
      { key: "valor", label: "Valor (R$)", type: "num", full: true },
    ],
    values: c ? { ...c, mes: MESES_FULL[c.mes - 1] } : { categoria: CATS_VAR[0], mes: MESES_FULL[((area === "pacoca" ? ui.dreMesPac : ui.dreMes) || mesAtual()) - 1] },
    onSave: (v) => {
      const novo = { ...v, mes: MESES_FULL.indexOf(v.mes) + 1, ano: db.config.ano, area: c ? areaCV(c) : area };
      if (c) Object.assign(c, novo); else db.custosVar.push({ id: uid(), ...novo });
      toast("Custo variável salvo");
    },
  });
}
// Linhas do DRE de uma área com a parte dela nos impostos do negócio (colunas trazem c.rat = rateioImpostos)
function linhasImpostos(area) {
  const nome = area === "pacoca" ? "da paçoca" : "dos doces";
  return [
    { t: `(−) IMPOSTOS E CONTABILIDADE (parte ${nome})`, f: (r, c) => -c.rat.total, cls: "total" },
    { t: `   DAS ${pct(dasPct())} sobre o faturamento`, f: (r, c) => -c.rat.das },
    ...(impGerais().fixos || []).map((f, i) => ({ t: `   ${f.nome} (rateio)`, f: (r, c) => -c.rat.itens[i].valor })),
    { t: `   Parte ${nome} em ${(impGerais().fixos || []).map((f) => f.nome).join(" e ") || "fixos"}`, f: (r, c) => c.rat.share * 100, pct: true },
  ];
}
function viewDre() {
  const todos = mesesComDados("doces");
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Mês de referência
    <select class="inline" data-act="set-dremes"><option value="0">Todos os meses</option>
    ${MESES_FULL.map((n, i) => `<option value="${i + 1}" ${ui.dreMes === i + 1 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <button class="btn btn-primary" data-act="new-cvar">${icon("plus")}Custo variável</button>`);
  const meses = ui.dreMes ? [ui.dreMes] : todos;
  const cols = meses.map((m) => ({ label: MESES_FULL[m - 1], r: resumo(m, "doces"), rat: rateioImpostos(m, "doces") }));
  const totalFixos = sum(db.fixos, (f) => +f.valor || 0);
  if (!ui.dreMes) cols.push({ label: "Total", r: resumo(0, "doces"), rat: rateioImpostos(0, "doces"), total: true });
  const nFix = (c) => (c.total ? meses.length : 1);
  const catsUsadas = CATS_VAR.filter((cat) => db.custosVar.some((c) => areaCV(c) === "doces" && c.categoria === cat && (!ui.dreMes || +c.mes === ui.dreMes)));
  const linhas = [
    { t: "RECEITA BRUTA", f: (r) => r.receita, cls: "total" },
    ...CANAIS_VENDA.map((c) => ({ t: "   " + c, f: (r) => r.porCanal[c] || 0 })),
    { t: "(−) DESPESAS VARIÁVEIS", f: (r) => -(r.custos), cls: "total" },
    { t: "   Insumos e materiais", f: (r) => -r.insumos },
    { t: "   Gasolina / logística", f: (r) => -r.gasolina },
    { t: "   Comissões e mão de obra", f: (r) => -r.comissoes },
    { t: "   Perdas e outras", f: (r) => -r.perdas },
    ...(perdasDe("doces").length ? [{ t: "      das quais perdas registradas (tela Perdas) · informativo, já incluído acima", f: (r) => r.perdasEst, info: true }] : []),
    ...catsUsadas.map((cat) => ({ t: "   " + cat + " (lançado)", f: (r) => -sum(r.cvs.filter((c) => c.categoria === cat), (c) => +c.valor || 0) })),
    { t: "(=) LUCRO BRUTO (margem de contribuição)", f: (r) => r.lucro, cls: "total" },
    { t: "   Margem de contribuição %", f: (r) => (r.receita ? (r.lucro / r.receita) * 100 : 0), pct: true },
    ...linhasImpostos("doces"),
    { t: "(−) DESPESAS FIXAS", f: (r, c) => -(totalFixos * nFix(c)), cls: "total" },
    { t: "(=) RESULTADO OPERACIONAL", f: (r, c) => r.lucro - c.rat.total - totalFixos * nFix(c), cls: "result" },
    { t: "   Margem líquida %", f: (r, c) => (r.receita ? ((r.lucro - c.rat.total - totalFixos * nFix(c)) / r.receita) * 100 : 0), pct: true },
  ];
  const cvLista = db.custosVar.filter((c) => areaCV(c) === "doces" && (!ui.dreMes || +c.mes === ui.dreMes)).sort((a, b) => a.mes - b.mes);
  return `
  <div class="card"><div class="card-head"><div><h3>DRE ${db.config.ano}${ui.dreMes ? " · " + MESES_FULL[ui.dreMes - 1] : ""}</h3><div class="sub">Doces finos · vendas + custos variáveis lançados + despesas fixas</div></div></div>
    <div class="table-wrap"><table class="dre"><thead><tr><th>Descrição</th>${cols.map((c) => `<th class="num">${c.label}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l) => `<tr class="${l.cls || ""}${l.info ? " row-off" : ""}"><td>${l.t.replace(/^ +/, (s) => "&nbsp;".repeat(s.length * 2))}</td>${cols.map((c) => { const v = l.f(c.r, c); return `<td class="num ${!l.cls && !l.pct && !l.info && v < 0 ? "neg" : ""}">${l.pct ? pct(v) : brl(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Custos variáveis lançados${ui.dreMes ? " · " + MESES_FULL[ui.dreMes - 1] : ""}</h3><div class="sub">Gastos que variam com as vendas e não estão nos lançamentos semanais — entram no DRE pelo mês de referência</div></div>
    <button class="btn btn-sm btn-primary" data-act="new-cvar">${icon("plus")}Adicionar</button></div>
    ${cvLista.length ? `<div class="table-wrap"><table><thead><tr><th>Mês de referência</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${cvLista.map((c) => `<tr><td>${MESES_FULL[c.mes - 1]}</td><td>${esc(c.descricao)}</td><td><span class="badge b-gray">${esc(c.categoria)}</span></td><td class="num">${brl(c.valor)}</td><td>${rowActions("cvar", c.id)}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="3">Total</td><td class="num">${brl(sum(cvLista, (c) => +c.valor || 0))}</td><td></td></tr></tfoot></table></div>`
    : `<div class="empty">Nenhum custo variável lançado${ui.dreMes ? " em " + MESES_FULL[ui.dreMes - 1] : ""}.<br/><br/><button class="btn btn-primary" data-act="new-cvar">${icon("plus")}Lançar custo variável</button></div>`}
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Despesas fixas mensais</h3><div class="sub">Entram no DRE em todos os meses com movimento</div></div><button class="btn btn-sm" data-act="new-fixo">${icon("plus")}Adicionar</button></div>
      ${db.fixos.map((f) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px) 34px"><span>${esc(f.nome)}</span><input inputmode="decimal" data-act="set-fixo" data-id="${f.id}" value="${String(f.valor || "").replace(".", ",")}" placeholder="0,00" />
        <button class="btn btn-ghost btn-sm btn-danger" data-act="del-fixo" data-id="${f.id}">${icon("trash")}</button></div>`).join("")}
      <div class="recipe-total" style="padding-top:14px"><span>Total por mês</span><span>${brl(totalFixos)}</span></div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Resultado operacional por mês</h3><div class="sub">Lucro bruto − despesas fixas</div></div></div>
      <div class="chart-box sm"><canvas id="chDre"></canvas></div>
    </div>
  </div>`;
}
function afterDre() {
  const meses = mesesComDados("doces");
  const tf = sum(db.fixos, (f) => +f.valor || 0);
  chart("chDre", {
    type: "line",
    data: { labels: meses.map((m) => MESES[m - 1]), datasets: [{ label: "Resultado", data: meses.map((m) => resumo(m, "doces").lucro - rateioImpostos(m, "doces").total - tf), borderColor: "#306c62", backgroundColor: "rgba(197, 160, 89,.18)", fill: true, tension: .35 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipBRL }, scales: { y: { ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { grid: { display: false } } } },
  });
}

/* ---------- Simulador unificado (doces + paçoca) ---------- */
function viewSimGeral() {
  const d = gastosSimDoces(), p = gastosSimPacoca(), SEM = 52 / 12;
  const totD = sum(d.linhas, (l) => l.mes), totP = sum(p.linhas, (l) => l.mes);
  const lucD = d.recMes - totD, lucP = p.recMes - totP, rec = d.recMes + p.recMes, luc = lucD + lucP;
  const semParte = (n) => n.replace(/ \(parte [^)]*\)$/, "");
  const grupos = [...ORDEM_GASTOS.filter((o) => [...d.linhas, ...p.linhas].some((l) => l.grupo === o)), ...new Set([...d.linhas, ...p.linhas].map((l) => l.grupo).filter((x) => !ORDEM_GASTOS.includes(x)))];
  const tot = (ls, gr, nome) => sum(ls.filter((l) => l.grupo === gr && (!nome || semParte(l.nome) === nome)), (l) => l.mes);
  const cel = (v, neg = true) => `<td class="num ${neg && v ? "neg" : ""}">${neg && v ? "−" : ""}${brl(Math.abs(v))}</td>`;
  const linha = (cls, nome, vd, vp, neg = true) => `<tr class="${cls}"><td>${nome}</td>${cel(vd, neg)}${cel(vp, neg)}${cel(vd + vp, neg)}<td class="num ${neg && vd + vp ? "neg" : ""}">${neg && vd + vp ? "−" : ""}${brl(Math.abs(vd + vp) / SEM)}</td><td class="num hint">${rec ? pct((Math.abs(vd + vp) / rec) * 100) : "—"}</td></tr>`;
  const cartao = (titulo, g, lucro, href, cor, resumo) => `<div class="card" style="border-top:4px solid ${cor}"><div class="card-head"><div><h3>${titulo}</h3><div class="sub">${resumo}</div></div><a class="btn btn-sm" href="#${href}">Ajustar vendas</a></div>
    <ul class="recipe-ings">
      <li><span>Faturamento no mês</span><span></span><span><b>${brl(g.recMes)}</b></span></li>
      <li><span>Gastos no mês</span><span></span><span class="neg">−${brl(sum(g.linhas, (l) => l.mes))}</span></li>
      <li><span><b>Lucro líquido</b></span><span class="hint">${brl(lucro / g.div)}/${g.periodo === "semana" ? "semana" : "dia"}</span><span class="${lucro >= 0 ? "pos" : "neg"}"><b>${brl(lucro)}</b></span></li>
    </ul></div>`;
  const qtdDoces = sum(db.produtos.filter((x) => x.canal === db.sim.canal), (x) => +db.sim.qtd[x.id] || 0);
  return `<div class="grid g-21">
    <div class="grid g-2" style="align-content:start">
      ${cartao("Doces finos", d, lucD, "simulador", AREAS.doces.cor, `${int(qtdDoces)} itens/semana · ${esc(db.sim.canal)} · ${int(d.semanas)} semanas`)}
      ${cartao("Paçoca", p, lucP, "simulador-pacoca", AREAS.pacoca.cor, `${int(db.pacocaSim.porDia)} pacotes/dia · ${int(db.pacocaSim.dias)} dias`)}
    </div>
    <div class="card"><div class="big-result"><small>Lucro líquido previsto no mês · negócio todo</small><div>${brl(luc)}</div><small>${brl(luc / SEM)} por semana · faturamento de ${brl(rec)}</small></div>
      <div class="grid g-2 mt" style="gap:12px">
        <div class="stat"><small>Total de gastos no mês</small><strong>${brl(totD + totP)}</strong></div>
        <div class="stat"><small>Margem líquida</small><strong class="${luc >= 0 ? "pos" : "neg"}">${pct(rec ? (luc / rec) * 100 : 0)}</strong></div>
      </div></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Quanto você vai gastar · negócio todo</h3><div class="sub">Soma dos dois simuladores. Impostos com os valores reais: DAS sobre cada faturamento e DARF/contabilidade inteiros (metade em cada área). Semana = média de ${fmtQtd(Math.round(SEM * 100) / 100)} semanas por mês.</div></div></div>
    <div class="table-wrap"><table class="dre"><thead><tr><th>Gasto</th><th class="num">Doces (mês)</th><th class="num">Paçoca (mês)</th><th class="num">Total no mês</th><th class="num">Por semana</th><th class="num">% do faturamento</th></tr></thead><tbody>
      ${linha("total", "FATURAMENTO", d.recMes, p.recMes, false)}
      ${grupos.map((gr) => {
        const nomes = gr === "Impostos" || gr === "Despesas fixas" ? [...new Set([...d.linhas, ...p.linhas].filter((l) => l.grupo === gr).map((l) => semParte(l.nome)))] : [];
        return linha("total", gr.toUpperCase(), tot(d.linhas, gr), tot(p.linhas, gr)) + nomes.map((n) => linha("", "&nbsp;&nbsp;&nbsp;&nbsp;" + esc(n), tot(d.linhas, gr, n), tot(p.linhas, gr, n))).join("");
      }).join("")}
      ${linha("total", "TOTAL DE GASTOS", totD, totP)}
      <tr class="result"><td>(=) LUCRO LÍQUIDO</td><td class="num">${brl(lucD)}</td><td class="num">${brl(lucP)}</td><td class="num">${brl(luc)}</td><td class="num">${brl(luc / SEM)}</td><td class="num">${rec ? pct((luc / rec) * 100) : "—"}</td></tr>
    </tbody></table></div></div>`;
}

/* ---------- Painel unificado (doces + paçoca) ---------- */
// Resultado do mês (0 = ano) do negócio ou de uma área: lucro bruto − impostos/contabilidade − despesas fixas
function resultadoArea(m, area) {
  const r = resumo(m, area), rat = rateioImpostos(m, area);
  const nMeses = m ? 1 : mesesComDados(area).length;
  const fixos = (area === "pacoca" ? 0 : sum(db.fixos, (f) => +f.valor || 0)) + (area === "doces" ? 0 : sum(db.fixosPacoca, (f) => +f.valor || 0));
  const res = r.lucro - rat.total - fixos * nMeses;
  return { r, rat, fixos: fixos * nMeses, res, margem: r.receita ? (res / r.receita) * 100 : 0 };
}
function alertasGerais() {
  const out = [], hoje = hojeISO();
  const pend = db.pagamentos.filter((p) => p.tipo === "pagar" && !p.pago);
  const venc = pend.filter((p) => p.vencimento && p.vencimento < hoje);
  const em7 = pend.filter((p) => { const d = new Date(hoje + "T12:00:00"); d.setDate(d.getDate() + 7); return p.vencimento >= hoje && p.vencimento <= d.toISOString().slice(0, 10); });
  if (venc.length) out.push({ tipo: "red", t: `${venc.length} conta(s) vencida(s): ${brl(sum(venc, (p) => +p.valor || 0))}`, d: "Veja em Pagamentos e marque as que já foram pagas." });
  if (em7.length) out.push({ tipo: "yellow", t: `${em7.length} conta(s) vencem nos próximos 7 dias: ${brl(sum(em7, (p) => +p.valor || 0))}`, d: em7.slice(0, 3).map((p) => `${ddmm(p.vencimento)} ${p.descricao}`).join(" · ") });
  const pb = pedidoBase(), comprar = itensEstoque("doces").filter((i) => pb.faltam.includes(i.ref));
  if (comprar.length) out.push({ tipo: "red", t: `Doces: comprar ${comprar.length} item(ns) — o estoque faz ${int(pb.capacidade)} de ${int(pb.n)} caixas`, d: comprar.slice(0, 4).map((i) => i.nome).join(", ") });
  const cobP = coberturaPacoca(), comprarP = itensEstoque("pacoca").filter((i) => cobP.faltam.includes(i.ref));
  if (comprarP.length) out.push({ tipo: "red", t: `Paçoca: comprar ${comprarP.length} item(ns) — o estoque cobre ${fmtQtd(Math.floor(cobP.diasCobre * 10) / 10)} de ${int(cobP.dias)} dias (${fmtQtd(cobP.semanas)} semanas)`, d: `${comprarP.map((i) => i.nome).join(", ")} · meta de ${int(cobP.porDia)} pacotes/dia` });
  const estP = alertasEstoque("pacoca").filter((i) => !cobP.faltam.includes(i.ref));
  if (estP.length) out.push({ tipo: "yellow", t: `Paçoca: ${estP.length} item(ns) do estoque em alerta`, d: estP.slice(0, 4).map((i) => i.nome).join(", ") });
  const lista = db.pacoca.filter((p) => !ui.mes || monthOf(p.data) === ui.mes);
  const esp = sum(lista, esperadoPac), nr = sum(lista, naoRecPac), taxa = esp ? (nr / esp) * 100 : 0;
  if (esp) out.push(taxa > naoRecPctPacoca()
    ? { tipo: "red", t: `Paçoca: ${brl(nr)} não recebidos (${pct(taxa)})`, d: `Acima da previsão de ${pct(naoRecPctPacoca())} de não recebimento (pix confiança).` }
    : { tipo: "green", t: `Paçoca: não recebido em ${pct(taxa)}`, d: `Dentro da previsão de ${pct(naoRecPctPacoca())}.` });
  alertas().filter((a) => a.tipo === "red").slice(0, 3).forEach((a) => out.push({ ...a, t: "Doces: " + a.t }));
  return out.length ? out : [{ tipo: "green", t: "Tudo em dia", d: "Nenhum ponto de atenção no momento." }];
}
function viewPainelGeral() {
  setActions(mesSelect(ui.mes, "set-mes"));
  const per = ui.mes ? MESES_FULL[ui.mes - 1] : "Todo o período";
  const g = resultadoArea(ui.mes), d = resultadoArea(ui.mes, "doces"), p = resultadoArea(ui.mes, "pacoca");
  const share = (x) => (g.r.receita ? (x.r.receita / g.r.receita) * 100 : 0);
  const cartaoArea = (nome, x, href, cor) => `<div class="card" style="border-top:4px solid ${cor}"><div class="card-head"><div><h3>${nome}</h3><div class="sub">${per} · ${pct(share(x))} do faturamento</div></div><a class="btn btn-sm" href="#${href}">Abrir painel</a></div>
    <ul class="recipe-ings">
      <li><span>Faturamento</span><span></span><span><b>${brl(x.r.receita)}</b></span></li>
      <li><span>Custos variáveis</span><span></span><span class="neg">−${brl(x.r.custos)}</span></li>
      <li><span>Impostos e contabilidade (parte da área)</span><span></span><span class="neg">−${brl(x.rat.total)}</span></li>
      ${x.fixos ? `<li><span>Despesas fixas</span><span></span><span class="neg">−${brl(x.fixos)}</span></li>` : ""}
      <li><span><b>Resultado</b></span><span class="hint">margem ${pct(x.margem)}</span><span class="${x.res >= 0 ? "pos" : "neg"}"><b>${brl(x.res)}</b></span></li>
    </ul></div>`;
  const meses = mesesComDados();
  const pend = db.pagamentos.filter((x) => x.tipo === "pagar" && !x.pago).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));
  return `
  <div class="grid g-4">
    ${kpi("Faturamento", brl(g.r.receita), `${per} · doces + paçoca`, "money")}
    ${kpi("Lucro bruto", brl(g.r.lucro), `Custos variáveis: ${brl(g.r.custos)}`, "wallet", g.r.lucro >= 0 ? "pos" : "neg")}
    ${kpi("Impostos e contabilidade", brl(g.rat.total), `DAS ${brl(g.rat.das)} · fixos ${brl(g.rat.fixos)}`, "alert", "neg")}
    ${kpi("Resultado líquido", brl(g.res), `Margem de ${pct(g.margem)}`, "percent", g.res >= 0 ? "pos" : "neg")}
  </div>
  <div class="grid g-2 mt">${cartaoArea("Doces finos", d, "painel", AREAS.doces.cor)}${cartaoArea("Paçoca", p, "pacoca-painel", AREAS.pacoca.cor)}</div>
  <div class="grid g-21 mt">
    <div class="card"><div class="card-head"><div><h3>Faturamento por área e resultado</h3><div class="sub">Mês a mês · resultado já descontando impostos e despesas fixas</div></div></div><div class="chart-box"><canvas id="chGerMes"></canvas></div></div>
    <div class="card"><div class="card-head"><div><h3>Participação no faturamento</h3><div class="sub">${per}</div></div></div>
      ${g.r.receita ? '<div class="chart-box"><canvas id="chGerArea"></canvas></div>' : '<div class="empty">Sem vendas no período</div>'}</div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Pontos de atenção</h3><div class="sub">Doces, paçoca, estoque e contas a pagar</div></div></div>
      <div class="alert-list">${alertasGerais().map((a) => `<div class="alert ${a.tipo}">${icon(a.tipo === "green" ? "check" : "alert")}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></div>`).join("")}</div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Próximas contas a pagar</h3><div class="sub">${pend.length} pendente(s) · ${brl(sum(pend, (x) => +x.valor || 0))}</div></div><a class="btn btn-sm" href="#pagamentos-geral">Ver pagamentos</a></div>
      ${pend.length ? `<div class="table-wrap"><table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Área</th><th class="num">Valor</th></tr></thead><tbody>
      ${pend.slice(0, 8).map((x) => { const s = situacaoPag(x); return `<tr><td>${x.vencimento ? ddmm(x.vencimento) : "—"} <span class="badge b-${s.c}">${s.t}</span></td><td>${esc(x.descricao)}</td><td class="hint">${AREA_LABEL[x.area] || ""}</td><td class="num"><b>${brl(x.valor)}</b></td></tr>`; }).join("")}
      </tbody></table></div>` : '<div class="empty">Nenhuma conta pendente.</div>'}
    </div>
  </div>
  ${meses.length ? `<div class="card mt"><div class="card-head"><div><h3>Resumo por mês</h3><div class="sub">Doces + paçoca, com impostos e despesas fixas</div></div><a class="btn btn-sm" href="#dre-geral">Ver DRE unificado</a></div>
    <div class="table-wrap"><table><thead><tr><th>Mês</th><th class="num">Doces</th><th class="num">Paçoca</th><th class="num">Faturamento</th><th class="num hide-m">Custos variáveis</th><th class="num hide-m">Impostos</th><th class="num">Resultado</th><th class="num">Margem</th></tr></thead>
    <tbody>${meses.map((m) => { const x = resultadoArea(m); return `<tr class="${ui.mes === m ? "row-sel" : ""}"><td><b>${MESES_FULL[m - 1]}</b></td><td class="num">${brl(resumo(m, "doces").receita)}</td><td class="num">${brl(resumo(m, "pacoca").receita)}</td><td class="num"><b>${brl(x.r.receita)}</b></td>
      <td class="num hide-m">${brl(x.r.custos)}</td><td class="num hide-m">${brl(x.rat.total)}</td><td class="num ${x.res >= 0 ? "pos" : "neg"}"><b>${brl(x.res)}</b></td><td class="num">${pct(x.margem)}</td></tr>`; }).join("")}</tbody>
    <tfoot>${(() => { const x = resultadoArea(0); return `<tr><td>Total</td><td class="num">${brl(resumo(0, "doces").receita)}</td><td class="num">${brl(resumo(0, "pacoca").receita)}</td><td class="num">${brl(x.r.receita)}</td><td class="num hide-m">${brl(x.r.custos)}</td><td class="num hide-m">${brl(x.rat.total)}</td><td class="num">${brl(x.res)}</td><td class="num">${pct(x.margem)}</td></tr>`; })()}</tfoot></table></div>
  </div>` : ""}`;
}
function afterPainelGeral() {
  const meses = mesesComDados();
  chart("chGerMes", {
    type: "bar",
    data: { labels: meses.map((m) => MESES[m - 1]), datasets: [
      { label: "Doces", data: meses.map((m) => resumo(m, "doces").receita), backgroundColor: AREAS.doces.cor, borderRadius: 6, maxBarThickness: 46, stack: "fat" },
      { label: "Paçoca", data: meses.map((m) => resumo(m, "pacoca").receita), backgroundColor: AREAS.pacoca.cor, borderRadius: 6, maxBarThickness: 46, stack: "fat" },
      { label: "Resultado", type: "line", data: meses.map((m) => resultadoArea(m).res), borderColor: "#306c62", backgroundColor: "#306c62", tension: 0.35 },
    ] },
    options: { maintainAspectRatio: false, plugins: { tooltip: tooltipBRL }, scales: { y: { stacked: true, ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { stacked: true, grid: { display: false } } } },
  });
  const d = resumo(ui.mes, "doces").receita, p = resumo(ui.mes, "pacoca").receita;
  chart("chGerArea", {
    type: "doughnut",
    data: { labels: ["Doces", "Paçoca"], datasets: [{ data: [d, p], backgroundColor: [AREAS.doces.cor, AREAS.pacoca.cor], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${brl(c.parsed)}` } } } },
  });
}

/* ---------- DRE unificado (doces + paçoca) ---------- */
function viewDreGeral() {
  const todos = mesesComDados();
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Mês de referência
    <select class="inline" data-act="set-dremesger"><option value="0">Todos os meses</option>
    ${MESES_FULL.map((n, i) => `<option value="${i + 1}" ${ui.dreMesGer === i + 1 ? "selected" : ""}>${n}</option>`).join("")}</select></label>`);
  const meses = ui.dreMesGer ? [ui.dreMesGer] : todos;
  const col = (m, total) => ({ m, total, d: resumo(m, "doces"), p: resumo(m, "pacoca"), g: resumo(m), rat: rateioImpostos(m) });
  const cols = meses.map((m) => ({ label: MESES_FULL[m - 1], ...col(m) }));
  if (!ui.dreMesGer) cols.push({ label: "Total", ...col(0, true) });
  const fD = sum(db.fixos, (f) => +f.valor || 0), fP = sum(db.fixosPacoca, (f) => +f.valor || 0), nFix = (c) => (c.total ? meses.length : 1);
  const res = (c) => c.g.lucro - c.rat.total - (fD + fP) * nFix(c);
  const fixos = impGerais().fixos || [];
  const linhas = [
    { t: "RECEITA BRUTA", f: (c) => c.g.receita, cls: "total" },
    { t: "   Doces finos", f: (c) => c.d.receita },
    { t: "   Paçoca", f: (c) => c.p.receita },
    { t: "(−) DESPESAS VARIÁVEIS", f: (c) => -c.g.custos, cls: "total" },
    { t: "   Doces finos", f: (c) => -c.d.custos },
    { t: "   Paçoca", f: (c) => -c.p.custos },
    { t: "      dos quais imposto NF-e da paçoquita · informativo, já incluído acima", f: (c) => c.p.impostos, info: true },
    ...((db.perdas || []).length ? [{ t: "      dos quais perdas registradas (doces + paçoca) · informativo, já incluído acima", f: (c) => c.g.perdasEst, info: true }] : []),
    { t: "(=) LUCRO BRUTO", f: (c) => c.g.lucro, cls: "total" },
    { t: "(−) IMPOSTOS E CONTABILIDADE", f: (c) => -c.rat.total, cls: "total" },
    { t: `   DAS ${pct(dasPct())} sobre o faturamento bruto`, f: (c) => -c.rat.das },
    ...fixos.map((f, i) => ({ t: "   " + f.nome, f: (c) => -c.rat.itens[i].valor })),
    { t: "(−) DESPESAS FIXAS DAS ÁREAS", f: (c) => -(fD + fP) * nFix(c), cls: "total" },
    { t: "   Doces finos", f: (c) => -fD * nFix(c) },
    { t: "   Paçoca", f: (c) => -fP * nFix(c) },
    { t: "(=) RESULTADO DO NEGÓCIO", f: res, cls: "result" },
    { t: "   Margem líquida %", f: (c) => (c.g.receita ? (res(c) / c.g.receita) * 100 : 0), pct: true },
  ];
  // Rateio do mês escolhido (ou do ano) entre as áreas
  const mR = ui.dreMesGer || 0, rD = rateioImpostos(mR, "doces"), rP = rateioImpostos(mR, "pacoca"), rG = rateioImpostos(mR);
  const fatD = resumo(mR, "doces").receita, fatP = resumo(mR, "pacoca").receita;
  const linhaRateio = (nome, fat, r) => `<tr><td><b>${nome}</b></td><td class="num">${brl(fat)}</td><td class="num">${pct(r.share * 100)}</td><td class="num">${brl(r.das)}</td>
    ${r.itens.map((x) => `<td class="num">${brl(x.valor)}</td>`).join("")}<td class="num"><b>${brl(r.total)}</b></td><td class="num">${pct(fat ? (r.total / fat) * 100 : 0)}</td></tr>`;
  const regra = rateioPorFaturamento() ? "pela participação no faturamento" : `${fmtQtd(pctFixosDoces())}% doces / ${fmtQtd(100 - pctFixosDoces())}% paçoca`;
  const exProd = db.produtos.find((p) => p.canal === "Outbound" && /9un/.test(p.nome)) || db.produtos[0];
  const recPacote = (+db.config.precoPacoca || 0) * (1 - naoRecPctPacoca() / 100);
  return `
  <div class="card"><div class="card-head"><div><h3>DRE unificado ${db.config.ano}${ui.dreMesGer ? " · " + MESES_FULL[ui.dreMesGer - 1] : ""}</h3><div class="sub">Doces finos + paçoca, com os impostos e a contabilidade do negócio</div></div></div>
    <div class="table-wrap"><table class="dre"><thead><tr><th>Descrição</th>${cols.map((c) => `<th class="num">${c.label}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l) => `<tr class="${l.cls || ""}${l.info ? " row-off" : ""}"><td>${l.t.replace(/^ +/, (s) => "&nbsp;".repeat(s.length * 2))}</td>${cols.map((c) => { const v = l.f(c); return `<td class="num ${!l.cls && !l.pct && !l.info && v < 0 ? "neg" : ""}">${l.pct ? pct(v) : brl(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Relatório de pagamentos · ${ui.dreMesGer ? `vencimentos de ${MESES_FULL[ui.dreMesGer - 1]}` : "todos os vencimentos"}</h3><div class="sub">O que doces e paçoca separaram, o que já foi pago e o que falta pagar. O pagamento é marcado em Negócio todo › Pagamentos.</div></div><a class="btn btn-sm btn-primary" href="#pagamentos-geral">Pagar contas</a></div>
    ${relatorioPagamentosHtml(ui.dreMesGer)}</div>
  <div class="card mt"><div class="card-head"><div><h3>Divisão dos impostos entre as áreas · ${mR ? MESES_FULL[mR - 1] : "ano todo"}</h3><div class="sub">DAS sobre o faturamento de cada área; ${esc(fixos.map((f) => f.nome).join(" e ") || "valores fixos")} divididos ${regra}. É essa parte que aparece no DRE de cada área.</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Área</th><th class="num">Faturamento</th><th class="num">Parte nos fixos</th><th class="num">DAS</th>${fixos.map((f) => `<th class="num">${esc(f.nome)}</th>`).join("")}<th class="num">Total</th><th class="num">% do faturamento</th></tr></thead>
    <tbody>${linhaRateio("Doces finos", fatD, rD)}${linhaRateio("Paçoca", fatP, rP)}</tbody>
    <tfoot>${linhaRateio("Negócio todo", fatD + fatP, rG).replace(/<\/?b>/g, "")}</tfoot></table></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Impostos e contabilidade</h3><div class="sub">Valores do negócio todo · geram as contas a pagar automaticamente</div></div><button class="btn btn-sm" data-act="ig-add">${icon("plus")}Adicionar</button></div>
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(50px,90px) auto"><span><b>DAS</b> <span class="hint">% sobre o faturamento bruto</span></span>${numIn("ig-das", dasPct())}<label class="hint" style="display:flex;gap:4px;align-items:center;white-space:nowrap">dia ${numIn("ig-dasdia", +impGerais().dasDia || 20, `style="width:56px"`)}</label></div>
      ${fixos.map((f) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(55px,100px) auto 34px">
        <input data-act="ig-nome" data-id="${f.id}" value="${esc(f.nome)}" style="text-align:left" />${numIn("ig-val", f.valor, `data-id="${f.id}"`)}
        <label class="hint" style="display:flex;gap:4px;align-items:center;white-space:nowrap">dia ${numIn("ig-dia", +f.dia || 10, `data-id="${f.id}" style="width:56px"`)}</label>
        <button class="btn btn-ghost btn-sm btn-danger" data-act="ig-del" data-id="${f.id}">${icon("trash")}</button></div>
        <label class="hint" style="display:flex;gap:6px;align-items:center;margin:-4px 0 8px"><input type="checkbox" data-act="ig-seguinte" data-id="${f.id}" ${f.mesSeguinte ? "checked" : ""} style="width:auto" /> Referente ao mês anterior (vence no mês seguinte)</label>`).join("")}
      <div class="recipe-total" style="padding-top:14px"><span>Fixos por mês</span><span>${brl(fixosGeraisTot())}</span></div>
      <div class="sim-row quebra-m" style="grid-template-columns:minmax(0,1fr) auto${rateioPorFaturamento() ? "" : " auto"};border:0"><span>Divisão dos fixos entre as áreas</span>
        <select class="inline" data-act="ig-modo"><option value="fixo" ${rateioPorFaturamento() ? "" : "selected"}>Percentual fixo</option><option value="faturamento" ${rateioPorFaturamento() ? "selected" : ""}>Pelo faturamento do mês</option></select>
        ${rateioPorFaturamento() ? "" : `<label class="hint" style="display:flex;gap:4px;align-items:center;white-space:nowrap">doces ${numIn("ig-pctdoces", pctFixosDoces(), `style="width:56px"`)}%</label>`}</div>
      ${rateioPorFaturamento() ? "" : `<div class="hint">Paçoca fica com ${fmtQtd(100 - pctFixosDoces())}%.</div>`}
      <div class="hint" style="margin-top:8px">O DAS de cada mês vence no dia escolhido do mês seguinte (ex.: outubro vence em 20/11). Os fixos marcados como "referente ao mês anterior" também; os demais vencem no próprio mês.</div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Impostos dentro do preço</h3><div class="sub">"Derretidos" no custo de cada produto e de cada pacote de paçoca</div></div></div>
      ${["doces", "pacoca"].map((a) => `<div class="vend-sec">${a === "doces" ? "Doces finos" : "Paçoca"}</div>
      <ul class="recipe-ings">
        <li><span>DAS</span><span></span><span>${pct(dasPct())}</span></li>
        <li><span>Parte em ${esc(fixos.map((f) => f.nome).join(" + ") || "fixos")}</span><span class="hint">${brl(fixosMesArea(a))} ÷ ${brl(faturamentoMedioMensal(a))}/mês</span><span>${pct(cargaFixosPct(a))}</span></li>
        <li><span><b>Carga sobre o preço</b></span><span class="hint">${a === "doces" ? (exProd ? `${esc(exProd.nome)}: ${brl((exProd.preco * cargaImpostosPct(a)) / 100)}` : "") : `pacote: ${brl(impostoVendaPacote())} de ${brl(recPacote)} recebido`}</span><span><b>${pct(cargaImpostosPct(a))}</b></span></li>
      </ul>`).join("")}
      <div class="hint" style="margin-top:8px">Faturamento médio de cada área nos últimos 3 meses com vendas. Esse percentual entra no custo em Produtos &amp; Preços, no simulador e no custo do pacote da paçoca.</div>
    </div>
  </div>`;
}

/* ---------- Paçoca · Painel ---------- */
function viewPacPainel() {
  setActions(mesSelect(ui.mes, "set-mes", "pacoca"));
  const lista = db.pacoca.filter((p) => !ui.mes || monthOf(p.data) === ui.mes);
  const cvPac = resumo(ui.mes, "pacoca").custosVar;
  const qtd = sum(lista, (p) => +p.qtd || 0), rec = sum(lista, recPac), luc = sum(lista, lucroPac) - cvPac, nr = sum(lista, naoRecPac), esp = sum(lista, esperadoPac);
  const taxa = esp ? (nr / esp) * 100 : 0;
  const meses = mesesComDados("pacoca");
  const melhor = [...lista].sort((a, b) => lucroPac(b) - lucroPac(a))[0];
  const cu = custoUnitPacoca();
  const al = [];
  const meta = naoRecPctPacoca();
  if (taxa > meta) al.push({ tipo: "red", t: `${brl(nr)} não recebidos (${pct(taxa)} do esperado)`, d: `Acima da previsão de ${pct(meta)} de não recebimento (pix confiança). Diferença entre pacotes entregues × preço e o que entrou no caixa.` });
  else al.push({ tipo: "green", t: `Não recebido em ${pct(taxa)} — dentro da previsão de ${pct(meta)}`, d: `${brl(nr)} entregues e ainda não pagos (pix confiança).` });
  if (db.config.precoPacoca && cu / db.config.precoPacoca > 0.3) al.push({ tipo: "yellow", t: `Custo por paçoca em ${brl(cu)}`, d: `Representa ${pct((cu / db.config.precoPacoca) * 100)} do preço de venda.` });
  const cobP = coberturaPacoca(), comprarP = itensEstoque("pacoca").filter((i) => cobP.faltam.includes(i.ref));
  if (comprarP.length) al.push({ tipo: "red", t: `Comprar: ${comprarP.map((i) => i.nome).join(", ")}`, d: `O estoque cobre ${fmtQtd(Math.floor(cobP.diasCobre * 10) / 10)} de ${int(cobP.dias)} dias: ${fmtQtd(cobP.semanas)} semanas (uma vendendo + uma em produção) de ${int(cobP.porDia)} pacotes/dia. Veja a tela Estoque.` });
  const estP = alertasEstoque("pacoca").filter((i) => !cobP.faltam.includes(i.ref));
  if (estP.length) al.push({ tipo: "yellow", t: `Estoque baixo: ${estP.map((i) => i.nome).join(", ")}`, d: "Abaixo do mínimo definido na tela Estoque." });
  if (melhor) al.push({ tipo: "green", t: `Melhor dia: ${ddmm(melhor.data)}`, d: `${int(melhor.qtd)} pacotes vendidos e ${brl(lucroPac(melhor))} de lucro.` });
  return `
  <div class="grid g-4">
    ${kpi("Pacotes vendidos", int(qtd), `${lista.length} dia(s) de venda · média ${int(lista.length ? qtd / lista.length : 0)}/dia`, "cart")}
    ${kpi("Recebido", brl(rec), `Esperado: ${brl(esp)}`, "money")}
    ${kpi("Lucro", brl(luc), rec ? `Margem de ${pct((luc / rec) * 100)}` : "", "wallet", luc >= 0 ? "pos" : "neg")}
    ${kpi("Não recebido", brl(nr), `<span class="badge ${taxa > naoRecPctPacoca() ? "b-red" : "b-green"}">${pct(taxa)} do esperado · previsão ${pct(naoRecPctPacoca())}</span>`, "alert", nr > 0 ? "neg" : "")}
  </div>
  <div class="grid g-21 mt">
    <div class="card"><div class="card-head"><div><h3>Evolução mensal</h3><div class="sub">Recebido, lucro e não recebido por mês</div></div></div><div class="chart-box"><canvas id="chPacMes"></canvas></div></div>
    <div class="card"><div class="card-head"><div><h3>Pontos de atenção</h3><div class="sub">${ui.mes ? MESES_FULL[ui.mes - 1] : "Todo o período"}</div></div></div>
      <div class="alert-list">${al.map((a) => `<div class="alert ${a.tipo}">${icon(a.tipo === "green" ? "check" : "alert")}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></div>`).join("")}</div></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Resumo por mês</h3><div class="sub">Totais consolidados do registro diário</div></div><a class="btn btn-sm" href="#pacoca">Ver vendas diárias</a></div>
    <div class="table-wrap"><table><thead><tr><th>Mês</th><th class="num">Dias</th><th class="num">Vendidas</th><th class="num">Recebido</th><th class="num">Não recebido</th><th class="num">Custos</th><th class="num">Lucro</th><th class="num">Margem</th></tr></thead>
    <tbody>${meses.map((m) => { const l = db.pacoca.filter((p) => monthOf(p.data) === m); const r = sum(l, recPac), lu = sum(l, lucroPac); return `<tr>
      <td><b>${MESES_FULL[m - 1]}</b></td><td class="num">${l.length}</td><td class="num">${int(sum(l, (p) => +p.qtd || 0))}</td><td class="num">${brl(r)}</td>
      <td class="num neg">${brl(sum(l, naoRecPac))}</td><td class="num">${brl(sum(l, custoPac))}</td><td class="num ${lu >= 0 ? "pos" : "neg"}"><b>${brl(lu)}</b></td><td class="num">${pct(r ? (lu / r) * 100 : 0)}</td></tr>`; }).join("")}</tbody></table></div>
  </div>`;
}
function afterPacPainel() {
  const meses = mesesComDados("pacoca");
  const por = meses.map((m) => db.pacoca.filter((p) => monthOf(p.data) === m));
  chart("chPacMes", {
    type: "bar",
    data: { labels: meses.map((m) => MESES[m - 1]), datasets: [
      { label: "Recebido", data: por.map((l) => sum(l, recPac)), backgroundColor: "#c5a059", borderRadius: 8, maxBarThickness: 46 },
      { label: "Lucro", data: por.map((l) => sum(l, lucroPac)), backgroundColor: "#2f9e6b", borderRadius: 8, maxBarThickness: 46 },
      { label: "Não recebido", data: por.map((l) => sum(l, naoRecPac)), backgroundColor: "#d24b4b", borderRadius: 8, maxBarThickness: 46 },
    ] },
    options: { maintainAspectRatio: false, plugins: { tooltip: tooltipBRL }, scales: { y: { ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { grid: { display: false } } } },
  });
}

/* ---------- Paçoca · Ficha do pacote, Insumos e DRE ---------- */
// Linhas do custo de um pacote: insumos (somente leitura, vêm de Insumos) + outros custos editáveis
function fichaPacoteHtml() {
  const itens = db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0);
  const comImposto = itens.filter((i) => impostoUnitItem(i) > 0);
  return `<ul class="recipe-ings">${itens.map((i) => `<li><span>${esc(i.nome)} <a class="badge b-gold" href="#insumos-pacoca">insumo</a></span><span>${fmtQtd(consumoPacote(i))} × ${brlU(+i.custo || 0)}</span><span>${brl(consumoPacote(i) * (+i.custo || 0))}</span></li>`).join("")}
    ${impostoVendaPacote() ? `<li><span>Impostos e contabilidade <a class="badge b-gold" href="#dre-geral">imposto</a></span><span>${pct(cargaImpostosPct("pacoca"))} de ${brl((+db.config.precoPacoca || 0) * (1 - naoRecPctPacoca() / 100))} recebido</span><span>${brl(impostoVendaPacote())}</span></li>` : ""}
    ${comImposto.map((i) => `<li><span>Imposto NF-e · ${esc(i.nome)} <span class="badge b-gray">imposto</span></span><span>${brl(+i.imposto)} ÷ ${fmtQtd(+i.pacote || 1)} × ${fmtQtd(consumoPacote(i))}</span><span>${brl(consumoPacote(i) * impostoUnitItem(i))}</span></li>`).join("")}</ul>
    ${db.pacocaCusto.map((c) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px)"><span>${esc(c.nome)} <span class="hint">(por pacote)</span></span><input inputmode="decimal" data-act="pac-custo" data-id="${c.id}" value="${String(c.valor).replace(".", ",")}" /></div>`).join("")}`;
}
function formItemPacocaInsumo(i) {
  openForm({
    title: i ? `Editar insumo · ${i.nome}` : "Novo insumo da paçoca",
    fields: [
      { key: "nome", label: "Item", required: true, full: true },
      { key: "custoCompra", label: "Custo de compra sem imposto (R$ por embalagem)", type: "num" },
      { key: "imposto", label: "Imposto / NF-e (R$ por embalagem)", type: "num" },
      { key: "pacote", label: "Unidades por embalagem", type: "num" },
      { key: "unid", label: "Unidade (un, folha, rolo...)" },
      ...(i?.usaPacote ? [] : [{ key: "consumo", label: "Uso por pacote vendido", type: "num" }]),
    ],
    values: i ? { ...i, custoCompra: round2((+i.custo || 0) * (+i.pacote || 1)), imposto: +i.imposto || 0, pacote: +i.pacote || 1 } : { unid: "un", pacote: 1, consumo: 0, imposto: 0 },
    preview: (v) => {
      const cu = v.pacote ? v.custoCompra / v.pacote : 0, iu = v.pacote ? (v.imposto || 0) / v.pacote : 0, uso = i?.usaPacote ? consumoPacote(i) : v.consumo;
      return `<span>Custo unitário: ${brlU(cu)}</span><span>No pacote: ${brl(cu * (uso || 0))}</span>${iu ? `<span>Imposto no pacote: ${brl(iu * (uso || 0))}</span><span>Você paga por embalagem: ${brl((v.custoCompra || 0) + (v.imposto || 0))}</span>` : ""}`;
    },
    onSave: (v) => {
      const novo = { nome: v.nome, unid: v.unid, pacote: v.pacote || 1, custo: v.pacote ? v.custoCompra / v.pacote : 0, imposto: v.imposto || 0, ...(i?.usaPacote ? {} : { consumo: v.consumo }) };
      if (i) Object.assign(i, novo); else db.estoque.pacocaItens.push({ id: uid(), ...novo });
      toast("Insumo salvo · custo do pacote recalculado");
    },
  });
}
function viewInsumosPacoca() {
  setActions(`<button class="btn btn-primary" data-act="ins-pac-novo">${icon("plus")}Novo insumo</button>`);
  const itens = db.estoque.pacocaItens, cu = custoUnitPacoca(), preco = +db.config.precoPacoca || 0;
  return `<div class="grid g-21">
    <div class="card"><div class="card-head"><div><h3>Insumos da paçoca</h3><div class="sub">Custo unitário = custo de compra ÷ unidades por embalagem. Alterou aqui, recalcula o custo do pacote, margens, simulador, DRE e projeção.</div></div></div>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Custo de compra</th><th class="num hide-m">Imposto NF-e</th><th class="num hide-m">Embalagem</th><th class="num">Custo unitário</th><th class="num">Uso por pacote</th><th class="num">No pacote</th><th class="num hide-m">Em estoque</th><th></th></tr></thead><tbody>
      ${itens.map((i) => `<tr><td><b>${esc(i.nome)}</b></td><td class="num">${brl((+i.custo || 0) * (+i.pacote || 1))}</td><td class="num hide-m">${+i.imposto ? brl(+i.imposto) : "—"}</td><td class="num hide-m">${fmtQtd(+i.pacote || 1)} ${esc(i.unid)}</td>
        <td class="num">${brlU(+i.custo || 0)}<span class="hint">/${esc(i.unid)}</span></td><td class="num">${fmtQtd(consumoPacote(i))} ${esc(i.unid)}</td>
        <td class="num"><b>${brl(consumoPacote(i) * (+i.custo || 0))}</b></td><td class="num hide-m">${fmtQtd(saldoDe("pac:" + i.id).qtd)} ${esc(i.unid)}</td>
        <td>${rowActions("ins-pac", i.id)}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="6" class="hide-m">Insumos por pacote</td><td class="show-m-cell" colspan="3">Insumos por pacote</td><td class="num">${brl(custoInsumosPacote() + impostoPacote())}</td><td colspan="2" class="hide-m"></td><td class="show-m-cell"></td></tr>
      ${impostoPacote() ? `<tr><td colspan="6" class="hide-m">dos quais imposto NF-e por pacote (já incluso no custo)</td><td class="show-m-cell" colspan="3">Imposto NF-e por pacote</td><td class="num">${brl(impostoPacote())}</td><td colspan="2" class="hide-m"></td><td class="show-m-cell"></td></tr>` : ""}</tfoot></table></div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Ficha do pacote</h3><div class="sub">Pacote com ${fmtQtd(+db.pacocaSim.porPacote || 1)} paçoquitas</div></div></div>
      ${fichaPacoteHtml()}
      <div id="pacUnit">${pacUnitHtml()}</div>
    </div>
  </div>`;
}

const fixosLista = (area) => (area === "pacoca" ? db.fixosPacoca : db.fixos);
function viewDrePacoca() {
  const todos = mesesComDados("pacoca");
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Mês de referência
    <select class="inline" data-act="set-dremespac"><option value="0">Todos os meses</option>
    ${MESES_FULL.map((n, i) => `<option value="${i + 1}" ${ui.dreMesPac === i + 1 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <button class="btn btn-primary" data-act="new-cvar" data-val="pacoca">${icon("plus")}Custo variável</button>`);
  const meses = ui.dreMesPac ? [ui.dreMesPac] : todos;
  const cols = meses.map((m) => ({ label: MESES_FULL[m - 1], r: resumo(m, "pacoca"), rat: rateioImpostos(m, "pacoca") }));
  if (!ui.dreMesPac) cols.push({ label: "Total", r: resumo(0, "pacoca"), rat: rateioImpostos(0, "pacoca"), total: true });
  const tf = sum(db.fixosPacoca, (f) => +f.valor || 0), nFix = (c) => (c.total ? meses.length : 1);
  const cvsArea = db.custosVar.filter((c) => areaCV(c) === "pacoca");
  const cats = CATS_VAR.filter((cat) => cvsArea.some((c) => c.categoria === cat && (!ui.dreMesPac || +c.mes === ui.dreMesPac)));
  const linhas = [
    { t: "RECEITA BRUTA (recebido)", f: (r) => r.receita, cls: "total" },
    { t: "   Pix", f: (r) => sum(r.pac, (p) => +p.pix || 0) },
    { t: "   Dinheiro", f: (r) => sum(r.pac, (p) => +p.especie || 0) },
    { t: "   Não recebido (fiado / no-show) · informativo", f: (r) => sum(r.pac, naoRecPac), info: true },
    { t: "(−) DESPESAS VARIÁVEIS", f: (r) => -r.custos, cls: "total" },
    { t: "   Insumos de produção (paçoquita com NF-e, saquinho, papel)", f: (r) => -(r.insumos + r.impostos) },
    { t: `      dos quais imposto NF-e da paçoquita (${brl(impostoPacote())}/pacote) · informativo, já incluído acima`, f: (r) => r.impostos, info: true },
    { t: "   Gasolina", f: (r) => -r.gasolina },
    { t: "   Mão de obra", f: (r) => -r.comissoes },
    { t: "   Perdas (produto, embalagem e materiais)", f: (r) => -r.perdas },
    ...cats.map((cat) => ({ t: "   " + cat + " (lançado)", f: (r) => -sum(r.cvs.filter((c) => c.categoria === cat), (c) => +c.valor || 0) })),
    { t: "(=) LUCRO BRUTO (margem de contribuição)", f: (r) => r.lucro, cls: "total" },
    { t: "   Margem de contribuição %", f: (r) => (r.receita ? (r.lucro / r.receita) * 100 : 0), pct: true },
    ...linhasImpostos("pacoca"),
    { t: "(−) DESPESAS FIXAS", f: (r, c) => -(tf * nFix(c)), cls: "total" },
    { t: "(=) RESULTADO OPERACIONAL", f: (r, c) => r.lucro - c.rat.total - tf * nFix(c), cls: "result" },
    { t: "   Margem líquida %", f: (r, c) => (r.receita ? ((r.lucro - c.rat.total - tf * nFix(c)) / r.receita) * 100 : 0), pct: true },
  ];
  const cvLista = cvsArea.filter((c) => !ui.dreMesPac || +c.mes === ui.dreMesPac).sort((a, b) => a.mes - b.mes);
  return `
  <div class="card"><div class="card-head"><div><h3>DRE Paçoca ${db.config.ano}${ui.dreMesPac ? " · " + MESES_FULL[ui.dreMesPac - 1] : ""}</h3><div class="sub">Vendas diárias + custos variáveis lançados + despesas fixas da paçoca</div></div></div>
    <div class="table-wrap"><table class="dre"><thead><tr><th>Descrição</th>${cols.map((c) => `<th class="num">${c.label}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l) => `<tr class="${l.cls || ""}${l.info ? " row-off" : ""}"><td>${l.t.replace(/^ +/, (s) => "&nbsp;".repeat(s.length * 2))}</td>${cols.map((c) => { const v = l.f(c.r, c); return `<td class="num ${!l.cls && !l.pct && !l.info && v < 0 ? "neg" : ""}">${l.pct ? pct(v) : brl(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Custos variáveis lançados · Paçoca${ui.dreMesPac ? " · " + MESES_FULL[ui.dreMesPac - 1] : ""}</h3><div class="sub">Gastos que variam com as vendas e não estão no registro diário</div></div>
    <button class="btn btn-sm btn-primary" data-act="new-cvar" data-val="pacoca">${icon("plus")}Adicionar</button></div>
    ${cvLista.length ? `<div class="table-wrap"><table><thead><tr><th>Mês de referência</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${cvLista.map((c) => `<tr><td>${MESES_FULL[c.mes - 1]}</td><td>${esc(c.descricao)}</td><td><span class="badge b-gray">${esc(c.categoria)}</span></td><td class="num">${brl(c.valor)}</td><td>${rowActions("cvar", c.id)}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="3">Total</td><td class="num">${brl(sum(cvLista, (c) => +c.valor || 0))}</td><td></td></tr></tfoot></table></div>`
    : `<div class="empty">Nenhum custo variável lançado.</div>`}
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Despesas fixas da paçoca</h3><div class="sub">Entram no DRE da paçoca em todos os meses com movimento</div></div><button class="btn btn-sm" data-act="new-fixo" data-val="pacoca">${icon("plus")}Adicionar</button></div>
      ${db.fixosPacoca.map((f) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px) 34px"><span>${esc(f.nome)}</span><input inputmode="decimal" data-act="set-fixo" data-area="pacoca" data-id="${f.id}" value="${String(f.valor || "").replace(".", ",")}" placeholder="0,00" />
        <button class="btn btn-ghost btn-sm btn-danger" data-act="del-fixo" data-val="pacoca" data-id="${f.id}">${icon("trash")}</button></div>`).join("")}
      <div class="recipe-total" style="padding-top:14px"><span>Total por mês</span><span>${brl(tf)}</span></div>
      <div class="hint" style="margin-top:8px">Contador, impostos e pró-labore do negócio todo ficam no DRE dos Doces Finos (despesas gerais).</div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Resultado operacional por mês</h3><div class="sub">Lucro bruto − despesas fixas</div></div></div>
      <div class="chart-box sm"><canvas id="chDrePac"></canvas></div>
    </div>
  </div>`;
}
function afterDrePacoca() {
  const meses = mesesComDados("pacoca"), tf = sum(db.fixosPacoca, (f) => +f.valor || 0);
  chart("chDrePac", {
    type: "line",
    data: { labels: meses.map((m) => MESES[m - 1]), datasets: [{ label: "Resultado", data: meses.map((m) => resumo(m, "pacoca").lucro - rateioImpostos(m, "pacoca").total - tf), borderColor: "#2f9e6b", backgroundColor: "rgba(47,158,107,.15)", fill: true, tension: .35 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipBRL }, scales: { y: { ticks: { callback: moneyTick }, grid: { color: "#ece7da" } }, x: { grid: { display: false } } } },
  });
}

/* ---------- Paçoca · Simulador ---------- */
// Média histórica de pacotes por dia de venda, por mês e geral
function mediaHistoricaPacoca() {
  const media = (l) => ({ dias: l.length, porDia: l.length ? sum(l, (p) => +p.qtd || 0) / l.length : 0, nr: sum(l, esperadoPac) ? (sum(l, naoRecPac) / sum(l, esperadoPac)) * 100 : 0 });
  const meses = mesesComDados("pacoca").filter((m) => db.pacoca.some((p) => monthOf(p.data) === m));
  return { meses: meses.map((m) => ({ m, ...media(db.pacoca.filter((p) => monthOf(p.data) === m)) })), geral: media(db.pacoca) };
}
function histPacocaHtml() {
  const { meses, geral } = mediaHistoricaPacoca();
  if (!geral.dias) return "";
  return `<div class="card hist-card"><div class="card-head"><div><h3>${icon("trend")} Média histórica de vendas</h3><div class="sub">Pacotes por dia de venda · ${geral.dias} dias registrados</div></div><a class="btn btn-sm" href="#pacoca">Ver vendas diárias</a></div>
    <div class="hist-grid">${meses.map((x) => `<div class="stat"><small>${MESES_FULL[x.m - 1]} · ${x.dias} dia(s)</small><strong>${fmtQtd(Math.round(x.porDia))} pacotes/dia</strong><div class="hint">não recebido ${pct(x.nr)}</div></div>`).join("")}
      <div class="stat"><small>Média geral</small><strong>${fmtQtd(Math.round(geral.porDia))} pacotes/dia</strong><div class="hint">não recebido ${pct(geral.nr)}</div></div></div></div>
  <div class="chip-row" style="margin:10px 0 18px;align-items:center"><span class="hint">Preencher "pacotes por dia" do simulador com:</span>
    <button class="btn btn-sm" data-act="pacsim-hist" data-val="0">Média geral</button>
    ${meses.map((x) => `<button class="btn btn-sm" data-act="pacsim-hist" data-val="${x.m}">${MESES_FULL[x.m - 1]}</button>`).join("")}</div>`;
}
function viewSimPacoca() {
  const s = db.pacocaSim, h = mediaHistoricaPacoca().geral;
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Preço do pacote
    <input class="inline" style="width:90px" inputmode="decimal" data-act="set-preco-pac" value="${String(db.config.precoPacoca).replace(".", ",")}" /></label>`);
  const linha = (rotulo, key, valor, modo = "decimal", borda = true) => `<div class="sim-row" style="grid-template-columns:1fr 140px${borda ? "" : ";border:0"}"><span>${rotulo}</span><input inputmode="${modo}" data-act="pac-sim" data-key="${key}" value="${String(valor).replace(".", ",")}" /></div>`;
  return `${histPacocaHtml()}
  <div class="grid g-21">
    <div class="card">
      <div class="card-head"><div><h3>Vendas previstas</h3><div class="sub">Custos do pacote vêm de Insumos e Personalizar custos</div></div></div>
      ${linha("Pacotes vendidos por dia", "porDia", s.porDia, "numeric")}
      ${linha("Dias de venda no mês", "dias", s.dias, "numeric")}
      ${linha(`% não recebido · pix confiança <span class="hint">(histórico: ${pct(h.nr)})</span>`, "naoRecPct", s.naoRecPct)}
      ${linha("Gasolina por dia (R$)", "gasolinaDia", s.gasolinaDia, "decimal", false)}
      <h3 style="font-size:14px;margin:22px 0 8px">Outras despesas por dia de venda</h3>
      ${Object.entries(s.fixos || {}).map(([k, v]) => `<div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(77px,140px)"><span>${esc(k)}</span><input inputmode="decimal" data-act="pacsim-fixo" data-key="${esc(k)}" value="${String(v || "").replace(".", ",")}" placeholder="0" /></div>`).join("")}
      <div class="hint" style="margin-top:8px">Tudo por dia de venda: o mês = dias de venda × o que acontece em um dia. Mão de obra, insumos e NF-e entram por pacote; impostos (DAS, DARF, contabilidade) entram com os valores reais.</div>
    </div>
    <div class="card" id="pacSim">${pacSimHtml()}</div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Quanto você vai gastar</h3><div class="sub">Calculado a partir das vendas previstas: insumos de cada pacote, mão de obra, gasolina e despesas por dia de venda, e impostos reais (NF-e, DAS sobre o recebido e a parte da paçoca em DARF e contabilidade)</div></div></div>
    <div id="pacGastos">${gastosHtml(gastosSimPacoca())}</div></div>`;
}

/* ---------- Pedidos de produção (mão de obra terceirizada) ---------- */
// db.pedidos[area].dias["AAAA-MM-DD"] = { G, P } nos doces ou { U } (pacotes) na paçoca
const DIAS_SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaSemana = (iso) => DIAS_SEM[new Date(iso + "T12:00:00").getDay()];
const pedidosDe = (area) => { db.pedidos = db.pedidos || {}; return (db.pedidos[area] = db.pedidos[area] || { dias: {}, obs: "" }); };
const moPorPacote = () => +(db.pacocaCusto.find((c) => /m[ãa]o/i.test(c.nome))?.valor) || 0;
// Dias do pedido (7 a partir da data escolhida) com quantidades, doces/paçoquitas e mão de obra de cada dia
function diasPedido(area) {
  ui.pedIni = ui.pedIni || {};
  const ini = ui.pedIni[area] || hojeISO(), ped = pedidosDe(area);
  return Array.from({ length: 7 }, (_, i) => {
    const data = addDias(ini, i), q = ped.dias[data] || {};
    if (area === "pacoca") {
      const U = +q.U || 0;
      return { data, U, unidades: U * (+db.pacocaSim.porPacote || 1), mo: U * moPorPacote() };
    }
    const G = +q.G || 0, P = +q.P || 0, doces = G * unidadesCaixa("G") + P * unidadesCaixa("P");
    const sabores = {};
    [["G", G], ["P", P]].forEach(([k, n]) => Object.entries(caixaDe(k).itens).forEach(([s, qt]) => { if (n * (+qt || 0)) sabores[s] = (sabores[s] || 0) + n * (+qt || 0); }));
    return { data, G, P, doces, sabores, mo: doces * paramVal("maoObraDoce") };
  });
}
function textoPedido(area, dias) {
  const ativos = dias.filter((d) => (area === "pacoca" ? d.U : d.G + d.P));
  const tot = sum(ativos, (d) => d.mo), ped = pedidosDe(area);
  const linhas = ativos.map((d) => area === "pacoca"
    ? `• ${diaSemana(d.data)} ${ddmm(d.data)}: ${int(d.U)} pacotes (${int(d.unidades)} paçoquitas) · ${brl(d.mo)}`
    : `• ${diaSemana(d.data)} ${ddmm(d.data)}: ${d.G ? `${int(d.G)} Cx G` : ""}${d.G && d.P ? " + " : ""}${d.P ? `${int(d.P)} Cx P` : ""} = ${int(d.doces)} doces · ${brl(d.mo)}\n   ${Object.entries(d.sabores).map(([s, n]) => `${nomeCurto(s)} ${int(n)}`).join(", ")}`);
  return `*Pedido de produção · HA La Vie · ${area === "pacoca" ? "Paçoca" : "Doces finos"}*\n${ddmm(dias[0].data)} a ${ddmm(dias[6].data)}\n\n${linhas.join("\n")}\n\n*Total: ${area === "pacoca" ? `${int(sum(ativos, (d) => d.U))} pacotes` : `${int(sum(ativos, (d) => d.doces))} doces`} · mão de obra ${brl(tot)}*${ped.obs ? `\n\nObs.: ${ped.obs}` : ""}`;
}
function painelPedidoHtml(area, dias) {
  const ativos = dias.filter((d) => (area === "pacoca" ? d.U : d.G + d.P)), ped = pedidosDe(area);
  const totMo = sum(ativos, (d) => d.mo), doces = area !== "pacoca";
  const sabores = doces ? [...new Set(ativos.flatMap((d) => Object.keys(d.sabores)))] : [];
  const unidadeMo = doces ? `${brl(paramVal("maoObraDoce"))} por doce` : `${brl(moPorPacote())} por pacote`;
  return `<div class="pedido-print">
    <div class="pp-head"><div class="brand-logo">H&amp;A</div><div><h2>Pedido de produção · ${doces ? "Doces finos" : "Paçoca"}</h2><p>${diaSemana(dias[0].data)} ${ddmm(dias[0].data)} a ${diaSemana(dias[6].data)} ${ddmm(dias[6].data)}</p></div>
      <div class="pp-total"><small>Mão de obra total</small><strong>${brl(totMo)}</strong><small>${unidadeMo}</small></div></div>
    ${ativos.length ? `<div class="table-wrap"><table class="pp-tab"><thead><tr><th>Dia</th>${doces ? "<th class=\"num\">Cx G</th><th class=\"num\">Cx P</th><th class=\"num\">Doces</th>" : "<th class=\"num\">Pacotes</th><th class=\"num\">Paçoquitas</th>"}<th class="num">Mão de obra</th></tr></thead><tbody>
      ${ativos.map((d) => `<tr><td><b>${diaSemana(d.data)} ${ddmm(d.data)}</b></td>${doces ? `<td class="num">${int(d.G)}</td><td class="num">${int(d.P)}</td><td class="num"><b>${int(d.doces)}</b></td>` : `<td class="num"><b>${int(d.U)}</b></td><td class="num">${int(d.unidades)}</td>`}<td class="num"><b>${brl(d.mo)}</b></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Total</td>${doces ? `<td class="num">${int(sum(ativos, (d) => d.G))}</td><td class="num">${int(sum(ativos, (d) => d.P))}</td><td class="num">${int(sum(ativos, (d) => d.doces))}</td>` : `<td class="num">${int(sum(ativos, (d) => d.U))}</td><td class="num">${int(sum(ativos, (d) => d.unidades))}</td>`}<td class="num">${brl(totMo)}</td></tr></tfoot></table></div>
    ${doces && sabores.length ? `<h3 class="pp-sub">Docinhos por sabor</h3><div class="table-wrap"><table class="pp-tab"><thead><tr><th>Sabor</th>${ativos.map((d) => `<th class="num">${diaSemana(d.data)} ${ddmm(d.data)}</th>`).join("")}<th class="num">Total</th></tr></thead><tbody>
      ${sabores.map((s) => `<tr><td><b>${esc(s)}</b></td>${ativos.map((d) => `<td class="num">${d.sabores[s] ? int(d.sabores[s]) : "—"}</td>`).join("")}<td class="num"><b>${int(sum(ativos, (d) => d.sabores[s] || 0))}</b></td></tr>`).join("")}
      </tbody></table></div><div class="hint" style="margin-top:6px">Composição: ${tiposArea("doces").filter((t) => db.caixas?.[t.key]).map((t) => `${esc(t.nome)} = ${esc(composicaoTxt(t.key))}`).join(" · ")}</div>` : ""}`
    : '<div class="empty">Preencha as quantidades de cada dia ao lado.</div>'}
    ${ped.obs ? `<div class="pp-obs"><b>Observações:</b> ${esc(ped.obs)}</div>` : ""}
  </div>`;
}
// Doces: média histórica de caixas por semana e preenchimento automático do fim de semana
// (total de caixas → % Cx G / Cx P → % sábado / domingo; vendas só no sábado e no domingo)
const autoPedido = () => { const p = pedidosDe("doces"); return (p.auto = { total: 0, pctG: 70, pctSab: 40, ...(p.auto || {}) }); };
function fimDeSemanaPedido(dias) {
  const iSab = dias.findIndex((d) => new Date(d.data + "T12:00:00").getDay() === 6);
  const sab = iSab >= 0 ? dias[iSab].data : null;
  const dom = sab && iSab + 1 < dias.length ? dias[iSab + 1].data : dias.find((d) => new Date(d.data + "T12:00:00").getDay() === 0)?.data || null;
  return { sab, dom };
}
function divisaoAuto(total, pctG, pctSab) {
  const sabT = Math.round((total * pctSab) / 100), domT = total - sabT;
  const g = (t) => Math.round((t * pctG) / 100);
  return { sab: { G: g(sabT), P: sabT - g(sabT) }, dom: { G: g(domT), P: domT - g(domT) } };
}
function preencherFimDeSemana(total) {
  const a = autoPedido(), dias = diasPedido("doces"), { sab, dom } = fimDeSemanaPedido(dias);
  if (!sab || !dom) { toast("Não há sábado e domingo nesses 7 dias"); return; }
  a.total = Math.max(0, Math.round(total));
  const div = divisaoAuto(a.total, +a.pctG, +a.pctSab), plan = pedidosDe("doces").dias;
  plan[sab] = div.sab; plan[dom] = div.dom;
  save(); render();
  toast(`Preenchido: sábado ${div.sab.G + div.sab.P} cx · domingo ${div.dom.G + div.dom.P} cx`);
}
function historicoPedidoHtml(dias) {
  const { semanas, geral } = mediaHistoricaSemanas(), a = autoPedido(), { sab, dom } = fimDeSemanaPedido(dias);
  const tot = (x) => Math.round(x.P + x.G), sugestao = a.total || tot(geral);
  const div = divisaoAuto(sugestao, +a.pctG, +a.pctSab);
  return `<div class="card mt"><div class="card-head"><div><h3>Média histórica e preenchimento automático</h3><div class="sub">Caixas vendidas por semana (Outbound) · ${geral.n} fins de semana registrados</div></div></div>
    ${geral.n ? `<div class="hist-grid" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">${[{ rot: "Média geral", x: geral, val: 0 }, ...semanas.map((s) => ({ rot: `${s.sem}ª semana${s.semDados ? " (sem dados)" : ""}`, x: s, val: s.sem }))].map((o) => `
      <button class="stat ped-media" data-act="ped-media" data-val="${tot(o.x)}" title="Usar ${tot(o.x)} caixas"><small>${o.rot}</small><strong>${int(tot(o.x))} caixas</strong><div class="hint">${int(Math.round(o.x.G))} G · ${int(Math.round(o.x.P))} P</div></button>`).join("")}</div>
      <div class="hint" style="margin:6px 0 12px">Clique numa média para usar como total.</div>` : '<div class="hint">Ainda não há histórico de caixas por semana.</div>'}
    <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span><b>Total de caixas do fim de semana</b></span>${numIn("ped-auto", sugestao, 'data-key="total"')}</div>
    <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span>% Cx G <span class="hint">(o resto é Cx P)</span></span>${numIn("ped-auto", a.pctG, 'data-key="pctG"')}</div>
    <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px);border:0"><span>% no sábado <span class="hint">(domingo: ${fmtQtd(100 - a.pctSab)}%)</span></span>${numIn("ped-auto", a.pctSab, 'data-key="pctSab"')}</div>
    <ul class="recipe-ings mt">
      <li><span>Sábado ${sab ? ddmm(sab) : "—"}</span><span>${int(div.sab.G)} Cx G + ${int(div.sab.P)} Cx P</span><span><b>${int(div.sab.G + div.sab.P)} cx</b></span></li>
      <li><span>Domingo ${dom ? ddmm(dom) : "—"}</span><span>${int(div.dom.G)} Cx G + ${int(div.dom.P)} Cx P</span><span><b>${int(div.dom.G + div.dom.P)} cx</b></span></li>
    </ul>
    <button class="btn btn-primary mt" data-act="ped-auto-preencher" style="width:100%">Preencher sábado e domingo</button>
    <div class="hint" style="margin-top:8px">Preenche só o sábado e o domingo dos dias mostrados (substitui o que estiver neles). Depois você pode ajustar qualquer dia à mão na tabela.</div>
  </div>`;
}
function viewPedidos(area) {
  const dias = diasPedido(area), ped = pedidosDe(area), doces = area !== "pacoca";
  if (ui.pedPrint) {
    setActions(`<button class="btn" data-act="ped-print">Voltar</button><button class="btn btn-primary" data-act="ped-copiar" data-val="${area}">Copiar texto</button>`);
    return `<div class="pp-solo">${painelPedidoHtml(area, dias)}</div>`;
  }
  setActions(`<button class="btn" data-act="ped-copiar" data-val="${area}">Copiar texto (WhatsApp)</button><button class="btn" data-act="ped-print">Tela para print</button><button class="btn btn-primary" data-act="ped-enviar" data-val="${area}">${icon("check")}Enviar pedido</button>`);
  const campo = (d, k) => `<input class="tbl-input" style="width:72px" inputmode="numeric" data-act="ped-qtd" data-area="${area}" data-dia="${d.data}" data-key="${k}" value="${d[k] || ""}" placeholder="0" />`;
  return `<div class="grid g-21">
    <div class="card"><div class="card-head"><div><h3>Quantidades por dia</h3><div class="sub">${doces ? "Caixas a produzir em cada dia — os docinhos por sabor saem da composição de cada caixa" : "Pacotes a produzir em cada dia"}</div></div>
      <label class="hint" style="display:flex;align-items:center;gap:6px">A partir de <input type="date" class="inline" data-act="ped-ini" data-area="${area}" value="${dias[0].data}" /></label></div>
      <div class="table-wrap"><table><thead><tr><th>Dia</th>${doces ? '<th class="num">Cx G</th><th class="num">Cx P</th><th class="num">Doces</th>' : '<th class="num">Pacotes</th><th class="num">Paçoquitas</th>'}<th class="num">Mão de obra</th></tr></thead><tbody>
      ${dias.map((d) => `<tr><td><b>${diaSemana(d.data)}</b> ${ddmm(d.data)}</td>${doces ? `<td class="num">${campo(d, "G")}</td><td class="num">${campo(d, "P")}</td><td class="num">${int(d.doces)}</td>` : `<td class="num">${campo(d, "U")}</td><td class="num">${int(d.unidades)}</td>`}<td class="num"><b>${brl(d.mo)}</b></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Total</td>${doces ? `<td class="num">${int(sum(dias, (d) => d.G))}</td><td class="num">${int(sum(dias, (d) => d.P))}</td><td class="num">${int(sum(dias, (d) => d.doces))}</td>` : `<td class="num">${int(sum(dias, (d) => d.U))}</td><td class="num">${int(sum(dias, (d) => d.unidades))}</td>`}<td class="num">${brl(sum(dias, (d) => d.mo))}</td></tr></tfoot></table></div>
      <label class="hint" style="display:block;margin-top:12px">Observações para a produção<textarea data-act="ped-obs" data-area="${area}" rows="3" style="width:100%;margin-top:4px">${esc(ped.obs || "")}</textarea></label>
      <div class="hint" style="margin-top:8px">Mão de obra: ${doces ? `${brl(paramVal("maoObraDoce"))} por doce (Personalizar custos)` : `${brl(moPorPacote())} por pacote (Paçoca › Personalizar custos)`}. As quantidades ficam salvas e sincronizadas.</div>
    </div>
    <div><div class="card"><div class="card-head"><div><h3>Painel para enviar</h3><div class="sub">Tire o print ("Tela para print") e clique em "Enviar pedido": gera as contas de mão de obra e insumos e baixa o material do estoque</div></div></div>
      ${painelPedidoHtml(area, dias)}</div>
      ${doces ? historicoPedidoHtml(dias) : ""}</div>
  </div>
  ${pedidosEnviadosHtml(area)}`;
}

// Pedido enviado à produção: gera a conta de mão de obra (terça de fechamento da semana seguinte), a conta de insumos
// e baixa do estoque o material usado, somando as caixas/pacotes prontos
const pedidosEnviados = () => (db.pedidosEnviados = db.pedidosEnviados || []);
function resumoPedido(area, dias) {
  const ativos = dias.filter((d) => (area === "pacoca" ? d.U : d.G + d.P));
  if (!ativos.length) return null;
  const ini = ativos[0].data, fim = ativos[ativos.length - 1].data, venc = addDias(semanaDe(fim).fim, 7);
  if (area === "pacoca") {
    const U = sum(ativos, (d) => d.U);
    const consumo = db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0).map((i) => ({ ref: "pac:" + i.id, nome: i.nome, unid: i.unid, qtd: U * consumoPacote(i) }));
    return { area, ini, fim, venc, dias: ativos.map((d) => ({ data: d.data, U: d.U })), U, mo: U * moPorPacote(), insumos: U * custoInsumosPacote(), nfe: U * impostoPacote(), consumo };
  }
  const G = sum(ativos, (d) => d.G), P = sum(ativos, (d) => d.P), cc = consumoCaixas(G, P);
  const custoRef = Object.fromEntries(itensEstoque("doces").map((i) => [i.ref, i.custo]));
  const consumo = [...cc.insumos, ...cc.materiais].filter((x) => x.qtd > 0);
  return { area, ini, fim, venc, dias: ativos.map((d) => ({ data: d.data, G: d.G, P: d.P })), G, P, doces: sum(ativos, (d) => d.doces), mo: sum(ativos, (d) => d.mo), insumos: sum(consumo, (x) => x.qtd * (custoRef[x.ref] || 0)), nfe: 0, consumo };
}
function enviarPedido(area) {
  const r = resumoPedido(area, diasPedido(area));
  if (!r) { toast("Preencha as quantidades antes de enviar"); return; }
  const qtdTxt = area === "pacoca" ? `${int(r.U)} pacotes` : `${int(r.G)} Cx G + ${int(r.P)} Cx P (${int(r.doces)} doces)`;
  if (!confirm(`Enviar o pedido de ${ddmm(r.ini)} a ${ddmm(r.fim)}?\n\n${qtdTxt}\n\n• Conta de mão de obra: ${brl(r.mo)} (vence ${ddmm(r.venc)})\n• Conta de insumos: ${brl(r.insumos + r.nfe)}\n• O material sai do estoque e ${area === "pacoca" ? "os pacotes entram como prontos" : "as caixas entram como prontas"}.`)) return;
  const id = uid(), obs = `Pedido ${ddmm(r.ini)} a ${ddmm(r.fim)}`, movs = [];
  const mov = (ref, nome, delta) => { movimentar(area, ref, nome, delta, "producao", obs); movs.push({ ref, nome, delta }); };
  r.consumo.forEach((x) => mov(x.ref, x.nome, -x.qtd));
  if (area === "pacoca") mov("pronto:pac", "Pacotes prontos", r.U);
  else tiposArea("doces").filter((t) => r[t.key]).forEach((t) => mov("pronto:" + t.key, `${t.nome} (${t.desc})`, r[t.key]));
  const { consumo, ...dados } = r;
  pedidosEnviados().push({ id, ...dados, obs: pedidosDe(area).obs || "", enviadoEm: hojeISO(), movs });
  const plan = pedidosDe(area);
  r.dias.forEach((d) => delete plan.dias[d.data]);
  plan.obs = "";
  const desdeAreas = (db.config.pedidosDesde = typeof db.config.pedidosDesde === "object" && db.config.pedidosDesde ? db.config.pedidosDesde : {});
  if (!desdeAreas[area] || r.ini < desdeAreas[area]) desdeAreas[area] = r.ini;
  save(); render();
  toast(`Pedido enviado · mão de obra ${brl(r.mo)} vence ${ddmm(r.venc)}`);
}
function cancelarPedido(id) {
  const p = pedidosEnviados().find((x) => x.id === id);
  if (!p || !confirm(`Cancelar o pedido de ${ddmm(p.ini)} a ${ddmm(p.fim)}? O material volta ao estoque e as contas ainda não pagas saem de Pagamentos.`)) return;
  (p.movs || []).forEach((m) => movimentar(p.area, m.ref, m.nome, -m.delta, "ajuste", `Cancelamento do pedido ${ddmm(p.ini)} a ${ddmm(p.fim)}`));
  db.pedidosEnviados = pedidosEnviados().filter((x) => x.id !== id);
  save(); render(); toast("Pedido cancelado");
}
function pedidosEnviadosHtml(area) {
  const lista = pedidosEnviados().filter((p) => p.area === area).sort((a, b) => b.ini.localeCompare(a.ini));
  if (!lista.length) return "";
  const conta = (p, tipo) => db.pagamentos.find((x) => x.auto === `ped:${p.id}:${tipo}`);
  const sit = (c) => (!c ? '<span class="hint">—</span>' : c.pago ? `<span class="badge b-green">${pagoEmAtraso(c) ? "Pago em atraso" : "Pago"}</span>` : totalmenteSeparado(c) ? '<span class="badge b-green">Separado</span>' : '<span class="badge b-yellow">A separar</span>');
  return `<div class="card mt"><div class="card-head"><div><h3>Pedidos enviados</h3><div class="sub">Cada pedido gerou a conta de mão de obra e a de insumos em Pagamentos (área e Negócio todo) e baixou o material do estoque</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Produção</th><th class="num">Quantidade</th><th class="num">Mão de obra</th><th class="num">Insumos</th><th>Vence</th><th>Mão de obra</th><th>Insumos</th><th></th></tr></thead><tbody>
    ${lista.map((p) => `<tr><td><b>${ddmm(p.ini)} a ${ddmm(p.fim)}</b><div class="hint">enviado em ${ddmm(p.enviadoEm)}</div></td>
      <td class="num">${area === "pacoca" ? `${int(p.U)} pacotes` : `${int(p.G)} G + ${int(p.P)} P<div class="hint">${int(p.doces)} doces</div>`}</td>
      <td class="num"><b>${brl(p.mo)}</b></td><td class="num">${brl(p.insumos + (p.nfe || 0))}</td><td>${ddmm(p.venc)}</td>
      <td>${sit(conta(p, "mo"))}</td><td>${sit(conta(p, "ins"))}</td>
      <td><button class="btn btn-ghost btn-sm btn-danger" data-act="ped-cancelar" data-id="${p.id}" title="Cancelar pedido">${icon("trash")}</button></td></tr>`).join("")}
    </tbody></table></div></div>`;
}
// Paçoca: vendas saem primeiro dos pacotes prontos (produzidos pelos pedidos); o excedente baixa os itens
function consumoVendasPacoca(regs) {
  const q = sum(regs, (r) => +r.itens?.U || 0), out = [];
  if (!q) return out;
  const dePronto = Math.min(q, Math.max(0, saldoDe("pronto:pac").qtd)), feitos = q - dePronto;
  if (dePronto) out.push({ ref: "pronto:pac", nome: "Pacotes prontos", qtd: dePronto });
  if (feitos) db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0).forEach((i) => out.push({ ref: "pac:" + i.id, nome: i.nome, qtd: feitos * consumoPacote(i), feitos }));
  return out;
}

/* ---------- Paçoca · Custos & Compras ---------- */
function pacSimHtml() {
  const s = db.pacocaSim, g = gastosSimPacoca(), tot = sum(g.linhas, (l) => l.mes), lucro = g.recMes - tot;
  return `<div class="big-result"><small>Lucro líquido previsto no mês</small><div>${brl(lucro)}</div><small>${brl(lucro / g.div)} por dia de venda · ${int(g.unMes)} pacotes · ${int(s.dias)} dias de venda</small></div>
    <div class="grid g-2 mt" style="gap:12px">
      <div class="stat"><small>Faturamento esperado</small><strong>${brl(g.esperado)}</strong></div>
      <div class="stat"><small>Recebido (após não recebidos)</small><strong>${brl(g.recMes)}</strong></div>
      <div class="stat"><small>Total de gastos no mês</small><strong>${brl(tot)}</strong></div>
      <div class="stat"><small>Margem líquida</small><strong class="${lucro >= 0 ? "pos" : "neg"}">${pct(g.recMes ? (lucro / g.recMes) * 100 : 0)}</strong></div>
    </div>
    ${(() => {
      const contrib = g.unMes ? (g.recMes - g.variavelMes) / g.unMes : 0, fixo = tot - g.variavelMes, eq = contrib > 0 && +s.dias ? Math.ceil(fixo / contrib / +s.dias) : null;
      return `<div class="alert ${eq === null ? "yellow" : "green"} mt">${icon(eq === null ? "alert" : "check")}<div><b>Ponto de equilíbrio</b>
        <span>${eq === null ? "Informe pacotes por dia e dias de venda para calcular." : `Você precisa vender <strong>${int(eq)} pacotes por dia</strong> de venda para pagar gasolina, despesas e impostos fixos. Cada pacote deixa ${brl(contrib)} depois dos custos variáveis.`}</span></div></div>`;
    })()}`;
}
function viewPacCustos() {
  setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Preço de venda
    <input class="inline" style="width:90px" inputmode="decimal" data-act="set-preco-pac" value="${String(db.config.precoPacoca).replace(".", ",")}" /></label>`);
  const totCompra = sum(db.pacocaCompra, (c) => (+c.qtd || 0) * (+c.valor || 0));
  const s = db.pacocaSim;
  const histNr = sum(db.pacoca, esperadoPac) ? (sum(db.pacoca, naoRecPac) / sum(db.pacoca, esperadoPac)) * 100 : 0;
  return `
  <div class="grid g-2">
    <div class="card"><div class="card-head"><div><h3>Custo por pacote</h3><div class="sub">Insumos vêm da tela Insumos; mão de obra e outros custos você edita aqui</div></div><a class="btn btn-sm" href="#insumos-pacoca">Abrir Insumos</a></div>
      ${fichaPacoteHtml()}
      <div id="pacUnit">${pacUnitHtml()}</div>
    </div>
    <div class="card"><div class="card-head"><div><h3>Simulador</h3><div class="sub">${int(s.porDia)} pacotes/dia · ${int(s.dias)} dias · ${pct(s.naoRecPct)} não recebido (histórico: ${pct(histNr)})</div></div><a class="btn btn-sm btn-primary" href="#simulador-pacoca">Abrir simulador</a></div>
      <div id="pacSim">${pacSimHtml()}</div>
    </div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Compra mensal</h3><div class="sub">Lista de reposição de estoque da paçoca</div></div><button class="btn btn-primary btn-sm" data-act="new-compra">${icon("plus")}Adicionar item</button></div>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Quantidade</th><th class="num">Valor unitário</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${db.pacocaCompra.map((c) => `<tr><td>${esc(c.nome)}</td><td class="num">${int(c.qtd)}</td><td class="num">${brlU(c.valor)}</td><td class="num"><b>${brl((+c.qtd || 0) * (+c.valor || 0))}</b></td><td>${rowActions("compra", c.id)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="3">Total da compra</td><td class="num">${brl(totCompra)}</td><td></td></tr></tfoot></table></div>
  </div>`;
}
function pacUnitHtml() {
  const cu = custoUnitPacoca(), preco = +db.config.precoPacoca || 0, nr = naoRecPctPacoca();
  const lucro = lucroPacoca(preco), m = preco ? (lucro / preco) * 100 : 0;
  return `<div class="prod-stats mt" style="grid-template-columns:repeat(auto-fit,minmax(104px,1fr))">
    <div class="stat"><small>Custo</small><strong>${brl(cu)}</strong></div>
    <div class="stat"><small>Não recebido (${pct(nr)})</small><strong class="neg">${brl((preco * nr) / 100)}</strong></div>
    <div class="stat"><small>Lucro / pacote</small><strong class="${lucro >= 0 ? "pos" : "neg"}">${brl(lucro)}</strong></div>
    <div class="stat"><small>Margem</small><strong class="${m >= 0 ? "pos" : "neg"}">${pct(m)}</strong></div></div>
    <div class="hint" style="margin-top:8px">Preço ${brl(preco)} − ${pct(nr)} de não recebimento (pix confiança) − custo ${brl(cu)}${impostoPacote() ? ` (insumos ${brl(custoInsumosPacote())} + imposto NF-e ${brl(impostoPacote())} + mão de obra e outros)` : ""}. O % é ajustado no Simulador da paçoca.</div>`;
}
const compraFields = [
  { key: "nome", label: "Item", required: true, full: true },
  { key: "qtd", label: "Quantidade", type: "num" },
  { key: "valor", label: "Valor unitário (R$)", type: "num" },
];
function formCompra(c) {
  openForm({
    title: c ? "Editar item da compra" : "Novo item da compra",
    fields: compraFields,
    values: c || {},
    preview: (v) => `<span>Total</span><span>${brl(v.qtd * v.valor)}</span>`,
    onSave: (vals) => { if (c) Object.assign(c, vals); else db.pacocaCompra.push({ id: uid(), ...vals }); toast("Item salvo"); },
  });
}

/* ---------- Área do vendedor ---------- */
const PAGS = { pix: "Pix", especie: "Dinheiro", cartao: "Cartão" };
const pagsArea = (area) => (area === "pacoca" ? ["pix", "especie"] : ["pix", "especie", "cartao"]);
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const tiposArea = (area) => db.vendedor.tipos[area];
function custoTipo(area, key) {
  if (area === "pacoca") return custoUnitPacoca();
  const t = tiposArea("doces").find((x) => x.key === key);
  const p = t && db.produtos.find((x) => x.canal === "Outbound" && x.nome === t.produto);
  return p ? custoBase(p) : 0;
}
function precoNormal(area, key) {
  if (area === "pacoca") return +db.config.precoPacoca || 0;
  const t = tiposArea("doces").find((x) => x.key === key);
  return +(db.produtos.find((x) => x.canal === "Outbound" && x.nome === t?.produto)?.preco) || 0;
}
const custoRegistro = (r) => sum(Object.entries(r.itens), ([k, q]) => q * custoTipo(r.area, k));
const descItens = (area, itens) => Object.entries(itens).filter(([, q]) => q).map(([k, q]) => {
  const t = tiposArea(area).find((x) => x.key === k);
  return `${q} × ${t ? t.nome : k}`;
}).join(" + ");
const valorNormalItens = (area, itens) => sum(Object.entries(itens), ([k, q]) => q * precoNormal(area, k));
const registrosDia = (area) => db.vendedor.registros.filter((r) => r.area === area && r.data === ui.vendData);
// Forma de pagamento e nome ficam só neste aparelho (cada vendedor escolhe a sua)
const getPag = (area) => localStorage.getItem("hag_pag_" + area) || "pix";
const setPag = (area, v) => localStorage.setItem("hag_pag_" + area, v);
const nomeVendedor = () => localStorage.getItem("hag_vendedor_nome") || "";
// O modo vem só da página aberta (vendedor.html ou index.html), nunca de algo gravado no aparelho
localStorage.removeItem("hag_modo");
const APP_VENDEDOR = window.HAG_MODO === "vendedor";
// Gestão e vendedor são dois aplicativos em pastas separadas (gestao/ e vendedor/), com escopos que não se cruzam
const urlApp = (pagina = "") => new URL((window.HAG_BASE || "./") + pagina, location.href).href.split("#")[0];
function novoRegistro(area, dados) {
  const r = { id: uid(), area, data: ui.vendData, hora: new Date().toTimeString().slice(0, 5), ts: Date.now(), device: Sync.client, vendedor: nomeVendedor() || "Gestão", lancado: false, ...dados };
  db.vendedor.registros.push(r);
  salvarLocal(); Sync.putRegistro(r);
  return r;
}

function viewVendedor(area) {
  if (!ui.vendData || APP_VENDEDOR) ui.vendData = hojeISO();
  if (area === "pacoca") return viewVendedorPacoca();
  const regs = registrosDia(area);
  const pend = regs.filter((r) => !r.lancado);
  const meus = regs.filter((r) => r.device === Sync.client);
  const pag = getPag(area);
  const fat = sum(regs, (r) => r.valor), cus = sum(regs, custoRegistro);
  const itensTot = {};
  regs.forEach((r) => Object.entries(r.itens).forEach(([k, q]) => { itensTot[k] = (itensTot[k] || 0) + q; }));
  const destino = area === "pacoca" ? "Vendas diárias da paçoca" : "Vendas (Outbound, semana do dia)";
  const porVendedor = {};
  regs.forEach((r) => { const v = r.vendedor || "Gestão"; porVendedor[v] = porVendedor[v] || { n: 0, total: 0 }; porVendedor[v].n++; porVendedor[v].total += r.valor; });
  if (APP_VENDEDOR) {
    setActions(`<div class="tabs">${Object.entries(AREAS).filter(([k]) => k !== "geral").map(([k, a]) => `<button class="${k === area ? "active" : ""}" data-act="vend-area" data-val="${k}">${a.nome}</button>`).join("")}</div>
      <button class="btn btn-sm" data-act="vend-nome">${icon("edit")}${esc(nomeVendedor() || "Seu nome")}</button>`);
  } else {
    setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Dia <input type="date" class="inline" data-act="vend-data" value="${ui.vendData}" /></label>
      ${pend.length ? `<span class="badge b-yellow">${pend.length} venda(s) não lançada(s)</span>` : ""}`);
  }
  if (APP_VENDEDOR && !nomeVendedor()) {
    return `<div class="card" style="max-width:460px;margin:20px auto;text-align:center">
      <h3 style="margin-top:0">Bem-vindo(a)!</h3><p class="hint">Digite seu nome para identificar suas vendas.</p>
      <input id="nomeVendedorInput" placeholder="Seu nome" style="text-align:center;font-size:16px" />
      <button class="btn btn-primary mt" style="width:100%;justify-content:center" data-act="vend-nome-salvar">Começar a vender</button></div>`;
  }
  return `
  <div class="card">
    <div class="card-head"><div><h3>1. Forma de pagamento</h3><div class="sub">Escolha antes de tocar no item</div></div></div>
    <div class="pag-row">${pagsArea(area).map((k) => `<button class="pag-btn ${pag === k ? "active" : ""}" data-act="vend-pag" data-val="${k}">${PAGS[k]}</button>`).join("")}</div>
    <div class="card-head" style="margin-top:20px"><div><h3>2. Toque no que foi vendido</h3><div class="sub">Cada toque registra uma venda em ${PAGS[pag]}</div></div></div>
    <div class="vend-sec">Preço normal</div>
    <div class="combo-grid">${tiposArea(area).map((t) => `
      <button class="combo-btn normal" data-act="vend-normal" data-val="${t.key}">
        <span class="combo-nome">${esc(t.nome)}</span>
        <span class="combo-preco">${brl(precoNormal(area, t.key))}</span>
        <span class="combo-desc">${esc(t.desc)}</span>
        ${area === "doces" && composicaoTxt(t.key) ? `<span class="combo-desc">${esc(composicaoTxt(t.key))}</span>` : ""}
      </button>`).join("")}</div>
    <div class="vend-sec">Promoção</div>
    <div class="combo-grid">${db.vendedor.combos[area].map((c) => { const eco = valorNormalItens(area, c.itens) - c.preco; return `
      <button class="combo-btn" data-act="vend-combo" data-id="${c.id}">
        <span class="promo-tag">PROMO</span>
        <span class="combo-nome">${esc(c.nome)}</span>
        <span class="combo-preco">${brl(c.preco)}</span>
        <span class="combo-desc">${esc(descItens(area, c.itens))}${eco > 0 ? ` · cliente economiza ${brl(eco)}` : ""}</span>
      </button>`; }).join("") || `<div class="hint">Nenhuma promoção cadastrada${APP_VENDEDOR ? "." : '. Crie em "Configurar preços e promoções" abaixo.'}</div>`}</div>
  </div>

  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>${APP_VENDEDOR ? "Vendas de hoje" : "Resumo do dia"}</h3><div class="sub">${ddmm(ui.vendData)} · todos os vendedores</div></div></div>
      <div class="grid g-3" style="gap:10px">
        <div class="stat"><small>Vendas</small><strong>${int(regs.length)}</strong></div>
        <div class="stat"><small>Faturamento</small><strong>${brl(fat)}</strong></div>
        ${APP_VENDEDOR
          ? `<div class="stat"><small>Minhas vendas</small><strong>${int(meus.length)} · ${brl(sum(meus, (r) => r.valor))}</strong></div>`
          : `<div class="stat"><small>Lucro estimado</small><strong class="${fat - cus >= 0 ? "pos" : "neg"}">${brl(fat - cus)}</strong></div>`}
      </div>
      <ul class="recipe-ings mt">
        ${pagsArea(area).map((k) => `<li><span>${PAGS[k]}</span><span>${int(regs.filter((r) => r.pag === k).length)} venda(s)</span><span>${brl(sum(regs.filter((r) => r.pag === k), (r) => r.valor))}</span></li>`).join("")}
      </ul>
      <ul class="recipe-ings mt">
        ${tiposArea(area).map((t) => `<li><span>${esc(t.nome)} <span class="hint">(${esc(t.desc)})</span></span><span></span><span><b>${int(itensTot[t.key] || 0)}</b> vendida(s)</span></li>`).join("")}
      </ul>
      ${Object.keys(porVendedor).length ? `<div class="vend-sec">Por vendedor</div><ul class="recipe-ings">${Object.entries(porVendedor).map(([v, x]) => `<li><span>${esc(v)}</span><span>${int(x.n)} venda(s)</span><span>${brl(x.total)}</span></li>`).join("")}</ul>` : ""}
      <div class="mt" style="display:flex;gap:10px;flex-wrap:wrap">
        ${APP_VENDEDOR ? "" : `<button class="btn btn-primary" data-act="vend-lancar" ${pend.length ? "" : "disabled"}>Fechar o dia: lançar ${pend.length} venda(s)</button>`}
        <button class="btn" data-act="vend-undo" ${meus.some((r) => !r.lancado) ? "" : "disabled"}>Desfazer minha última venda</button>
      </div>
      ${APP_VENDEDOR ? "" : `<div class="hint" style="margin-top:8px">Ao fechar o dia, as vendas entram em <b>${destino}</b>, com custo de insumos calculado automaticamente.</div>`}
    </div>
    <div class="card"><div class="card-head"><div><h3>Vendas do dia</h3><div class="sub">Mais recentes primeiro · atualiza em tempo real</div></div></div>
      ${regs.length ? `<div class="table-wrap"><table><thead><tr><th>Hora</th><th>Item</th><th>Vendedor</th><th>Pagamento</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${[...regs].reverse().map((r) => {
        const podeExcluir = !APP_VENDEDOR || (r.device === Sync.client && !r.lancado);
        return `<tr><td>${r.hora}</td><td>${esc(r.nome)}${r.lancado ? ' <span class="badge b-green">lançada</span>' : ""}</td><td>${esc(r.vendedor || "Gestão")}</td><td>${PAGS[r.pag]}</td><td class="num">${brl(r.valor)}</td>
        <td>${podeExcluir ? `<button class="btn btn-ghost btn-sm btn-danger" data-act="vend-del" data-id="${r.id}">${icon("trash")}</button>` : ""}</td></tr>`;
      }).join("")}
      </tbody></table></div>` : '<div class="empty">Nenhuma venda registrada neste dia.</div>'}
    </div>
  </div>
  ${APP_VENDEDOR ? "" : `

  <details class="card mt comp-config">
    <summary><b>Configurar preços e promoções</b> <span class="hint">· preço normal, promoções e custo de cada item</span></summary>
    <div class="table-wrap mt"><table><thead><tr><th>Preço normal</th><th></th><th class="num">Preço</th><th class="num">Custo</th><th class="num">Lucro</th><th></th></tr></thead><tbody>
    ${tiposArea(area).map((t) => { const pr = precoNormal(area, t.key), cu = custoTipo(area, t.key); return `<tr><td><b>${esc(t.nome)}</b></td><td class="hint">${esc(t.desc)}</td>
      <td class="num">${brl(pr)}</td><td class="num">${brl(cu)}</td><td class="num ${pr - cu >= 0 ? "pos" : "neg"}">${brl(pr - cu)}</td>
      <td class="num"><a class="btn btn-sm" href="#${area === "pacoca" ? "pacoca-custos" : "produtos"}">Alterar preço</a></td></tr>`; }).join("")}
    </tbody></table></div>
    <div class="table-wrap mt"><table><thead><tr><th>Promoção</th><th>Leva</th><th class="num">Preço</th><th class="num">Custo</th><th class="num">Lucro</th><th></th></tr></thead><tbody>
    ${db.vendedor.combos[area].map((c) => { const cu = sum(Object.entries(c.itens), ([k, q]) => q * custoTipo(area, k)); return `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(descItens(area, c.itens))}</td>
      <td class="num">${brl(c.preco)}</td><td class="num">${brl(cu)}</td><td class="num ${c.preco - cu >= 0 ? "pos" : "neg"}">${brl(c.preco - cu)}</td><td>${rowActions("combo", c.id)}</td></tr>`; }).join("") || '<tr><td colspan="6" class="hint">Nenhuma promoção cadastrada.</td></tr>'}
    </tbody></table></div>
    <div class="mt" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-sm btn-primary" data-act="new-combo">${icon("plus")}Nova promoção</button>
      ${area === "doces" ? tiposArea("doces").map((t) => `<label class="hint" style="display:flex;align-items:center;gap:6px">Custo da ${esc(t.nome)} =
        <select class="inline" data-act="vend-tipo-prod" data-key="${t.key}">${db.produtos.filter((p) => p.canal === "Outbound").map((p) => `<option ${p.nome === t.produto ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>`).join("") : `<span class="hint">Custo por paçoca: ${brl(custoUnitPacoca())} (altere em Personalizar custos)</span>`}
    </div>
  </details>`}`;
}
// Paçoca é pix confiança: o vendedor entrega o pacote e o pagamento vem depois.
// Entregas geram o valor esperado; pagamentos (Pix/Dinheiro) são registrados à parte. Não recebido = esperado − recebido.
const ehEntrega = (r) => r.tipo !== "receb" && +(r.itens?.U || 0) > 0;
const ehRecebimento = (r) => !!r.pag && (r.tipo === "receb" || ehEntrega(r));
function resumoPacocaDia(regs) {
  const entregas = regs.filter(ehEntrega), recs = regs.filter(ehRecebimento);
  const pacotes = sum(entregas, (r) => +r.itens.U || 0), esperado = sum(entregas, (r) => +r.valor || 0);
  const pix = sum(recs.filter((r) => r.pag === "pix"), (r) => +r.valor || 0), dinheiro = sum(recs.filter((r) => r.pag === "especie"), (r) => +r.valor || 0);
  const recebido = pix + dinheiro, falta = esperado - recebido;
  return { pacotes, esperado, pix, dinheiro, recebido, falta, pctFalta: esperado ? (falta / esperado) * 100 : 0 };
}
function viewVendedorPacoca() {
  const area = "pacoca", regs = registrosDia(area), pend = regs.filter((r) => !r.lancado);
  const meus = regs.filter((r) => r.device === Sync.client), pag = getPag(area) === "cartao" ? "pix" : getPag(area);
  const preco = precoNormal(area, "U"), meta = naoRecPctPacoca(), t = tiposArea(area)[0];
  const d = resumoPacocaDia(regs), m = resumoPacocaDia(meus);
  const porVendedor = {};
  regs.forEach((r) => { const v = r.vendedor || "Gestão"; porVendedor[v] = porVendedor[v] || []; porVendedor[v].push(r); });
  if (APP_VENDEDOR) {
    setActions(`<div class="tabs">${Object.entries(AREAS).filter(([k]) => k !== "geral").map(([k, a]) => `<button class="${k === area ? "active" : ""}" data-act="vend-area" data-val="${k}">${a.nome}</button>`).join("")}</div>
      <button class="btn btn-sm" data-act="vend-nome">${icon("edit")}${esc(nomeVendedor() || "Seu nome")}</button>`);
    if (!nomeVendedor()) return `<div class="card" style="max-width:460px;margin:20px auto;text-align:center">
      <h3 style="margin-top:0">Bem-vindo(a)!</h3><p class="hint">Digite seu nome para identificar suas vendas.</p>
      <input id="nomeVendedorInput" placeholder="Seu nome" style="text-align:center;font-size:16px" />
      <button class="btn btn-primary mt" style="width:100%;justify-content:center" data-act="vend-nome-salvar">Começar a vender</button></div>`;
  } else {
    setActions(`<label class="hint" style="display:flex;align-items:center;gap:8px">Dia <input type="date" class="inline" data-act="vend-data" value="${ui.vendData}" /></label>
      ${pend.length ? `<span class="badge b-yellow">${pend.length} registro(s) não lançado(s)</span>` : ""}`);
  }
  const statusFalta = d.pctFalta > meta ? "red" : "green";
  return `
  <div class="card">
    <div class="card-head"><div><h3>1. Entregar pacotes</h3><div class="sub">Pix confiança: registre cada pacote entregue — o pagamento é registrado depois, no passo 2</div></div></div>
    <div class="combo-grid">
      <button class="combo-btn normal" data-act="vend-normal" data-val="U"><span class="combo-nome">Entregar 1 pacote</span><span class="combo-preco">${brl(preco)}</span><span class="combo-desc">${esc(t?.desc || "")}</span></button>
      ${db.vendedor.combos[area].map((c) => `<button class="combo-btn" data-act="vend-combo" data-id="${c.id}"><span class="promo-tag">PROMO</span><span class="combo-nome">${esc(c.nome)}</span><span class="combo-preco">${brl(c.preco)}</span><span class="combo-desc">${esc(descItens(area, c.itens))}</span></button>`).join("")}
    </div>
    <div class="sim-row mt" style="grid-template-columns:minmax(0,1fr) minmax(50px,90px) minmax(82px,150px);border:0"><span>Entregar vários de uma vez</span>
      <input id="pacQtdLote" class="tbl-input" style="width:100%" inputmode="numeric" placeholder="qtd" />
      <button class="btn btn-sm btn-primary" data-act="pac-entregar-lote">Entregar pacotes</button></div>

    <div class="card-head" style="margin-top:22px"><div><h3>2. Registrar pagamento recebido</h3><div class="sub">Quando o cliente pagar (no dia ou depois), registre aqui</div></div></div>
    <div class="pag-row">${["pix", "especie"].map((k) => `<button class="pag-btn ${pag === k ? "active" : ""}" data-act="vend-pag" data-val="${k}">${PAGS[k]}</button>`).join("")}</div>
    <div class="chip-row mt">${[1, 2, 3, 5].map((n) => `<button class="btn" data-act="pac-receber" data-val="${preco * n}">+ ${brl(preco * n)}</button>`).join("")}</div>
    <div class="sim-row mt" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px) auto;border:0"><span>Outro valor</span>
      <input id="pacRecValor" class="tbl-input" style="width:100%" inputmode="decimal" placeholder="R$" />
      <button class="btn btn-sm btn-primary" data-act="pac-receber">Registrar em ${PAGS[pag]}</button></div>
  </div>

  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>${APP_VENDEDOR ? "Hoje" : "Resumo do dia"}</h3><div class="sub">${ddmm(ui.vendData)} · todos os vendedores</div></div></div>
      <div class="grid g-2" style="gap:10px">
        <div class="stat"><small>Pacotes entregues</small><strong>${int(d.pacotes)}</strong><div class="hint">esperado ${brl(d.esperado)}</div></div>
        <div class="stat"><small>Recebido</small><strong class="pos">${brl(d.recebido)}</strong><div class="hint">Pix ${brl(d.pix)} · Dinheiro ${brl(d.dinheiro)}</div></div>
        <div class="stat"><small>Não recebido</small><strong class="${d.falta > 0 ? "neg" : "pos"}">${brl(d.falta)}</strong><div class="hint"><span class="badge b-${statusFalta}">${pct(d.pctFalta)}</span> previsão ${pct(meta)}</div></div>
        ${APP_VENDEDOR
          ? `<div class="stat"><small>Meus números</small><strong>${int(m.pacotes)} pacotes</strong><div class="hint">recebi ${brl(m.recebido)} · faltam ${brl(m.falta)}</div></div>`
          : `<div class="stat"><small>Lucro estimado</small><strong class="${d.recebido - d.pacotes * custoUnitPacoca() >= 0 ? "pos" : "neg"}">${brl(d.recebido - d.pacotes * custoUnitPacoca())}</strong><div class="hint">recebido − custo dos pacotes</div></div>`}
      </div>
      ${Object.keys(porVendedor).length ? `<div class="vend-sec">Por vendedor</div><ul class="recipe-ings">${Object.entries(porVendedor).map(([v, l]) => { const x = resumoPacocaDia(l); return `<li><span>${esc(v)}</span><span>${int(x.pacotes)} pacotes · recebeu ${brl(x.recebido)}</span><span class="${x.falta > 0 ? "neg" : ""}">falta ${brl(x.falta)}</span></li>`; }).join("")}</ul>` : ""}
      <div class="mt" style="display:flex;gap:10px;flex-wrap:wrap">
        ${APP_VENDEDOR ? "" : `<button class="btn btn-primary" data-act="vend-lancar" ${pend.length ? "" : "disabled"}>Fechar o dia: lançar em Vendas diárias</button>`}
        <button class="btn" data-act="vend-undo" ${meus.some((r) => !r.lancado) ? "" : "disabled"}>Desfazer meu último registro</button>
      </div>
      ${APP_VENDEDOR ? "" : `<div class="hint" style="margin-top:8px">Ao fechar o dia: pacotes entregues = Nº de vendas, Pix e Dinheiro recebidos, insumos, gasolina e mão de obra — o "não recebido" é calculado como na planilha.</div>`}
    </div>
    <div class="card"><div class="card-head"><div><h3>Registros do dia</h3><div class="sub">Entregas e pagamentos · atualiza em tempo real</div></div></div>
      ${regs.length ? `<div class="table-wrap"><table><thead><tr><th>Hora</th><th>Registro</th><th class="hide-m">Vendedor</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${[...regs].reverse().map((r) => { const podeExcluir = !APP_VENDEDOR || (r.device === Sync.client && !r.lancado); const entrega = ehEntrega(r) && !r.pag;
        return `<tr><td>${r.hora}</td><td>${entrega ? `<span class="badge b-gold">Entrega</span> ${int(r.itens.U)} pacote(s)` : r.tipo === "receb" ? `<span class="badge b-green">${PAGS[r.pag]}</span> pagamento` : `<span class="badge b-green">${PAGS[r.pag]}</span> ${esc(r.nome)}`}${r.lancado ? ' <span class="badge b-gray">lançado</span>' : ""}</td>
        <td class="hide-m">${esc(r.vendedor || "Gestão")}</td><td class="num ${entrega ? "" : "pos"}">${entrega ? "" : "+"}${brl(r.valor)}</td>
        <td>${podeExcluir ? `<button class="btn btn-ghost btn-sm btn-danger" data-act="vend-del" data-id="${r.id}">${icon("trash")}</button>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>` : '<div class="empty">Nenhum registro neste dia.</div>'}
    </div>
  </div>
  ${APP_VENDEDOR ? "" : `
  <details class="card mt comp-config">
    <summary><b>Configurar preço e promoções</b> <span class="hint">· lucro já descontando ${pct(meta)} de não recebimento</span></summary>
    <div class="table-wrap mt"><table><thead><tr><th>Item</th><th>Leva</th><th class="num">Preço</th><th class="num">Custo</th><th class="num">Lucro esperado</th><th></th></tr></thead><tbody>
      <tr><td><b>${esc(t?.nome || "Pacote")}</b> <span class="hint">preço normal</span></td><td>1 pacote</td><td class="num">${brl(preco)}</td><td class="num">${brl(custoUnitPacoca())}</td><td class="num ${lucroPacoca(preco) >= 0 ? "pos" : "neg"}">${brl(lucroPacoca(preco))}</td><td class="num"><a class="btn btn-sm" href="#pacoca-custos">Alterar preço</a></td></tr>
      ${db.vendedor.combos[area].map((c) => { const q = +c.itens.U || 0; return `<tr><td><b>${esc(c.nome)}</b> <span class="badge b-red">promo</span></td><td>${int(q)} pacote(s)</td><td class="num">${brl(c.preco)}</td><td class="num">${brl(custoUnitPacoca() * q)}</td><td class="num ${lucroPacoca(c.preco, q) >= 0 ? "pos" : "neg"}">${brl(lucroPacoca(c.preco, q))}</td><td>${rowActions("combo", c.id)}</td></tr>`; }).join("")}
    </tbody></table></div>
    <button class="btn btn-sm btn-primary mt" data-act="new-combo">${icon("plus")}Nova promoção</button>
  </details>`}`;
}

function formCombo(area, c) {
  const tipos = tiposArea(area);
  openForm({
    title: c ? "Editar promoção" : "Nova promoção",
    fields: [
      { key: "nome", label: "Nome da promoção (ex.: 2 Cx P)", required: true, full: true },
      { key: "preco", label: "Preço promocional (R$)", type: "num", full: true },
      ...tipos.map((t) => ({ key: "t_" + t.key, label: `Quantidade de ${t.nome} (${t.desc})`, type: "num" })),
    ],
    values: { nome: c?.nome || "", preco: c?.preco ?? 0, ...Object.fromEntries(tipos.map((t) => ["t_" + t.key, c?.itens?.[t.key] || 0])) },
    preview: (v) => { const cu = sum(tipos, (t) => (v["t_" + t.key] || 0) * custoTipo(area, t.key)); return `<span>Custo: ${brl(cu)}</span><span class="${v.preco - cu >= 0 ? "pos" : "neg"}">Lucro: ${brl(v.preco - cu)}</span>`; },
    onSave: (v) => {
      const novo = { nome: v.nome, preco: v.preco, itens: Object.fromEntries(tipos.map((t) => [t.key, v["t_" + t.key] || 0]).filter(([, q]) => q)) };
      if (c) Object.assign(c, novo); else db.vendedor.combos[area].push({ id: uid(), ...novo });
      toast("Promoção salva");
    },
  });
}
function semanaDe(iso) {
  const d = new Date(iso + "T12:00:00");
  const ini = new Date(d); ini.setDate(d.getDate() - ((d.getDay() - 3 + 7) % 7));
  const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
  const f = (x) => x.toISOString().slice(0, 10);
  return { inicio: f(ini), fim: f(fim) };
}
function lancarDia(area) {
  const pend = registrosDia(area).filter((r) => !r.lancado);
  if (!pend.length) return;
  const porPag = (k) => sum(pend.filter((r) => r.pag === k), (r) => r.valor);
  if (area === "pacoca") {
    const qtd = sum(pend, (r) => r.itens.U || 0);
    const mo = +(db.pacocaCusto.find((c) => /m[ãa]o/i.test(c.nome))?.valor) || 0;
    let reg = db.pacoca.find((p) => p.data === ui.vendData);
    if (!reg) { reg = { id: uid(), data: ui.vendData, qtd: 0, pix: 0, especie: 0, insumos: 0, imposto: 0, gasolina: +db.pacocaSim.gasolinaDia || 0, maoObra: 0 }; db.pacoca.push(reg); }
    reg.qtd += qtd; reg.pix += porPag("pix"); reg.especie += porPag("especie");
    if (!("imposto" in reg)) Object.assign(reg, { insumos: insumosReg(reg), imposto: impostoReg(reg) });
    reg.insumos += qtd * custoInsumosPacote(); reg.imposto += qtd * impostoPacote(); reg.maoObra += qtd * mo;
  } else {
    let reg = db.vendas.find((v) => v.canal === "Outbound" && v.inicio <= ui.vendData && v.fim >= ui.vendData);
    if (!reg) { reg = { id: uid(), canal: "Outbound", ...semanaDe(ui.vendData), qtd: 0, cartao: 0, pix: 0, especie: 0, insumos: 0, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 }; db.vendas.push(reg); }
    reg.qtd = (+reg.qtd || 0) + pend.length;
    reg.cxP = (+reg.cxP || 0) + sum(pend, (r) => +r.itens.P || 0);
    reg.cxG = (+reg.cxG || 0) + sum(pend, (r) => +r.itens.G || 0);
    reg.cartao = (+reg.cartao || 0) + porPag("cartao"); reg.pix = (+reg.pix || 0) + porPag("pix"); reg.especie = (+reg.especie || 0) + porPag("especie");
    reg.insumos = (+reg.insumos || 0) + sum(pend, custoRegistro);
  }
  baixaVendas(area, pend);
  pend.forEach((r) => { r.lancado = true; Sync.putRegistro(r); });
  toast(`${pend.length} venda(s) lançada(s)`);
}

/* ---------- Pagamentos ---------- */
const CATS_PAG = {
  pagar: ["Mão de obra", "Insumos", "Embalagens", "Gasolina", "Contador", "Impostos", "Notas fiscais (NF-e)", "Pró-labore", "Comissão", "Aluguel / contas", "Marketing", "Outros"],
  receber: ["Cliente", "Revendedor", "Encomenda", "iFood", "Paçoca (fiado)", "Outros"],
};
const AREA_LABEL = { doces: "Doces Finos", pacoca: "Paçoca", geral: "Negócio todo" };
// Cada conta é um registro só: marcar pago numa área ou no Negócio todo vale para as duas abas. Os impostos do negócio (area "geral") só são pagos no Negócio todo; as áreas separam a parte delas
const pagoEmAtraso = (p) => p.pago && (p.atraso || (p.dataPago && p.vencimento && p.dataPago > p.vencimento));
// Contas do negócio (DAS, DARF, contabilidade) têm uma parte de cada área: o DAS pelo faturamento, os fixos pela divisão escolhida
function fracArea(p, area) {
  if (p.area === area) return 1;
  if (p.area !== "geral" || !area) return 0;
  const auto = String(p.auto || ""), m = +(auto.match(/:(\d+)$/)?.[1]) || (p.vencimento ? monthOf(p.vencimento) : mesAtual());
  if (auto.startsWith("das:")) { const rT = resumo(m).receita; return rT ? resumo(m, area).receita / rT : 0.5; }
  return shareFixos(m, area);
}
const parteConta = (p, area) => round2((+p.valor || 0) * fracArea(p, area));
const valorVisto = (p, area) => (area && area !== "geral" && p.area === "geral" ? parteConta(p, area) : +p.valor || 0);
const separadoConta = (p, area) => (p.area === "geral"
  ? (area && area !== "geral" ? +(p.sepArea?.[area]?.valor || 0) : sum(Object.values(p.sepArea || {}), (s) => +s?.valor || 0))
  : (p.separado ? +p.valorSeparado || 0 : 0));
const faltaSeparar = (p, area) => (p.pago ? 0 : Math.max(0, round2(valorVisto(p, area) - separadoConta(p, area))));
const totalmenteSeparado = (p, area) => p.pago || faltaSeparar(p, area) <= 0.004;
const situacaoPag = (p) => {
  if (p.pago) return p.tipo === "receber" ? { t: "Recebido", c: "green" } : pagoEmAtraso(p) ? { t: "Pago em atraso", c: "gold" } : { t: "Pago", c: "green" };
  const hoje = hojeISO();
  if (p.vencimento && p.vencimento < hoje) return { t: "Vencido", c: "red" };
  if (p.vencimento === hoje) return { t: "Vence hoje", c: "yellow" };
  return { t: "Pendente", c: "yellow" };
};
const situacaoSeparar = (p, area) => {
  if (p.pago) return pagoEmAtraso(p) ? { t: "Pago em atraso", c: "gold" } : { t: "Pago", c: "green" };
  if (totalmenteSeparado(p, area)) return { t: "Separado", c: "green" };
  if (separadoConta(p, area) > 0) return { t: `Separar + ${brl(faltaSeparar(p, area))}`, c: "yellow" };
  if (p.vencimento && p.vencimento < hojeISO()) return { t: "Vencido · a separar", c: "red" };
  return { t: "A separar", c: "yellow" };
};
function formPagamento(area, p) {
  const tipoLabel = { pagar: "A pagar", receber: "A receber" };
  const tipoIni = p?.tipo || ui.pgTipo;
  const separando = area !== "geral" && tipoIni === "pagar" && p?.area !== "geral";
  const opcoes = tipoIni === "receber" ? ["Pendente", "Recebido"] : separando ? ["A separar", "Separado", "Pago", "Pago em atraso"] : ["Pendente", "Pago", "Pago em atraso"];
  const atual = !p ? opcoes[0] : p.tipo === "receber" ? (p.pago ? "Recebido" : "Pendente") : p.pago ? (pagoEmAtraso(p) ? "Pago em atraso" : "Pago") : separando ? (totalmenteSeparado(p) ? "Separado" : "A separar") : "Pendente";
  openForm({
    title: p ? "Editar conta" : "Nova conta",
    fields: [
      { key: "tipo", label: "Tipo", type: "select", options: ["A pagar", "A receber"] },
      { key: "area", label: "Área", type: "select", options: Object.values(AREA_LABEL) },
      { key: "descricao", label: "Descrição", required: true, full: true },
      { key: "categoria", label: "Categoria", type: "select", options: [...new Set([...CATS_PAG.pagar, ...CATS_PAG.receber])] },
      { key: "valor", label: "Valor (R$)", type: "num" },
      { key: "vencimento", label: "Vencimento", type: "date" },
      { key: "status", label: "Situação", type: "select", options: opcoes },
    ],
    values: {
      tipo: tipoLabel[tipoIni], area: AREA_LABEL[p?.area || area] || AREA_LABEL.geral, descricao: p?.descricao || "", categoria: p?.categoria || CATS_PAG[tipoIni][0],
      valor: p?.valor ?? 0, vencimento: p?.vencimento || hojeISO(), status: atual,
    },
    onSave: (v) => {
      const novo = {
        tipo: v.tipo === "A receber" ? "receber" : "pagar", area: Object.keys(AREA_LABEL).find((k) => AREA_LABEL[k] === v.area),
        descricao: v.descricao, categoria: v.categoria, valor: v.valor, vencimento: v.vencimento,
      };
      if (v.status === "Separado") Object.assign(novo, { separado: true, valorSeparado: v.valor, dataSeparado: p?.dataSeparado || hojeISO(), pago: false, atraso: false, dataPago: null });
      if (v.status === "A separar") Object.assign(novo, { separado: false, valorSeparado: 0, dataSeparado: null, pago: false, atraso: false, dataPago: null });
      if (["Pago", "Pago em atraso", "Recebido"].includes(v.status)) Object.assign(novo, { pago: true, atraso: v.status === "Pago em atraso", dataPago: p?.dataPago || hojeISO() });
      if (v.status === "Pendente") Object.assign(novo, { pago: false, atraso: false, dataPago: null });
      if (p?.auto && (Math.abs(+p.valor - +novo.valor) > 0.004 || p.vencimento !== novo.vencimento || p.descricao !== novo.descricao)) novo.travado = true;
      if (p) Object.assign(p, novo); else db.pagamentos.push({ id: uid(), pago: false, dataPago: null, ...novo });
      toast("Conta salva");
    },
  });
}
// Relatório para pagar no fim do mês: o que cada área separou, o que já foi pago e o que falta
function relatorioPagamentosHtml(m) {
  const contas = db.pagamentos.filter((p) => p.tipo === "pagar" && (!m || (p.vencimento && monthOf(p.vencimento) === m)));
  const linha = (nome, l) => {
    const tot = sum(l, (p) => +p.valor || 0), pago = sum(l.filter((p) => p.pago && !pagoEmAtraso(p)), (p) => +p.valor || 0), atraso = sum(l.filter(pagoEmAtraso), (p) => +p.valor || 0);
    const abertas = l.filter((p) => !p.pago), separado = sum(abertas, (p) => (+p.valor || 0) - faltaSeparar(p)), aSeparar = sum(abertas, (p) => faltaSeparar(p));
    return `<tr><td><b>${nome}</b></td><td class="num">${brl(tot)}</td><td class="num pos">${brl(separado)}</td><td class="num ${aSeparar ? "neg" : ""}">${brl(aSeparar)}</td><td class="num">${brl(pago)}</td><td class="num">${brl(atraso)}</td><td class="num ${abertas.length ? "neg" : "pos"}"><b>${brl(sum(abertas, (p) => +p.valor || 0))}</b></td></tr>`;
  };
  return `<div class="table-wrap"><table><thead><tr><th>Área</th><th class="num">Total de contas</th><th class="num">Separado</th><th class="num">A separar</th><th class="num">Pago</th><th class="num">Pago em atraso</th><th class="num">Falta pagar</th></tr></thead>
    <tbody>${linha("Doces finos", contas.filter((p) => p.area === "doces"))}${linha("Paçoca", contas.filter((p) => p.area === "pacoca"))}${linha("Impostos e contabilidade (negócio)", contas.filter((p) => p.area === "geral"))}</tbody>
    <tfoot>${linha("Total", contas).replace(/<\/?b>/g, "")}</tfoot></table></div>`;
}
function viewPagamentos(area) {
  setActions(`<button class="btn btn-primary" data-act="new-pag">${icon("plus")}Nova conta</button>`);
  const separando = area !== "geral" && ui.pgTipo === "pagar";
  const daArea = area === "geral" ? db.pagamentos : db.pagamentos.filter((p) => p.area === area || (p.area === "geral" && p.tipo === "pagar" && parteConta(p, area) > 0.004));
  const doTipo = daArea.filter((p) => p.tipo === ui.pgTipo);
  const vv = (p) => valorVisto(p, area), fs = (p) => faltaSeparar(p, separando ? area : undefined), ts = (p) => totalmenteSeparado(p, separando ? area : undefined);
  const mesesPg = [...new Set(doTipo.filter((p) => p.vencimento).map((p) => monthOf(p.vencimento)))].sort((a, b) => a - b);
  const noMes = doTipo.filter((p) => !ui.pgMes || (p.vencimento && monthOf(p.vencimento) === ui.pgMes));
  const concluida = (p) => (separando ? ts(p) : p.pago);
  const lista = noMes.filter((p) => ui.pgStatus === "todos" || (ui.pgStatus === "pago" ? concluida(p) : !concluida(p)))
    .sort((a, b) => (concluida(a) - concluida(b)) || String(a.vencimento).localeCompare(String(b.vencimento)));
  const pend = noMes.filter((p) => !p.pago), venc = pend.filter((p) => p.vencimento && p.vencimento < hojeISO());
  const em7 = pend.filter((p) => { const d = new Date(hojeISO() + "T12:00:00"); d.setDate(d.getDate() + 7); return p.vencimento && p.vencimento >= hojeISO() && p.vencimento <= d.toISOString().slice(0, 10); });
  const pagos = noMes.filter((p) => p.pago), atrasados = pagos.filter(pagoEmAtraso);
  const verbo = ui.pgTipo === "pagar" ? (separando ? "separar" : "pagar") : "receber";
  const extras = ui.pgTipo === "pagar"
    ? `<label class="hint" style="display:flex;align-items:center;gap:6px">Contas automáticas desde <input type="date" class="inline" data-act="pg-auto-desde" value="${contasAutoDesde()}" /></label>`
    : area === "pacoca" ? `<button class="btn btn-sm" data-act="pg-fiado">Gerar a receber da paçoca não recebida</button>` : "";
  const avisoAuto = ui.pgTipo === "pagar" ? `<div class="alert green" style="margin-bottom:14px">${icon("check")}<div><b>${separando ? "Separe o dinheiro e marque quando pagar — fica igual no Negócio todo" : "Aqui é onde as contas são pagas"}</b>
    <span>${separando ? `Marque "Separado" quando reservar o valor de cada conta ${area === "pacoca" ? "da paçoca" : "dos doces"} e "Pago" quando pagar: a conta fica paga também em Negócio todo › Pagamentos, e o que for pago lá aparece pago aqui. Os impostos do negócio (DAS, DARF, contabilidade) são pagos no Negócio todo; aqui você separa a parte ${area === "pacoca" ? "da paçoca" : "dos doces"}. Se o valor de uma conta automática crescer depois de separada, ela volta a pedir a diferença.` : "Todas as contas: doces, paçoca e os impostos do negócio (DAS, DARF, contabilidade — os de outubro vencem em 20/11). Pagar aqui ou na área da conta dá no mesmo: a situação fica igual nas duas abas. A coluna \"Separado\" mostra se a área já reservou o dinheiro. Paga depois do vencimento fica como \"Pago em atraso\"."}
    Editar uma conta automática trava o valor; excluir faz ela não voltar.</span></div></div>
    <div class="alert yellow" style="margin-bottom:14px">${icon("cal")}<div><b>Vencimentos</b>
    <span>${(area === "geral" ? ["doces", "pacoca"] : [area]).map((a) => CONTAS_AUTO[a].map((cat) => `• <strong>${NOME_CONTA[cat] || cat}${area === "geral" ? ` (${a === "pacoca" ? "paçoca" : "doces"})` : ""}:</strong> ${textoRegra(regraVenc(a, cat))}`).join("<br>")).join("<br>")}<br>• <strong>Impostos e contabilidade:</strong> ${(impGerais().fixos || []).map((f) => `${esc(f.nome)} dia ${+f.dia || 10} ${f.mesSeguinte ? "do mês seguinte (referente ao mês anterior)" : "do próprio mês"}`).join("; ")}; DAS dia ${+impGerais().dasDia || 20} do mês seguinte.<br>${area === "geral" ? "Mude os vencimentos no cartão <b style=\"display:inline\">Vencimentos das contas</b>, logo abaixo." : `Mude os vencimentos em <a class="link" href="#pagamentos-geral">Negócio todo › Pagamentos › Vencimentos das contas</a>.`} Para mudar só uma conta, use o lápis (editar) na linha dela.</span></div></div>` : "";
  const cats = [...new Set(noMes.map((p) => p.categoria))].sort((a, b) => CATS_PAG[ui.pgTipo].indexOf(a) - CATS_PAG[ui.pgTipo].indexOf(b));
  const porCategoria = cats.length ? `<div class="card mt"><div class="card-head"><div><h3>Por categoria</h3><div class="sub">${ui.pgMes ? MESES_FULL[ui.pgMes - 1] : "Todos os vencimentos"}</div></div></div>
    <div class="cat-grid">${cats.map((c) => {
      const l = noMes.filter((p) => p.categoria === c);
      if (separando) { const falta = sum(l, fs), sp = sum(l.filter((p) => !p.pago), (p) => vv(p) - fs(p));
        return `<div class="stat"><small>${esc(c)}</small><strong class="${falta ? "neg" : "pos"}">${falta ? brl(falta) + " a separar" : "Tudo separado"}</strong><div class="hint">${brl(sp)} separado · ${l.length} conta(s)</div></div>`; }
      const pe = sum(l.filter((p) => !p.pago), (p) => +p.valor || 0), pg = sum(l.filter((p) => p.pago), (p) => +p.valor || 0);
      return `<div class="stat"><small>${esc(c)}</small><strong class="${pe ? "neg" : "pos"}">${pe ? brl(pe) + " pendente" : "Em dia"}</strong><div class="hint">${brl(pg)} ${ui.pgTipo === "pagar" ? "pago" : "recebido"} · ${l.length} conta(s)</div></div>`;
    }).join("")}</div></div>` : "";
  const kpis = separando ? `
    ${kpi("A separar", brl(sum(noMes, fs)), `${noMes.filter((p) => !ts(p)).length} conta(s)`, "wallet", sum(noMes, fs) ? "neg" : "")}
    ${kpi("Separado", brl(sum(pend, (p) => vv(p) - fs(p))), "Reservado para pagar no fim do mês", "check", "pos")}
    ${kpi("Vence em 7 dias", brl(sum(em7, fs)), `${em7.filter((p) => !ts(p)).length} conta(s) ainda a separar`, "cal")}
    ${kpi("Já pago", brl(sum(pagos, vv)), `${pagos.length} conta(s) · igual no Negócio todo`, "check")}` : `
    ${kpi(`Pendente a ${verbo}`, brl(sum(pend, (p) => +p.valor || 0)), `${pend.length} conta(s)`, "wallet")}
    ${kpi("Vencido", brl(sum(venc, (p) => +p.valor || 0)), `${venc.length} conta(s) atrasada(s)`, "alert", venc.length ? "neg" : "")}
    ${kpi("Vence em 7 dias", brl(sum(em7, (p) => +p.valor || 0)), `${em7.length} conta(s)`, "cal")}
    ${kpi(ui.pgTipo === "pagar" ? "Já pago" : "Já recebido", brl(sum(pagos, (p) => +p.valor || 0)), ui.pgTipo === "pagar" && atrasados.length ? `${pagos.length} conta(s) · ${atrasados.length} em atraso` : `${pagos.length} conta(s)`, "check", "pos")}`;
  const opcoesFreq = [["semanal", "Semanal (fechamento na terça)"], ["mensal", "Mensal (dia do mês)"], ["seguinte", "Mês seguinte (dia)"]];
  const configVenc = area === "geral" && ui.pgTipo === "pagar" ? `<details class="card mt comp-config" ${ui.vencAberto ? "open" : ""}><summary><b>Vencimentos das contas</b> <span class="hint">· escolha quando vence cada conta automática</span></summary>
    <div class="table-wrap mt"><table><thead><tr><th>Área</th><th>Conta</th><th>Vence</th><th class="num">Dia</th><th class="hide-m">Como fica</th></tr></thead><tbody>
    ${["doces", "pacoca"].map((a) => CONTAS_AUTO[a].map((cat) => { const r = regraVenc(a, cat); return `<tr><td>${AREA_LABEL[a]}</td><td><b>${esc(NOME_CONTA[cat] || cat)}</b></td>
      <td><select class="inline" data-act="venc-freq" data-area="${a}" data-cat="${esc(cat)}">${opcoesFreq.map(([v, l]) => `<option value="${v}" ${r.freq === v ? "selected" : ""}>${l}</option>`).join("")}</select></td>
      <td class="num">${numIn("venc-dia", r.dia, `data-area="${a}" data-cat="${esc(cat)}" style="width:60px"`)}</td><td class="hint hide-m">${textoRegra(r)}</td></tr>`; }).join("")).join("")}
    ${(impGerais().fixos || []).map((f) => `<tr><td>Negócio todo</td><td><b>${esc(f.nome)}</b></td><td><select class="inline" data-act="ig-seguinte-sel" data-id="${f.id}"><option value="0" ${f.mesSeguinte ? "" : "selected"}>Mensal (dia do mês)</option><option value="1" ${f.mesSeguinte ? "selected" : ""}>Mês seguinte (dia)</option></select></td>
      <td class="num">${numIn("ig-dia", +f.dia || 10, `data-id="${f.id}" style="width:60px"`)}</td><td class="hint hide-m">${f.mesSeguinte ? `dia ${+f.dia || 10} do mês seguinte (referente ao mês anterior)` : `dia ${+f.dia || 10} do próprio mês`}</td></tr>`).join("")}
    <tr><td>Negócio todo</td><td><b>DAS</b></td><td class="hint">Mês seguinte (dia)</td><td class="num">${numIn("ig-dasdia", +impGerais().dasDia || 20, `style="width:60px"`)}</td><td class="hint hide-m">dia ${+impGerais().dasDia || 20} do mês seguinte (referente ao mês anterior)</td></tr>
    </tbody></table></div>
    <div class="hint" style="margin-top:8px">Semanal: o "Dia" é quantos dias depois da terça de fechamento (0 = na própria terça). Mensal: dia do próprio mês (31 = último dia). Mês seguinte: dia do mês seguinte. Contas já pagas não mudam.</div></details>` : "";
  const relatorio = area === "geral" && ui.pgTipo === "pagar" ? `<div class="card mt"><div class="card-head"><div><h3>Relatório para pagamento · ${ui.pgMes ? MESES_FULL[ui.pgMes - 1] : "todos os vencimentos"}</h3><div class="sub">O que cada área já separou, o que foi pago e o que falta pagar</div></div><a class="btn btn-sm" href="#dre-geral">Ver DRE unificado</a></div>${relatorioPagamentosHtml(ui.pgMes)}</div>` : "";
  const sepBadge = (p) => (p.pago ? '<span class="hint">—</span>' : totalmenteSeparado(p) ? '<span class="badge b-green">Separado</span>' : separadoConta(p) > 0 ? `<span class="badge b-yellow">Falta ${brl(faltaSeparar(p))}</span>` : '<span class="badge b-gray">Não</span>');
  return `
  <div class="toolbar">${tabs([["pagar", "A pagar"], ["receber", "A receber"]], ui.pgTipo, "set-pgtipo")}
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${tabs(separando ? [["pendente", "A separar"], ["pago", "Separados e pagos"], ["todos", "Todos"]] : [["pendente", "Pendentes"], ["pago", ui.pgTipo === "pagar" ? "Pagos" : "Recebidos"], ["todos", "Todos"]], ui.pgStatus, "set-pgstatus")}
      <select class="inline" data-act="set-pgmes"><option value="0">Todos os vencimentos</option>${mesesPg.map((m) => `<option value="${m}" ${ui.pgMes === m ? "selected" : ""}>${MESES_FULL[m - 1]}</option>`).join("")}</select></div></div>
  <div class="grid g-4">${kpis}</div>
  ${relatorio}
  ${configVenc}
  ${porCategoria}
  <div class="card mt">${avisoAuto}<div class="card-head"><div><h3>Contas a ${separando ? "separar e pagar" : verbo}</h3><div class="sub">${separando ? "Marque quando separar e quando pagar — as datas ficam registradas" : `Marque a caixa quando ${ui.pgTipo === "pagar" ? "pagar" : "receber"} — a data fica registrada`}</div></div>${extras}</div>
    ${lista.length ? `<div class="table-wrap"><table><thead><tr>${separando ? '<th style="width:40px">Sep.</th><th style="width:40px">Pago</th>' : '<th style="width:40px"></th>'}<th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Área</th><th class="num">Valor</th>${area === "geral" && ui.pgTipo === "pagar" ? "<th>Separado</th>" : ""}<th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map((p) => { const s = separando ? situacaoSeparar(p, area) : situacaoPag(p); const feito = separando ? ts(p) : p.pago; const parte = separando && p.area === "geral"; return `<tr class="${p.pago ? "row-pago" : ""}">
      <td>${separando
        ? `<input type="checkbox" class="pg-check" data-act="pg-separar" data-id="${p.id}" ${parte ? `data-area="${area}"` : ""} ${feito ? "checked" : ""} ${p.pago ? "disabled" : ""} title="${p.pago ? "Conta já paga" : feito ? "Desmarcar separação" : "Marcar como separado"}" /></td>
          <td><input type="checkbox" class="pg-check" data-act="pg-toggle" data-id="${p.id}" ${p.pago ? "checked" : ""} ${parte ? "disabled" : ""} title="${parte ? (p.pago ? "Paga no Negócio todo" : "Imposto do negócio: é pago em Negócio todo › Pagamentos") : p.pago ? "Marcar como pendente (vale também no Negócio todo)" : "Marcar como pago (vale também no Negócio todo)"}" />`
        : `<input type="checkbox" class="pg-check" data-act="pg-toggle" data-id="${p.id}" ${p.pago ? "checked" : ""} title="${p.pago ? "Marcar como pendente" : "Marcar como pago"}" />`}</td>
      <td>${p.vencimento ? ddmm(p.vencimento) : "—"}</td><td><b>${esc(p.descricao)}</b>${p.auto ? ` <span class="badge b-gold" title="${p.travado ? "Valor travado (editado à mão)" : "Gerada a partir dos custos"}">${p.travado ? "auto · travada" : "auto"}</span>` : ""}</td><td><span class="badge b-gray">${esc(p.categoria)}</span></td><td class="hint">${AREA_LABEL[p.area] || ""}</td>
      <td class="num"><b>${brl(vv(p))}</b>${parte ? `<div class="hint" title="Parte ${area === "pacoca" ? "da paçoca" : "dos doces"} na conta do negócio">${pct(fracArea(p, area) * 100)} de ${brl(p.valor)}</div>` : ""}</td>
      ${area === "geral" && ui.pgTipo === "pagar" ? `<td>${sepBadge(p)}</td>` : ""}
      <td><span class="badge b-${s.c}">${s.t}</span>${p.pago && p.dataPago ? ` <span class="hint">em ${ddmm(p.dataPago)}</span>` : separando && (parte ? p.sepArea?.[area]?.data : p.separado && p.dataSeparado) ? ` <span class="hint">em ${ddmm(parte ? p.sepArea[area].data : p.dataSeparado)}</span>` : ""}</td>
      <td>${rowActions("pag", p.id)}</td></tr>`; }).join("")}
    </tbody><tfoot><tr><td colspan="${separando ? 6 : 5}">Total</td><td class="num">${brl(sum(lista, vv))}</td><td colspan="${area === "geral" && ui.pgTipo === "pagar" ? 3 : 2}"></td></tr></tfoot></table></div>`
    : `<div class="empty">Nenhuma conta ${ui.pgStatus === "pendente" ? (separando ? "a separar" : "pendente") : ""} aqui.<br/><br/><button class="btn btn-primary" data-act="new-pag">${icon("plus")}Adicionar conta</button></div>`}
  </div>`;
}
function categoriaFixo(nome) {
  if (/contab|contador/i.test(nome)) return "Contador";
  if (/nf-?e|nota fiscal|notas fiscais/i.test(nome)) return "Notas fiscais (NF-e)";
  if (/inss|imposto|simples|das\b|darf|iss\b|mei/i.test(nome)) return "Impostos";
  if (/pr[óo]-?\s?labore/i.test(nome)) return "Pró-labore";
  if (/marketing/i.test(nome)) return "Marketing";
  if (/m[ãa]o de obra|sal[áa]rio|funcion/i.test(nome)) return "Mão de obra";
  return "Aluguel / contas";
}
// Contas a pagar automáticas, puxadas dos custos de cada lançamento e das despesas fixas.
// Cada conta tem uma chave (auto) estável: se o custo muda, a conta em aberto é atualizada; se já foi paga, a diferença vira "complemento".
const addDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const contasAutoDesde = () => db.config.contasAutoDesde || `${hojeISO().slice(0, 7)}-01`;
// Vencimento de cada conta automática, por área: semanal (dias após o fechamento da semana, de quarta a terça),
// mensal (dia do próprio mês; 31 = último dia) ou mês seguinte (dia do mês seguinte)
const CONTAS_AUTO = { doces: ["Mão de obra", "Gasolina", "Insumos", "Comissão"], pacoca: ["Mão de obra", "Gasolina", "Insumos", "Notas fiscais (NF-e)"] };
const NOME_CONTA = { "Notas fiscais (NF-e)": "Imposto NF-e da paçoquita", Comissão: "Comissões / vendedor" };
const regraVenc = (area, cat) => ({ ...(area === "doces" && cat === "Mão de obra" ? { freq: "semanal", dia: 0 } : { freq: "mensal", dia: 31 }), ...(db.vencRegras?.[area]?.[cat] || {}) });
const textoRegra = (r) => (r.freq === "semanal" ? (+r.dia ? `semanal, ${+r.dia} dia(s) após a terça do fechamento` : "semanal, na terça do fechamento da semana") : r.freq === "seguinte" ? `dia ${+r.dia} do mês seguinte` : +r.dia >= 31 ? "último dia do mês" : `dia ${+r.dia} do mês`);
function contasAutomaticas() {
  const desde = contasAutoDesde(), ano = db.config.ano, out = [];
  const push = (base, area, categoria, descricao, valor, vencimento, legado) => { if (valor > 0.004) out.push({ base, area, categoria, descricao, valor: round2(valor), vencimento, legado }); };
  const diaVenc = (a, mes1a12, dia) => `${a}-${String(mes1a12).padStart(2, "0")}-${String(Math.min(new Date(a, mes1a12, 0).getDate(), Math.max(1, Math.round(+dia) || 10))).padStart(2, "0")}`;
  const mesSeguinte = (m, dia) => (m === 12 ? diaVenc(ano + 1, 1, dia) : diaVenc(ano, m + 1, dia));
  // Custos dos lançamentos agrupados conforme o vencimento escolhido para cada conta (semanal, mensal ou mês seguinte).
  // "legado" = contas antigas do mesmo custo: o que já foi pago nelas é descontado do total.
  const grupos = {};
  const lanca = (area, cat, dataRef, semana, valor, legado, doces = 0) => {
    const r = regraVenc(area, cat), m = monthOf(dataRef), nome = `${NOME_CONTA[cat] || cat}`, quem = area === "pacoca" ? "paçoca" : "doces";
    const k = r.freq === "semanal" ? `sem:${area}:${cat}:${semana.inicio}` : `mes:${area}:${cat}:${m}`;
    if (!grupos[k]) grupos[k] = r.freq === "semanal"
      ? { area, cat, venc: addDias(semana.fim, +r.dia || 0), desc: `${nome} ${quem} · semana ${ddmm(semana.inicio)} a ${ddmm(semana.fim)}`, valor: 0, doces: 0, legado: [] }
      : { area, cat, venc: r.freq === "seguinte" ? mesSeguinte(m, r.dia) : diaVenc(ano, m, r.dia), desc: `${nome} · ${MESES_FULL[m - 1]} · ${quem}`, valor: 0, doces: 0, legado: [] };
    grupos[k].valor += +valor || 0; grupos[k].doces += doces; grupos[k].legado.push(...legado);
  };
  // A partir do primeiro pedido enviado, mão de obra e insumos vêm dos pedidos de produção (não das vendas)
  const porPedido = (area, data) => { const d = db.config.pedidosDesde?.[area]; return !!d && data >= d; };
  db.pacoca.filter((p) => p.data >= desde).forEach((p) => {
    const sem = semanaDe(p.data), legado = (c) => [`pac:${p.id}:${c}`, `sem:pacoca:${c}:${sem.inicio}`];
    if (!porPedido("pacoca", p.data)) lanca("pacoca", "Mão de obra", p.data, sem, p.maoObra, legado("mo"));
    lanca("pacoca", "Gasolina", p.data, sem, p.gasolina, legado("gas"));
    if (!porPedido("pacoca", p.data)) { lanca("pacoca", "Insumos", p.data, sem, insumosReg(p), legado("ins")); lanca("pacoca", "Notas fiscais (NF-e)", p.data, sem, impostoReg(p), legado("nfe")); }
  });
  pedidosEnviados().forEach((p) => {
    const per = `pedido ${ddmm(p.ini)} a ${ddmm(p.fim)}`, qtd = p.area === "pacoca" ? `${int(p.U)} pacotes` : `${int(p.doces)} doces`;
    push(`ped:${p.id}:mo`, p.area, "Mão de obra", `Mão de obra · ${per} (${qtd})`, p.mo, p.venc);
    push(`ped:${p.id}:ins`, p.area, "Insumos", `Insumos · ${per} (${qtd})`, p.insumos, p.venc);
    if (p.nfe) push(`ped:${p.id}:nfe`, p.area, "Notas fiscais (NF-e)", `Imposto NF-e paçoquita · ${per}`, p.nfe, p.venc);
  });
  db.vendas.filter((w) => w.fim >= desde).forEach((w) => {
    const sem = { inicio: w.inicio, fim: w.fim }, doces = (+w.cxP || 0) * unidadesCaixa("P") + (+w.cxG || 0) * unidadesCaixa("G");
    if (!porPedido("doces", w.inicio)) lanca("doces", "Mão de obra", w.fim, sem, doces * paramVal("maoObraDoce"), [`doc:${w.id}:mo`, `semana:doces:mo:${w.id}`], doces);
    lanca("doces", "Gasolina", w.fim, sem, w.gasolina, [`doc:${w.id}:gas`]);
    if (!porPedido("doces", w.inicio)) lanca("doces", "Insumos", w.fim, sem, w.insumos, [`doc:${w.id}:ins`]);
    lanca("doces", "Comissão", w.fim, sem, w.comissoes, [`doc:${w.id}:com`]);
  });
  Object.entries(grupos).forEach(([k, g]) => push(k, g.area, g.cat, g.desc + (g.doces ? ` (${int(g.doces)} doces)` : ""), g.valor, g.venc, [...new Set(g.legado)]));
  const m0 = monthOf(desde), m1 = Math.max(mesAtual(), m0);
  for (let m = m0; m <= m1; m++) {
    const mes = MESES_FULL[m - 1], venc = diaVenc(ano, m, 10);
    db.fixos.forEach((f) => push(`fixo:${f.id}:${m}`, "doces", categoriaFixo(f.nome), `${f.nome} · ${mes}`, +f.valor || 0, venc));
    db.fixosPacoca.forEach((f) => push(`fixopac:${f.id}:${m}`, "pacoca", categoriaFixo(f.nome), `${f.nome} · ${mes}`, +f.valor || 0, venc));
    // Impostos do mês anterior (DARF, DAS) vencem no mês seguinte ao de competência
    (impGerais().fixos || []).forEach((f) => {
      const venc = f.mesSeguinte ? mesSeguinte(m, f.dia) : diaVenc(ano, m, f.dia);
      push(`imp:${f.id}:${m}`, "geral", categoriaFixo(f.nome), `${f.nome} · referente a ${mes.toLowerCase()}${f.mesSeguinte ? " (mês anterior)" : " (próprio mês)"} · vence ${ddmm(venc)}`, +f.valor || 0, venc);
    });
    const fat = resumo(m).receita, vencDas = mesSeguinte(m, impGerais().dasDia || 20);
    push(`das:${m}`, "geral", "Impostos", `DAS ${pct(dasPct())} · referente a ${mes.toLowerCase()} (mês anterior) · vence ${ddmm(vencDas)} · faturamento ${brl(fat)}`, (fat * dasPct()) / 100, vencDas);
  }
  return out;
}
function sincronizarContasAuto() {
  if (!db?.pagamentos) return;
  const alvo = contasAutomaticas(), bases = new Set(alvo.map((a) => a.base)), ignoradas = new Set(db.contasIgnoradas || []);
  // Conta automática em aberto cujo custo deixou de existir (lançamento excluído, valor zerado) sai da lista
  db.pagamentos = db.pagamentos.filter((p) => !(p.auto && !p.pago && !p.travado && !bases.has(p.auto)));
  alvo.forEach((a) => {
    if (ignoradas.has(a.base)) return;
    const itens = db.pagamentos.filter((p) => p.auto === a.base);
    if (itens.some((p) => p.travado)) return;
    const legado = new Set(a.legado || []);
    const pagoLegado = legado.size ? sum(db.pagamentos.filter((p) => p.pago && legado.has(p.auto)), (p) => +p.valor || 0) : 0;
    const pago = sum(itens.filter((p) => p.pago), (p) => +p.valor || 0) + pagoLegado, aberto = itens.find((p) => !p.pago);
    const falta = round2(a.valor - pago), desc = a.descricao + (pago > 0 ? " (complemento)" : "");
    if (falta > 0.004) {
      if (aberto) Object.assign(aberto, { valor: falta, descricao: desc, vencimento: a.vencimento, categoria: a.categoria, area: a.area });
      else db.pagamentos.push({ id: uid(), auto: a.base, tipo: "pagar", area: a.area, categoria: a.categoria, descricao: desc, valor: falta, vencimento: a.vencimento, pago: false, dataPago: null });
    } else if (aberto) db.pagamentos = db.pagamentos.filter((p) => p !== aberto);
  });
}
function gerarFiadoPacoca() {
  let n = 0;
  db.pacoca.filter((p) => (!ui.pgMes || monthOf(p.data) === ui.pgMes) && naoRecPac(p) > 0.009).forEach((p) => {
    const ref = "pac-" + p.id;
    if (db.pagamentos.some((x) => x.ref === ref)) return;
    db.pagamentos.push({ id: uid(), ref, tipo: "receber", area: "pacoca", descricao: `Paçoca não recebida · ${ddmm(p.data)}`, categoria: "Paçoca (fiado)", valor: Math.round(naoRecPac(p) * 100) / 100, vencimento: p.data, pago: false, dataPago: null });
    n++;
  });
  toast(n ? `${n} valor(es) a receber gerado(s)` : "Nenhum dia novo com valor não recebido");
}

/* ---------- Equipe & App ---------- */
const REGRAS_FIRESTORE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /equipes/{equipe}/{documento=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;
function lerConfigFirebase(txt) {
  const m = String(txt).match(/\{[\s\S]*\}/);
  if (!m) return null;
  const json = m[0].replace(/([{,]\s*)['"]?([a-zA-Z0-9_]+)['"]?\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,\s*}/g, "}");
  try { const o = JSON.parse(json); return o.apiKey && o.projectId ? o : null; } catch { return null; }
}
const codigoConexao = (cfg) => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))));
function viewEquipe() {
  const cfg = Sync.getCfg();
  const publicado = location.protocol === "https:";
  const st = { local: "Só neste aparelho", conectando: "Conectando…", online: "Sincronizado", offline: "Offline (envia quando a internet voltar)", erro: "Erro de sincronização — confira a configuração" }[Sync.status];
  const status = `<div class="card"><div class="card-head"><div><h3>Situação da sincronização</h3><div class="sub">${cfg ? `Equipe <b>${esc(cfg.equipe)}</b> · ${cfg.supabase ? `Supabase (${esc(cfg.supabase.url.replace(/^https:\/\//, "").split(".")[0])})` : `Firebase (${esc(cfg.firebase?.projectId || "")})`}` : "Sem nuvem: os dados ficam só neste aparelho"}</div></div>
    <span class="sync-pill b-${{ online: "green", erro: "red", local: "gray" }[Sync.status] || "yellow"}">● ${st}</span></div>
    ${Sync.ultimoSync ? `<div class="hint">Última sincronização: ${Sync.ultimoSync.toLocaleTimeString("pt-BR")}</div>` : ""}</div>`;
  if (!cfg) {
    return status + `
    <div class="card mt"><div class="card-head"><div><h3>Conectar à nuvem (Firebase, gratuito)</h3><div class="sub">Faça uma vez, no aparelho da gestão. Leva uns 10 minutos.</div></div></div>
      <ol class="passos">
        <li>Acesse <a class="link" href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a> com sua conta Google e clique em <b>Criar um projeto</b> (pode desativar o Google Analytics).</li>
        <li>No menu <b>Criação → Firestore Database</b>, clique em <b>Criar banco de dados</b> (local: <i>southamerica-east1 (São Paulo)</i>, modo de produção).</li>
        <li>Na aba <b>Regras</b> do Firestore, apague tudo, cole as regras abaixo e clique em <b>Publicar</b>.</li>
        <li>Em <b>Criação → Authentication → Método de login</b>, ative <b>Anônimo</b>.</li>
        <li>Na engrenagem <b>Configurações do projeto</b>, em "Seus apps", clique no ícone <b>&lt;/&gt;</b> (Web), dê um nome e copie o bloco <b>firebaseConfig</b>.</li>
        <li>Cole o bloco abaixo e clique em <b>Conectar</b>.</li>
      </ol>
      <label class="hint"><b>Regras do Firestore</b> (passo 3)</label>
      <textarea class="code" readonly rows="8">${REGRAS_FIRESTORE}</textarea>
      <button class="btn btn-sm" data-act="eq-copiar" data-val="regras">Copiar regras</button>
      <div class="grid g-2 mt">
        <label class="hint"><b>firebaseConfig</b> (passo 5)<textarea id="eqConfig" class="code" rows="8" placeholder="const firebaseConfig = { apiKey: &quot;...&quot;, authDomain: &quot;...&quot;, projectId: &quot;...&quot;, ... };"></textarea></label>
        <label class="hint"><b>Código da equipe</b> — funciona como senha, não divulgue<input id="eqCodigo" value="hag-${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}" /></label>
      </div>
      <button class="btn btn-primary mt" data-act="eq-conectar">Conectar</button>
    </div>
    ${publicarHtml(publicado)}`;
  }
  const linkVend = `${urlApp("vendedor/")}#conectar=${codigoConexao(cfg)}`;
  const linkGest = `${urlApp("gestao/")}#conectar=${codigoConexao(cfg)}`;
  const qr = (l) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(l)}`;
  return status + `
  ${publicado ? "" : `<div class="alert yellow mt">${icon("alert")}<div><b>Publique o app antes de chamar a equipe</b><span>Este endereço (${esc(location.host || "arquivo local")}) só abre neste computador. Siga "Publicar o app" abaixo e conecte de novo no endereço publicado.</span></div></div>`}
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>App do vendedor</h3><div class="sub">Abre só a Área do vendedor, sem custos nem lucros</div></div></div>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <img class="qr" src="${qr(linkVend)}" alt="QR code do app do vendedor" />
        <div style="flex:1;min-width:200px"><p class="hint" style="margin-top:0">O colaborador aponta a câmera do celular para o QR code (ou abre o link) e o aparelho já entra conectado à equipe.</p>
          <button class="btn btn-sm" data-act="eq-copiar" data-val="vend">Copiar link do vendedor</button></div>
      </div>
      <div class="vend-sec">Instalar como app no celular</div>
      <ul class="recipe-ings"><li><span><b>Android (Chrome):</b> menu ⋮ → <b>Adicionar à tela inicial</b> / Instalar app</span></li>
        <li><span><b>iPhone (Safari):</b> botão Compartilhar → <b>Adicionar à Tela de Início</b></span></li></ul>
    </div>
    <div class="card"><div class="card-head"><div><h3>Outros aparelhos da gestão</h3><div class="sub">Gestão completa (custos, DRE, pagamentos)</div></div></div>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <img class="qr" src="${qr(linkGest)}" alt="QR code da gestão" />
        <div style="flex:1;min-width:200px"><p class="hint" style="margin-top:0">Use só em aparelhos de quem pode ver custos e lucros.</p>
          <button class="btn btn-sm" data-act="eq-copiar" data-val="gest">Copiar link da gestão</button></div>
      </div>
      <button class="btn btn-sm btn-danger mt" data-act="eq-desconectar">Desconectar este aparelho da nuvem</button>
    </div>
  </div>
  ${publicarHtml(publicado)}`;
}
function publicarHtml(publicado) {
  return `<details class="card mt comp-config" ${publicado ? "" : "open"}><summary><b>Publicar o app</b> <span class="hint">· para os celulares acessarem pela internet</span></summary>
    <ol class="passos mt">
      <li>Acesse <a class="link" href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop</a> e crie uma conta grátis (pode entrar com o Google).</li>
      <li>Arraste a pasta <b>HA-Gourmet-Gestao</b> (Documentos) para a página.</li>
      <li>Em alguns segundos o Netlify mostra um endereço <b>https://…netlify.app</b>. Abra esse endereço, vá em <b>Equipe & App</b> e conecte à nuvem.</li>
      <li>Para atualizar o app depois de mudanças, arraste a pasta de novo em <b>Deploys</b> do mesmo site.</li>
    </ol></details>`;
}

/* ---------- Estoque ---------- */
// Saldos por referência: "ins:<id>" ingrediente, "mat:<id>" material, "pronto:<P|G>" caixa pronta, "pac:<id>" item da paçoca
const round3 = (v) => Math.round(v * 1000) / 1000;
const TIPOS_MOV = { entrada: ["Entrada", "green"], saida: ["Saída", "red"], ajuste: ["Contagem", "gray"], producao: ["Produção", "gold"], montagem: ["Montagem", "gold"], venda: ["Venda", "yellow"], perda: ["Perda", "red"], estorno: ["Perda excluída", "gray"] };
// Baixa de um item da paçoca por pacote vendido (a paçoquita acompanha "paçoquitas por pacote")
const consumoPacote = (i) => (i.usaPacote ? +db.pacocaSim.porPacote || 1 : +i.consumo || 0);
// Itens medidos por "uso" (ex.: gás) entram no custo, mas não são contados no estoque
const estocavel = (i) => i.unid !== "uso";
const saldoDe = (ref) => db.estoque.saldos[ref] || (db.estoque.saldos[ref] = { qtd: 0, minimo: 0 });
function movimentar(area, ref, nome, delta, tipo, obs = "") {
  if (!delta) return;
  const s = saldoDe(ref);
  s.qtd = round3(s.qtd + delta);
  db.estoque.movs.push({ id: uid(), area, ref, nome, delta: round3(delta), tipo, data: hojeISO(), hora: new Date().toTimeString().slice(0, 5), obs, saldoApos: s.qtd });
}
function itensEstoque(area) {
  if (area === "pacoca") return [
    { ref: "pronto:pac", nome: "Pacotes prontos", unid: "pct", grupo: "itens", custo: custoInsumosPacote() + impostoPacote() + moPorPacote(), item: null },
    ...db.estoque.pacocaItens.map((i) => ({ ref: "pac:" + i.id, nome: i.nome, unid: i.unid, grupo: "itens", custo: +i.custo || 0, item: i })),
  ];
  const unit = (i) => (i.rend ? i.custo / i.rend : 0);
  return [
    ...tiposArea("doces").map((t) => ({ ref: "pronto:" + t.key, nome: `${t.nome} (${t.desc})`, unid: "cx", grupo: "prontos", custo: custoTipo("doces", t.key) })),
    ...db.insumos.filter(estocavel).map((i) => ({ ref: "ins:" + i.id, nome: i.nome, unid: i.unid, grupo: "ingredientes", custo: unit(i) })),
    ...db.materiais.map((i) => ({ ref: "mat:" + i.id, nome: i.nome, unid: i.unid, grupo: "materiais", custo: unit(i) })),
  ];
}
// Situação considerando as vendas ainda não fechadas e, nos doces, o que um pedido comum (pedido base) precisa
const ctxEstoque = (area) => ({ pend: pendenteEstoque(area), base: area === "doces" ? pedidoBase() : area === "pacoca" ? coberturaPacoca() : null });
function situacaoEstoque(ref, area, ctx = ctxEstoque(area)) {
  const s = saldoDe(ref), q = round3(s.qtd - (ctx.pend[ref] || 0)), nec = ctx.base?.nec[ref] || 0;
  if (q < 0) return { t: "Negativo", c: "red" };
  if (nec > 0 && q < nec) return { t: "Comprar", c: "red" };
  if (q === 0) return { t: "Zerado", c: "red" };
  if (s.minimo && q < s.minimo) return { t: "Baixo", c: "yellow" };
  return { t: "OK", c: "green" };
}
const alertasEstoque = (area, ctx = ctxEstoque(area)) => itensEstoque(area).filter((i) => ["Negativo", "Comprar", "Baixo"].includes(situacaoEstoque(i.ref, area, ctx).t));
const fmtQtd = (v) => (+v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

// Baixa de ingredientes ao produzir: lote proporcional ao rendimento + gasto por unidade (cobertura, gás...)
function consumoProducao(s, j, unidades) {
  const out = [];
  const ok = (it) => it.insumoId && estocavel(insById(it.insumoId) || {});
  s.lote.forEach((it) => { if (ok(it) && s.rend[j]) out.push({ ref: "ins:" + it.insumoId, nome: nomeItem(it), unid: unidItem(it), qtd: (+it.qtd || 0) * unidades / s.rend[j] }); });
  s.porUn.forEach((it) => { if (ok(it) && +it.qtd[j]) out.push({ ref: "ins:" + it.insumoId, nome: nomeItem(it), unid: unidItem(it), qtd: +it.qtd[j] * unidades }); });
  return out.filter((x) => x.qtd > 0);
}
// Materiais gastos ao montar caixas prontas (kit de embalagem + brindes do produto ligado ao tipo)
function consumoMontagem(key, n) {
  const t = tiposArea("doces").find((x) => x.key === key);
  const p = t && db.produtos.find((x) => x.canal === "Outbound" && x.nome === t.produto);
  const out = {};
  const add = (nomeMat, q) => { const m = db.materiais.find((x) => x.nome === nomeMat); if (!m) return; const r = "mat:" + m.id; out[r] = out[r] || { ref: r, nome: m.nome, unid: m.unid, qtd: 0 }; out[r].qtd += q; };
  (p?.itens || []).forEach((it) => {
    if (it.kit) db.embalagens.find((e) => e.nome === it.kit)?.itens.forEach((ki) => add(ki.material, (+ki.qtd || 0) * (+it.qtd || 1) * n));
    if (it.material) add(it.material, (+it.qtd || 1) * n);
  });
  return Object.values(out);
}
const listaConsumo = (lst) => lst.length ? `<ul class="recipe-ings" style="width:100%">${lst.map((x) => { const s = saldoDe(x.ref).qtd; return `<li><span>${esc(x.nome)}</span><span>−${fmtQtd(x.qtd)} ${esc(x.unid)}</span><span class="${s - x.qtd < 0 ? "neg" : ""}">fica ${fmtQtd(s - x.qtd)}</span></li>`; }).join("")}</ul>` : "<span>Nada a baixar</span>";

function formMovimento(area, ref, tipo) {
  const itens = itensEstoque(area);
  const item = itens.find((i) => i.ref === ref);
  const titulos = { entrada: "Entrada no estoque", saida: "Saída / perda", ajuste: "Contagem (ajustar saldo)" };
  openForm({
    title: `${titulos[tipo]}${item ? " · " + item.nome : ""}`,
    fields: [
      ...(item ? [] : [{ key: "item", label: "Item", type: "select", options: itens.map((i) => i.nome), full: true }]),
      { key: "qtd", label: tipo === "ajuste" ? `Quantidade contada${item ? ` (${item.unid})` : ""}` : `Quantidade${item ? ` (${item.unid})` : ""}`, type: "num", full: true },
      { key: "obs", label: "Observação (opcional)", full: true },
    ],
    preview: (v) => {
      const it = item || itens.find((i) => i.nome === v.item);
      if (!it) return "";
      const s = saldoDe(it.ref).qtd, novo = tipo === "ajuste" ? v.qtd : tipo === "entrada" ? s + v.qtd : s - v.qtd;
      return `<span>Saldo atual: ${fmtQtd(s)} ${esc(it.unid)}</span><span>Novo saldo: <b class="${novo < 0 ? "neg" : ""}">${fmtQtd(novo)} ${esc(it.unid)}</b></span>`;
    },
    onSave: (v) => {
      const it = item || itens.find((i) => i.nome === v.item);
      const s = saldoDe(it.ref).qtd;
      const delta = tipo === "ajuste" ? v.qtd - s : tipo === "entrada" ? v.qtd : -v.qtd;
      if (tipo === "ajuste" && !delta) { toast("Saldo já está correto"); return; }
      movimentar(area, it.ref, it.nome, delta, tipo, v.obs);
      toast(`${titulos[tipo].split(" ")[0]} registrada · ${it.nome}`);
    },
  });
}
function formProducao() {
  openForm({
    title: "Registrar produção de doces",
    fields: [
      { key: "sabor", label: "Sabor", type: "select", options: db.sabores.map((s) => s.nome), full: true },
      { key: "formato", label: "Formato", type: "select", options: db.formatos.map((f) => f.nome) },
      { key: "unidades", label: "Unidades produzidas", type: "num" },
    ],
    values: { formato: "Bolinha" },
    preview: (v) => {
      const s = db.sabores.find((x) => x.nome === v.sabor), j = db.formatos.findIndex((f) => f.nome === v.formato);
      if (s && !(+s.rend[j] > 0)) return `<span class="neg">${esc(s.nome)} não tem rendimento cadastrado para ${esc(v.formato.toLowerCase())}. Preencha em Fichas Técnicas.</span>`;
      return s && v.unidades ? listaConsumo(consumoProducao(s, j, v.unidades)) : "<span>Informe as unidades para ver a baixa de ingredientes</span>";
    },
    onSave: (v) => {
      const s = db.sabores.find((x) => x.nome === v.sabor), j = db.formatos.findIndex((f) => f.nome === v.formato);
      if (!(+s.rend[j] > 0)) { toast("Esse formato não tem rendimento cadastrado nessa receita"); return; }
      const obs = `${int(v.unidades)} ${v.formato.toLowerCase()} de ${v.sabor}`;
      consumoProducao(s, j, v.unidades).forEach((x) => movimentar("doces", x.ref, x.nome, -x.qtd, "producao", obs));
      toast(`Produção registrada: ${obs}`);
    },
  });
}
function formMontagem() {
  const tipos = tiposArea("doces");
  openForm({
    title: "Montar caixas prontas",
    fields: [
      { key: "tipo", label: "Caixa", type: "select", options: tipos.map((t) => `${t.nome} (${t.desc})`), full: true },
      { key: "n", label: "Quantidade de caixas montadas", type: "num", full: true },
    ],
    preview: (v) => { const t = tipos.find((x) => `${x.nome} (${x.desc})` === v.tipo); return t && v.n ? listaConsumo(consumoMontagem(t.key, v.n)) : "<span>Informe a quantidade para ver a baixa de embalagens</span>"; },
    onSave: (v) => {
      const t = tipos.find((x) => `${x.nome} (${x.desc})` === v.tipo);
      const obs = `${int(v.n)} ${t.nome} montada(s)`;
      consumoMontagem(t.key, v.n).forEach((x) => movimentar("doces", x.ref, x.nome, -x.qtd, "montagem", obs));
      movimentar("doces", "pronto:" + t.key, `${t.nome} (${t.desc})`, v.n, "montagem", obs);
      toast(obs);
    },
  });
}
function baixaVendas(area, pend) {
  if (area === "pacoca") {
    consumoVendasPacoca(pend).forEach((x) => movimentar("pacoca", x.ref, x.nome, -x.qtd, "venda", `Vendas de ${ddmm(ui.vendData)}${x.feitos ? ` · ${int(x.feitos)} pacote(s) sem estoque pronto` : ""}`));
    return;
  }
  consumoVendasDoces(pend).forEach((x) => movimentar("doces", x.ref, x.nome, -x.qtd, "venda", `Vendas de ${ddmm(ui.vendData)}${x.feitas ? ` · ${int(x.feitas)} ${x.tipo} sem caixa pronta` : ""}`));
}

/* ---------- Perdas: produto completo, embalagem completa ou material isolado ---------- */
// db.perdas: { id, area, data, tipo, descricao, motivo, obs, itens: [{ ref, nome, unid, qtd, custo }], valor }
// O valor fica gravado com o custo do dia: mudar preços depois não altera perdas já registradas
const MOTIVOS_PERDA = ["Quebrou / amassou", "Estragou / venceu", "Derreteu", "Caiu / sujou", "Erro de produção", "Outro"];
const TIPOS_PERDA = { produto: "Produto completo", embalagem: "Embalagem completa", material: "Material isolado" };
const perdasDe = (area, m) => (db.perdas || []).filter((p) => (!area || p.area === area) && (!m || monthOf(p.data) === m));
const embalagemPacote = () => db.estoque.pacocaItens.filter((i) => !i.usaPacote && consumoPacote(i) > 0 && estocavel(i));
function opcoesPerda(area, tipo) {
  if (tipo === "produto") return area === "pacoca"
    ? [{ nome: `Pacote de paçoca (${fmtQtd(+db.pacocaSim.porPacote || 1)} paçoquitas)`, key: "pac" }]
    : tiposArea("doces").map((t) => ({ nome: `${t.nome} (${t.desc})`, key: t.key }));
  if (tipo === "embalagem") return area === "pacoca"
    ? (embalagemPacote().length ? [{ nome: `Embalagem de 1 pacote (${embalagemPacote().map((i) => i.nome.toLowerCase()).join(", ")})`, key: "pac" }] : [])
    : db.embalagens.map((e) => ({ nome: e.nome, key: e.id }));
  return itensEstoque(area).filter((i) => !i.ref.startsWith("pronto:")).map((i) => ({ nome: `${i.nome} (${i.unid})`, key: i.ref }));
}
// Produto completo sai primeiro do estoque pronto; sem estoque pronto, baixa ingredientes e embalagens (como nas vendas)
function itensPerda(area, tipo, key, n) {
  const mapa = Object.fromEntries(itensEstoque(area).map((i) => [i.ref, i])), out = {};
  const add = (ref, nome, qtd) => { if (!(qtd > 0)) return; const it = mapa[ref]; out[ref] = out[ref] || { ref, nome: it?.nome || nome, unid: it?.unid || "", qtd: 0, custo: it?.custo || 0 }; out[ref].qtd += qtd; };
  if (tipo === "produto") (area === "pacoca" ? consumoVendasPacoca([{ itens: { U: n } }]) : consumoVendasDoces([{ itens: { [key]: n } }])).forEach((x) => add(x.ref, x.nome, x.qtd));
  else if (tipo === "embalagem" && area === "pacoca") embalagemPacote().forEach((i) => add("pac:" + i.id, i.nome, n * consumoPacote(i)));
  else if (tipo === "embalagem") (db.embalagens.find((e) => e.id === key)?.itens || []).forEach((ki) => { const m = db.materiais.find((x) => x.nome === ki.material); if (m) add("mat:" + m.id, m.nome, (+ki.qtd || 0) * n); });
  else add(key, "", n);
  return Object.values(out).map((x) => ({ ...x, qtd: round3(x.qtd) }));
}
// Produto completo vale o custo cheio do produto pronto (insumos, embalagem e mão de obra); o resto, o custo dos itens baixados
function valorPerda(area, tipo, key, n, itens) {
  if (tipo === "produto") return n * (itensEstoque(area).find((i) => i.ref === (area === "pacoca" ? "pronto:pac" : "pronto:" + key))?.custo || 0);
  return sum(itens, (x) => x.qtd * x.custo);
}
function formPerda(area, tipo) {
  const ops = opcoesPerda(area, tipo);
  if (!ops.length) { toast(tipo === "embalagem" ? "Cadastre as embalagens primeiro" : "Nenhum item no estoque para registrar perda"); return; }
  const rotulo = { produto: area === "pacoca" ? "Quantidade de pacotes" : "Quantidade de caixas", embalagem: "Quantidade de embalagens", material: "Quantidade perdida (na unidade do item)" }[tipo];
  openForm({
    title: `Registrar perda · ${TIPOS_PERDA[tipo]}`,
    fields: [
      { key: "escolha", label: { produto: "Produto", embalagem: "Embalagem", material: "Material" }[tipo], type: "select", options: ops.map((o) => o.nome), full: true },
      { key: "qtd", label: rotulo, type: "num", required: true },
      { key: "data", label: "Data da perda", type: "date" },
      { key: "motivo", label: "Motivo", type: "select", options: MOTIVOS_PERDA },
      { key: "obs", label: "Observação (opcional)" },
    ],
    values: { data: hojeISO(), motivo: MOTIVOS_PERDA[0], qtd: tipo === "material" ? "" : 1 },
    preview: (v) => {
      const o = ops.find((x) => x.nome === v.escolha);
      if (!o || !(v.qtd > 0)) return "<span>Informe a quantidade para ver a baixa no estoque e o valor da perda</span>";
      const its = itensPerda(area, tipo, o.key, v.qtd);
      return `<div style="width:100%">${listaConsumo(its)}<div style="margin-top:8px;text-align:right">Valor da perda (entra no DRE): <strong class="neg">${brl(valorPerda(area, tipo, o.key, v.qtd, its))}</strong></div></div>`;
    },
    onSave: (v) => {
      const o = ops.find((x) => x.nome === v.escolha);
      if (!o || !(v.qtd > 0)) { toast("Informe a quantidade perdida"); return; }
      const itens = itensPerda(area, tipo, o.key, v.qtd), valor = round2(valorPerda(area, tipo, o.key, v.qtd, itens));
      const descricao = `${fmtQtd(v.qtd)} × ${o.nome}`;
      itens.forEach((x) => movimentar(area, x.ref, x.nome, -x.qtd, "perda", `Perda: ${descricao} · ${v.motivo}`));
      db.perdas = db.perdas || [];
      db.perdas.push({ id: uid(), area, data: v.data || hojeISO(), tipo, descricao, motivo: v.motivo, obs: v.obs, itens, valor });
      toast(`Perda registrada: ${descricao} · ${brl(valor)}`);
    },
  });
}
function viewPerdas(area) {
  setActions(`<button class="btn btn-primary" data-act="perda-nova" data-val="produto" data-area="${area}">${icon("plus")}Registrar perda</button>`);
  const meses = [...new Set(perdasDe(area).map((p) => monthOf(p.data)))].sort((a, b) => a - b);
  const m = ui.perdasMes || 0, lista = perdasDe(area, m).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const tot = sum(lista, (p) => +p.valor || 0), rec = resumo(m, area).receita;
  const porMotivo = Object.entries(lista.reduce((acc, p) => ({ ...acc, [p.motivo]: (acc[p.motivo] || 0) + (+p.valor || 0) }), {})).sort((a, b) => b[1] - a[1]);
  const nomeArea = area === "pacoca" ? "da paçoca" : "dos doces";
  const tipos = [
    ["produto", area === "pacoca" ? "Pacote completo" : "Caixa completa", area === "pacoca" ? "Pacote pronto que se perdeu. Sai dos pacotes prontos; sem estoque pronto, baixa paçoquitas e embalagem." : "Caixa pronta que se perdeu. Sai das caixas prontas; sem estoque pronto, baixa ingredientes e embalagem."],
    ["embalagem", "Embalagem completa", area === "pacoca" ? `Embalagem inteira de um pacote: ${embalagemPacote().map((i) => i.nome.toLowerCase()).join(", ") || "cadastre em Insumos"}.` : "Kit de embalagem inteiro (caixa, forminhas, fita, adesivo...), conforme a tela Embalagens."],
    ["material", "Material isolado", area === "pacoca" ? "Um item avulso do estoque: paçoquitas, saquinhos, papel, fita..." : "Um item avulso do estoque: ingrediente ou material de embalagem."],
  ];
  return `
  <div class="toolbar"><span class="hint">Cada perda dá baixa no estoque na hora e entra no DRE ${nomeArea} em Despesas variáveis › Perdas, no mês da data.</span>
    <select class="inline" data-act="set-perdames"><option value="0">Todos os meses</option>${meses.map((x) => `<option value="${x}" ${m === x ? "selected" : ""}>${MESES_FULL[x - 1]}</option>`).join("")}</select></div>
  <div class="grid g-4">
    ${kpi("Perdas", brl(tot), m ? MESES_FULL[m - 1] : "Todos os meses", "alert", tot ? "neg" : "")}
    ${kpi("Registros", int(lista.length), `${int(lista.filter((p) => p.tipo === "produto").length)} produto(s) · ${int(lista.filter((p) => p.tipo !== "produto").length)} embalagem/material`, "clip")}
    ${kpi("% do faturamento", rec ? pct((tot / rec) * 100) : "—", `Faturamento ${brl(rec)}`, "pie")}
    ${kpi("Maior motivo", porMotivo[0] ? esc(porMotivo[0][0]) : "—", porMotivo[0] ? brl(porMotivo[0][1]) : "Nenhuma perda", "trend")}
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Registrar perda</h3><div class="sub">Escolha o que foi perdido</div></div></div>
    <div class="grid g-3">${tipos.map(([t, nome, desc]) => `<button class="stat perda-tipo" data-act="perda-nova" data-val="${t}" data-area="${area}"><b>${icon("plus")} ${nome}</b><span class="hint">${desc}</span></button>`).join("")}</div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Perdas registradas</h3><div class="sub">Excluir uma perda devolve os itens ao estoque e tira o valor do DRE</div></div></div>
    ${lista.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>O que se perdeu</th><th>Motivo</th><th class="hide-m">Baixa no estoque</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${lista.map((p) => `<tr><td>${ddmm(p.data)}</td><td><span class="badge b-${p.tipo === "produto" ? "red" : p.tipo === "embalagem" ? "gold" : "gray"}">${TIPOS_PERDA[p.tipo] || p.tipo}</span></td>
      <td><b>${esc(p.descricao)}</b>${p.obs ? `<div class="hint">${esc(p.obs)}</div>` : ""}</td><td>${esc(p.motivo || "")}</td>
      <td class="hint hide-m" title="${esc((p.itens || []).map((x) => `${x.nome}: −${fmtQtd(x.qtd)} ${x.unid}`).join("\n"))}">${(p.itens || []).slice(0, 3).map((x) => `${esc(x.nome)}: −${fmtQtd(x.qtd)} ${esc(x.unid)}`).join("<br>") || "—"}${(p.itens || []).length > 3 ? `<br>+ ${(p.itens || []).length - 3} item(ns)` : ""}</td>
      <td class="num neg"><b>${brl(p.valor)}</b></td><td><button class="btn btn-ghost btn-sm btn-danger" data-act="perda-del" data-id="${p.id}" title="Excluir e devolver ao estoque">${icon("trash")}</button></td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="5">Total</td><td class="num">${brl(tot)}</td><td></td></tr></tfoot></table></div>`
    : `<div class="empty">Nenhuma perda registrada${m ? " em " + MESES_FULL[m - 1] : ""}.</div>`}
  </div>`;
}

/* ---------- Projeção de compra (estoque) ---------- */
// Formato e unidades de cada tipo de caixa, lidos do produto ligado (ex.: "Caixa Bolinha 9un" → Bolinha, 9)
function infoCaixa(key) {
  const t = tiposArea("doces").find((x) => x.key === key);
  const nome = t?.produto || "";
  return { formato: /copinho/i.test(nome) ? "Copinho" : "Bolinha", un: +(nome.match(/(\d+)\s*un/i)?.[1] || (key === "G" ? 9 : 4)) };
}
// Média de caixas P/G por semana do mês (1ª a 4ª), a partir do histórico de vendas Outbound com caixas registradas.
// Semana do mês = dia de início ÷ 7 (dias 29–31 contam como 4ª semana).
function mediaHistoricaSemanas() {
  const h = db.vendas.filter((v) => v.canal === "Outbound" && (+v.cxP || 0) + (+v.cxG || 0) > 0);
  const semana = (iso) => Math.min(4, Math.ceil(+iso.slice(8, 10) / 7));
  const media = (l) => ({ n: l.length, P: l.length ? sum(l, (v) => +v.cxP || 0) / l.length : 0, G: l.length ? sum(l, (v) => +v.cxG || 0) / l.length : 0 });
  const geral = media(h);
  const semanas = [1, 2, 3, 4].map((s) => { const m = media(h.filter((v) => semana(v.inicio) === s)); return { sem: s, ...(m.n ? m : { ...geral, n: 0, semDados: true }) }; });
  return { semanas, geral };
}
function histSemanasHtml(destaque = []) {
  const { semanas, geral } = mediaHistoricaSemanas();
  if (!geral.n) return "";
  return `<div class="card hist-card"><div class="card-head"><div><h3>${icon("trend")} Média histórica por semana do mês</h3><div class="sub">Caixas vendidas no Outbound · ${geral.n} fins de semana com caixas registradas</div></div><a class="btn btn-sm" href="#vendas">Ver histórico</a></div>
    <div class="hist-grid">${semanas.map((s) => `<div class="stat ${destaque.includes(s.sem) ? "hist-on" : ""}"><small>${s.sem}ª semana${s.semDados ? " · sem dados (média geral)" : ` · ${s.n} fds`}</small>
      <strong>${fmtQtd(Math.round((s.P + s.G) * 10) / 10)} caixas</strong><div class="hint">${fmtQtd(Math.round(s.G * 10) / 10)} Cx G · ${fmtQtd(Math.round(s.P * 10) / 10)} Cx P</div></div>`).join("")}
      <div class="stat"><small>Média geral</small><strong>${fmtQtd(Math.round((geral.P + geral.G) * 10) / 10)} caixas</strong><div class="hint">${pct((geral.G / (geral.P + geral.G)) * 100)} Cx G</div></div></div></div>`;
}
const semanasPeriodo = (p) => (p.periodo && p.periodo !== "mes" ? [+p.periodo] : [1, 2, 3, 4]);
function projDoces() {
  const p = db.projecao.doces;
  let porFdsG = Math.round((p.caixasFds * p.pctG) / 100), porFdsP = Math.max(0, Math.round(p.caixasFds) - porFdsG);
  let G = porFdsG * p.fds, P = porFdsP * p.fds, fds = p.fds;
  if ((p.modo || "hist") === "hist") {
    const { semanas } = mediaHistoricaSemanas(), sel = semanasPeriodo(p);
    G = sum(sel, (s) => Math.round(semanas[s - 1].G)); P = sum(sel, (s) => Math.round(semanas[s - 1].P)); fds = sel.length;
    porFdsG = Math.round(G / fds); porFdsP = Math.round(P / fds);
  }
  const prontoG = Math.max(0, saldoDe("pronto:G").qtd), prontoP = Math.max(0, saldoDe("pronto:P").qtd);
  const prodG = Math.max(0, G - prontoG), prodP = Math.max(0, P - prontoP);
  const cc = consumoCaixas(prodG, prodP);
  return { porFdsG, porFdsP, G, P, prontoG, prontoP, prodG, prodP, unidades: cc.unidades, porSabor: cc.porSabor, insumos: cc.insumos, materiais: cc.materiais, fds };
}
// Ingredientes e embalagens para fazer G caixas grandes e P pequenas:
// docinhos de cada sabor pela composição da caixa → fichas técnicas (gramas ÷ rendimento) + kit de embalagem
function consumoCaixas(prodG, prodP) {
  const unidades = {}, qtdSabor = {};
  [["G", prodG], ["P", prodP]].forEach(([k, n]) => {
    const c = caixaDe(k);
    Object.entries(c.itens).forEach(([nome, q]) => {
      const chave = `${nome}|${c.formato}`;
      qtdSabor[chave] = (qtdSabor[chave] || 0) + n * (+q || 0);
      unidades[c.formato] = (unidades[c.formato] || 0) + n * (+q || 0);
    });
  });
  const acc = {};
  const add = (x) => { acc[x.ref] = acc[x.ref] || { ...x, qtd: 0 }; acc[x.ref].qtd += x.qtd; };
  const porSabor = [];
  Object.entries(qtdSabor).forEach(([chave, q]) => {
    const [nome, formato] = chave.split("|"), s = db.sabores.find((x) => x.nome === nome);
    const j = db.formatos.findIndex((f) => f.nome === formato);
    if (!s || !q) return;
    porSabor.push({ nome, formato, q, semRend: !(+s.rend[j] > 0) });
    consumoProducao(s, j, q).forEach(add);
  });
  const insumos = Object.values(acc);
  const accM = {};
  [...consumoMontagem("G", prodG), ...consumoMontagem("P", prodP)].forEach((x) => { accM[x.ref] = accM[x.ref] || { ...x, qtd: 0 }; accM[x.ref].qtd += x.qtd; });
  return { unidades, porSabor, insumos, materiais: Object.values(accM) };
}
// Baixa das vendas de doces: sai primeiro das caixas prontas; o que passar disso foi feito na hora
// e consome ingredientes (fichas técnicas) e embalagens
function consumoVendasDoces(regs) {
  const out = [];
  tiposArea("doces").forEach((t) => {
    const q = sum(regs, (r) => +r.itens?.[t.key] || 0);
    if (!q) return;
    const dePronto = Math.min(q, Math.max(0, saldoDe("pronto:" + t.key).qtd)), feitas = q - dePronto;
    if (dePronto) out.push({ ref: "pronto:" + t.key, nome: `${t.nome} (${t.desc})`, qtd: dePronto });
    if (feitas && ["G", "P"].includes(t.key)) {
      const cc = consumoCaixas(t.key === "G" ? feitas : 0, t.key === "P" ? feitas : 0);
      [...cc.insumos, ...cc.materiais].filter((x) => x.qtd > 0).forEach((x) => out.push({ ...x, feitas, tipo: t.nome }));
    }
  });
  return out;
}
// O que as vendas registradas e ainda não fechadas já tiraram do estoque (ref → quantidade)
function pendenteEstoque(area) {
  const regs = db.vendedor.registros.filter((r) => r.area === area && !r.lancado), m = {};
  if (area === "pacoca") {
    consumoVendasPacoca(regs).forEach((x) => { m[x.ref] = (m[x.ref] || 0) + x.qtd; });
  } else consumoVendasDoces(regs).forEach((x) => { m[x.ref] = (m[x.ref] || 0) + x.qtd; });
  return m;
}
// Pedido comum (padrão 50 caixas, 70% Cx G): o que ele precisa e quantas caixas o estoque atual permite fazer
function pedidoBase() {
  const p = db.projecao.doces, n = Math.max(1, Math.round(+p.pedidoBase || 50)), pctG = p.pedidoPctG ?? 70;
  const G = Math.round((n * pctG) / 100), P = n - G, cc = consumoCaixas(G, P), pend = pendenteEstoque("doces");
  const nec = {};
  [...cc.insumos, ...cc.materiais].forEach((x) => { if (x.qtd > 0) nec[x.ref] = (nec[x.ref] || 0) + x.qtd; });
  const disp = (ref) => saldoDe(ref).qtd - (pend[ref] || 0);
  const refs = Object.keys(nec), faltam = refs.filter((r) => disp(r) < nec[r] - 1e-9);
  const fator = refs.length ? Math.min(...refs.map((r) => Math.max(0, disp(r)) / nec[r])) : 0;
  return { area: "doces", n, pctG, G, P, nec, faltam, disp, capacidade: Math.floor(n * fator + 1e-9) };
}
// Estoque da paçoca precisa cobrir duas semanas: uma sendo vendida e outra em produção para a semana seguinte
// (padrão: 80 pacotes por dia × 7 dias × 2 semanas)
function coberturaPacoca() {
  const cfg = db.estoque.coberturaPac || {}, porDia = Math.max(1, Math.round(+cfg.porDia || 80)), semanas = Math.max(1, +cfg.semanas || 2), dias = Math.round(semanas * 7);
  const pend = pendenteEstoque("pacoca"), nec = {}, porPac = {};
  const disp = (ref) => saldoDe(ref).qtd - (pend[ref] || 0);
  // Pacotes já prontos contam para a cobertura; o material precisa cobrir só o restante
  const prontos = Math.max(0, disp("pronto:pac")), falta = Math.max(0, porDia * dias - prontos);
  db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0).forEach((i) => { porPac["pac:" + i.id] = consumoPacote(i); nec["pac:" + i.id] = falta * consumoPacote(i); });
  const refs = Object.keys(porPac), faltam = refs.filter((r) => nec[r] > 0 && disp(r) < nec[r] - 1e-9);
  const pacotesMaterial = refs.length ? Math.min(...refs.map((r) => Math.max(0, disp(r)) / porPac[r])) : 0;
  const capacidade = Math.floor(prontos + pacotesMaterial + 1e-9);
  return { area: "pacoca", porDia, semanas, dias, nec, faltam, disp, prontos, diasCobre: capacidade / porDia, capacidade };
}
// Compra sugerida: falta arredondada para embalagens inteiras de compra (rendimento do insumo)
function linhaCompra(x, periodos) {
  const [tipo, id] = x.ref.split(":");
  const fonte = tipo === "ins" ? db.insumos.find((i) => i.id === id) : tipo === "mat" ? db.materiais.find((i) => i.id === id) : db.estoque.pacocaItens.find((i) => i.id === id);
  const est = saldoDe(x.ref).qtd, falta = Math.max(0, x.qtd - est);
  const pacote = tipo === "pac" ? (+fonte?.pacote || 1) : (+fonte?.rend || 1);
  const precoPacote = tipo === "pac" ? pacote * (+fonte?.custo || 0) + (+fonte?.imposto || 0) : +fonte?.custo || 0;
  const pacotes = falta > 0 ? Math.ceil(falta / pacote - 1e-9) : 0;
  const consumoPeriodo = x.qtd / (periodos || 1);
  return { ...x, est, falta, pacote, pacotes, custo: pacotes * precoPacote, cobertura: consumoPeriodo > 0 ? est / consumoPeriodo : null };
}
function tabelaCompra(area, linhas, periodoNome) {
  if (!linhas.length) return '<div class="empty">Nada a projetar com esses parâmetros.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Necessário</th><th class="num">Em estoque</th><th class="num">Falta</th><th class="num hide-m">Comprar</th><th class="num">Custo</th><th class="num hide-m">Estoque cobre</th></tr></thead><tbody>
    ${linhas.map((l) => `<tr><td><b>${esc(l.nome)}</b></td>
      <td class="num">${fmtQtd(round2(l.qtd))} <span class="hint">${esc(l.unid)}</span></td>
      <td class="num"><input class="tbl-input" inputmode="decimal" data-act="proj-est" data-area="${area}" data-ref="${l.ref}" data-nome="${esc(l.nome)}" value="${String(round2(l.est)).replace(".", ",")}" /></td>
      <td class="num ${l.falta > 0 ? "neg" : "pos"}"><b>${l.falta > 0 ? fmtQtd(round2(l.falta)) : "OK"}</b></td>
      <td class="num hide-m">${l.pacotes ? `${int(l.pacotes)} × ${fmtQtd(l.pacote)} ${esc(l.unid)}` : "—"}</td>
      <td class="num">${l.custo ? brl(l.custo) : "—"}</td>
      <td class="num hide-m">${l.cobertura === null ? "—" : `<span class="badge b-${l.cobertura >= 1 ? "green" : l.cobertura >= 0.5 ? "yellow" : "red"}">${fmtQtd(Math.round(l.cobertura * 10) / 10)} ${periodoNome}</span>`}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="5" class="hide-m">Total da compra</td><td class="show-m-cell" colspan="4">Total da compra</td><td class="num">${brl(sum(linhas, (l) => l.custo))}</td><td class="hide-m"></td></tr></tfoot></table></div>`;
}
function viewProjecao(area) {
  if (area === "pacoca") {
    const s = db.pacocaSim, vendas = (+s.porDia || 0) * (+s.dias || 0), porPacote = +s.porPacote || 1;
    const linhas = db.estoque.pacocaItens.filter((i) => consumoPacote(i) > 0).map((i) => linhaCompra({ ref: "pac:" + i.id, nome: i.nome, unid: i.unid, qtd: consumoPacote(i) * vendas }, +s.dias || 1));
    const total = sum(linhas, (l) => l.custo), faltando = linhas.filter((l) => l.falta > 0).length;
    return `<div class="grid g-21">
      <div class="card"><div class="card-head"><div><h3>Previsão de vendas</h3><div class="sub">Os mesmos números do Simulador do mês da paçoca</div></div></div>
        <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span>Pacotes vendidos por dia</span><input class="tbl-input" style="width:100%" inputmode="numeric" data-act="projp-par" data-key="porDia" value="${s.porDia}" /></div>
        <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span>Paçoquitas por pacote</span><input class="tbl-input" style="width:100%" inputmode="numeric" data-act="projp-par" data-key="porPacote" value="${porPacote}" /></div>
        <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px);border:0"><span>Dias de venda no mês</span><input class="tbl-input" style="width:100%" inputmode="numeric" data-act="projp-par" data-key="dias" value="${s.dias}" /></div>
        <ul class="recipe-ings mt">
          <li><span>Por dia</span><span>${int(s.porDia)} pacotes</span><span>${int(s.porDia * porPacote)} paçoquitas</span></li>
          <li><span><b>No mês (${int(s.dias)} dias)</b></span><span><b>${int(vendas)} pacotes</b></span><span><b>${int(vendas * porPacote)} paçoquitas</b></span></li>
        </ul>
      </div>
      <div class="card"><div class="big-result"><small>Compra necessária no mês</small><div>${brl(total)}</div><small>${int(vendas)} pacotes · ${int(vendas * porPacote)} paçoquitas · ${faltando} item(ns) em falta</small></div></div>
    </div>
    <div class="card mt"><div class="card-head"><div><h3>Projeção de compra</h3><div class="sub">"Em estoque" é o saldo da tela Estoque — alterar aqui registra uma contagem. "Estoque cobre" = dias de venda que o estoque atual aguenta.</div></div></div>
      ${tabelaCompra("pacoca", linhas, "dias")}
      <div class="hint" style="margin-top:10px">Para comprar em caixas/pacotes, informe "Unidades por embalagem de compra" no lápis de cada item (aba Itens).</div></div>`;
  }
  const p = db.projecao.doces, r = projDoces();
  const ins = r.insumos.map((x) => linhaCompra(x, r.fds)), mats = r.materiais.map((x) => linhaCompra(x, r.fds));
  const total = sum([...ins, ...mats], (l) => l.custo);
  const modo = p.modo || "hist", sel = semanasPeriodo(p);
  return `${histSemanasHtml(modo === "hist" ? sel : [])}
  <div class="grid g-21 mt">
    <div class="card"><div class="card-head"><div><h3>Previsão de vendas</h3><div class="sub">Base para o pedido de compra</div></div></div>
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(127px,230px)"><span>Basear a previsão em</span>
        <select class="inline" data-act="proj-modo"><option value="hist" ${modo === "hist" ? "selected" : ""}>Média histórica por semana</option><option value="fixo" ${modo === "fixo" ? "selected" : ""}>Valor fixo (caixas e % Cx G)</option></select></div>
      ${modo === "hist" ? `
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(127px,230px);border:0"><span>Período do pedido</span>
        <select class="inline" data-act="proj-periodo"><option value="mes" ${sel.length === 4 ? "selected" : ""}>Mês inteiro (1ª a 4ª semana)</option>${[1, 2, 3, 4].map((s) => `<option value="${s}" ${sel.length === 1 && sel[0] === s ? "selected" : ""}>Só a ${s}ª semana</option>`).join("")}</select></div>` : `
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span>Caixas por fim de semana</span><input class="tbl-input" style="width:100%" inputmode="numeric" data-act="proj-par" data-key="caixasFds" value="${p.caixasFds}" /></div>
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px)"><span>% Cx G <span class="hint">(o restante é Cx P: ${fmtQtd(100 - p.pctG)}%)</span></span><input class="tbl-input" style="width:100%" inputmode="decimal" data-act="proj-par" data-key="pctG" value="${p.pctG}" /></div>
      <div class="sim-row" style="grid-template-columns:minmax(0,1fr) minmax(61px,110px);border:0"><span>Fins de semana no período</span><input class="tbl-input" style="width:100%" inputmode="numeric" data-act="proj-par" data-key="fds" value="${p.fds}" /></div>`}
      <ul class="recipe-ings mt">
        <li><span>Média por fim de semana</span><span>${int(r.porFdsG)} Cx G + ${int(r.porFdsP)} Cx P</span><span>${int(r.porFdsG * infoCaixa("G").un + r.porFdsP * infoCaixa("P").un)} doces</span></li>
        <li><span>No período (${int(r.fds)} fds)</span><span>${int(r.G)} Cx G + ${int(r.P)} Cx P</span><span>${int(r.G * infoCaixa("G").un + r.P * infoCaixa("P").un)} doces</span></li>
        ${r.prontoG || r.prontoP ? `<li><span>Já prontas no estoque</span><span>${int(r.prontoG)} Cx G + ${int(r.prontoP)} Cx P</span><span>descontadas</span></li>` : ""}
        <li><span><b>A produzir</b></span><span><b>${int(r.prodG)} Cx G + ${int(r.prodP)} Cx P</b></span><span><b>${Object.entries(r.unidades).map(([f, u]) => `${int(u)} ${f.toLowerCase()}`).join(" + ") || "0"}</b></span></li>
      </ul>
    </div>
    <div class="card"><div class="big-result"><small>Compra necessária no período</small><div>${brl(total)}</div><small>${ins.filter((l) => l.falta > 0).length + mats.filter((l) => l.falta > 0).length} item(ns) em falta</small></div>
      <div class="vend-sec">Docinhos a produzir no período</div>
      <ul class="recipe-ings">${[...r.porSabor].sort((a, b) => b.q - a.q).map((x) => `<li><span>${esc(x.nome)}${x.semRend ? ' <span class="badge b-red">sem rendimento</span>' : ""}</span><span class="hint">${esc(x.formato.toLowerCase())}</span><span><b>${int(x.q)}</b></span></li>`).join("") || "<li><span>Nada a produzir</span></li>"}</ul>
      <div class="hint" style="margin-top:6px">Pela composição das caixas: ${tiposArea("doces").map((t) => `<b>${esc(t.nome)}</b> = ${esc(composicaoTxt(t.key))}`).join(" · ")}. <a class="link" data-act="ir-caixas">Alterar</a></div>
    </div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Ingredientes</h3><div class="sub">Baixa calculada pelas fichas técnicas. "Em estoque" é o saldo da tela Estoque — alterar aqui registra uma contagem.</div></div></div>
    ${tabelaCompra("doces", ins, "fds")}</div>
  <div class="card mt"><div class="card-head"><div><h3>Embalagens e materiais</h3><div class="sub">Baixa calculada pelos kits de embalagem de cada caixa</div></div></div>
    ${tabelaCompra("doces", mats, "fds")}</div>`;
}

function viewEstoque(area) {
  const abas = area === "pacoca"
    ? [["itens", "Itens"], ["projecao", "Projeção de compra"], ["movs", "Movimentações"]]
    : [["prontos", "Caixas prontas"], ["ingredientes", "Ingredientes"], ["materiais", "Embalagens & materiais"], ["projecao", "Projeção de compra"], ["movs", "Movimentações"]];
  if (!abas.some(([k]) => k === ui.estTab[area])) ui.estTab[area] = abas[0][0];
  const aba = ui.estTab[area];
  const todos = itensEstoque(area);
  const ctx = ctxEstoque(area), pb = ctx.base;
  const alertas = alertasEstoque(area, ctx);
  const disp = (ref) => round3(saldoDe(ref).qtd - (ctx.pend[ref] || 0));
  const valor = sum(todos, (i) => Math.max(0, disp(i.ref)) * i.custo);
  const movsArea = db.estoque.movs.filter((m) => m.area === area);
  setActions(`${area === "doces" ? `<button class="btn" data-act="est-producao">${icon("book")}Registrar produção</button><button class="btn" data-act="est-montagem">${icon("gift")}Montar caixas</button>` : `<button class="btn" data-act="est-novo-pac">${icon("plus")}Novo item</button>`}
    <button class="btn btn-primary" data-act="est-mov" data-val="entrada">${icon("plus")}Entrada</button>`);
  const kpis = `<div class="grid g-4">
    ${kpi("Valor em estoque", brl(valor), "Saldo × custo unitário", "money")}
    ${kpi(pb ? "Precisa comprar / baixo" : "Abaixo do mínimo", int(alertas.length), alertas.length ? esc(alertas.slice(0, 2).map((a) => a.nome).join(", ")) + (alertas.length > 2 ? "…" : "") : "Tudo em dia", "alert", alertas.length ? "neg" : "pos")}
    ${pb?.area === "pacoca" ? kpi("Estoque cobre", `${fmtQtd(Math.floor(Math.min(pb.diasCobre, 999) * 10) / 10)} dias`, `meta: ${fmtQtd(pb.semanas)} semanas (${int(pb.dias)} dias) de ${int(pb.porDia)} pacotes/dia`, "cal", pb.diasCobre < pb.dias ? "neg" : "pos")
      : pb ? kpi("Dá para fazer", `${int(Math.min(pb.capacidade, 9999))} caixas`, `com a matéria-prima em estoque · pedido comum: ${int(pb.n)}`, "gift", pb.capacidade < pb.n ? "neg" : "pos")
      : kpi("Itens com saldo", `${int(todos.filter((i) => disp(i.ref) > 0).length)} / ${int(todos.length)}`, "Itens com quantidade em estoque", "pkg")}
    ${kpi("Movimentações hoje", int(movsArea.filter((m) => m.data === hojeISO()).length), `${int(movsArea.length)} no total`, "trend")}
  </div>`;
  const head = `<div class="toolbar mt">${tabs(abas.map(([k, l]) => [k, k === "movs" || k === "projecao" ? l : `${l} <span class="badge b-gray">${todos.filter((i) => i.grupo === k).length}</span>`]), aba, "set-esttab")}
    ${aba === "movs" || aba === "projecao" ? "" : `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-act="est-filtro" ${ui.estSoAlerta ? "checked" : ""} style="width:auto" /> Só com alerta</label>
      <div class="search">${icon("search")}<input placeholder="Buscar item..." data-act="busca" value="${esc(ui.busca)}" /></div></div>`}</div>`;
  if (aba === "projecao") return kpis + head + viewProjecao(area);
  if (aba === "movs") {
    const lista = [...movsArea].reverse().slice(0, 300);
    return kpis + head + `<div class="card"><div class="card-head"><div><h3>Movimentações</h3><div class="sub">Excluir uma movimentação desfaz o efeito dela no saldo</div></div></div>
      ${lista.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Item</th><th>Tipo</th><th class="num">Quantidade</th><th class="num">Saldo após</th><th>Observação</th><th></th></tr></thead><tbody>
      ${lista.map((m) => { const [tl, tc] = TIPOS_MOV[m.tipo] || [m.tipo, "gray"]; return `<tr><td>${ddmm(m.data)} <span class="hint">${m.hora || ""}</span></td><td>${esc(m.nome)}</td><td><span class="badge b-${tc}">${tl}</span></td>
        <td class="num ${m.delta >= 0 ? "pos" : "neg"}"><b>${m.delta >= 0 ? "+" : ""}${fmtQtd(m.delta)}</b></td><td class="num">${fmtQtd(m.saldoApos)}</td><td class="hint">${esc(m.obs)}</td>
        <td><button class="btn btn-ghost btn-sm btn-danger" title="Desfazer" data-act="est-del-mov" data-id="${m.id}">${icon("trash")}</button></td></tr>`; }).join("")}
      </tbody></table></div>` : '<div class="empty">Nenhuma movimentação ainda. Comece registrando uma contagem ou entrada.</div>'}</div>`;
  }
  const q = ui.busca.toLowerCase();
  const lista = todos.filter((i) => i.grupo === aba && i.nome.toLowerCase().includes(q) && (!ui.estSoAlerta || alertas.includes(i)));
  const comPedido = pb && aba !== "prontos";
  if (comPedido) lista.sort((a, b) => pb.faltam.includes(b.ref) - pb.faltam.includes(a.ref));
  const comprar = pb ? todos.filter((i) => pb.faltam.includes(i.ref)) : [];
  const temPend = Object.keys(ctx.pend).length > 0;
  const pedidoCard = pb?.area === "pacoca" ? `<div class="card pedido-card ${comprar.length ? "falta" : ""}">
    <div class="alert ${comprar.length ? "red" : "green"}">${icon(comprar.length ? "alert" : "check")}<div>
      <b>${comprar.length ? `Precisa comprar ${comprar.length} item(ns): o estoque não cobre ${fmtQtd(pb.semanas)} semana(s) (${int(pb.dias)} dias)` : `Estoque cobre ${fmtQtd(pb.semanas)} semana(s) (${int(pb.dias)} dias)`}</b>
      <span>Meta: ${int(pb.porDia)} pacotes por dia × ${int(pb.dias)} dias = ${int(pb.porDia * pb.dias)} pacotes${pb.semanas === 2 ? " (uma semana sendo vendida + uma em produção para a semana seguinte)" : ""}. Com o estoque de hoje dá para <strong>${fmtQtd(Math.floor(Math.min(pb.diasCobre, 999) * 10) / 10)} dias (${int(Math.min(pb.capacidade, 99999))} pacotes)</strong>.
      ${comprar.length ? `Em vermelho: ${esc(comprar.map((i) => i.nome).join(", "))}.` : ""}</span></div></div>
    <div class="pedido-cfg"><span>Prazo do estoque</span>
      <label>${numIn("est-cob", pb.porDia, `data-key="porDia"`)} pacotes por dia</label>
      <label>${numIn("est-cob", pb.semanas, `data-key="semanas"`)} semanas <span class="hint">(${int(pb.dias)} dias)</span></label>
      <span class="hint">Cada pacote vendido (fechamento do dia na Área do vendedor) baixa os itens conforme a coluna "Baixa por venda".${temPend ? " O saldo já desconta as entregas de hoje ainda não fechadas." : ""}</span></div>
  </div>` : pb ? `<div class="card pedido-card ${comprar.length ? "falta" : ""}">
    <div class="alert ${comprar.length ? "red" : "green"}">${icon(comprar.length ? "alert" : "check")}<div>
      <b>${comprar.length ? `Precisa comprar ${comprar.length} item(ns): não dá para um pedido de ${int(pb.n)} caixas` : `Estoque dá para um pedido de ${int(pb.n)} caixas`}</b>
      <span>Pedido comum: ${int(pb.G)} Cx G + ${int(pb.P)} Cx P. Com a matéria-prima de hoje dá para fazer <strong>${int(Math.min(pb.capacidade, 9999))} caixas</strong>.
      ${comprar.length ? `Em vermelho: ${esc(comprar.slice(0, 6).map((i) => i.nome).join(", "))}${comprar.length > 6 ? "…" : ""}.` : ""}</span></div></div>
    <div class="pedido-cfg"><span>Pedido comum</span>
      <label>${numIn("est-pedido", pb.n, 'data-key="pedidoBase"')} caixas</label>
      <label>${numIn("est-pedido", pb.pctG, 'data-key="pedidoPctG"')} % Cx G <span class="hint">(${fmtQtd(100 - pb.pctG)}% Cx P)</span></label>
      <span class="hint">As vendas dão baixa automática: primeiro nas caixas prontas; o que passar disso desconta ingredientes (gramas ÷ rendimento das fichas técnicas) e embalagens.${temPend ? " O saldo já desconta as vendas de hoje ainda não fechadas." : ""}</span></div>
  </div>` : "";
  const dica = { prontos: "Conte aqui as caixas já montadas (botão Contar). As vendas saem primeiro destas caixas; o que passar disso desconta ingredientes e embalagens.", ingredientes: "Em gramas/ml/unidades, como na tela Insumos. Vendas sem caixa pronta e produções dão baixa conforme as fichas técnicas (gramas ÷ rendimento).", materiais: "Embalagens e brindes. Vendas sem caixa pronta e montagens dão baixa conforme os kits.", itens: "A Área do vendedor dá baixa ao fechar o dia, conforme a coluna \"Baixa por venda\"." }[aba];
  return kpis + head + pedidoCard + `<div class="card ${pb ? "mt" : ""}"><div class="card-head"><div><h3>${abas.find(([k]) => k === aba)[1]}</h3><div class="sub">${dica}</div></div></div>
    ${lista.length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Saldo</th>${comPedido ? `<th class="num">${pb.area === "pacoca" ? `Para ${int(pb.dias)} dias` : `Pedido de ${int(pb.n)} cx`}</th>` : ""}<th class="num hide-m">Mínimo</th>${area === "pacoca" ? '<th class="num hide-m">Baixa por venda</th>' : ""}<th class="num hide-m">Valor</th><th class="hide-m">Situação</th><th class="num">Movimentar</th></tr></thead><tbody>
    ${lista.map((i) => { const s = saldoDe(i.ref), d = disp(i.ref), pend = ctx.pend[i.ref] || 0, st = situacaoEstoque(i.ref, area, ctx), nec = pb?.nec[i.ref] || 0; return `<tr class="${st.t === "Comprar" || st.t === "Negativo" ? "row-comprar" : ""}"><td><b>${esc(i.nome)}</b><div class="hint">${brlU(i.custo)}/${esc(i.unid)}</div></td>
      <td class="num"><b class="${d < 0 || st.t === "Comprar" ? "neg" : ""}">${fmtQtd(d)}</b> <span class="hint">${esc(i.unid)}</span>${pend ? `<div class="hint">−${fmtQtd(round3(pend))} em vendas abertas</div>` : ""}<div class="show-m"><span class="badge b-${st.c}">${st.t}</span></div></td>
      ${comPedido ? `<td class="num">${nec ? `${fmtQtd(round2(nec))} <span class="hint">${esc(i.unid)}</span>${d < nec ? `<div class="neg"><b>falta ${fmtQtd(round2(nec - Math.max(0, d)))}</b></div>` : ""}` : '<span class="hint">—</span>'}</td>` : ""}
      <td class="num hide-m">${numIn("est-min", s.minimo, `data-ref="${i.ref}"`)}</td>
      ${area === "pacoca" ? `<td class="num hide-m">${i.item ? `${fmtQtd(consumoPacote(i.item))} <span class="hint">${esc(i.unid)}</span>` : `1 <span class="hint">pct</span>`}</td>` : ""}
      <td class="num hide-m">${brl(Math.max(0, d) * i.custo)}</td><td class="hide-m"><span class="badge b-${st.c}">${st.t}</span></td>
      <td class="num" style="white-space:nowrap">
        <button class="btn btn-sm" title="Entrada" data-act="est-mov" data-val="entrada" data-ref="${i.ref}">+<span class="hide-m"> Entrada</span></button>
        <button class="btn btn-sm" title="Saída / perda" data-act="est-mov" data-val="saida" data-ref="${i.ref}">−<span class="hide-m"> Saída</span></button>
        <button class="btn btn-sm" title="Contagem" data-act="est-mov" data-val="ajuste" data-ref="${i.ref}">Contar</button>
        ${area === "pacoca" && i.item ? `<button class="btn btn-ghost btn-sm" title="Editar item" data-act="est-edit-pac" data-id="${i.item.id}">${icon("edit")}</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div>` : `<div class="empty">${ui.estSoAlerta ? "Nenhum item com alerta." : "Nenhum item encontrado."}</div>`}
  </div>`;
}

/* =================== Roteamento & eventos =================== */
const VIEWS = { "perdas-doces": () => viewPerdas("doces"), "perdas-pacoca": () => viewPerdas("pacoca"), "pedidos-doces": () => viewPedidos("doces"), "pedidos-pacoca": () => viewPedidos("pacoca"), "simulador-geral": viewSimGeral, "pagamentos-geral": () => viewPagamentos("geral"), "simulador-pacoca": viewSimPacoca, "painel-geral": viewPainelGeral, "dre-geral": viewDreGeral, "insumos-pacoca": viewInsumosPacoca, "dre-pacoca": viewDrePacoca, estoque: () => viewEstoque("doces"), "estoque-pacoca": () => viewEstoque("pacoca"), pagamentos: () => viewPagamentos("doces"), "pagamentos-pacoca": () => viewPagamentos("pacoca"), equipe: viewEquipe, "equipe-pacoca": viewEquipe, "vendedor-doces": () => viewVendedor("doces"), "vendedor-pacoca": () => viewVendedor("pacoca"), personalizar: viewPersonalizar, inicio: viewInicio, "pacoca-painel": viewPacPainel, "pacoca-custos": viewPacCustos, painel: viewPainel, vendas: viewVendas, pacoca: viewPacoca, produtos: viewProdutos, simulador: viewSimulador, receitas: viewReceitas, insumos: viewInsumos, embalagens: viewEmbalagens, dre: viewDre };
const AFTER = { "painel-geral": afterPainelGeral, "dre-pacoca": afterDrePacoca, "pacoca-painel": afterPacPainel, painel: afterPainel, pacoca: afterPacoca, dre: afterDre };
let currentPage = null;
const areaAtual = () => PAGES.find((p) => p.id === currentPage)?.area;

function renderNav(page) {
  const area = AREAS[page.area];
  if (!area) { $("#nav").innerHTML = ""; return; }
  const outras = Object.keys(AREAS).filter((k) => k !== page.area);
  let html = `<div class="area-switch" style="--area:${area.cor}">
    <small>Área atual</small><b>${area.nome}</b>
    <div class="area-switch-links">${outras.map((k) => `<a href="#${AREAS[k].inicial}">${k === "geral" ? "Negócio todo" : "Ir para " + AREAS[k].nome}</a>`).join("")}<a href="#inicio">Início</a></div>
    ${page.area === "geral" ? "" : `<a class="area-config ${["personalizar", "pacoca-custos"].includes(page.id) ? "active" : ""}" href="#${page.area === "pacoca" ? "pacoca-custos" : "personalizar"}">${icon("gear")}Personalizar custos</a>`}</div>`;
  PAGES.filter((p) => p.area === page.area).forEach((p) => {
    if (p.section) html += `<div class="nav-section">${p.section}</div>`;
    html += `<a href="#${p.id}" class="${p.id === page.id ? "active" : ""}">${icon(p.icon)}${p.label}</a>`;
  });
  $("#nav").innerHTML = html;
}
function render() {
  resetCarga();
  if (APP_VENDEDOR) {
    const area = localStorage.getItem("hag_vend_area") || "doces";
    currentPage = "vendedor-" + area;
    document.body.classList.add("vend-mode");
    document.body.classList.remove("home-mode");
    $("#nav").innerHTML = "";
    $("#pageTitle").textContent = "HA La Vie · Vendas";
    $("#pageSub").textContent = AREAS[area].nome;
    destroyCharts();
    setActions("");
    $("#content").innerHTML = viewVendedor(area);
    return;
  }
  const id = location.hash.slice(1) || "inicio";
  const page = PAGES.find((p) => p.id === id) || PAGES[0];
  if (page.id !== currentPage) {
    ui.busca = "";
    window.scrollTo(0, 0);
    const prev = PAGES.find((p) => p.id === currentPage);
    if (!prev || prev.area !== page.area) ui.mes = 0;
    ui.pedPrint = false;
  }
  currentPage = page.id;
  document.body.classList.toggle("home-mode", page.id === "inicio");
  document.body.classList.toggle("ped-print", !!ui.pedPrint && /^pedidos-/.test(page.id));
  renderNav(page);
  $("#pageTitle").textContent = page.area ? `${AREAS[page.area].nome} · ${page.label}` : page.label;
  $("#pageSub").textContent = page.sub;
  destroyCharts();
  setActions("");
  $("#content").innerHTML = VIEWS[page.id]();
  AFTER[page.id]?.();
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
}

function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
  const act = el.dataset.act, id = el.dataset.id, val = el.dataset.val;
  const find = (arr) => arr.find((x) => x.id === id);
  switch (act) {
    case "set-vcanal": ui.vendasCanal = val; break;
    case "set-pmes": ui.pacMes = +val; break;
    case "set-pcanal": ui.prodCanal = val; break;
    case "set-instab": ui.insTab = val; ui.busca = ""; break;
    case "set-rectab": ui.recTab = val; break;
    case "set-sabor": ui.sabor = +val; break;
    case "set-barra": ui.barra = +val; break;
    case "set-esttab": ui.estTab[areaAtual()] = val; ui.busca = ""; break;
    case "est-mov": return formMovimento(areaAtual(), el.dataset.ref, val);
    case "est-producao": return formProducao();
    case "perda-nova": return formPerda(el.dataset.area || areaAtual(), val || "produto");
    case "perda-del": {
      const p = find(db.perdas || []);
      if (!p) return;
      return confirmDel(`Excluir a perda "${p.descricao}" (${brl(p.valor)})? Os itens voltam para o estoque e o valor sai do DRE.`, () => {
        (p.itens || []).forEach((x) => movimentar(p.area, x.ref, x.nome, x.qtd, "estorno", `Perda excluída: ${p.descricao}`));
        db.perdas = db.perdas.filter((x) => x.id !== p.id);
      });
    }
    case "est-montagem": return formMontagem();
    case "est-novo-pac": case "ins-pac-novo": return formItemPacocaInsumo();
    case "est-edit-pac": case "edit-ins-pac": return formItemPacocaInsumo(db.estoque.pacocaItens.find((x) => x.id === id));
    case "del-ins-pac": {
      const it = db.estoque.pacocaItens.find((x) => x.id === id);
      return confirmDel(`Excluir o insumo "${it.nome}"? Ele sai do custo do pacote e do estoque.`, () => { db.estoque.pacocaItens = db.estoque.pacocaItens.filter((x) => x.id !== id); delete db.estoque.saldos["pac:" + id]; });
    }
    case "est-del-mov": {
      const m = db.estoque.movs.find((x) => x.id === id);
      return confirmDel(`Desfazer "${(TIPOS_MOV[m.tipo] || [m.tipo])[0]}" de ${fmtQtd(m.delta)} em ${m.nome}? O saldo volta ${m.delta >= 0 ? "a diminuir" : "a aumentar"}.`, () => {
        const s = saldoDe(m.ref); s.qtd = round3(s.qtd - m.delta);
        db.estoque.movs = db.estoque.movs.filter((x) => x.id !== id);
      });
    }
    case "set-pgtipo": ui.pgTipo = val; ui.pgMes = 0; break;
    case "set-pgstatus": ui.pgStatus = val; break;
    case "new-pag": return formPagamento(areaAtual());
    case "edit-pag": return formPagamento(areaAtual(), find(db.pagamentos));
    case "ig-add": { db.impostosGerais.fixos.push({ id: uid(), nome: "Novo imposto", valor: 0, dia: 20 }); save(); render(); return; }
    case "ig-del": return confirmDel("Remover este imposto?", () => { db.impostosGerais.fixos = db.impostosGerais.fixos.filter((x) => x.id !== id); });
    case "del-pag": return confirmDel("Excluir esta conta?", () => {
      const p = db.pagamentos.find((x) => x.id === id);
      if (p?.auto) db.contasIgnoradas = [...new Set([...(db.contasIgnoradas || []), p.auto])];
      db.pagamentos = db.pagamentos.filter((x) => x.id !== id);
    });
    case "pg-fiado": gerarFiadoPacoca(); save(); break;
    case "new-cvar": return formCustoVar(null, val === "pacoca" ? "pacoca" : "doces");
    case "edit-cvar": return formCustoVar(find(db.custosVar));
    case "del-cvar": return confirmDel("Excluir este custo variável?", () => { db.custosVar = db.custosVar.filter((x) => x.id !== id); });
    case "eq-copiar": {
      const cfg = Sync.getCfg();
      const txt = val === "regras" ? REGRAS_FIRESTORE : `${urlApp(val === "vend" ? "vendedor/" : "gestao/")}#conectar=${codigoConexao(cfg)}`;
      navigator.clipboard?.writeText(txt).then(() => toast("Copiado"), () => prompt("Copie:", txt));
      return;
    }
    case "eq-conectar": {
      const fb = lerConfigFirebase($("#eqConfig").value), equipe = $("#eqCodigo").value.trim();
      if (!fb) { toast("Não reconheci o firebaseConfig. Cole o bloco inteiro."); return; }
      if (!/^[a-zA-Z0-9_-]{6,}$/.test(equipe)) { toast("Código da equipe: mínimo 6 letras/números, sem espaços"); return; }
      Sync.setCfg({ firebase: fb, equipe });
      location.reload();
      return;
    }
    case "eq-desconectar":
      if (confirm("Desconectar este aparelho? Os dados continuam na nuvem e neste aparelho, mas param de sincronizar.")) { Sync.clearCfg(); location.reload(); }
      return;
    case "vend-pag": setPag(areaAtual(), val); break;
    case "vend-combo": {
      const area = areaAtual(), c = db.vendedor.combos[area].find((x) => x.id === id);
      // Paçoca é pix confiança: entrega agora (sem pagamento), o recebimento é registrado depois
      if (area === "pacoca") {
        novoRegistro(area, { tipo: "entrega", comboId: c.id, nome: `Promo ${c.nome}`, valor: c.preco, pag: null, itens: { ...c.itens } });
        render(); toast(`Entregue: ${c.nome} · a receber ${brl(c.preco)}`);
        return;
      }
      const pag = getPag(area);
      novoRegistro(area, { comboId: c.id, nome: `Promo ${c.nome}`, valor: c.preco, pag, itens: { ...c.itens } });
      render(); toast(`Promo ${c.nome} · ${brl(c.preco)} · ${PAGS[pag]}`);
      return;
    }
    case "vend-normal": {
      const area = areaAtual(), t = tiposArea(area).find((x) => x.key === val), preco = precoNormal(area, val);
      if (area === "pacoca") {
        novoRegistro(area, { tipo: "entrega", comboId: null, nome: "Entrega", valor: preco, pag: null, itens: { [val]: 1 } });
        render(); toast(`Entregue: 1 pacote · a receber ${brl(preco)}`);
        return;
      }
      const pag = getPag(area);
      novoRegistro(area, { comboId: null, nome: t.nome, valor: preco, pag, itens: { [val]: 1 } });
      render(); toast(`${t.nome} · ${brl(preco)} · ${PAGS[pag]}`);
      return;
    }
    case "pac-entregar-lote": {
      const q = Math.round(parseNum($("#pacQtdLote").value));
      if (!(q > 0)) { toast("Informe a quantidade de pacotes"); return; }
      const preco = precoNormal("pacoca", "U");
      novoRegistro("pacoca", { tipo: "entrega", comboId: null, nome: "Entrega", valor: preco * q, pag: null, itens: { U: q } });
      render(); toast(`Entregues: ${q} pacotes · a receber ${brl(preco * q)}`);
      return;
    }
    case "pac-receber": {
      const valor = val ? +val : parseNum($("#pacRecValor").value);
      if (!(valor > 0)) { toast("Informe o valor recebido"); return; }
      const pag = getPag("pacoca") === "especie" ? "especie" : "pix";
      novoRegistro("pacoca", { tipo: "receb", comboId: null, nome: "Pagamento recebido", valor, pag, itens: {} });
      render(); toast(`Recebido ${brl(valor)} em ${PAGS[pag]}`);
      return;
    }
    case "vend-undo": {
      const ult = registrosDia(areaAtual()).filter((r) => !r.lancado && r.device === Sync.client).pop();
      if (ult) { db.vendedor.registros = db.vendedor.registros.filter((r) => r !== ult); salvarLocal(); Sync.delRegistro(ult.id); toast(`Desfeito: ${ult.nome}`); }
      break;
    }
    case "vend-del": {
      const r = db.vendedor.registros.find((x) => x.id === id);
      const msg = r.lancado ? "Esta venda já foi lançada. Excluir aqui NÃO altera o lançamento — corrija também na tela de vendas. Excluir mesmo assim?" : `Excluir a venda "${r.nome}" das ${r.hora}?`;
      return confirmDel(msg, () => { db.vendedor.registros = db.vendedor.registros.filter((x) => x.id !== id); Sync.delRegistro(id); });
    }
    case "vend-area": localStorage.setItem("hag_vend_area", val); break;
    case "vend-nome": {
      const n = prompt("Seu nome:", nomeVendedor());
      if (n !== null && n.trim()) localStorage.setItem("hag_vendedor_nome", n.trim());
      break;
    }
    case "vend-nome-salvar": {
      const n = $("#nomeVendedorInput").value.trim();
      if (!n) { toast("Digite seu nome"); return; }
      localStorage.setItem("hag_vendedor_nome", n);
      break;
    }
    case "vend-lancar": {
      const area = areaAtual(), n = registrosDia(area).filter((r) => !r.lancado).length;
      if (!confirm(`Lançar ${n} venda(s) de ${ddmm(ui.vendData)} nos registros de ${area === "pacoca" ? "Vendas diárias" : "Vendas"}?`)) return;
      lancarDia(area); save(); break;
    }
    case "new-combo": return formCombo(areaAtual());
    case "edit-combo": return formCombo(areaAtual(), db.vendedor.combos[areaAtual()].find((x) => x.id === id));
    case "del-combo": return confirmDel("Excluir esta promoção?", () => { const a = areaAtual(); db.vendedor.combos[a] = db.vendedor.combos[a].filter((x) => x.id !== id); });
    case "ir-caixas": ui.recTab = "caixas"; if (location.hash === "#receitas") render(); else location.hash = "receitas"; return;
    case "rec-nova": return formNovaReceita(val);
    case "rec-excluir": {
      const barra = val === "barra", lista = barra ? db.barras : db.sabores, k = barra ? ui.barra : ui.sabor, r = lista[k];
      const ligados = db.params.filter((p) => p.fonte && (barra ? p.fonte.barra === r.nome : p.fonte.sabor === r.nome)).map((p) => p.nome);
      const msg = `Excluir a receita "${r.nome}"?${ligados.length ? `\n\nAtenção: ela é a origem de: ${ligados.join(", ")}. Esses custos ficarão em R$ 0 até você escolher outra origem em Personalizar custos.` : ""}`;
      return confirmDel(msg, () => { lista.splice(k, 1); if (barra) ui.barra = 0; else ui.sabor = 0; });
    }
    case "add-ing": return formIngrediente(val);
    case "add-taxa": return openForm({
      title: `Nova taxa · ${val}`,
      fields: [{ key: "nome", label: "Nome da taxa", required: true, full: true }, { key: "pct", label: "Percentual sobre o preço (%)", type: "num", full: true }],
      onSave: (v) => { db.canais[val].taxas = db.canais[val].taxas || []; db.canais[val].taxas.push(v); toast("Taxa adicionada"); },
    });
    case "del-taxa": return confirmDel("Remover esta taxa?", () => db.canais[val].taxas.splice(+el.dataset.i, 1));
    case "trocar-ing": return formTrocarIngrediente(val, +el.dataset.i);
    case "del-ing": {
      const alvo = val === "barra" ? db.barras[ui.barra].itens : db.sabores[ui.sabor].lote;
      return confirmDel(`Remover "${nomeItem(alvo[+el.dataset.i])}" da receita?`, () => alvo.splice(+el.dataset.i, 1));
    }
    case "set-simcanal": db.sim.canal = val; save(); break;
    case "sim-zerar": db.sim.qtd = {}; save(); break;
    case "ped-print": ui.pedPrint = !ui.pedPrint; window.scrollTo(0, 0); break;
    case "ped-enviar": return enviarPedido(val);
    case "ped-media": { autoPedido().total = +val || 0; save(); break; }
    case "ped-auto-preencher": return preencherFimDeSemana(autoPedido().total || Math.round(mediaHistoricaSemanas().geral.P + mediaHistoricaSemanas().geral.G));
    case "ped-cancelar": return cancelarPedido(id);
    case "ped-copiar": {
      const txt = textoPedido(val, diasPedido(val));
      (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => toast("Pedido copiado — cole no WhatsApp")).catch(() => { prompt("Copie o pedido:", txt); });
      return;
    }
    case "pacsim-hist": {
      const { meses, geral } = mediaHistoricaPacoca(), x = +val ? meses.find((y) => y.m === +val) : geral;
      if (!x) return;
      db.pacocaSim.porDia = Math.round(x.porDia); save(); render();
      toast(`Simulador com ${int(db.pacocaSim.porDia)} pacotes/dia (${+val ? MESES_FULL[+val - 1] : "média geral"})`);
      return;
    }
    case "sim-hist": {
      const { semanas, geral } = mediaHistoricaSemanas(), m = +val ? semanas[+val - 1] : geral;
      const filled = [];
      // A média histórica é o total de caixas P e G; zera as outras caixas do canal para não somar duas vezes
      db.produtos.filter((x) => x.canal === db.sim.canal && /^Caixa .* [49]un$/i.test(x.nome)).forEach((x) => { delete db.sim.qtd[x.id]; });
      tiposArea("doces").forEach((t) => {
        const prod = db.produtos.find((x) => x.canal === db.sim.canal && x.nome === t.produto);
        if (prod) { db.sim.qtd[prod.id] = Math.round(m[t.key]); filled.push(`${Math.round(m[t.key])} ${prod.nome}`); }
      });
      save();
      toast(filled.length ? `${+val ? `${val}ª semana` : "Média geral"}: ${filled.join(" + ")}` : "Este canal não tem as caixas P/G ligadas");
      break;
    }
    case "new-venda": return formVenda();
    case "edit-venda": return formVenda(find(db.vendas));
    case "del-venda": return confirmDel("Excluir este lançamento de venda?", () => { db.vendas = db.vendas.filter((x) => x.id !== id); });
    case "new-pac": return formPac();
    case "edit-pac": return formPac(find(db.pacoca));
    case "del-pac": return confirmDel("Excluir este dia?", () => { db.pacoca = db.pacoca.filter((x) => x.id !== id); });
    case "new-prod": return formProd();
    case "edit-prod": return formProd(find(db.produtos));
    case "del-prod": return confirmDel("Excluir este produto?", () => { db.produtos = db.produtos.filter((x) => x.id !== id); });
    case "new-ins": return formIns();
    case "edit-ins": return formIns(find(db[ui.insTab]));
    case "del-ins": {
      const u = usoInsumo(ui.insTab, find(db[ui.insTab]));
      const msg = u.length ? `Este item é usado em: ${u.join(", ")}.\nSe excluir, ele passa a custar R$ 0 nesses lugares. Excluir mesmo assim?` : "Excluir este item?";
      return confirmDel(msg, () => { db[ui.insTab] = db[ui.insTab].filter((x) => x.id !== id); });
    }
    case "emb-add": return formEmbItem(find(db.embalagens));
    case "emb-del": {
      const e = find(db.embalagens), i = +el.dataset.i;
      return confirmDel(`Remover "${e.itens[i].material}" do kit ${e.nome}?`, () => e.itens.splice(i, 1));
    }
    case "new-compra": return formCompra();
    case "edit-compra": return formCompra(find(db.pacocaCompra));
    case "del-compra": return confirmDel("Excluir este item da compra?", () => { db.pacocaCompra = db.pacocaCompra.filter((x) => x.id !== id); });
    case "new-fixo": return openForm({ title: "Nova despesa fixa", fields: [{ key: "nome", label: "Descrição", required: true, full: true }, { key: "valor", label: "Valor mensal (R$)", type: "num", full: true }], onSave: (v) => fixosLista(val).push({ id: uid(), ...v }) });
    case "del-fixo": return confirmDel("Excluir esta despesa fixa?", () => { const l = fixosLista(val); l.splice(l.findIndex((x) => x.id === id), 1); });
    default: return;
  }
  render();
}
function onChange(e) {
  const el = e.target, act = el.dataset.act;
  if (/^venc-|^ig-dia|^ig-dasdia|^ig-seguinte-sel/.test(act || "")) ui.vencAberto = true;
  if (act === "par-fonte") { aplicarFonte(db.params.find((x) => x.key === el.dataset.key), el.value); save(); render(); toast("Origem do custo atualizada"); }
  if (act === "bar-linha") { db.barras[ui.barra].linha = el.value; save(); render(); toast(`Barra marcada como ${el.value}`); }
  if (act === "cx-qtd") { const c = caixaDe(el.dataset.key), q = parseNum(el.value); if (q) c.itens[el.dataset.sabor] = q; else delete c.itens[el.dataset.sabor]; save(); render(); }
  if (act === "cx-formato") { caixaDe(el.dataset.key).formato = el.value; save(); render(); }
  if (act === "proj-modo") { db.projecao.doces.modo = el.value; save(); render(); }
  if (act === "proj-periodo") { db.projecao.doces.periodo = el.value; save(); render(); }
  if (act === "proj-par") { db.projecao.doces[el.dataset.key] = parseNum(el.value); save(); render(); }
  if (act === "projp-par") { db.pacocaSim[el.dataset.key] = parseNum(el.value); save(); render(); }
  if (act === "proj-est") {
    const novo = parseNum(el.value), atual = saldoDe(el.dataset.ref).qtd;
    if (Math.abs(novo - atual) > 1e-9) { movimentar(el.dataset.area, el.dataset.ref, el.dataset.nome, novo - atual, "ajuste", "Contagem (projeção)"); save(); toast(`Estoque atualizado: ${el.dataset.nome}`); }
    render();
  }
  if (act === "est-cob") { db.estoque.coberturaPac = db.estoque.coberturaPac || {}; const v = parseNum(el.value); db.estoque.coberturaPac[el.dataset.key] = el.dataset.key === "semanas" ? Math.max(0.5, Math.round(v * 2) / 2) : Math.max(1, Math.round(v)); save(); render(); }
  if (act === "est-pedido") { const v = parseNum(el.value); db.projecao.doces[el.dataset.key] = el.dataset.key === "pedidoPctG" ? Math.min(100, Math.max(0, v)) : Math.max(1, Math.round(v)); save(); render(); }
  if (act === "est-min") { saldoDe(el.dataset.ref).minimo = parseNum(el.value); save(); render(); }
  if (act === "est-filtro") { ui.estSoAlerta = el.checked; render(); }
  if (act === "set-dremes") { ui.dreMes = +el.value; render(); }
  if (act === "set-dremespac") { ui.dreMesPac = +el.value; render(); }
  if (act === "set-pgmes") { ui.pgMes = +el.value; render(); }
  if (act === "set-perdames") { ui.perdasMes = +el.value; render(); }
  if (act === "ped-qtd") {
    const d = pedidosDe(el.dataset.area).dias, dia = el.dataset.dia;
    d[dia] = { ...(d[dia] || {}), [el.dataset.key]: Math.max(0, Math.round(parseNum(el.value))) };
    if (!Object.values(d[dia]).some((v) => +v)) delete d[dia];
    save(); render();
  }
  if (act === "ped-auto") { const a = autoPedido(), k = el.dataset.key; a[k] = Math.max(0, k === "total" ? Math.round(parseNum(el.value)) : Math.min(100, parseNum(el.value))); save(); render(); }
  if (act === "ped-ini") { ui.pedIni = ui.pedIni || {}; ui.pedIni[el.dataset.area] = el.value || hojeISO(); render(); }
  if (act === "ped-obs") { pedidosDe(el.dataset.area).obs = el.value.trim(); save(); render(); }
  if (act === "set-dremesger") { ui.dreMesGer = +el.value; render(); }
  if (act === "venc-freq" || act === "venc-dia") {
    const a = el.dataset.area, cat = el.dataset.cat, r = regraVenc(a, cat);
    db.vencRegras = db.vencRegras || {}; db.vencRegras[a] = db.vencRegras[a] || {};
    if (act === "venc-freq") { r.freq = el.value; r.dia = el.value === "semanal" ? 0 : el.value === "seguinte" ? 10 : 31; }
    else r.dia = Math.max(0, Math.min(31, Math.round(parseNum(el.value))));
    db.vencRegras[a][cat] = { freq: r.freq, dia: r.dia };
    save(); render(); toast(`${NOME_CONTA[cat] || cat} (${AREA_LABEL[a]}): ${textoRegra(r)}`);
  }
  if (act === "ig-seguinte-sel") { const it = (impGerais().fixos || []).find((x) => x.id === el.dataset.id); if (it) { it.mesSeguinte = el.value === "1"; save(); render(); } }
  if (act === "ig-seguinte") { const it = (impGerais().fixos || []).find((x) => x.id === el.dataset.id); if (it) { it.mesSeguinte = el.checked; save(); render(); } }
  if (act === "ig-modo") { impGerais().rateioModo = el.value; save(); render(); }
  if (act === "ig-pctdoces") { impGerais().rateioDoces = Math.min(100, Math.max(0, parseNum(el.value))); save(); render(); }
  if (act === "ig-das" || act === "ig-dasdia") { impGerais()[act === "ig-das" ? "dasPct" : "dasDia"] = parseNum(el.value); save(); render(); }
  if (["ig-nome", "ig-val", "ig-dia"].includes(act)) {
    const it = (impGerais().fixos || []).find((x) => x.id === el.dataset.id);
    if (it) { if (act === "ig-nome") it.nome = el.value.trim() || it.nome; else it[act === "ig-val" ? "valor" : "dia"] = parseNum(el.value); save(); render(); }
  }
  if (act === "pg-auto-desde" && el.value) { db.config.contasAutoDesde = el.value; save(); render(); toast(`Contas automáticas a partir de ${ddmm(el.value)}`); }
  if (act === "pg-separar") {
    const p = db.pagamentos.find((x) => x.id === el.dataset.id), ar = el.dataset.area;
    if (ar) {
      p.sepArea = { ...(p.sepArea || {}) };
      if (el.checked) p.sepArea[ar] = { valor: parteConta(p, ar), data: hojeISO() }; else delete p.sepArea[ar];
    } else Object.assign(p, el.checked ? { separado: true, valorSeparado: +p.valor || 0, dataSeparado: hojeISO() } : { separado: false, valorSeparado: 0, dataSeparado: null });
    save(); render(); toast(el.checked ? `Separado: ${brl(ar ? parteConta(p, ar) : p.valor)} · ${p.descricao}` : `Voltou para "a separar": ${p.descricao}`);
  }
  if (act === "pg-toggle") {
    const p = db.pagamentos.find((x) => x.id === el.dataset.id);
    p.pago = el.checked; p.dataPago = p.pago ? hojeISO() : null; p.atraso = false;
    save(); render(); toast(p.pago ? `${p.tipo === "pagar" ? "Pago" : "Recebido"}: ${p.descricao}` : `Voltou para pendente: ${p.descricao}`);
  }
  if (act === "vend-data") { ui.vendData = el.value || hojeISO(); render(); }
  if (act === "vend-tipo-prod") { tiposArea("doces").find((t) => t.key === el.dataset.key).produto = el.value; save(); render(); }
  if (act === "set-mes") { ui.mes = +el.value; render(); }
  if (act === "set-vmes") { ui.vendasMes = +el.value; render(); }
  if (act === "set-fixo") { const f = fixosLista(el.dataset.area).find((x) => x.id === el.dataset.id); f.valor = parseNum(el.value); save(); render(); }
  if (act === "set-preco-pac") { db.config.precoPacoca = parseNum(el.value) || 0; save(); render(); }
}
function onInput(e) {
  const el = e.target, act = el.dataset.act;
  if (act === "set-preco") { const p = db.produtos.find((x) => x.id === el.dataset.id); p.preco = parseNum(el.value); save(); updateProdCard(p.id); }
  const persAtualiza = () => { save(); const r = $("#persResumo"); if (r) r.innerHTML = resumoCanaisHtml(); };
  if (act === "emb-qtd") { const e = db.embalagens.find((x) => x.id === el.dataset.id); e.itens[+el.dataset.i].qtd = parseNum(el.value); save(); refreshKit(e); }
  if (act === "par-val") { db.params.find((x) => x.key === el.dataset.key).valor = parseNum(el.value); persAtualiza(); }
  if (act === "can-min") { db.canais[el.dataset.canal].alvoMin = parseNum(el.value); persAtualiza(); }
  if (act === "can-max") { db.canais[el.dataset.canal].alvoMax = parseNum(el.value); persAtualiza(); }
  if (act === "tx-pct") { db.canais[el.dataset.canal].taxas[+el.dataset.i].pct = parseNum(el.value); persAtualiza(); }
  if (act === "tx-nome") { db.canais[el.dataset.canal].taxas[+el.dataset.i].nome = el.value; save(); }
  if (act === "rec-lote") { db.sabores[ui.sabor].lote[+el.dataset.i].qtd = parseNum(el.value); save(); refreshReceita(); }
  if (act === "rec-rend") { db.sabores[ui.sabor].rend[+el.dataset.j] = parseNum(el.value); save(); refreshReceita(); }
  if (act === "rec-porun") { db.sabores[ui.sabor].porUn[+el.dataset.i].qtd[+el.dataset.j] = parseNum(el.value); save(); refreshReceita(); }
  if (act === "bar-qtd") { db.barras[ui.barra].itens[+el.dataset.i].qtd = parseNum(el.value); save(); refreshReceita(); }
  if (act === "pac-custo") {
    db.pacocaCusto.find((x) => x.id === el.dataset.id).valor = parseNum(el.value);
    save();
    if ($("#pacUnit")) $("#pacUnit").innerHTML = pacUnitHtml();
    if ($("#pacSim")) $("#pacSim").innerHTML = pacSimHtml();
  }
  if (act === "pacsim-fixo") {
    db.pacocaSim.fixos[el.dataset.key] = parseNum(el.value); save();
    if ($("#pacSim")) $("#pacSim").innerHTML = pacSimHtml();
    if ($("#pacGastos")) $("#pacGastos").innerHTML = gastosHtml(gastosSimPacoca());
  }
  if (act === "pac-sim") {
    db.pacocaSim[el.dataset.key] = parseNum(el.value); save();
    if ($("#pacSim")) $("#pacSim").innerHTML = pacSimHtml();
    if ($("#pacGastos")) $("#pacGastos").innerHTML = gastosHtml(gastosSimPacoca());
    if ($("#pacUnit")) $("#pacUnit").innerHTML = pacUnitHtml();
  }
  if (act === "sim-qtd") { db.sim.qtd[el.dataset.id] = parseNum(el.value); save(); refreshSim(); }
  if (act === "sim-fixo") { db.sim.fixos[el.dataset.key] = parseNum(el.value); save(); refreshSim(); }
  if (act === "sim-semanas") { db.sim.semanas = parseNum(el.value); save(); refreshSim(); }
  if (act === "busca") {
    ui.busca = el.value;
    const pos = el.selectionStart;
    render();
    const again = document.querySelector('[data-act="busca"]');
    if (again) { again.focus(); again.setSelectionRange(pos, pos); }
  }
}

document.addEventListener("click", (e) => { if (e.target.closest("#content, #topActions")) onClick(e); });
document.addEventListener("change", (e) => { if (e.target.closest("#content, #topActions")) onChange(e); });
document.addEventListener("input", (e) => { if (e.target.closest("#content, #topActions")) onInput(e); });
window.addEventListener("hashchange", render);

$("#menuBtn").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#overlay").classList.add("show"); });
$("#overlay").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); });
$("#btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ha-gourmet-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  toast("Backup baixado");
});
$("#btnImport").addEventListener("click", () => $("#fileImport").click());
$("#fileImport").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try { db = JSON.parse(await f.text()); save(); render(); toast("Backup importado"); } catch { toast("Arquivo inválido"); }
  e.target.value = "";
});
$("#btnReset").addEventListener("click", () => {
  if (confirm("Restaurar os dados originais da planilha? As alterações feitas aqui serão perdidas.")) { db = buildSeed(); save(); ui.pacMes = null; render(); toast("Dados restaurados"); }
});

/* =================== Sincronização em tempo real =================== */
// Atualizações vindas de outro aparelho não redesenham a tela enquanto alguém digita
let renderPendente = false;
function renderSeguro() {
  const ativo = document.activeElement;
  const digitando = ativo && ativo.matches("input, select, textarea") && ativo.closest("#content, #topActions");
  if (document.querySelector(".modal-bg") || digitando) { renderPendente = true; return; }
  renderPendente = false;
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
document.addEventListener("focusout", () => { if (renderPendente) setTimeout(() => renderPendente && renderSeguro(), 250); });
document.addEventListener("click", () => { if (renderPendente) setTimeout(() => renderPendente && renderSeguro(), 400); });

const PILL = { local: ["Só neste aparelho", "gray"], conectando: ["Conectando…", "yellow"], online: ["Sincronizado", "green"], offline: ["Offline · envia ao voltar", "yellow"], erro: ["Erro de sincronização", "red"] };
Sync.onStatus((s) => {
  const [t, c] = PILL[s] || PILL.local;
  const el = $("#syncPill");
  el.className = `sync-pill b-${c}`;
  el.textContent = "● " + t;
  el.title = APP_VENDEDOR ? "" : "Abrir Equipe & App";
  el.onclick = () => { if (!APP_VENDEDOR) location.hash = areaAtual() === "pacoca" ? "equipe-pacoca" : "equipe"; };
});

// Link do vendedor por área: .../vendedor/?area=pacoca (ou doces) já abre na área certa e fica lembrado no aparelho
(() => {
  const a = new URLSearchParams(location.search).get("area");
  if (APP_VENDEDOR && ["doces", "pacoca"].includes(a)) localStorage.setItem("hag_vend_area", a);
})();

// Link de convite: .../vendedor.html#conectar=CODIGO (ou .../#conectar=CODIGO na gestão) conecta o aparelho à equipe
(() => {
  const m = location.hash.match(/conectar=([^&]+)/);
  if (!m) return;
  try { Sync.setCfg(JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))))); setTimeout(() => toast("Aparelho conectado à equipe"), 300); }
  catch { setTimeout(() => toast("Link de conexão inválido"), 300); }
  history.replaceState(null, "", location.pathname + location.search);
})();

Sync.start({
  estadoLocal: estadoSemRegistros,
  registrosLocais: () => db.vendedor.registros,
  onEstado: (remoto) => {
    const regs = db.vendedor.registros, bruto = JSON.stringify(remoto);
    db = migrar(remoto);
    db.vendedor.registros = regs;
    // Dados vindos de uma versão anterior do app: recalcula as contas pelas regras atuais e devolve à nuvem,
    // para todos os aparelhos e telas mostrarem as mesmas contas e datas
    resetCarga(); sincronizarContasAuto();
    if (JSON.stringify(estadoSemRegistros()) !== bruto) save(); else salvarLocal();
    renderSeguro();
  },
  onRegistros: (lista) => {
    db.vendedor.registros = lista.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    salvarLocal(); renderSeguro();
  },
});
// Sem nuvem, abas abertas no mesmo aparelho ainda se atualizam entre si
window.addEventListener("storage", (e) => {
  if (e.key === STORE_KEY && e.newValue && !Sync.ativo) { db = migrar(JSON.parse(e.newValue)); renderSeguro(); }
});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register((window.HAG_BASE || "") + "sw.js", { scope: "./" }).catch(() => {});

sincronizarContasAuto(); salvarLocal();
render();
