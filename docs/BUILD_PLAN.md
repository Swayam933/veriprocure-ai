# VeriProcure AI — build and judging plan

## Product thesis

AI model procurement should be measured by verified useful outcomes, not token volume or generic benchmark scores. VeriProcure gives an autonomous agent a task, purchases intelligence through Telegraph, purchases an evaluation, and records the evidence and cost.

## MVP acceptance criteria

1. A new task can be submitted through the UI.
2. Server-side agent makes a real Telegraph purchase using supported x402 flow.
3. A separate evaluation request is purchased through Telegraph.
4. UI shows the actual returned miner, cost, duration and signal hash.
5. The run is persisted and can be re-opened.
6. Payment challenge above configured ceiling is rejected before signing.
7. A reviewer can run the app with a new task and reproduce the workflow.

## Workstreams

### A. Protocol integration
- Discover live canonical intents and miners at startup.
- Inspect request and response schemas.
- Route natural-language asks through the Engine.
- Verify each signal hash and preserve raw responses.
- Store payment evidence and network identifiers.

### B. Quality evaluation
- Create a versioned task benchmark set with known expected outcomes.
- Run generated code in a sandbox, not in the Next.js process.
- Record evaluator score separately from deterministic test pass rate.
- Track cost per successful task, not cost per token.
- Avoid calling model-judgment output "ground truth".

### C. Leaderboard
- Require a minimum sample count per provider.
- Display confidence intervals and evaluation version.
- Segment by task family / Intent.
- Include price, latency, correctness, failure rate and sample count.
- Do not fabricate providers, rankings or independent adoption.

### D. Security and reliability
- Dedicated test wallet only.
- User-configurable spend ceilings.
- Server-only private key and signing.
- Rate limiting and abuse protection.
- Timeouts, retries only where safe, and idempotency.
- Audit log for every paid request.
- No arbitrary code execution in the web process.

## Demo script (2–5 minutes)

1. Explain a real coding task that a model may get wrong.
2. Submit the task.
3. Show the actual Telegraph request and x402 purchase.
4. Show the returned miner, result, cost and signal hash.
5. Show the separate paid evaluation and its limitations.
6. Show the persisted run and cost calculation.
7. Trigger a spend-ceiling rejection or invalid task to prove a failure path.
8. Explain how repeatable test suites produce a defensible cost-per-correct-answer leaderboard.

## Known limitations of this starter

- It does not yet execute generated code in a sandbox.
- It does not yet calculate an independently verified correctness score.
- It does not yet provide a defensible multi-provider leaderboard.
- It uses a local SQLite database by default.
- Live canonical intent identifiers and actual miner support need runtime verification.
- The current server signer is a single dedicated test wallet, not a production multi-user wallet system.

Do not claim these unfinished features as complete in a hackathon submission.
