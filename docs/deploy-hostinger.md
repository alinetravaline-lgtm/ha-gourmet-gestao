# Implantação — Hostinger (site) + Supabase (banco e servidor) + Stripe (cobrança)

## Arquitetura escolhida e por quê

O projeto é um site **estático** (HTML, CSS e JS sem build). Toda a parte privilegiada roda no Supabase (Postgres, Auth, Edge Functions e Cron) e a cobrança roda no Stripe. Por isso:

- A Hostinger só precisa servir arquivos estáticos com HTTPS. **Não é necessário Node.js, VPS, workers nem WebSockets.** Antes de contratar ou mudar de plano, confira no hPanel se o plano atual hospeda o domínio com SSL; os planos de hospedagem web atendem a isso.
- Os processos contínuos (vencimentos, reprocessamento de webhooks e reconciliação) são jobs curtos no **Supabase Cron**, não processos permanentes na Hostinger.
- O banco continua no Supabase. Não instale outro Postgres na Hostinger.
- Se um dia houver um backend Node próprio (por exemplo, uma loja online com checkout de produtos), aí sim avalie o Node.js gerenciado (planos Business/Cloud) ou uma VPS, considerando os limites atuais da Hostinger (sem workers sempre ativos e sem WebSockets de entrada no gerenciado). Hoje isso não é necessário.

## 0. Ambientes

| Ambiente | Supabase | Stripe | Site |
| --- | --- | --- | --- |
| Local | `supabase start` (portas 55321/55322) | — | `python -m http.server` |
| Homologação | projeto Supabase **separado** (recomendado) | modo de teste (`sk_test_`) | subdomínio, ex.: `homolog.seudominio` |
| Produção | projeto atual (já guarda os dados da gestão) | modo live (`sk_live_`), só na virada | domínio principal |

O `config.js` aponta para o projeto de produção atual. Para uma homologação separada, publique uma cópia do site com o `config.js` do projeto de homologação (URL e chave publicável, ambas públicas).

## 1. Backup antes de qualquer migration

1. Supabase > Database > Backups: confirme que existe backup recente (ou PITR ativo).
2. Também faça um dump local: `supabase db dump --linked -f backup-antes-clube.sql` (e `--data-only` para os dados).
3. No app de gestão, use "Baixar backup dos dados" (JSON) como segunda cópia.

As migrations do Clube são **aditivas**: só criam tabelas e funções `clube_*`, o gatilho em `auth.users` e os agendamentos `clube-*`. Elas não alteram `hag_estado`/`hag_registros`. Para reverter antes de existir cobrança real, use `supabase/rollback/clube_remover.sql`.

## 2. Supabase

```powershell
supabase login
supabase link --project-ref <ref-do-projeto>
supabase db push --dry-run      # confira a lista: só as 3 migrations do Clube
supabase db push
supabase functions deploy clube-checkout clube-portal clube-stripe-webhook clube-jobs clube-admin
```

- **Secrets das funções:** crie `supabase/functions/.env` (fora do git, ver `.env.example`) e rode `supabase secrets set --env-file supabase/functions/.env`. Também dá para cadastrar em Project Settings > Edge Functions > Secrets. Nunca cole chaves em chat, issue ou commit.
- **Vault (Cron):** no SQL Editor, rode `vault.create_secret` para `clube_jobs_url` e `clube_jobs_secret` (ver `docs/integracoes.md`). Confira em `cron.job` e, depois de alguns minutos, em `clube_execucoes_job`.
- **Auth:**
  - Authentication > URL Configuration: Site URL `https://seudominio`; Redirect URLs `https://seudominio/membros/` e `https://seudominio/cadastro/`.
  - Authentication > Providers > Email: confirmação de e-mail **ligada**.
  - Authentication > Emails > SMTP: configure um SMTP próprio (o padrão do Supabase tem limite baixo de envios).
  - Authentication > Rate Limits: revise os limites de cadastro, login e recuperação de senha.
- **Administradora:** depois que a Aline criar a conta pelo cadastro, conceda o papel com o `insert into public.clube_admins ...` descrito em `docs/integracoes.md`.

