/* Sincronização em tempo real entre aparelhos (Firebase Firestore).
   Sem configuração, a plataforma funciona apenas neste aparelho.

   Estrutura na nuvem:
     equipes/{codigo}/estado/principal  -> todos os dados da gestão (JSON em texto)
     equipes/{codigo}/registros/{id}    -> cada venda da Área do vendedor (um documento por venda,
                                           para dois vendedores nunca sobrescreverem um ao outro) */
const Sync = (() => {
  const CFG_KEY = "hag_sync_cfg";
  const FIREBASE_V = "10.12.2";
  const client = localStorage.getItem("hag_client") || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("hag_client", id);
    return id;
  })();

  let F = null, refs = null, status = "local", timer = null, ultimoSync = null;
  const ouvintes = [];

  function getCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || window.HAG_SYNC || null; } catch { return window.HAG_SYNC || null; }
  }
  const setCfg = (cfg) => localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  const clearCfg = () => localStorage.removeItem(CFG_KEY);
  function setStatus(s) { status = s; if (s === "online") ultimoSync = new Date(); ouvintes.forEach((f) => f(s)); }

  // handlers: { onEstado(estado), onRegistros(lista), estadoLocal(), registrosLocais() }
  async function start(handlers) {
    const cfg = getCfg();
    if (!cfg?.firebase || !cfg?.equipe) { setStatus("local"); return; }
    setStatus("conectando");
    const regsIniciais = handlers.registrosLocais().slice();
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_V}/`;
      const [{ initializeApp }, Fs, Au] = await Promise.all([
        import(base + "firebase-app.js"), import(base + "firebase-firestore.js"), import(base + "firebase-auth.js"),
      ]);
      const app = initializeApp(cfg.firebase);
      await Au.signInAnonymously(Au.getAuth(app));
      const fdb = Fs.initializeFirestore(app, { localCache: Fs.persistentLocalCache({ tabManager: Fs.persistentMultipleTabManager() }) });
      F = Fs;
      const raiz = `equipes/${cfg.equipe}`;
      refs = { estado: F.doc(fdb, raiz, "estado", "principal"), regs: F.collection(fdb, raiz, "registros") };

      F.onSnapshot(refs.estado, (snap) => {
        if (!snap.exists()) {
          // Primeiro aparelho a conectar: envia os dados que já existem aqui
          enviarEstado(handlers.estadoLocal(), true);
          regsIniciais.forEach(putRegistro);
          return;
        }
        const d = snap.data();
        if (snap.metadata.hasPendingWrites || d._by === client) return;
        try { handlers.onEstado(JSON.parse(d.json)); } catch (e) { console.error("Estado inválido na nuvem", e); }
      }, erro);

      F.onSnapshot(refs.regs, { includeMetadataChanges: true }, (snap) => {
        handlers.onRegistros(snap.docs.map((d) => d.data()));
        setStatus(snap.metadata.fromCache ? "offline" : "online");
      }, erro);
    } catch (e) { erro(e); }
  }
  function erro(e) { console.error("Sincronização:", e); setStatus("erro"); }

  function enviarEstado(estado, agora) {
    if (!refs) return;
    clearTimeout(timer);
    const envia = () => F.setDoc(refs.estado, { json: JSON.stringify(estado), _by: client, _at: Date.now() }).catch(erro);
    if (agora) envia(); else timer = setTimeout(envia, 700);
  }
  const putRegistro = (r) => { if (refs) F.setDoc(F.doc(refs.regs, r.id), r).catch(erro); };
  const delRegistro = (id) => { if (refs) F.deleteDoc(F.doc(refs.regs, id)).catch(erro); };

  return {
    start, getCfg, setCfg, clearCfg, putRegistro, delRegistro, client,
    saveEstado: (estado) => enviarEstado(estado, false),
    onStatus: (f) => { ouvintes.push(f); f(status); },
    get status() { return status; },
    get ativo() { return !!refs; },
    get ultimoSync() { return ultimoSync; },
  };
})();
