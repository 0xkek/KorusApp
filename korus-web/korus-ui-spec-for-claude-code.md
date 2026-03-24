# Korus UI Redesign Spec

I need you to redesign the korus.fun web app UI to match this exact design spec. The project is at `/Users/maxattard/KorusApp/korus-web/` — it's a Next.js 15 app with React, TypeScript, and Tailwind CSS. Solana wallet integration is already working.

## IMPORTANT: Use this HTML mockup as the pixel-perfect reference

The HTML below is the complete mockup. Match every color, spacing, radius, font, shadow, and layout exactly. Don't improvise — follow this spec to the letter.

---

## Design System Summary

### Font
- **Inter** (weights: 400, 500, 600, 700, 800)
- Import: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap`

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a0a` | Page background |
| Surface | `#141414` | Widget/card backgrounds |
| Border | `#1a1a1a` | All borders and dividers |
| Text Primary | `#fafafa` | Headings, active nav, usernames |
| Text Secondary | `#e5e5e5` | Post body text |
| Text Muted | `#737373` | Handles, timestamps, inactive nav, post action counts |
| Text Dim | `#525252` | Dots, trending labels, placeholders |
| Text Dimmer | `#404040` | Copyright |
| Green Primary | `#43e97b` | Accent, active states, badges, links, tips, SOL amounts |
| Green Gradient End | `#38f9d7` | Gradient pair with green primary |
| Green BG Hover | `rgba(67,233,123,0.08)` | Hover states on green items |
| Green BG Subtle | `rgba(67,233,123,0.1)` | SOL badge bg, compose tool hover |
| Green BG Banner | `rgba(67,233,123,0.12)` to `rgba(56,249,215,0.08)` | Shoutout/game card gradient |
| Green Border | `rgba(67,233,123,0.2)` to `rgba(67,233,123,0.3)` | Shoutout/game card borders |
| Red / Liked | `#f43f5e` | Liked heart, live game dot |
| Amber / Tip Hover | `#f59e0b` | Tip action hover state |

### Layout
- 3-column CSS grid: `240px | 1fr | 300px`
- Max width: `1280px`, centered with `margin: 0 auto`
- Full viewport height minimum

---

## Component Specs

### Left Sidebar (sticky, full height)
- Padding: `24px 16px`
- Border right: `1px solid #1a1a1a`
- **Logo**: 36px square icon, `border-radius: 10px`, gradient `#43e97b → #38f9d7`, bold "K" inside, "Korus" text at 22px/800 weight, -0.5px letter spacing
- **Nav items**: Icon (22px, 0.7 opacity) + label, `12px 16px` padding, `12px` border-radius
  - Default: `#737373` text
  - Hover: `rgba(255,255,255,0.05)` bg, `#e5e5e5` text
  - Active: `rgba(67,233,123,0.08)` bg, `#fafafa` text, 600 weight, icon turns `#43e97b`
- **Notification badge**: `#43e97b` bg, black text, 11px, 700 weight, pill shape
- **Post button**: Full width, `14px` padding, `14px` border-radius, gradient green, 700 weight, hover lifts -1px with green shadow (`0 8px 25px rgba(67,233,123,0.3)`)
- **User card**: Pinned to bottom (`margin-top: auto`), avatar (38px circle, gradient, initials) + name (14px/600) + wallet handle (12px/`#737373`), hover `rgba(255,255,255,0.05)` bg
- **Nav items**: Home, Games, Events, Notifications (with badge), Search, Profile, Wallet

### Feed Header (sticky with blur)
- Background: `rgba(10,10,10,0.85)` + `backdrop-filter: blur(12px)`
- Border bottom: `1px solid #1a1a1a`
- **Tabs**: "For You", "Following", "Trending" — equal width, centered text
  - Default: `#737373`, 14px, 600 weight
  - Hover: `#a1a1a1`, `rgba(255,255,255,0.02)` bg
  - Active: `#fafafa`, green underline (40px wide, 3px tall, centered, `#43e97b`)