## 3. Stripe (modo de teste primeiro)

1. Defina `STRIPE_SECRET_KEY` (teste), `CLUBE_APP_URL` e `CLUBE_WEBHOOK_URL=https://<ref>.supabase.co/functions/v1/clube-stripe-webhook` no terminal e rode `node scripts/stripe-configurar.mjs`.
2. Cadastre como Secrets os IDs impressos (`STRIPE_PRICE_HA_ASSINATURA`, `STRIPE_PRICE_HA_CLUB`, `STRIPE_PORTAL_CONFIG_ID`) e o `STRIPE_WEBHOOK_SECRET`, que aparece uma única vez. Com `--gravar-env supabase/functions/.env`, o script grava esses valores (e a chave) direto no arquivo, sem exibi-los; depois rode `supabase secrets set --env-file supabase/functions/.env`.
3. Cadastre ao menos uma região em Administração > Regiões de entrega (sem isso, o plano com caixa não abre para venda).
4. Execute os cenários da tabela "Testes no modo de teste do Stripe" em `docs/integracoes.md` e acompanhe Stripe > Webhooks (entregas 2xx), `clube_stripe_eventos` e a aba Pendências do admin.

**Virada para produção (só com as decisões de `docs/regras-negocio.md` fechadas):** gere chaves live, rode o script com `--permitir-producao` apontando para o projeto de produção, troque os Secrets (`STRIPE_SECRET_KEY`, preços, portal e webhook) e faça uma assinatura real de valor baixo seguida de reembolso, para conferir o fluxo completo.

## 4. Hostinger

1. hPanel > Websites > domínio > **SSL**: ative o certificado e force HTTPS (o `.htaccess` também redireciona).
2. Publique **somente** os arquivos do site em `public_html/`:
   `index.html`, `vendedor.html`, `config.js`, `app.js`, `data.js`, `sync.js`, `sw.js`, `styles.css`, `.htaccess`, e as pastas `gestao/`, `vendedor/`, `icons/`, `clube/`, `cadastro/`, `membros/`.
   **Não** envie `supabase/`, `scripts/`, `docs/`, `.git/` nem arquivos `.env*` (o `.htaccess` bloqueia essas pastas por segurança extra).
   Opções de envio: hPanel > Gerenciador de Arquivos (upload de zip e extração) ou hPanel > Avançado > Git, com implantação a partir do repositório e branch `main`.
3. Rotas: cada página tem sua pasta com `index.html`, então não há reescrita de SPA. A raiz (`/`) continua abrindo a gestão, como hoje. A LP fica em `/clube/`. Se a cliente quiser a LP na raiz, troque o redirecionamento de `index.html` (mantendo `?app=vendedor`) e avise a equipe que a gestão fica em `/gestao/`.
4. Teste depois de publicar: `/clube/`, `/cadastro/?ref=XXXXXXXX`, login em `/membros/`, `/clube/admin/` com a conta admin e o app de gestão (`/gestao/`, `/vendedor/`).

## 5. Operação, logs e rollback

| Onde olhar | Para quê |
| --- | --- |
| Supabase > Edge Functions > Logs | Erros das funções (sem dados pessoais nem corpo da requisição) |
| Stripe > Developers > Webhooks | Entregas, falhas e reenvio |
| `clube_stripe_eventos` / admin > Pendências | Eventos com erro e reprocessamento manual |
| `clube_execucoes_job` | Execuções do Cron (manutenção, reprocessamento, reconciliação) |
| `clube_excecoes` / admin > Pendências | Casos que exigem decisão da loja |
| `clube_auditoria` | Ações administrativas (autor, motivo, data) |

- **Rollback do site:** republique a versão anterior (Git: volte o deploy para o commit anterior).
- **Rollback das funções:** `supabase functions deploy` da versão anterior.
- **Rollback do banco:** antes de cobranças reais, `supabase/rollback/clube_remover.sql`. Depois de haver cobranças, **não** remova tabelas: corrija com nova migration, porque o histórico financeiro precisa ser preservado.
