# Elite Handoff Summary — Plasma Modules

## 1) What was built
- Shared Plasma Engine: PlasmaJob/Line entities with pricing snapshots (material/consumables/labor/overhead), calc_version, warnings (missing material/thickness/lookup), derived machine/consumables when not overridden.
- Entrypoints: Work Order plasma tab and Standalone Plasma Projects (`/plasma/:id`).
- Charge rollup: WO + SO posting creates/updates a single charge line (source_ref_type=`PLASMA_JOB`, idempotent).
- Locking: edits/posting blocked when parent order invoiced or job status locked; statuses update to APPROVED on post.
- Print: Cut sheet at `/plasma/:id/print` with metrics, DXF estimates, attachments, signature blocks; buttons from WO tab and standalone detail.
- Attachments: DXF/PDF/PNG/JPG, 25MB cap, stored locally with allowlist; removable with confirm; shown in print.
- DXF Assist: job-level estimated cut length/pierces/machine minutes + notes; displayed alongside line totals (does not overwrite lines).
- Templates: Plasma templates + lines, CRUD, apply-to-job selector in WO/Standalone; dedicated pages `/plasma/templates` and `/plasma/templates/:id`.
- Remnants: entity + CRUD/consume, optional line linkage, consumed warning intent.
- Fabrication profitability report: `/reports/fabrication` aggregates plasma charge lines (posted_at preferred), revenue/cost/margin, status counts/top insights.
- Seeding & permissions: default templates seeding pattern, permission hooks to gate template/remnant creation/edits, posting, and attachment removal; UX hardening (empty states, confirms).

## 2) Where the code lives
- Types: `src/types/index.ts` (plasma jobs/lines attachments, templates, remnants, DXF fields).
- Services: `src/services/plasmaPricingService.ts` (pricing/derived/warnings), `src/services/plasmaJobSummary.ts` (metrics), `src/services/fabricationInsights.ts` (report logic, if present).
- Store: `src/stores/shopStore.ts` (plasma jobs/lines/posting/locking, attachments, templates, remnants, DXF fields, idempotent rollups).
- Repo bridge: `src/repos/repos.ts`, `src/repos/zustandRepos.ts` (plasma APIs exposed to pages; UI uses `useRepos()` only).
- Pages/routes: `src/pages/WorkOrderDetail.tsx` (plasma tab), `src/pages/PlasmaProjectDetail.tsx`, `src/pages/PlasmaProjects.tsx`, `src/pages/PlasmaPrint.tsx`, template pages `src/pages/PlasmaTemplates.tsx`, `src/pages/PlasmaTemplateDetail.tsx`, sidebar/app route wiring `src/components/layout/Sidebar.tsx`, `src/App.tsx`.
- Reporting: `/reports/fabrication` page + `services/fabricationInsights` (check repo for exact path).

## 3) Non-negotiable invariants / pitfalls
- Posting must remain idempotent: only one charge line per plasma job per order; updates, never duplicates.
- No Radix Select empty string values; use explicit sentinel values.
- Calc snapshots honor `calc_version` and override flags; pricing logic stays in services, not UI.
- Business logic must not live in pages; pages call repos (`useRepos`) only; no direct Zustand access.

## 4) How to extend
- DXF parsing/nesting: add repo-layer adapter to parse DXF and populate assist fields or auto-lines; keep UI unchanged.
- Material inventory integration: link plasma lines/remnants to raw sheet inventory and decrement on post.
- Profitability: enhance report with tech time capture, runtime consumables tracking, and richer cost sources; align posted_at filters and customer/vendor rollups.
