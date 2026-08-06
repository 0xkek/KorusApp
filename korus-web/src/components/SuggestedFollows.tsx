'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { followsAPI, type FollowUser } from '@/lib/api/follows';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import { logger } from '@/utils/logger';

function displayName(user: FollowUser): string {
  if (user.username) return `@${user.username}`;
  if (user.snsUsername) return user.snsUsername;
  const w = user.walletAddress || '';
  return w ? `${w.slice(0, 4)}...${w.slice(-4)}` : 'Unknown';
}

/**
 * Accounts worth following, shown when a user has nothing in their feed yet.
 * Without this a new user hits an empty Following tab with no way forward.
 */
export default function SuggestedFollows({ limit = 5 }: { limit?: number }) {
  const { token, isAuthenticated } = useWalletAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await followsAPI.getSuggested(token || undefined, limit);
        if (!cancelled) setUsers(res.users || []);
      } catch (error) {
        logger.error('Failed to load suggested follows:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, limit]);

  const handleFollow = async (wallet: string) => {
    if (!token || pending[wallet]) return;
    setPending((p) => ({ ...p, [wallet]: true }));
    try {
      const res = await followsAPI.toggleFollow(wallet, token);
      setFollowed((f) => ({ ...f, [wallet]: res.following }));
    } catch (error) {
      logger.error('Failed to toggle follow:', error);
    } finally {
      setPending((p) => ({ ...p, [wallet]: false }));
    }
  };

  if (isLoading || users.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <h3 className="text-[15px] font-semibold mb-3 text-[var(--color-text)]">
        Suggested accounts
      </h3>
      <div className="flex flex-col gap-3">
        {users.map((user) => (
          <div key={user.walletAddress} className="flex items-center gap-3">
            <Link href={`/profile/${user.walletAddress}`} className="shrink-0">
              {user.nftAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.nftAvatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ background: user.themeColor || 'var(--korus-primary)' }}
                />
              )}
            </Link>

            <Link href={`/profile/${user.walletAddress}`} className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate text-[var(--color-text)]">
                {displayName(user)}
              </p>
              {user.bio ? (
                <p className="text-[13px] truncate text-[var(--color-text-tertiary)]">
                  {user.bio}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--color-text-tertiary)]">
                  {user.followerCount ?? 0} followers
                </p>
              )}
            </Link>

            {isAuthenticated && (
              <button
                onClick={() => handleFollow(user.walletAddress)}
                disabled={pending[user.walletAddress]}
                className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-opacity disabled:opacity-50"
                style={
                  followed[user.walletAddress]
                    ? {
                        background: 'transparent',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-light)',
                      }
                    : { background: 'var(--korus-primary)', color: '#000' }
                }
              >
                {followed[user.walletAddress] ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
