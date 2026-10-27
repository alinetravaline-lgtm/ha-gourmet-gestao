-- Testes dos invariantes financeiros e de autorização do Clube (Postgres local + stub do Supabase).
-- Executar com scripts/testar-banco.mjs. Qualquer falha interrompe (ON_ERROR_STOP) e aponta o bloco.
\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = warning;

create extension if not exists dblink;
create schema t;
grant usage on schema t to anon, authenticated, service_role;
create table t.ids (nome text primary key, id uuid not null);
grant select on t.ids to anon, authenticated;

create function t.id(p text) returns uuid language sql stable as $$ select id from t.ids where nome = p $$;
create function t.entrar(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', t.id(p), 'role', 'authenticated')::text, false) $$;
create function t.erro(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return null; exception when others then return sqlerrm; end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

create function t.usuario(p_nome text, p_meta jsonb) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (email, raw_user_meta_data) values (lower(p_nome) || '@teste.invalid', p_meta) returning id into v;
  insert into t.ids values (p_nome, v);
  return v;
end $$;

create function t.endereco(p_nome text, p_cep text) returns void language sql as $$
  insert into public.clube_enderecos (user_id, cep, logradouro, numero, bairro, cidade, uf)
  values (t.id(p_nome), p_cep, 'Rua de Teste', '100', 'Centro', 'Cidade Teste', 'SP')
  on conflict (user_id) do update set cep = excluded.cep, logradouro = 'Rua Nova', numero = '200' $$;

create function t.sub(p_nome text, p_plano text, p_status text, p_ini timestamptz, p_fim timestamptz,
  p_cancel boolean default false, p_sub text default null) returns jsonb language sql as $$
  select jsonb_build_object('stripe_subscription_id', coalesce(p_sub, 'sub_' || p_nome), 'stripe_customer_id', 'cus_' || p_nome,
    'plano_chave', p_plano, 'stripe_price_id', 'price_' || p_plano, 'status', p_status, 'cancelar_no_fim', p_cancel,
    'periodo_atual_inicio', p_ini, 'periodo_atual_fim', p_fim, 'livemode', false, 'criada_em', now(),
    'obtido_em', clock_timestamp()) $$;

create function t.fat(p_nome text, p_inv text, p_plano text, p_ini timestamptz, p_fim timestamptz,
  p_class text default 'mensalidade', p_eleg boolean default true, p_status text default 'paid',
  p_sub text default null) returns jsonb language sql as $$
  select jsonb_build_object('stripe_invoice_id', p_inv, 'stripe_customer_id', 'cus_' || p_nome,
    'stripe_subscription_id', coalesce(p_sub, 'sub_' || p_nome), 'plano_chave', p_plano, 'stripe_price_id', 'price_' || p_plano,
    'billing_reason', 'subscription_cycle', 'moeda', 'brl', 'total_centavos', pl.valor_centavos,
    'valor_pago_centavos', case when p_status = 'paid' then pl.valor_centavos else 0 end, 'status', p_status,
    'periodo_inicio', p_ini, 'periodo_fim', p_fim, 'pago_em', case when p_status = 'paid' then p_ini + interval '1 minute' end,
    'stripe_payment_intent_id', 'pi_' || p_inv, 'stripe_charge_id', 'ch_' || p_inv, 'classificacao', p_class,
    'elegivel', p_eleg, 'motivo', null, 'livemode', false)
  from public.clube_planos pl where pl.chave = p_plano $$;

-- Cliente Stripe + assinatura ativa + fatura paga do ciclo [p_ini, p_fim)
create function t.assinar(p_nome text, p_plano text, p_inv text, p_ini timestamptz, p_fim timestamptz) returns jsonb
language plpgsql as $$
begin
  perform public.clube_checkout_cliente(t.id(p_nome), 'cus_' || p_nome, false);
  perform public.clube_sincronizar_assinatura(t.sub(p_nome, p_plano, 'active', p_ini, p_fim), null);
  return public.clube_processar_fatura(t.fat(p_nome, p_inv, p_plano, p_ini, p_fim), null);
end $$;

create function t.lotes(p_nome text, p_tipo text) returns integer language sql as $$
  select count(*)::integer from public.clube_credito_lotes where user_id = t.id(p_nome) and tipo = p_tipo $$;
create function t.saldo(p_nome text) returns integer language sql as $$
  select public.clube_saldo_disponivel(t.id(p_nome), now()) $$;
create function t.caixas(p_nome text) returns integer language sql as $$
  select count(*)::integer from public.clube_caixas where user_id = t.id(p_nome) $$;
create function t.consistente() returns boolean language sql as $$
  -- Contadores do lote batem com o extrato append-only.
  select not exists (
    select 1 from public.clube_credito_lotes l
    left join lateral (select
        coalesce(sum(valor_centavos) filter (where tipo = 'concessao'), 0) as conc,
        coalesce(sum(valor_centavos) filter (where tipo = 'reserva'), 0) as res,
        coalesce(sum(valor_centavos) filter (where tipo = 'liberacao'), 0) as lib,
        coalesce(sum(valor_centavos) filter (where tipo = 'consumo'), 0) as con,
        coalesce(sum(valor_centavos) filter (where tipo = 'expiracao'), 0) as exp,
        coalesce(sum(valor_centavos) filter (where tipo = 'reversao'), 0) as rev
      from public.clube_carteira_lancamentos c where c.lote_id = l.id) x on true
    where x.conc <> l.valor_centavos or x.res - x.lib - x.con <> l.reservado_centavos or x.con <> l.usado_centavos
       or x.exp <> l.expirado_centavos or x.rev <> l.revertido_centavos) $$;

\echo '1) Cadastro com/sem indicação, código inválido e autoindicação'
do $$
declare v_cod text; v jsonb;
begin
  perform t.usuario('ana', '{"nome":"Ana Teste","telefone":"(11) 90000-0001","nascimento":"1990-03-15"}');
  select codigo_indicacao into v_cod from public.clube_perfis where user_id = t.id('ana');
  assert v_cod ~ '^[A-HJ-NP-Z2-9]{8}$', 'código com formato inesperado';
  perform t.usuario('bia', jsonb_build_object('nome', 'Bia Teste', 'telefone', '11900000002', 'nascimento', '1992-11-20',
    'ref', lower(v_cod), 'ref_origem', 'link'));
  perform t.usuario('caio', '{"nome":"Caio Teste","telefone":"11900000003","nascimento":"1985-07-01"}');
  perform t.usuario('duda', '{"nome":"Duda Teste","telefone":"11900000004","nascimento":"2000-01-31","ref":"ZZZZZZZZ"}');
  perform t.usuario('adm', '{"nome":"Admin Loja"}');
  insert into public.clube_admins (user_id) values (t.id('adm'));

  assert (select count(*) from public.clube_perfis) = 5, 'todo usuário novo ganha perfil';
  assert (select indicador_id from public.clube_indicacoes where indicado_id = t.id('bia')) = t.id('ana'), 'indicação pelo link';
  assert (select origem from public.clube_indicacoes where indicado_id = t.id('bia')) = 'link';
  assert not exists (select 1 from public.clube_indicacoes where indicado_id in (t.id('caio'), t.id('duda'))), 'sem código ou código inválido não atribui';
  assert (select nascimento from public.clube_perfis where user_id = t.id('duda')) = date '2000-01-31';
  assert t.erro(format($q$insert into public.clube_indicacoes (indicado_id, indicador_id, codigo, origem)
    values (%L, %L, 'X', 'manual')$q$, t.id('caio'), t.id('caio'))) like '%check constraint%', 'autoindicação barrada no banco';
  -- a atribuição não pode ser trocada depois
  assert t.erro(format($q$insert into public.clube_indicacoes (indicado_id, indicador_id, codigo, origem)
    values (%L, %L, 'X', 'manual')$q$, t.id('bia'), t.id('caio'))) like '%duplicate key%', 'indicador fixo após o cadastro';
end $$;

do $$
declare v_cod text := (select codigo_indicacao from public.clube_perfis where user_id = t.id('ana'));
begin
  set local role anon;
  assert (public.clube_validar_codigo('ZZZZ2222') ->> 'valido')::boolean = false, 'código inexistente recusado';
  assert (public.clube_validar_codigo(v_cod) ->> 'valido')::boolean, 'código válido reconhecido';
  reset role;
  perform t.entrar('ana');
  set local role authenticated;
  assert public.clube_validar_codigo(v_cod) ->> 'motivo' = 'proprio', 'autoindicação detectada para usuário logado';
end $$;
reset role;

\echo '13) Duplo clique na contratação: trava lógica e sessão reaproveitada'
do $$
declare r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb;
begin
  r1 := public.clube_checkout_preparar(t.id('caio'), 'ha_club');
  assert r1 ->> 'erro' = 'perfil_incompleto', 'checkout exige endereço';
  perform t.endereco('caio', '01310100');
  r1 := public.clube_checkout_preparar(t.id('caio'), 'ha_assinatura');
  assert r1 ->> 'erro' = 'regiao_nao_atendida', 'caixa só para região com cobertura definida';
  insert into public.clube_cobertura_entrega (cep_prefixo, descricao) values ('013', 'Teste: Bela Vista');
  r1 := public.clube_checkout_preparar(t.id('caio'), 'ha_assinatura');
  assert r1 ->> 'acao' = 'criar', r1::text;
  r2 := public.clube_checkout_preparar(t.id('caio'), 'ha_assinatura');
  assert r2 ->> 'erro' = 'em_andamento', 'segundo clique concorrente barrado';
  assert t.erro(format($q$insert into public.clube_checkout_sessoes (user_id, plano_chave) values (%L, 'ha_club')$q$,
    t.id('caio'))) like '%duplicate key%', 'índice único impede duas sessões abertas';
  perform public.clube_checkout_aberta((r1 ->> 'sessao_id')::uuid, 'cs_test_caio1', 'https://checkout.stripe.com/c/pay/cs_test_caio1', now() + interval '1 hour');
  r3 := public.clube_checkout_preparar(t.id('caio'), 'ha_assinatura');
  assert r3 ->> 'acao' = 'reutilizar' and r3 ->> 'stripe_session_id' = 'cs_test_caio1', 'reutiliza a sessão aberta';
  r4 := public.clube_checkout_preparar(t.id('caio'), 'ha_club');
  assert r4 ->> 'acao' = 'substituir', 'outro plano pede para expirar a sessão anterior';
  perform public.clube_checkout_encerrar(null, 'cs_test_caio1', 'expirada', null);
  perform public.clube_checkout_cliente(t.id('caio'), 'cus_caio', false);
  assert public.clube_checkout_cliente(t.id('caio'), 'cus_outro', false) = 'cus_caio', 'Customer reutilizado';
end $$;

\echo '2/3) Primeiro pagamento: Club concede R$ 90 sem caixa; Assinatura cria 1 caixa sem R$ 90; indicação paga R$ 5'
do $$
declare ini timestamptz := date_trunc('day', now()) - interval '10 days'; fim timestamptz := date_trunc('day', now()) + interval '20 days';
begin
  perform t.endereco('ana', '01310100');
  perform t.endereco('bia', '01310200');
  perform t.assinar('ana', 'ha_club', 'in_ana1', ini, fim);
  assert t.lotes('ana', 'club_monthly') = 1 and t.saldo('ana') = 9000, 'Club: exatamente R$ 90';
  assert t.caixas('ana') = 0, 'Club não cria caixa';

  perform t.assinar('bia', 'ha_assinatura', 'in_bia1', ini + interval '2 days', fim + interval '2 days');
  assert t.caixas('bia') = 1, 'Assinatura: exatamente uma caixa';
  assert t.lotes('bia', 'club_monthly') = 0, 'Assinatura não concede R$ 90';
  assert (select endereco ->> 'cep' from public.clube_caixas where user_id = t.id('bia')) = '01310200', 'snapshot do endereço';
  assert t.lotes('ana', 'referral') = 1 and t.saldo('ana') = 9500, 'indicadora recebe R$ 5 uma vez';
  assert (select status from public.clube_indicacoes where indicado_id = t.id('bia')) = 'recompensada';
  assert t.consistente();
end $$;

\echo '4/5) Renovação, reprocessamento, eventos equivalentes, fora de ordem e falha antes do commit'
do $$
declare
  ini timestamptz := date_trunc('day', now()) + interval '22 days'; fim timestamptz := date_trunc('day', now()) + interval '52 days';
  p jsonb := t.fat('bia', 'in_bia2', 'ha_assinatura', ini, fim);
begin
  perform public.clube_evento_receber('evt_bia2_a', 'invoice.paid', 'in_bia2', false, now());
  perform public.clube_processar_fatura(p, 'evt_bia2_a');
  assert (select status from public.clube_stripe_eventos where id = 'evt_bia2_a') = 'processado';
  assert public.clube_evento_receber('evt_bia2_a', 'invoice.paid', 'in_bia2', false, now()) = 'processado', 'evento repetido é reconhecido';
  perform public.clube_processar_fatura(p, 'evt_bia2_a');                 -- reentrega do mesmo evento
  perform public.clube_evento_receber('evt_bia2_b', 'invoice.payment_succeeded', 'in_bia2', false, now());
  perform public.clube_processar_fatura(p, 'evt_bia2_b');                 -- outro evento sobre o mesmo pagamento
  perform public.clube_processar_fatura(p || '{"classificacao":"mensalidade"}', null);  -- reconciliação
  assert t.caixas('bia') = 2, 'renovação: uma caixa nova e só uma';
  assert t.lotes('ana', 'referral') = 1, 'indicação não se repete na renovação';
end $$;

do $$
declare ini timestamptz := date_trunc('day', now()) - interval '10 days'; fim timestamptz := date_trunc('day', now()) + interval '20 days';
begin
  perform t.usuario('gil', '{"nome":"Gil Teste","telefone":"11900000007","nascimento":"1980-05-05"}');
  perform t.endereco('gil', '01310300');
  perform public.clube_checkout_cliente(t.id('gil'), 'cus_gil', false);
  -- invoice.paid chegando antes da assinatura: falha inteira e é refeito depois
  assert t.erro(format('select public.clube_processar_fatura(%L::jsonb, null)', t.fat('gil', 'in_gil1', 'ha_club', ini, fim)))
    = 'assinatura_nao_sincronizada', 'fora de ordem pede nova tentativa';
  assert not exists (select 1 from public.clube_faturas where stripe_invoice_id = 'in_gil1'), 'nada gravado parcialmente';
  perform public.clube_sincronizar_assinatura(t.sub('gil', 'ha_club', 'active', ini, fim), null);
  -- sincronização antiga não sobrescreve uma mais nova
  perform public.clube_sincronizar_assinatura(t.sub('gil', 'ha_club', 'past_due', ini, fim) || jsonb_build_object('obtido_em', now() - interval '1 hour'), null);
  assert (select status from public.clube_assinaturas where stripe_subscription_id = 'sub_gil') = 'active', 'leitura velha descartada';
end $$;

-- Falha antes do commit: a transação é desfeita e o reprocessamento posterior concede normalmente.
begin;
do $$ begin
  perform public.clube_processar_fatura(t.fat('gil', 'in_gil1', 'ha_club', date_trunc('day', now()) - interval '10 days', date_trunc('day', now()) + interval '20 days'), null);
  assert t.lotes('gil', 'club_monthly') = 1;
end $$;
rollback;
do $$
begin
  assert t.lotes('gil', 'club_monthly') = 0, 'rollback não deixa crédito';
  perform public.clube_processar_fatura(t.fat('gil', 'in_gil1', 'ha_club', date_trunc('day', now()) - interval '10 days', date_trunc('day', now()) + interval '20 days'), null);
  perform public.clube_processar_fatura(t.fat('gil', 'in_gil1', 'ha_club', date_trunc('day', now()) - interval '10 days', date_trunc('day', now()) + interval '20 days'), null);
  assert t.lotes('gil', 'club_monthly') = 1 and t.saldo('gil') = 9000, 'concessão única após reprocessar';
  assert t.consistente();
end $$;

\echo '6/7) Pagamento recusado, fatura fora do período e cancelamento ao fim do período'
do $$
declare ini timestamptz := date_trunc('day', now()) + interval '20 days'; fim timestamptz := date_trunc('day', now()) + interval '50 days';
begin
  perform public.clube_processar_fatura(t.fat('gil', 'in_gil_falha', 'ha_club', ini, fim, 'pendente', false, 'open'), null);
  assert t.lotes('gil', 'club_monthly') = 1, 'cobrança falhada não gera crédito';
  perform public.clube_processar_fatura(t.fat('gil', 'in_gil_atrasada', 'ha_club', ini, fim, 'fora_do_periodo', false), null);
  assert t.lotes('gil', 'club_monthly') = 1, 'fatura fora do período não concede';
  assert exists (select 1 from public.clube_excecoes where tipo = 'fatura_sem_beneficio' and referencia = 'in_gil_atrasada'), 'exceção registrada';
  -- cancelamento ao fim do período: benefício pago continua até o vencimento
  perform public.clube_sincronizar_assinatura(t.sub('gil', 'ha_club', 'active', now() - interval '10 days', now() + interval '20 days', true), null);
  assert (select cancelar_no_fim from public.clube_assinaturas where stripe_subscription_id = 'sub_gil');
  assert t.saldo('gil') = 9000, 'crédito do período pago preservado';
  assert (public.clube_beneficio_vigente(t.id('gil'), now() + interval '25 days')).id is null, 'sem benefício após o vencimento';
end $$;

\echo '8/15) Validade: crédito vencido inutilizável sem cron, lote novo não soma sobra, limites [início, fim)'
do $$
declare
  ini_old timestamptz := date_trunc('day', now()) - interval '70 days'; fim_old timestamptz := date_trunc('day', now()) - interval '40 days';
  ini timestamptz := date_trunc('day', now()) - interval '5 days'; fim timestamptz := date_trunc('day', now()) + interval '25 days';
  v_lote uuid;
begin
  perform t.usuario('eli', '{"nome":"Eli Teste","telefone":"11900000005","nascimento":"1975-12-25"}');
  perform t.endereco('eli', '01310400');
  perform t.assinar('eli', 'ha_club', 'in_eli_old', ini_old, fim_old);
  assert t.lotes('eli', 'club_monthly') = 1 and t.saldo('eli') = 0, 'lote vencido não conta, mesmo sem job';
  perform t.entrar('eli');
  set local role authenticated;
  assert t.erro($q$select public.clube_solicitar_resgate(5000, 'Teste vencido', gen_random_uuid())$q$) = 'sem_beneficio';
  reset role;
  perform public.clube_processar_fatura(t.fat('eli', 'in_eli_new', 'ha_club', ini, fim), null);
  assert t.saldo('eli') = 9000, 'lote novo não incorpora sobra do anterior';
  select id into v_lote from public.clube_credito_lotes where fatura_id = (select id from public.clube_faturas where stripe_invoice_id = 'in_eli_new');
  assert public.clube_saldo_disponivel(t.id('eli'), fim - interval '1 microsecond') = 9000, 'válido até o último instante';
  assert public.clube_saldo_disponivel(t.id('eli'), fim) = 0, 'fim é exclusivo';
  assert public.clube_saldo_disponivel(t.id('eli'), ini) = 9000, 'início é inclusivo';
  perform public.clube_job_manutencao();
  assert (select expirado_centavos from public.clube_credito_lotes where fatura_id =
    (select id from public.clube_faturas where stripe_invoice_id = 'in_eli_old')) = 9000, 'job registra a expiração no extrato';
  assert t.consistente();
end $$;

do $$
declare u uuid;
begin
  -- Meses de 28/29/30/31 dias: ciclos adjacentes do Stripe (âncora no dia 31) não se sobrepõem.
  u := t.usuario('hel', '{"nome":"Hel Teste","telefone":"11900000008","nascimento":"1999-02-28"}');
  perform t.endereco('hel', '01310500');
  perform t.assinar('hel', 'ha_club', 'in_hel_jan', '2028-01-31T03:00:00Z', '2028-02-29T03:00:00Z');
  perform public.clube_processar_fatura(t.fat('hel', 'in_hel_fev', 'ha_club', '2028-02-29T03:00:00Z', '2028-03-31T03:00:00Z'), null);
  perform public.clube_processar_fatura(t.fat('hel', 'in_hel_mar', 'ha_club', '2028-03-31T03:00:00Z', '2028-04-30T03:00:00Z'), null);
  assert (select count(*) from public.clube_periodos where user_id = u) = 3, 'três ciclos adjacentes';
  assert public.clube_saldo_disponivel(u, '2028-02-29T02:59:59Z') = 9000 and public.clube_saldo_disponivel(u, '2028-02-29T03:00:00Z') = 9000,
    'troca de lote exatamente no limite do ciclo';
  -- Ciclo sobreposto (ex.: troca de âncora) não concede em dobro
  perform public.clube_processar_fatura(t.fat('hel', 'in_hel_abr', 'ha_club', '2028-04-30T03:00:00Z', '2028-05-31T03:00:00Z'), null);
  perform public.clube_processar_fatura(t.fat('hel', 'in_hel_dup', 'ha_club', '2028-05-15T03:00:00Z', '2028-06-15T03:00:00Z'), null);
  assert (select count(*) from public.clube_periodos where user_id = u) = 4, 'ciclo sobreposto barrado';
  assert exists (select 1 from public.clube_excecoes where tipo = 'periodo_sobreposto' and referencia = 'in_hel_dup');
  -- Competência da caixa no fuso de São Paulo: 01/11 02:00 UTC ainda é 31/10 em SP
  perform t.usuario('ivo', '{"nome":"Ivo Teste","telefone":"11900000009","nascimento":"1991-10-10"}');
  perform t.endereco('ivo', '01310600');
  perform t.assinar('ivo', 'ha_assinatura', 'in_ivo1', '2026-11-01T02:00:00Z', '2026-12-01T02:00:00Z');
  assert (select competencia from public.clube_caixas where user_id = t.id('ivo')) = '2026-10', 'competência em America/Sao_Paulo';
end $$;

\echo '9/10) Resgate: exemplo R$ 100 -> R$ 95 -> R$ 90 -> R$ 5, confirmar/repetir/cancelar/expirar'
do $$
declare r jsonb; v_id uuid; c jsonb;
begin
  perform t.entrar('gil');
  set local role authenticated;
  c := public.clube_simular_resgate(10000);
  assert (c ->> 'desconto_centavos')::int = 500 and (c ->> 'credito_centavos')::int = 9000 and (c ->> 'a_pagar_centavos')::int = 500, c::text;
  r := public.clube_solicitar_resgate(10000, 'Caixa de brigadeiros', '00000000-0000-0000-0000-00000000a001');
  v_id := (r ->> 'id')::uuid;
  assert (r ->> 'credito_reservado_centavos')::int = 9000;
  assert (public.clube_solicitar_resgate(10000, 'Caixa de brigadeiros', '00000000-0000-0000-0000-00000000a001') ->> 'id')::uuid = v_id,
    'mesma chave não cria segunda reserva';
  assert (public.clube_minha_situacao() -> 'saldos' -> 'club_monthly' ->> 'disponivel')::int = 0, 'reservado não aparece como disponível';
  assert (public.clube_minha_situacao() -> 'saldos' -> 'club_monthly' ->> 'reservado')::int = 9000;
  assert t.erro(format('select public.clube_admin_confirmar_resgate(%L, 10000, %L, null, null)', v_id, 'pix')) = 'acesso_negado',
    'membro não confirma o próprio resgate';
  reset role;
  perform t.entrar('adm');
  set local role authenticated;
  assert t.erro(format('select public.clube_admin_confirmar_resgate(%L, 10000, %L, null, null)', v_id, 'nenhum'))
    = 'pagamento_complementar_obrigatorio';
  r := public.clube_admin_confirmar_resgate(v_id, 10000, 'pix', 'PIX-TESTE-1', 'Compra no balcão');
  assert (r -> 'resgate' ->> 'credito_usado_centavos')::int = 9000 and (r -> 'resgate' ->> 'a_pagar_centavos')::int = 500, r::text;
  r := public.clube_admin_confirmar_resgate(v_id, 10000, 'pix', 'PIX-TESTE-1', 'Clique repetido');
  assert (r ->> 'repetido')::boolean, 'confirmação repetida é idempotente';
  reset role;
  assert (select usado_centavos from public.clube_credito_lotes where user_id = t.id('gil')) = 9000;
  assert (select count(*) from public.clube_carteira_lancamentos where resgate_id = v_id and tipo = 'consumo') = 1;
  assert t.consistente();
end $$;

do $$
declare r jsonb; v_id uuid;
begin
  -- Reserva expirada: devolvida pelo job e não pode mais ser confirmada
  perform t.entrar('ana');
  set local role authenticated;
  r := public.clube_solicitar_resgate(3000, 'Bolo', gen_random_uuid());
  v_id := (r ->> 'id')::uuid;
  assert (r ->> 'credito_reservado_centavos')::int = 2850, 'desconto antes do crédito: 3000 - 150';
  assert (select tipo from public.clube_credito_lotes l join public.clube_resgate_alocacoes a on a.lote_id = l.id
          where a.resgate_id = v_id order by a.ordem limit 1) = 'club_monthly', 'usa primeiro o crédito que vence';
  reset role;
  update public.clube_resgates set reserva_expira_em = now() - interval '1 minute' where id = v_id;
  perform t.entrar('adm');
  set local role authenticated;
  r := public.clube_admin_confirmar_resgate(v_id, 3000, 'nenhum', null, null);
  assert r ->> 'erro' = 'reserva_expirada', 'confirmação tardia recusada';
  reset role;
  assert (select status from public.clube_resgates where id = v_id) = 'expirado';
  assert t.saldo('ana') = 9500, 'reserva devolvida ao saldo';
  -- cancelar pelo membro e repetir o cancelamento
  perform t.entrar('ana');
  set local role authenticated;
  r := public.clube_solicitar_resgate(2000, 'Docinhos', gen_random_uuid());
  perform public.clube_cancelar_resgate((r ->> 'id')::uuid);
  perform public.clube_cancelar_resgate((r ->> 'id')::uuid);
  reset role;
  assert t.saldo('ana') = 9500 and t.consistente();
end $$;

-- Dois resgates concorrentes (duas conexões): o segundo espera o bloqueio e não ultrapassa o saldo.
do $$
declare
  con text := format('dbname=%s port=%s user=%s host=localhost', current_database(), current_setting('port'), current_user);
  r2 text; v_total int; c text;
begin
  perform dblink_connect('c1', con);
  perform dblink_connect('c2', con);
  foreach c in array array['c1', 'c2'] loop
    perform dblink_exec(c, 'begin');
    perform dblink_exec(c, format($q$set local request.jwt.claims = '{"sub":"%s"}'$q$, t.id('ana')));
    perform dblink_exec(c, 'set local role authenticated');
  end loop;
  perform * from dblink('c1', $q$select public.clube_solicitar_resgate(10000, 'Concorrente 1', gen_random_uuid())$q$) as (x jsonb);
  perform dblink_send_query('c2',
    $q$select (public.clube_solicitar_resgate(10000, 'Concorrente 2', gen_random_uuid()) ->> 'credito_reservado_centavos')$q$);
  perform pg_sleep(0.5);
  assert dblink_is_busy('c2') = 1, 'segunda requisição precisa aguardar o bloqueio';
  perform dblink_exec('c1', 'commit');
  select x into r2 from dblink_get_result('c2') as (x text);
  perform * from dblink_get_result('c2') as (x text);
  perform dblink_exec('c2', 'commit');
  assert r2 = '0', format('segundo resgate só leva o desconto, reservou %s', r2);
  perform dblink_disconnect('c1');
  perform dblink_disconnect('c2');
  select sum(credito_reservado_centavos) into v_total from public.clube_resgates
  where user_id = t.id('ana') and status = 'reservado' and descricao like 'Concorrente%';
  assert v_total = 9500, format('soma reservada deve ser o saldo (9500), veio %s', v_total);
  assert t.saldo('ana') = 0 and t.consistente();
end $$;

\echo '11) Reembolso total/parcial e disputa'
do $$
declare v_ref uuid;
begin
  -- Reembolso total da 1ª fatura da Bia: caixa não enviada vira exceção; R$ 5 da Ana (já reservado) é sinalizado
  perform public.clube_registrar_reembolso(jsonb_build_object('stripe_charge_id', 'ch_in_bia1', 'valor_reembolsado_centavos', 4990,
    'reembolsos', jsonb_build_array(jsonb_build_object('id', 're_bia1', 'valor_centavos', 4990, 'status', 'succeeded'))), null);
  perform public.clube_registrar_reembolso(jsonb_build_object('stripe_charge_id', 'ch_in_bia1', 'valor_reembolsado_centavos', 4990,
    'reembolsos', jsonb_build_array(jsonb_build_object('id', 're_bia1', 'valor_centavos', 4990, 'status', 'succeeded'))), null);
  assert (select situacao from public.clube_periodos p join public.clube_faturas f on f.id = p.fatura_id
          where f.stripe_invoice_id = 'in_bia1') = 'reembolsado';
  assert (select c.status from public.clube_caixas c join public.clube_periodos p on p.id = c.periodo_id
          join public.clube_faturas f on f.id = p.fatura_id where f.stripe_invoice_id = 'in_bia1') = 'excecao';
  assert (select status from public.clube_indicacoes where indicado_id = t.id('bia')) = 'revertida';
  select id into v_ref from public.clube_credito_lotes where user_id = t.id('ana') and tipo = 'referral';
  assert (select bloqueado from public.clube_credito_lotes where id = v_ref), 'cashback da indicação bloqueado';
  assert exists (select 1 from public.clube_excecoes where tipo = 'beneficio_usado_em_cobranca_estornada' and referencia = v_ref::text);
  assert (select count(*) from public.clube_ocorrencias_pagamento where stripe_id = 're_bia1') = 1, 'ocorrência única';
  assert (select count(*) from public.clube_caixas where user_id = t.id('bia')) = 2, 'histórico preservado';

  -- Reembolso parcial no Club do Eli: bloqueia o lote e abre exceção, sem reversão automática
  perform public.clube_registrar_reembolso(jsonb_build_object('stripe_charge_id', 'ch_in_eli_new', 'valor_reembolsado_centavos', 2000,
    'reembolsos', jsonb_build_array(jsonb_build_object('id', 're_eli1', 'valor_centavos', 2000, 'status', 'succeeded'))), null);
  assert t.saldo('eli') = 0, 'lote bloqueado não é utilizável';
  assert exists (select 1 from public.clube_excecoes where tipo = 'reembolso_parcial' and referencia = 'in_eli_new');

  -- Disputa no Hel (fev/2028): aberta bloqueia, ganha desbloqueia; disputa perdida (mar/2028) estorna
  perform public.clube_registrar_disputa(jsonb_build_object('stripe_dispute_id', 'dp_hel1', 'stripe_charge_id', 'ch_in_hel_fev',
    'valor_centavos', 9700, 'status', 'needs_response'), null);
  assert public.clube_saldo_disponivel(t.id('hel'), '2028-03-01T00:00:00Z') = 0;
  perform public.clube_registrar_disputa(jsonb_build_object('stripe_dispute_id', 'dp_hel1', 'stripe_charge_id', 'ch_in_hel_fev',
    'valor_centavos', 9700, 'status', 'won'), null);
  assert public.clube_saldo_disponivel(t.id('hel'), '2028-03-01T00:00:00Z') = 9000, 'disputa ganha libera o crédito';
  perform public.clube_registrar_disputa(jsonb_build_object('stripe_dispute_id', 'dp_hel2', 'stripe_charge_id', 'ch_in_hel_mar',
    'valor_centavos', 9700, 'status', 'lost'), null);
  assert public.clube_saldo_disponivel(t.id('hel'), '2028-04-01T00:00:00Z') = 0;
  assert (select revertido_centavos from public.clube_credito_lotes l join public.clube_faturas f on f.id = l.fatura_id
          where f.stripe_invoice_id = 'in_hel_mar' and l.tipo = 'club_monthly') = 9000, 'disputa perdida reverte o não usado';
  assert t.consistente();
end $$;

-- Reserva sobre lote estornado: ao cancelar, o valor devolvido é revertido (não volta a ser gasto)
do $$
declare v_res uuid;
begin
  select id into v_res from public.clube_resgates where user_id = t.id('ana') and status = 'reservado'
    and exists (select 1 from public.clube_resgate_alocacoes a join public.clube_credito_lotes l on l.id = a.lote_id
                where a.resgate_id = clube_resgates.id and l.tipo = 'referral') limit 1;
  perform t.entrar('adm');
  set local role authenticated;
  assert t.erro(format('select public.clube_admin_confirmar_resgate(%L, 10000, %L, null, null)', v_res, 'pix')) = 'credito_bloqueado';
  perform public.clube_admin_cancelar_resgate(v_res, 'Crédito de cobrança reembolsada');
  reset role;
  assert (select revertido_centavos from public.clube_credito_lotes where user_id = t.id('ana') and tipo = 'referral') > 0;
  assert t.consistente();
end $$;

\echo '4b/13b) Cancelamento e recontratação não geram segunda recompensa de aquisição'
do $$
declare ini timestamptz := date_trunc('day', now()) + interval '60 days'; fim timestamptz := date_trunc('day', now()) + interval '90 days';
begin
  perform public.clube_sincronizar_assinatura(t.sub('bia', 'ha_assinatura', 'canceled', now() - interval '8 days', now() + interval '22 days'), null);
  perform public.clube_sincronizar_assinatura(t.sub('bia', 'ha_assinatura', 'active', ini, fim, false, 'sub_bia_2'), null);
  perform public.clube_processar_fatura(t.fat('bia', 'in_bia_re', 'ha_assinatura', ini, fim, 'primeira_mensalidade', true, 'paid', 'sub_bia_2'), null);
  assert (select count(*) from public.clube_credito_lotes where user_id = t.id('ana') and tipo = 'referral') = 1, 'sem segunda recompensa';
  assert (select status from public.clube_indicacoes where indicado_id = t.id('bia')) = 'revertida';
end $$;

\echo '14) Endereço histórico e presente de aniversário'
do $$
declare v_cx uuid;
begin
  select id into v_cx from public.clube_caixas where user_id = t.id('bia') order by criado_em limit 1;
  perform t.entrar('bia');
  set local role authenticated;
  perform public.clube_salvar_perfil('Bia Teste', '11900000002', null,
    '{"cep":"01310999","logradouro":"Rua Outra","numero":"9","bairro":"Centro","cidade":"Cidade Teste","uf":"sp"}');
  assert t.erro($q$select public.clube_salvar_perfil('Bia Teste', '11900000002', '1993-01-01', null)$q$) = 'nascimento_bloqueado';
  reset role;
  assert (select endereco ->> 'cep' from public.clube_caixas where id = v_cx) = '01310200', 'entrega histórica intocada';
  perform t.entrar('adm');
  set local role authenticated;
  perform public.clube_admin_aniversario_registrar(t.id('bia'), 2026, 'entregue', 'Caixa surpresa', null);
  assert t.erro(format($q$select public.clube_admin_aniversario_registrar(%L, 2026, 'retirado', 'Outro', null)$q$, t.id('bia')))
    = 'presente_ja_registrado', 'um presente por ano';
end $$;
reset role;

\echo '12) Isolamento entre membros e proteção administrativa'
do $$
begin
  perform t.entrar('bia');
  set local role authenticated;
  assert (select count(*) from public.clube_perfis) = 1, 'membro vê só o próprio perfil';
  assert (select count(*) from public.clube_credito_lotes where user_id = t.id('ana')) = 0, 'não lê saldo de outra pessoa';
  assert (select count(*) from public.clube_faturas) = (select count(*) from public.clube_faturas where user_id = t.id('bia'));
  assert (select count(*) from public.clube_stripe_eventos) = 0 and (select count(*) from public.clube_excecoes) = 0, 'internos ocultos';
  assert (select count(*) from public.clube_indicacoes) = 1, 'vê só a própria atribuição';
  assert t.erro(format($q$update public.clube_credito_lotes set disponivel_centavos = 999999 where user_id = %L$q$, t.id('bia')))
    like 'permission denied%', 'sem UPDATE em saldo';
  assert t.erro(format($q$insert into public.clube_admins (user_id) values (%L)$q$, t.id('bia'))) like 'permission denied%',
    'não se promove a admin';
  assert t.erro(format($q$update public.clube_perfis set codigo_indicacao = 'AAAAAAAA' where user_id = %L$q$, t.id('bia')))
    like 'permission denied%';
  assert t.erro(format($q$select public.clube_processar_fatura(%L::jsonb, null)$q$, t.fat('bia', 'in_fake', 'ha_club', now(), now() + interval '30 days')))
    like 'permission denied%', 'membro não chama rotina financeira do servidor';
  assert t.erro(format($q$select public.clube_admin_creditar(%L, 1000, 'tentativa')$q$, t.id('bia'))) = 'acesso_negado';
  assert t.erro($q$select public.clube_job_manutencao()$q$) like 'permission denied%';
  assert t.erro(format($q$select public.clube_criar_lote(%L, 'referral', 100000, now(), null, 'ajuste_admin', gen_random_uuid(), null, 'homolog-2026-10', 'x', null)$q$,
    t.id('bia'))) like 'permission denied%';
  assert (public.clube_minha_situacao() -> 'perfil' ->> 'nome') = 'Bia Teste';
end $$;
reset role;
do $$
begin
  set local role anon;
  assert t.erro('select count(*) from public.clube_perfis') like 'permission denied%', 'anônimo não lê perfis';
  assert t.erro('select public.clube_minha_situacao()') like 'permission denied%';
end $$;
reset role;

\echo '   Indicação em análise (mesmo telefone) e decisão auditada'
do $$
declare v_cod text := (select codigo_indicacao from public.clube_perfis where user_id = t.id('gil')); v_ind uuid;
begin
  perform t.usuario('jon', jsonb_build_object('nome', 'Jon Teste', 'telefone', '11900000007', 'nascimento', '1988-08-08', 'ref', v_cod));
  perform t.endereco('jon', '01310700');
  perform t.assinar('jon', 'ha_club', 'in_jon1', now() - interval '1 day', now() + interval '29 days');
  select id into v_ind from public.clube_indicacoes where indicado_id = t.id('jon');
  assert (select status from public.clube_indicacoes where id = v_ind) = 'em_analise';
  assert t.lotes('gil', 'referral') = 0;
  perform t.entrar('adm');
  set local role authenticated;
  perform public.clube_admin_indicacao_decidir(v_ind, true, 'Pessoas diferentes, mesmo telefone da família');
  perform public.clube_admin_creditar(t.id('caio'), 1000, 'Cortesia por atraso na entrega');
  assert t.erro(format($q$select public.clube_admin_creditar(%L, 1000, '')$q$, t.id('caio'))) = 'motivo_obrigatorio';
  reset role;
  assert t.lotes('gil', 'referral') = 1;
  assert (select count(*) from public.clube_auditoria where acao in ('indicacao_aprovada', 'credito_concedido')) = 2;
  assert t.erro('delete from public.clube_auditoria') like 'registro imutável%', 'auditoria append-only';
  assert t.erro('update public.clube_carteira_lancamentos set valor_centavos = 1') like 'registro imutável%', 'extrato append-only';
  assert t.consistente();
end $$;

\echo 'OK: todos os invariantes passaram'
