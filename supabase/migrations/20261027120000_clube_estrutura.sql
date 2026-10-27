-- Clube HA Gourmet: assinaturas (Stripe), benefícios, carteira de créditos, indicações, caixas e eventos.
-- Convenções: dinheiro em centavos (integer), instantes em timestamptz (UTC), regras de calendário em America/Sao_Paulo,
-- data de nascimento como date (sem fuso). Intervalos de validade são [inicio, fim): início inclusivo, fim exclusivo.
-- As tabelas antigas da gestão (hag_estado, hag_registros) não são alteradas por esta migration.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

/* ---------- Política comercial versionada ---------- */

create or replace function public.clube_politica_valida(d jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(d) = 'object'
    and jsonb_typeof(d -> 'desconto_bps') = 'number' and (d ->> 'desconto_bps')::int between 0 and 10000
    and jsonb_typeof(d -> 'credito_club_centavos') = 'number' and (d ->> 'credito_club_centavos')::int > 0
    and jsonb_typeof(d -> 'indicacao_centavos') = 'number' and (d ->> 'indicacao_centavos')::int > 0
    and jsonb_typeof(d -> 'indicacao_exige_indicador_vigente') = 'boolean'
    and jsonb_typeof(d -> 'reserva_resgate_horas') = 'number' and (d ->> 'reserva_resgate_horas')::int between 1 and 720
    and jsonb_typeof(d -> 'tolerancia_pagamento_antes_periodo_seg') = 'number'
    and (d ->> 'tolerancia_pagamento_antes_periodo_seg')::int between 0 and 604800
    and jsonb_typeof(d -> 'ajuste_admin_max_centavos') = 'number' and (d ->> 'ajuste_admin_max_centavos')::int > 0
$$;

create table public.clube_politicas (
  versao text primary key check (versao ~ '^[a-z0-9._-]{3,40}$'),
  vigente_desde timestamptz not null default now(),
  dados jsonb not null check (public.clube_politica_valida(dados)),
  observacao text,
  criado_em timestamptz not null default now()
);

insert into public.clube_politicas (versao, vigente_desde, dados, observacao) values (
  'homolog-2026-10', '2026-01-01T00:00:00Z',
  '{
    "desconto_bps": 500,
    "credito_club_centavos": 9000,
    "indicacao_centavos": 500,
    "indicacao_exige_indicador_vigente": true,
    "reserva_resgate_horas": 48,
    "tolerancia_pagamento_antes_periodo_seg": 86400,
    "ajuste_admin_max_centavos": 50000
  }'::jsonb,
  'Premissas de homologação (ver docs/regras-negocio.md). Não usar comercialmente sem confirmação da cliente.'
);

/* ---------- Planos ---------- */

create table public.clube_planos (
  chave text primary key check (chave in ('ha_assinatura', 'ha_club')),
  nome text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  moeda text not null default 'brl' check (moeda = 'brl'),
  intervalo text not null default 'month' check (intervalo = 'month'),
  beneficio text not null check (beneficio in ('caixa', 'credito')),
  ativo boolean not null default true
);

insert into public.clube_planos (chave, nome, valor_centavos, beneficio) values
  ('ha_assinatura', 'Assinatura HA Gourmet', 4990, 'caixa'),
  ('ha_club', 'HA Gourmet Club', 9700, 'credito');

/* ---------- Identidade, cadastro e permissões ---------- */

create table public.clube_perfis (
  user_id uuid primary key references auth.users (id) on delete restrict,
  nome text not null default '' check (char_length(nome) <= 120),
  telefone text check (telefone ~ '^[0-9]{10,13}$'),
  nascimento date check (nascimento between date '1900-01-01' and date '2100-01-01'),
  codigo_indicacao text not null unique check (codigo_indicacao ~ '^[A-HJ-NP-Z2-9]{8}$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.clube_enderecos (
  user_id uuid primary key references public.clube_perfis (user_id),
  destinatario text check (char_length(destinatario) <= 120),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null check (char_length(logradouro) between 2 and 160),
  numero text not null check (char_length(numero) between 1 and 20),
  complemento text check (char_length(complemento) <= 80),
  bairro text not null check (char_length(bairro) between 1 and 80),
  cidade text not null check (char_length(cidade) between 2 and 80),
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  referencia text check (char_length(referencia) <= 160),
  atualizado_em timestamptz not null default now()
);

-- Papel administrativo vem só desta tabela (nunca de metadados editáveis pelo usuário).
-- Concessão feita pelo dono do projeto via SQL; ver docs/integracoes.md.
create table public.clube_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  concedido_em timestamptz not null default now(),
  observacao text
);

