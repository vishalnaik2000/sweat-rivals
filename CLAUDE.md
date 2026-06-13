# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Sweat Rivals** — a multi-user habit tracker evolving into a competition app. The codebase is mid-rewrite:

- **Active app (root):** a **React + Vite + TypeScript + Tailwind v4** SPA being built toward the multi-user vision (Supabase backend, challenges, leaderboards). Currently a scaffold with theme + nav + placeholder screens.
- **Legacy app (`legacy/`):** the original self-contained single-file `localStorage`-only PWA (`legacy/index.html` + `sw.js`). Kept for reference and because it's still what's live on GitHub Pages until the new app is deployed. Don't add features here — port them to the React app.

The target data model (Supabase/Postgres + RLS) is in [`SCHEMA.md`](SCHEMA.md). Private roadmap is in `vision.txt` (gitignored, local-only).

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

Requires Node (installed via Homebrew). From the repo root:

```bash
npm install      # first time
npm run dev      # dev server → http://localhost:5173/sweat-rivals/
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # serve the production build locally
```

Supabase keys: copy `.env.example` → `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (anon key only — never the service_role key). `.env` is gitignored.

`base` is `/sweat-rivals/` in `vite.config.ts` to match the GitHub Pages project path; the dev URL therefore includes that prefix.

To run the **legacy** app instead: `cd legacy && python3 -m http.server 8000`. Its `sw.js` is cache-first — bump the `CACHE` version string when changing cached assets.

## Architecture (React app)

Single-page app, client talks directly to Supabase (RLS is the security boundary — see SCHEMA.md). No separate backend server; server-side logic later lives in Postgres functions / Supabase Edge Functions, not a hand-written API.

```
index.html              Vite entry (+ no-flash theme script)
vite.config.ts          base path + react & tailwind plugins
src/
  main.tsx              mounts ThemeProvider → BrowserRouter → App
  App.tsx               routes (Layout wraps the tab pages)
  index.css             Tailwind import + light/dark theme TOKENS (see below)
  lib/
    theme.tsx           ThemeProvider + useTheme() (persists to localStorage 'sr-theme')
    supabase.ts         supabase client from VITE_ env (throws if unconfigured)
    auth.tsx            AuthProvider + useAuth(): { session, profile, loading, refreshProfile, signOut }
    metrics.ts          MetricDef type, CATEGORY_ORDER/LABELS, catalog + subscription queries
    entries.ts          fetch/upsert/delete daily entries (entries table)
    challenges.ts       challenge CRUD, invites, accept/decline, computeLeaderboard()
    date.ts             local-time 'YYYY-MM-DD' helpers (todayStr/toStr/parse/addDays/daysInRange/prettyDate)
  components/
    Layout.tsx          header (logo + theme toggle) + bottom tab nav + <Outlet/>
    AuthShell.tsx       centered card for auth screens + shared inputClass/btnClass
    Placeholder.tsx     temporary stub card for unbuilt screens
  pages/
    Login.tsx           email/password sign in + sign up
    Onboarding.tsx      pick username (inserts profiles row) + auto-subscribes defaults
    Catalog.tsx         section-wise metric catalog: + subscribe / ⓘ details / subscribed pinned on top
    Today.tsx           logs each subscribed metric for a day; per-type controls + day nav, writes entries
    Dashboard.tsx       per-metric stat cards (Recharts bar charts) over a 7/14/30/90-day range
    Challenges.tsx      list: pending invites + your challenges
    CreateChallenge.tsx form: name, dates, max, pick metrics, invite by username/email
    ChallengeDetail.tsx per-metric leaderboards, roster, accept/decline invite
    Profile.tsx         username/name/email + sign out
