# 🚀 Korus - Solana Hackathon Demo Guide

## 🌐 Try It Online Now!

To deploy and share Korus with hackathon judges:

### Quick Deploy (2 minutes)

1. **Deploy to Vercel:**
   ```bash
   ./deploy.sh
   ```
   Or manually:
   ```bash
   npx vercel
   ```

2. **When prompted:**
   - Project name: `korus-hackathon`
   - Build command: `npx expo export --platform web --output-dir web-build`
   - Output directory: `web-build`
   - Development command: `npm run web`

3. **Share the URL** with judges (e.g., `https://korus-hackathon.vercel.app`)

## 🎮 Demo Instructions for Judges

### View Options
When you visit the URL, you'll see:
1. **"View with Phone Frame"** (Recommended) - See the app in a realistic iPhone/Android frame
2. **"View Full Screen"** - Use the app without the phone frame

### Option 1: Connect Your Wallet
1. Visit the deployed URL
2. Choose your viewing preference
3. Click "Connect Wallet"
4. Use Phantom, Solflare, or any Solana wallet
5. You'll automatically receive 5000 ALLY tokens to play with!

### Option 2: Quick Demo (No Wallet Needed)
Use these pre-funded demo accounts:
- **Demo User 1**: `Demo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser`
- **Demo User 2**: `Demo2L9uRqWJhMpRfO5fTlWIhgs7l7qWyAg1PtziBVser`

## ✨ Key Features to Try

### 1. Create a Post
- Tap the floating pen button
- Write something interesting
- Add an image (optional)
- Share to the community!

### 2. Interact with Content
- **Like**: Tap the heart icon
- **Reply**: Add your thoughts
- **Tip**: Send ALLY tokens to great content creators

### 3. Play Games (Unique Feature!)
- Navigate to the Games tab
- Create or join a game
- Wager ALLY tokens
- Games available: Tic-tac-toe, Rock Paper Scissors, Connect 4

### 4. Explore Categories
- Tech, Art, Gaming, Music, Events
- Each category has its own community

### 5. Check Your Wallet
- View balance and transaction history
- See tips sent/received
- Track game winnings

## 🏆 What Makes Korus Special

1. **Bot-Resistant**: Wallet authentication prevents fake accounts
2. **Tokenized Engagement**: Real value exchange through ALLY tokens
3. **On-Chain Gaming**: Trustless, fair games with crypto wagers
4. **Premium Features**: NFT holders get special benefits
5. **Weekly Rewards**: Active users earn from the treasury

## 📱 Mobile Testing

If judges want to test on mobile:
1. Share the Vercel URL
2. They can open it in mobile browser
3. Works best with Phantom mobile app installed

## 🛠 Technical Stack

- **Frontend**: React Native (Expo) + TypeScript
- **Blockchain**: Solana Web3.js + Metaplex
- **Backend**: Express + Prisma + PostgreSQL
- **Authentication**: JWT + Wallet signatures
- **Deployment**: Vercel (frontend) + Render (backend)

## 📊 Live Backend

Backend API: `https://korus-backend.onrender.com/api`
- Real PostgreSQL database
- JWT authentication
- Solana wallet verification

## 🎯 Hackathon Judging Criteria

### Innovation ✅
- First social platform with integrated on-chain gaming
- Novel reputation system based on quality engagement

### Technical Implementation ✅
- Clean architecture with TypeScript
- Real-time updates
- Secure wallet authentication

### User Experience ✅
- Smooth animations
- Intuitive design
- Mobile-first approach

### Solana Integration ✅
- Wallet authentication (Phantom, Solflare, Seed Vault)
- SPL token (ALLY) integration
- Future: Compressed NFTs for profiles

## 🚨 Known Limitations (Hackathon MVP)

- Games are simulated (not on-chain yet)
- ALLY tokens are demo tokens
- Some features show mock data
- Push notifications require native build

## 📞 Contact

For any issues during judging:
- Create an issue on GitHub
- Backend logs available on Render dashboard

---

**Thank you for checking out Korus! We're building the future of social media on Solana. 🌟**