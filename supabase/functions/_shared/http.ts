import { ErroConfig } from "./config.ts";

export class ErroHttp extends Error {
  constructor(readonly status: number, readonly codigo: string) {
    super(codigo);
  }
}

export function cabecalhosCors(req: Request, origens: string[]): Record<string, string> {
  const origem = req.headers.get("origin") ?? "";
  if (!origens.includes(origem)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function json(status: number, corpo: unknown, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabecalhos },
  });
}

// Registra só o necessário para diagnóstico: sem corpo da requisição, e-mail, endereço ou dados de cartão.
export function registrar(contexto: string, erro: unknown, extra: Record<string, string | number | null> = {}) {
  const msg = erro instanceof Error ? erro.message : String(erro);
  console.error(JSON.stringify({ contexto, erro: msg.slice(0, 300), ...extra }));
}

export function respostaDeErro(erro: unknown, cors: Record<string, string>, contexto: string): Response {
  if (erro instanceof ErroHttp) return json(erro.status, { erro: erro.codigo }, cors);
  if (erro instanceof ErroConfig) {
    registrar(contexto, erro);
    return json(503, { erro: "servico_nao_configurado" }, cors);
  }
  registrar(contexto, erro);
  return json(500, { erro: "erro_interno" }, cors);
}

export async function lerJson(req: Request): Promise<Record<string, unknown>> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new ErroHttp(415, "json_obrigatorio");
  const texto = await req.text();
  if (texto.length > 10_000) throw new ErroHttp(413, "corpo_grande_demais");
  try {
    const v = JSON.parse(texto || "{}");
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error("objeto esperado");
    return v as Record<string, unknown>;
  } catch {
    throw new ErroHttp(400, "json_invalido");
  }
}

export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let dif = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return dif === 0;
}