-- Regiões com entrega definida para a caixa mensal. Vazia = venda do plano com caixa fechada.
create table public.clube_cobertura_entrega (
  id uuid primary key default gen_random_uuid(),
  cep_prefixo text not null unique check (cep_prefixo ~ '^[0-9]{2,8}$'),
  descricao text not null check (char_length(descricao) between 2 and 120),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

/* ---------- Stripe: clientes, contratação, assinaturas, faturas ---------- */

create table public.clube_clientes_stripe (
  user_id uuid primary key references public.clube_perfis (user_id),
  stripe_customer_id text not null unique check (stripe_customer_id like 'cus_%'),
  livemode boolean not null,
  criado_em timestamptz not null default now()
);

create table public.clube_checkout_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clube_perfis (user_id),
  plano_chave text not null references public.clube_planos (chave),
  status text not null default 'criando'
    check (status in ('criando', 'aberta', 'concluida', 'expirada', 'falhou', 'cancelada')),
  stripe_session_id text unique check (stripe_session_id like 'cs_%'),
  url text,
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- Trava lógica: no máximo uma contratação em andamento por usuário (protege cliques concorrentes).
create unique index clube_checkout_uma_aberta on public.clube_checkout_sessoes (user_id)
  where status in ('criando', 'aberta');

create table public.clube_assinaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clube_perfis (user_id),
  stripe_subscription_id text not null unique check (stripe_subscription_id like 'sub_%'),
  stripe_customer_id text not null,
  plano_chave text references public.clube_planos (chave),
  stripe_price_id text,
  status text not null,
  cancelar_no_fim boolean not null default false,
  cancelar_em timestamptz,
  cancelada_em timestamptz,
  encerrada_em timestamptz,
  periodo_atual_inicio timestamptz,
  periodo_atual_fim timestamptz,
  livemode boolean not null,
  criada_em timestamptz not null,
  sincronizada_em timestamptz not null default now()
);
create index clube_assinaturas_user on public.clube_assinaturas (user_id);

create table public.clube_faturas (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text not null unique check (stripe_invoice_id like 'in_%'),
  user_id uuid not null references public.clube_perfis (user_id),
  assinatura_id uuid references public.clube_assinaturas (id),
  stripe_subscription_id text,
  plano_chave text references public.clube_planos (chave),
  stripe_price_id text,
  billing_reason text,
  moeda text not null,
  total_centavos integer not null,
  valor_pago_centavos integer not null check (valor_pago_centavos >= 0),
  valor_reembolsado_centavos integer not null default 0 check (valor_reembolsado_centavos >= 0),
  status text not null,
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  pago_em timestamptz,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  classificacao text not null check (classificacao in (
    'primeira_mensalidade', 'mensalidade', 'proporcional', 'ajuste', 'avulsa', 'zerada',
    'fora_do_periodo', 'fora_do_fluxo', 'invalida', 'pendente')),
  elegivel boolean not null default false,
  motivo text,
  em_disputa boolean not null default false,
  livemode boolean not null,
  registrada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  check (periodo_fim is null or periodo_fim > periodo_inicio)
);
create index clube_faturas_user on public.clube_faturas (user_id);
create index clube_faturas_charge on public.clube_faturas (stripe_charge_id);
create index clube_faturas_pi on public.clube_faturas (stripe_payment_intent_id);

-- Um período de benefício = um ciclo efetivamente pago. Status da assinatura sozinho não cria período.
create table public.clube_periodos (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null references public.clube_assinaturas (id),
  user_id uuid not null references public.clube_perfis (user_id),
  fatura_id uuid not null unique references public.clube_faturas (id),
  plano_chave text not null references public.clube_planos (chave),
  inicio timestamptz not null,
  fim timestamptz not null,
  situacao text not null default 'pago'
    check (situacao in ('pago', 'reembolso_parcial', 'reembolsado', 'em_disputa', 'disputa_perdida')),
  concedido_por text not null default 'stripe' check (concedido_por in ('stripe', 'admin')),
  politica_versao text not null references public.clube_politicas (versao),
  concedido_em timestamptz not null default now(),
  check (fim > inicio),
  unique (assinatura_id, inicio),
  -- Nunca dois ciclos pagos sobrepostos para a mesma pessoa (evita benefício em dobro).
  constraint clube_periodos_sem_sobreposicao
    exclude using gist (user_id with =, tstzrange(inicio, fim, '[)') with &&)
);

/* ---------- Caixas mensais (plano ha_assinatura) ---------- */

