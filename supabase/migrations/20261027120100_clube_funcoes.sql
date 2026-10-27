-- Funções do Clube HA Gourmet. Todas as escritas passam por aqui, dentro de uma transação, com bloqueio de linha
-- e restrições únicas protegendo os invariantes (um benefício por ciclo pago, uma recompensa por indicado,
-- nenhum centavo gasto duas vezes). Erros de regra usam a mensagem como código (ex.: 'saldo_alterado').

create extension if not exists pgcrypto with schema extensions;

/* =========================================================================================
   Utilitários internos
   ========================================================================================= */

create or replace function public.clube_politica_atual() returns public.clube_politicas
language sql stable set search_path = '' as $$
  select p from public.clube_politicas p where p.vigente_desde <= now() order by p.vigente_desde desc limit 1
$$;

create or replace function public.clube_erro(p_codigo text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_codigo;
end $$;

create or replace function public.clube_registrar_excecao(p_tipo text, p_ref text, p_user uuid, p_detalhes jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.clube_excecoes (tipo, referencia, user_id, detalhes)
  values (p_tipo, coalesce(p_ref, '-'), p_user, coalesce(p_detalhes, '{}'::jsonb))
  on conflict (tipo, referencia) do nothing
$$;

create or replace function public.clube_auditar(p_autor uuid, p_acao text, p_alvo_tipo text, p_alvo_id text,
  p_motivo text, p_dados jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.clube_auditoria (autor_id, acao, alvo_tipo, alvo_id, motivo, dados)
  values (p_autor, p_acao, p_alvo_tipo, p_alvo_id, p_motivo, coalesce(p_dados, '{}'::jsonb))
$$;

-- Limite de tentativas por chave e janela (autenticação/checkout/indicação/resgate).
create or replace function public.clube_exigir_limite(p_chave text, p_max integer, p_janela interval) returns void
language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  insert into public.clube_limites as l (chave, janela_inicio, contador) values (p_chave, now(), 1)
  on conflict (chave) do update set
    janela_inicio = case when l.janela_inicio <= now() - p_janela then now() else l.janela_inicio end,
    contador = case when l.janela_inicio <= now() - p_janela then 1 else l.contador + 1 end
  returning contador into v;
  if v > p_max then perform public.clube_erro('limite_excedido'); end if;
end $$;

create or replace function public.clube_ip_requisicao() returns text
language plpgsql stable set search_path = '' as $$
declare h jsonb;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then h := null; end;
  return coalesce(nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
    h ->> 'cf-connecting-ip', 'desconhecido');
end $$;

create or replace function public.clube_exigir_usuario() returns uuid
language plpgsql set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then perform public.clube_erro('nao_autenticado'); end if;
  return v;
end $$;

create or replace function public.clube_exigir_admin() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from public.clube_admins a where a.user_id = v) then
    perform public.clube_erro('acesso_negado');
  end if;
  return v;
end $$;

create or replace function public.clube_normalizar_codigo(p text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- Código de indicação: 8 caracteres aleatórios (32 símbolos, sem I/O/0/1), sem dado pessoal e não sequencial.
create or replace function public.clube_gerar_codigo() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea; c text;
begin
  loop
    b := extensions.gen_random_bytes(8);
    c := '';
    for i in 0..7 loop
      c := c || substr(alfabeto, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.clube_perfis p where p.codigo_indicacao = c);
  end loop;
  return c;
end $$;

-- Período pago que cobre o instante informado (benefício vigente). Status da assinatura não entra aqui.
create or replace function public.clube_beneficio_vigente(p_user uuid, p_em timestamptz) returns public.clube_periodos
language sql stable security definer set search_path = '' as $$
  select pe from public.clube_periodos pe
  where pe.user_id = p_user and pe.situacao in ('pago', 'reembolso_parcial') and pe.inicio <= p_em and pe.fim > p_em
  order by pe.inicio desc limit 1
$$;

-- Saldo utilizável: confere validade e bloqueio na hora, sem depender do job de expiração.
create or replace function public.clube_saldo_disponivel(p_user uuid, p_em timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.disponivel_centavos), 0)::integer from public.clube_credito_lotes l
  where l.user_id = p_user and not l.bloqueado and l.disponivel_centavos > 0
    and l.inicio <= p_em and (l.expira_em is null or l.expira_em > p_em)
$$;

/* =========================================================================================
   Cadastro, perfil e indicação
   ========================================================================================= */

-- Cria o perfil e fixa a atribuição de indicação uma única vez. Código inválido não bloqueia o cadastro.
create or replace function public.clube_criar_perfil(p_user uuid, p_meta jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := left(btrim(coalesce(p_meta ->> 'nome', '')), 120);
  v_tel text := regexp_replace(coalesce(p_meta ->> 'telefone', ''), '\D', '', 'g');
  v_nasc date;
  v_cod text := public.clube_normalizar_codigo(p_meta ->> 'ref');
  v_origem text := case when p_meta ->> 'ref_origem' = 'link' then 'link' else 'manual' end;
  v_indicador uuid;
begin
  if v_tel !~ '^[0-9]{10,13}$' then v_tel := null; end if;
  begin
    v_nasc := (p_meta ->> 'nascimento')::date;
    if v_nasc < date '1900-01-01' or v_nasc > current_date then v_nasc := null; end if;
  exception when others then v_nasc := null;
  end;

  insert into public.clube_perfis (user_id, nome, telefone, nascimento, codigo_indicacao)
  values (p_user, v_nome, v_tel, v_nasc, public.clube_gerar_codigo())
  on conflict (user_id) do nothing;
  if not found then return; end if;

  if v_cod ~ '^[A-HJ-NP-Z2-9]{8}$' then
    select p.user_id into v_indicador from public.clube_perfis p where p.codigo_indicacao = v_cod;
    if v_indicador is not null and v_indicador <> p_user then
      insert into public.clube_indicacoes (indicado_id, indicador_id, codigo, origem)
      values (p_user, v_indicador, v_cod, v_origem);
    end if;
  end if;
end $$;

create or replace function public.clube_auth_novo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.clube_criar_perfil(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  exception when others then
    perform public.clube_registrar_excecao('perfil_nao_criado', new.id::text, null, jsonb_build_object('erro', sqlerrm));
  end;
  return new;
end $$;

drop trigger if exists clube_novo_usuario on auth.users;
create trigger clube_novo_usuario after insert on auth.users
  for each row execute function public.clube_auth_novo_usuario();

-- Usuários que já existiam ganham perfil sem dados inventados (nascimento fica vazio até o próprio membro informar).
do $$
declare u record;
begin
  for u in select id from auth.users where id not in (select user_id from public.clube_perfis) loop
    perform public.clube_criar_perfil(u.id, '{}'::jsonb);
  end loop;
end $$;

create or replace function public.clube_garantir_perfil() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.clube_criar_perfil(public.clube_exigir_usuario(), '{}'::jsonb);
end $$;

-- Membro atualiza nome, telefone, endereço e informa o nascimento uma vez (mudança posterior só pela loja).
create or replace function public.clube_salvar_perfil(p_nome text, p_telefone text, p_nascimento date, p_endereco jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.clube_exigir_usuario();
  v_perfil public.clube_perfis;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  e jsonb := p_endereco;
  v_cep text; v_uf text;
begin
  perform public.clube_exigir_limite('perfil:' || v_user, 30, interval '1 hour');
  perform public.clube_criar_perfil(v_user, '{}'::jsonb);
  select * into v_perfil from public.clube_perfis where user_id = v_user for update;

  if char_length(v_nome) not between 2 and 120 then perform public.clube_erro('nome_invalido'); end if;
  if v_tel !~ '^[0-9]{10,13}$' then perform public.clube_erro('telefone_invalido'); end if;
  if p_nascimento is not null then
    if p_nascimento < date '1900-01-01' or p_nascimento > current_date then perform public.clube_erro('nascimento_invalido'); end if;
    if v_perfil.nascimento is not null and v_perfil.nascimento <> p_nascimento then
      perform public.clube_erro('nascimento_bloqueado');
    end if;
  end if;

  update public.clube_perfis set nome = v_nome, telefone = v_tel,
    nascimento = coalesce(v_perfil.nascimento, p_nascimento), atualizado_em = now()
  where user_id = v_user;

  if e is not null then
    v_cep := regexp_replace(coalesce(e ->> 'cep', ''), '\D', '', 'g');
    v_uf := upper(btrim(coalesce(e ->> 'uf', '')));
    if v_cep !~ '^[0-9]{8}$' then perform public.clube_erro('cep_invalido'); end if;
    if v_uf !~ '^[A-Z]{2}$' then perform public.clube_erro('uf_invalida'); end if;
    if char_length(btrim(coalesce(e ->> 'logradouro', ''))) not between 2 and 160
      or char_length(btrim(coalesce(e ->> 'numero', ''))) not between 1 and 20
      or char_length(btrim(coalesce(e ->> 'bairro', ''))) not between 1 and 80
      or char_length(btrim(coalesce(e ->> 'cidade', ''))) not between 2 and 80
      or char_length(coalesce(e ->> 'complemento', '')) > 80
      or char_length(coalesce(e ->> 'referencia', '')) > 160
      or char_length(coalesce(e ->> 'destinatario', '')) > 120 then
      perform public.clube_erro('endereco_invalido');
    end if;
    insert into public.clube_enderecos as d (user_id, destinatario, cep, logradouro, numero, complemento, bairro, cidade, uf, referencia)
    values (v_user, nullif(btrim(e ->> 'destinatario'), ''), v_cep, btrim(e ->> 'logradouro'), btrim(e ->> 'numero'),
      nullif(btrim(e ->> 'complemento'), ''), btrim(e ->> 'bairro'), btrim(e ->> 'cidade'), v_uf,
      nullif(btrim(e ->> 'referencia'), ''))
    on conflict (user_id) do update set destinatario = excluded.destinatario, cep = excluded.cep,
      logradouro = excluded.logradouro, numero = excluded.numero, complemento = excluded.complemento,
      bairro = excluded.bairro, cidade = excluded.cidade, uf = excluded.uf, referencia = excluded.referencia,
      atualizado_em = now();
  end if;
end $$;

-- Validação do código no cadastro (sem revelar quem é o indicador). Limitada por IP.
create or replace function public.clube_validar_codigo(p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text := public.clube_normalizar_codigo(p_codigo); v_dono uuid;
begin
  perform public.clube_exigir_limite('codigo:' || public.clube_ip_requisicao(), 30, interval '10 minutes');
  if v !~ '^[A-HJ-NP-Z2-9]{8}$' then return jsonb_build_object('valido', false, 'motivo', 'formato'); end if;
  select user_id into v_dono from public.clube_perfis where codigo_indicacao = v;
  if v_dono is null then return jsonb_build_object('valido', false, 'motivo', 'inexistente'); end if;
  if v_dono = auth.uid() then return jsonb_build_object('valido', false, 'motivo', 'proprio'); end if;
  return jsonb_build_object('valido', true, 'codigo', v);
end $$;

/* =========================================================================================
   Carteira: movimentação de lotes (sempre com extrato)
   ========================================================================================= */

-- reserva: disponível → reservado | liberacao: reservado → disponível | consumo: reservado → usado
-- expiracao: disponível → expirado | reversao: disponível → revertido. As restrições CHECK impedem saldo negativo.
create or replace function public.clube_lote_movimentar(p_lote uuid, p_tipo text, p_valor integer, p_resgate uuid,
  p_motivo text, p_autor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_valor is null or p_valor <= 0 then return; end if;
  if p_tipo not in ('reserva', 'liberacao', 'consumo', 'expiracao', 'reversao') then perform public.clube_erro('movimento_invalido'); end if;
  update public.clube_credito_lotes set
    disponivel_centavos = disponivel_centavos + case p_tipo when 'liberacao' then p_valor
      when 'reserva' then -p_valor when 'expiracao' then -p_valor when 'reversao' then -p_valor else 0 end,
    reservado_centavos = reservado_centavos + case p_tipo when 'reserva' then p_valor
      when 'liberacao' then -p_valor when 'consumo' then -p_valor else 0 end,
    usado_centavos = usado_centavos + case when p_tipo = 'consumo' then p_valor else 0 end,
    expirado_centavos = expirado_centavos + case when p_tipo = 'expiracao' then p_valor else 0 end,
    revertido_centavos = revertido_centavos + case when p_tipo = 'reversao' then p_valor else 0 end
  where id = p_lote
  returning user_id into v_user;
  if v_user is null then perform public.clube_erro('lote_inexistente'); end if;
  insert into public.clube_carteira_lancamentos (lote_id, user_id, tipo, valor_centavos, resgate_id, motivo, autor_id)
  values (p_lote, v_user, p_tipo, p_valor, p_resgate, p_motivo, p_autor);
end $$;

create or replace function public.clube_criar_lote(p_user uuid, p_tipo text, p_valor integer, p_inicio timestamptz,
  p_expira timestamptz, p_origem_tipo text, p_origem_id uuid, p_fatura uuid, p_politica text, p_motivo text, p_autor uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.clube_credito_lotes (user_id, tipo, valor_centavos, disponivel_centavos, inicio, expira_em,
    origem_tipo, origem_id, fatura_id, politica_versao)
  values (p_user, p_tipo, p_valor, p_valor, p_inicio, p_expira, p_origem_tipo, p_origem_id, p_fatura, p_politica)
  on conflict (origem_tipo, origem_id) do nothing
  returning id into v_id;
  if v_id is not null then
    insert into public.clube_carteira_lancamentos (lote_id, user_id, tipo, valor_centavos, motivo, autor_id)
    values (v_id, p_user, 'concessao', p_valor, p_motivo, p_autor);
  end if;
  return v_id;
end $$;

/* =========================================================================================
   Benefícios: período pago, caixa, crédito mensal, indicação
   ========================================================================================= */

create or replace function public.clube_conceder_indicacao(p_indicacao uuid, p_fatura uuid, p_autor uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.clube_indicacoes; pol public.clube_politicas := public.clube_politica_atual();
begin
  select * into i from public.clube_indicacoes where id = p_indicacao for update;
  if not found or i.status = 'recompensada' then return; end if;
  perform public.clube_criar_lote(i.indicador_id, 'referral', (pol.dados ->> 'indicacao_centavos')::integer, now(), null,
    'indicacao', i.id, coalesce(p_fatura, i.fatura_id), pol.versao,
    coalesce(p_motivo, 'Cashback de indicação'), p_autor);
  update public.clube_indicacoes set status = 'recompensada', fatura_id = coalesce(p_fatura, fatura_id),
    politica_versao = pol.versao, qualificada_em = coalesce(qualificada_em, now()),
    motivo = coalesce(p_motivo, motivo), atualizada_em = now()
  where id = i.id;
end $$;

-- Avaliada só na primeira conversão elegível do indicado; depois disso o status nunca volta a 'pendente'.
create or replace function public.clube_avaliar_indicacao(p_indicado uuid, p_fatura uuid, p_em timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  i public.clube_indicacoes;
  pol public.clube_politicas := public.clube_politica_atual();
  v_tel_indicado text; v_tel_indicador text;
begin
  select * into i from public.clube_indicacoes where indicado_id = p_indicado for update;
  if not found or i.status <> 'pendente' then return; end if;

  if (pol.dados ->> 'indicacao_exige_indicador_vigente')::boolean
     and (public.clube_beneficio_vigente(i.indicador_id, coalesce(p_em, now()))).id is null then
    update public.clube_indicacoes set status = 'inelegivel', fatura_id = p_fatura, politica_versao = pol.versao,
      motivo = 'Indicador sem benefício vigente na data do pagamento', qualificada_em = now(), atualizada_em = now()
    where id = i.id;
    return;
  end if;

  select telefone into v_tel_indicado from public.clube_perfis where user_id = i.indicado_id;
  select telefone into v_tel_indicador from public.clube_perfis where user_id = i.indicador_id;
  if v_tel_indicado is not null and v_tel_indicado = v_tel_indicador then
    update public.clube_indicacoes set status = 'em_analise', fatura_id = p_fatura, politica_versao = pol.versao,
      motivo = 'Mesmo telefone do indicador: confirmar antes de creditar', qualificada_em = now(), atualizada_em = now()
    where id = i.id;
    perform public.clube_registrar_excecao('indicacao_em_analise', i.id::text, i.indicador_id, '{}'::jsonb);
    return;
  end if;

  perform public.clube_conceder_indicacao(i.id, p_fatura, null, null);
end $$;

-- Concede o benefício de um ciclo pago. Idempotente por fatura e protegido contra ciclos sobrepostos.
create or replace function public.clube_conceder_periodo(p_fatura uuid, p_origem text, p_autor uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  f public.clube_faturas;
  v_id uuid;
  pol public.clube_politicas := public.clube_politica_atual();
  v_plano public.clube_planos;
  v_perfil public.clube_perfis;
  v_end public.clube_enderecos;
  v_comp text;
begin
  select * into f from public.clube_faturas where id = p_fatura for update;
  select id into v_id from public.clube_periodos where fatura_id = f.id;
  if v_id is not null then return v_id; end if;
  if f.assinatura_id is null or f.plano_chave is null or f.periodo_inicio is null or f.periodo_fim is null then
    perform public.clube_erro('fatura_incompleta');
  end if;
  if exists (select 1 from public.clube_periodos pe where pe.user_id = f.user_id
             and tstzrange(pe.inicio, pe.fim, '[)') && tstzrange(f.periodo_inicio, f.periodo_fim, '[)')) then
    perform public.clube_registrar_excecao('periodo_sobreposto', f.stripe_invoice_id, f.user_id,
      jsonb_build_object('inicio', f.periodo_inicio, 'fim', f.periodo_fim));
    return null;
  end if;

  insert into public.clube_periodos (assinatura_id, user_id, fatura_id, plano_chave, inicio, fim, concedido_por, politica_versao)
  values (f.assinatura_id, f.user_id, f.id, f.plano_chave, f.periodo_inicio, f.periodo_fim, p_origem, pol.versao)
  returning id into v_id;

  select * into v_plano from public.clube_planos where chave = f.plano_chave;
  if v_plano.beneficio = 'caixa' then
    select * into v_perfil from public.clube_perfis where user_id = f.user_id;
    select * into v_end from public.clube_enderecos where user_id = f.user_id;
    v_comp := to_char(f.periodo_inicio at time zone 'America/Sao_Paulo', 'YYYY-MM');
    insert into public.clube_caixas (periodo_id, user_id, competencia, status, destinatario_nome, endereco, sabor_id, observacao)
    values (v_id, f.user_id, v_comp,
      case when v_end.user_id is null then 'excecao' else 'aguardando_programacao' end,
      coalesce(nullif(v_end.destinatario, ''), nullif(v_perfil.nome, ''), 'Assinante'),
      case when v_end.user_id is null then '{}'::jsonb else jsonb_build_object(
        'cep', v_end.cep, 'logradouro', v_end.logradouro, 'numero', v_end.numero, 'complemento', v_end.complemento,
        'bairro', v_end.bairro, 'cidade', v_end.cidade, 'uf', v_end.uf, 'referencia', v_end.referencia) end,
      (select s.id from public.clube_sabores_mes s where s.competencia = v_comp),
      case when v_end.user_id is null then 'Endereço não cadastrado no momento do pagamento' end);
  else
    perform public.clube_criar_lote(f.user_id, 'club_monthly', (pol.dados ->> 'credito_club_centavos')::integer,
      f.periodo_inicio, f.periodo_fim, 'periodo', v_id, f.id, pol.versao, 'Crédito mensal do Club', p_autor);
  end if;

  perform public.clube_avaliar_indicacao(f.user_id, f.id, coalesce(f.pago_em, now()));
  return v_id;
end $$;

/* =========================================================================================
   Stripe: eventos, contratação, assinatura, fatura, reembolso e disputa (somente service_role)
   ========================================================================================= */

create or replace function public.clube_evento_receber(p_id text, p_tipo text, p_objeto text, p_livemode boolean,
  p_criado timestamptz) returns text
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  insert into public.clube_stripe_eventos (id, tipo, objeto_id, livemode, criado_stripe)
  values (p_id, p_tipo, p_objeto, p_livemode, p_criado) on conflict (id) do nothing;
  select status into v_status from public.clube_stripe_eventos where id = p_id for update;
  if v_status in ('processado', 'ignorado') then return v_status; end if;
  update public.clube_stripe_eventos set status = 'processando', tentativas = tentativas + 1 where id = p_id;
  return 'processar';
end $$;

create or replace function public.clube_evento_concluir(p_id text, p_status text) returns void
language sql security definer set search_path = '' as $$
  update public.clube_stripe_eventos set status = p_status, processado_em = now(), ultimo_erro = null,
    proxima_tentativa_em = null
  where p_id is not null and id = p_id and status not in ('processado', 'ignorado')
$$;

create or replace function public.clube_evento_falhou(p_id text, p_erro text) returns void
language sql security definer set search_path = '' as $$
  update public.clube_stripe_eventos set status = 'erro', ultimo_erro = left(p_erro, 500),
    proxima_tentativa_em = now() + least(interval '6 hours', interval '1 minute' * power(2, least(tentativas, 10)))
  where id = p_id and status not in ('processado', 'ignorado')
$$;

-- Prepara a contratação com trava por usuário. Retorna: criar | reutilizar | substituir | erro.
create or replace function public.clube_checkout_preparar(p_user uuid, p_plano text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_plano public.clube_planos;
  v_perfil public.clube_perfis;
  v_end public.clube_enderecos;
  v_sessao public.clube_checkout_sessoes;
  v_cliente text;
  v_id uuid;
begin
  select * into v_plano from public.clube_planos where chave = p_plano and ativo;
  if not found then return jsonb_build_object('erro', 'plano_invalido'); end if;
  select * into v_perfil from public.clube_perfis where user_id = p_user for update;
  if not found then return jsonb_build_object('erro', 'perfil_incompleto'); end if;
  select * into v_end from public.clube_enderecos where user_id = p_user;
  if v_perfil.nome = '' or v_perfil.telefone is null or v_perfil.nascimento is null or v_end.user_id is null then
    return jsonb_build_object('erro', 'perfil_incompleto');
  end if;
  if v_plano.beneficio = 'caixa' and not exists (
    select 1 from public.clube_cobertura_entrega c where c.ativo and v_end.cep like c.cep_prefixo || '%') then
    return jsonb_build_object('erro', 'regiao_nao_atendida');
  end if;
  if exists (select 1 from public.clube_assinaturas a where a.user_id = p_user
             and a.status in ('active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused')) then
    return jsonb_build_object('erro', 'ja_assinante');
  end if;

  update public.clube_checkout_sessoes set status = 'falhou', atualizado_em = now()
  where user_id = p_user and status = 'criando' and criado_em < now() - interval '2 minutes';
  update public.clube_checkout_sessoes set status = 'expirada', atualizado_em = now()
  where user_id = p_user and status = 'aberta' and expira_em <= now();

  select * into v_sessao from public.clube_checkout_sessoes where user_id = p_user and status in ('criando', 'aberta');
  if found then
    if v_sessao.status = 'criando' then return jsonb_build_object('erro', 'em_andamento'); end if;
    if v_sessao.plano_chave = p_plano and v_sessao.expira_em > now() + interval '5 minutes' then
      return jsonb_build_object('acao', 'reutilizar', 'sessao_id', v_sessao.id, 'url', v_sessao.url,
        'stripe_session_id', v_sessao.stripe_session_id);
    end if;
    return jsonb_build_object('acao', 'substituir', 'sessao_id', v_sessao.id, 'stripe_session_id', v_sessao.stripe_session_id);
  end if;

  insert into public.clube_checkout_sessoes (user_id, plano_chave) values (p_user, p_plano) returning id into v_id;
  select stripe_customer_id into v_cliente from public.clube_clientes_stripe where user_id = p_user;
  return jsonb_build_object('acao', 'criar', 'sessao_id', v_id, 'stripe_customer_id', v_cliente);
end $$;

create or replace function public.clube_checkout_cliente(p_user uuid, p_customer text, p_livemode boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  insert into public.clube_clientes_stripe (user_id, stripe_customer_id, livemode) values (p_user, p_customer, p_livemode)
  on conflict (user_id) do nothing;
  select stripe_customer_id into v from public.clube_clientes_stripe where user_id = p_user;
  return v;
end $$;

create or replace function public.clube_checkout_aberta(p_sessao uuid, p_stripe_session text, p_url text, p_expira timestamptz)
returns void language sql security definer set search_path = '' as $$
  update public.clube_checkout_sessoes set status = 'aberta', stripe_session_id = p_stripe_session, url = p_url,
    expira_em = p_expira, atualizado_em = now()
  where id = p_sessao and status = 'criando'
$$;

create or replace function public.clube_checkout_encerrar(p_sessao uuid, p_stripe_session text, p_status text, p_evento text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('expirada', 'falhou', 'cancelada') then perform public.clube_erro('status_invalido'); end if;
  update public.clube_checkout_sessoes set status = p_status, atualizado_em = now()
  where status in ('criando', 'aberta')
    and ((p_sessao is not null and id = p_sessao) or (p_stripe_session is not null and stripe_session_id = p_stripe_session));
  perform public.clube_evento_concluir(p_evento, 'processado');
end $$;

-- Espelha o estado atual da assinatura (obtido do Stripe na hora). Ordena por instante de leitura, não por evento.
create or replace function public.clube_sincronizar_assinatura(p jsonb, p_evento text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_id uuid;
begin
  select user_id into v_user from public.clube_clientes_stripe where stripe_customer_id = p ->> 'stripe_customer_id';
  if v_user is null then
    perform public.clube_registrar_excecao('cliente_stripe_desconhecido', p ->> 'stripe_subscription_id', null,
      jsonb_build_object('customer', p ->> 'stripe_customer_id'));
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'cliente_desconhecido');
  end if;
  perform 1 from public.clube_perfis where user_id = v_user for update;

  insert into public.clube_assinaturas as a (user_id, stripe_subscription_id, stripe_customer_id, plano_chave,
    stripe_price_id, status, cancelar_no_fim, cancelar_em, cancelada_em, encerrada_em, periodo_atual_inicio,
    periodo_atual_fim, livemode, criada_em, sincronizada_em)
  values (v_user, p ->> 'stripe_subscription_id', p ->> 'stripe_customer_id', p ->> 'plano_chave', p ->> 'stripe_price_id',
    p ->> 'status', coalesce((p ->> 'cancelar_no_fim')::boolean, false), (p ->> 'cancelar_em')::timestamptz,
    (p ->> 'cancelada_em')::timestamptz, (p ->> 'encerrada_em')::timestamptz, (p ->> 'periodo_atual_inicio')::timestamptz,
    (p ->> 'periodo_atual_fim')::timestamptz, (p ->> 'livemode')::boolean, (p ->> 'criada_em')::timestamptz,
    coalesce((p ->> 'obtido_em')::timestamptz, now()))
  on conflict (stripe_subscription_id) do update set
    plano_chave = excluded.plano_chave, stripe_price_id = excluded.stripe_price_id, status = excluded.status,
    cancelar_no_fim = excluded.cancelar_no_fim, cancelar_em = excluded.cancelar_em, cancelada_em = excluded.cancelada_em,
    encerrada_em = excluded.encerrada_em, periodo_atual_inicio = excluded.periodo_atual_inicio,
    periodo_atual_fim = excluded.periodo_atual_fim, sincronizada_em = excluded.sincronizada_em
  where a.sincronizada_em <= excluded.sincronizada_em and a.user_id = excluded.user_id
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.clube_assinaturas where stripe_subscription_id = p ->> 'stripe_subscription_id';
  end if;
  if p ->> 'plano_chave' is null then
    perform public.clube_registrar_excecao('preco_nao_permitido', p ->> 'stripe_subscription_id', v_user,
      jsonb_build_object('price', p ->> 'stripe_price_id'));
  end if;
  if (p ->> 'status') in ('active', 'trialing', 'past_due', 'unpaid') and exists (
      select 1 from public.clube_assinaturas a where a.user_id = v_user and a.id <> v_id
      and a.status in ('active', 'trialing', 'past_due', 'unpaid')) then
    perform public.clube_registrar_excecao('assinatura_duplicada', p ->> 'stripe_subscription_id', v_user, '{}'::jsonb);
  end if;
  perform public.clube_evento_concluir(p_evento, 'processado');
  return jsonb_build_object('resultado', 'ok', 'assinatura_id', v_id, 'user_id', v_user);
end $$;

-- Vincula a sessão de Checkout concluída ao usuário que a criou (IDs estáveis, nunca e-mail).
create or replace function public.clube_vincular_checkout(p jsonb, p_evento text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.clube_checkout_sessoes; v_cliente text;
begin
  select * into s from public.clube_checkout_sessoes where stripe_session_id = p ->> 'stripe_session_id' for update;
  if not found then
    perform public.clube_registrar_excecao('checkout_desconhecido', p ->> 'stripe_session_id', null, '{}'::jsonb);
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'desconhecido');
  end if;
  select stripe_customer_id into v_cliente from public.clube_clientes_stripe where user_id = s.user_id;
  if (p ->> 'client_reference_id') is distinct from s.user_id::text or (p ->> 'stripe_customer_id') is distinct from v_cliente then
    perform public.clube_registrar_excecao('checkout_divergente', s.stripe_session_id, s.user_id,
      jsonb_build_object('customer', p ->> 'stripe_customer_id'));
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'divergente');
  end if;
  update public.clube_checkout_sessoes set status = 'concluida', atualizado_em = now() where id = s.id;
  perform public.clube_evento_concluir(p_evento, 'processado');
  return jsonb_build_object('resultado', 'ok', 'user_id', s.user_id);
end $$;

-- Registra a fatura e, se elegível, concede o ciclo. Tudo numa transação; o evento só é concluído junto com os efeitos.
create or replace function public.clube_processar_fatura(p jsonb, p_evento text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_ass public.clube_assinaturas;
  v_plano public.clube_planos;
  v_fat public.clube_faturas;
  v_periodo uuid;
  v_elegivel boolean := coalesce((p ->> 'elegivel')::boolean, false);
  v_class text := p ->> 'classificacao';
  v_motivo text := p ->> 'motivo';
begin
  select user_id into v_user from public.clube_clientes_stripe where stripe_customer_id = p ->> 'stripe_customer_id';
  if v_user is null then
    perform public.clube_registrar_excecao('fatura_cliente_desconhecido', p ->> 'stripe_invoice_id', null, '{}'::jsonb);
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'cliente_desconhecido');
  end if;
  perform 1 from public.clube_perfis where user_id = v_user for update;

  if p ->> 'stripe_subscription_id' is not null then
    select * into v_ass from public.clube_assinaturas where stripe_subscription_id = p ->> 'stripe_subscription_id';
    if not found then perform public.clube_erro('assinatura_nao_sincronizada'); end if;
    if v_ass.user_id <> v_user then
      perform public.clube_registrar_excecao('fatura_usuario_divergente', p ->> 'stripe_invoice_id', v_user, '{}'::jsonb);
      perform public.clube_evento_concluir(p_evento, 'ignorado');
      return jsonb_build_object('resultado', 'divergente');
    end if;
  end if;

  -- Conferência repetida no banco: plano, moeda e valor precisam bater com a tabela de planos.
  if v_elegivel then
    select * into v_plano from public.clube_planos where chave = p ->> 'plano_chave';
    if v_plano.chave is null or v_ass.id is null or (p ->> 'moeda') is distinct from v_plano.moeda
       or (p ->> 'valor_pago_centavos')::integer < v_plano.valor_centavos
       or (p ->> 'periodo_inicio') is null or (p ->> 'periodo_fim') is null then
      v_elegivel := false; v_class := 'invalida'; v_motivo := 'Conferência do banco não confirmou plano/valor/período';
    end if;
  end if;

  insert into public.clube_faturas as fa (stripe_invoice_id, user_id, assinatura_id, stripe_subscription_id, plano_chave,
    stripe_price_id, billing_reason, moeda, total_centavos, valor_pago_centavos, status, periodo_inicio, periodo_fim, pago_em,
    stripe_payment_intent_id, stripe_charge_id, classificacao, elegivel, motivo, livemode)
  values (p ->> 'stripe_invoice_id', v_user, v_ass.id, p ->> 'stripe_subscription_id', p ->> 'plano_chave',
    p ->> 'stripe_price_id', p ->> 'billing_reason', p ->> 'moeda', (p ->> 'total_centavos')::integer,
    (p ->> 'valor_pago_centavos')::integer, p ->> 'status', (p ->> 'periodo_inicio')::timestamptz,
    (p ->> 'periodo_fim')::timestamptz, (p ->> 'pago_em')::timestamptz, p ->> 'stripe_payment_intent_id',
    p ->> 'stripe_charge_id', v_class, v_elegivel, v_motivo, (p ->> 'livemode')::boolean)
  on conflict (stripe_invoice_id) do update set
    status = excluded.status, valor_pago_centavos = excluded.valor_pago_centavos, total_centavos = excluded.total_centavos,
    pago_em = coalesce(excluded.pago_em, fa.pago_em),
    stripe_payment_intent_id = coalesce(excluded.stripe_payment_intent_id, fa.stripe_payment_intent_id),
    stripe_charge_id = coalesce(excluded.stripe_charge_id, fa.stripe_charge_id),
    classificacao = case when exists (select 1 from public.clube_periodos pe where pe.fatura_id = fa.id)
      then fa.classificacao else excluded.classificacao end,
    elegivel = fa.elegivel or excluded.elegivel,
    motivo = case when exists (select 1 from public.clube_periodos pe where pe.fatura_id = fa.id)
      then fa.motivo else excluded.motivo end,
    atualizada_em = now()
  returning * into v_fat;

  if v_elegivel then
    v_periodo := public.clube_conceder_periodo(v_fat.id, 'stripe', null);
  elsif v_fat.status = 'paid' and v_class in ('zerada', 'fora_do_periodo', 'fora_do_fluxo', 'invalida', 'ajuste', 'proporcional') then
    perform public.clube_registrar_excecao('fatura_sem_beneficio', v_fat.stripe_invoice_id, v_user,
      jsonb_build_object('classificacao', v_class, 'motivo', v_motivo));
  end if;

  perform public.clube_evento_concluir(p_evento, 'processado');
  return jsonb_build_object('resultado', 'ok', 'fatura_id', v_fat.id, 'periodo_id', v_periodo, 'classificacao', v_fat.classificacao);
end $$;

create or replace function public.clube_bloquear_beneficios(p_fatura uuid, p_motivo text) returns void
language sql security definer set search_path = '' as $$
  update public.clube_credito_lotes set bloqueado = true, bloqueio_motivo = p_motivo
  where fatura_id = p_fatura and coalesce(bloqueio_motivo, '') <> 'reembolso'
$$;

-- Reembolso total ou disputa perdida: bloqueia, reverte o que não foi usado e sinaliza o que já foi consumido/enviado.
create or replace function public.clube_estornar_beneficios(p_fatura uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.clube_credito_lotes; c public.clube_caixas;
begin
  for l in select * from public.clube_credito_lotes where fatura_id = p_fatura order by id for update loop
    update public.clube_credito_lotes set bloqueado = true, bloqueio_motivo = 'reembolso' where id = l.id;
    perform public.clube_lote_movimentar(l.id, 'reversao', l.disponivel_centavos, null, p_motivo, null);
    if l.reservado_centavos > 0 or l.usado_centavos > 0 then
      perform public.clube_registrar_excecao('beneficio_usado_em_cobranca_estornada', l.id::text, l.user_id,
        jsonb_build_object('usado_centavos', l.usado_centavos, 'reservado_centavos', l.reservado_centavos, 'tipo', l.tipo));
    end if;
  end loop;
  for c in select cx.* from public.clube_caixas cx join public.clube_periodos pe on pe.id = cx.periodo_id
           where pe.fatura_id = p_fatura for update of cx loop
    if c.status = 'aguardando_programacao' then
      update public.clube_caixas set status = 'excecao', atualizado_em = now(),
        observacao = 'Cobrança reembolsada/contestada: não enviar sem análise' where id = c.id;
    elsif c.status <> 'excecao' then
      perform public.clube_registrar_excecao('caixa_processada_em_cobranca_estornada', c.id::text, c.user_id,
        jsonb_build_object('status', c.status));
    end if;
  end loop;
  update public.clube_indicacoes set status = 'revertida', motivo = p_motivo, atualizada_em = now()
  where fatura_id = p_fatura and status in ('recompensada', 'em_analise');
end $$;

create or replace function public.clube_localizar_fatura(p_charge text, p_pi text) returns public.clube_faturas
language sql stable security definer set search_path = '' as $$
  select f from public.clube_faturas f
  where (p_charge is not null and f.stripe_charge_id = p_charge) or (p_pi is not null and f.stripe_payment_intent_id = p_pi)
  order by f.registrada_em limit 1
$$;

create or replace function public.clube_registrar_reembolso(p jsonb, p_evento text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.clube_faturas; pe public.clube_periodos; x jsonb;
begin
  f := public.clube_localizar_fatura(p ->> 'stripe_charge_id', p ->> 'stripe_payment_intent_id');
  if f.id is null then
    perform public.clube_registrar_excecao('reembolso_sem_fatura', p ->> 'stripe_charge_id', null, '{}'::jsonb);
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'sem_fatura');
  end if;
  perform 1 from public.clube_perfis where user_id = f.user_id for update;

  for x in select * from jsonb_array_elements(coalesce(p -> 'reembolsos', '[]'::jsonb)) loop
    insert into public.clube_ocorrencias_pagamento (fatura_id, tipo, stripe_id, stripe_charge_id, valor_centavos, status, motivo)
    values (f.id, 'reembolso', x ->> 'id', p ->> 'stripe_charge_id', (x ->> 'valor_centavos')::integer, x ->> 'status', x ->> 'motivo')
    on conflict (stripe_id) do update set valor_centavos = excluded.valor_centavos, status = excluded.status, atualizado_em = now();
  end loop;

  update public.clube_faturas set valor_reembolsado_centavos = (p ->> 'valor_reembolsado_centavos')::integer, atualizada_em = now()
  where id = f.id returning * into f;
  select * into pe from public.clube_periodos where fatura_id = f.id for update;

  if f.valor_reembolsado_centavos > 0 and f.valor_reembolsado_centavos >= f.valor_pago_centavos then
    if pe.id is not null and pe.situacao not in ('reembolsado', 'disputa_perdida') then
      update public.clube_periodos set situacao = 'reembolsado' where id = pe.id;
    end if;
    perform public.clube_estornar_beneficios(f.id, 'Cobrança reembolsada');
  elsif f.valor_reembolsado_centavos > 0 then
    if pe.id is not null and pe.situacao = 'pago' then
      update public.clube_periodos set situacao = 'reembolso_parcial' where id = pe.id;
    end if;
    perform public.clube_bloquear_beneficios(f.id, 'reembolso_parcial');
    perform public.clube_registrar_excecao('reembolso_parcial', f.stripe_invoice_id, f.user_id,
      jsonb_build_object('reembolsado_centavos', f.valor_reembolsado_centavos, 'pago_centavos', f.valor_pago_centavos));
  end if;
  perform public.clube_evento_concluir(p_evento, 'processado');
  return jsonb_build_object('resultado', 'ok', 'fatura_id', f.id);
end $$;

create or replace function public.clube_registrar_disputa(p jsonb, p_evento text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f public.clube_faturas; pe public.clube_periodos;
  v_status text := p ->> 'status';
  v_aberta boolean := (p ->> 'status') in ('needs_response', 'under_review', 'warning_needs_response', 'warning_under_review');
begin
  f := public.clube_localizar_fatura(p ->> 'stripe_charge_id', p ->> 'stripe_payment_intent_id');
  if f.id is null then
    perform public.clube_registrar_excecao('disputa_sem_fatura', p ->> 'stripe_dispute_id', null, '{}'::jsonb);
    perform public.clube_evento_concluir(p_evento, 'ignorado');
    return jsonb_build_object('resultado', 'sem_fatura');
  end if;
  perform 1 from public.clube_perfis where user_id = f.user_id for update;

  insert into public.clube_ocorrencias_pagamento (fatura_id, tipo, stripe_id, stripe_charge_id, valor_centavos, status, motivo)
  values (f.id, 'disputa', p ->> 'stripe_dispute_id', p ->> 'stripe_charge_id', (p ->> 'valor_centavos')::integer, v_status, p ->> 'motivo')
  on conflict (stripe_id) do update set status = excluded.status, valor_centavos = excluded.valor_centavos, atualizado_em = now();
  update public.clube_faturas set em_disputa = v_aberta, atualizada_em = now() where id = f.id;
  select * into pe from public.clube_periodos where fatura_id = f.id for update;

  if v_aberta then
    if pe.id is not null and pe.situacao in ('pago', 'reembolso_parcial') then
      update public.clube_periodos set situacao = 'em_disputa' where id = pe.id;
    end if;
    perform public.clube_bloquear_beneficios(f.id, 'disputa');
    perform public.clube_registrar_excecao('disputa_aberta', p ->> 'stripe_dispute_id', f.user_id,
      jsonb_build_object('status', v_status, 'valor_centavos', (p ->> 'valor_centavos')::integer));
  elsif v_status = 'lost' then
    if pe.id is not null then update public.clube_periodos set situacao = 'disputa_perdida' where id = pe.id; end if;
    perform public.clube_estornar_beneficios(f.id, 'Disputa perdida');
  else
    if pe.id is not null and pe.situacao = 'em_disputa' then
      update public.clube_periodos set situacao = case when f.valor_reembolsado_centavos > 0 then 'reembolso_parcial' else 'pago' end
      where id = pe.id;
    end if;
    update public.clube_credito_lotes set
      bloqueado = f.valor_reembolsado_centavos > 0,
      bloqueio_motivo = case when f.valor_reembolsado_centavos > 0 then 'reembolso_parcial' end
    where fatura_id = f.id and bloqueio_motivo = 'disputa';
  end if;
  perform public.clube_evento_concluir(p_evento, 'processado');
  return jsonb_build_object('resultado', 'ok', 'fatura_id', f.id);
end $$;

/* =========================================================================================
   Resgate assistido de créditos (sem loja online)
   ========================================================================================= */

create or replace function public.clube_calcular_resgate(p_user uuid, p_subtotal integer, p_em timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  pol public.clube_politicas := public.clube_politica_atual();
  v_bps integer := 0; v_desc integer; v_liq integer; v_disp integer; v_cred integer;
begin
  if (public.clube_beneficio_vigente(p_user, p_em)).id is not null then
    v_bps := (pol.dados ->> 'desconto_bps')::integer;
  end if;
  v_desc := ((p_subtotal::bigint * v_bps + 5000) / 10000)::integer;
  v_liq := p_subtotal - v_desc;
  v_disp := public.clube_saldo_disponivel(p_user, p_em);
  v_cred := least(v_liq, v_disp);
  return jsonb_build_object('subtotal_centavos', p_subtotal, 'desconto_bps', v_bps, 'desconto_centavos', v_desc,
    'liquido_centavos', v_liq, 'credito_disponivel_centavos', v_disp, 'credito_centavos', v_cred,
    'a_pagar_centavos', v_liq - v_cred, 'politica_versao', pol.versao);
end $$;

create or replace function public.clube_simular_resgate(p_subtotal integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_subtotal is null or p_subtotal < 100 or p_subtotal > 10000000 then perform public.clube_erro('valor_invalido'); end if;
  return public.clube_calcular_resgate(public.clube_exigir_usuario(), p_subtotal, now());
end $$;

create or replace function public.clube_solicitar_resgate(p_subtotal integer, p_descricao text, p_chave uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.clube_exigir_usuario();
  pol public.clube_politicas := public.clube_politica_atual();
  r public.clube_resgates; c jsonb; l record;
  v_rest integer; v_take integer; v_ordem integer := 0;
begin
  if p_chave is null then perform public.clube_erro('requisicao_invalida'); end if;
  if p_subtotal is null or p_subtotal < 100 or p_subtotal > 10000000 then perform public.clube_erro('valor_invalido'); end if;
  if char_length(btrim(coalesce(p_descricao, ''))) not between 2 and 300 then perform public.clube_erro('descricao_invalida'); end if;

  perform 1 from public.clube_perfis where user_id = v_user for update;
  if not found then perform public.clube_erro('perfil_incompleto'); end if;
  select * into r from public.clube_resgates where user_id = v_user and chave_idempotencia = p_chave;
  if found then return to_jsonb(r); end if;
  perform public.clube_exigir_limite('resgate:' || v_user, 10, interval '1 hour');

  c := public.clube_calcular_resgate(v_user, p_subtotal, now());
  if (c ->> 'credito_centavos')::integer = 0 and (c ->> 'desconto_centavos')::integer = 0 then
    perform public.clube_erro('sem_beneficio');
  end if;

  insert into public.clube_resgates (user_id, chave_idempotencia, descricao, subtotal_solicitado_centavos, desconto_bps,
    credito_reservado_centavos, reserva_expira_em, politica_versao)
  values (v_user, p_chave, btrim(p_descricao), p_subtotal, (c ->> 'desconto_bps')::integer, (c ->> 'credito_centavos')::integer,
    now() + make_interval(hours => (pol.dados ->> 'reserva_resgate_horas')::integer), pol.versao)
  returning * into r;

  v_rest := r.credito_reservado_centavos;
  for l in select id, disponivel_centavos from public.clube_credito_lotes
           where user_id = v_user and not bloqueado and disponivel_centavos > 0 and inicio <= now()
             and (expira_em is null or expira_em > now())
           order by expira_em asc nulls last, criado_em, id
           for update loop
    exit when v_rest <= 0;
    v_take := least(v_rest, l.disponivel_centavos);
    v_ordem := v_ordem + 1;
    insert into public.clube_resgate_alocacoes (resgate_id, lote_id, ordem, reservado_centavos) values (r.id, l.id, v_ordem, v_take);
    perform public.clube_lote_movimentar(l.id, 'reserva', v_take, r.id, 'Reserva para resgate', v_user);
    v_rest := v_rest - v_take;
  end loop;
  if v_rest > 0 then perform public.clube_erro('saldo_alterado'); end if;
  return to_jsonb(r);
end $$;

-- Devolve o que ainda está reservado. Crédito devolvido mantém a validade original e não renasce se já venceu.
create or replace function public.clube_liberar_alocacoes(p_resgate uuid, p_motivo text, p_autor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.clube_resgate_alocacoes; l public.clube_credito_lotes; v_livre integer;
begin
  for a in select * from public.clube_resgate_alocacoes where resgate_id = p_resgate order by ordem for update loop
    v_livre := a.reservado_centavos - a.consumido_centavos - a.liberado_centavos;
    continue when v_livre <= 0;
    update public.clube_resgate_alocacoes set liberado_centavos = liberado_centavos + v_livre
    where resgate_id = a.resgate_id and lote_id = a.lote_id;
    perform public.clube_lote_movimentar(a.lote_id, 'liberacao', v_livre, p_resgate, p_motivo, p_autor);
    select * into l from public.clube_credito_lotes where id = a.lote_id;
    if l.expira_em is not null and l.expira_em <= now() then
      perform public.clube_lote_movimentar(l.id, 'expiracao', v_livre, p_resgate, 'Crédito devolvido já estava vencido', null);
    elsif l.bloqueado and l.bloqueio_motivo = 'reembolso' then
      perform public.clube_lote_movimentar(l.id, 'reversao', v_livre, p_resgate, 'Crédito devolvido de cobrança estornada', null);
    end if;
  end loop;
end $$;

create or replace function public.clube_encerrar_resgate(p_resgate uuid, p_status text, p_motivo text, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.clube_resgates; v_user uuid;
begin
  select user_id into v_user from public.clube_resgates where id = p_resgate;
  if v_user is null then perform public.clube_erro('resgate_inexistente'); end if;
  perform 1 from public.clube_perfis where user_id = v_user for update;
  select * into r from public.clube_resgates where id = p_resgate for update;
  if r.status <> 'reservado' then return to_jsonb(r); end if;
  perform public.clube_liberar_alocacoes(r.id, p_motivo, p_autor);
  update public.clube_resgates set status = p_status, encerrado_em = now(), encerramento_motivo = p_motivo
  where id = r.id returning * into r;
  return to_jsonb(r);
end $$;

create or replace function public.clube_cancelar_resgate(p_resgate uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.clube_exigir_usuario();
begin
  if not exists (select 1 from public.clube_resgates where id = p_resgate and user_id = v_user) then
    perform public.clube_erro('resgate_inexistente');
  end if;
  return public.clube_encerrar_resgate(p_resgate, 'cancelado', 'Cancelado pelo membro', v_user);
end $$;

/* =========================================================================================
   Eventos presenciais (somente Club com ciclo pago)
   ========================================================================================= */

create or replace function public.clube_evento_reservar(p_evento uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.clube_exigir_usuario();
  e public.clube_eventos; v_ocupadas integer; v_res public.clube_evento_reservas; pe public.clube_periodos;
begin
  select * into e from public.clube_eventos where id = p_evento for update;
  if not found or e.status <> 'publicado' then perform public.clube_erro('evento_indisponivel'); end if;
  if e.inicio <= now() then perform public.clube_erro('evento_encerrado'); end if;
  pe := public.clube_beneficio_vigente(v_user, now());
  if pe.id is null or pe.plano_chave <> 'ha_club' then perform public.clube_erro('exclusivo_club'); end if;
  select * into v_res from public.clube_evento_reservas where evento_id = e.id and user_id = v_user;
  if v_res.status = 'confirmada' then return to_jsonb(v_res); end if;
  if e.capacidade is not null then
    select count(*) into v_ocupadas from public.clube_evento_reservas where evento_id = e.id and status = 'confirmada';
    if v_ocupadas >= e.capacidade then perform public.clube_erro('evento_lotado'); end if;
  end if;
  insert into public.clube_evento_reservas as r (evento_id, user_id) values (e.id, v_user)
  on conflict (evento_id, user_id) do update set status = 'confirmada', atualizado_em = now()
  returning * into v_res;
  return to_jsonb(v_res);
end $$;

create or replace function public.clube_evento_cancelar(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.clube_exigir_usuario();
begin
  update public.clube_evento_reservas set status = 'cancelada', atualizado_em = now()
  where evento_id = p_evento and user_id = v_user and status = 'confirmada'
    and exists (select 1 from public.clube_eventos e where e.id = p_evento and e.inicio > now());
end $$;

/* =========================================================================================
   Situação do membro (uma chamada para a visão geral)
   ========================================================================================= */

create or replace function public.clube_minha_situacao() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.clube_exigir_usuario();
  v_perfil public.clube_perfis; v_end public.clube_enderecos; v_ass public.clube_assinaturas;
  pe public.clube_periodos; v_saldos jsonb; v_sessao public.clube_checkout_sessoes; v_ind public.clube_indicacoes;
begin
  select * into v_perfil from public.clube_perfis where user_id = v_user;
  select * into v_end from public.clube_enderecos where user_id = v_user;
  select * into v_ass from public.clube_assinaturas where user_id = v_user
    order by (status in ('active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused')) desc, criada_em desc limit 1;
  pe := public.clube_beneficio_vigente(v_user, now());
  select * into v_sessao from public.clube_checkout_sessoes where user_id = v_user order by criado_em desc limit 1;
  select * into v_ind from public.clube_indicacoes where indicado_id = v_user;
  select jsonb_object_agg(t.tipo, jsonb_build_object(
      'disponivel', t.disponivel, 'reservado', t.reservado, 'usado', t.usado, 'expirado', t.expirado,
      'revertido', t.revertido, 'bloqueado', t.bloqueado, 'proximo_vencimento', t.proximo_vencimento))
  into v_saldos
  from (
    select l.tipo,
      sum(case when not l.bloqueado and (l.expira_em is null or l.expira_em > now()) and l.inicio <= now()
               then l.disponivel_centavos else 0 end) as disponivel,
      sum(l.reservado_centavos) as reservado,
      sum(l.usado_centavos) as usado,
      sum(l.expirado_centavos + case when l.expira_em <= now() then l.disponivel_centavos else 0 end) as expirado,
      sum(l.revertido_centavos) as revertido,
      sum(case when l.bloqueado and (l.expira_em is null or l.expira_em > now()) then l.disponivel_centavos else 0 end) as bloqueado,
      min(l.expira_em) filter (where l.expira_em > now() and l.disponivel_centavos > 0 and not l.bloqueado) as proximo_vencimento
    from public.clube_credito_lotes l where l.user_id = v_user group by l.tipo
  ) t;

  return jsonb_build_object(
    'perfil', case when v_perfil.user_id is null then null else jsonb_build_object(
      'nome', v_perfil.nome, 'telefone', v_perfil.telefone, 'nascimento', v_perfil.nascimento,
      'codigo_indicacao', v_perfil.codigo_indicacao) end,
    'endereco', case when v_end.user_id is null then null else to_jsonb(v_end) - 'user_id' end,
    'perfil_completo', coalesce(v_perfil.nome <> '' and v_perfil.telefone is not null and v_perfil.nascimento is not null
      and v_end.user_id is not null, false),
    'assinatura', case when v_ass.id is null then null else jsonb_build_object(
      'plano', v_ass.plano_chave, 'status', v_ass.status, 'cancelar_no_fim', v_ass.cancelar_no_fim,
      'cancelar_em', v_ass.cancelar_em, 'periodo_atual_inicio', v_ass.periodo_atual_inicio,
      'periodo_atual_fim', v_ass.periodo_atual_fim, 'encerrada_em', v_ass.encerrada_em) end,
    'beneficio_vigente', case when pe.id is null then null else jsonb_build_object(
      'plano', pe.plano_chave, 'inicio', pe.inicio, 'fim', pe.fim, 'situacao', pe.situacao) end,
    'saldos', coalesce(v_saldos, '{}'::jsonb),
    'checkout', case when v_sessao.id is null then null else jsonb_build_object(
      'status', v_sessao.status, 'plano', v_sessao.plano_chave, 'criado_em', v_sessao.criado_em) end,
    'indicado', v_ind.id is not null,
    'tem_cliente_stripe', exists (select 1 from public.clube_clientes_stripe c where c.user_id = v_user),
    'admin', exists (select 1 from public.clube_admins a where a.user_id = v_user)
  );
end $$;

/* =========================================================================================
   Rotina periódica (Supabase Cron): vencimentos, reservas expiradas, sessões abandonadas
   ========================================================================================= */

create or replace function public.clube_job_manutencao() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_job bigint; r record; l record;
  n_res integer := 0; n_lot integer := 0; n_ses integer := 0; v_out jsonb;
begin
  insert into public.clube_execucoes_job (job) values ('manutencao') returning id into v_job;
  for r in select id from public.clube_resgates where status = 'reservado' and reserva_expira_em <= now()
           order by reserva_expira_em limit 500 loop
    perform public.clube_encerrar_resgate(r.id, 'expirado', 'Reserva vencida sem confirmação', null);
    n_res := n_res + 1;
  end loop;
  for l in select id, disponivel_centavos from public.clube_credito_lotes
           where disponivel_centavos > 0 and expira_em <= now() order by expira_em limit 2000 for update skip locked loop
    perform public.clube_lote_movimentar(l.id, 'expiracao', l.disponivel_centavos, null, 'Validade encerrada', null);
    n_lot := n_lot + 1;
  end loop;
  update public.clube_checkout_sessoes set status = case when status = 'criando' then 'falhou' else 'expirada' end,
    atualizado_em = now()
  where (status = 'criando' and criado_em < now() - interval '10 minutes') or (status = 'aberta' and expira_em <= now());
  get diagnostics n_ses = row_count;
  delete from public.clube_limites where janela_inicio < now() - interval '1 day';
  v_out := jsonb_build_object('resgates_expirados', n_res, 'lotes_expirados', n_lot, 'sessoes_encerradas', n_ses);
  update public.clube_execucoes_job set concluido_em = now(), resultado = v_out where id = v_job;
  return v_out;
end $$;

/* =========================================================================================
   Administração (exige papel em clube_admins; toda ação fica na auditoria)
   ========================================================================================= */

create or replace function public.clube_admin_confirmar_resgate(p_resgate uuid, p_subtotal integer, p_forma text,
  p_referencia text, p_observacao text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.clube_exigir_admin();
  r public.clube_resgates; a public.clube_resgate_alocacoes; v_user uuid;
  v_desc integer; v_liq integer; v_usar integer; v_rest integer; v_cons integer; v_pagar integer;
begin
  select user_id into v_user from public.clube_resgates where id = p_resgate;
  if v_user is null then perform public.clube_erro('resgate_inexistente'); end if;
  perform 1 from public.clube_perfis where user_id = v_user for update;
  select * into r from public.clube_resgates where id = p_resgate for update;
  if r.status = 'confirmado' then return jsonb_build_object('ok', true, 'repetido', true, 'resgate', to_jsonb(r)); end if;
  if r.status <> 'reservado' then perform public.clube_erro('resgate_encerrado'); end if;
  if r.reserva_expira_em <= now() then
    perform public.clube_encerrar_resgate(r.id, 'expirado', 'Reserva vencida antes da confirmação', v_admin);
    return jsonb_build_object('ok', false, 'erro', 'reserva_expirada');
  end if;
  if p_subtotal is null or p_subtotal < 1 or p_subtotal > 10000000 then perform public.clube_erro('valor_invalido'); end if;
  if exists (select 1 from public.clube_resgate_alocacoes x join public.clube_credito_lotes l on l.id = x.lote_id
             where x.resgate_id = r.id and l.bloqueado) then
    perform public.clube_erro('credito_bloqueado');
  end if;

  v_desc := ((p_subtotal::bigint * r.desconto_bps + 5000) / 10000)::integer;
  v_liq := p_subtotal - v_desc;
  v_usar := least(v_liq, r.credito_reservado_centavos);
  v_pagar := v_liq - v_usar;
  if v_pagar > 0 and coalesce(p_forma, 'nenhum') not in ('pix', 'dinheiro', 'cartao_maquininha', 'outro') then
    perform public.clube_erro('pagamento_complementar_obrigatorio');
  end if;

  v_rest := v_usar;
  for a in select * from public.clube_resgate_alocacoes where resgate_id = r.id order by ordem for update loop
    v_cons := least(v_rest, a.reservado_centavos);
    exit when v_cons <= 0;
    update public.clube_resgate_alocacoes set consumido_centavos = v_cons where resgate_id = a.resgate_id and lote_id = a.lote_id;
    perform public.clube_lote_movimentar(a.lote_id, 'consumo', v_cons, r.id, 'Resgate confirmado na loja', v_admin);
    v_rest := v_rest - v_cons;
  end loop;
  perform public.clube_liberar_alocacoes(r.id, 'Sobra da reserva devolvida', v_admin);

  update public.clube_resgates set status = 'confirmado', subtotal_confirmado_centavos = p_subtotal,
    desconto_centavos = v_desc, credito_usado_centavos = v_usar, a_pagar_centavos = v_pagar,
    pagamento_complementar_forma = case when v_pagar > 0 then p_forma else 'nenhum' end,
    pagamento_complementar_ref = nullif(btrim(coalesce(p_referencia, '')), ''),
    confirmado_por = v_admin, confirmado_em = now(), encerrado_em = now(),
    encerramento_motivo = nullif(btrim(coalesce(p_observacao, '')), '')
  where id = r.id returning * into r;
  perform public.clube_auditar(v_admin, 'resgate_confirmado', 'resgate', r.id::text, p_observacao,
    jsonb_build_object('subtotal', p_subtotal, 'credito', v_usar, 'a_pagar', v_pagar, 'forma', r.pagamento_complementar_forma));
  return jsonb_build_object('ok', true, 'resgate', to_jsonb(r));
end $$;

create or replace function public.clube_admin_cancelar_resgate(p_resgate uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); v jsonb;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 3 then perform public.clube_erro('motivo_obrigatorio'); end if;
  v := public.clube_encerrar_resgate(p_resgate, 'cancelado', p_motivo, v_admin);
  perform public.clube_auditar(v_admin, 'resgate_cancelado', 'resgate', p_resgate::text, p_motivo, '{}'::jsonb);
  return v;
end $$;

create or replace function public.clube_admin_caixa_atualizar(p_caixa uuid, p_status text, p_observacao text,
  p_atualizar_endereco boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); c public.clube_caixas; v_end public.clube_enderecos; v_perfil public.clube_perfis;
begin
  select * into c from public.clube_caixas where id = p_caixa for update;
  if not found then perform public.clube_erro('caixa_inexistente'); end if;
  if p_status not in ('aguardando_programacao', 'em_preparo', 'enviada', 'entregue', 'excecao') then
    perform public.clube_erro('status_invalido');
  end if;
  if coalesce(p_atualizar_endereco, false) then
    if c.status not in ('aguardando_programacao', 'em_preparo', 'excecao') then perform public.clube_erro('caixa_ja_enviada'); end if;
    select * into v_end from public.clube_enderecos where user_id = c.user_id;
    select * into v_perfil from public.clube_perfis where user_id = c.user_id;
    if v_end.user_id is null then perform public.clube_erro('endereco_inexistente'); end if;
    update public.clube_caixas set endereco = jsonb_build_object('cep', v_end.cep, 'logradouro', v_end.logradouro,
      'numero', v_end.numero, 'complemento', v_end.complemento, 'bairro', v_end.bairro, 'cidade', v_end.cidade,
      'uf', v_end.uf, 'referencia', v_end.referencia),
      destinatario_nome = coalesce(nullif(v_end.destinatario, ''), nullif(v_perfil.nome, ''), destinatario_nome)
    where id = c.id;
  end if;
  update public.clube_caixas set status = p_status, observacao = nullif(btrim(coalesce(p_observacao, '')), ''),
    atualizado_em = now() where id = c.id;
  perform public.clube_auditar(v_admin, 'caixa_atualizada', 'caixa', c.id::text, p_observacao,
    jsonb_build_object('de', c.status, 'para', p_status, 'endereco_atualizado', coalesce(p_atualizar_endereco, false)));
end $$;

create or replace function public.clube_admin_sabor_salvar(p_competencia text, p_nome text, p_descricao text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); v_id uuid;
begin
  insert into public.clube_sabores_mes as s (competencia, nome, descricao, criado_por)
  values (p_competencia, btrim(p_nome), nullif(btrim(coalesce(p_descricao, '')), ''), v_admin)
  on conflict (competencia) do update set nome = excluded.nome, descricao = excluded.descricao
  returning id into v_id;
  update public.clube_caixas set sabor_id = v_id, atualizado_em = now()
  where competencia = p_competencia and sabor_id is null;
  perform public.clube_auditar(v_admin, 'sabor_salvo', 'sabor', v_id::text, null,
    jsonb_build_object('competencia', p_competencia, 'nome', p_nome));
  return v_id;
end $$;

create or replace function public.clube_admin_indicacao_decidir(p_indicacao uuid, p_aprovar boolean, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); i public.clube_indicacoes;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 3 then perform public.clube_erro('motivo_obrigatorio'); end if;
  select * into i from public.clube_indicacoes where id = p_indicacao for update;
  if not found then perform public.clube_erro('indicacao_inexistente'); end if;
  if i.status not in ('em_analise', 'inelegivel') then perform public.clube_erro('indicacao_sem_pendencia'); end if;
  if p_aprovar then
    if i.fatura_id is null then perform public.clube_erro('indicacao_sem_pagamento'); end if;
    perform public.clube_conceder_indicacao(i.id, i.fatura_id, v_admin, 'Aprovada pela loja: ' || btrim(p_motivo));
  else
    update public.clube_indicacoes set status = 'rejeitada', motivo = btrim(p_motivo), atualizada_em = now() where id = i.id;
  end if;
  perform public.clube_auditar(v_admin, case when p_aprovar then 'indicacao_aprovada' else 'indicacao_rejeitada' end,
    'indicacao', i.id::text, p_motivo, '{}'::jsonb);
end $$;

create or replace function public.clube_admin_estornar_credito(p_lote uuid, p_valor integer, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); l public.clube_credito_lotes;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 5 then perform public.clube_erro('motivo_obrigatorio'); end if;
  select * into l from public.clube_credito_lotes where id = p_lote;
  if not found then perform public.clube_erro('lote_inexistente'); end if;
  perform 1 from public.clube_perfis where user_id = l.user_id for update;
  select * into l from public.clube_credito_lotes where id = p_lote for update;
  if p_valor is null or p_valor <= 0 or p_valor > l.disponivel_centavos then perform public.clube_erro('valor_invalido'); end if;
  perform public.clube_lote_movimentar(l.id, 'reversao', p_valor, null, 'Ajuste da loja: ' || btrim(p_motivo), v_admin);
  perform public.clube_auditar(v_admin, 'credito_estornado', 'lote', l.id::text, p_motivo, jsonb_build_object('valor', p_valor));
end $$;

create or replace function public.clube_admin_creditar(p_user uuid, p_valor integer, p_motivo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.clube_exigir_admin();
  pol public.clube_politicas := public.clube_politica_atual();
  v_ref uuid := gen_random_uuid(); v_lote uuid;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 5 then perform public.clube_erro('motivo_obrigatorio'); end if;
  if p_valor is null or p_valor <= 0 or p_valor > (pol.dados ->> 'ajuste_admin_max_centavos')::integer then
    perform public.clube_erro('valor_invalido');
  end if;
  if not exists (select 1 from public.clube_perfis where user_id = p_user) then perform public.clube_erro('membro_inexistente'); end if;
  v_lote := public.clube_criar_lote(p_user, 'referral', p_valor, now(), null, 'ajuste_admin', v_ref, null, pol.versao,
    'Ajuste da loja: ' || btrim(p_motivo), v_admin);
  perform public.clube_auditar(v_admin, 'credito_concedido', 'lote', v_lote::text, p_motivo,
    jsonb_build_object('user_id', p_user, 'valor', p_valor));
  return v_lote;
end $$;

create or replace function public.clube_admin_lote_desbloquear(p_lote uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); l public.clube_credito_lotes;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 5 then perform public.clube_erro('motivo_obrigatorio'); end if;
  select * into l from public.clube_credito_lotes where id = p_lote for update;
  if not found or not l.bloqueado then perform public.clube_erro('lote_sem_bloqueio'); end if;
  if l.bloqueio_motivo = 'reembolso' then perform public.clube_erro('lote_estornado'); end if;
  update public.clube_credito_lotes set bloqueado = false, bloqueio_motivo = null where id = l.id;
  perform public.clube_auditar(v_admin, 'lote_desbloqueado', 'lote', l.id::text, p_motivo,
    jsonb_build_object('motivo_anterior', l.bloqueio_motivo));
end $$;

-- Concessão manual para fatura que caiu em exceção (ex.: linhas extras). Usa a mesma rotina idempotente do webhook.
create or replace function public.clube_admin_conceder_fatura(p_fatura uuid, p_motivo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); f public.clube_faturas; v_plano public.clube_planos; v_id uuid;
begin
  if char_length(btrim(coalesce(p_motivo, ''))) < 5 then perform public.clube_erro('motivo_obrigatorio'); end if;
  select * into f from public.clube_faturas where id = p_fatura;
  if not found then perform public.clube_erro('fatura_inexistente'); end if;
  perform 1 from public.clube_perfis where user_id = f.user_id for update;
  select * into f from public.clube_faturas where id = p_fatura for update;
  select * into v_plano from public.clube_planos where chave = f.plano_chave;
  if f.status <> 'paid' or f.valor_pago_centavos < coalesce(v_plano.valor_centavos, 1) or f.valor_reembolsado_centavos > 0
     or f.em_disputa or f.assinatura_id is null or f.periodo_inicio is null then
    perform public.clube_erro('fatura_nao_elegivel');
  end if;
  update public.clube_faturas set elegivel = true, motivo = 'Concessão manual: ' || btrim(p_motivo), atualizada_em = now()
  where id = f.id;
  v_id := public.clube_conceder_periodo(f.id, 'admin', v_admin);
  if v_id is null then perform public.clube_erro('periodo_sobreposto'); end if;
  perform public.clube_auditar(v_admin, 'fatura_concedida_manual', 'fatura', f.id::text, p_motivo,
    jsonb_build_object('periodo_id', v_id));
  return v_id;
end $$;

create or replace function public.clube_admin_aniversario_registrar(p_user uuid, p_ano integer, p_status text,
  p_tipo_presente text, p_observacao text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); v_id uuid; v_nasc date;
begin
  select nascimento into v_nasc from public.clube_perfis where user_id = p_user;
  if v_nasc is null then perform public.clube_erro('nascimento_ausente'); end if;
  insert into public.clube_aniversarios (user_id, ano, status, tipo_presente, observacao, registrado_por)
  values (p_user, p_ano, p_status, btrim(p_tipo_presente), nullif(btrim(coalesce(p_observacao, '')), ''), v_admin)
  on conflict (user_id, ano) do nothing returning id into v_id;
  if v_id is null then perform public.clube_erro('presente_ja_registrado'); end if;
  perform public.clube_auditar(v_admin, 'aniversario_registrado', 'membro', p_user::text, p_observacao,
    jsonb_build_object('ano', p_ano, 'status', p_status, 'presente', p_tipo_presente));
  return v_id;
end $$;

create or replace function public.clube_admin_evento_salvar(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); v_id uuid := (p ->> 'id')::uuid;
begin
  if v_id is null then
    insert into public.clube_eventos (titulo, descricao, local, inicio, fim, capacidade, status, criado_por)
    values (p ->> 'titulo', p ->> 'descricao', p ->> 'local', (p ->> 'inicio')::timestamptz, (p ->> 'fim')::timestamptz,
      nullif(p ->> 'capacidade', '')::integer, coalesce(p ->> 'status', 'rascunho'), v_admin)
    returning id into v_id;
  else
    update public.clube_eventos set titulo = p ->> 'titulo', descricao = p ->> 'descricao', local = p ->> 'local',
      inicio = (p ->> 'inicio')::timestamptz, fim = (p ->> 'fim')::timestamptz,
      capacidade = nullif(p ->> 'capacidade', '')::integer, status = coalesce(p ->> 'status', status), atualizado_em = now()
    where id = v_id;
    if not found then perform public.clube_erro('evento_inexistente'); end if;
  end if;
  perform public.clube_auditar(v_admin, 'evento_salvo', 'evento', v_id::text, null, p);
  return v_id;
end $$;

create or replace function public.clube_admin_presenca(p_reserva uuid, p_presenca text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin();
begin
  if p_presenca not in ('pendente', 'presente', 'ausente') then perform public.clube_erro('status_invalido'); end if;
  update public.clube_evento_reservas set presenca = p_presenca, atualizado_em = now() where id = p_reserva;
  if not found then perform public.clube_erro('reserva_inexistente'); end if;
  perform public.clube_auditar(v_admin, 'presenca_registrada', 'reserva_evento', p_reserva::text, null,
    jsonb_build_object('presenca', p_presenca));
end $$;

create or replace function public.clube_admin_cobertura_salvar(p_prefixo text, p_descricao text, p_ativo boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin(); v text := regexp_replace(coalesce(p_prefixo, ''), '\D', '', 'g');
begin
  insert into public.clube_cobertura_entrega as c (cep_prefixo, descricao, ativo) values (v, btrim(p_descricao), p_ativo)
  on conflict (cep_prefixo) do update set descricao = excluded.descricao, ativo = excluded.ativo;
  perform public.clube_auditar(v_admin, 'cobertura_salva', 'cobertura', v, null,
    jsonb_build_object('descricao', p_descricao, 'ativo', p_ativo));
end $$;

create or replace function public.clube_admin_excecao_resolver(p_id uuid, p_resolucao text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := public.clube_exigir_admin();
begin
  if char_length(btrim(coalesce(p_resolucao, ''))) < 5 then perform public.clube_erro('motivo_obrigatorio'); end if;
  update public.clube_excecoes set status = 'resolvida', resolucao = btrim(p_resolucao), resolvida_por = v_admin,
    resolvida_em = now() where id = p_id and status = 'aberta';
  if not found then perform public.clube_erro('excecao_inexistente'); end if;
  perform public.clube_auditar(v_admin, 'excecao_resolvida', 'excecao', p_id::text, p_resolucao, '{}'::jsonb);
end $$;

-- Listagem de membros para a administração (inclui e-mail do Auth, só para admin).
create or replace function public.clube_admin_membros(p_busca text) returns table (
  user_id uuid, nome text, email text, telefone text, nascimento date, codigo_indicacao text, plano text,
  status_assinatura text, cancelar_no_fim boolean, beneficio_ate timestamptz, saldo_disponivel integer, criado_em timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.clube_exigir_admin();
  return query
  select p.user_id, p.nome, u.email::text, p.telefone, p.nascimento, p.codigo_indicacao, a.plano_chave, a.status,
    a.cancelar_no_fim, (public.clube_beneficio_vigente(p.user_id, now())).fim,
    public.clube_saldo_disponivel(p.user_id, now()), p.criado_em
  from public.clube_perfis p
  join auth.users u on u.id = p.user_id
  left join lateral (select x.* from public.clube_assinaturas x where x.user_id = p.user_id
                     order by x.criada_em desc limit 1) a on true
  where p_busca is null or p_busca = '' or p.nome ilike '%' || p_busca || '%' or u.email ilike '%' || p_busca || '%'
    or p.codigo_indicacao = upper(p_busca)
  order by p.criado_em desc limit 500;
end $$;

create or replace function public.clube_admin_aniversariantes(p_mes integer, p_ano integer) returns table (
  user_id uuid, nome text, nascimento date, plano text, vigente boolean, presente_status text)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.clube_exigir_admin();
  return query
  select p.user_id, p.nome, p.nascimento, pe.plano_chave, pe.id is not null, an.status
  from public.clube_perfis p
  left join lateral (select v.* from public.clube_periodos v where v.user_id = p.user_id
    and v.situacao in ('pago', 'reembolso_parcial') and v.inicio <= now() and v.fim > now() limit 1) pe on true
  left join public.clube_aniversarios an on an.user_id = p.user_id and an.ano = p_ano
  where extract(month from p.nascimento) = p_mes
  order by extract(day from p.nascimento), p.nome;
end $$;

-- Indicadores a partir de registros reais. Crédito emitido não é receita e não entra no faturamento.
create or replace function public.clube_admin_indicadores() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.clube_exigir_admin();
  return jsonb_build_object(
    'assinaturas', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
      select coalesce(plano_chave, 'desconhecido') || ':' || status as k, count(*) as n
      from public.clube_assinaturas group by 1) t),
    'beneficio_vigente', (select coalesce(jsonb_object_agg(plano_chave, n), '{}'::jsonb) from (
      select plano_chave, count(distinct user_id) as n from public.clube_periodos
      where situacao in ('pago', 'reembolso_parcial') and inicio <= now() and fim > now() group by 1) t),
    'pagamentos_confirmados', (select jsonb_build_object('quantidade', count(*),
      'valor_centavos', coalesce(sum(valor_pago_centavos), 0), 'reembolsado_centavos', coalesce(sum(valor_reembolsado_centavos), 0))
      from public.clube_faturas where status = 'paid' and valor_pago_centavos > 0),
    'pendencias', jsonb_build_object(
      'cobranca_pendente', (select count(*) from public.clube_assinaturas where status in ('past_due', 'unpaid')),
      'excecoes_abertas', (select count(*) from public.clube_excecoes where status = 'aberta'),
      'resgates_reservados', (select count(*) from public.clube_resgates where status = 'reservado'),
      'caixas_aguardando', (select count(*) from public.clube_caixas where status in ('aguardando_programacao', 'em_preparo')),
      'eventos_stripe_com_erro', (select count(*) from public.clube_stripe_eventos where status = 'erro')),
    'creditos', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
      select l.tipo || ':' || c.tipo as k, sum(c.valor_centavos) as v
      from public.clube_carteira_lancamentos c join public.clube_credito_lotes l on l.id = c.lote_id
      where c.tipo in ('concessao', 'consumo', 'expiracao', 'reversao') group by 1) t),
    'indicacoes', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
      select status, count(*) as n from public.clube_indicacoes group by 1) t)
  );
end $$;

/* =========================================================================================
   Privilégios: nada executável por padrão; liberação explícita por papel
   ========================================================================================= */

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'clube\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

grant execute on function public.clube_is_admin() to authenticated;
grant execute on function public.clube_validar_codigo(text) to anon, authenticated;
grant execute on function public.clube_garantir_perfil() to authenticated;
grant execute on function public.clube_salvar_perfil(text, text, date, jsonb) to authenticated;
grant execute on function public.clube_minha_situacao() to authenticated;
grant execute on function public.clube_simular_resgate(integer) to authenticated;
grant execute on function public.clube_solicitar_resgate(integer, text, uuid) to authenticated;
grant execute on function public.clube_cancelar_resgate(uuid) to authenticated;
grant execute on function public.clube_evento_reservar(uuid) to authenticated;
grant execute on function public.clube_evento_cancelar(uuid) to authenticated;
grant execute on function public.clube_admin_confirmar_resgate(uuid, integer, text, text, text) to authenticated;
grant execute on function public.clube_admin_cancelar_resgate(uuid, text) to authenticated;
grant execute on function public.clube_admin_caixa_atualizar(uuid, text, text, boolean) to authenticated;
grant execute on function public.clube_admin_sabor_salvar(text, text, text) to authenticated;
grant execute on function public.clube_admin_indicacao_decidir(uuid, boolean, text) to authenticated;
grant execute on function public.clube_admin_estornar_credito(uuid, integer, text) to authenticated;
grant execute on function public.clube_admin_creditar(uuid, integer, text) to authenticated;
grant execute on function public.clube_admin_lote_desbloquear(uuid, text) to authenticated;
grant execute on function public.clube_admin_conceder_fatura(uuid, text) to authenticated;
grant execute on function public.clube_admin_aniversario_registrar(uuid, integer, text, text, text) to authenticated;
grant execute on function public.clube_admin_evento_salvar(jsonb) to authenticated;
grant execute on function public.clube_admin_presenca(uuid, text) to authenticated;
grant execute on function public.clube_admin_cobertura_salvar(text, text, boolean) to authenticated;
grant execute on function public.clube_admin_excecao_resolver(uuid, text) to authenticated;
grant execute on function public.clube_admin_membros(text) to authenticated;
grant execute on function public.clube_admin_aniversariantes(integer, integer) to authenticated;
grant execute on function public.clube_admin_indicadores() to authenticated;
