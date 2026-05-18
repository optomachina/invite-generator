# Cordial Invites

Cordial Invites is an iOS-first invitation creation app. Users describe an event by text or voice, review extracted details, choose a format and visual style, generate a preview, edit/regenerate in plain English, save drafts to a gallery, and publish a hosted RSVP link.

The web app remains in maintenance mode as the backend/fallback surface. Net-new product work should default to the native iOS app.

## Stack

- **iOS:** SwiftUI, iOS 18 target, Xcode project generated from `apps/ios/project.yml`
- **Current iOS generation:** remote-first web API adapter with local renderer fallback
- **Web:** Next.js 15 (App Router) + React 19, Bun, Vercel
- **Backend-ready image model:** OpenAI `gpt-image-2` via existing web API routes
- **Static analysis:** SonarCloud

## Layout

```
apps/ios/             Native Cordial Invites app
  CordialInvites/     SwiftUI app, models, services, views
  CordialInvitesTests/ Unit tests
  CordialInvitesUITests/ UI tests
apps/web/             Next.js web app and shared backend/fallback surface
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

## Current iOS Vertical Slice

Implemented:
- First-launch intro with replay from Account
- Bottom tabs: Create, Gallery, Account
- Text prompt intake, event chips, and existing voice-input path with fallback errors
- Deterministic prompt-to-details extraction into RSVP-ready editable fields
- Output format and style selection
- Local mock invite preview generation with progress copy
- Natural-language edit field, quick edit chips, regeneration, and version history
- Local draft/gallery persistence through `UserDefaults`
- Account defaults for preferred style, colors, RSVP contact, and output format
- Hosted RSVP publishing from the package screen, backed by the web API and public RSVP page
- Package selection stubs for non-hosted paid packages, with billing explicitly disabled

Stubbed/mocked:
- Image generation calls the web backend first and falls back to `MockInviteGenerationService` when remote generation is unavailable.
- Sign-in, privacy, delete account, inspiration image upload, PDF export, and package billing are placeholders.
- `PurchasePlaceholder` exists only as a data shape; Stripe, checkout, Apple IAP, and paid entitlements are intentionally not implemented.

Core data models live in `apps/ios/CordialInvites/Models/InviteModels.swift`: `EventDetails`, `RSVPSettings`, `InviteDesign`, `InviteRevision`, `RSVPResponse`, `AccountDefaults`, and `PurchasePlaceholder`.

## iOS Development

```bash
cd apps/ios
xcodegen generate
xcodebuild -project CordialInvites.xcodeproj -scheme CordialInvites -destination 'generic/platform=iOS Simulator' build
xcodebuild -project CordialInvites.xcodeproj -scheme CordialInvites -destination 'platform=iOS Simulator,name=iPhone 17' test
```

## Web Development

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

### One-time setup (before hosted RSVP or first payment)

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

### Hosted RSVP

The iOS hosted package posts selected invite details and the selected preview image to `/api/v1/hosted-invites`. The response includes a public `/rsvp/[slug]` URL and a host token. Guests can view the invite and submit RSVP responses without an account; the host token reads the private response list through `/api/v1/hosted-invites/[id]?token=...`.

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

## Next Implementation Targets

- Add real auth/session handling after the local creation loop is solid.
- Keep billing out until the product flow is validated end-to-end.