create table public.clube_sabores_mes (
  id uuid primary key default gen_random_uuid(),
  competencia text not null unique check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  nome text not null check (char_length(nome) between 2 and 80),
  descricao text check (char_length(descricao) <= 400),
  criado_por uuid,
  criado_em timestamptz not null default now()
);

create table public.clube_caixas (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null unique references public.clube_periodos (id),
  user_id uuid not null references public.clube_perfis (user_id),
  competencia text not null check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text not null default 'aguardando_programacao'
    check (status in ('aguardando_programacao', 'em_preparo', 'enviada', 'entregue', 'excecao')),
  destinatario_nome text not null,
  endereco jsonb not null,
  sabor_id uuid references public.clube_sabores_mes (id),
  observacao text check (char_length(observacao) <= 400),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clube_caixas_user on public.clube_caixas (user_id);

/* ---------- Carteira: lotes, extrato, resgates ---------- */

create table public.clube_credito_lotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clube_perfis (user_id),
  tipo text not null check (tipo in ('club_monthly', 'referral')),
  valor_centavos integer not null check (valor_centavos > 0),
  disponivel_centavos integer not null check (disponivel_centavos >= 0),
  reservado_centavos integer not null default 0 check (reservado_centavos >= 0),
  usado_centavos integer not null default 0 check (usado_centavos >= 0),
  expirado_centavos integer not null default 0 check (expirado_centavos >= 0),
  revertido_centavos integer not null default 0 check (revertido_centavos >= 0),
  inicio timestamptz not null,
  expira_em timestamptz,
  origem_tipo text not null check (origem_tipo in ('periodo', 'indicacao', 'ajuste_admin')),
  origem_id uuid not null,
  fatura_id uuid references public.clube_faturas (id),
  bloqueado boolean not null default false,
  bloqueio_motivo text check (bloqueio_motivo in ('reembolso', 'reembolso_parcial', 'disputa', 'admin')),
  politica_versao text not null references public.clube_politicas (versao),
  criado_em timestamptz not null default now(),
  check (disponivel_centavos + reservado_centavos + usado_centavos + expirado_centavos + revertido_centavos = valor_centavos),
  check (tipo <> 'club_monthly' or expira_em is not null),
  check (expira_em is null or expira_em > inicio),
  check (bloqueado = (bloqueio_motivo is not null)),
  -- Uma concessão por origem: um lote mensal por período pago, um lote por indicação.
  unique (origem_tipo, origem_id)
);
create index clube_lotes_user on public.clube_credito_lotes (user_id, tipo);

create table public.clube_resgates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clube_perfis (user_id),
  chave_idempotencia uuid not null,
  status text not null default 'reservado' check (status in ('reservado', 'confirmado', 'cancelado', 'expirado')),
  descricao text not null check (char_length(descricao) between 2 and 300),
  subtotal_solicitado_centavos integer not null check (subtotal_solicitado_centavos between 1 and 10000000),
  desconto_bps integer not null check (desconto_bps between 0 and 10000),
  credito_reservado_centavos integer not null check (credito_reservado_centavos >= 0),
  subtotal_confirmado_centavos integer check (subtotal_confirmado_centavos between 1 and 10000000),
  desconto_centavos integer check (desconto_centavos >= 0),
  credito_usado_centavos integer check (credito_usado_centavos >= 0),
  a_pagar_centavos integer check (a_pagar_centavos >= 0),
  pagamento_complementar_forma text
    check (pagamento_complementar_forma in ('nenhum', 'pix', 'dinheiro', 'cartao_maquininha', 'outro')),
  pagamento_complementar_ref text check (char_length(pagamento_complementar_ref) <= 120),
  reserva_expira_em timestamptz not null,
  confirmado_por uuid,
  confirmado_em timestamptz,
  encerrado_em timestamptz,
  encerramento_motivo text check (char_length(encerramento_motivo) <= 300),
  politica_versao text not null references public.clube_politicas (versao),
  criado_em timestamptz not null default now(),
  unique (user_id, chave_idempotencia),
  check (status <> 'confirmado' or (subtotal_confirmado_centavos is not null and credito_usado_centavos is not null
    and a_pagar_centavos is not null and pagamento_complementar_forma is not null and confirmado_em is not null))
);
create index clube_resgates_status on public.clube_resgates (status, reserva_expira_em);

