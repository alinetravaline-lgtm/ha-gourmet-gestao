// Conexão com a nuvem (Supabase) fixa no app publicado: todo aparelho que abrir o link já entra sincronizado.
// A chave "publishable" é feita para ficar no navegador; o acesso às tabelas é controlado pelas regras (RLS) do projeto.
window.HAG_SYNC = {
  equipe: "ha-gourmet",
  supabase: {
    url: "https://ocwipmbfguiqrbewvaac.supabase.co",
    anonKey: "sb_publishable_gJ-Ovg_YNccE92arAsd6oQ_91pKSIUN",
  },
};

// LP, cadastro e área de membros usam o mesmo projeto Supabase, com login (Supabase Auth) e RLS por usuário.
// Só valores públicos aqui: chaves secretas do Supabase e do Stripe ficam nos Secrets das Edge Functions.
window.HAG_CLUBE = {
  supabaseUrl: window.HAG_SYNC.supabase.url,
  publishableKey: window.HAG_SYNC.supabase.anonKey,
};
