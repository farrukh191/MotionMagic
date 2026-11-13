import { env } from "@/lib/env";
import type { Storage } from "./index";

/**
 * Supabase Storage driver (private bucket, plain REST, no SDK). Works on the free plan.
 * Server-only: it uses the service-role key, which must NEVER reach the browser or a NEXT_PUBLIC_ variable.
 * Files are never public. Customers only get short-lived signed links from our own /api/download/[token] route.
 * Endpoints: https://supabase.com/docs/reference/self-hosting-storage (object upload / download / delete / list).
 */
const TIMEOUT_MS = 30_000;

type FetchLike = typeof fetch;

export function createSupabaseStorage(cfg: { url: string; key: string; bucket: string }, fetchImpl: FetchLike = fetch): Storage {
  if (!cfg.url || !cfg.key) throw new Error("Supabase storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const base = `${cfg.url}/storage/v1`;
  const headers = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${cfg.key}`, apikey: cfg.key, ...extra });
  const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");
  const objectUrl = (key: string) => `${base}/object/${encodeURIComponent(cfg.bucket)}/${enc(key)}`;

  /** One retry for network errors and 5xx, so a blip does not fail a paid GIF. */
  async function call(url: string, init: RequestInit): Promise<Response> {
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status < 500) return res;
        last = new Error(`HTTP ${res.status}`);
      } catch (e) {
        last = e;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error(`Supabase storage request failed: ${last instanceof Error ? last.message : String(last)}`);
  }

  const contentType = (key: string) => (key.endsWith(".gif") ? "image/gif" : key.endsWith(".png") ? "image/png" : key.endsWith(".jpg") || key.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream");

  async function listAll(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string) => {
      for (let offset = 0; ; offset += 100) {
        const res = await call(`${base}/object/list/${encodeURIComponent(cfg.bucket)}`, {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ prefix: dir, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
        });
        if (!res.ok) throw new Error(`Supabase list failed (HTTP ${res.status})`);
        const items = (await res.json()) as { name: string; id: string | null }[];
        for (const it of items) {
          const full = dir ? `${dir}/${it.name}` : it.name;
          if (it.id === null) await walk(full); // a folder
          else out.push(full);
        }
        if (items.length < 100) break;
      }
    };
    await walk(prefix.replace(/\/+$/, ""));
    return out;
  }

  return {
    async put(key, data) {
      const res = await call(objectUrl(key), { method: "POST", headers: headers({ "Content-Type": contentType(key), "x-upsert": "true", "Cache-Control": "max-age=0" }), body: new Uint8Array(data) });
      if (!res.ok) throw new Error(`Supabase upload failed (HTTP ${res.status})`);
    },
    async get(key) {
      const res = await call(objectUrl(key), { method: "GET", headers: headers() });
      if (!res.ok) throw new Error(`Supabase download failed (HTTP ${res.status})`); // 400/404 = not found, same as the local driver throwing
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(key) {
      const res = await call(objectUrl(key), { method: "DELETE", headers: headers() });
      if (!res.ok && res.status !== 404 && res.status !== 400) throw new Error(`Supabase delete failed (HTTP ${res.status})`);
    },
    async deletePrefix(prefix) {
      const files = await listAll(prefix);
      for (let i = 0; i < files.length; i += 100) {
        const res = await call(`${base}/object/${encodeURIComponent(cfg.bucket)}`, {
          method: "DELETE",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ prefixes: files.slice(i, i + 100) }),
        });
        if (!res.ok) throw new Error(`Supabase bulk delete failed (HTTP ${res.status})`);
      }
    },
  };
}

let cached: Storage | null = null;
export function supabaseStorage(): Storage {
  return (cached ??= createSupabaseStorage({ url: env.supabaseUrl, key: env.supabaseServiceKey, bucket: env.supabaseBucket }));
}
