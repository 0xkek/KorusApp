'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-white/[0.06]';

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:400%_100%]',
    none: '',
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases

export function PostSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="30%" className="mb-2" />
          <Skeleton variant="text" width="20%" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="60%" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-[var(--color-border-light)]">
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={80} height={24} />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* Cover */}
      <Skeleton variant="rectangular" className="w-full h-32" />

      {/* Avatar and Info */}
      <div className="flex items-start gap-4 px-4">
        <Skeleton variant="circular" width={80} height={80} className="-mt-10" />
        <div className="flex-1 mt-2">
          <Skeleton variant="text" width="40%" className="mb-2 h-6" />
          <Skeleton variant="text" width="30%" className="mb-3" />
          <Skeleton variant="text" width="70%" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 px-4">
        <Skeleton variant="rectangular" width={80} height={40} />
        <Skeleton variant="rectangular" width={80} height={40} />
        <Skeleton variant="rectangular" width={80} height={40} />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="bg-white/[0.12] rounded-xl p-4 space-y-4">
      <Skeleton variant="text" width="60%" className="h-5 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="70%" className="mb-1" />
            <Skeleton variant="text" width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)]/60 border border-[var(--color-border-light)] rounded-2xl p-4 animate-pulse">
      <div className="flex gap-4">
        <Skeleton variant="rectangular" className="w-32 h-24 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton variant="text" width="60%" className="h-5 mb-2" />
          <Skeleton variant="text" width="40%" className="h-3 mb-3" />
          <Skeleton variant="text" width="80%" className="h-3 mb-2" />
          <div className="flex items-center gap-3 mt-3">
            <Skeleton variant="rectangular" width={60} height={22} className="rounded-full" />
            <Skeleton variant="text" width="30%" className="h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventsFeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GameRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-[var(--color-border-light)] animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 min-w-0">
          <Skeleton variant="text" width="30%" className="h-4 mb-1.5" />
          <Skeleton variant="text" width="20%" className="h-3" />
        </div>
        <Skeleton variant="rectangular" width={70} height={28} className="rounded-full" />
      </div>
    </div>
  );
}

export function GamesFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <GameRowSkeleton key={i} />
      ))}
    </>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white/[0.06] rounded-xl p-4">
            <Skeleton variant="text" width="50%" className="h-3 mb-3" />
            <Skeleton variant="text" width="40%" className="h-7 mb-2" />
            <Skeleton variant="text" width="60%" className="h-3" />
          </div>
        ))}
      </div>
      <div className="bg-white/[0.06] rounded-xl p-4">
        <Skeleton variant="text" width="30%" className="h-5 mb-4" />
        <div className="flex items-end gap-1 h-40">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="flex-1 rounded-t" height={`${20 + Math.random() * 80}%`} />
          ))}
        </div>
      </div>
    </div>
  );
}
