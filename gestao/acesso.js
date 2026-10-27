// A gestão é área da administração: só carrega o app para contas em public.clube_admins (checado no banco).
// Esta tela esconde a gestão de quem não é admin; as tabelas hag_* continuam acessíveis pela chave pública.
const MARCA = "hag_admin_ok";
const VALIDADE_OFFLINE_MS = 30 * 86_400_000;
const SCRIPTS = ["../data.js", "../sync.js", "../app.js"];
const conteudo = document.getElementById("acessoConteudo");

let clube = null;
try {
  clube = await import("../clube/clube.js");
} catch { /* sem conexão: supabase-js não carregou */ }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lerMarca = () => { try { return JSON.parse(localStorage.getItem(MARCA)); } catch { return null; } };
const marcaValida = (uid) => { const m = lerMarca(); return !!m && m.uid === uid && Date.now() - m.em < VALIDADE_OFFLINE_MS; };

function abrirGestao() {
  document.getElementById("acesso").remove();
  document.body.classList.remove("travado");
  for (const src of SCRIPTS) {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    document.body.appendChild(s);
  }
  document.getElementById("btnSair").addEventListener("click", sair);
}

async function sair() {
  localStorage.removeItem(MARCA);
  try { await clube?.sb.auth.signOut(); } catch { /* sem conexão: a sessão local é descartada mesmo assim */ }
  location.href = "../";
}

function telaLogin(aviso = "") {
  conteudo.innerHTML = `<h1>Entrar</h1><p class="hint">Acesso restrito à equipe da HA Gourmet.</p>
    ${aviso ? `<div class="aviso">${esc(aviso)}</div>` : ""}
    <form class="acesso-form" id="fLogin" novalidate>
      <label>E-mail<input name="email" type="email" autocomplete="email" required /></label>
      <label>Senha<input name="senha" type="password" autocomplete="current-password" required /></label>
      <div class="aviso erro" id="erro" hidden></div>
      <button class="btn btn-primary">Entrar</button>
    </form>
    <p class="acesso-links"><a class="link" href="../membros/">Esqueci minha senha</a><a class="link" href="../">Voltar ao site</a></p>`;
  const f = document.getElementById("fLogin");
  const erro = document.getElementById("erro");
  f.email.focus();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const botao = f.querySelector("button");
    botao.disabled = true;
    const { error } = await clube.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
    botao.disabled = false;
    if (error) {
      erro.textContent = /rate|limit/i.test(error.message) ? "Muitas tentativas. Aguarde alguns minutos."
        : /confirm/i.test(error.message) ? "Confirme seu e-mail pelo link enviado antes de entrar." : "E-mail ou senha incorretos.";
      erro.hidden = false;
      return;
    }
    verificar();
  });
}

function telaNegado(email) {
  conteudo.innerHTML = `<h1>Acesso restrito</h1>
    <p class="hint">A conta <b>${esc(email)}</b> não tem permissão de administração.</p>
    <div class="acesso-acoes"><button class="btn" id="btnTrocar">Entrar com outra conta</button><a class="btn btn-primary" href="../">Voltar ao site</a></div>`;
  document.getElementById("btnTrocar").addEventListener("click", async () => {
    localStorage.removeItem(MARCA);
    await clube.sb.auth.signOut();
    telaLogin();
  });
}

function telaSemConexao() {
  conteudo.innerHTML = `<h1>Sem conexão</h1>
    <p class="hint">Conecte-se à internet para confirmar o acesso de administração neste aparelho.</p>
    <div class="acesso-acoes"><button class="btn btn-primary" onclick="location.reload()">Tentar de novo</button></div>`;
}

async function verificar() {
  if (!clube) {
    const m = lerMarca();
    if (m && Date.now() - m.em < VALIDADE_OFFLINE_MS) abrirGestao(); else telaSemConexao();
    return;
  }
  const sessao = await clube.sessaoAtual();
  if (!sessao) { telaLogin(); return; }
  let admin;
  try {
    admin = await clube.rpc("clube_is_admin");
  } catch {
    if (marcaValida(sessao.user.id)) abrirGestao(); else telaSemConexao();
    return;
  }
  if (!admin) { localStorage.removeItem(MARCA); telaNegado(sessao.user.email); return; }
  localStorage.setItem(MARCA, JSON.stringify({ uid: sessao.user.id, em: Date.now() }));
  abrirGestao();
}

verificar();
