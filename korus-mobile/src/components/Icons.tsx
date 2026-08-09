import Svg, { Path } from 'react-native-svg';

/**
 * Action icons, using the same SVG paths as the web app's FeedPostCard so the
 * two clients look like the same product. All are 24x24 outline icons drawn
 * with the current colour.
 */

interface IconProps {
  size?: number;
  color: string;
  /** Filled rather than outlined — used for an active like. */
  fill?: string;
}

function Icon({ size = 18, color, fill = 'none', d }: IconProps & { d: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const ReplyIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
  />
);

export const LikeIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
  />
);

export const RepostIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
  />
);

export const TipIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  />
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
);

export const BellIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z"
  />
);

export const ShareIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
  />
);
