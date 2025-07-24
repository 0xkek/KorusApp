# Database Setup Options for Korus

## Option 1: Supabase (Recommended for Quick Start)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to Settings → Database
4. Copy the connection string (use the "Connection string" tab and select "URI")
5. Replace the DATABASE_URL in your `.env` file with this connection string

Example connection string:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Option 2: Local PostgreSQL Installation

### Install PostgreSQL via Homebrew:
```bash
brew install postgresql@15
brew services start postgresql@15
createdb korus_dev
```

### Create a user and grant permissions:
```bash
psql -d korus_dev
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE korus_dev TO postgres;
\q
```

## Option 3: Docker PostgreSQL

### Create docker-compose.yml:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: korus_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Run Docker:
```bash
docker-compose up -d
```

## After Database Setup

1. Update your `.env` file with the correct DATABASE_URL
2. Run Prisma migrations:
   ```bash
   cd korus-backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```
3. Seed the database (optional):
   ```bash
   npx prisma db seed
   ```

## Verify Connection
```bash
cd korus-backend
npm run dev
# Visit http://localhost:3000/test-db
```