create table public.clube_resgate_alocacoes (
  resgate_id uuid not null references public.clube_resgates (id),
  lote_id uuid not null references public.clube_credito_lotes (id),
  ordem integer not null,
  reservado_centavos integer not null check (reservado_centavos > 0),
  consumido_centavos integer not null default 0 check (consumido_centavos >= 0),
  liberado_centavos integer not null default 0 check (liberado_centavos >= 0),
  primary key (resgate_id, lote_id),
  check (consumido_centavos + liberado_centavos <= reservado_centavos)
);

-- Extrato append-only: concessão, reserva, liberação, consumo, expiração e reversão.
create table public.clube_carteira_lancamentos (
  id bigint generated always as identity primary key,
  lote_id uuid not null references public.clube_credito_lotes (id),
  user_id uuid not null references public.clube_perfis (user_id),
  tipo text not null check (tipo in ('concessao', 'reserva', 'liberacao', 'consumo', 'expiracao', 'reversao')),
  valor_centavos integer not null check (valor_centavos > 0),
  resgate_id uuid references public.clube_resgates (id),
  motivo text check (char_length(motivo) <= 300),
  autor_id uuid,
  criado_em timestamptz not null default now()
);
create index clube_lancamentos_user on public.clube_carteira_lancamentos (user_id, criado_em desc);
create index clube_lancamentos_lote on public.clube_carteira_lancamentos (lote_id);

/* ---------- Indicações ---------- */

create table public.clube_indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicado_id uuid not null unique references public.clube_perfis (user_id),
  indicador_id uuid not null references public.clube_perfis (user_id),
  codigo text not null,
  origem text not null check (origem in ('link', 'manual')),
  status text not null default 'pendente'
    check (status in ('pendente', 'em_analise', 'recompensada', 'inelegivel', 'revertida', 'rejeitada')),
  motivo text check (char_length(motivo) <= 300),
  fatura_id uuid references public.clube_faturas (id),
  politica_versao text references public.clube_politicas (versao),
  criado_em timestamptz not null default now(),
  qualificada_em timestamptz,
  atualizada_em timestamptz not null default now(),
  check (indicado_id <> indicador_id)
);
create index clube_indicacoes_indicador on public.clube_indicacoes (indicador_id);

/* ---------- Eventos presenciais (Club) ---------- */

create table public.clube_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 120),
  descricao text check (char_length(descricao) <= 2000),
  local text not null check (char_length(local) between 2 and 200),
  inicio timestamptz not null,
  fim timestamptz not null,
  capacidade integer check (capacidade > 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'cancelado')),
  criado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim > inicio)
);

create table public.clube_evento_reservas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.clube_eventos (id),
  user_id uuid not null references public.clube_perfis (user_id),
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  presenca text not null default 'pendente' check (presenca in ('pendente', 'presente', 'ausente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (evento_id, user_id)
);

/* ---------- Aniversário: no máximo um registro por membro e ano ---------- */

create table public.clube_aniversarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.clube_perfis (user_id),
  ano integer not null check (ano between 2024 and 2100),
  status text not null check (status in ('entregue', 'retirado')),
  tipo_presente text not null check (char_length(tipo_presente) between 2 and 120),
  observacao text check (char_length(observacao) <= 300),
  registrado_por uuid not null,
  registrado_em timestamptz not null default now(),
  unique (user_id, ano)
);

/* ---------- Webhooks, ocorrências financeiras, exceções, auditoria, limites, jobs ---------- */

create table public.clube_stripe_eventos (
  id text primary key check (id like 'evt_%'),
  tipo text not null,
  objeto_id text,
  livemode boolean not null,
  criado_stripe timestamptz not null,
  recebido_em timestamptz not null default now(),
  status text not null default 'recebido' check (status in ('recebido', 'processando', 'processado', 'ignorado', 'erro')),
  tentativas integer not null default 0,
  ultimo_erro text,
  proxima_tentativa_em timestamptz,
  processado_em timestamptz
);
create index clube_stripe_eventos_pendentes on public.clube_stripe_eventos (status, proxima_tentativa_em)
  where status in ('recebido', 'processando', 'erro');

create table public.clube_ocorrencias_pagamento (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid references public.clube_faturas (id),
  tipo text not null check (tipo in ('reembolso', 'disputa')),
  stripe_id text not null unique,
  stripe_charge_id text,
  valor_centavos integer not null check (valor_centavos >= 0),
  status text not null,
  motivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.clube_excecoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  referencia text not null,
  user_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  status text not null default 'aberta' check (status in ('aberta', 'resolvida')),
  resolucao text,
  resolvida_por uuid,
  resolvida_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (tipo, referencia)
);

