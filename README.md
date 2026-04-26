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
cp .env.local.example .env.local   # paste your OPENAI_API_KEY
bun install
bun dev                            # http://localhost:3001
```

Other scripts (run from `apps/web/`):

| Command | What it does |
| --- | --- |
| `bun test` | Unit tests (intake, pricing, logger) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run build` | Next.js production build |
| `bun run evidence:capture` | Playwright screenshots / video for PR evidence |

## Deploying

Push to a branch with an open PR → Vercel builds a Preview. Merge to `main` → Production. Full setup including env vars and SonarCloud lives in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Contributing

- Branch naming: `feature/<slug>` or `fix/<slug>`
- All UI-affecting changes must leave evidence under `.context/artifacts/<task-slug>/` — see [`AGENTS.md`](AGENTS.md)
- Use OpenAI image v2 (`gpt-image-2`) only; v1 is legacy and kept behind a flag
