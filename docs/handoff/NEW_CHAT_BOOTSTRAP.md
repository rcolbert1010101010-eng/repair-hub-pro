# NEW CHAT BOOTSTRAP

## Codex Truth / Workflow
- Codex-first: run Codex planning (short plan), apply edits, then one command (build/test) unless user says otherwise.
- Keep plans short; exact Codex prompt drives actions.
- Use `./scripts/ai-diffpack.sh` only if build crashes unexpectedly.

## Repo
- Path: /Users/owner/Git Repositories/repair-hub-pro
- Branch: chore/technicians-profile-tabs

## Architecture guardrails
- React + TS + Vite, shadcn/ui.
- Pages consume data via `useRepos()` only; no direct Zustand in pages/components; business logic stays in services/repos.
- No Supabase imports in UI/pages.
- Avoid big refactors; keep changes surgical.
- No Radix Select empty string values; use explicit sentinel values.
- Avoid duplicate useMemo identifiers.

## What’s implemented (Plasma + context)
- Plasma Engine: PlasmaJob/Line with pricing snapshots (material/consumables/labor/overhead), derived machine/consumables, warnings.
- Entrypoints: Work Order plasma tab, Standalone Plasma Projects (`/plasma/:id`), print cut sheet (`/plasma/:id/print`).
- Posting rollups: idempotent single charge line to WO/SO (source_ref_type=PLASMA_JOB); locking prevents edits when invoiced.
- Attachments: DXF/PDF/PNG/JPG (25MB), allowlist, removable, included in print.
- DXF Assist: job-level estimated cut length/pierces/machine minutes + notes; shown alongside line totals and print.
- Templates: Plasma templates + lines, CRUD, apply-to-job selector; pages `/plasma/templates`, `/plasma/templates/:id`.
- Remnants: entity + CRUD/consume; optional line linkage with warning when consumed.
- Fabrication report: `/reports/fabrication` summarizing plasma revenue/cost/margin using posted plasma charge lines.
- Other modules (context): Returns/Warranty reporting patterns present; purchase orders, sales/work orders use repo bridge.

## Known pitfalls
- Keep posting idempotent; never duplicate plasma charge lines.
- No business logic in UI; push calculations into services/repos.
- Maintain calc_version and override semantics on plasma lines.
- Respect locking: prevent edits/posting on invoiced/locked orders.
