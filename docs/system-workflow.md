# Mango Career Life Guide — System Workflow

This document explains how the Mango app works end to end: how the app boots,
how data flows between the screens and the backend, and how the core features
(matching, connections, AI advisor) are wired together.

Mango is a React Native (Expo) client backed by Supabase. It is designed to run
**out of the box with mock data** and become **live** the moment Supabase
credentials are present — no code changes required.

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile client (Expo)                    │
│                                                              │
│   App.tsx ──► NavigationContainer ──► BottomTabs             │
│                                          │                   │
│         ┌───────────┬───────────┬────────┼────────┐          │
│       Home        Match       Connect  Advisor  Profile      │
│         │           │           │        │         │         │
│         └───────────┴─────┬─────┴────────┴─────────┘         │
│                           ▼                                  │
│                 src/data/repo.ts  (single source of truth)   │
│                     │              │                         │
│           isSupabaseConfigured?    │                         │
│              yes │           no │                            │
└──────────────────┼─────────────┼────────────────────────────┘
                   ▼             ▼
          ┌────────────────┐  ┌──────────────────┐
          │    Supabase    │  │  src/data/mock.ts │
          │  Postgres/Auth │  │  (local seed data)│
          │ Realtime/Store │  └──────────────────┘
          └────────────────┘
```

The decision point is `isSupabaseConfigured` in `src/lib/supabase.ts`. It is
`true` only when both `EXPO_PUBLIC_SUPABASE_URL` (starts with `http`) and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (length > 20) are set in `.env`. Every data
function checks this flag and falls back to mock data on a miss or error.

---

## 2. App startup flow

1. **`App.tsx`** is the root component.
2. It loads the custom fonts (Playfair Display, Inter, Space Mono). While
   fonts are loading it renders a blank background screen.
3. Once loaded it wraps the app in:
   - `GestureHandlerRootView` — required for swipe gestures.
   - `SafeAreaProvider` — handles notches / safe areas.
   - `NavigationContainer` (dark theme using Mango color tokens).
4. **`BottomTabs`** (`src/navigation/BottomTabs.tsx`) renders the five-tab
   bottom navigation: **Home, Match, Connect, Advisor, Profile**. Each tab has
   a custom gold-accented icon button.

---

## 3. The data layer (`src/data/repo.ts`)

`repo.ts` is the **single source of truth** for all screen data. Every function
follows the same pattern:

```ts
export async function getX() {
  if (!isSupabaseConfigured) return mock.x;   // offline fallback
  const { data, error } = await supabase...    // live query
  if (error || !data) return mock.x;           // resilient fallback
  return data;
}
```

| Function           | Source (live)                         | Powers                         |
| ------------------ | ------------------------------------- | ------------------------------ |
| `getMyProfile()`   | `profiles` (by auth uid)              | Profile screen                 |
| `getFeaturedRoles()`| `roles` (top 10 by match)            | Home featured + mini cards     |
| `getSwipeDeck()`   | `get_swipe_deck()` RPC (pgvector)     | Match swipe deck               |
| `recordSwipe()`    | inserts into `swipes`                 | Match swipe actions            |
| `getConnections()` | `connections_view`                    | Connect tabs                   |
| `askAdvisor()`     | `services/advisor.ts` (canned/stub)   | Advisor chat                   |

This design means the UI never knows or cares whether it is talking to Supabase
or local mocks — it just `await`s a repo function.

---

## 4. Core feature workflows

### 4.1 Match (swipe-to-match)

This is the heart of the app and mirrors a dating-app swipe loop.

```
User opens Match tab
   │
   ▼
getSwipeDeck() ──► get_swipe_deck() RPC
   │                  • excludes companies already swiped
   │                  • ranks by pgvector cosine similarity
   │                    between profile.embedding & company.embedding
   │                  • similarity → 0..100 "match" score (fallback 75)
   ▼
SwipeDeck renders cards
   │
   ▼  user swipes left / right / save
recordSwipe(targetId, direction)
   │  inserts row into `swipes`
   ▼
DB trigger `trg_right_swipe` fires (handle_right_swipe)
   │  if this is a right-swipe AND the company already
   │  right-swiped this candidate (target_type='candidate')
   ▼
