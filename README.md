# AI Chat App

Next.js (App Router, TypeScript) + Auth.js + Prisma/PostgreSQL + Claude API.

Features: signup, login, logout, protected chat page, streaming AI replies,
saved conversations, per-user rate limit and daily message quota.

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (free options: Neon, Supabase, or a local install)
- An Anthropic API key from https://console.anthropic.com

## 2. Setup

```bash
npm install
cp .env.example .env        # then fill in the values
npx auth secret             # or: openssl rand -base64 32  -> paste into AUTH_SECRET
npm run db:push             # creates the tables
npm run dev
```

Open http://localhost:3000, create an account, and start chatting.

## 3. Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Signs session cookies (keep private) |
| `ANTHROPIC_API_KEY` | Server-side only. Never expose to the browser |
| `CLAUDE_MODEL` | Optional. Defaults to `claude-sonnet-5-5` |
| `DAILY_MESSAGE_LIMIT` | Optional. Messages per user per 24h. Defaults to 50 |

## 4. Project structure

```
prisma/schema.prisma            users, conversations, messages
src/auth.ts                     Auth.js config (credentials + bcrypt)
src/lib/prisma.ts               database client
src/lib/rate-limit.ts           in-memory limiter (replace with Upstash in production)
src/app/api/register            signup endpoint
src/app/api/chat                streaming Claude endpoint (protected)
src/app/api/conversations       list / load / delete conversations
src/app/login, register, chat   pages
src/components/ChatUI.tsx       chat interface
```

## 5. Before going to production

1. **Rate limiting:** `src/lib/rate-limit.ts` is in-memory, so each serverless
   instance has its own counters. Use Upstash Redis (`@upstash/ratelimit`).
2. **Email verification and password reset:** not included. Add them (for
   example with Resend) before opening signups to the public.
3. **Markdown rendering:** replies are shown as plain text on purpose (no XSS
   risk). If you add markdown, use `react-markdown` and do not enable raw HTML.
4. **Monitoring:** add Sentry or similar for error tracking.
5. **Spend control:** set a monthly spend limit in the Anthropic Console, and
   keep `DAILY_MESSAGE_LIMIT` modest.
6. **HTTPS and domain:** Vercel provides both automatically.

## 6. Deploy (Vercel)

1. Push the project to GitHub.
2. Import the repo in Vercel and add the four environment variables.
3. Run `npx prisma db push` once against your production database.
4. Deploy.
