# Mango — Career & Life Guide (Expo prototype)

A React Native (Expo) implementation of the Mango app: persona-based career
matching with a swipe deck, AI career advisor, professional connections, and
profile — wired to a Supabase backend.

## Stack

| Layer         | Tech                                                      |
| ------------- | --------------------------------------------------------- |
| Mobile client | React Native + Expo                                       |
| Styling       | NativeWind (Tailwind for RN)                              |
| Navigation    | React Navigation (bottom tabs)                            |
| Swipe deck    | react-native-deck-swiper + Reanimated                     |
| Backend       | Supabase (Postgres + Auth + Realtime + Storage)           |
| Matching      | pgvector cosine similarity + rule-based fallback          |
| AI advisor    | Anthropic Claude API via Supabase Edge Function (stubbed) |

## Prerequisites 
Make sure to download **Expo Go** in your mobile phone

## Run it

```bash
npm install
npx expo install babel-preset-expo
npm run start
```

The start script clears Metro's cache before serving, which helps when Expo Go
keeps showing an old compatibility warning after an app or SDK update.

Press `i` (iOS simulator), `a` (Android), or scan the QR with Expo Go.

> The app runs immediately with built-in mock data — no backend needed.
> Add Supabase credentials (below) to make it live.

## Wire up Supabase


1. Copy `.env.example` to `.env` and fill in (create a .env file if it doesn't exist):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://edzchzjupgmvjwnazrty.supabase.co/rest/v1/
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_u7NLPBamKOm9aPFynTGMKw_JsCYipma
   ```
2. Restart Expo. `src/data/repo.ts` detects the credentials and switches every
   screen from mock data to live Supabase queries automatically.

## How the data flows

`src/data/repo.ts` is the single source of truth. Each function tries Supabase
when configured and falls back to `src/data/mock.ts` otherwise:

- `getFeaturedRoles()` → Home featured + mini role cards
- `getSwipeDeck()` → Match deck, ranked by `get_swipe_deck()` (pgvector)
- `recordSwipe()` → inserts into `swipes`; a DB trigger creates a `match` on mutual right-swipes
- `getConnections(kind)` → Connect tabs, reading `connections_view`
- `askAdvisor()` (in `services/advisor.ts`) → canned now; swap for the Edge Function

## Project structure

```
App.tsx                  font loading + navigation root
global.css               tailwind directives
tailwind.config.js       Mango color + font tokens
src/
  theme/colors.ts        tokens for LinearGradient / icon tints
  lib/supabase.ts        client + isSupabaseConfigured flag
  data/                  types, mock seed, repo (Supabase + fallback)
  services/advisor.ts    AI advisor (Edge Function wiring documented)
  components/ui.tsx       ScreenBg, Avatar, Card, GoldButton, Pill, etc.
  navigation/BottomTabs.tsx
  screens/               Home, Match, Connect, Advisor, Profile
supabase/schema.sql      full backend schema
```

## Next steps toward production

- Add Supabase Auth screens (sign-up flow + persona assessment write).
- Enable Realtime on `messages` for live chat after a match.
- Generate `embedding` vectors on profile/role create for real matching.
- Add Expo Notifications for interview reminders.
