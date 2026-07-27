# RMC Agency OS — STATUS

**The single place to see what we're doing.** If it's not here, it's not an active commitment.
Repo = what's built · Neptune = decisions/knowledge · chat = scratchpad (never the record).

_Last updated: 2026-07-27_

## Operating rules
1. **One track at a time.** Finish and land before starting the next.
2. **One source of truth per thing** (see line 3 above).
3. This file is the map. Update it when a track lands or a decision is made.

---

## ✅ Live now
- **Production app:** **https://os.rmcmktng.com** (custom domain, Let's Encrypt SSL live) — also https://rmc-agency-os.vercel.app. Phase 0 shipped (2026-07-27).
  - DNS: A record `os` → `76.76.21.21` at Wix (matches existing `luxover`/`triscapesdemo` Vercel subdomains). Domain added to the Vercel `rmc-agency-os` Production project.
  - Org/tenancy model: `organizations`, `memberships`, `profiles` + org-membership RLS (migrations 004–008). Data backfilled into the **RMC Creative** org (Andrew = owner).
  - Branded **Clients** module reading org-scoped data.
  - Self-serve **password reset** (`/forgot-password`, `/reset-password`) — client-side `token_hash` verify (survives M365 Safe Links).
  - Supabase project: `stvdxcpexmqckomxljix` (agency-os). Vercel: `rmc-agency-os`.
- **Neptune** (shared knowledge base): live but **not yet connected**. Supabase `neptune` + MCP edge function. See memory `neptune-knowledge-base`.

## 🅿️ Parked (deliberately not being worked on right now)
- Neptune connectors (add to Claude + ChatGPT) + account-level standing instructions + Claude Code auto-write hook.
- Reset-email polish: Supabase Auth Site URL / Redirect URLs + Reset-Password email template.
- Rebrand login/auth to RMC red; port Dashboard/Projects/Scanner into the branded shell.
- Client drill-in (client detail view).
- Org-provisioning-on-signup (new users currently land with no org).
- **Domains module** — uncommitted work from another session lives in the tree (`src/lib/domains/`, `src/app/domains/`, `supabase/migrations/010_create_domains.sql`, `src/lib/supabase/admin.ts`, `docs/`). Untouched. Its own track.

## 🧭 Parallel tracks (different owners — do not duplicate here)
- **Harvest content engine** (`rmc-content-os` Supabase, "The Harvest" Claude project) — separate product. Not built in this repo/session.

## ⏭️ Next decision (when ready)
Pick the next single track: (a) connect Neptune everywhere, (b) rebrand + port remaining modules, (c) reset-email config, (d) org-on-signup. One at a time.
