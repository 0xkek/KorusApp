# Security audit — 2026-08-10

Scope: the public repo `0xkek/KorusApp`, including full git history (not just
HEAD — a deleted secret is still readable in history).

## No private keys are exposed

Checked the whole history for wallet/signing key material:

- No base58 64-byte secret keys
- No raw keypair byte arrays
- No PEM private key blocks
- No `.pem` / `.p12` / `.jks` files ever committed

Every `secretKey` / `PRIVATE_KEY` match in history is either a variable
reference (`process.env.VAPID_PRIVATE_KEY`) or a keypair generated at runtime
in a test. **The treasury and platform wallet keys have never been committed.**

## Three API keys were committed historically — all now dead

Verified each against its live service:

| Key | Where | Status |
|---|---|---|
| `HELIUS_API_KEY=3d27295a-…` | `korus-backend/.env.production` @ `67bb409` | **Unauthorized** — rotated/revoked |
| `HELIUS_API_KEY=a4e2356e-…` | hardcoded in source | **Unauthorized** — rotated/revoked |
| Tenor `AIzaSyAyimku…` | hardcoded in source | **403** — Google discontinued the API |

They remain readable in history forever, but none grants access. No action
required beyond not re-committing them.

`.env.production` itself was committed at four points, but every other value in
it was a placeholder (`YOUR_PASSWORD`, `generate-a-secure-random-string-here`).

## Also found and fixed during this work

- **`/api/search` and `/api/search/users` leaked private user fields.** Both are
  public and unauthenticated and queried users with no `select`, publishing
  `pushToken`, `webPushSubscription`, `solBalance`, `isSuspended` and full
  subscription/payment history including `lastPaymentTxSignature` — 47 fields
  where 14 were intended. Fixed and verified live (`5f3f504`).

## Currently protected

`.gitignore` covers, and each was confirmed ignored:

- `korus-mobile/google-services.json` — not secret (ships in every APK) but
  identifies the Firebase project, and this repo is public
- `korus-mobile/*-firebase-adminsdk-*.json` — **is** secret: grants send access
  to Firebase
- `korus-backend/.env`
- `debug.keystore` — Android's standard shared debug key; signs debug builds
  only, never a release

## Before dApp Store submission

The release keystore must be **new**, used only for the dApp Store (an APK
signed with an existing Play key is rejected), and must never be committed.
Losing it means losing the ability to update the listing.
