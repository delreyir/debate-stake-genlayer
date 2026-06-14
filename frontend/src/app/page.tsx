"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Debate = {
  id: string; topic: string; creator: string; opponent: string; creator_stake: string; opponent_stake: string;
  creator_position: string; opponent_position: string; arguments: { author: string; text: string; round: number }[];
  max_rounds: number; current_round: number; status: number; winner: string; judgment: string;
};

const STATUS = ["OPEN", "LIVE", "JUDGING", "DECIDED"];
const SCOLOR = ["#22c55e", "#a855f7", "#f59e0b", "#ec4899"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Debate | null>(null);
  const [form, setForm] = useState({ topic: "", position: "", stake: "", rounds: "3" });
  const [joinPos, setJoinPos] = useState("");
  const [argument, setArgument] = useState("");
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_debate_count", args: [] }));
      const out: Debate[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_debate", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setDebates(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting…");
    try { const w = await connectWallet(); setWallet(w); setTx(`Connected · ${shortAddr(w.address!)}`); }
    catch (e: any) { setTx(`⚠ ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx(`${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("✓ Done!"); await load(); setSelected(null);
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 20% 20%,#2d1b4e 0%,#0d0717 55%)", color: "#f3e8ff" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, fontStyle: "italic", background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            DEBATE<span style={{ fontStyle: "normal" }}>·</span>STAKE
          </h1>
          {wallet.address ? (
            <div style={{ ...pill, color: "#e9d5ff", border: "1px solid #a855f7", background: "#2d1b4e" }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={btn}>Connect Wallet</button>
          )}
        </div>
        <p style={{ color: "#a78bba", marginTop: 4, fontSize: 13 }}>Pick a side. Stake. Argue. AI crowns the winner.</p>

        {tx && <div style={statusBar}>{tx}</div>}

        <div style={{ display: "flex", gap: 10, margin: "20px 0" }}>
          <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>⚡ LIVE DEBATES</button>
          <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>+ START ONE</button>
        </div>

        {tab === "create" && (
          <form onSubmit={e => { e.preventDefault(); send("create_debate", [form.topic, form.position, Number(form.rounds)], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>TOPIC</label>
            <input placeholder="AI will replace developers by 2030" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required style={inp} />
            <label style={lbl}>YOUR POSITION</label>
            <input placeholder="For — AI will replace most dev jobs" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required style={inp} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><label style={lbl}>STAKE (GEN)</label><input type="number" min="1" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>ROUNDS (1-5)</label><input type="number" min="1" max="5" value={form.rounds} onChange={e => setForm({ ...form, rounds: e.target.value })} required style={inp} /></div>
            </div>
            <button type="submit" disabled={loading} style={{ ...btn, marginTop: 14, width: "100%" }}>🎤 OPEN THE FLOOR</button>
          </form>
        )}

        {tab === "browse" && !selected && (
          <div style={{ display: "grid", gap: 12 }}>
            {debates.length === 0 && <p style={{ color: "#6d5a85" }}>No debates yet. Start the first.</p>}
            {debates.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{d.topic}</div>
                  <div style={{ color: "#c084fc", fontSize: 13, marginTop: 4 }}>◈ {(Number(BigInt(d.creator_stake)) / 1e18).toFixed(0)} GEN · round {d.current_round}/{d.max_rounds}</div>
                </div>
                <span style={{ ...pill, color: SCOLOR[d.status], border: `1px solid ${SCOLOR[d.status]}` }}>{STATUS[d.status]}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "browse" && selected && (
          <div style={card}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#c084fc", cursor: "pointer" }}>← back</button>
            <h2 style={{ marginTop: 8 }}>{selected.topic}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={{ background: selected.winner === selected.creator ? "#2a1a3e" : "#1a1228", border: `2px solid ${selected.winner === selected.creator ? "#22c55e" : "#a855f7"}`, padding: 14, borderRadius: 10 }}>
                <strong style={{ color: "#c084fc" }}>🔵 PRO {selected.winner === selected.creator && "👑"}</strong>
                <p style={{ fontSize: 12, color: "#a78bba" }}>{shortAddr(selected.creator)}</p>
                <p style={{ fontStyle: "italic", fontSize: 13 }}>{selected.creator_position}</p>
                <div style={{ color: "#22c55e", fontSize: 13 }}>{(Number(BigInt(selected.creator_stake)) / 1e18).toFixed(0)} GEN</div>
              </div>
              <div style={{ background: selected.winner === selected.opponent ? "#2a1a3e" : "#1a1228", border: `2px solid ${selected.winner === selected.opponent ? "#22c55e" : "#ec4899"}`, padding: 14, borderRadius: 10 }}>
                <strong style={{ color: "#f472b6" }}>🔴 CON {selected.winner === selected.opponent && "👑"}</strong>
                <p style={{ fontSize: 12, color: "#a78bba" }}>{selected.opponent ? shortAddr(selected.opponent) : "waiting…"}</p>
                <p style={{ fontStyle: "italic", fontSize: 13 }}>{selected.opponent_position || "—"}</p>
                <div style={{ color: "#ec4899", fontSize: 13 }}>{selected.opponent_stake !== "0" ? (Number(BigInt(selected.opponent_stake)) / 1e18).toFixed(0) + " GEN" : "—"}</div>
              </div>
            </div>

            {selected.arguments?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h4 style={{ color: "#c084fc" }}>Arguments</h4>
                {selected.arguments.map((a, i) => (
                  <div key={i} style={{ background: "#1a1228", padding: 10, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${a.author === selected.creator ? "#a855f7" : "#ec4899"}` }}>
                    <small style={{ color: "#6d5a85" }}>Round {a.round} · {a.author === selected.creator ? "PRO" : "CON"}</small>
                    <p style={{ margin: "4px 0 0", fontSize: 14 }}>{a.text}</p>
                  </div>
                ))}
              </div>
            )}

            {selected.judgment && <div style={{ marginTop: 14, background: "#2a1a3e", border: "1px solid #22c55e", padding: 14, borderRadius: 10 }}><strong style={{ color: "#22c55e" }}>⚖ VERDICT</strong><br />{JSON.parse(selected.judgment).reasoning}</div>}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.status === 0 && (
                <>
                  <input placeholder="Your opposing position…" value={joinPos} onChange={e => setJoinPos(e.target.value)} style={inp} />
                  <button onClick={() => send("join_debate", [selected.id, joinPos], BigInt(selected.creator_stake))} disabled={loading || !joinPos} style={btn}>🔴 JOIN AS CON & MATCH STAKE</button>
                </>
              )}
              {selected.status === 1 && (
                <>
                  <textarea placeholder="Your argument…" value={argument} onChange={e => setArgument(e.target.value)} rows={3} style={inp} />
                  <button onClick={() => { send("submit_argument", [selected.id, argument]); setArgument(""); }} disabled={loading || !argument} style={btn}>SUBMIT ARGUMENT (round {selected.current_round + 1})</button>
                </>
              )}
              {selected.status === 2 && <button onClick={() => send("judge_debate", [selected.id])} disabled={loading} style={{ ...btn, background: "linear-gradient(90deg,#f59e0b,#ec4899)" }}>⚖ TRIGGER AI JUDGMENT</button>}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 50, textAlign: "center", color: "#5a4775", fontSize: 12 }}>Judged by GenLayer AI consensus · {shortAddr(CONTRACT_ADDRESS)}</footer>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "rgba(26,18,40,0.8)", border: "1px solid #3d2a5c", borderRadius: 14, padding: 20 };
const inp: React.CSSProperties = { padding: 11, borderRadius: 10, border: "1px solid #3d2a5c", background: "#0d0717", color: "#f3e8ff", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 4 };
const lbl: React.CSSProperties = { fontSize: 11, color: "#a78bba", fontWeight: 700, marginTop: 12, display: "block", letterSpacing: 1 };
const btn: React.CSSProperties = { padding: "12px 22px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#a855f7,#ec4899)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 800 };
const pill: React.CSSProperties = { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 };
const statusBar: React.CSSProperties = { background: "rgba(168,85,247,0.1)", border: "1px solid #a855f744", padding: 12, borderRadius: 10, fontSize: 13, color: "#e9d5ff", marginTop: 16 };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 18px", background: a ? "linear-gradient(90deg,#a855f7,#ec4899)" : "transparent", border: a ? "none" : "1px solid #3d2a5c", borderRadius: 10, color: a ? "#fff" : "#a78bba", cursor: "pointer", fontWeight: 700 });
