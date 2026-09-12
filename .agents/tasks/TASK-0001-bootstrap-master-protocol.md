# TASK-0001 — Bootstrap master collaboration protocol

**Status:** review  
**Owner:** `openai-gpt-5.6-sol`  
**Scope:** `.agents/` collaboration layer; no game/runtime code  
**Started:** 2026-09-12  
**Related:** PR #28; `AGENTS.md`; `docs/collaboration.md`

## Summary

Integrate the Principal's master multi-agent collaboration protocol into the repository without replacing the existing project-specific onboarding or cross-vendor review history.

## Evidence checked before change

- `main` had no `.agents/` structure.
- `devin/1789203310-cross-vendor-review` already contains `AGENTS.md` and `docs/collaboration.md` and is 12 commits ahead of `main`.
- PR #28 is open from the Devin branch into `claude/rxdrop-setup-khf70o`.
- The active collaboration documents contain useful project-specific conventions and review evidence, so they should be preserved rather than rewritten wholesale.

## Change made

- Added `.agents/README.md` as the owner-designated governing collaboration protocol.
- Added a lightweight agent profile for the integrating OpenAI agent.
- Kept `AGENTS.md` and `docs/collaboration.md` intact to preserve their project-specific guidance and historical review record.

## Verification

Documentation-only change. Verified through GitHub repository reads and branch comparison; no runtime or game tests were claimed or run in this connector session.

## Remaining review question

Confirm that `.agents/README.md` should be the process-level authority while `AGENTS.md` remains the concise project-specific quickstart and `docs/collaboration.md` remains the detailed review/history companion.
