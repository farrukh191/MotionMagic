"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPkr } from "@/features/payments/pricing";

type Report = { days: number; revenuePkr: number; refundedPkr: number; refundDuePkr: number; aiBilledUsd: number; aiNotionalUsd: number; feesPkr: number; marginPkr: number; marginIfPaidAiPkr: number; byEffect: { effect: string; orders: number; revenuePkr: number; aiBilledUsd: number; aiNotionalUsd: number }[] };
type Refund = { id: string; orderRef: string | null; amountPkr: number; reason: string | null; generationId: string };

export default function Admin() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<{ report: Report; refunds: Refund[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    const r = await fetch("/api/admin/summary?days=30", { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) { setData(null); return setErr("Wrong token, or ADMIN_TOKEN is not set on the server."); }
    setErr(null); setData(await r.json());
    try { sessionStorage.setItem("mm-admin", t); } catch { /* private window */ }
  }, []);

  useEffect(() => { try { const t = sessionStorage.getItem("mm-admin"); if (t) { setToken(t); load(t); } } catch { /* ignore */ } }, [load]);

  async function done(id: string) {
    await fetch(`/api/admin/refund/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    load(token);
  }

  const card = "rounded-2xl border border-white/10 bg-white/5 p-5";
  const r = data?.report;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      {!data && (
        <form className={`${card} flex gap-3`} onSubmit={(e) => { e.preventDefault(); load(token); }}>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
          <button className="rounded-full bg-fuchsia-500 px-5 py-2 font-semibold">Open</button>
        </form>
      )}
      {err && <p className="text-red-300">{err}</p>}
      {r && data && (
        <>
          <section className={card}>
            <h2 className="text-lg font-bold">Refunds to do ({data.refunds.length})</h2>
            <p className="text-sm text-zinc-400">Money was taken but the GIF failed or the payment could not be used. Refund in the Easypaisa merchant portal, then press Done.</p>
            {data.refunds.length === 0 ? <p className="mt-3 text-zinc-400">Nothing to refund. 🎉</p> : (
              <ul className="mt-3 divide-y divide-white/10">
                {data.refunds.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <b>{formatPkr(x.amountPkr)}</b><span className="font-mono text-zinc-400">{x.orderRef}</span>
                    <span className="flex-1 text-zinc-400">{x.reason}</span>
                    <button onClick={() => done(x.id)} className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/10">Done</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card}>
            <h2 className="text-lg font-bold">Last {r.days} days</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[["Revenue", formatPkr(r.revenuePkr)], ["Refunded", formatPkr(r.refundedPkr)], ["Gateway fees (estimate)", formatPkr(r.feesPkr)], ["AI cost billed", `$${r.aiBilledUsd.toFixed(2)}`], ["AI cost if on paid plans", `$${r.aiNotionalUsd.toFixed(2)}`], ["You kept", formatPkr(r.marginPkr)], ["You would keep on paid AI", formatPkr(r.marginIfPaidAiPkr)], ["Refunds still due", formatPkr(r.refundDuePkr)]].map(([k, v]) => (
                <div key={k}><dt className="text-zinc-400">{k}</dt><dd className="text-xl font-bold">{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className={card}>
            <h2 className="text-lg font-bold">By effect</h2>
            <table className="mt-3 w-full text-left text-sm"><thead className="text-zinc-400"><tr><th>Effect</th><th>Orders</th><th>Revenue</th><th>AI billed</th><th>AI if paid</th></tr></thead>
              <tbody>{r.byEffect.map((e) => <tr key={e.effect} className="border-t border-white/10"><td className="py-2">{e.effect}</td><td>{e.orders}</td><td>{formatPkr(e.revenuePkr)}</td><td>${e.aiBilledUsd.toFixed(3)}</td><td>${e.aiNotionalUsd.toFixed(3)}</td></tr>)}</tbody></table>
          </section>
        </>
      )}
    </main>
  );
}
