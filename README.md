# 🎤 DebateStake

**Pick a side. Stake. Argue. AI crowns the winner.**

🔗 **Live app:** https://debatestake.pages.dev
📜 **Contract (GenLayer Studionet):** `0x79435f6C549f67eb5e3B8d93b8089Df4239CF6A9`

---

## The Problem

Online debates go nowhere — no stakes, no resolution, just endless replies and whoever shouts loudest "wins." There's no neutral way to decide who actually made the stronger argument.

DebateStake turns debate into a game with skin in it: two sides stake tokens, argue over several rounds, and GenLayer's AI validators judge who built the better case. Winner takes the pool.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet — no Snap required)
2. **Start a debate** (the PRO side) — set a topic, your position, stake, and number of rounds. Or **join** an open one as the CON side and match the stake.
3. **Both sides post arguments**, taking turns across the rounds.
4. **AI judges** — validators score both sides on logic, evidence, addressing counter-arguments, and persuasiveness. The winner takes the combined pool.

---

## Why GenLayer?

Deciding who argued better is purely subjective — impossible for a normal smart contract. GenLayer validators each read the full debate and judge independently; the **winner** must match and the scores must agree within a tolerance before payout, so the verdict is neutral and not gameable by one party.

---

## Wallet & Network

Standard EVM wallet, normal signing popup — **no GenLayer Snap**. On connect it adds/switches to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `create_debate(topic, position, max_rounds)` | payable | Open a debate as PRO + stake |
| `join_debate(debate_id, position)` | payable | Join as CON + match stake |
| `submit_argument(debate_id, argument)` | write | Post your argument (turn-based) |
| `judge_debate(debate_id)` | write (AI) | AI scores both sides & pays the winner |
| `cancel_debate(debate_id)` | write | Cancel an open debate, refund |
| `get_debate(debate_id)` | view | Full debate state |
| `get_debate_count()` | view | Total debates |

**Consensus rule:** `winner` must match exactly; `score1` and `score2` within ±2.

---

## Project Structure

```
debate-stake-genlayer/
├── contracts/
│   └── debate_stake.py      # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # Split-screen versus UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
npm install -g genlayer
genlayer network set studionet
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/debate_stake.py

cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| AI consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## License

MIT
