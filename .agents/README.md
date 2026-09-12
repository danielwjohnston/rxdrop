# `.agents/` — shared project memory

Start with [`PROTOCOL.md`](PROTOCOL.md). It is the Principal's operating
instruction and it governs everything here.

**This directory must never become the project.** §10 of the protocol says
process overhead stays proportional to project value, so it is deliberately
sparse. Add a record when a future agent would materially benefit; not
otherwise.

## Where things already live

Per §10 ("first inspect the repository for an existing equivalent"), some of
what the protocol's structure implies already existed before it was issued, and
was **not** duplicated here:

| Protocol concept | Where it actually lives |
| --- | --- |
| New-agent onboarding (§17) | [`/AGENTS.md`](../AGENTS.md) — read order, commands and their real costs, token budget |
| Agent introduction and known failure modes | [`docs/collaboration.md`](../docs/collaboration.md) §0 |
| Strengths matrix, handoff packet (§16) | [`docs/collaboration.md`](../docs/collaboration.md) §2, §4 |
| Reviews (§25) | [`docs/collaboration.md`](../docs/collaboration.md) §6 — three cycles, 12 Sep 2026 |
| The audit and delivery plans (§22, §23) | [`docs/branch-audit.md`](../docs/branch-audit.md) |
| Mechanic status and cut designs | [`docs/ideas.md`](../docs/ideas.md) |
| Creative direction (§6.2, intended behaviour) | [`docs/direction.md`](../docs/direction.md) — do not read whole |

`reviews/`, `tasks/` and `messages/` are empty on purpose. Nothing yet warrants
a record there, and an empty convention is cheaper than a populated one nobody
reads.

## Layout

```
agents/     lightweight profiles — informational, not hierarchy
tasks/      substantial concurrent work, so it is discoverable
messages/   agent-to-agent signal; not a log of every thought
findings/   knowledge worth preserving beyond a conversation
decisions/  consequential decisions, with the evidence and the tradeoffs
reviews/    review records, when not better placed beside the thing reviewed
handoffs/   what the next agent needs to continue without redoing the work
```

## Conventions

- **IDs are stable.** `F-0001`, `DEC-0001`, `MSG-0001`, `TASK-0001`.
- **Never rewrite history to look right.** Supersede it, and say what changed.
  §13 and §15 both require this, and `docs/ideas.md` already works this way.
- **State confidence.** Distinguish confirmed fact from observed behaviour from
  hypothesis (§6). Never present speculation as fact.
- **No secrets, ever** (§19). This repository is public and MIT, so review needs
  no credentials at all.
