# Backend Setup Guide

## Quick Start

### 1. Install PostgreSQL (if not installed)
```bash
# On Mac:
brew install postgresql
brew services start postgresql

# Create a database user
createuser -s postgres
```

### 2. Create the database
```bash
createdb korus_dev
```

### 3. Set up the backend
```bash
cd korus-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database password (if you set one)
# Default connection string: postgresql://postgres:password@localhost:5432/korus_dev

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the backend
npm run dev
```

### 4. Update frontend to connect
In `/context/WalletContext.tsx`, find the line:
```typescript
const isOffline = true; // Change this to false
```

Change it to:
```typescript
const isOffline = false; // Now connected to backend
```

### 5. Test the connection
The backend should be running on http://localhost:3000
The app should now connect to it automatically!

## Troubleshooting

### Database connection issues
1. Make sure PostgreSQL is running: `brew services list`
2. Check if database exists: `psql -l`
3. If password issues, update .env file

### Network connection issues
1. Make sure backend is running: `npm run dev` in korus-backend
2. Check your IP hasn't changed: `ifconfig | grep "inet "`
3. Update `/utils/api.ts` with new IP if needed

### CORS issues
The backend is already configured to accept requests from Expo.