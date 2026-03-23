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
    <div className="bg-[#171717] border border-[#222222] rounded-xl p-4 mb-4">
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
      <div className="flex items-center gap-6 pt-3 border-t border-[#222222]">
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
