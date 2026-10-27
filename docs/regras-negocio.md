# Regras de negócio — Clube HA Gourmet

Este documento separa o que a cliente **confirmou**, o que foi adotado como **premissa de homologação** (para conseguir implementar e testar) e o que **ainda precisa ser decidido** antes do uso comercial. As premissas não são decisões comerciais confirmadas.

## 1. Regras confirmadas

Dois planos mensais independentes, em BRL. O membro tem um dos dois.

| Benefício | Assinatura HA Gourmet | HA Gourmet Club |
| --- | --- | --- |
| Mensalidade | R$ 49,90 | R$ 97,00 |
| Caixa mensal | 12 doces gourmet em caixa de presente, entregue no endereço cadastrado | Não incluída |
| Sabor exclusivo | 1 sabor novo e exclusivo por mês (dentro da caixa de 12; não é um 13º doce) | — |
| Crédito mensal em produtos | — | R$ 90,00, não acumulativo |
| Desconto em compras | 5% | 5% |
| Indicação | R$ 5,00 de cashback por amigo que assinar | R$ 5,00 de cashback por amigo que assinar |
| Aniversário | Surpresa no mês do aniversário | Presente no mês do aniversário |
| Evento presencial | — | 1 por mês (negócios, networking e conhecimento) |

- Cada membro tem um código exclusivo de indicação e um link para compartilhar; o novo usuário chega pelo link ou digita o código no cadastro.
- Dados do cadastro: nome, e-mail, telefone, data de nascimento completa e endereço.
- Não existem: entrega semanal, plano anual, período gratuito ou benefício compartilhado entre planos.

## 2. Premissas de homologação (política `homolog-2026-10`)

Valores numéricos ficam na tabela `clube_politicas`. Cada concessão grava a versão aplicada: períodos, lotes de crédito, indicações e resgates.