create table public.clube_auditoria (
  id bigint generated always as identity primary key,
  autor_id uuid,
  acao text not null,
  alvo_tipo text not null,
  alvo_id text,
  motivo text,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table public.clube_limites (
  chave text primary key,
  janela_inicio timestamptz not null,
  contador integer not null
);

create table public.clube_execucoes_job (
  id bigint generated always as identity primary key,
  job text not null,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  resultado jsonb,
  erro text
);

/* ---------- Registros append-only ---------- */

create or replace function public.clube_bloquear_alteracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'registro imutável: % não permite %', tg_table_name, tg_op using errcode = 'P0001';
end $$;

create trigger clube_lancamentos_imutaveis before update or delete on public.clube_carteira_lancamentos
  for each row execute function public.clube_bloquear_alteracao();
create trigger clube_auditoria_imutavel before update or delete on public.clube_auditoria
  for each row execute function public.clube_bloquear_alteracao();

/* ---------- RLS e privilégios mínimos ---------- */

do $$
declare t text;
begin
  foreach t in array array[
    'clube_politicas', 'clube_planos', 'clube_perfis', 'clube_enderecos', 'clube_admins', 'clube_cobertura_entrega',
    'clube_clientes_stripe', 'clube_checkout_sessoes', 'clube_assinaturas', 'clube_faturas', 'clube_periodos',
    'clube_sabores_mes', 'clube_caixas', 'clube_credito_lotes', 'clube_resgates', 'clube_resgate_alocacoes',
    'clube_carteira_lancamentos', 'clube_indicacoes', 'clube_eventos', 'clube_evento_reservas', 'clube_aniversarios',
    'clube_stripe_eventos', 'clube_ocorrencias_pagamento', 'clube_excecoes', 'clube_auditoria', 'clube_limites',
    'clube_execucoes_job'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- Função de papel: lê a tabela de admins (definer para não depender da RLS da própria tabela).
create or replace function public.clube_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clube_admins a where a.user_id = (select auth.uid()))
$$;
revoke all on function public.clube_is_admin() from public, anon;
grant execute on function public.clube_is_admin() to authenticated, service_role;

-- Leitura pública: planos e regiões atendidas.
grant select on public.clube_planos, public.clube_cobertura_entrega to anon, authenticated;
create policy planos_leitura on public.clube_planos for select to anon, authenticated using (true);
create policy cobertura_leitura on public.clube_cobertura_entrega for select to anon, authenticated
  using (ativo or (select public.clube_is_admin()));

-- Membros leem só os próprios dados; admin lê tudo. Nenhuma escrita direta: tudo passa por funções validadas.
do $$
declare t text;
begin
  foreach t in array array[
    'clube_perfis', 'clube_enderecos', 'clube_clientes_stripe', 'clube_checkout_sessoes', 'clube_assinaturas',
    'clube_faturas', 'clube_periodos', 'clube_caixas', 'clube_credito_lotes', 'clube_resgates',
    'clube_carteira_lancamentos', 'clube_evento_reservas', 'clube_aniversarios'
  ] loop
    execute format('grant select on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()) or (select public.clube_is_admin()))',
      t || '_leitura', t);
  end loop;
end $$;

grant select on public.clube_resgate_alocacoes to authenticated;
create policy alocacoes_leitura on public.clube_resgate_alocacoes for select to authenticated using (
  exists (select 1 from public.clube_resgates r where r.id = resgate_id and r.user_id = (select auth.uid()))
  or (select public.clube_is_admin()));

grant select on public.clube_indicacoes to authenticated;
create policy indicacoes_leitura on public.clube_indicacoes for select to authenticated using (
  indicador_id = (select auth.uid()) or indicado_id = (select auth.uid()) or (select public.clube_is_admin()));

grant select on public.clube_admins to authenticated;
create policy admins_leitura on public.clube_admins for select to authenticated using (
  user_id = (select auth.uid()) or (select public.clube_is_admin()));

grant select on public.clube_politicas, public.clube_sabores_mes, public.clube_eventos to authenticated;
create policy politicas_leitura on public.clube_politicas for select to authenticated using (true);
create policy sabores_leitura on public.clube_sabores_mes for select to authenticated using (true);
create policy eventos_leitura on public.clube_eventos for select to authenticated using (
  status = 'publicado' or (select public.clube_is_admin()));

do $$
declare t text;
begin
  foreach t in array array['clube_stripe_eventos', 'clube_ocorrencias_pagamento', 'clube_excecoes', 'clube_auditoria',
    'clube_execucoes_job'] loop
    execute format('grant select on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.clube_is_admin()))',
      t || '_admin', t);
  end loop;
end $$;
