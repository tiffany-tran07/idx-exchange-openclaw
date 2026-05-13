# Mantis Telegram Desktop Proof

Status: blocked before native Telegram Desktop session start.

Mantis inspected PR #81229 and selected the intended proof path: create a Telegram group session, invoke `sessions_send` with `delivery.mode: "announce"` against that Telegram group session key, then compare baseline behavior where Telegram receives `group:<chatId>` with candidate behavior where the target is normalized to the numeric chat id.

Completed setup:

- Created detached baseline and candidate worktrees under `.artifacts/qa-e2e/mantis/telegram-desktop-proof-worktrees/`.
- Installed dependencies for both worktrees with `pnpm install --frozen-lockfile`.
- Built both worktrees with `pnpm build`.
- Candidate install/build ran with a stripped environment and temporary HOME because the candidate ref is an untrusted fork head.

Blocker:

- AWS Crabbox desktop provisioning failed before the SUT started because the coordinator could not add an AWS security group ingress rule (`RulesPerSecurityGroupLimitExceeded`).
- Retried on the direct Hetzner desktop provider per Crabbox fallback guidance.
- The Telegram credential broker then returned `POOL_EXHAUSTED No available credential for kind "telegram-user"` repeatedly, including after waiting through the stale-lease window.

No native Telegram Desktop GIFs were generated. Mantis did not fabricate a placeholder proof.
