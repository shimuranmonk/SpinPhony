# SpinPhony agent instructions

Work in `shimuranmonk/SpinPhony`. Verify the target, branch, revision and worktree, and preserve existing edits. Read [continuation](docs/CONTINUATION.md) first, then the relevant [handover](docs/HANDOVER.md) and supporting records. With remote-only access, inspect the selected ref and report local state as unknown.

Keep the MVP standalone. Preserve the [approved scope](docs/DECISIONS.md), including the exclusion of Nova Prime integration and live robot control. Resolve material design gaps before dependent implementation. If eFORGE is invoked, follow its applicable engineering stages and record the results in the existing continuity files.

At every meaningful development checkpoint, update continuation and handover. Update decisions, architecture and testing when their underlying evidence changes. Describe what is planned, implemented, verified or released separately. Record failures, pending checks and the next concrete action. Use the [PCON skill](skills/project-continuum/SKILL.md) when available.

Use a task branch and review the scoped diff before committing. Push authorized changes, including continuity updates, and verify the remote revision. Follow the maintainer's review and merge workflow. If synchronization fails, retain the local checkpoint and record recovery steps. On resume, reconcile with current Git evidence before replaying work.
