# Release signing

## The key

`korus-release.keystore` — created 2026-08-10, alias `korus`, PKCS12,
valid ~27 years. Uploaded to EAS as build credentials
`Build Credentials 8SjvzWK7Rd` (default for the production profile).

**Fingerprints** — the SHA-256 is the app's permanent identity on the
Solana dApp Store. Verify a build matches before submitting an update.

```
MD5     45:63:74:D2:64:62:AF:31:D4:19:96:E8:45:A1:27:17
SHA1    C1:1A:5C:11:43:4A:94:B1:B5:1A:E2:4C:A0:B8:F4:5F:1A:8F:AD:FB
SHA256  07:A2:4A:4D:4E:E8:F9:F2:A1:25:0F:AE:4B:92:7F:80:00:B9:76:C8:18:D7:93:8C:50:DB:F7:B6:8D:66:52:E1
```

## Why this matters

The dApp Store identifies an app by its signing key, not its name or
package. Consequences:

- **Lose the key** → the listing can never be updated. Not recoverable by
  support; you would publish a new listing and lose your users.
- **Leak the key** → someone else can publish updates as you.
- **Sign with a different key** → rejected as a different app.

An APK signed with an existing Google Play key is also rejected, which is
why this key was generated fresh and is used only here.

## Where it lives

- `korus-mobile/korus-release.keystore` — gitignored, never committed
- EAS build credentials — encrypted, retrievable with
  `eas credentials` → Android → production → Download existing keystore

**Keep a third copy off this laptop.** Two copies both tied to one machine
and one vendor is not a backup.

## Building

```bash
eas build --platform android --profile dapp-store
```

`dapp-store` extends `production` but emits an APK rather than the .aab
Google Play wants, and pins the version so it matches the dApp Store
config.

---

# The publisher keypair — a second key you cannot lose

Separate from the signing keystore above, and just as unrecoverable.

The dApp Store listing is **on-chain**. Publishing mints three NFTs:

1. **Publisher NFT** — your identity as a developer
2. **App NFT** — the Korus listing itself
3. **Release NFT** — one per version

All three are owned by a Solana keypair. That keypair, not the Android
signing key, owns the listing:

- **Lose it** → you cannot publish updates, and cannot prove the listing
  is yours. There is no support channel; it is on-chain.
- **Leak it** → someone else controls your listing.

It also needs a small amount of SOL to cover minting and rent.

**Do not reuse the app's treasury wallet for this.** Publishing is
infrequent and the key wants to live offline, whereas the treasury
receives payments. Different jobs, different risk, different keys.

Generate one with:

```bash
solana-keygen new --outfile ~/korus-publisher.json
```

Back it up the same way as the keystore: somewhere off this laptop.
