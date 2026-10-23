// Dados iniciais importados da planilha "HA GOURMET" (Google Sheets)
const SEED = {
  config: {
    empresa: "HA Gourmet",
    ano: 2026,
    precoPacoca: 10,
  },

  insumos: [
    ["Leite Condensado Campos do Jordão", 4.19, 1, "un"],
    ["Leite Condensado Italac", 6.19, 1, "un"],
    ["Achocolatado Toddy", 35.5, 1800, "g"],
    ["Creme de leite", 2.19, 1, "un"],
    ["Manteiga", 14.49, 1000, "g"],
    ["Cobertura Choc. Meio Amargo", 20.9, 1010, "g"],
    ["Gás", 10, 10, "uso"],
    ["Leite Ninho", 25.9, 350, "g"],
    ["Leite em pó", 13.9, 400, "g"],
    ["Creme de avelã", 33.9, 1010, "g"],
    ["Limão", 1.11, 1, "un"],
    ["Tang sabores", 1.09, 1, "un"],
    ["Pistache triturado", 296.98, 500, "g"],
    ["Essência pistache", 14.9, 30, "ml"],
    ["Geleia Maracujá", 15, 800, "g"],
    ["Canela", 45, 1000, "g"],
    ["Cobertura Choc. Verde", 35.9, 1000, "g"],
    ["Mix Castanhas", 59.9, 1000, "g"],
    ["Licor Pistache Creme D.T. 750ml", 37.98, 750, "ml"],
    ["Licor Doce de Leite Argentino 750ml", 43.55, 750, "ml"],
    ["Rum Bacardi Carta Oro 980ml", 48.9, 980, "ml"],
    ["Conhaque Dreher 900ml", 24.99, 900, "ml"],
    ["Whisky Red Label 1L", 82.9, 1000, "ml"],
    ["Licor Stock Cerejas 720ml", 47.95, 720, "ml"],
    ["Licor Marula 900ml", 44.19, 900, "ml"],
    ["Cobertura Choc. Branco", 35.9, 1010, "g"],
    ["Cereja em calda", 11.99, 130, "g"],
    ["Confeito de Chocolate Mini 500g", 14.89, 500, "g"],
    ["Cobertura Meio Amargo Gotas 2,05kg", 62.98, 2200, "g"],
    ["Café solúvel Pilão", 4.99, 40, "g"],
    ["Café em pó Manah", 50, 500, "g"],
    ["Café em grãos Manah", 50, 4000, "g"],
    ["Essência de coco", 3, 30, "ml"],
  ],

  materiais: [
    ["Embalagem 11x11x6 Kraft", 365, 200, "un"],
    ["Embalagem 8x8x4 Kraft", 104.16, 160, "un"],
    ["Embalagem 10x10x4 Acetato", 78.9, 100, "un"],
    ["Embalagem 8x8x5 Acetato", 69, 300, "un"],
    ["Adesivo 3x3cm", 58.9, 1000, "un"],
    ["Carimbo H&A", 53.14, 1, "un"],
    ["Tinta Carimbo", 53.14, 10000, "uso"],
    ["Papel seda", 38.77, 200, "un"],
    ["Fita cetim personalizada", 390, 50000, "cm"],
    ["Cartão Fidelidade", 148.96, 1000, "un"],
    ["Adesivo 1x1cm", 42.9, 1000, "un"],
    ["Lacre Segurança", 47.4, 2000, "un"],
    ["Saco papel 18x9 Kraft", 37, 100, "un"],
    ["Toalhinha interna nº7", 19.99, 1000, "un"],
    ["Saquinho 10x20 Transparente", 31.98, 200, "un"],
    ["Guardanapo de papel", 143.97, 2000, "un"],
    ["Caixa 100 Doces 35x35x6cm", 78.9, 25, "un"],
    ["Forminhas de papel brancas nº5", 25.9, 1000, "un"],
    ["Toalhinha interna nº9", 27.12, 1000, "un"],
    ["Forminhas de papel brancas nº6", 19.99, 1000, "un"],
  ],

  variaveis: [
    ["Mão-de-obra Cx9", 600, 1200, "doce"],
    ["Gasolina (semana)", 107.4, 1, "semana"],
    ["Comissão Cx/9", 12.5, 1, "caixa"],
    ["Comissão Cx/6", 10, 1, "caixa"],
    ["Comissão Cx/4", 10, 1, "caixa"],
    ["Comissão Vendedor", 80, 1, "semana"],
    ["Alimentação Vendedor", 30, 1, "semana"],
    ["Pró-labore", 200, 1, "semana"],
    ["Mão-de-obra Cx4", 600, 1200, "doce"],
    ["Mão-de-obra Barra Chocolate", 300, 100, "barra"],
    ["Mão-de-obra fita com elástico", 25, 100, "un"],
  ],

  // Kits: [material da tela Insumos > Embalagens & materiais, quantidade usada por kit]
  embalagens: [
    { nome: "Caixa Preta Kraft", uso: "Caixas", itens: [["Embalagem 11x11x6 Kraft", 1], ["Papel seda", 0.31], ["Fita cetim personalizada", 92]] },
    { nome: "Caixa Branca Kraft", uso: "Caixas", itens: [["Embalagem 8x8x4 Kraft", 1], ["Papel seda", 0.1], ["Fita cetim personalizada", 60], ["Tinta Carimbo", 2]] },
    { nome: "Acrílico G", uso: "Caixas", itens: [["Embalagem 10x10x4 Acetato", 1], ["Toalhinha interna nº7", 1], ["Adesivo 3x3cm", 1]] },
    { nome: "Acrílico P", uso: "Caixas", itens: [["Embalagem 8x8x5 Acetato", 1], ["Toalhinha interna nº7", 1], ["Adesivo 3x3cm", 1]] },
    { nome: "Saquinho Plástico", uso: "Barra de chocolate", itens: [["Saquinho 10x20 Transparente", 1], ["Fita cetim personalizada", 30]] },
    { nome: "Envio iFood", uso: "iFood", itens: [["Saco papel 18x9 Kraft", 1], ["Lacre Segurança", 1], ["Guardanapo de papel", 1], ["Tinta Carimbo", 2]] },
    { nome: "Cento de Doces", uso: "Encomendas", itens: [["Caixa 100 Doces 35x35x6cm", 1], ["Forminhas de papel brancas nº5", 100], ["Papel seda", 0.26]] },
  ],

  formatos: [
    { nome: "Coração 4 partes", peso: "210g" },
    { nome: "Coração 3 partes", peso: "350g" },
    { nome: "Flor", peso: "56g" },
    { nome: "Bolinha", peso: "20g" },
    { nome: "Copinho", peso: "20g" },
    { nome: "Recheio avulso", peso: "1g" },
  ],

  // Receitas: "lote" = ingredientes de uma receita (quantidade na unidade do insumo);
  // "porUn" = quantidade gasta por unidade em cada formato (mesma ordem de "formatos");
  // "rend" = unidades que um lote rende em cada formato.
  sabores: [
    { nome: "Brigadeiro", rend: [23, 8, 16, 64, 75, 900],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Achocolatado Toddy", 90], ["Creme de leite", 1], ["Manteiga", 50]],
      porUn: [["Cobertura Meio Amargo Gotas 2,05kg", [20, 30, 0, 0, 7, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    { nome: "Ninho com Nutella", rend: [23, 8, 16, 64, 75, 900],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Leite em pó", 70], ["Creme de leite", 1], ["Manteiga", 50]],
      porUn: [["Creme de avelã", [3.3, 3.3, 3.3, 1.5, 1.5, 0]], ["Cobertura Meio Amargo Gotas 2,05kg", [20, 0, 0, 0, 7, 0]], ["Cobertura Choc. Branco", [0, 30, 0, 0, 0, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    { nome: "Mousse de Limão", rend: [10, 3, 7, 20, 40, 395],
      lote: [["Leite Condensado Campos do Jordão", 1], ["Limão", 1]],
      porUn: [["Cobertura Meio Amargo Gotas 2,05kg", [20, 0, 0, 0, 7, 0]], ["Cobertura Choc. Branco", [0, 30, 0, 0, 0, 0]]] },
    { nome: "Mousse de Morango", rend: [15, 5, 10, 29, 48, 580],
      lote: [["Leite Condensado Campos do Jordão", 1], ["Tang sabores", 1], ["Creme de leite", 1]],
      porUn: [["Cobertura Meio Amargo Gotas 2,05kg", [20, 0, 0, 0, 7, 0]], ["Cobertura Choc. Branco", [0, 30, 0, 0, 0, 0]]] },
    { nome: "Brigadeiro de Pistache", rend: [32, 11, 23, 64, 106, 1270],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Pistache triturado", 70], ["Creme de leite", 2], ["Leite em pó", 50], ["Essência pistache", 1]],
      porUn: [["Cobertura Choc. Verde", [20, 30, 0, 0, 7, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    { nome: "Mousse de Maracujá", rend: [15, 5, 10, 29, 48, 580],
      lote: [["Leite Condensado Campos do Jordão", 1], ["Tang sabores", 1], ["Creme de leite", 1], ["Geleia Maracujá", 1]],
      porUn: [["Cobertura Choc. Branco", [20, 30, 0, 0, 0, 0]], ["Cobertura Meio Amargo Gotas 2,05kg", [0, 0, 0, 0, 7, 0]]] },
    { nome: "Churros", rend: [25, 8, 18, 71, 74, 990],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Canela", 10], ["Creme de leite", 1], ["Manteiga", 25]],
      porUn: [["Cobertura Choc. Branco", [20, 30, 0, 0, 0, 0]], ["Cobertura Meio Amargo Gotas 2,05kg", [0, 0, 0, 0, 7, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    // Café e Beijinho: a planilha só tem rendimento de copinho (83 un). Bolinha (71) estimada pela proporção do brigadeiro (64/75);
    // os demais formatos ficam em 0 até serem preenchidos
    { nome: "Café", rend: [0, 0, 0, 71, 83, 0],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Café em pó Manah", 10], ["Creme de leite", 1], ["Manteiga", 20], ["Café em grãos Manah", 1]],
      porUn: [["Cobertura Meio Amargo Gotas 2,05kg", [20, 30, 0, 0, 7, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    { nome: "Beijinho", rend: [0, 0, 0, 71, 83, 0],
      lote: [["Leite Condensado Campos do Jordão", 2], ["Essência de coco", 1], ["Creme de leite", 1], ["Manteiga", 20]],
      porUn: [["Cobertura Meio Amargo Gotas 2,05kg", [20, 30, 0, 0, 7, 0]], ["Gás", [0.01, 0.01, 0.01, 0.01, 0.01, 0.01]]] },
    // Ganache: recheio vendido/usado por grama (rende 350 g)
    { nome: "Ganache", rend: [0, 0, 0, 0, 0, 350],
      lote: [["Creme de leite", 1], ["Manteiga", 50], ["Cobertura Choc. Branco", 150]],
      porUn: [["Gás", [0, 0, 0, 0, 0, 0.01]]] },
  ],

  // Barras de 300g. Itens com 4 posições não estão na tabela de insumos: [nome, qtd, unidade, custo por unidade]
  // linha: "gourmet" ou "trufada" (define qual massa cada barra alimenta nos produtos)
  barrasTrufadas: ["Branco com Cereja", "Amargo Trufado Maracujá"],
  barras: [
    { nome: "Amargo com Castanha", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 180], ["Mix Castanhas", 30], ["Gás", 0.01]] },
    { nome: "Branco com Cereja", itens: [["Cobertura Choc. Branco", 200], ["Licor Stock Cerejas 720ml", 20], ["Cereja em calda", 30], ["Gás", 0.01]] },
    { nome: "Amargo com Licor", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 180], ["Licor / bebida", 50, "ml", 0.055], ["Gás", 0.01]] },
    { nome: "Amargo Trufado Maracujá", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 200], ["Mousse de maracujá", 90, "g", 0.0272], ["Geleia Maracujá", 10]] },
    { nome: "Duo (Amargo + Branco)", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 150], ["Cobertura Choc. Branco", 150], ["Gás", 0.01]] },
    { nome: "Amargo com Cereja", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 200], ["Licor Stock Cerejas 720ml", 20], ["Cereja em calda", 30]] },
    { nome: "Amargo com Confete", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 250], ["Confeito de Chocolate Mini 500g", 50], ["Gás", 0.01]] },
    { nome: "Amargo Sensação", itens: [["Cobertura Meio Amargo Gotas 2,05kg", 200], ["Mousse de morango", 100, "g", 0.0272], ["Gás", 0.01]] },
  ],

  // taxas: percentuais cobrados sobre o preço de venda em todos os produtos do canal
  canais: {
    Outbound: { alvoMin: 50, alvoMax: 70, descricao: "Venda direta (rua/porta a porta)", taxas: [] },
    iFood: { alvoMin: 15, alvoMax: 20, descricao: "Delivery pelo iFood", taxas: [{ nome: "Desconto iFood", pct: 23 }, { nome: "Taxa da maquininha / iFood", pct: 3.5 }] },
    Revenda: { alvoMin: 40, alvoMax: 100, descricao: "Venda para revendedores (com comissão)", taxas: [] },
  },

  // Custos padrão usados pelos produtos (alterar aqui muda todos os produtos que usam o item).
  // "fonte" liga o valor a outra tela: receita/barra (Fichas Técnicas) ou variavel (Insumos > Custos variáveis).
  params: [
    { key: "maoObraDoce", grupo: "Mão de obra", nome: "Mão de obra por doce", valor: 0.5, fonte: { tipo: "variavel", nome: "Mão-de-obra Cx4" } },
    { key: "maoObraBarra", grupo: "Mão de obra", nome: "Mão de obra por barra", valor: 3, fonte: { tipo: "variavel", nome: "Mão-de-obra Barra Chocolate" } },
    { key: "freteIfood", grupo: "Entrega e comissões", nome: "Frete por pedido iFood", valor: 7 },
    { key: "comCx4", grupo: "Entrega e comissões", nome: "Comissão revenda · caixa 4un", valor: 5 },
    { key: "comCx9", grupo: "Entrega e comissões", nome: "Comissão revenda · caixa 9un", valor: 6 },
    { key: "comBarra", grupo: "Entrega e comissões", nome: "Comissão revenda · barra gourmet", valor: 7 },
    { key: "comTrufada", grupo: "Entrega e comissões", nome: "Comissão revenda · barra trufada", valor: 9 },
    { key: "massaBol4", grupo: "Massa por unidade", nome: "Massa bolinha (caixa 4un)", valor: 0.39, fonte: { tipo: "caixa", key: "P" } },
    { key: "massaBol9", grupo: "Massa por unidade", nome: "Massa bolinha (caixa 9un)", valor: 0.2189, fonte: { tipo: "caixa", key: "G" } },
    { key: "massaCop4", grupo: "Massa por unidade", nome: "Massa copinho (caixa 4un e unidade)", valor: 0.4475, fonte: { tipo: "receita", formato: "Copinho", criterio: "max", ignorar: ["Brigadeiro de Pistache"] } },
    { key: "massaCop9", grupo: "Massa por unidade", nome: "Massa copinho (caixa 9un)", valor: 0.4467, fonte: { tipo: "receita", formato: "Copinho", criterio: "max", ignorar: ["Brigadeiro de Pistache"] } },
    { key: "massaBarra", grupo: "Massa por unidade", nome: "Massa barra gourmet 300g", valor: 9.83, fonte: { tipo: "barra", criterio: "max", linha: "gourmet" } },
    { key: "massaTrufada", grupo: "Massa por unidade", nome: "Massa barra trufada 300g", valor: 8.37, fonte: { tipo: "barra", criterio: "barra", barra: "Amargo Trufado Maracujá" } },
    { key: "embCopinhoUn", grupo: "Embalagens avulsas", nome: "Embalagem do copinho avulso", valor: 0.06 },
  ],

  // Cada item do custo vem de uma fonte: param (Personalizar custos, que pode puxar das Fichas/Insumos),
  // kit (tela Embalagens) ou material (tela Insumos > Embalagens & materiais).
  produtos: (() => {
    const par = (nome, key, qtd = 1) => ({ nome, qtd, param: key });
    const kit = (nome, qtd = 1) => ({ nome: "Embalagem " + nome, qtd, kit: nome });
    const mat = (nome) => ({ nome, qtd: 1, material: nome });
    const embP = kit("Acrílico P"), embG = kit("Acrílico G"), embBarra = kit("Saquinho Plástico"), envio = kit("Envio iFood");
    const cartao = mat("Cartão Fidelidade"), adesivo = mat("Adesivo 1x1cm");
    const mo = (q) => par("Mão de obra", "maoObraDoce", q), moBarra = par("Mão de obra barra", "maoObraBarra");
    const frete = par("Frete iFood", "freteIfood");
    const com = (key) => par("Comissão do revendedor", key);
    const massa = {
      bol4: par("Massa bolinha", "massaBol4", 4), cop4: par("Massa copinho", "massaCop4", 4),
      bol9: par("Massa bolinha", "massaBol9", 9), cop9: par("Massa copinho", "massaCop9", 9),
      barra: par("Massa barra gourmet", "massaBarra"), trufa: par("Massa barra trufada", "massaTrufada"),
    };
    const p = (canal, nome, preco, itens) => ({ canal, nome, preco, itens });
    return [
      p("Outbound", "Caixa Bolinha 4un", 20, [massa.bol4, embP, mo(4)]),
      p("Outbound", "Caixa Copinho 4un", 20, [massa.cop4, embP, mo(4)]),
      p("Outbound", "Caixa Bolinha 9un", 30, [massa.bol9, cartao, adesivo, embG, mo(9)]),
      p("Outbound", "Caixa Copinho 9un", 30, [massa.cop9, embG, mo(9)]),
      p("Outbound", "Barra Chocolate 300g", 45, [massa.barra, cartao, adesivo, embBarra, moBarra]),
      p("Outbound", "Barra Trufada 300g", 45, [massa.trufa, cartao, adesivo, embBarra, moBarra]),
      p("iFood", "Caixa Bolinha 4un", 20, [massa.bol4, embP, envio, mo(4), frete]),
      p("iFood", "Caixa Copinho 4un", 20, [massa.cop4, embP, envio, mo(4), frete]),
      p("iFood", "Caixa Bolinha 9un", 30, [massa.bol9, embG, envio, mo(9), frete]),
      p("iFood", "Caixa Copinho 9un", 30, [massa.cop9, embG, envio, mo(9), frete]),
      p("iFood", "Barra Chocolate 300g", 45, [massa.barra, cartao, adesivo, embBarra, envio, moBarra, frete]),
      p("iFood", "Barra Trufada 300g", 45, [massa.trufa, cartao, adesivo, embBarra, envio, moBarra, frete]),
      p("Revenda", "Caixa Bolinha 4un", 20, [massa.bol4, embP, mo(4), com("comCx4")]),
      p("Revenda", "Copinho unidade", 2, [par("Massa copinho", "massaCop4"), par("Embalagem", "embCopinhoUn"), mo(1)]),
      p("Revenda", "Caixa Bolinha 9un", 30, [massa.bol9, cartao, adesivo, embG, mo(9), com("comCx9")]),
      p("Revenda", "Caixa Copinho 9un", 14.1, [massa.cop9, embG, mo(9)]),
      p("Revenda", "Barra Chocolate 300g", 35, [massa.barra, cartao, adesivo, embBarra, moBarra, com("comBarra")]),
      p("Revenda", "Barra Trufada 300g", 45, [massa.trufa, cartao, adesivo, embBarra, moBarra, com("comTrufada")]),
    ].map((x) => ({ ...x, itens: x.itens.map((i) => JSON.parse(JSON.stringify(i))) }));
  })(),

  // Histórico semanal (aba HISTÓRICO FATURAMENTO). cxP/cxG = caixas pequenas (4 un) e grandes (9 un) vendidas,
  // tiradas dos comentários da coluna Nº VENDAS da planilha
  vendas: [
    { cxP: 22, cxG: 56, detalheCx: "Copo 4: 22 · Copo 9: 56", canal: "Outbound", inicio: "2026-07-01", fim: "2026-07-07", qtd: 78, cartao: 460, pix: 1195, especie: 565, insumos: 539.64, gasolina: 58.88, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 16, cxG: 38, detalheCx: "Bolinha 9: 2 · Copo 4: 16 · Copo 9: 36", canal: "Outbound", inicio: "2026-07-08", fim: "2026-07-14", qtd: 54, cartao: 414.73, pix: 415, especie: 490, insumos: 361.28, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 42, cxG: 31, detalheCx: "Bolinha 9: 13 · Copo 4: 42 · Copo 9: 18", canal: "Outbound", inicio: "2026-07-15", fim: "2026-07-21", qtd: 73, cartao: 60, pix: 1467, especie: 114, insumos: 393, gasolina: 0, comissoes: 0, perdas: 8.53, outros: 0 },
    { cxP: 14, cxG: 27, detalheCx: "Copo 4: 14 · Copo 9: 27", canal: "Outbound", inicio: "2026-07-22", fim: "2026-07-28", qtd: 41, cartao: 0, pix: 1095, especie: 0, insumos: 265.6, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 32, cxG: 52, detalheCx: "Copo 4: 32 · Copo 9: 52", canal: "Outbound", inicio: "2026-07-29", fim: "2026-08-04", qtd: 84, cartao: 0, pix: 2150, especie: 174, insumos: 528.59, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 15, cxG: 71, detalheCx: "Copo 4: 15 · Copo 9: 71", canal: "Outbound", inicio: "2026-08-05", fim: "2026-08-11", qtd: 86, cartao: 0, pix: 1915, especie: 681, insumos: 624.5, gasolina: 112.32, comissoes: 0, perdas: 11.47, outros: 0 },
    { cxP: 12, cxG: 67, detalheCx: "Copo 4: 12 · Copo 9: 67", canal: "Outbound", inicio: "2026-08-12", fim: "2026-08-18", qtd: 79, cartao: 0, pix: 1210, especie: 230, insumos: 736.93, gasolina: 0, comissoes: 0, perdas: 45.87, outros: 0 },
    { cxP: 8, cxG: 35, detalheCx: "Copo 4: 8 · Copo 9: 35", canal: "Outbound", inicio: "2026-08-19", fim: "2026-08-25", qtd: 43, cartao: 0, pix: 520, especie: 210, insumos: 392.68, gasolina: 0, comissoes: 0, perdas: 14.66, outros: 0 },
    { canal: "Outbound", inicio: "2026-08-26", fim: "2026-09-01", qtd: 43, cartao: 0, pix: 650, especie: 103.5, insumos: 392.68, gasolina: 0, comissoes: 0, perdas: 10.2, outros: 0 },
    { cxP: 3, cxG: 44, detalheCx: "Copo 4: 3 · Copo 9: 44", canal: "Outbound", inicio: "2026-09-02", fim: "2026-09-08", qtd: 47, cartao: 0, pix: 930, especie: 194, insumos: 404.96, gasolina: 112.32, comissoes: 0, perdas: 11.41, outros: 0 },
    { canal: "Outbound", inicio: "2026-09-09", fim: "2026-09-15", qtd: 0, cartao: 0, pix: 155, especie: 120, insumos: 0, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 25, cxG: 11, detalheCx: "Copo 4: 25 · Copo 9: 11", canal: "Outbound", inicio: "2026-09-16", fim: "2026-09-22", qtd: 0, cartao: 0, pix: 0, especie: 0, insumos: 0, gasolina: 112.32, comissoes: 0, perdas: 0, outros: 0 },
    { canal: "Outbound", inicio: "2026-09-23", fim: "2026-09-29", qtd: 0, cartao: 0, pix: 0, especie: 0, insumos: 0, gasolina: 107.4, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 25, cxG: 11, detalheCx: "Copo 4: 25 · Copo 9: 11", canal: "Outbound", inicio: "2026-09-30", fim: "2026-10-06", qtd: 0, cartao: 0, pix: 0, especie: 0, insumos: 208.68, gasolina: 50, comissoes: 0, perdas: 0, outros: 0 },
    { canal: "Outbound", inicio: "2026-10-07", fim: "2026-10-13", qtd: 0, cartao: 0, pix: 0, especie: 50, insumos: 0, gasolina: 107.4, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 0, cxG: 2, detalheCx: "Bolinha 9: 2", canal: "Encomenda", inicio: "2026-07-08", fim: "2026-07-14", qtd: 1, cartao: 0, pix: 30, especie: 0, insumos: 8.1, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { cxP: 0, cxG: 2, detalheCx: "Bolinha 9: 2", canal: "Encomenda", inicio: "2026-07-15", fim: "2026-07-21", qtd: 2, cartao: 0, pix: 60, especie: 0, insumos: 16.2, gasolina: 0, comissoes: 0, perdas: 0, outros: 0 },
    { canal: "Encomenda", inicio: "2026-09-09", fim: "2026-09-15", qtd: 200, cartao: 290, pix: 0, especie: 0, insumos: 170.13, gasolina: 38.86, comissoes: 0, perdas: 0, outros: 0 },
  ],

  // Outros custos por pacote vendido; paçoquita, saquinho e papel vêm dos insumos da paçoca (estoque.pacocaItens)
  pacocaCusto: [
    ["Mão de obra", 0.5],
  ],

  // Compra mensal da paçoca (aba PAÇOCA)
  pacocaCompra: [
    ["Paçoquita (caixa)", 111, 20.08],
    ["Saco plástico", 42, 1.83],
    ["Fita durex", 6, 3.64],
    ["Papel", 2080, 0.0322],
  ],

  // porDia = pacotes vendidos por dia; porPacote = paçoquitas em cada pacote
  // naoRecPct = % do valor entregue que não é pago (pix confiança); entra na margem da paçoca
  pacocaSim: { porDia: 80, porPacote: 6, dias: 26, naoRecPct: 20, gasolinaDia: 11.02, fixos: { "Comissão vendedor": 0, "Alimentação vendedor": 0, Marketing: 0 } },

  // Docinhos que vão em cada caixa (sabor: quantidade). Define o custo da massa e a produção na projeção de compra.
  caixas: {
    G: { formato: "Bolinha", itens: { "Brigadeiro": 1, "Ninho com Nutella": 1, "Mousse de Limão": 2, "Mousse de Morango": 1, "Mousse de Maracujá": 1, "Churros": 1, "Café": 1, "Beijinho": 1 } },
    P: { formato: "Bolinha", itens: { "Café": 1, "Mousse de Limão": 1, "Mousse de Morango": 1, "Churros": 1 } },
  },

  // Área do vendedor: tipos de item vendidos e combos com preço próprio.
  // "produto" liga o tipo a um produto do Outbound para calcular o custo.
  vendedor: {
    tipos: {
      doces: [
        { key: "P", nome: "Cx P", desc: "caixa 4 un", produto: "Caixa Bolinha 4un" },
        { key: "G", nome: "Cx G", desc: "caixa 9 un", produto: "Caixa Bolinha 9un" },
      ],
      pacoca: [{ key: "U", nome: "Pacote de paçoca", desc: "pacote c/ 6" }],
    },
    // Promoções; o preço normal de cada tipo vem de Produtos & Preços (doces) ou do preço da paçoca
    combos: {
      doces: [
        { nome: "1 Cx P", preco: 15, itens: { P: 1 } },
        { nome: "2 Cx P", preco: 30, itens: { P: 2 } },
        { nome: "1 Cx G", preco: 25, itens: { G: 1 } },
      ],
      pacoca: [],
    },
  },

  // Controle diário da paçoca (aba PAÇOCA)
  pacoca: [
    ["2026-08-18", 39, 280, 98.95, 69.66, 0, 0],
    ["2026-08-19", 40, 255, 100.45, 71.44, 0, 0],
    ["2026-08-20", 40, 250, 58, 71.44, 0, 0],
    ["2026-08-24", 40, 385, 69.95, 61.4, 11.02, 0],
    ["2026-08-27", 41, 601.66, 111.65, 62.93, 11.02, 0],
    ["2026-08-29", 41, 280, 96.8, 62.93, 11.02, 0],
    ["2026-08-31", 39, 270, 31.4, 59.86, 11.02, 0],
    ["2026-09-01", 60, 440, 52.15, 92.1, 11.02, 0],
    ["2026-09-02", 60, 440, 179.75, 92.1, 11.02, 0],
    ["2026-09-03", 47, 422, 218, 72.14, 11.02, 0],
    ["2026-09-16", 46, 318, 142, 83.57, 11, 0],
    ["2026-09-17", 60, 380, 74.05, 99.87, 11.02, 0],
    ["2026-09-18", 40, 310, 88.3, 46.58, 11.02, 40],
    ["2026-09-28", 80, 505, 170, 98.36, 11.02, 40],
    ["2026-09-29", 31, 125, 10, 38.11, 11.02, 15.5],
    ["2026-10-01", 100, 670, 126.3, 122.95, 11.02, 50],
    ["2026-10-06", 72, 425, 94.65, 88.52, 11.02, 36],
    ["2026-10-07", 104, 723.25, 193.25, 119.83, 11.02, 52],
    ["2026-10-08", 40, 215, 101.75, 46.09, 11.02, 20],
    ["2026-10-12", 160, 1039, 275.2, 184.36, 11.02, 80],
    ["2026-10-17", 120, 680, 212.1, 138.27, 11.02, 60],
    ["2026-10-18", 21, 170, 51.75, 24.2, 11.02, 10.5],
    ["2026-10-20", 53, 322, 52, 61.07, 11.02, 26.5],
  ],
};
