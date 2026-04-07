# FID-Scout

Sim-racing talent scouting platform. Drivers connect their iRacing account, get a talent score across 5 dimensions, and top performers get discovered by the FAT Karting League.

## Tech Stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- **Recharts** (Data visualization)
- **Vercel** (Deployment + Cron Jobs every 6 hours)

## Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

4. Run the database migration in the **Supabase SQL Editor**:
   ```
   supabase/migrations/001_initial.sql
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Seeding Mock Data

Inserts 12 fictional drivers with 90 days of iRating history and race results.
Idempotent — safe to run multiple times.

```bash
npx ts-node --project tsconfig.json scripts/seed-mock-data.ts
```

## Calculating Scores (first run)

After seeding, trigger the score calculation manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/seed-scores
```

## User Roles

| Role    | Access                          |
|---------|---------------------------------|
| `user`  | Own dashboard, ranking, pathway |
| `scout` | B2B scout dashboard at `/scout` |
| `admin` | Full access                     |

To promote a user to scout, run in Supabase SQL Editor:
```sql
UPDATE public.profiles SET role = 'scout' WHERE id = '<user-uuid>';
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/register` | Create account |
| `/login` | Sign in |
| `/dashboard` | Driver talent dashboard |
| `/dashboard/ranking` | Age group ranking |
| `/dashboard/pathway` | Scouting pathway & criteria |
| `/scout` | B2B scout talent overview |
| `/scout/[userId]` | Individual driver profile |
| `/api/cron/calculate-scores` | Score recalculation (runs every 6h) |
| `/api/cron/seed-scores` | Manual one-time score trigger |

## Deployment

1. Push to GitHub
2. Connect the repository to [Vercel](https://vercel.com)
3. Set all environment variables in the Vercel dashboard
4. Deploy — the cron job at `vercel.json` runs automatically every 6 hours
