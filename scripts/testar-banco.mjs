// Sobe um Postgres temporário, aplica o stub do Supabase + migrations do Clube e roda os testes de invariantes.
// Uso: node scripts/testar-banco.mjs [--manter]   (requer initdb, pg_ctl e psql no PATH; Postgres 15+)
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const manter = process.argv.includes("--manter");
const porta = process.env.PGPORT_TESTE || "54329";
const dir = mkdtempSync(join(tmpdir(), "clube-pg-"));
const dados = join(dir, "dados");

function rodar(cmd, args, opcoes = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opcoes });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} terminou com código ${r.status}`);
}
const psql = (args) => rodar("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-h", "localhost", "-p", porta, "-U", "postgres", ...args],
  { env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" } });

let iniciado = false;
try {
  rodar("initdb", ["-D", dados, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"], { stdio: "ignore" });
  rodar("pg_ctl", ["-D", dados, "-l", join(dir, "pg.log"), "-o", `-p ${porta} -c listen_addresses=localhost -c TimeZone=UTC`, "-w", "start"]);
  iniciado = true;
  psql(["-d", "postgres", "-c", "create database clube_teste"]);
  psql(["-d", "clube_teste", "-f", join(raiz, "supabase", "tests", "00_stub_supabase.sql")]);
  const migrations = readdirSync(join(raiz, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const m of migrations) {
    console.log(`migration: ${m}`);
    psql(["-d", "clube_teste", "-f", join(raiz, "supabase", "migrations", m)]);
  }
  psql(["-d", "clube_teste", "-f", join(raiz, "supabase", "tests", "10_clube_invariantes.sql")]);
} finally {
  if (manter) console.log(`Banco mantido em ${dados} (porta ${porta}).`);
  else {
    if (iniciado) rodar("pg_ctl", ["-D", dados, "-m", "fast", "-w", "stop"], { stdio: "ignore" });
    rmSync(dir, { recursive: true, force: true });
  }
}
