---
name: project-continuum
description: Initialize or maintain Git-backed project continuity, recover a session from repository evidence, reconcile status, or prepare a handover. Use for PCON INIT, CONTINUE, SYNC, and HANDOVER.
metadata:
  version: "1.0"
---

# Project Continuum v1

Resume work from repository memory without requiring previous chats. Invoke with `PCON: <mode> [repository]` or `$project-continuum` with a continuity request. Use the named target, or establish it from the current task and repository. These modes are agent instructions.

Read applicable repository instructions first, then the current continuation entry, then the relevant handover section and only the evidence needed for the task. Verify repository identity, branch or ref, revision, relevant history and worktree changes before acting. For remote-only work, inspect the selected ref and record local state as unobserved.

| Mode | Outcome |
| --- | --- |
| INIT | Inventory existing memory and adopt its paths. Adapt [templates](assets/templates) for missing roles, merge instructions, and seed facts from verified evidence. Re-running on a current repository should produce no change. |
| CONTINUE | Reconstruct the current state and resume the first authorized action. Treat stale entries as leads. If only context recovery was requested, return the checkpoint and next action. |
| SYNC | Reconcile affected memory with code, approvals, and checks. Update current pointers and relevant records. Mark discrepancies or unknowns explicitly. |
| HANDOVER | Run SYNC for the session and save the exact stop point, open gates, dependencies, and first actionable step with its success condition. Record which state others can retrieve. |

Use [operating rules](references/operating-rules.md) for evidence, recovery, publication and eFORGE integration. For projects without skill loading, copy the applicable templates and put the operating contract in their repository instructions.

Optional structural check with Python 3.9 or newer, using paths relative to the selected repository.

```text
python path/to/project-continuum/scripts/validate.py path/to/repository
```

Supply `--path ROLE=PATH` for established layouts. A green check confirms structure only.