| # | Premissa | Onde está |
| --- | --- | --- |
| P1 | Uma assinatura vigente por usuário. Múltiplas assinaturas e presentes para vários destinatários ficam fora. | `clube_checkout_preparar`, índice `clube_checkout_uma_aberta`, exclusão `clube_periodos_sem_sobreposicao` |
| P2 | Recorrência mensal só com cartão via Stripe Checkout (sem Pix/boleto recorrente). | `clube-checkout` (`allowed_payment_method_types: card`) |
| P3 | R$ 90 é crédito interno para produtos: sem saque, transferência, estorno ao cartão ou abatimento da mensalidade. | Carteira (`clube_credito_lotes`); LP/FAQ |
| P4 | Validade dos R$ 90 = período pago da assinatura `[início, fim)` definido pelo ciclo de cobrança do Stripe (interpretação provisória de "dentro do mês"). | `clube_conceder_periodo` → lote `club_monthly` com `expira_em = fim do ciclo` |
| P5 | R$ 5 de indicação: uma única vez por indicado, na primeira conversão elegível (primeiro pagamento confirmado); nunca em renovações, nem após cancelar e recontratar. | `clube_avaliar_indicacao`, `unique (indicado_id)`, `unique (origem_tipo, origem_id)` |
| P6 | Cashback de indicação separado do crédito mensal; para testes, acumula e não vence. Não é prometido na LP. | Lote `referral` sem `expira_em` |
| P7 | O indicador precisa ter benefício vigente (ciclo pago) na data do pagamento do indicado; ambos os planos indicam. Se não tiver, a indicação fica "não elegível" (a loja pode aprovar com motivo). | `indicacao_exige_indicador_vigente` |
| P8 | Desconto de 5% sobre o subtotal de produtos elegíveis, antes dos créditos; não vale para mensalidade nem frete. Para testes, desconto + crédito mensal + cashback podem ser combinados. Exige ciclo pago vigente. | `clube_calcular_resgate` (arredondamento meio-para-cima em centavos) |
| P9 | Cancelamento pelo membro ao fim do período pago (portal do Stripe). Benefícios do período continuam até o vencimento; login e histórico são mantidos. | Configuração do portal (`at_period_end`) |
| P10 | Sem troca automática de plano: o membro fala com a loja. | Portal com `subscription_update` desligado |
| P11 | Consumo usa primeiro o crédito que vence antes (mensal antes do cashback). | `clube_solicitar_resgate` |
| P12 | Resgate assistido (não há loja online): o membro informa o valor dos produtos, o servidor reserva o crédito por **48 h** e a loja confirma uma única vez com o valor final; o que faltar é registrado como pagamento manual na loja. | `reserva_resgate_horas`, `clube_admin_confirmar_resgate` |
| P13 | A confirmação pela loja é aceita enquanto a reserva estiver válida, mesmo que o lote tenha vencido nesse meio-tempo (o uso começou dentro da validade). Reserva vencida devolve o crédito com a validade original. | `clube_admin_confirmar_resgate`, `clube_liberar_alocacoes` |
| P14 | Pagamento confirmado até 24 h antes do início do ciclo ou durante o ciclo libera o benefício; pago depois do fim do ciclo não libera automaticamente (vai para análise). | `tolerancia_pagamento_antes_periodo_seg`, `avaliarFatura` |
| P15 | Indicação com o mesmo telefone do indicador fica "em análise" (não é prova de fraude; a loja decide com motivo). | `clube_avaliar_indicacao` |
| P16 | A data de nascimento é informada uma vez pelo membro; correções depois só pela loja. Presente/surpresa: um registro por membro e ano. | `clube_salvar_perfil`, `unique (user_id, ano)` |
| P17 | A caixa só pode ser contratada por CEP em região cadastrada como atendida. Sem regiões cadastradas, a venda do plano com caixa fica fechada. | `clube_cobertura_entrega` |
| P18 | Reembolso total ou disputa perdida: o crédito não usado do ciclo é estornado, a caixa ainda não programada vai para exceção e a recompensa de indicação ligada àquele pagamento é revertida. Benefício já usado ou caixa já enviada vira exceção para a loja (sem cobrança automática). Reembolso parcial e disputa aberta só bloqueiam o uso e abrem exceção. | `clube_registrar_reembolso`, `clube_registrar_disputa` |
| P19 | Ajuste manual de crédito pela loja: até R$ 500 por lançamento, sempre com motivo e auditoria. | `ajuste_admin_max_centavos` |

## 3. Decisões pendentes antes do uso comercial

1. **Validade do crédito de R$ 90:** ciclo da assinatura (implementado) ou mês civil? Se for mês civil, definir também como fica quem assina no fim do mês e se há proporcionalidade.
2. **Indicação:** R$ 5 só uma vez por indicado ou a cada mensalidade paga? O cashback vence? Acumula sem limite? O indicador precisa estar com a mensalidade em dia?
3. **Combinação de benefícios:** desconto de 5% + crédito mensal + cashback na mesma compra? Há valor mínimo de compra? Quais produtos são elegíveis?
4. **Entrega da caixa:** regiões atendidas, valor do frete (incluso ou cobrado), data de corte, calendário de entrega, retirada na loja, tratamento de ausência na entrega.
5. **Resgate:** como o membro usa o crédito na prática (balcão, WhatsApp, encomenda)? Prazo de reserva (48 h?), quem confirma, o que acontece se a compra acontecer depois do vencimento do crédito.
6. **Cancelamento e reembolso:** existe reembolso proporcional? O que fazer com benefício já usado quando há reembolso ou disputa? Arrependimento em 7 dias (CDC) e comunicação ao membro.
7. **Aniversário:** o que é a surpresa/presente de cada plano, como é entregue ou retirado e se exige mensalidade em dia no mês.
8. **Eventos do Club:** capacidade, acompanhantes, local, política de falta.
9. **Troca de plano:** se e quando liberar, e como tratar a diferença de valores e benefícios do mês.
10. **Textos legais:** termos de uso, política de privacidade (LGPD) e regulamento do programa de indicação.
