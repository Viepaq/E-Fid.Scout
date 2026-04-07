# FID-Scout — Project Context

## What we are building
A sim-racing talent scouting platform. Drivers connect 
their iRacing account, get a talent score across 5 dimensions, 
and top performers get discovered by the FAT Karting League.

## Tech Stack
- Next.js 14 (App Router, TypeScript, Tailwind CSS)
- Supabase (PostgreSQL, Auth, RLS, Service Role for cron)
- Recharts (charts)
- Resend (emails)
- Vercel (deployment + cron jobs every 6 hours)

## Database Tables
- profiles (extends auth.users)
- iracing_history (iRating over time)
- race_results (individual race data)
- talent_scores (calculated scores, one row per run)
- scouting_status (none / watchlist / talent_pool / qualifier_invited)

## The 5 Score Dimensions (each 0-100, average = total score)
- Learning Rate (iRating slope over 90 days)
- Consistency (position delta std dev + incident rate)
- Racecraft (average positions gained per race)
- Versatility (unique tracks + cars in 90 days)
- Activity (race count in 30 and 90 days)

## Scouting Pathway
Watch List → Talent Pool → Qualifier Event → FAT Karting League Tryout

## User Roles
- user (default, sees own dashboard)
- scout (sees all talent pool drivers, B2B dashboard at /scout)
- admin (full access)

## Key Routes
- / landing page
- /register + /login auth
- /dashboard main user dashboard
- /dashboard/ranking age group ranking
- /dashboard/pathway scouting pathway status
- /scout B2B scout dashboard
- /scout/[userId] individual driver profile
- /api/cron/calculate-scores runs every 6h via Vercel cron
- /api/cron/seed-scores one-time manual trigger

## Current Status
Using mock data for 12 fictional drivers (no live iRacing API 
yet — OAuth registration is paused by iRacing).
iRacing API integration will be added once registration reopens.

## Design
- Dark theme: background #0a0a0a, surfaces #111111
- Accent color: #e8143c (racing red)
- Scout dashboard accent: #22c55e (green)
- Tailwind CSS only, no external UI libraries except recharts
