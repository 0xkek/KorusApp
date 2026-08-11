# dApp Store submission — where we got to

Everything the app needs is built and verified. What remains is the
on-chain part, which is deliberate and permanent.

## Ready

- **Signed release APK** — EAS profile `dapp-store`, v1.0.0 (versionCode 1)
- **Keystore** — created, uploaded to EAS, fingerprints in
  [korus-mobile/SIGNING.md](korus-mobile/SIGNING.md)
- **Icon** 512×512, **banner** 1200×600, **4 screenshots** at 1200×2670
- **Config draft** — [korus-mobile/dapp-store-config.yaml](korus-mobile/dapp-store-config.yaml)
- **Publisher email** — kingkitty.sol@gmail.com

Each build is verified before use, not assumed sound:

```bash
# signature matches the keystore
apksigner verify --print-certs app.apk | grep "SHA-256 digest"
# expect 07a24a4d4ee8f9f2a1250fae4b927f8000b976c818d7938c50dbf7b68d6652e1

# Firebase compiled in, so push works in release
aapt2 dump resources app.apk | grep google_app_id
```

## Still to do — needs you

**1. A publisher keypair.** This owns the listing on-chain. Not the
Android signing key; a separate Solana keypair.

```bash
solana-keygen new --outfile ~/korus-publisher.json
```

Back it up off this laptop. Losing it means no further updates, with no
support channel, because it is on-chain. Do not reuse the treasury
wallet: publishing is rare and wants an offline key, while the treasury
takes payments.

**2. SOL for minting.** Publisher, App and Release NFTs each cost mint
and rent. Balance was ~0.11 SOL, which should be ample.

**3. Create the app in the portal** at https://publish.solanamobile.com —
this mints the NFTs. The CLI's flow changed from what MOBILE_PLAN.md
describes: it now expects the app to already exist in the portal with its
App NFT, and takes a portal API key.

**4. Then submit** with the CLI, pointing at the APK.

## Worth doing first

The app has never had a long, ordinary session by a real user. Every
issue found tonight — light mode being unreadable, the missing shoutout
frame — came from you using it, not from my testing. A listing is awkward
to update, so an hour of real use is cheap insurance.

## Known loose ends

- A leftover test post, `cmsm36jm00007o262u5ufim51` by `mob6m3a3xu`, is
  still in the feed. Its keypair was discarded, so only an admin wallet
  (`@korusxbt`) can remove it.
- Event registration is unverified end to end: the only event in
  production has closed, and that check runs before signature
  verification. Creating one with a future end date would confirm it.
- The web still hides Games and Events — its sidebar links only Home and
  Profile. Mobile's navigation is now better than the site's.

## Then Google Play

A separate track, after the dApp Store. Two things differ:

- **Format**: Play wants an `.aab`, not an APK. The `production` profile
  already emits one — `eas build --profile production`.
- **Signing key**: keep it separate. An APK signed with a Google Play key
  is **rejected** by the dApp Store, so the current key stays
  dApp-Store-only. Play App Signing will manage its own key, which is
  fine and expected.

Play also reviews crypto apps against its own policies, which the dApp
Store does not, so expect a slower and more opinionated process.
