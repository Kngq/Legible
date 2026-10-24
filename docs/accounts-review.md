# Accounts: review of `khanh-branch` and why the merge is postponed

Oct 24, 2026. Reviewed `origin/khanh-branch` at `22d2fba` ("Supabase email/password auth + Home header tweaks", Khanh Nguyen) against `main` at `368d00b`. Nothing was merged. The work is kept on `origin/khanh-branch` and on a local branch `khanh-branch` at the same commit.

**Decision:** do not merge accounts into `main` for now. Legible stays fully usable with no registration or login. Accounts come back only after the team agrees what a person gets from one (see "Benefit first"), and then only with the changes in "Minimum changes to integrate".

## What the branch does

Email and password accounts through Supabase Auth, called from the browser. No Legible API routes, database tables, or migrations are added.

| File | Change |
|---|---|
| `package.json` | adds `@supabase/supabase-js` 2.118.0 |
| `.env.example` | adds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (names only) |
| `src/lib/auth/supabase.ts` | browser client; `null` when the env vars are missing |
| `src/components/AuthProvider.tsx` | session state and `signUp`, `signIn`, `signOut`; wraps the app in `layout.tsx` |
| `src/components/AuthDialog.tsx` | modal with Name (sign-up only), Email, Password |
| `src/components/SiteHeader.tsx` | the menu's placeholder Login and Sign up open the dialog; signed in shows the email and Log out |
| `src/components/Home.tsx`, `BriefCard.tsx`, `ComingUp.tsx` | unrelated copy and layout edits |

## Findings

Confirmed means checked in the code, the diff, or a build. Assumed means taken from how Supabase normally works, not from this repo.

**Confirmed**

1. No secrets in the diff or branch history. `.env.local` is git-ignored and was never committed. Only the publishable anon key is read, never `service_role`. A build without the env vars inlines no values.
2. Stored on Supabase: email, password (hashed by Supabase), and the Name typed at sign-up as `user_metadata.name`. The code comment says the name is never sent; the sign-up call sends it.
3. The profile (town, life facts, topics, the profile name) is not sent. No chat is stored.
4. The official booklet, `data/`, `scripts/`, `src/data/`, `src/lib/explain/`, and `src/app/api/` are untouched. Quote location, word-for-word verification, review status, and draft support checks work as before. No new model calls.
5. On its own the branch passes `npm test` (186 tests), `npm run lint`, `npm run lint:words`, and `npm run build`. Without the env vars the app runs and the dialog says accounts are not set up.
6. It is 18 commits behind `main` and does not merge cleanly: conflicts in `src/components/Home.tsx` (main replaced the meter dots and the header with the growth hero in `37bb209` and `fee7124`) and `src/components/BriefCard.tsx`.
7. Signing in unlocks nothing. Every screen is the same signed in or out.

**Assumed**

8. Supabase also keeps sign-up and last sign-in times and auth audit entries, which can include IP addresses.
9. The anon key is safe only if every table in the chosen Supabase project has row level security. The team's earlier Supabase project (civic seed, photo bucket) should not be reused for accounts without checking.
10. The free tier covers the event; it pauses idle projects and rate-limits confirmation email unless custom SMTP is set up.

## Why the merge is postponed

1. **It contradicts the spec.** `requirements.md` lists accounts as out of scope. `design.md` says "No account, no sign-in" and lists name, email, and password under "Never gathered". Merging would make the Kiro spec wrong.
2. **It asks for personal data with nothing in return.** An email, a password, and a name are collected for an account that does nothing. That is the opposite of Legible's promise.
3. **The name is sent to a server**, against the code's own comment and the "never gathered" list.
4. **It does not merge cleanly** with current `main`.
5. **It carries unrelated copy changes.** "decisions that may matter" becomes "that matter", which overstates what the app knows. The featured card gets a "Coming up: " label even when it has no date. "Closest to your life first" is removed. These should be proposed on their own.

## Benefit first

Before accounts return, pick the benefit and write down exactly what would leave the browser for it. Each candidate below is checked against the rule "the profile never leaves the browser".

| Benefit | What a server would hold | Fits the privacy rule? | Without an account |
|---|---|---|---|
| Cross-device profile sync | town, life facts, topics, name | No, unless the server holds only ciphertext encrypted in the browser with a key the server never sees. The rule then has to be reworded to allow that. | Export code the person copies to another browser (already the candidate in `design.md`) |
| Saved decisions (a reading list) | public measure and item ids | Closer, but the list still reveals interests. Needs its own line in the "Information gathered" table. | Already works in `localStorage` with "Remember on this device" |
| Growth Story sync | aggregate totals and stage dates (`src/lib/growth.ts`) | `growth.ts` promises "nothing sent to a server". Syncing would change that promise. Growth is not tracked yet, so there is nothing to sync today. | Include it in the export code |

Questions to settle first:
- Which one benefit justifies an account, and would people miss it without one?
- Can the export code deliver it instead?
- If data must be stored, is it encrypted in the browser so the server sees only ciphertext?
- What does "Clear my information" do to the server copy?
- Who owns the Supabase project, its keys, and its costs after the event?

## Minimum changes to integrate

When an account has a purpose, these are the smallest changes that make the branch privacy-consistent and compatible with `main`. They do not touch the booklet, the verification pipeline, or personalization logic.

**Compatibility with `main`**

1. Rebase onto current `main`, or start a new branch from `main` and bring over only the account files: `package.json` and lock, `.env.example`, `src/lib/auth/supabase.ts`, `AuthProvider.tsx`, `AuthDialog.tsx`, the `SiteHeader.tsx` menu change, and the `layout.tsx` wrapper.
2. Drop the `Home.tsx`, `BriefCard.tsx`, and `ComingUp.tsx` hunks. That removes both conflicts. Propose the copy changes separately.

**Privacy**

3. Remove the Name field from `AuthDialog` and the `options.data.name` argument from `signUp`. The account holds only email and password. Fix the comment in `supabase.ts` to match.
4. Hide Login and Sign up when accounts are not configured or not enabled (a public flag such as `NEXT_PUBLIC_ACCOUNTS`), instead of a dialog that says they are not set up. With the flag off, the menu behaves as today.
5. Never require sign-in. Onboarding, Home, Explore, readers, and Ask work the same signed out. The onboarding rule in `requirements.md` ("SHALL NOT include sign-in, account creation, or a name") stays.
6. "Clear my information" also signs out, so the Supabase session key in `localStorage` is removed with the profile.
7. Say in the dialog exactly what the account holds (email and password, nothing about you or your town).
8. Add tests: `signUp` sends no `data`; only `AuthProvider` imports `src/lib/auth/supabase.ts`; no profile, engine, or explain module imports it.

**Project setup**

9. A Supabase project used only for auth, with row level security on every table, email confirmation on, the site URL and redirect set for local and Vercel, and the two `NEXT_PUBLIC_` variables in `.env.local` and on Vercel. `service_role` is never used in the app.

**Spec**

10. Update `requirements.md` (out of scope), `design.md` ("No account, no sign-in" and the "Information gathered" table), `product.md` (what may leave the browser), and add the work to `tasks.md`.
