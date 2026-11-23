# PCON operating rules

## Repository memory

Keep instructions in AGENTS.md or an established agent entry point. Keep the current resume point in CONTINUATION, transfer detail in HANDOVER, approval and supersession in DECISIONS, design in ARCHITECTURE, and check evidence in TESTING. Reuse existing PRDs, specifications, run sheets and matrices with equivalent roles. Link to their relevant sections and avoid creating duplicates. Keep continuation to roughly one screen with a current milestone, checkpoint, blocker, and first action. Put historical detail in the underlying records and Git history.

At a meaningful task boundary, update current status and the affected supporting records. Keep stable decision IDs and trace the change from approval through design and verification. If an existing document serves several roles, point to each relevant section.

## Evidence and recovery

Use **Planned**, **Implemented**, **Verified**, and **Released** for distinct claims. A plan needs a scope or decision pointer. Implementation needs a file/diff or revision. Verification needs a command or procedure, date, tested revision or worktree, result, and environment limits. Release needs confirmation on the target. Use **Pending**, **Not run**, **Failed**, or **Unknown** when appropriate. Attribute user-reported outcomes and distinguish simulations from physical checks. Preserve superseded decisions and record the authority and evidence for their replacement. Document unresolved contradictions when the evidence answers different questions.

After interruption, compare the recorded revision, current HEAD, working tree, and upstream before using the handover. Recover from diffs, commits and reproducible checks. Keep user changes, isolate task edits when needed, and avoid resets, forced updates or blanket staging. If a check is stale, repeat the affected portion or mark it pending. If access fails, keep a scoped local checkpoint with exact paths and replay steps. Retry from the actual remote head, review the new diff and verify the published ref. A local commit or uploaded Git object is only a checkpoint until a remote branch points to it. If a commit contains its own status file, cite its reviewed base or pre-commit worktree and report the resulting commit separately.

Inspect the task-owned diff and follow the project's branch, review and release rules. Record uncommitted, committed, published and merged states separately. Publish only within the authorized scope and keep secrets, private material, and unrelated changes out of the diff.

## eFORGE

PCON works independently. When the project uses eFORGE, run INIT at setup or CONTINUE at restart; route engineering through the appropriate eFORGE stage or focused task. At milestone close use SYNC, or HANDOVER when transferring work. Link the active stage, artifacts, approvals, and quality evidence in the existing repository memory. Resume at the earliest missing or invalidated dependency for that task. eFORGE owns engineering gates and PCON records their status. Use one set of project documents. Neither workflow grants publication or merge authority.