```

- **Challenges** (`src/lib/challenges.ts`). Create inserts the challenge, the creator as an accepted participant, `challenge_metrics`, and invite rows (`user_id` for known usernames, `invited_email` for emails). **Auto-subscribe is client-side per-user**: RLS only lets a user insert their *own* `user_metrics`, so the creator subscribes themselves on create and each invitee subscribes themselves on **accept** (`respondInvite`). Leaderboards are computed client-side in `computeLeaderboard()` using the missing-day rule (average→mean unchanged, sum→mean×elapsed days, count→logged days); ranked by `direction`. Reading rivals' `entries` works only because the `can_read_challenge_entry` RLS policy permits it for shared challenge metrics within the window (both users accepted).
- **Migration `0003`** relaxes `challenges`/`challenge_participants`/`challenge_metrics` read policies so a *pending* invitee (any participant row, not just accepted) can see the challenge to accept it. Entries cross-read still requires both accepted.

- **Dashboard/Stats** fetches the user's `entries` over the selected range and, per subscribed metric, shows an aggregate (`sum`/`average`/`count` per the metric's `aggregation`) plus a mini bar chart (Recharts). Missing days render as faint bars; lower-is-better metrics use the `--warn` color. Chart colors are CSS theme vars so they follow dark/light.

- **Today screen** renders one control per subscribed metric by `type` — `bool` (toggle; avoid-habits use the `--bad` color), `counter` (typeable number field with ± steppers, so large counts like steps are entered directly), `number` (decimal field, `config.step`), `scale` (1..`config.max`, default 5), `text` (note). Typed fields commit on blur (`onValueLocal` updates the display without writing); taps commit immediately. Empty/off/cleared values **delete** the entry row; otherwise upsert keyed on `(user_id, metric_def_id, day)`. Day navigation can't go past today.
- **Catalog search** is synonym-aware via `matchesQuery()` (searches label + description + `metric_defs.aliases`), so e.g. "booze"→Alcohol. Aliases are curated (migration `0004`), not ML embeddings. CreateChallenge reuses this with a "More metrics" expander to pick *any* catalog metric (not just subscribed ones) — the creator auto-subscribes to whatever they pick.
- **Avatars** upload to the public `avatars` Storage bucket at `<uid>/avatar.<ext>` (migration `0005` creates the bucket + owner-only write policies); the public URL is saved to `profiles.avatar_url`. Profile shows the image (falls back to the name initial).

- **Tabs** (bottom nav, `Layout.tsx`): Today · Stats (`/dashboard`) · Metrics (`/metrics` = Catalog) · Rivals (`/challenges`) · Profile.
- **Metric catalog** lives in Supabase (`metric_defs`, `owner_id = NULL`), seeded by `supabase/migrations/0002_metric_catalog.sql`; subscriptions are rows in `user_metrics`. Catalog reads/writes go through `src/lib/metrics.ts`. See SCHEMA.md for the full model.

- **Auth gating** lives in `App.tsx`: `loading` → spinner; no `session` → `Login`; session but no `profile` row → `Onboarding`; otherwise the `Layout` tab routes. `AuthProvider` (in `main.tsx`, wraps the router) tracks the Supabase session via `onAuthStateChange` and loads the matching `profiles` row. A user record exists in `auth.users` the moment they sign up; the **`profiles` row is created by Onboarding** (chosen username) — that's why "signed in but no profile" is its own state.

- **Theming (dark/light from day one).** Tokens are CSS variables in `src/index.css`: `:root` = light, `.dark` = dark. `@theme inline` maps them to Tailwind utilities (`bg-bg`, `text-fg`, `text-muted`, `border-border`, `bg-accent`, `text-good/bad/warn`, …). **Always style with these semantic utilities, not hard-coded colors**, so both themes work automatically. Toggling adds/removes `.dark` on `<html>` (via `useTheme`); a script in `index.html` applies the saved theme pre-paint to avoid a flash. Dark keeps the original deep-navy DNA (`#0f1220`).

- **Routing.** `react-router-dom`, `basename={import.meta.env.BASE_URL}` so it respects the `/sweat-rivals/` base. Tabs declared in `Layout.tsx`.

- **Metrics/`good` semantics** from the legacy app carry forward conceptually into the data model: legacy `type` (`bool`/`counter`/`number`/`scale`/`text`) → `metric_defs.type`; legacy `good:true/false` and `good:'high'/'low'` → `metric_defs.direction` (`higher`/`lower`). See SCHEMA.md.

- **Dates:** keep using **local-time** string helpers (`YYYY-MM-DD`); never UTC/`toISOString()` date math — it shifts entries across day boundaries.
