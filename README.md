# 🎯 DebateStake

Argumentation market on GenLayer. Two people debate a topic, stake tokens, and AI validators judge who made stronger arguments.

## How it works

1. Creator starts a debate with a topic, position, and staked GEN
2. Opponent joins with a counter-position and matching stake
3. Both sides take turns submitting arguments (1-5 rounds)
4. AI validators evaluate argument quality and pick a winner
5. Winner takes the full prize pool

## Setup

```bash
# Deploy contract
genlayer network set studionet
genlayer account unlock --password "YOUR_PASSWORD"
genlayer deploy --contract contracts/debate_stake.py

# Run frontend
cd frontend
npm install
# Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
npm run dev
```

## Contract Methods

| Method | Description |
|--------|-------------|
| `create_debate(topic, position, max_rounds)` | Start debate with stake |
| `join_debate(debate_id, position)` | Join with counter-position + stake |
| `submit_argument(debate_id, argument)` | Submit argument (turn-based) |
| `judge_debate(debate_id)` | AI judges winner, pays out |
| `cancel_debate(debate_id)` | Cancel open debate, refund |
