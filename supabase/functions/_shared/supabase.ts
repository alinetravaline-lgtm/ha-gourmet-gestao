import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.118.0";
import type { ConfigClube } from "./config.ts";
import { ErroHttp } from "./http.ts";

export type Admin = SupabaseClient;

// Cliente privilegiado (ignora RLS): só existe no servidor e nunca substitui a checagem de autorização.
export function clienteAdmin(cfg: ConfigClube): Admin {
  return createClient(cfg.supabaseUrl, cfg.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function usuarioAutenticado(req: Request, admin: Admin): Promise<User> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new ErroHttp(401, "nao_autenticado");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ErroHttp(401, "nao_autenticado");
  return data.user;
}

const ERROS_DE_REGRA = new Set([
  "limite_excedido", "perfil_incompleto", "regiao_nao_atendida", "ja_assinante", "em_andamento", "plano_invalido",
]);

export async function rpc<T>(admin: Admin, nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(nome, args);
  if (error) {
    if (ERROS_DE_REGRA.has(error.message)) throw new ErroHttp(error.message === "limite_excedido" ? 429 : 409, error.message);
    throw new Error(`rpc ${nome}: ${error.message}`);
  }
  return data as T;
}

export async function ehAdmin(admin: Admin, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("clube_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`clube_admins: ${error.message}`);
  return data !== null;
}
