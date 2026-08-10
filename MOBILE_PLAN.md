# Korus Mobile — Android & Solana Seeker

Reference plan. Target: a native Android app, distributed on the Solana dApp
Store (Seeker) and installable on Android generally.

Last updated: 2026-08-08

---

## Decisions already made

**Start fresh, don't port the old Expo app.**
`~/Desktop/KorusApp` is a UI shell from Aug 2025 built against **mock data**, before
the backend existed — its API calls are commented out (`utils/nft.ts`,
`utils/sns.ts`). It has no Mobile Wallet Adapter. Reusing it means debugging
year-old scaffolding *and* writing the wallet layer at once, with no way to tell
which layer a failure came from. Keep it open as a **layout reference only**.

**Android-only, by design.**
Mobile Wallet Adapter is Android-only. Seeker is Android, so this is fine — but
there is no iOS path with this architecture. That is a strategic choice, not an
oversight.

**Wagered games stay disabled.**
`ENABLE_GAME_WAGERS=false`. Do not re-enable for mobile without legal advice —
app store distribution makes the gambling question *more* pointed, not less.

---

## Backend: no changes required

Verified against production, 2026-08-08:

| Concern | Status |
|---|---|
| Auth is wallet-signature | ✅ `POST /api/auth/connect` takes `{walletAddress, signature, message}` — exactly what MWA produces |
| CSRF blocks native clients | ❌ **Not a blocker.** Header-based (`x-session-id` + `x-csrf-token`), not cookies. `/auth/connect` is already exempt. A native client fetches a token from `/api/auth/csrf` and sends both headers, same as web. |
| API reachable without Origin | ✅ `GET /api/posts` returns 200 with no Origin header |
| RPC proxy | ✅ `/api/rpc` with a method allowlist, already used for all transactions |

An earlier draft of this plan claimed CSRF was a blocker. That was wrong — it
was assumed rather than read. The middleware is in
`korus-backend/src/middleware/security.ts:22`.

---

## What transfers from the web app

React Native shares **no components** with Next.js — no `div`, no Tailwind
classes, no `next/image`. But the valuable layer moves over nearly unchanged:

