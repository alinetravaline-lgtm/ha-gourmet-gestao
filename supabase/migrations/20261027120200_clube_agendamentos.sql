-- Rotinas persistentes do Clube via Supabase Cron (pg_cron) e pg_net.
-- Manutenção (vencimentos, reservas, sessões) roda direto no banco. Reprocessamento e reconciliação com o Stripe
-- chamam a Edge Function clube-jobs usando URL e segredo guardados no Vault (nunca em texto nesta migration):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/clube-jobs', 'clube_jobs_url');
--   select vault.create_secret('<mesmo valor de CLUBE_JOBS_SECRET>', 'clube_jobs_secret');
-- O cron nunca concede mensalidade: só chama as mesmas rotinas idempotentes, que exigem pagamento confirmado.

create or replace function public.clube_job_chamar_funcao(p_acao text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_segredo text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'clube_jobs_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'clube_jobs_secret';
  if v_url is null or v_segredo is null then
    insert into public.clube_execucoes_job (job, concluido_em, erro)
    values ('chamar:' || p_acao, now(), 'Segredos clube_jobs_url/clube_jobs_secret ausentes no Vault');
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('acao', p_acao),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-clube-job-secret', v_segredo),
    timeout_milliseconds := 120000
  );
end $$;

revoke all on function public.clube_job_chamar_funcao(text) from public, anon, authenticated;
grant execute on function public.clube_job_chamar_funcao(text) to service_role;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron/pg_net indisponíveis neste banco: agendamentos não criados.';
    return;
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;

  perform cron.schedule('clube-manutencao', '*/10 * * * *', 'select public.clube_job_manutencao()');
  perform cron.schedule('clube-stripe-reprocessar', '5,35 * * * *', $c$select public.clube_job_chamar_funcao('reprocessar')$c$);
  perform cron.schedule('clube-stripe-reconciliar', '20 9 * * *', $c$select public.clube_job_chamar_funcao('reconciliar')$c$);
end $$;
