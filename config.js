// Conexão com a nuvem (Supabase) fixa no app publicado: todo aparelho que abrir o link já entra sincronizado.
// A chave "publishable" é feita para ficar no navegador; o acesso às tabelas é controlado pelas regras (RLS) do projeto.
window.HAG_SYNC = {
  equipe: "ha-gourmet",
  supabase: {
    url: "https://lqssncrgwgwpthjivfal.supabase.co",
    anonKey: "sb_publishable_UhtNk382-CmsYiYDgkSgtA_cB-bjoxx",
  },
};
