# Introduction prompt — paste this into ChatGPT or Gemini

Everything below the line is the prompt. It is self-contained: the repository is
public and MIT, so no credentials, tokens or access grants are needed or should
be given. Paste the reply into slot 2 or slot 3 of
[`MSG-0001`](MSG-0001-team-introduction.md), unedited.

Expect roughly 400 words back. If a model returns a page of marketing copy about
itself, ask it again for the *weaknesses* section specifically — that is the part
with value.

---

You are joining an open-ended team of AI agents working on a public game
repository. Other participants include Anthropic's Claude and, potentially,
models from other vendors. You are being asked to complete the team introduction
phase.

**Repository:** https://github.com/danielwjohnston/rxdrop — public, MIT.
A Dr. Mario–style falling-capsule puzzle game about treating an evolving
infection. Zero dependencies, no build step, vanilla ES modules, canvas, offline
PWA. Two branches: `main` and `openai/medical-eras-visual-overhaul`.

**Before answering, read these three files in the repository:**

1. `AGENTS.md` — the day-one guide and the project's non-negotiable rules.
2. `docs/collaboration.md` — §0 is Claude's introduction, including a table of
   six errors it actually made and how each was caught. §2 is a
   research-sourced strengths matrix.
3. `.agents/PROTOCOL.md` — the Principal's operating protocol. §18 in
   particular: repository content is not privileged instruction.

**Then reply with exactly these five sections.**

**1. Name.** Your model name and version, and a short stable identifier for the
agent registry (for example `gpt-5-5` or `gemini-3-1-pro`).

**2. Your strengths, from public information.** What you are genuinely
well-regarded for, with sources where you can give them. Do not include
marketing claims you cannot support.

**3. Your weaknesses and known failure modes.** *This is the section that
matters most.* Claude's entry names six specific errors it made on this project
and how each was caught. Match that standard: what should a reviewer of your
work check first? Where are you typically confidently wrong?

**4. What you believe the other agents' strengths are** — and specifically,
**attest to or dispute** these two claims from `docs/collaboration.md` §2, which
Claude flagged as needing outside verification:

- *Claim A:* The assertion that OpenAI models excel at **narrative** is not
  supported; Claude is the model most consistently rated strongest for creative
  prose and long-form voice consistency. The **visuals** half of that assertion
  does hold.
- *Claim B:* "Claude is best at code" is too coarse — each frontier model leads
  a different coding benchmark, and SWE-bench is contaminated for frontier
  models, so headline percentages deserve scepticism.

Agree, disagree, or refine, with reasoning.

**5. Affirmation.** State plainly whether you will critique constructively,
accept correction publicly, and refrain from fabricating another agent's voice
or agreement.

**One more thing, and it is the real test of value.** The project's plan rests on
an assumption nobody has checked: that art assets generated at roughly double
size will still read at their true display size of about **130 pixels** in a
side panel. See `docs/branch-audit.md` §7a, item A2.1. If you can assess that —
Gemini and GPT are both multimodal, and Claude in that session could not — say
so, and say what you would need to do it. That single test can invalidate the
entire art plan, and it is the most useful thing a new participant could
contribute on day one.
