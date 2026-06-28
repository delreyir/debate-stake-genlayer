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

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Debate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ topic: "", position: "", stake: "", rounds: "3" });
  const [joinPos, setJoinPos] = useState("");
  const [argument, setArgument] = useState("");
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_debate_count", args: [] }));
      const out: Debate[] = [];
      for (let i = 1; i <= count; i++) { const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_debate", args: [String(i)] }); out.push(JSON.parse(raw as string)); }
      setDebates(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() { setTx("Connecting…"); try { const w = await connectWallet(); setWallet(w); setTx(""); } catch (e: any) { setTx(e.message); } }
  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("Connect wallet first"); return; }
    setLoading(true); setTx(`${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      const _rcpt: any = await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 5000 });
      const _st = String((_rcpt && (_rcpt.statusName ?? _rcpt.status)) || "").toUpperCase();
      if (_st && _st !== "ACCEPTED" && _st !== "FINALIZED") throw new Error(/UNDETERMINED|TIMEOUT|NO_MAJORITY|DISAGREE/.test(_st) ? "AI validators could not reach consensus — no funds were moved. Please try again." : ("Transaction did not complete (" + _st + ")."));
      setTx(""); await load(); setSelected(null); setShowCreate(false);
    } catch (e: any) { setTx(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a12", color: "#fff", fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      {/* Header with glowing toggle connect */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", borderBottom: "1px solid #222" }}>
        <span style={{ fontWeight: 900, fontSize: 20, fontStyle: "italic", letterSpacing: -1 }}>
          <span style={{ color: "#3b82f6" }}>DEBATE</span><span style={{ color: "#fff" }}>/</span><span style={{ color: "#ef4444" }}>STAKE</span>
        </span>
        {wallet.address ? (
          <span style={{ fontSize: 13, color: "#22c55e", fontFamily: "monospace" }}>◉ {shortAddr(wallet.address)}</span>
        ) : (
          <button onClick={handleConnect} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 16px", background: "#111", border: "1px solid #333", borderRadius: 999, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>
            connect <span style={{ width: 30, height: 18, borderRadius: 999, background: "linear-gradient(90deg,#3b82f6,#ef4444)", display: "inline-block", position: "relative" }}><span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "#fff", top: 2, left: 2 }} /></span>
          </button>
        )}
      </div>

      {tx && <p style={{ textAlign: "center", color: "#fbbf24", fontFamily: "monospace" }}>{tx}</p>}

      {!selected && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 24px 80px" }}>
          {/* Hero VS banner */}
          <div style={{ textAlign: "center", padding: "30px 0 40px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: "#3b82f6", fontStyle: "italic" }}>PRO</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: "#fff", textShadow: "0 0 30px rgba(255,255,255,0.3)" }}>VS</span>
              <span style={{ fontSize: 40, fontWeight: 900, color: "#ef4444", fontStyle: "italic" }}>CON</span>
            </div>
            <p style={{ color: "#888", fontFamily: "monospace", marginTop: 10 }}>two sides · staked tokens · AI crowns the winner</p>
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 18, padding: "12px 28px", background: "linear-gradient(90deg,#3b82f6,#ef4444)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 15, letterSpacing: 1 }}>START A DEBATE</button>
          </div>

          {/* About + how it works */}
          <div style={{ background: "rgba(168,85,247,0.08)", border: "1px solid #3d2a5c", borderRadius: 14, padding: "20px 22px", marginBottom: 18 }}>
            <div style={{ fontWeight: 900, fontStyle: "italic", fontSize: 18, color: "#e9d5ff" }}>What is DebateStake?</div>
            <p style={{ color: "#a78bba", fontSize: 14, lineHeight: 1.6, margin: "8px 0 14px" }}>A debate arena where conviction costs tokens. One side argues PRO, the other CON, both stake GEN. After a few rounds of arguments, GenLayer's AI validators judge who made the stronger case — and the winner takes the whole pool.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              {[["1", "Connect your wallet"], ["2", "Start a debate (PRO) or join one (CON) — stake GEN"], ["3", "Both sides post arguments over the rounds"], ["4", "AI judges · winner takes the pool"]].map(([n, t]) => (
                <div key={n} style={{ background: "#1a1228", border: "1px solid #3d2a5c", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ color: "#c084fc", fontWeight: 900, fontStyle: "italic" }}>0{n}</span>
                  <div style={{ color: "#cbb8dd", fontSize: 13, marginTop: 4 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Debate cards as split bars */}
          <div style={{ display: "grid", gap: 14 }}>
            {debates.length === 0 && <p style={{ textAlign: "center", color: "#555", fontFamily: "monospace" }}>// no debates yet</p>}
            {debates.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: "1px solid #222" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ flex: 1, background: "linear-gradient(90deg,#1e3a8a,#0a0a12)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, color: "#60a5fa", fontFamily: "monospace" }}>PRO</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>{d.creator_position?.slice(0, 40) || "—"}</div>
                  </div>
                  <div style={{ flex: 1, background: "linear-gradient(90deg,#0a0a12,#7f1d1d)", padding: "16px 18px", textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>CON</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>{d.opponent_position?.slice(0, 40) || "awaiting challenger"}</div>
                  </div>
                </div>
                <div style={{ background: "#111", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{d.topic}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#888" }}>{STATUS[d.status]} · {(Number(BigInt(d.creator_stake)) / 1e18).toFixed(0)} GEN · R{d.current_round}/{d.max_rounds}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Split-screen detail */}
      {selected && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 80px" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontFamily: "monospace", marginBottom: 12 }}>← back to lobby</button>
          <h2 style={{ textAlign: "center", fontSize: 24 }}>{selected.topic}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", alignItems: "stretch", gap: 0, marginTop: 16 }}>
            {/* PRO side */}
            <div style={{ background: "linear-gradient(180deg,#1e3a8a33,#0a0a12)", border: `2px solid ${selected.winner === selected.creator ? "#22c55e" : "#3b82f6"}`, borderRadius: "12px 0 0 12px", padding: 20 }}>
              <div style={{ color: "#60a5fa", fontWeight: 900, fontSize: 18 }}>PRO {selected.winner === selected.creator && "👑"}</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>{shortAddr(selected.creator)}</div>
              <p style={{ fontSize: 14 }}>{selected.creator_position}</p>
              <div style={{ color: "#3b82f6", fontFamily: "monospace" }}>{(Number(BigInt(selected.creator_stake)) / 1e18).toFixed(0)} GEN</div>
            </div>
            <div style={{ display: "grid", placeItems: "center", background: "#0a0a12", fontWeight: 900, fontStyle: "italic", color: "#fff", fontSize: 20 }}>VS</div>
            {/* CON side */}
            <div style={{ background: "linear-gradient(180deg,#7f1d1d33,#0a0a12)", border: `2px solid ${selected.winner === selected.opponent ? "#22c55e" : "#ef4444"}`, borderRadius: "0 12px 12px 0", padding: 20, textAlign: "right" }}>
              <div style={{ color: "#f87171", fontWeight: 900, fontSize: 18 }}>{selected.winner === selected.opponent && "👑 "}CON</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>{selected.opponent ? shortAddr(selected.opponent) : "—"}</div>
              <p style={{ fontSize: 14 }}>{selected.opponent_position || "awaiting challenger"}</p>
              <div style={{ color: "#ef4444", fontFamily: "monospace" }}>{selected.opponent_stake !== "0" ? (Number(BigInt(selected.opponent_stake)) / 1e18).toFixed(0) + " GEN" : "—"}</div>
            </div>
          </div>

          {/* arguments timeline center */}
          {selected.arguments?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              {selected.arguments.map((a, i) => {
                const pro = a.author === selected.creator;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: pro ? "flex-start" : "flex-end", marginBottom: 8 }}>
                    <div style={{ maxWidth: "70%", background: pro ? "#1e3a8a44" : "#7f1d1d44", border: `1px solid ${pro ? "#3b82f6" : "#ef4444"}`, padding: 12, borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>R{a.round} · {pro ? "PRO" : "CON"}</div>
                      <div style={{ fontSize: 14, marginTop: 4, fontFamily: "system-ui" }}>{a.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selected.judgment && <div style={{ marginTop: 16, textAlign: "center", background: "#052e16", border: "1px solid #22c55e", padding: 16, borderRadius: 12 }}><b style={{ color: "#22c55e" }}>⚖ VERDICT</b><br /><span style={{ fontFamily: "system-ui" }}>{JSON.parse(selected.judgment).reasoning}</span></div>}

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, maxWidth: 500, marginInline: "auto" }}>
            {selected.status === 0 && (<>
              <input placeholder="Your opposing position (CON)…" value={joinPos} onChange={e => setJoinPos(e.target.value)} style={inp} />
              <button onClick={() => send("join_debate", [selected.id, joinPos], BigInt(selected.creator_stake))} disabled={loading || !joinPos} style={{ ...actBtn, background: "#ef4444" }}>JOIN AS CON & MATCH STAKE</button>
            </>)}
            {selected.status === 1 && (<>
              <textarea placeholder="Your argument…" value={argument} onChange={e => setArgument(e.target.value)} rows={3} style={inp} />
              <button onClick={() => { send("submit_argument", [selected.id, argument]); setArgument(""); }} disabled={loading || !argument} style={actBtn}>SUBMIT ARGUMENT (R{selected.current_round + 1})</button>
            </>)}
            {selected.status === 2 && <button onClick={() => send("judge_debate", [selected.id])} disabled={loading} style={{ ...actBtn, background: "linear-gradient(90deg,#f59e0b,#ef4444)" }}>⚖ TRIGGER AI JUDGMENT</button>}
          </div>
        </div>
      )}

      {/* create modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); send("create_debate", [form.topic, form.position, Number(form.rounds)], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%" }}>
            <h2 style={{ marginTop: 0, textAlign: "center" }}>Open the Floor</h2>
            <input placeholder="Debate topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required style={inp} />
            <input placeholder="Your position (PRO)" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required style={inp} />
            <div style={{ display: "flex", gap: 10 }}>
              <input placeholder="Stake GEN" type="number" min="1" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} />
              <input placeholder="Rounds" type="number" min="1" max="5" value={form.rounds} onChange={e => setForm({ ...form, rounds: e.target.value })} required style={inp} />
            </div>
            <button disabled={loading} style={{ ...actBtn, background: "linear-gradient(90deg,#3b82f6,#ef4444)" }}>🎤 OPEN THE FLOOR</button>
          </form>
        </div>
      )}
      <style>{`body{margin:0}`}</style>
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#0a0a12", color: "#fff", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 10, fontFamily: "system-ui" };
const actBtn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 900, letterSpacing: 0.5 };
