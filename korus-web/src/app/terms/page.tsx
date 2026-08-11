import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal/legal.module.css';

export const metadata: Metadata = {
  title: 'Terms of Use — Korus',
  description: 'The terms that govern your use of Korus.',
  openGraph: {
    title: 'Terms of Use — Korus',
    description: 'The terms that govern your use of Korus.',
    siteName: 'Korus.fun',
    type: 'website',
  },
};

/** Kept in sync with the date in /privacy. */
const LAST_UPDATED = '11 August 2026';

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>
          ← Back to Korus
        </Link>

        <h1 className={styles.title}>Terms of Use</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <p className={styles.intro}>
          Korus is a social platform built on the Solana blockchain, available at
          korus.fun and as a mobile app. By connecting a wallet and using Korus,
          you agree to these terms. If you do not agree, please do not use the
          service.
        </p>

        <div className={styles.callout}>
          <p>
            Korus is non-custodial. We never hold your private keys and never
            take custody of your funds. Every payment is approved by you, in your
            own wallet, and settles directly on Solana.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.heading}>1. Who can use Korus</h2>
          <p>
            You must be at least 18 years old, and legally able to enter into
            this agreement in your jurisdiction. You are responsible for
            complying with the laws that apply to you, including any rules on
            digital assets. Do not use Korus if doing so would break the law
            where you live.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>2. Your account and your wallet</h2>
          <p>
            Korus has no passwords and no email sign-up. Your identity is your
            Solana wallet address: you sign a message with your wallet to prove
            you control it, and that is what signs you in.
          </p>
          <p>
            You are solely responsible for the security of your wallet, your
            seed phrase and your private keys. We cannot recover them, reset
            them, reverse a transaction, or restore access to a wallet you have
            lost control of. Anyone who controls your wallet controls your
            Korus account.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>3. Content you post</h2>
          <p>
            You keep ownership of what you post. By posting, you grant Korus a
            worldwide, non-exclusive, royalty-free licence to host, store and
            display that content for the purpose of operating the service.
          </p>
          <p>You agree not to post content that:</p>
          <ul>
            <li>is unlawful, or promotes or facilitates illegal activity;</li>
            <li>
              harasses, threatens, defames or incites violence against anyone;
            </li>
            <li>is sexual content involving minors, or exploits minors in any way;</li>
            <li>
              infringes someone else&apos;s copyright, trademark or other rights;
            </li>
            <li>
              is spam, or a scam, phishing attempt, fraudulent airdrop or
              impersonation of another person or project;
            </li>
            <li>contains malware or links intended to compromise other users.</li>
          </ul>
          <p>
            We may remove content, and suspend or terminate accounts, that
            breaches these rules. Reported content is reviewed by moderators.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>4. Tips and on-chain payments</h2>
          <p>
            Korus lets you tip other users in SOL. Tips are peer-to-peer
            transfers: the SOL moves from your wallet directly to the
            recipient&apos;s wallet. Korus does not hold, escrow or route the
            funds.
          </p>
          <div className={styles.callout}>
            <p>
              Blockchain transactions are final. Once a tip or payment is
              confirmed on Solana it cannot be reversed, cancelled or refunded —
              not by us, and not by anyone. Check the amount and the recipient
              before you approve.
            </p>
          </div>
          <p>
            You are responsible for network fees, and for any tax that applies to
            your activity. Korus does not provide financial, investment or tax
            advice.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>5. Premium and shoutouts</h2>
          <p>
            Korus offers optional paid features, priced in SOL and paid from your
            wallet:
          </p>
          <ul>
            <li>
              <strong>Premium</strong> — a subscription unlocking cosmetic and
              convenience features such as custom themes and username changes. It
              is charged per period and does not renew automatically; it lapses
              at the end of the period unless you renew it.
            </li>
            <li>
              <strong>Shoutouts</strong> — paid promotion that pins a post to the
              top of the feed for a set duration.
            </li>
          </ul>
          <p>
            Because these are settled on-chain, payments for them are final and
            non-refundable. Paid features are cosmetic or promotional; they do
            not confer ownership, revenue rights, governance rights or any
            expectation of profit, and they are not investments.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>6. Games</h2>
          <p>
            Korus includes games such as Connect Four, Tic-Tac-Toe and Rock
            Paper Scissors that you can play against other users. Where a game
            involves a SOL wager, the same rule applies: the transaction is
            on-chain and final. Play only what you can afford to lose, and only
            where such play is legal for you.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>7. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              interfere with, overload or attempt to gain unauthorised access to
              the service or its infrastructure;
            </li>
            <li>
              scrape or harvest data at scale, or use bots to manipulate
              reputation, engagement or rankings;
            </li>
            <li>
              operate networks of accounts to inflate metrics or evade
              suspension;
            </li>
            <li>
              use Korus to launder funds or move the proceeds of criminal
              activity.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>8. Third-party services</h2>
          <p>
            Korus depends on services we do not control, including the Solana
            network, your wallet provider, RPC providers and NFT metadata
            sources. Outages, forks, congestion or changes in those services can
            affect Korus, and we are not responsible for them. Links to
            third-party sites are not endorsements.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>9. Service provided &quot;as is&quot;</h2>
          <p>
            Korus is provided on an &quot;as is&quot; and &quot;as available&quot;
            basis, without warranties of any kind, whether express or implied. We
            do not warrant that the service will be uninterrupted, secure or
            error-free, and we may change, suspend or discontinue any part of it.
          </p>
          <p>
            To the fullest extent permitted by law, Korus and its operators are
            not liable for any indirect, incidental, special or consequential
            damages, or for any loss of funds, tokens, digital assets, data or
            profits arising from your use of the service — including losses
            caused by your own transactions, a compromised wallet, or failures in
            the Solana network.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>10. Suspension and termination</h2>
          <p>
            We may suspend or terminate access to Korus for breach of these
            terms. You can stop using Korus at any time by disconnecting your
            wallet. Content posted publicly may remain visible to others, and
            anything already written to the blockchain cannot be deleted by us.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>11. Changes to these terms</h2>
          <p>
            We may update these terms as the service develops. The date at the
            top of this page shows when they last changed, and continuing to use
            Korus after an update means you accept the revised terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>12. Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:kingkitty.sol@gmail.com">kingkitty.sol@gmail.com</a>.
          </p>
        </section>

        <p className={styles.footer}>
          See also our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
