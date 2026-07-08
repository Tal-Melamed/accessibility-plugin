import { supabase } from "./supabase";

export interface GoogleConnection {
  id: string;
  site_id: string;
  owner_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  gsc_site: string | null;
  ga_property: string | null;
}

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function getConnection(siteId: string): Promise<GoogleConnection | null> {
  const { data, error } = await db()
    .from("google_connections")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error;
  return (data as GoogleConnection | null) ?? null;
}

export async function upsertConnection(input: {
  site_id: string;
  owner_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}): Promise<void> {
  const { error } = await db()
    .from("google_connections")
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "site_id" });
  if (error) throw error;
}

export async function patchConnection(siteId: string, patch: Partial<GoogleConnection>): Promise<void> {
  const { error } = await db()
    .from("google_connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("site_id", siteId);
  if (error) throw error;
}

export async function deleteConnection(siteId: string): Promise<void> {
  const { error } = await db().from("google_connections").delete().eq("site_id", siteId);
  if (error) throw error;
}
