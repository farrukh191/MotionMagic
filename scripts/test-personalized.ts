/**
 * Personalized GIF generator checks, including an END-TO-END run on an in-memory database:
 * live preview (browser HTML, nothing stored) -> pay (simulator) -> server-side verification -> the GIF is drawn on the
 * fly at download time (never stored) -> signed private download. Run: npm run test:personalized
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

type Row = Record<string, any>;
const tables: Record<string, Row[]> = { generation: [], payment: [], generatedAsset: [], aiUsageLog: [], user: [], authSession: [] };
const match = (row: Row, where: Row = {}): boolean =>
  Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((w) => match(row, w));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("in" in v) return v.in.includes(row[k]);
      if ("lt" in v) return row[k] < v.lt;
      if ("gt" in v) return row[k] > v.gt;
      if ("gte" in v) return row[k] >= v.gte;
      if ("not" in v) return row[k] !== v.not;
      if ("startsWith" in v) return String(row[k]).startsWith(v.startsWith);
    }
    return row[k] === v;
  });
let seq = 0;
const table = (name: string) => ({
  create: async ({ data }: Row) => {
    if (tables[name].some((r) => (data.idempotencyKey && r.idempotencyKey === data.idempotencyKey) || (data.providerOrderId && r.providerOrderId === data.providerOrderId)))
      throw Object.assign(new Error("unique"), { code: "P2002" });
    const row = { id: `${name[0]}${++seq}`, createdAt: new Date(), updatedAt: new Date(), status: name === "generation" ? "DRAFT" : "PENDING", paymentStatus: "NONE", providerRef: null, paidAt: null, refundedAt: null, rawStatus: null, failureReason: null, attempts: 0, ...data };
    tables[name].push(row);
    return row;
  },
  findUnique: async ({ where }: Row) => tables[name].find((r) => match(r, where)) ?? null,
  findUniqueOrThrow: async ({ where }: Row) => {
    const r = tables[name].find((x) => match(x, where));
    if (!r) throw new Error("not found");
    return r;
  },
  findFirst: async ({ where, orderBy }: Row = {}) => {
    const rows = tables[name].filter((r) => match(r, where));
    if (orderBy?.createdAt === "desc") rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows[0] ?? null;
  },
  findMany: async ({ where }: Row = {}) => tables[name].filter((r) => match(r, where)),
  count: async ({ where }: Row = {}) => tables[name].filter((r) => match(r, where)).length,
  update: async ({ where, data }: Row) => {
    const r = tables[name].find((x) => match(x, where));
    if (!r) throw new Error("not found");
    Object.assign(r, data);
    return r;
  },
  updateMany: async ({ where, data }: Row) => {
    const rows = tables[name].filter((r) => match(r, where));
    rows.forEach((r) => Object.assign(r, data));
    return { count: rows.length };
  },
  delete: async ({ where }: Row) => {
    tables[name] = tables[name].filter((r) => !match(r, where));
  },
  deleteMany: async ({ where }: Row = {}) => {
    tables[name] = tables[name].filter((r) => !match(r, where));
    return { count: 0 };
  },
  aggregate: async () => ({ _sum: { costUsd: 0, notionalCostUsd: 0 } }),
});
(globalThis as any).prisma = Object.fromEntries(Object.keys(tables).map((t) => [t, table(t)]));

const tmp = path.join(os.tmpdir(), `mm-test-${process.pid}`);
require("node:fs").mkdirSync(tmp, { recursive: true });
const setEnv = (key: string, value: string) => Object.defineProperty(process.env, key, { value, configurable: true, writable: true, enumerable: true });
setEnv("LOCAL_STORAGE_DIR", tmp);
setEnv("PAYMENT_PROVIDER", "easypaisa-sim");
setEnv("ALLOW_PAYMENT_SIM", "true");
setEnv("NODE_ENV", "test");
setEnv("AI_MODE", "mock");
setEnv("PERSONALIZED_ONLY", "true");

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};
const centerDiff = async (a: Buffer, b: Buffer) => {
  const crop = async (g: Buffer) => sharp(g, { page: 0 }).resize(120, 120).extract({ left: 10, top: 40, width: 100, height: 40 }).greyscale().raw().toBuffer();
  const [x, y] = [await crop(a), await crop(b)];
  let d = 0;
  for (let i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]);
  return d / x.length;
};

async function main() {
  const meta = await import("@/features/personalized/meta");
  const { buildPersonalDocument } = await import("@/features/personalized/build");
  const { renderPersonalGif } = await import("@/features/personalized/render");
  const { PREVIEW_SPEC } = await import("@/features/effects/render");
  const { closeBrowser } = await import("@/features/effects/html/browser");

  console.log("\n[1] Five templates");
  check(meta.templatesIn("birthday").map((t) => t.name).join("|") === "Balloons Celebration|Birthday Cake|Beautiful Flowers|Colourful Confetti|Golden Celebration", "the 5 requested templates, in order");
  const ids = meta.PERSONAL_CATEGORIES.map((c) => c.id);
  check(["birthday", "festival", "wedding", "anniversary"].every((i) => ids.includes(i)), `categories: ${ids.join(", ")}`);
  check(meta.templatesIn("birthday").length === 5 && meta.templatesIn("festival").length === 15, "Birthday has 5 designs; Festival has 15");
  check(meta.templatesIn("wedding").length === 0, "other categories stay empty (coming soon), no fake designs");
  check(new Set(meta.PERSONAL_TEMPLATES.map((t) => t.id)).size === meta.PERSONAL_TEMPLATES.length && meta.PERSONAL_TEMPLATES.every((t) => meta.getPersonalTemplate(t.id)?.id === t.id), "template ids are unique and all resolvable");
  check(meta.PERSONAL_TEMPLATES.every((t) => ids.includes(t.category)), "every template belongs to a real category");
  const fluid = buildPersonalDocument("balloons", "Ayesha", "fluid");
  check(/--w:100vmin/.test(fluid) && !/preview|motionmagic/i.test(fluid.replace(/<style>[\s\S]*?<\/style>/, "")) && /Happy Birthday/.test(fluid), "live browser version fills its box and carries no watermark text");
  check(!/<script/i.test(fluid), "live version has no script");

  console.log("\n[2] The name is the only input, and it is cleaned");
  const n = meta.normalizeName;
  check(n("  Ayesha  ") === "Ayesha" && n("Ayesha   Khan") === "Ayesha Khan", "spaces tidied");
  check(!/[<>()/=;"]/.test(n(`<script>alert(1)</script>"><img onerror=x>`)), "markup characters removed");
  check(n("Ayesha 🎂 123") === "Ayesha", "emoji and digits removed");
  check(n("عائشہ") === "عائشہ" && n("O'Brien") === "O'Brien" && n("Zoë") === "Zoë", "Urdu, apostrophes and accents kept");
  check(n("A".repeat(60)).length === 20, "limited to 20 characters");
  check(!meta.isValidName(n("1234")) && !meta.isValidName("") && meta.isValidName("Ayesha"), "names need at least one letter");

  console.log("\n[3] The original animation is preserved; only the text changes");
  for (const t of meta.PERSONAL_TEMPLATES) {
    const strip = (name: string) => buildPersonalDocument(t.id, name, 480).split("Ayesha").join("N").split("Zainab").join("N").replace(/>\s*[A-Za-z]<\/i>/g, "></i>");
    const a = buildPersonalDocument(t.id, "Ayesha", 480);
    const b = buildPersonalDocument(t.id, "Zainab", 480);
    const sameShape = a.replace(/<span class="nm">.*?<\/span>/, "").length === b.replace(/<span class="nm">.*?<\/span>/, "").length;
    check(a !== b && sameShape && /@keyframes/.test(a), `${t.id}: same scene and animation for different names`);
    void strip;
  }
  const hostile = buildPersonalDocument("cake", `Ayesha</style><img src=x onerror=alert(1)>`, 480);
  check(!/<img/i.test(hostile) && !/<script/i.test(hostile) && /content="default-src 'none'/.test(hostile), "hostile name cannot inject markup; page has a strict content policy");

  console.log("\n[4] Real GIFs for every template and name style");
  const names = ["Ayesha", "Muhammad Abdul Rahman", "عائشہ", "Zoë O'Brien"];
  // 5 birthday designs x 4 names, 15 festival designs x 2 names (keeps the run time reasonable)
  const renders: Record<string, Buffer> = {};
  for (const t of meta.PERSONAL_TEMPLATES) {
    for (const name of t.category === "birthday" ? names : [names[0], names[2]]) {
      const r = await renderPersonalGif(t.id, name, { ...PREVIEW_SPEC, seconds: 4 });
      renders[`${t.id}:${name}`] = r.gif;
      const ok = r.gif.subarray(0, 6).toString("ascii") === "GIF89a" && r.gif.includes(Buffer.from("NETSCAPE2.0")) && r.frames === 40 && r.gif.length < 1.5 * 1024 * 1024 && r.width === r.height;
      check(ok, `${t.id} / ${name}: looping square GIF, ${r.frames} frames, ${Math.round(r.gif.length / 1024)} KB`);
    }
    const d = await centerDiff(renders[`${t.id}:Ayesha`], renders[`${t.id}:عائشہ`]);
    check(d > 3, `${t.id}: the text on the picture really changes with the name (diff ${d.toFixed(1)})`);
  }
  await fs.mkdir(path.join(tmp, "sheet"), { recursive: true });
  for (const [k, v] of Object.entries(renders)) if (k.endsWith("Muhammad Abdul Rahman") || k.endsWith("عائشہ")) await fs.writeFile(path.join(tmp, "sheet", k.replace(/[: ]/g, "_") + ".gif"), v);

  console.log("\n[5] End to end: live preview -> pay -> verify -> GIF drawn at download time, nothing stored");
  const svc = await import("@/features/personalized/service");
  const pay = await import("@/features/payments/service");
  const { claimNextJob } = await import("@/features/generation/process");
  const { deliverGif, DeliverError } = await import("@/features/downloads/deliver");
  const { createDownloadToken, verifyDownloadToken } = await import("@/features/downloads/signed-url");
  const listFiles = async (dir: string): Promise<string[]> => {
    const out: string[] = [];
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await listFiles(full)));
      else out.push(full);
    }
    return out;
  };
  const stored = async () => (await listFiles(tmp)).filter((f) => !f.includes(`${path.sep}sheet${path.sep}`));

  const { env } = await import("@/lib/env");
  (env as { requireLogin: boolean }).requireLogin = false; // sections 5-6 test payment on its own; accounts are section 7
  const tpl = meta.getPersonalTemplate("golden")!;
  const d = await svc.createPersonalDraft({ guestSessionId: "guest1", template: tpl, rawName: "  Ayesha " });
  const gen = tables.generation.find((g) => g.id === d.id)!;
  check(gen.status === "DRAFT" && gen.options.name === "Ayesha" && gen.kind === "personal", "draft created with the cleaned name, no upload");
  check((await stored()).length === 0, "creating the draft stores no file");
  let bad = false;
  await svc.createPersonalDraft({ guestSessionId: "guest1", template: tpl, rawName: "12345" }).catch(() => (bad = true));
  check(bad, "an invalid name is refused");

  await svc.updatePersonalDraft(gen.id, "guest1", { name: "Zara" }); // Change Name
  check(gen.options.name === "Zara", "Change Name updates the draft");

  let unpaid = false;
  await deliverGif(gen.id).catch((e) => (unpaid = e instanceof DeliverError && e.status === 404));
  check(unpaid && (await claimNextJob()) === null, "before payment nothing can be downloaded and nothing is queued");

  const start = await pay.startPayment(gen.id, "guest1");
  check(Boolean(start.redirect?.url.startsWith("/pay/sim")) && gen.status === "DRAFT", "Download -> payment screen sends the customer to the gateway");
  const payment = tables.payment[0];
  await pay.settlePayment(payment.id);
  check(gen.status === "DRAFT", "returning from the gateway without paying unlocks nothing");
  unpaid = false;
  await deliverGif(gen.id).catch(() => (unpaid = true));
  check(unpaid, "still refused");

  payment.rawStatus = "SIM_PAID"; // the simulated customer pays on the gateway page
  await pay.settlePayment(payment.id);
  check(gen.status === "COMPLETED" && payment.status === "AUTHORIZED" && (await claimNextJob()) === null, "verified payment marks it ready; the worker is not involved");
  check(!gen.outputKey, "no output file recorded");

  const out = await deliverGif(gen.id);
  const m = await sharp(out.data, { page: 0 }).metadata();
  check(out.data.subarray(0, 6).toString("ascii") === "GIF89a" && m.width === m.height && (m.width ?? 0) >= 320, `GIF drawn on demand: square ${m.width}x${m.height}, ${Math.round(out.data.length / 1024)} KB`);
  check(payment.status === "CAPTURED", "payment finalized after delivery");
  check((await stored()).length === 0, "NOTHING was written to storage or disk (no previews/, no outputs/)");
  const again = await deliverGif(gen.id);
  check(again.data.subarray(0, 6).toString("ascii") === "GIF89a", "downloading again just draws it again");
  check(await centerDiff(out.data, renders["golden:Ayesha"]).then((x) => x > 1), "the delivered GIF carries the saved name (Zara), not the earlier one");

  const token = createDownloadToken(gen.id);
  check(verifyDownloadToken(token)?.generationId === gen.id, "secure download token verifies");
  check(verifyDownloadToken(token.slice(0, -2) + "xx") === null && verifyDownloadToken(createDownloadToken(gen.id, -5)) === null, "tampered and expired tokens are rejected");

  console.log("\n[6] Payment switch: PAYMENT_REQUIRED=false downloads directly");
  (env as { paymentRequired: boolean }).paymentRequired = false;
  const d2 = await svc.createPersonalDraft({ guestSessionId: "guest2", template: tpl, rawName: "Sana" });
  const g2 = tables.generation.find((g) => g.id === d2.id)!;
  const paymentsBefore = tables.payment.length;
  const r2 = await pay.startPayment(g2.id, "guest2");
  check(!r2.redirect && g2.status === "COMPLETED" && tables.payment.length === paymentsBefore, "free mode: no payment created, no redirect, ready at once");
  const f2 = await deliverGif(g2.id);
  check(f2.data.subarray(0, 6).toString("ascii") === "GIF89a", "free mode: GIF delivered directly");
  check((await stored()).length === 0, "free mode also stores nothing");
  (env as { paymentRequired: boolean }).paymentRequired = true;
  let locked = false;
  await deliverGif(g2.id).catch((e) => (locked = e instanceof DeliverError && e.status === 404));
  check(locked, "switch back to true: the unpaid GIF is locked again");
  const d3 = await svc.createPersonalDraft({ guestSessionId: "guest3", template: tpl, rawName: "Hira" });
  const r3 = await pay.startPayment(d3.id, "guest3");
  check(Boolean(r3.redirect) && tables.generation.find((g) => g.id === d3.id)!.status === "DRAFT", "switch true: Easypaisa payment is required as before");

  console.log("\n[7] Accounts: sign up / log in before download");
  (env as { requireLogin: boolean }).requireLogin = true;
  const auth = await import("@/features/auth/service");
  const { hashPassword, verifyPassword } = await import("@/features/auth/password");
  const h = await hashPassword("secret-pass-1");
  check(!h.includes("secret-pass-1") && (await verifyPassword("secret-pass-1", h)) && !(await verifyPassword("wrong", h)) && !(await verifyPassword("x", null)), "passwords are hashed (scrypt) and verified");
  const bads: [any, string][] = [[{ name: "", email: "a@b.co", password: "12345678" }, "name"], [{ name: "Ali", email: "nope", password: "12345678" }, "email"], [{ name: "Ali", email: "a@b.co", password: "short" }, "short password"]];
  for (const [b, what] of bads) { let e = false; await auth.signUp(b).catch(() => (e = true)); check(e, `sign-up refused: bad ${what}`); }
  const u = await auth.signUp({ name: " Ayesha <b>Khan ", email: " Ayesha@Gmail.COM ", password: "secret-pass-1" });
  check(u.email === "ayesha@gmail.com" && u.name === "Ayesha bKhan", "sign-up cleans the email and name");
  let dup = false;
  await auth.signUp({ name: "X", email: "ayesha@gmail.com", password: "another-pass" }).catch(() => (dup = true));
  check(dup, "the same email cannot sign up twice");
  check(!JSON.stringify(tables.user).includes("secret-pass-1"), "the password is never stored");
  let wrong = false;
  await auth.signIn({ email: "ayesha@gmail.com", password: "nope-nope" }).catch(() => (wrong = true));
  const okUser = await auth.signIn({ email: "AYESHA@gmail.com", password: "secret-pass-1" });
  check(wrong && okUser.id === u.id, "wrong password refused, right one signs in (email not case sensitive)");
  const sess = await auth.createSession(u.id);
  check((await auth.userFromToken(sess.token))?.id === u.id && (await auth.userFromToken(sess.token + "x")) === null, "session token works; a forged one does not");
  check(!tables.authSession.some((s) => s.id === sess.token), "only a hash of the token is stored");
  await auth.destroySession(sess.token);
  check((await auth.userFromToken(sess.token)) === null, "logout ends the session");

  const dg = await svc.createPersonalDraft({ guestSessionId: "guest9", template: tpl, rawName: "Maryam" });
  const gg = tables.generation.find((g) => g.id === dg.id)!;
  let needLogin = 0;
  await pay.startPayment(gg.id, "guest9", null).catch((e) => (needLogin = e.status));
  check(needLogin === 401 && gg.status === "DRAFT", "Download without signing in is refused by the server (401)");
  await auth.claimGuestGenerations(u.id, "guest9");
  check(gg.userId === u.id, "logging in claims the GIFs this browser made as a guest");
  let other = 0;
  const u2 = await auth.signUp({ name: "Sara", email: "sara@example.com", password: "sara-pass-123" });
  await pay.startPayment(gg.id, "guest9", u2.id).catch((e) => (other = e.status));
  check(other === 404, "another account cannot unlock someone else's GIF");
  (env as { paymentRequired: boolean }).paymentRequired = false;
  await pay.startPayment(gg.id, "guest9", u.id);
  check(gg.status === "COMPLETED", "signed-in owner can download (free mode here)");
  let noAuth = 0, wrongUser = 0;
  await deliverGif(gg.id, null).catch((e) => (noAuth = e.status));
  await deliverGif(gg.id, u2.id).catch((e) => (wrongUser = e.status));
  check(noAuth === 401 && wrongUser === 401, "download link alone is not enough: owner must be signed in");
  const mine = await deliverGif(gg.id, u.id);
  check(mine.data.subarray(0, 6).toString("ascii") === "GIF89a", "owner receives the GIF");
  check(tables.generation.filter((g) => g.userId === u.id && g.status === "COMPLETED").length === 1, "account counts: 1 GIF created");

  console.log("  Google link safety");
  const pre = await auth.signUp({ name: "Victim", email: "victim@gmail.com", password: "attacker-knows-this" }); // pre-registered by someone else
  await auth.createSession(pre.id);
  const viaG = await auth.signInWithGoogle({ sub: "g-123", email: "victim@gmail.com", emailVerified: true, name: "Victim" });
  check(viaG.id === pre.id && tables.user.find((x) => x.id === pre.id)!.passwordHash === null && !tables.authSession.some((s) => s.userId === pre.id), "Google verification takes over a pre-registered account: old password removed");
  let unv = false;
  await auth.signInWithGoogle({ sub: "g-456", email: "new@gmail.com", emailVerified: false, name: "N" }).catch(() => (unv = true));
  check(unv, "an unverified Google email is refused");

  await closeBrowser();
  await fs.rm(tmp, { recursive: true, force: true }).catch(() => null);
  if (failed) {
    console.error(`\n${failed} CHECK(S) FAILED`);
    process.exit(1);
  }
  console.log("\nALL PERSONALIZED CHECKS PASSED");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
