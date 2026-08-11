'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { followsAPI, type FollowUser } from '@/lib/api/follows';
import { logger } from '@/utils/logger';

/**
 * Follower / following lists for a profile.
 *
 * A modal rather than its own route: the lists are a detour from the profile,
 * and returning to it should not cost a page load. The two tabs share this
 * component because they differ only in which endpoint they call.
 */

export type FollowTab = 'followers' | 'following';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Whose lists these are. */
  wallet: string;
  /** For the heading, e.g. "@korusxbt". */
  displayName?: string | null;
  initialTab: FollowTab;
}

const PAGE = 30;

export default function FollowListModal({
  isOpen,
  onClose,
  wallet,
  displayName,
  initialTab,
}: Props) {
  const modalRef = useFocusTrap(isOpen);
  const [tab, setTab] = useState<FollowTab>(initialTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the caller when it reopens on a different tab.
  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  const load = useCallback(
    async (which: FollowTab, mode: 'initial' | 'more', currentCount: number) => {
      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = mode === 'more' ? currentCount : 0;
        let batch: FollowUser[];
        let count: number;
        let more: boolean | undefined;

        if (which === 'followers') {
          const res = await followsAPI.getFollowers(wallet, { limit: PAGE, offset });
          batch = res.followers;
          count = res.count;
          more = res.hasMore;
        } else {
          const res = await followsAPI.getFollowing(wallet, { limit: PAGE, offset });
          batch = res.following;
          count = res.count;
          more = res.hasMore;
        }

        setUsers((prev) => (mode === 'more' ? [...prev, ...batch] : batch));
        setTotal(count ?? batch.length);
        setHasMore(more ?? batch.length === PAGE);
      } catch (err) {
        logger.error('Failed to load follow list:', err);
        setError('Could not load this list.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [wallet]
  );

  useEffect(() => {
    if (!isOpen) return;
    setUsers([]);
    setTotal(null);
    setHasMore(false);
    load(tab, 'initial', 0);
  }, [isOpen, tab, wallet, load]);

  // Escape closes, matching the app's other modals.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName ?? 'Profile'} ${tab}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-light)]">
          <h2 className="text-[var(--color-text)] font-bold truncate">
            {displayName ?? 'Profile'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-[var(--color-border-light)]">
          {(['followers', 'following'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-[14px] font-semibold capitalize relative transition-colors ${
                tab === key
                  ? 'text-[var(--color-text)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {key}
              {tab === key && total !== null ? ` · ${total}` : ''}
              {tab === key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-16 rounded-full bg-korus-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="py-12 text-center text-[var(--color-text-tertiary)] text-sm">
              Loading…
            </p>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-[var(--color-text-secondary)] text-sm mb-3">{error}</p>
              <button
                onClick={() => load(tab, 'initial', 0)}
                className="px-4 py-2 rounded-lg border border-[var(--color-border-light)] text-[var(--color-text)] text-sm hover:bg-white/[0.06] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-[var(--color-text-tertiary)] text-sm">
              {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </p>
          ) : (
            <>
              {users.map((u) => (
                <UserRow key={u.walletAddress} user={u} onNavigate={onClose} />
              ))}
              {hasMore && (
                <button
                  onClick={() => load(tab, 'more', users.length)}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm text-korus-primary hover:bg-white/[0.04] disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? 'Loading…' : 'Show more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, onNavigate }: { user: FollowUser; onNavigate: () => void }) {
  // Same precedence as the rest of the app: username, then SNS, then wallet.
  const sns = user.snsUsername && user.snsUsername !== '__wallet__' ? user.snsUsername : null;
  const name = user.username
    ? `@${user.username}`
    : sns ?? `${user.walletAddress.slice(0, 4)}…${user.walletAddress.slice(-4)}`;
  // by-wallet returns nftAvatar as a raw mint, so only render real URLs.
  const avatar = user.nftAvatar && /^https?:\/\//.test(user.nftAvatar) ? user.nftAvatar : null;

  return (
    <Link
      href={`/profile/${user.walletAddress}`}
      onClick={onNavigate}
      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors border-b border-[var(--color-border-light)] last:border-b-0"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold text-sm"
          style={{ backgroundColor: user.themeColor || 'var(--korus-primary)' }}
        >
          {user.walletAddress.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-text)] font-semibold text-[15px] truncate">
            {name}
          </span>
          {user.tier === 'premium' && <span className="text-amber-400 text-xs">★</span>}
        </div>
        {user.bio && (
          <p className="text-[var(--color-text-secondary)] text-[13px] truncate">{user.bio}</p>
        )}
      </div>

      <span className="text-[var(--color-text-tertiary)] text-xs shrink-0">
        {user.followerCount ?? 0} followers
      </span>
    </Link>
  );
}
