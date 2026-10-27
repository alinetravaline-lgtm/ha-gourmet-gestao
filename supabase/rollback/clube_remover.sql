-- Reversão das migrations do Clube (20261027120000..120200). Só use ANTES de existir cobrança real:
-- apaga assinaturas, faturas, créditos e indicações registrados. Faça backup antes (docs/deploy-hostinger.md).
-- Não toca nas tabelas da gestão (hag_estado, hag_registros) nem nos usuários do Auth.
begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobname) from cron.job where jobname like 'clube-%';
  end if;
end $$;

drop trigger if exists clube_novo_usuario on auth.users;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'clube\_%' loop
    execute format('drop function if exists %s cascade', f.sig);
  end loop;
end $$;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'clube\_%' loop
    execute format('drop table if exists public.%I cascade', t.tablename);
  end loop;
end $$;

delete from supabase_migrations.schema_migrations where version in ('20261027120000', '20261027120100', '20261027120200');

commit;
