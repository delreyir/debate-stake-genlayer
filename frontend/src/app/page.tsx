"use client";
import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Debate = {
  id: string; topic: string; creator: string; opponent: string;
  creator_stake: string; opponent_stake: string; creator_position: string;
  opponent_position: string; arguments: { author: string; text: string; round: number }[];
  max_rounds: number; current_round: number; status: number; winner: string; judgment: string;
};

const STATUS = ["Open", "Active", "Judging", "Finished"];
const COLORS = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"];

export default function Home() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Debate | null>(null);
  const [form, setForm] = useState({ topic: "", position: "", stake: "", rounds: "3" });
  const [joinPos, setJoinPos] = useState("");
  const [argument, setArgument] = useState("");
  const [tx, setTx] = useState("");

  useEffect(() => { if (CONTRACT_ADDRESS) load(); }, []);

  async function load() {
    try {
      const count = Number(await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_debate_count", args: [] }));
      const loaded: Debate[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_debate", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setDebates(loaded);
    } catch (e) { console.error(e); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    setLoading(true);
    setTx(`Executing ${fn}...`);
    try {
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args, ...(value ? { value } : {}) });
      await client.waitForTransactionReceipt({ hash });
      setTx("✓ Done!");
      await load();
      setSelected(null);
    } catch (e: any) { setTx(`Error: ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>🎯 DebateStake</h1>
      <p style={{ textAlign: "center", color: "#888" }}>Stake tokens. Argue your case. AI judges the winner.</p>

      {tx && <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{tx}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Browse Debates</button>
        <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>Start Debate</button>
      </div>

      {tab === "create" && (
        <form onSubmit={(e) => { e.preventDefault(); send("create_debate", [form.topic, form.position, Number(form.rounds)], BigInt(form.stake) * BigInt(10**18)); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Debate topic (e.g. 'AI will replace developers by 2030')" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} required style={inp} />
          <input placeholder="Your position (e.g. 'For - AI will replace most dev jobs')" value={form.position} onChange={e => setForm({...form, position: e.target.value})} required style={inp} />
          <input placeholder="Stake (GEN)" type="number" min="1" value={form.stake} onChange={e => setForm({...form, stake: e.target.value})} required style={inp} />
          <input placeholder="Rounds (1-5)" type="number" min="1" max="5" value={form.rounds} onChange={e => setForm({...form, rounds: e.target.value})} required style={inp} />
          <button type="submit" disabled={loading} style={btn}>Create Debate & Stake</button>
        </form>
      )}

      {tab === "browse" && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {debates.length === 0 && <p style={{ color: "#888" }}>No debates yet.</p>}
          {debates.map(d => (
            <div key={d.id} onClick={() => setSelected(d)} style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, cursor: "pointer", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{d.topic}</h3>
                <span style={{ background: COLORS[d.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[d.status]}</span>
              </div>
              <p style={{ color: "#aaa", margin: "8px 0 0", fontSize: 14 }}>
                Stake: {(Number(BigInt(d.creator_stake)) / 1e18).toFixed(1)} GEN • Rounds: {d.current_round}/{d.max_rounds}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "browse" && selected && (
        <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6c5ce7", cursor: "pointer" }}>← Back</button>
          <h2>{selected.topic}</h2>
          <span style={{ background: COLORS[selected.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[selected.status]}</span>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#12122a", padding: 12, borderRadius: 8 }}>
              <strong>🔵 Creator</strong><br />
              <small>{selected.creator.slice(0, 10)}...</small><br />
              <em>{selected.creator_position}</em><br />
              Stake: {(Number(BigInt(selected.creator_stake)) / 1e18).toFixed(1)} GEN
            </div>
            <div style={{ background: "#12122a", padding: 12, borderRadius: 8 }}>
              <strong>🔴 Opponent</strong><br />
              <small>{selected.opponent ? selected.opponent.slice(0, 10) + "..." : "Waiting..."}</small><br />
              <em>{selected.opponent_position || "—"}</em><br />
              Stake: {selected.opponent_stake !== "0" ? (Number(BigInt(selected.opponent_stake)) / 1e18).toFixed(1) + " GEN" : "—"}
            </div>
          </div>

          {selected.arguments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Arguments</h4>
              {selected.arguments.map((a, i) => (
                <div key={i} style={{ background: a.author === selected.creator ? "#1a1a3e" : "#2a1a1a", padding: 10, borderRadius: 6, marginBottom: 8, borderLeft: `3px solid ${a.author === selected.creator ? "#2196f3" : "#f44336"}` }}>
                  <small style={{ color: "#888" }}>Round {a.round} — {a.author === selected.creator ? "Creator" : "Opponent"}</small>
                  <p style={{ margin: "4px 0 0" }}>{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {selected.judgment && (
            <div style={{ marginTop: 16, background: "#1a2a1a", padding: 12, borderRadius: 8 }}>
              <strong>⚖️ Verdict:</strong> {JSON.parse(selected.judgment).reasoning}
              <br /><strong>Winner:</strong> {selected.winner === selected.creator ? "Creator 🔵" : "Opponent 🔴"}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {selected.status === 0 && (
              <>
                <input placeholder="Your opposing position..." value={joinPos} onChange={e => setJoinPos(e.target.value)} style={inp} />
                <button onClick={() => send("join_debate", [selected.id, joinPos], BigInt(Number(BigInt(selected.creator_stake))))} disabled={loading || !joinPos} style={btn}>Join & Match Stake</button>
              </>
            )}

            {selected.status === 1 && (
              <>
                <textarea placeholder="Your argument..." value={argument} onChange={e => setArgument(e.target.value)} rows={3} style={inp} />
                <button onClick={() => { send("submit_argument", [selected.id, argument]); setArgument(""); }} disabled={loading || !argument} style={btn}>Submit Argument (Round {selected.current_round + 1})</button>
              </>
            )}

            {selected.status === 2 && (
              <button onClick={() => send("judge_debate", [selected.id])} disabled={loading} style={{ ...btn, background: "#ff9800" }}>⚖️ Trigger AI Judgment</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 14 };
const btn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#6c5ce7", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: "bold" };
const tabBtn = (active: boolean): React.CSSProperties => ({ padding: "10px 20px", background: active ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" });
