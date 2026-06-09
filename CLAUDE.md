# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-contained, offline-first **PWA habit tracker** ("Habits"). Despite the repo name `sweat-rivals`, the app is a private single-user daily tracker — there is no backend, no accounts, and no network calls. All data lives in `localStorage` on the device.

There is **no build system, package manager, or test suite**. The entire app is plain HTML/CSS/JS in `index.html`.

## Working conventions

- **Keep summaries short.** After making a change, write a very brief summary in the terminal (a line or two) to save output tokens — don't restate the whole diff or re-explain code that's already in the file.
- **Keep this file current.** This `CLAUDE.md` is the living context for the codebase. Whenever you make changes that affect architecture, data shape, conventions, or the roadmap below, update the relevant section here in the same change so it always reflects the latest state.

## Roadmap / direction

The app is intentionally basic today (single-user, `localStorage`-only). It will gradually evolve toward a **multi-user competition app**. Keep this trajectory in mind when designing changes — prefer choices that make these steps easier rather than ones that have to be torn out:

1. **Proper backend + database** to replace `localStorage` as the source of truth (multi-user, synced across devices).
2. **User-defined tracking fields** — users add their own habits/metrics to track, instead of the hard-coded `HABITS` array. The `HABITS` schema (`key`/`type`/`good`/`unit`/etc.) is the conceptual seed for this; it will become user data.
3. **Competitions ("challenges")** — userA invites userB; participants join a shared challenge.
4. **Configurable rules/metrics per challenge** — participants pick which metrics count and how they're scored.
5. **Dashboards at two scopes** — the existing single-user dashboard, plus a challenge dashboard comparing all participants.

When touching the current single-user code, note in your summary (and here, if structural) how it relates to these phases.

### Design decisions (locked)

These are agreed and should guide all multi-user work. See `vision.txt` for the full narrative.

- **Tech stack:** stay a web app (current PWA frontend can keep living on GitHub Pages). Backend = **Supabase** (Postgres + built-in Auth incl. Google sign-in + Row-Level Security). RLS is the security boundary — the DB itself prevents one user from reading another's private data; never rely on frontend checks for authorization.
- **Metrics carry `{ type, unit, direction, aggregation }`.** `direction` = higher-better or lower-better; `aggregation` = how daily values roll up (sum / average / count).
- **Catalog + custom metrics.** There's a predefined global catalog of metric definitions; users can also create their own custom metrics (with the same fields). A custom metric can be **private** or made **public** (shareable/searchable). Challenges reference shared metric definitions so participants' values are comparable.
- **Auto-subscribe on challenge.** If a challenge includes a metric a participant doesn't already track, that metric is created/subscribed for them automatically.
- **Scoring = per-metric leaderboards** (no combined score yet). Comparison is **absolute** (not improvement-vs-baseline).
- **Missing-day rule:** if a user doesn't log a metric on a given day, that day's value is imputed as the **average of that user's logged days** (neutral — leaves their average unchanged). **Exception:** `count` aggregation treats a missing day as **0**.
- **Challenges are editable:** metrics can be added/dropped mid-challenge; changes apply to all participants equally.
- **Challenge limits:** customizable duration (in days); up to **10 participants** for now.
- **Invites** are by existing **username** or by **email** (email invites create a pending row linked on sign-up).
- **Profiles are Instagram-style:** a unique public `username` plus `name` and optional avatar, searchable by either. Email is *not* a public profile field (stays in `auth.users`).
- **Reminders:** email-based reminders/notifications to nudge logging (email available from sign-in).
- **Health sync deferred.** Apple Health has no web API and Google's Fit REST API is being retired, so auto-import of steps/calories/exercise requires a native wrapper (e.g. Capacitor) — explicitly a *later* phase. For now all data is manual entry.

**Target data model is fully specified in [`SCHEMA.md`](SCHEMA.md)** — 7 tables (`profiles`, `metric_defs`, `user_metrics`, `entries`, `challenges`, `challenge_participants`, `challenge_metrics`), the RLS policies that enforce the security boundary, and the computed scoring/imputation logic. Keep `SCHEMA.md` in sync when the model changes.

## Running / developing

Serve the directory over HTTP (a service worker requires a real origin, not `file://`):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Editing is direct: change `index.html`, `sw.js`, or `manifest.webmanifest` and reload.

**Critical:** the service worker (`sw.js`) is cache-first. Any change to cached assets won't appear on devices that have loaded the app until you **bump the `CACHE` version string** in `sw.js` (e.g. `habits-v1` → `habits-v2`). Forgetting this is the #1 cause of "my change isn't showing up". During local dev, use DevTools "Update on reload" / "Bypass for network" to avoid stale caching.

## Architecture

Everything is inside `index.html`'s single `<script>`. The whole app is data-driven by one array:

- **`HABITS`** (top of the script) is the source of truth. Each entry declares `key`, `label`, `emoji`, a `type`, and optional semantics. Adding/removing a habit = editing this array; both the input UI and the dashboard derive from it automatically. Do not rename a habit's `key` without considering existing stored data keyed by it.

- **Habit `type`s** — each type has two parallel implementations that must stay in sync:
  - `control(h, e)` renders the *input* on the Today view.
  - `statCard(h, dates)` renders the *aggregate* on the Dashboard.
  Supported types: `bool` (toggle), `counter` (±, integers), `number` (decimal field, e.g. sleep/water with `unit`/`step`/`max`), `scale` (1..`max` buttons, e.g. mood), `text` (freeform note). Adding a new type means handling it in **both** functions.

- **`good` semantics** drive coloring/streaks, not just display:
  - `good:true` / `good:false` (bool) — false = a habit you want to avoid; renders red, and streaks count *clean* (not-done) days.
  - `good:'high'` / `good:'low'` (number/counter/scale) — controls whether high or low values are "good" for bar colors and pill verdicts.
  When changing how stats look, check `statCard`, `barsHtml`, `computeStreak`, and the `.bar.good/.bad/.warn/.empty` CSS classes together.

- **Persistence.** State shape is `{ entries: { 'YYYY-MM-DD': { habitKey: value } } }` under `localStorage` key `STORE_KEY` (`habit-data-v1`). `setVal()` is the single write path: it deletes empty values and prunes empty day objects, then `save()`s and flashes "Saved". Bump `STORE_KEY` only with a migration in mind — changing it abandons existing user data.

- **Dates** are handled in **local time** via string helpers (`todayStr`, `toStr`, `parse`, `addDays`). Never introduce UTC/`Date.toISOString()` date math — it will shift entries across day boundaries.

- **Views/tabs.** Three sections (`todayView`, `dashView`, `moreView`) toggled by `setTab()`. Today supports per-day navigation (`curDate`, prev/next). Dashboard has a `range` selector (7/14/30/90 days). The "Data" tab handles JSON/CSV export and JSON import (merge) and full wipe.

- **DOM building** uses the small `el(html)` template helper plus direct `document.createElement`; there is no framework. Re-rendering is coarse (`renderToday`/`renderDash`/`renderMore` rebuild `innerHTML`).
