# 🚀 Deploy Korus to Vercel - Step by Step

## Option 1: Deploy via Vercel Website (Easiest)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Click "Sign Up" or "Log In" (use GitHub for easy auth)

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Import from Git repository
   - Select your Korus repository

3. **Configure Build Settings**
   ```
   Framework Preset: Other
   Build Command: npx expo export --platform web --output-dir web-build
   Output Directory: web-build
   Install Command: npm install
   ```

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add: `EXPO_PUBLIC_API_URL` = `https://korus-backend.onrender.com/api`

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get your URL! (e.g., `https://korus-hackathon.vercel.app`)

## Option 2: Deploy via CLI

1. **Login to Vercel**
   ```bash
   npx vercel login
   ```

2. **Deploy**
   ```bash
   npx vercel
   ```
   
   When prompted:
   - Set up and deploy: Y
   - Scope: (select your account)
   - Link to existing project? N
   - Project name: korus-hackathon
   - Directory: ./
   - Override settings? Y
   - Build Command: `npx expo export --platform web --output-dir web-build`
   - Output Directory: `web-build`
   - Development Command: `npm run web`

3. **Set Environment Variable**
   ```bash
   npx vercel env add EXPO_PUBLIC_API_URL
   # Enter: https://korus-backend.onrender.com/api
   # Select: Production, Preview, Development
   ```

4. **Deploy to Production**
   ```bash
   npx vercel --prod
   ```

## Option 3: Quick Deploy (No Account)

Use Netlify Drop for instant deployment:

1. **Build locally**
   ```bash
   npx expo export --platform web --output-dir web-build
   ```

2. **Go to Netlify Drop**
   - Visit https://app.netlify.com/drop
   - Drag the `web-build` folder to the browser
   - Get instant URL!

## 🎯 Share with Judges

Once deployed, share:
- The URL (e.g., `https://korus-hackathon.vercel.app`)
- Demo instructions are built into the app
- Works in any modern browser
- Mobile-friendly

## 📱 What Judges Will See

1. **Welcome Screen** with demo instructions
2. **Wallet Connection** or demo account options
3. **Full Features**: posts, images, likes, tips, games
4. **5000 ALLY tokens** to play with

## 🆘 Troubleshooting

If deployment fails:
- Make sure you're in the `/Users/maxattard/KorusApp` directory
- Run `npm install` first
- Check that `npx expo export --platform web --output-dir web-build` works locally
- Ensure you have Node.js 16+ installed

---

**Need help?** The backend is already live at https://korus-backend.onrender.com so you just need to deploy the frontend!