A row is inserted into `matches`  ──► chat becomes possible
```

Key backend objects (`supabase/schema.sql`):

- **`get_swipe_deck()`** — `SECURITY DEFINER` SQL function returning the next 20
  un-swiped companies, ranked by similarity. Cosine distance (`<=>`) is
  converted to a percentage match score.
- **`swipes`** — one row per left/right/save, unique per (user, target, type).
- **`handle_right_swipe()` + `trg_right_swipe`** — the mutual-match trigger.
  Only a reciprocal right-swipe from both sides creates a `matches` row.
- **`matches`** — unlocks the `messages` table (chat) for both participants.

### 4.2 Home

- `getFeaturedRoles()` pulls the top 10 roles ordered by match score.
- Also surfaces static `trendingSectors` and `careerInsights` (currently mock
  constants re-exported from `repo.ts`).

### 4.3 Connect (professional network)

- `getConnections(kind)` reads the **`connections_view`**, which classifies each
  other user relative to the current user into one of three buckets:
  - `network` — connection `accepted`
  - `requests` — `pending` request addressed **to** you
  - `discover` — everyone else
- The Connect screen has a tab per `kind`.

### 4.4 Advisor (AI career advisor)

- `askAdvisor(question)` lives in `src/services/advisor.ts`.
- **Prototype:** returns profile-aware **canned** answers after a short delay,
  plus a list of `suggestedQuestions`. No network/API key needed.
- **Production:** route through a Supabase **Edge Function** that calls the
  Anthropic Claude API server-side (keep the API key off the device):

  ```ts
  const { data } = await supabase.functions.invoke("advisor", {
    body: { question, profileId },
  });
  return data.reply;
  ```

### 4.5 Profile

- `getMyProfile()` reads the signed-in user's `profiles` row (or `mock.me`).
- Profile fields include persona, skills, years of experience, and a
  `vector(384)` embedding used for matching.

---

## 5. Backend data model (Supabase)

Defined in `supabase/schema.sql`. Highlights:

| Table / object      | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `profiles`          | Individual users, 1:1 with `auth.users`; holds embedding     |
| `companies`         | Employer profiles, owned by a user; holds embedding          |
| `roles`             | Job postings under a company                                 |
| `swipes`            | Every left/right/save action                                 |
| `matches`           | Mutual right-swipes; gates chat                              |
| `connections`       | Network requests (pending/accepted/declined)                 |
| `messages`          | Chat, unlocked per match                                     |
| `resumes`           | Versioned resumes, stored in Supabase Storage                |
| `roles_with_company`| View joining roles + company info                            |
| `connections_view`  | View bucketing users into network/requests/discover          |

**Automation via triggers:**

- `on_auth_user_created` → `handle_new_user()` auto-creates a `profiles` row on
  sign-up.
- `trg_right_swipe` → `handle_right_swipe()` auto-creates a `match` on a mutual
  right-swipe.

**Security:** Row Level Security (RLS) is enabled on every table. Users can only
read/write their own swipes, matches, resumes, and connection rows; profiles,
companies and roles are readable by any authenticated user. Matching/deck logic
runs in `SECURITY DEFINER` functions scoped to `auth.uid()`.

---

## 6. Configuration / environment workflow

```
.env.example ──copy──► .env
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
        │
        ▼
src/lib/supabase.ts computes isSupabaseConfigured
        │
        ├─ false ► whole app uses src/data/mock.ts  (runs offline)
        └─ true  ► repo.ts switches every screen to live Supabase queries
```

To go live:

1. Copy `.env.example` to `.env` and fill in the Supabase URL + anon key.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Restart Expo (the start script clears Metro's cache).

---

## 7. End-to-end summary

1. App boots → loads fonts → mounts bottom-tab navigation.
2. Each screen calls a `repo.ts` function.
3. `repo.ts` checks `isSupabaseConfigured`:
   - **No** → returns local mock data (instant prototype).
   - **Yes** → queries Supabase, with mock data as an error fallback.
4. Matching ranks companies by pgvector similarity; swipes are recorded;
   a DB trigger creates matches on mutual interest.
5. Connections, profile, and the (stubbed) AI advisor follow the same
   configured-or-fallback pattern.

The result is a single codebase that demos instantly and scales to a live,
secured backend by adding two environment variables.
```