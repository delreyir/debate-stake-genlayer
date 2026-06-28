# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


class DebateStake(gl.Contract):
    debate_count: i32
    debates: TreeMap[str, str]

    def __init__(self):
        self.debate_count = i32(0)

    @gl.public.write.payable
    def create_debate(self, topic: str, position: str, max_rounds: i32) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must stake tokens")
        if int(max_rounds) < 1 or int(max_rounds) > 5:
            raise gl.vm.UserError("Rounds must be 1-5")

        self.debate_count = i32(int(self.debate_count) + 1)
        debate_id = str(int(self.debate_count))
        now = int(datetime.now(timezone.utc).timestamp())

        debate = {
            "id": debate_id,
            "topic": topic,
            "creator": str(gl.message.sender_address),
            "opponent": "",
            "creator_stake": str(value),
            "opponent_stake": "0",
            "creator_position": position,
            "opponent_position": "",
            "arguments": [],
            "max_rounds": int(max_rounds),
            "current_round": 0,
            "status": 0,  # 0=open, 1=active, 2=judging, 3=finished
            "winner": "",
            "judgment": "",
            "created_at": now,
        }
        self.debates[debate_id] = json.dumps(debate)
        return self.debate_count

    @gl.public.write.payable
    def join_debate(self, debate_id: str, position: str) -> None:
        debate = json.loads(self.debates[debate_id])
        if debate["status"] != 0:
            raise gl.vm.UserError("Debate not open")
        if str(gl.message.sender_address) == debate["creator"]:
            raise gl.vm.UserError("Cannot join own debate")

        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must stake tokens")

        debate["opponent"] = str(gl.message.sender_address)
        debate["opponent_stake"] = str(value)
        debate["opponent_position"] = position
        debate["status"] = 1
        self.debates[debate_id] = json.dumps(debate)

    @gl.public.write
    def submit_argument(self, debate_id: str, argument: str) -> None:
        debate = json.loads(self.debates[debate_id])
        if debate["status"] != 1:
            raise gl.vm.UserError("Debate not active")

        sender = str(gl.message.sender_address)
        args = debate["arguments"]
        current_round = debate["current_round"]

        # Determine whose turn it is
        if len(args) % 2 == 0:
            if sender != debate["creator"]:
                raise gl.vm.UserError("Creator's turn")
        else:
            if sender != debate["opponent"]:
                raise gl.vm.UserError("Opponent's turn")

        args.append({"author": sender, "text": argument, "round": current_round})

        # After both submit, advance round
        if len(args) % 2 == 0:
            debate["current_round"] = current_round + 1

        # Check if debate is complete
        if debate["current_round"] >= debate["max_rounds"]:
            debate["status"] = 2  # ready for judging

        debate["arguments"] = args
        self.debates[debate_id] = json.dumps(debate)

    @gl.public.write
    def judge_debate(self, debate_id: str) -> typing.Any:
        debate = json.loads(self.debates[debate_id])
        if debate["status"] != 2:
            raise gl.vm.UserError("Debate not ready for judging")

        args_text = ""
        for a in debate["arguments"]:
            role = "Creator" if a["author"] == debate["creator"] else "Opponent"
            args_text += f"\n[{role} - Round {a['round']}]: {a['text']}"

        def leader_fn():
            prompt = f"""You are judging a debate. Evaluate the quality of arguments from both sides.

TOPIC: {debate['topic']}
CREATOR'S POSITION: {debate['creator_position']}
OPPONENT'S POSITION: {debate['opponent_position']}

ARGUMENTS:{args_text}

Judge based on:
1. Logical coherence and reasoning quality
2. Use of evidence and examples
3. Addressing counter-arguments
4. Persuasiveness

Return JSON:
{{
    "winner": "creator" or "opponent",
    "score_creator": 1-10,
    "score_opponent": 1-10,
    "reasoning": "brief explanation of why the winner had stronger arguments"
}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raw = {}
            winner = str(raw.get("winner", "creator")).strip().lower()
            if winner not in ("creator", "opponent"):
                winner = "creator"
            try:
                sc = max(1, min(10, int(raw.get("score_creator", 5))))
            except (TypeError, ValueError):
                sc = 5
            try:
                so = max(1, min(10, int(raw.get("score_opponent", 5))))
            except (TypeError, ValueError):
                so = 5
            return {
                "winner": winner,
                "score_creator": sc,
                "score_opponent": so,
                "reasoning": str(raw.get("reasoning", ""))[:1000],
            }

        def validator_fn(leader_result) -> bool:
            # Robust consensus: agree on the normalized winner only.
            if not isinstance(leader_result, gl.vm.Return):
                return False
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raw = {}
            winner = str(raw.get("winner", "creator")).strip().lower()
            if winner not in ("creator", "opponent"):
                winner = "creator"
            try:
                leader_winner = str(leader_result.calldata["winner"]).strip().lower()
            except (TypeError, KeyError):
                return False
            return winner == leader_winner

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        # Distribute prize
        total = u256(int(debate["creator_stake"]) + int(debate["opponent_stake"]))
        if result["winner"] == "creator":
            debate["winner"] = debate["creator"]
            self._pay(debate["creator"], total)
        else:
            debate["winner"] = debate["opponent"]
            self._pay(debate["opponent"], total)

        debate["status"] = 3
        debate["judgment"] = json.dumps(result)
        self.debates[debate_id] = json.dumps(debate)

    @gl.public.write
    def cancel_debate(self, debate_id: str) -> None:
        debate = json.loads(self.debates[debate_id])
        if debate["status"] != 0:
            raise gl.vm.UserError("Can only cancel open debates")
        if str(gl.message.sender_address) != debate["creator"]:
            raise gl.vm.UserError("Only creator can cancel")

        debate["status"] = 3
        self.debates[debate_id] = json.dumps(debate)
        self._pay(debate["creator"], u256(int(debate["creator_stake"])))

    @gl.public.view
    def get_debate(self, debate_id: str) -> str:
        return self.debates[debate_id]

    @gl.public.view
    def get_debate_count(self) -> i32:
        return self.debate_count

    def _pay(self, recipient: str, amount: u256) -> None:
        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass
            class Write:
                pass
        _Recipient(Address(recipient)).emit_transfer(value=amount)
