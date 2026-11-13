import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { supabaseStorage } from "./supabase";

/**
 * Private storage abstraction. Drivers: "local" (development) and "supabase" (private Supabase Storage bucket).
 * Files are never served directly; downloads go through a signed-token route.
 */
export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Deletes every file whose key starts with this prefix (e.g. a folder of previews). */
  deletePrefix(prefix: string): Promise<void>;
}

function safePath(key: string): string {
  const root = path.resolve(env.localStorageDir);
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

const localStorage: Storage = {
  async put(key, data) {
    const file = safePath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  },
  async get(key) {
    return fs.readFile(safePath(key));
  },
  async delete(key) {
    await fs.rm(safePath(key), { force: true });
  },
  async deletePrefix(prefix) {
    await fs.rm(safePath(prefix.replace(/\/$/, "")), { recursive: true, force: true });
  },
};

export function getStorage(): Storage {
  if (env.storageDriver === "local") return localStorage;
  if (env.storageDriver === "supabase") return supabaseStorage();
  throw new Error(`Storage driver "${env.storageDriver}" is not implemented yet`);
}
