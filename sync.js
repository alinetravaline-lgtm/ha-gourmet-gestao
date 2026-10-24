/* Sincronização em tempo real entre aparelhos (Supabase ou Firebase Firestore).
   Sem configuração, a plataforma funciona apenas neste aparelho.

   Supabase (tabelas criadas por SQL_SUPABASE em app.js):
     hag_estado    (equipe, json, por, em)        -> todos os dados da gestão (JSON em texto)
     hag_registros (id, equipe, dados, em)        -> cada venda da Área do vendedor (uma linha por venda,
                                                     para dois vendedores nunca sobrescreverem um ao outro)
   Firebase:
     equipes/{codigo}/estado/principal  e  equipes/{codigo}/registros/{id} */
const Sync = (() => {
  const CFG_KEY = "hag_sync_cfg";
  const FILA_KEY = "hag_sync_fila";
  const FIREBASE_V = "10.12.2";
  const client = localStorage.getItem("hag_client") || (() => {
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("hag_client", id);
    return id;
  })();

  let impl = null, status = "local", timer = null, ultimoSync = null;
  const ouvintes = [];

  function getCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || window.HAG_SYNC || null; } catch { return window.HAG_SYNC || null; }
  }
  const setCfg = (cfg) => localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  const clearCfg = () => localStorage.removeItem(CFG_KEY);
  function setStatus(s) { status = s; if (s === "online") ultimoSync = new Date(); ouvintes.forEach((f) => f(s)); }
  function erro(e) { console.error("Sincronização:", e); setStatus(navigator.onLine === false ? "offline" : "erro"); }

  // handlers: { onEstado(estado), onRegistros(lista), estadoLocal(), registrosLocais() }
  async function start(handlers) {
    const cfg = getCfg();
    if (!cfg?.equipe || !(cfg.supabase || cfg.firebase)) { setStatus("local"); return; }
    setStatus("conectando");
    try { impl = cfg.supabase ? await iniciarSupabase(cfg, handlers) : await iniciarFirebase(cfg, handlers); }
    catch (e) { impl = null; erro(e); }
  }

  /* ---------- Supabase ---------- */
  async function iniciarSupabase(cfg, handlers) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(cfg.supabase.url, cfg.supabase.anonKey, { auth: { persistSession: false } });
    const equipe = cfg.equipe, regsIniciais = handlers.registrosLocais().slice();
    // Vendas registradas sem internet ficam numa fila e sobem quando a conexão volta
    const fila = () => { try { return JSON.parse(localStorage.getItem(FILA_KEY)) || []; } catch { return []; } };
    const setFila = (l) => localStorage.setItem(FILA_KEY, JSON.stringify(l));
    const okOuErro = ({ error }) => { if (error) throw error; };

    const enviarEstado = async (estado) => { okOuErro(await sb.from("hag_estado").upsert({ equipe, json: JSON.stringify(estado), por: client, em: Date.now() })); setStatus("online"); };
    const putRegistro = async (r) => {
      try { okOuErro(await sb.from("hag_registros").upsert({ id: r.id, equipe, dados: r, em: Date.now() })); setStatus("online"); }
      catch (e) { setFila([...fila().filter((x) => x.id !== r.id), { op: "put", id: r.id, r }]); erro(e); }
    };
    const delRegistro = async (id) => {
      try { okOuErro(await sb.from("hag_registros").delete().eq("id", id)); }
      catch (e) { setFila([...fila().filter((x) => x.id !== id), { op: "del", id }]); erro(e); }
    };
    const esvaziarFila = async () => {
      const l = fila(); if (!l.length) return;
      setFila([]);
      for (const x of l) await (x.op === "del" ? delRegistro(x.id) : putRegistro(x.r));
    };
    // Já disponível para o app enquanto os dados iniciais chegam (o recálculo das contas grava de volta na nuvem)
    impl = { enviarEstado, putRegistro, delRegistro };
    const carregarRegistros = async () => {
      const { data, error } = await sb.from("hag_registros").select("dados").eq("equipe", equipe);
      if (error) throw error;
      handlers.onRegistros(data.map((x) => x.dados));
    };

    // Estado inicial: se a equipe ainda não tem dados na nuvem, este aparelho envia os que já existem aqui
    const { data: est, error } = await sb.from("hag_estado").select("json, por").eq("equipe", equipe).maybeSingle();
    if (error) throw error;
    if (!est) { await enviarEstado(handlers.estadoLocal()); for (const r of regsIniciais) await putRegistro(r); }
    else handlers.onEstado(JSON.parse(est.json));
    await esvaziarFila();
    await carregarRegistros();
    setStatus("online");

    sb.channel("hag-" + equipe)
      .on("postgres_changes", { event: "*", schema: "public", table: "hag_estado", filter: `equipe=eq.${equipe}` }, (p) => {
        const row = p.new;
        if (!row?.json || row.por === client) return;
        try { handlers.onEstado(JSON.parse(row.json)); setStatus("online"); } catch (e) { console.error("Estado inválido na nuvem", e); }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hag_registros", filter: `equipe=eq.${equipe}` }, () => carregarRegistros().catch(erro))
      .subscribe((s) => { if (s === "SUBSCRIBED") setStatus("online"); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline"); });
    window.addEventListener("online", () => { esvaziarFila().then(carregarRegistros).catch(erro); });
    return { enviarEstado, putRegistro, delRegistro };
  }

  /* ---------- Firebase ---------- */
  async function iniciarFirebase(cfg, handlers) {
    const regsIniciais = handlers.registrosLocais().slice();
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_V}/`;
    const [{ initializeApp }, F, Au] = await Promise.all([
      import(base + "firebase-app.js"), import(base + "firebase-firestore.js"), import(base + "firebase-auth.js"),
    ]);
    const app = initializeApp(cfg.firebase);
    await Au.signInAnonymously(Au.getAuth(app));
    const fdb = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    const raiz = `equipes/${cfg.equipe}`;
    const refs = { estado: F.doc(fdb, raiz, "estado", "principal"), regs: F.collection(fdb, raiz, "registros") };
    const enviarEstado = (estado) => F.setDoc(refs.estado, { json: JSON.stringify(estado), _by: client, _at: Date.now() });
    const putRegistro = (r) => F.setDoc(F.doc(refs.regs, r.id), r).catch(erro);
    const delRegistro = (id) => F.deleteDoc(F.doc(refs.regs, id)).catch(erro);
    impl = { enviarEstado, putRegistro, delRegistro };

    F.onSnapshot(refs.estado, (snap) => {
      if (!snap.exists()) {
        // Primeiro aparelho a conectar: envia os dados que já existem aqui
        enviarEstado(handlers.estadoLocal()).catch(erro);
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
    return { enviarEstado, putRegistro, delRegistro };
  }

  function saveEstado(estado) {
    if (!impl) return;
    clearTimeout(timer);
    timer = setTimeout(() => Promise.resolve(impl.enviarEstado(estado)).catch(erro), 700);
  }
  const putRegistro = (r) => { if (impl) impl.putRegistro(r); };
  const delRegistro = (id) => { if (impl) impl.delRegistro(id); };

  return {
    start, getCfg, setCfg, clearCfg, putRegistro, delRegistro, client, saveEstado,
    onStatus: (f) => { ouvintes.push(f); f(status); },
    get status() { return status; },
    get ativo() { return !!impl; },
    get ultimoSync() { return ultimoSync; },
  };
})();