**Reuse (~30%, and it's the part that encodes real API knowledge):**
- `korus-web/src/lib/api/*` — plain `fetch`, no browser dependency
- `useWalletAuth` sign-message flow — identical handshake, different signer
- `src/types/*`, `transformPost`, time/format helpers
- Socket.IO event handling
- The entire backend

**Rewrite:**
- Every component (RN primitives)
- All styling (`StyleSheet`, not Tailwind)
- Navigation (`expo-router`)

---

## Phase 1 — ✅ DONE (verified on a Seeker, 2026-08-09)

Signed in as `DCsN…vuRf` against the production backend. User count went 7 → 8,
so a real account was created — not just a token echoed back.

Both MWA details flagged as risky were handled correctly on the first attempt:
- Addresses arrive **base64**, not base58 → converted via `PublicKey`
- `signMessages` returns the payload with the signature **appended** → last 64
  bytes sliced off

Build notes for repeating this:
- Use `./node_modules/.bin/expo`, never the global `expo-cli` — the global one
  resolves `package.json` from the monorepo root and fails.
- First Gradle build takes >10 min; run it in the background.
- Debug builds need Metro running plus `adb reverse tcp:8081 tcp:8081`.

---

## Phase 1 — Prove the wallet path (do this alone, first)

**Goal:** one screen that connects a wallet, signs, authenticates against the
live backend, and shows the resulting JWT.

This is the only genuinely novel risk in the project. If MWA works against the
existing auth, everything after is ordinary app-building. If it doesn't, that's
worth knowing on day one rather than after porting 40 screens.

1. `npx create-expo-app korus-mobile` (TypeScript)
2. Install:
   - `@solana-mobile/mobile-wallet-adapter-protocol`
   - `@solana-mobile/mobile-wallet-adapter-protocol-web3js`
   - `@solana/web3.js`, `bs58`
3. Add Solana polyfills (`react-native-get-random-values`, Buffer shim) —
   required, Solana libs assume Node globals
4. **Custom dev build** — Expo Go cannot load MWA's native code:
   `npx expo prebuild` → `npx expo run:android`
5. Implement: `transact()` → `authorize()` → `signMessage()` →
   `POST /api/auth/connect` → store JWT in memory

**Exit criterion:** a real wallet signs, and the backend returns a JWT.

**Test device:** a Seeker, or any Android with Phantom/Solflare installed. An
emulator needs a wallet APK sideloaded — a physical device is far less friction.

---

## Phase 2 — Read-only app  ✅ DONE (`2ff6be3`, `e2c532a`)

All GET endpoints, no writes, no CSRF involvement. Gets something real on a
device fast and proves the API layer end to end.

- ✅ Feed (`/api/posts`) with cursor pagination and pull-to-refresh
- ✅ Post detail (`/api/posts/:id`) with stats and replies
- ✅ Trending (`/api/posts/trending`)
- ✅ Profiles (`/api/user/by-wallet/:wallet`) with that user's posts

Verified on a Solana Seeker against production: feed, tab switch, post detail,
profile and back navigation all render real data.

Port `lib/api/` verbatim; rebuild the UI against `~/Desktop/KorusApp` as a
visual reference.

### Gotchas found here

- **Verify response shapes against production, not against the web app's
  types.** Both traps below were found by curling the live API, and neither is
  visible in `korus-web`'s TypeScript.
- A user's posts filter on **`authorWallet`**. The obvious-looking `author` is
  silently ignored and returns the *unfiltered* feed — it looks like it works.
- **`nftAvatar` is not always a URL.** The posts endpoints resolve it to an
  image URL; `/api/user/by-wallet` returns the raw NFT **mint address**. Passing
  a mint to `<Image>` fails silently. Use `resolveAvatarUrl()` in
  `src/api/types.ts`, which accepts only `http(s)`.
- `SafeAreaView` from `react-native` is deprecated and applies **no top inset
  on Android** — the status bar overlapped the header. Fixed with
  `StatusBar.currentHeight`; `react-native-safe-area-context` is the better fix
  but is a native module, so it needs a dev-client rebuild. Worth doing when a
  rebuild is happening anyway, and required before iOS.
- A black screenshot usually means the **device screen is off** (60s timeout),
  not an app crash. Check `dumpsys power | grep mWakefulness` first, and run
  `adb shell svc power stayon usb` to hold it awake.
- When USB drops, `adb reverse tcp:8081 tcp:8081` is lost and the dev build
  dies with `Unable to load script`. Re-run it after every reconnect.
- If `adb devices` shows `unauthorized`, tap **Allow** on the device and tick
  *Always allow from this computer*.

---

## Phase 3 — Writes

Needs the CSRF header flow (session id + token) ported from
`korus-web/src/lib/api/client.ts:45-91`.

- Create post, reply, like, follow
- Image upload (Cloudinary path already exists server-side)

---

## Phase 4 — Transactions

MWA handles `signTransaction`; the existing `/api/rpc` proxy handles submission.

- Tips (`TipModal` logic → RN)
- Shoutout purchase
- Premium subscription
- **Not** game wagering — stays disabled

---

## Phase 5 — Polish

- ✅ In-app notification list (`d15b9a3`) — bell with unread badge, polling
  every 60s.
- ⬜ Push notifications. **The earlier note here was wrong**: it claimed this
  was "mostly registration on the client side". Checked properly, the backend
  needs work first:
  - `pushNotificationService` (expo-server-sdk) is complete but has **no
    callers anywhere**.
  - **No route writes `pushToken`.** `/api/notifications/push/subscribe` is
    browser Web Push (VAPID) writing `webPushSubscription`, a different field
    for a different client.
  - So this needs: a register endpoint for Expo tokens, and calls to
    `pushNotificationService` wherever notifications are currently created
    (like/reply/follow/tip in the controllers).
  - ✅ Both done (`dfe48ba` backend, `111b4ea` client). All notification types
    flow through one `createNotification` helper, so that was a single hook,
    not one per controller.
  - ✅ EAS project linked: `6f182b5a-61e8-4be6-83a4-0accb8873ca3`
    (kingkitty/KorusApp). Note `slug` must be `KorusApp` — Expo resolves the
    project by slug, and a mismatch breaks token minting even with a valid id.
  - ⬜ **BLOCKED on Firebase.** Android push goes through FCM; Expo only relays
    to it. Verified on device — `getExpoPushTokenAsync` fails with "Unable to
    get Firebase Messaging instance… Default FirebaseApp is not initialized".
    Needs:
    1. A Firebase project with an Android app for package `fun.korus.app`
    2. Its `google-services.json` in `korus-mobile/`, referenced by
       `expo.android.googleServicesFile` in app.json
    3. The FCM credential uploaded to Expo (`eas credentials`) so Expo can
       send on our behalf
    iOS needs an APNs key instead, when that comes.
- Deep links (`korus://post/:id`) — pairs with the existing web OG metadata
- Offline/error states

---

## Phase 6 — dApp Store submission

The dApp Store is **on-chain**: your listing is an NFT you own, not a database
row a company controls.

Requirements:
- APK signed with a **new key used only for the dApp Store**. An APK signed with
  an existing Google Play key **will be rejected**.
- Icon 512×512 (Google Play icon spec)
- Banner 1200×600
- Minimum 4 screenshots/videos, 1080p (1920×1080) recommended
- `config.yaml` via the dApp Store CLI, validated before submit
- Publishing portal: https://publish.solanamobile.com/
- Agree to publisher policy, publishing agreement, and terms of use

Google Play is a separate, optional track with its own signing key and review.

---

## Sequencing and risk

| Phase | Risk | Why |
|---|---|---|
| 1 — Wallet | **High** | Only real unknown. Do it standalone. |
| 2 — Read-only | Low | Endpoints proven in production |
| 3 — Writes | Low | CSRF flow already solved on web |
| 4 — Transactions | Medium | Real SOL; test with tiny amounts on mainnet |
| 5 — Polish | Low | Push service already written |
| 6 — Submission | Medium | Signing-key rules are unforgiving; asset specs are strict |

**Do not start Phase 2 until Phase 1 works on a real device.**

---

## Open questions

1. **Seeker-only or Android generally?** MWA works on any Android with a
   compatible wallet. Broader reach means more device testing.
2. **Google Play as well as dApp Store?** Different signing key, real review
   process, and Play has its own crypto-app policies.
3. **Feature parity, or mobile-first subset?** Games and events are heavy
   surfaces — worth deciding whether v1 ships feed + profile + tips only.

---

## Sources

- [Expo dApp Setup — Solana Mobile Docs](https://docs.solanamobile.com/react-native/expo)
- [Environment Setup — Solana Mobile Docs](https://docs.solanamobile.com/react-native/setup)
- [Prepare your dApp for publishing](https://docs.solanamobile.com/dapp-publishing/prepare)
- [Solana dApp Store intro](https://docs.solanamobile.com/dapp-publishing/intro)
- [Publishing Solana Mobile Apps (Helius)](https://www.helius.dev/blog/publishing-solana-mobile-apps)
