# Integrações do Clube HA Gourmet (Stripe + Supabase)

## Visão geral

O repositório continua sendo um site estático. Nada no app de gestão (`gestao/`, `vendedor/`, `app.js`, `sync.js`) mudou, exceto um atalho "Clube e assinaturas" na barra lateral da gestão.

| Parte | Onde | O que faz |
| --- | --- | --- |
| LP | `clube/index.html` | Planos, comparação, indicação, FAQ; preserva `?ref=` até o cadastro |
| Cadastro | `cadastro/index.html` | Supabase Auth (e-mail e senha) + nome, telefone, nascimento e código de indicação |
| Área do membro | `membros/` | Visão geral, carteira e resgate, indicação, caixas, eventos, dados pessoais, portal de cobrança |
| Administração | `clube/admin/` | Indicadores, membros, caixas e sabor do mês, resgates, indicações, aniversários, eventos, regiões de entrega, pendências |
| Banco | `supabase/migrations/` | Tabelas `clube_*`, RLS, funções com as regras financeiras e agendamentos |
| Servidor | `supabase/functions/` | Edge Functions (Deno): `clube-checkout`, `clube-portal`, `clube-stripe-webhook`, `clube-jobs`, `clube-admin` |

O navegador usa só a chave publicável. Leituras passam pela RLS (cada membro vê só o que é dele) e todas as escritas passam por funções SQL validadas ou por Edge Functions. Nenhuma tabela aceita `INSERT/UPDATE/DELETE` direto de `anon` ou `authenticated`.

## Fluxos principais

1. **Cadastro.** `auth.signUp` envia nome, telefone, nascimento e o código de indicação em `user_metadata`. O gatilho `clube_novo_usuario` (em `auth.users`) cria o perfil, gera o código do membro no servidor (8 caracteres aleatórios, sem dado pessoal) e grava a indicação **uma única vez**, validando o código no banco. Código inválido não bloqueia o cadastro; não existe caminho para trocar o indicador depois.
2. **Contratação.** O membro completa o endereço e clica em assinar. `clube-checkout` valida a sessão, aplica limite de tentativas e chama `clube_checkout_preparar`, que trava o perfil (`FOR UPDATE`), confere dados, região de entrega (plano com caixa), assinatura viva e sessão já aberta. Um índice único parcial garante no máximo uma contratação em andamento por usuário. O Customer é criado no servidor (chave de idempotência por usuário) e vinculado por ID. A sessão do Checkout usa idempotência pela linha da contratação e aceita só cartão.
3. **Retorno do Checkout.** `membros/?checkout=retorno` só mostra "pagamento em confirmação" e consulta a situação. A visita não concede nada.
4. **Webhook.** `clube-stripe-webhook` verifica a assinatura com o corpo bruto e registra o evento em `clube_stripe_eventos` (deduplicação por `evt_...`). Depois **relê o objeto atual no Stripe** e chama a rotina idempotente. O evento só fica "processado" na mesma transação que grava os efeitos. Em qualquer falha a resposta é 5xx: o Stripe reenvia e o job `reprocessar` tenta de novo com backoff.
5. **Fatura paga.** `avaliarFatura` (TypeScript) classifica a fatura: só uma mensalidade cheia, de preço permitido, paga por cartão dentro do próprio ciclo e com assinatura compatível é elegível. Proporcionais, ajustes, faturas zeradas, pagas fora do fluxo ou fora do período viram exceção para análise. `clube_processar_fatura` confere de novo plano, moeda e valor no banco e chama `clube_conceder_periodo`, que cria **um período por ciclo pago**. Unicidade por fatura, por (assinatura, início) e exclusão de períodos sobrepostos por usuário. O período gera uma caixa (R$ 49,90) **ou** um lote de 9000 centavos (R$ 97,00) e avalia a indicação só na primeira conversão.
6. **Cancelamento.** Pelo Customer Portal, ao fim do período pago. Sem nova fatura não há novo período; os benefícios do período pago seguem até `fim`.
7. **Reembolso e disputa.** Ficam registrados em `clube_ocorrencias_pagamento`, ligados à fatura original pela cobrança ou pelo PaymentIntent. Reembolso total e disputa perdida bloqueiam e estornam o saldo não usado; caixa ainda não programada vai para exceção; benefício já usado gera exceção para a loja. Reembolso parcial e disputa aberta bloqueiam o uso e abrem exceção; disputa ganha desbloqueia.

## Carteira

- `clube_credito_lotes`: um lote por origem (`periodo`, `indicacao`, `ajuste_admin`), com contadores disponível/reservado/usado/vencido/estornado. Restrições CHECK garantem que nunca ficam negativos e que somam o valor do lote.
- `clube_carteira_lancamentos`: extrato append-only (gatilho impede UPDATE/DELETE). Os testes conferem que os contadores batem com o extrato.
- Validade conferida **na consulta e no uso** (`expira_em > agora`), sem depender do cron; intervalos `[início, fim)`.
- Resgate assistido: `clube_solicitar_resgate` (idempotente por chave do cliente, bloqueio do perfil e dos lotes, ordem por vencimento) → `clube_admin_confirmar_resgate` (recalcula no servidor, consome uma vez, devolve a sobra, registra o restante como pagamento manual) ou cancelamento/expiração (devolve com a validade original; crédito vencido ou estornado não renasce).

## Stripe

