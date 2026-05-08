# invite-generator

Editorial-quality AI invitation generator. Enter the event details, swipe through three AI-generated invitation designs, keep the one you love.

Built for taste-sensitive parents who'd otherwise hire a custom Etsy designer — not another Canva template.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Image model:** OpenAI `gpt-image-2` (streamed, 3 variants per session)
- **UI:** Tailwind CSS + Framer Motion (Tinder-style swipe stack)
- **Runtime:** Bun
- **Hosting:** Vercel (auto-deploy on push to `main`, previews on PRs)
- **Static analysis:** SonarCloud

## Layout

```
apps/web/             Next.js app (the product)
  app/                Routes, components, API
  lib/                Intake validation, prompt builder, pricing, logger
  tests/              Unit tests + Playwright evidence capture
docs/
  DEPLOY.md           Vercel + env var setup
  evidence-capture.md Playwright evidence workflow
  mockups/            Design exploration
.context/             Per-workspace artifacts (gitignored)
.github/workflows/    CI: tests + PR evidence comment
AGENTS.md             Evidence requirements for completed work
```

## Local development

```bash
cd apps/web
cp .env.local.example .env.local   # fill in OpenAI, Stripe, Resend, Neon keys
bun install
bun dev                            # http://localhost:3001
```

For payment testing, in a second terminal:

```bash
stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe
# copy the whsec_… into .env.local as STRIPE_WEBHOOK_SECRET, then restart dev
```

### One-time setup (before first payment)

1. **Neon Postgres** — create a project at neon.tech, paste the pooled connection string into `DATABASE_URL`, then:
   ```bash
   cd apps/web && bunx drizzle-kit migrate
   ```
2. **Stripe price** — create the $10 invite Price (test mode):
   ```bash
   stripe prices create \
     --product-data[name]="Custom invite" \
     --unit-amount=1000 --currency=usd
   # paste the returned `price_…` id into STRIPE_PRICE_ID
   ```
3. **Resend** — sign up, generate an API key, paste into `RESEND_API_KEY`. Use `onboarding@resend.dev` as `RESEND_FROM` until your sending domain is verified.
4. **APP_URL** — set this to whatever the browser sees as your origin. Local: `http://localhost:3001`. Vercel previews: the assigned `https://<branch>-<proj>.vercel.app`. Production: your purchased domain. Magic-link emails (sent from the Stripe webhook) construct absolute URLs from this.

### Post-purchase access

After payment we email a magic link to `/invite/[id]?token=…` so users can come back, edit text, re-render, and re-download without an account. If they lose the email, `/recover` accepts an email address and re-sends links for every fulfilled order tied to that address.

Other scripts (run from `apps/web/`):

| Command | What it does |
| --- | --- |
| `bun test` | Unit tests (intake, pricing, logger) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run build` | Next.js production build |
| `bun run evidence:capture` | Playwright screenshots / video for PR evidence |
| `bunx drizzle-kit generate` | Generate a new Postgres migration from `lib/db/schema.ts` |
| `bunx drizzle-kit migrate` | Apply pending migrations to `DATABASE_URL` |

## Deploying

Push to a branch with an open PR → Vercel builds a Preview. Merge to `main` → Production. Full setup including env vars and SonarCloud lives in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Contributing

- Branch naming: `feature/<slug>` or `fix/<slug>`
- All UI-affecting changes must leave evidence under `.context/artifacts/<task-slug>/` — see [`AGENTS.md`](AGENTS.md)
- Use OpenAI image v2 (`gpt-image-2`) only; v1 is legacy and kept behind a flag
