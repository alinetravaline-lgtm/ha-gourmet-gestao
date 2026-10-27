-- Tabelas do app de gestão (sync.js), que até aqui existiam só no projeto antigo, criadas fora de migration.
-- O app não tem login: lê e grava com a chave publicável. As políticas limitam o acesso à equipe "ha-gourmet",
-- mas qualquer pessoa com a chave pública ainda lê e altera esses dados. Fechar isso exige login na gestão.

create table if not exists public.hag_estado (
  equipe text primary key,
  json text not null,
  por text,
  em bigint
);

create table if not exists public.hag_registros (
  id text primary key,
  equipe text not null,
  dados jsonb not null,
  em bigint
);

create index if not exists hag_registros_equipe_idx on public.hag_registros (equipe);

alter table public.hag_estado enable row level security;
alter table public.hag_registros enable row level security;

grant select, insert, update, delete on public.hag_estado, public.hag_registros to anon, authenticated;

drop policy if exists hag_estado_equipe on public.hag_estado;
create policy hag_estado_equipe on public.hag_estado for all to anon, authenticated
  using (equipe = 'ha-gourmet') with check (equipe = 'ha-gourmet');

drop policy if exists hag_registros_equipe on public.hag_registros;
create policy hag_registros_equipe on public.hag_registros for all to anon, authenticated
  using (equipe = 'ha-gourmet') with check (equipe = 'ha-gourmet');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'hag_estado') then
      alter publication supabase_realtime add table public.hag_estado;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'hag_registros') then
      alter publication supabase_realtime add table public.hag_registros;
    end if;
  end if;
end $$;
