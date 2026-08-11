import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal/legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy — Korus',
  description: 'What Korus collects, why, and what it never collects.',
  openGraph: {
    title: 'Privacy Policy — Korus',
    description: 'What Korus collects, why, and what it never collects.',
    siteName: 'Korus.fun',
    type: 'website',
  },
};

/** Kept in sync with the date in /terms. */
const LAST_UPDATED = '11 August 2026';

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>
          ← Back to Korus
        </Link>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <p className={styles.intro}>
          This policy explains what Korus collects when you use korus.fun or the
          Korus mobile app, why we collect it, and who it is shared with. Korus
          is a wallet-based social platform: there is no email sign-up and no
          password, which means we hold much less about you than a conventional
          social app.
        </p>

        <div className={styles.callout}>
          <p>
            We never ask for, receive or store your seed phrase or private keys.
            No part of Korus can move funds from your wallet — every transaction
            is approved by you, inside your own wallet app.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.heading}>1. What we collect</h2>
          <p>
            <strong>Your wallet address.</strong> This is your account
            identifier. It is public by nature, and it is shown alongside
            anything you post.
          </p>
          <p>
            <strong>Profile information you choose to add.</strong> A username,
            bio, location, website, X/Twitter handle, an NFT set as your avatar,
            a .sol domain name, and your theme preferences. All of it is
            optional, and all of it is public.
          </p>
          <p>
            <strong>Content and activity.</strong> Posts, replies, likes,
            reposts, follows, tips, game results, event registrations, and the
            reputation score derived from that activity.
          </p>
          <p>
            <strong>Payment records.</strong> For premium subscriptions and
            shoutouts we store the transaction signature, amount and date, so we
            can verify the payment. The transaction itself is on the public
            Solana blockchain regardless.
          </p>
          <p>
            <strong>A push notification token,</strong> if you enable
            notifications. It identifies your device to the push service, not
            you personally, and is deleted when you turn notifications off.
          </p>
          <p>
            <strong>Limited technical data.</strong> Standard server logs and
            anonymous performance metrics (page load timings), used to keep the
            service running and diagnose faults.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>2. What we never collect</h2>
          <ul>
            <li>Your seed phrase, private keys, or any means of spending your funds.</li>
            <li>Your name, postal address, phone number or government ID.</li>
            <li>Your email address — unless you choose to email us directly.</li>
            <li>Payment card details. All payments are on-chain, in SOL.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>3. Why we use it</h2>
          <ul>
            <li>To operate the service: show feeds, profiles, games and events.</li>
            <li>
              To authenticate you — verifying a signature made with your wallet.
            </li>
            <li>
              To deliver notifications you have asked for, and to unlock features
              you have paid for.
            </li>
            <li>
              To enforce our <Link href="/terms">Terms of Use</Link>: detect
              spam, abuse and manipulation, and act on reports.
            </li>
          </ul>
          <p>
            We do not sell your data, and we do not use it for advertising or
            behavioural profiling.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>4. What is public</h2>
          <p>
            Korus is a public social platform. Your wallet address, profile,
            posts, replies, likes, reposts, follows and reputation are visible to
            anyone — including people who are not signed in.
          </p>
          <p>
            Separately, activity on the Solana blockchain — tips, subscription
            payments, shoutout purchases, wagers — is permanently public by
            design. Anyone can inspect it using a block explorer, and it is
            outside our control. Deleting your Korus account does not, and
            cannot, remove it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>5. Who we share it with</h2>
          <p>
            We share data only with the providers needed to run Korus, and only
            for that purpose:
          </p>
          <ul>
            <li>
              <strong>Hosting and database providers,</strong> which store the
              application data described above.
            </li>
            <li>
              <strong>Solana RPC providers,</strong> which relay blockchain reads
              and transactions.
            </li>
            <li>
              <strong>Google Firebase Cloud Messaging and Expo,</strong> which
              deliver push notifications to your device if you enable them.
            </li>
            <li>
              <strong>Solana Mobile,</strong> if you install the app from the
              dApp Store, under their own privacy policy.
            </li>
          </ul>
          <p>
            We may also disclose information where the law requires it, or to
            investigate abuse or protect users.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>6. Retention</h2>
          <p>
            Account and content data is kept while your account exists. Server
            logs are kept for a short period for security and debugging. Push
            tokens are removed when you disable notifications. On-chain data
            cannot be deleted by anyone.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>7. Your choices</h2>
          <ul>
            <li>
              <strong>Edit or remove profile details</strong> at any time in the
              app.
            </li>
            <li>
              <strong>Delete your posts,</strong> which removes them from Korus.
            </li>
            <li>
              <strong>Turn off push notifications,</strong> in settings or in
              your device&apos;s own controls.
            </li>
            <li>
              <strong>Disconnect your wallet,</strong> which signs you out. The
              mobile app does not remember your wallet between launches — you
              connect and sign each time you open it.
            </li>
            <li>
              <strong>Request deletion of your account data</strong> by emailing
              us. Depending on where you live you may also have rights to access,
              correct, export or restrict the processing of your data.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>8. Children</h2>
          <p>
            Korus is not intended for anyone under 18, and we do not knowingly
            collect data from children. If you believe a child has used Korus,
            contact us and we will remove the account.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>9. Security</h2>
          <p>
            Data is transmitted over HTTPS and access to production systems is
            restricted. No system is perfectly secure, but note that the most
            sensitive thing in this ecosystem — your keys — never reaches us at
            all.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>10. Changes</h2>
          <p>
            We will update this policy as the service changes, and the date at
            the top of the page shows when it last changed.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>11. Contact</h2>
          <p>
            For privacy questions or a data deletion request, email{' '}
            <a href="mailto:kingkitty.sol@gmail.com">kingkitty.sol@gmail.com</a>.
          </p>
        </section>

        <p className={styles.footer}>
          See also our <Link href="/terms">Terms of Use</Link>.
        </p>
      </div>
    </main>
  );
}