- SDK `stripe@23.0.1`, API **`2026-09-30.endive`** (`supabase/functions/_shared/stripe.ts`). Campos usados desta versão: `invoice.parent.subscription_details.subscription`, `invoice.payments` (expand), `line.pricing.price_details.price`, `line.parent.subscription_item_details.proration`, `subscription.items.data[].current_period_*`, `checkout.sessions.create({ allowed_payment_method_types })`. O endpoint de webhook deve ser criado com a mesma versão (o script abaixo faz isso).
- `scripts/stripe-configurar.mjs` cria ou reaproveita: os preços `ha_assinatura` (4990, BRL, mensal) e `ha_club` (9700), o Portal (fatura, cartão, cancelamento `at_period_end`, **troca de plano desligada**) e o endpoint com os eventos:
  `checkout.session.completed|expired`, `invoice.paid|payment_failed`, `customer.subscription.created|updated|deleted|paused|resumed`, `charge.refunded`, `refund.created|updated|failed`, `charge.dispute.created|updated|closed|funds_withdrawn|funds_reinstated`.
- Sem trials, sem cupons (o Checkout não habilita códigos promocionais), sem Pix/boleto recorrente.

### Testes no modo de teste do Stripe (a executar quando houver chaves de teste)

| Cenário | Como |
| --- | --- |
| Assinatura aprovada | Cartão `4242 4242 4242 4242` |
| Pagamento recusado | `4000 0000 0000 0002` (recusa no Checkout) |
| Renovação falhando | `4000 0000 0000 0341` (salva o cartão e recusa as cobranças seguintes) + Test Clock |
| Renovação mensal e meses de 28/29/30/31 dias | Test Clocks (Billing > Test clocks) avançando o relógio do Customer, com âncora no dia 31 |
| Disputa | `4000 0000 0000 0259` |
| Reembolso total/parcial | Painel do Stripe > Pagamento > Reembolsar |
| Webhook repetido/fora de ordem | Painel > Webhooks > Reenviar evento; ou `stripe events resend` |

## Supabase

- Migrations: `20261027120000_clube_estrutura.sql` (tabelas, restrições, RLS), `20261027120100_clube_funcoes.sql` (regras), `20261027120200_clube_agendamentos.sql` (Cron).
- Funções SQL `SECURITY DEFINER` com `search_path = ''`. EXECUTE é revogado de todos e liberado explicitamente: `anon` só `clube_validar_codigo`; `authenticated` só as funções de membro e as `clube_admin_*` (que checam `clube_admins` por dentro); o restante só `service_role`.
- Papel de administrador: só a tabela `clube_admins`, nunca metadata. Para conceder (SQL Editor, como dono do projeto):
  `insert into public.clube_admins (user_id, observacao) select id, 'Aline' from auth.users where email = 'email@da-loja';`
- Cron (`pg_cron` + `pg_net`): `clube-manutencao` (a cada 10 min, direto no banco), `clube-stripe-reprocessar` (2×/hora) e `clube-stripe-reconciliar` (diário), chamando `clube-jobs` com segredo lido do Vault. Criar os segredos uma vez:
  `select vault.create_secret('https://<ref>.supabase.co/functions/v1/clube-jobs', 'clube_jobs_url');`
  `select vault.create_secret('<CLUBE_JOBS_SECRET>', 'clube_jobs_secret');`
  Execuções e erros ficam em `clube_execucoes_job`.
- Auth: confirmar e-mail ligado em produção; Site URL = domínio; Redirect URLs = `https://dominio/membros/` e `https://dominio/cadastro/`; SMTP próprio para não depender do limite do e-mail padrão; limites de taxa do Auth revisados em Authentication > Rate Limits.

### Ponto de atenção pré-existente (app de gestão)

A gestão sincroniza `hag_estado` e `hag_registros` usando só a chave publicável, que é pública em `config.js`. Não consegui ver as políticas dessas tabelas, porque o acesso pela integração foi negado. Se elas permitem leitura e escrita para `anon` (o que o app sugere), qualquer pessoa com a chave consegue ler ou alterar os dados de custos e vendas. As tabelas do Clube não dependem disso, mas recomendo revisar essas políticas antes de divulgar o site.

## Como testar localmente

| Comando | O que valida |
| --- | --- |
| `node scripts/testar-banco.mjs` | Postgres temporário + stub do Supabase: os 15 grupos de invariantes, incluindo concorrência real entre duas conexões |
| `npx deno@2 test --allow-env --no-lock supabase/functions/_shared/` | Classificação de faturas e fluxo do webhook (Stripe e banco simulados; assinatura do corpo bruto real) |
| `npx deno@2 check supabase/functions/*/index.ts` | Tipos contra `stripe@23.0.1` e `supabase-js@2.118.0` |
| `supabase start` + `node scripts/testar-api-local.mjs` | Ponta a ponta no Supabase local: Auth real, gatilho de cadastro, RLS via API, consultas das telas e papéis |
| `supabase db lint --local` | Análise das funções PL/pgSQL |

## O que ainda não foi validado nos provedores

- Nenhuma chamada real ao Stripe foi feita (sem chaves): Checkout, Portal, webhooks reais, Test Clocks e reembolsos/disputas precisam ser exercitados no modo de teste.
- As migrations e as Edge Functions **não** foram aplicadas no projeto Supabase real. O Cron/Vault só foi verificado no Supabase local.
- Envio de e-mails do Auth (SMTP) e deploy na Hostinger não foram executados.
