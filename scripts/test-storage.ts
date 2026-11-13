/** Supabase storage driver checks against a fake fetch (no network): URLs, auth headers, private bucket, retries, prefix delete. */
import { createSupabaseStorage } from "@/services/storage/supabase";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};

type Call = { url: string; method: string; headers: Record<string, string>; body?: any };

async function main() {
  const calls: Call[] = [];
  const files = new Map<string, Buffer>();
  let failNext = 0;
  const fake = (async (url: any, init: any = {}) => {
    calls.push({ url: String(url), method: init.method, headers: init.headers, body: init.body });
    if (failNext > 0) { failNext--; return new Response("boom", { status: 503 }); }
    const u = new URL(String(url));
    const m = u.pathname.match(/^\/storage\/v1\/object\/(?:list\/)?([^/]+)\/?(.*)$/);
    const key = m ? decodeURIComponent(m[2]) : "";
    if (u.pathname.startsWith("/storage/v1/object/list/")) {
      const { prefix } = JSON.parse(init.body);
      const names = new Map<string, boolean>();
      for (const k of files.keys()) if (k.startsWith(prefix + "/")) { const rest = k.slice(prefix.length + 1).split("/"); names.set(rest[0], rest.length > 1); }
      return Response.json([...names].map(([name, folder]) => ({ name, id: folder ? null : `id-${name}` })));
    }
    if (init.method === "POST") { files.set(key, Buffer.from(init.body)); return Response.json({ Key: key }); }
    if (init.method === "GET") return files.has(key) ? new Response(new Uint8Array(files.get(key)!)) : new Response("{}", { status: 400 });
    if (init.method === "DELETE" && !key) { for (const p of JSON.parse(init.body).prefixes) files.delete(p); return Response.json([]); }
    if (init.method === "DELETE") { files.delete(key); return Response.json({}); }
    return new Response("?", { status: 500 });
  }) as typeof fetch;

  const st = createSupabaseStorage({ url: "https://abc.supabase.co", key: "SERVICE-KEY", bucket: "motionmagic" }, fake);

  console.log("\n[1] Upload, download, delete");
  await st.put("outputs/guest 1/gen1.gif", Buffer.from("GIF89a-data"));
  const put = calls[0];
  check(put.url === "https://abc.supabase.co/storage/v1/object/motionmagic/outputs/guest%201/gen1.gif" && put.method === "POST", "upload goes to the private bucket path (keys URL-encoded)");
  check(put.headers.Authorization === "Bearer SERVICE-KEY" && put.headers["Content-Type"] === "image/gif" && put.headers["x-upsert"] === "true", "service key sent as a header, content type set, upsert on");
  check(!put.url.includes("/public/") && !put.url.includes("SERVICE-KEY"), "never uses the public URL and never puts the key in a URL");
  check((await st.get("outputs/guest 1/gen1.gif")).toString() === "GIF89a-data", "download returns the same bytes");
  let missing = false;
  await st.get("nope.gif").catch(() => (missing = true));
  check(missing, "a missing file throws (like the local driver)");
  await st.delete("outputs/guest 1/gen1.gif");
  check(!files.has("outputs/guest 1/gen1.gif"), "delete removes the file");
  await st.delete("never-existed.gif");
  check(true, "deleting a missing file does not throw");

  console.log("\n[2] Delete a whole folder (previews, nested folders)");
  for (const k of ["previews/g1/a.gif", "previews/g1/b.gif", "previews/g1/sub/c.gif", "previews/g2/keep.gif"]) await st.put(k, Buffer.from("x"));
  await st.deletePrefix("previews/g1/");
  check(![...files.keys()].some((k) => k.startsWith("previews/g1/")) && files.has("previews/g2/keep.gif"), "only that folder is deleted, including nested files");

  console.log("\n[3] A server hiccup is retried once");
  failNext = 1;
  await st.put("a.png", Buffer.from("p"));
  check(files.has("a.png"), "one 503 then success");
  failNext = 2;
  let threw = false;
  await st.put("b.png", Buffer.from("p")).catch(() => (threw = true));
  check(threw && !files.has("b.png"), "two failures in a row surface as an error (the job fails and is refunded)");

  console.log("\n[4] Misconfiguration is refused early");
  let refused = false;
  try { createSupabaseStorage({ url: "", key: "", bucket: "x" }); } catch { refused = true; }
  check(refused, "no URL / key -> clear error");

  if (failed) { console.error(`\n${failed} CHECK(S) FAILED`); process.exit(1); }
  console.log("\nALL STORAGE CHECKS PASSED");
}
main();