### Compose Area
- Padding: `16px 20px`, border-bottom `1px solid #1a1a1a`
- Avatar: 42px circle, gradient green
- Textarea: No bg, no border, `#fafafa` text, 16px, placeholder `#525252`
- Actions bar: border-top `1px solid #1a1a1a`, 12px margin/padding top
  - Tools: 34px buttons, 8px radius, `#43e97b` color, hover `rgba(67,233,123,0.1)` bg
  - Submit: pill button, 20px radius, `#43e97b` solid bg, 50% opacity until content

### Posts (flat row style — NOT cards)
- Padding: `16px 20px`, border-bottom `1px solid #1a1a1a`
- Hover: `rgba(255,255,255,0.02)` bg
- Avatar: 42px circle, gradient colors per user
- **Meta line**: Author name (15px/600) + @handle (`#737373`/14px) + dot (`#525252`) + time (`#525252`/13px)
- **Content**: 15px, `#e5e5e5`, line-height 1.55, links in `#43e97b`
- **Actions row**: pill buttons (6px 12px padding, 20px radius)
  - Default: `#737373`
  - Hover: `#43e97b` text + `rgba(67,233,123,0.08)` bg
  - Liked: `#f43f5e` (heart fill changes)
  - Tip hover: `#f59e0b` + `rgba(245,158,11,0.08)` bg
  - SOL badge: `rgba(67,233,123,0.1)` bg, `#43e97b` text, 11px, 6px radius
  - Share button: pushed right with `margin-left: auto`
  - All icons: 18px SVG stroke icons

### Shoutout Banner
- Gradient bg: `rgba(67,233,123,0.12)` → `rgba(56,249,215,0.08)`
- Border: `1px solid rgba(67,233,123,0.2)`
- 16px radius, `14px 16px` padding, margin `12px 20px`
- Icon (24px emoji) + Label ("SHOUTOUT" uppercase, 11px, 700, `#43e97b`) + Content (14px/500) + Timer (12px, `#737373`, tabular-nums)

### Game Embed (inside posts)
- Gradient bg: `rgba(67,233,123,0.15)` → `rgba(56,249,215,0.1)`
- Border: `1px solid rgba(67,233,123,0.2)`
- 16px radius, 16px padding
- Emoji icon (36px) + Game info (title 14px/700, detail 13px/`#737373`) + Action button (10px radius, green border/bg, `#43e97b` text)

### Right Sidebar (sticky, scrollable)
- Padding: `20px 16px`
- **Widgets**: `#141414` bg, `1px solid #1a1a1a` border, 16px radius, 16px padding, 16px gap
- **Widget title**: 18px, 700 weight
- **Live Games**: Red pulsing dot (8px, `#f43f5e`, opacity animation 1→0.4 over 1.5s) + title (13px/600) + detail (12px/`#737373`) + wager (12px/700/`#43e97b`)
- **Trending**: Numbered label (12px/`#525252`) + topic (14px/600) + post count (12px/`#737373`), hover opacity 0.8
- **Top Tippers**: Ranked — #1 gold (`#f59e0b`), #2 silver (`#a1a1a1`), avatar circle + name (13px/600) + SOL total (13px/700/`#43e97b`)
- **Footer links**: 12px, `#525252`, underline on hover. Copyright: 11px, `#404040`

---

