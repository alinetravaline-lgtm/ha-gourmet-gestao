// Página inicial pública: contatos vindos de config.js, menu no celular e atalho de admin só para a equipe.
const loja = window.HAG_LOJA || {};
const whatsapp = String(loja.whatsapp || "").replace(/\D/g, "");
const instagram = String(loja.instagram || "").replace(/^@/, "").trim();
const ifood = /^https:\/\//.test(loja.ifood || "") ? loja.ifood : "";
const cidade = String(loja.cidade || "").trim();
const tem = { whatsapp: !!whatsapp, instagram: !!instagram, ifood: !!ifood, cidade: !!cidade };
tem.contato = tem.whatsapp || tem.instagram || tem.ifood;

for (const el of document.querySelectorAll("[data-requer]")) {
  if (!tem[el.dataset.requer]) el.hidden = true;
}
for (const a of document.querySelectorAll("[data-whatsapp]")) {
  a.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(a.dataset.whatsapp)}`;
  a.target = "_blank";
  a.rel = "noopener";
}
for (const a of document.querySelectorAll("[data-instagram]")) {
  a.href = `https://instagram.com/${encodeURIComponent(instagram)}`;
  a.target = "_blank";
  a.rel = "noopener";
}
for (const a of document.querySelectorAll("[data-ifood]")) {
  a.href = ifood;
  a.target = "_blank";
  a.rel = "noopener";
}
for (const el of document.querySelectorAll(".lp-cidade")) el.textContent = cidade;
document.getElementById("lpAno").textContent = new Date().getFullYear();

const menu = document.getElementById("lpMenu");
const nav = document.getElementById("lpNav");
const alternarMenu = (aberto) => {
  nav.classList.toggle("aberto", aberto);
  menu.setAttribute("aria-expanded", String(aberto));
};
menu.addEventListener("click", () => alternarMenu(!nav.classList.contains("aberto")));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) alternarMenu(false); });

const topo = document.querySelector(".lp-top");
const marcarRolagem = () => topo.classList.toggle("rolou", window.scrollY > 8);
window.addEventListener("scroll", marcarRolagem, { passive: true });
marcarRolagem();

// O botão é só atalho: a gestão confere de novo o papel de admin no banco antes de abrir.
async function mostrarAdmin() {
  try {
    const { rpc, sessaoAtual } = await import("./clube/clube.js");
    const sessao = await sessaoAtual();
    if (!sessao) return;
    document.getElementById("lpMembro").textContent = "Minha conta";
    if (await rpc("clube_is_admin")) document.getElementById("lpAdmin").hidden = false;
  } catch { /* sem conexão: a página continua funcionando sem o atalho */ }
}
mostrarAdmin();