## Full Reference HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Korus Concept 1 — Clean & Confident</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #fafafa; overflow-x: hidden; }

  /* Layout */
  .app { display: grid; grid-template-columns: 240px 1fr 300px; min-height: 100vh; max-width: 1280px; margin: 0 auto; }

  /* Left Sidebar */
  .sidebar-left { padding: 24px 16px; border-right: 1px solid #1a1a1a; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; }
  .logo { display: flex; align-items: center; gap: 10px; padding: 0 12px; margin-bottom: 36px; }
  .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #43e97b, #38f9d7); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; color: #000; }
  .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }

  .nav-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; font-size: 15px; font-weight: 500; color: #737373; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; text-decoration: none; }
  .nav-item:hover { background: rgba(255,255,255,0.05); color: #e5e5e5; }
  .nav-item.active { background: rgba(67, 233, 123, 0.08); color: #fafafa; font-weight: 600; }
  .nav-item.active .nav-icon { color: #43e97b; }
  .nav-icon { width: 22px; height: 22px; opacity: 0.7; }
  .nav-item:hover .nav-icon, .nav-item.active .nav-icon { opacity: 1; }
  .nav-badge { margin-left: auto; background: #43e97b; color: #000; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }

  .post-btn { margin-top: 20px; width: 100%; padding: 14px; border: none; border-radius: 14px; background: linear-gradient(135deg, #43e97b, #38f9d7); color: #000; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; }
  .post-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(67, 233, 123, 0.3); }

  .user-card { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; cursor: pointer; transition: background 0.15s; }
  .user-card:hover { background: rgba(255,255,255,0.05); }
  .user-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #43e97b, #38f9d7); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #000; }
  .user-name { font-weight: 600; font-size: 14px; }
  .user-handle { font-size: 12px; color: #737373; }

  /* Main Feed */
  .feed { border-right: 1px solid #1a1a1a; }
  .feed-header { position: sticky; top: 0; z-index: 10; background: rgba(10,10,10,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #1a1a1a; }
  .feed-tabs { display: flex; }
  .feed-tab { flex: 1; text-align: center; padding: 16px; font-size: 14px; font-weight: 600; color: #737373; cursor: pointer; position: relative; transition: color 0.2s; }
  .feed-tab:hover { color: #a1a1a1; background: rgba(255,255,255,0.02); }
  .feed-tab.active { color: #fafafa; }
  .feed-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40px; height: 3px; background: #43e97b; border-radius: 3px; }

  /* Compose */
  .compose { padding: 16px 20px; border-bottom: 1px solid #1a1a1a; display: flex; gap: 12px; }
  .compose-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #43e97b, #38f9d7); flex-shrink: 0; }
  .compose-input { flex: 1; }
  .compose-textarea { width: 100%; background: none; border: none; color: #fafafa; font-size: 16px; resize: none; outline: none; font-family: inherit; min-height: 48px; padding-top: 10px; }
  .compose-textarea::placeholder { color: #525252; }
  .compose-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #1a1a1a; }
  .compose-tools { display: flex; gap: 4px; }
  .compose-tool { width: 34px; height: 34px; border-radius: 8px; border: none; background: none; color: #43e97b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: background 0.15s; }
  .compose-tool:hover { background: rgba(67,233,123,0.1); }
  .compose-submit { padding: 8px 20px; border-radius: 20px; border: none; background: #43e97b; color: #000; font-weight: 700; font-size: 14px; cursor: pointer; opacity: 0.5; }

  /* Post */
  .post { padding: 16px 20px; border-bottom: 1px solid #1a1a1a; display: flex; gap: 12px; cursor: pointer; transition: background 0.15s; }
  .post:hover { background: rgba(255,255,255,0.02); }
  .post-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; overflow: hidden; }
  .post-avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .post-body { flex: 1; min-width: 0; }
  .post-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .post-author { font-weight: 600; font-size: 15px; }
  .post-handle { color: #737373; font-size: 14px; }
  .post-time { color: #525252; font-size: 13px; }
  .post-dot { color: #525252; font-size: 12px; }
  .post-content { font-size: 15px; line-height: 1.55; color: #e5e5e5; margin-bottom: 12px; word-wrap: break-word; }
  .post-content a { color: #43e97b; text-decoration: none; }
  .post-image { width: 100%; border-radius: 16px; overflow: hidden; margin-bottom: 12px; border: 1px solid #1a1a1a; }
  .post-image img { width: 100%; display: block; }
  .post-actions { display: flex; gap: 2px; margin-left: -8px; }
  .post-action { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: none; background: none; color: #737373; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .post-action:hover { color: #43e97b; background: rgba(67,233,123,0.08); }
  .post-action.liked { color: #f43f5e; }
  .post-action.liked:hover { background: rgba(244,63,94,0.08); }
  .post-action svg { width: 18px; height: 18px; }
  .post-action.tip-action:hover { color: #f59e0b; background: rgba(245,158,11,0.08); }
  .post-action .sol-badge { font-size: 11px; font-weight: 600; background: rgba(67,233,123,0.1); color: #43e97b; padding: 1px 6px; border-radius: 6px; }

  /* Right Sidebar */
  .sidebar-right { padding: 20px 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .widget { background: #141414; border: 1px solid #1a1a1a; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
  .widget-title { font-weight: 700; font-size: 18px; margin-bottom: 14px; }

  .trending-item { padding: 10px 0; cursor: pointer; transition: opacity 0.15s; }
  .trending-item:hover { opacity: 0.8; }
  .trending-item + .trending-item { border-top: 1px solid #1a1a1a; }
  .trending-label { font-size: 12px; color: #525252; margin-bottom: 2px; }
  .trending-topic { font-weight: 600; font-size: 14px; }
  .trending-posts { font-size: 12px; color: #737373; margin-top: 2px; }

  .live-game { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
  .live-game + .live-game { border-top: 1px solid #1a1a1a; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #f43f5e; animation: pulse 1.5s infinite; flex-shrink: 0; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .live-info { flex: 1; }
  .live-title { font-size: 13px; font-weight: 600; }
  .live-detail { font-size: 12px; color: #737373; }
  .live-wager { font-size: 12px; font-weight: 700; color: #43e97b; }

  .footer-links { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 0; }
  .footer-link { font-size: 12px; color: #525252; text-decoration: none; }
  .footer-link:hover { color: #737373; text-decoration: underline; }
  .footer-copy { font-size: 11px; color: #404040; margin-top: 4px; }

  /* Shoutout Banner */
  .shoutout { background: linear-gradient(135deg, rgba(67,233,123,0.12), rgba(56,249,215,0.08)); border: 1px solid rgba(67,233,123,0.2); border-radius: 16px; padding: 14px 16px; margin: 12px 20px; display: flex; align-items: center; gap: 12px; }
  .shoutout-icon { font-size: 24px; }
  .shoutout-text { flex: 1; }
  .shoutout-label { font-size: 11px; font-weight: 700; color: #43e97b; text-transform: uppercase; letter-spacing: 0.5px; }
  .shoutout-content { font-size: 14px; font-weight: 500; margin-top: 2px; }
  .shoutout-timer { font-size: 12px; color: #737373; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<div class="app">
  <!-- Left Sidebar -->
  <aside class="sidebar-left">
    <div class="logo">
      <div class="logo-icon">K</div>
      <div class="logo-text">Korus</div>
    </div>

    <a class="nav-item active" href="#">
      <svg class="nav-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/></svg>
      Home
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
      Games
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      Events
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      Notifications
      <span class="nav-badge">3</span>
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      Search
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Profile
    </a>
    <a class="nav-item" href="#">
      <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
      Wallet
    </a>

    <button class="post-btn">Post</button>

    <div class="user-card">
      <div class="user-avatar">KS</div>
      <div>
        <div class="user-name">korus.sol</div>
        <div class="user-handle">5S2A...sV2L</div>
      </div>
    </div>
  </aside>

  <!-- Main Feed -->
  <main class="feed">
    <div class="feed-header">
      <div class="feed-tabs">
        <div class="feed-tab active">For You</div>
        <div class="feed-tab">Following</div>
        <div class="feed-tab">Trending</div>
      </div>
    </div>

    <!-- Compose -->
    <div class="compose">
      <div class="compose-avatar"></div>
      <div class="compose-input">
        <textarea class="compose-textarea" placeholder="What's happening on Solana?" rows="1"></textarea>
        <div class="compose-actions">
          <div class="compose-tools">
            <button class="compose-tool"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button>
            <button class="compose-tool"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg></button>
            <button class="compose-tool"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg></button>
            <button class="compose-tool"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
          </div>
          <button class="compose-submit">Post</button>
        </div>
      </div>
    </div>

    <!-- Shoutout Banner -->
    <div class="shoutout">
      <div class="shoutout-icon">📢</div>
      <div class="shoutout-text">
        <div class="shoutout-label">Shoutout</div>
        <div class="shoutout-content">GM Solana fam! New token launch today 🚀</div>
      </div>
      <div class="shoutout-timer">2:34</div>
    </div>

    <!-- Posts -->
    <div class="post">
      <div class="post-avatar"><div class="post-avatar-placeholder" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">DG</div></div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-author">degenwhale.sol</span>
          <span class="post-handle">@degenwhale</span>
          <span class="post-dot">·</span>
          <span class="post-time">2h</span>
        </div>
        <div class="post-content">Just hit 500 SOL in tips on Korus 🎉 This platform is actually delivering on the promise of creator monetization. No middleman, no BS fees. Straight to wallet.</div>
        <div class="post-actions">
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 21C6.5 17 2 13 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 13 17.5 17 12 21z"/></svg> 24</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 8</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> 3</button>
          <button class="post-action tip-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> <span class="sol-badge">2.5 SOL</span></button>
          <button class="post-action" style="margin-left:auto"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
        </div>
      </div>
    </div>

    <div class="post">
      <div class="post-avatar"><div class="post-avatar-placeholder" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)">SM</div></div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-author">solmaxis.sol</span>
          <span class="post-handle">@solmaxis</span>
          <span class="post-dot">·</span>
          <span class="post-time">4h</span>
        </div>
        <div class="post-content">Anyone want to run a 1v1 coin flip? 5 SOL wager. I'm feeling lucky today 🎲<br><br>Drop a reply if you're in 👇</div>
        <div class="post-actions">
          <button class="post-action liked"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 21C6.5 17 2 13 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 13 17.5 17 12 21z"/></svg> 47</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 12</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> 5</button>
          <button class="post-action tip-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> <span class="sol-badge">8.2 SOL</span></button>
          <button class="post-action" style="margin-left:auto"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
        </div>
      </div>
    </div>

    <div class="post">
      <div class="post-avatar"><div class="post-avatar-placeholder" style="background:linear-gradient(135deg,#43e97b,#38f9d7)">KT</div></div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-author">korusTeam</span>
          <span class="post-handle">@korus</span>
          <span class="post-dot">·</span>
          <span class="post-time">6h</span>
        </div>
        <div class="post-content">🎮 New Game Mode Alert: Rock Paper Scissors is LIVE on Korus Games Hub!<br><br>Wager SOL, play best of 3, winner takes all. Smart contract verified. Let's go!</div>
        <div style="background:linear-gradient(135deg,rgba(67,233,123,0.15),rgba(56,249,215,0.1)); border:1px solid rgba(67,233,123,0.2); border-radius:16px; padding:16px; margin-bottom:12px; display:flex; align-items:center; gap:14px">
          <div style="font-size:36px">🎮</div>
          <div style="flex:1">
            <div style="font-weight:700; font-size:14px">Rock Paper Scissors</div>
            <div style="font-size:13px; color:#737373; margin-top:2px">3 active games · 0.5 - 10 SOL wagers</div>
          </div>
          <button style="padding:8px 16px; border-radius:10px; border:1px solid rgba(67,233,123,0.3); background:rgba(67,233,123,0.1); color:#43e97b; font-weight:600; font-size:13px; cursor:pointer">Play Now</button>
        </div>
        <div class="post-actions">
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 21C6.5 17 2 13 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 13 17.5 17 12 21z"/></svg> 89</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> 31</button>
          <button class="post-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> 14</button>
          <button class="post-action tip-action"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> <span class="sol-badge">15.0 SOL</span></button>
          <button class="post-action" style="margin-left:auto"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
        </div>
      </div>
    </div>
  </main>

  <!-- Right Sidebar -->
  <aside class="sidebar-right">
    <div class="widget">
      <div class="widget-title">🔴 Live Games</div>
      <div class="live-game">
        <div class="live-dot"></div>
        <div class="live-info">
          <div class="live-title">Coin Flip — Best of 3</div>
          <div class="live-detail">solmaxis vs degenwhale</div>
        </div>
        <div class="live-wager">5 SOL</div>
      </div>
      <div class="live-game">
        <div class="live-dot"></div>
        <div class="live-info">
          <div class="live-title">Rock Paper Scissors</div>
          <div class="live-detail">anon42 vs cryptoking</div>
        </div>
        <div class="live-wager">2 SOL</div>
      </div>
    </div>

    <div class="widget">
      <div class="widget-title">Trending on Korus</div>
      <div class="trending-item">
        <div class="trending-label">1 · Trending in Crypto</div>
        <div class="trending-topic">Jupiter Airdrop</div>
        <div class="trending-posts">142 posts</div>
      </div>
      <div class="trending-item">
        <div class="trending-label">2 · Trending in Games</div>
        <div class="trending-topic">Coin Flip Meta</div>
        <div class="trending-posts">89 posts</div>
      </div>
      <div class="trending-item">
        <div class="trending-label">3 · Trending</div>
        <div class="trending-topic">SOL to $300</div>
        <div class="trending-posts">67 posts</div>
      </div>
    </div>

    <div class="widget">
      <div class="widget-title">Top Tippers This Week</div>
      <div style="display:flex; align-items:center; gap:10px; padding:8px 0">
        <div style="font-size:14px; font-weight:700; color:#f59e0b; width:20px">1</div>
        <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#f59e0b,#ef4444); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700">DG</div>
        <div style="flex:1"><div style="font-size:13px; font-weight:600">degenwhale.sol</div></div>
        <div style="font-size:13px; font-weight:700; color:#43e97b">142 SOL</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px solid #1a1a1a">
        <div style="font-size:14px; font-weight:700; color:#a1a1a1; width:20px">2</div>
        <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#8b5cf6,#ec4899); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700">SM</div>
        <div style="flex:1"><div style="font-size:13px; font-weight:600">solmaxis.sol</div></div>
        <div style="font-size:13px; font-weight:700; color:#43e97b">98 SOL</div>
      </div>
    </div>

    <div class="footer-links">
      <a href="#" class="footer-link">Terms</a>
      <a href="#" class="footer-link">Privacy</a>
      <a href="#" class="footer-link">About</a>
      <a href="#" class="footer-link">Docs</a>
    </div>
    <div class="footer-copy">&copy; 2025 Korus</div>
  </aside>
</div>
</body>
</html>
```

---

## Implementation Notes for the Next.js Codebase

- The project uses Tailwind CSS — translate the above CSS values into Tailwind utility classes where possible, and use custom CSS / CSS variables for anything Tailwind can't express
- Keep the existing Solana wallet integration, auth system, and API connections — only change the UI layer
- The existing `ThemeProvider` and CSS variable system can be updated to use these new color tokens
- Replace the existing `Header.tsx`, `LeftSidebar.tsx`, `RightSidebar.tsx` components to match this layout
- The `PostCard.tsx` component should be updated to match the flat row style (NOT cards with borders/shadows)
- The compose area in `page.tsx` should match the compose spec above
- Keep all existing functionality (create post, tip, like, comment, repost, share, wallet connect, games, events)
- Font should be switched from Poppins to Inter