# Deploy

## Vercel project

- **Project:** `invite-generator` (team: `optomachina's projects`)
- **Root directory:** `apps/web`
- **Framework preset:** Next.js (autodetected)
- **GitHub repo:** connected — every push to `main` triggers a Production deploy, every PR gets a Preview URL
- **Project ID:** `prj_RnOsnbdgYqSIGxuoqEUkKcossHNd`

## Environment variables

Set in **Vercel dashboard → invite-generator → Settings → Environment Variables**, OR via CLI:

```bash
cd apps/web
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development
```

Required:

| Key              | Target(s)                        | Why                                          |
| ---------------- | -------------------------------- | -------------------------------------------- |
| `OPENAI_API_KEY` | production, preview, development | Used by `/api/generate` to call gpt-image-2. |

Without `OPENAI_API_KEY`, deploys boot fine but `/api/generate` returns a 500 telling you the key is missing.

## Local development

Two options:

**Option A — `.env.local` (simplest):**

```bash
cd apps/web
cp .env.local.example .env.local
# paste OPENAI_API_KEY into .env.local
bun dev
```

**Option B — pull from Vercel (after env vars are set there):**

```bash
cd apps/web
vercel env pull .env.local
bun dev
```

Option B keeps one source of truth (Vercel) instead of two.

## Deploy flow

- **Push to a branch with an open PR** → Vercel builds a Preview deployment → comments the URL on the PR
- **Merge to `main`** → Vercel builds a Production deployment
- **Manual deploy from your laptop** (rare): `cd apps/web && vercel` (preview) or `vercel --prod` (production)

## Cost watch

`gpt-image-2` cost per 4-image generation is unknown until first run. Watch the OpenAI dashboard after the first few generations. If real cost > ~$1.50 / 4 images, the free-swiper abuse defense in the design doc needs revisiting before public launch.

## SonarCloud

Static analysis runs via **SonarCloud Automatic Analysis** (no GitHub Action required).

- **Org:** `optomachina` (same as Overdrafter)
- **Project key:** `optomachina_invite-generator`
- **Config:** `sonar-project.properties` + `.sonarcloud.properties` at the repo root

One-time setup (manual, in the SonarCloud dashboard):

1. Go to https://sonarcloud.io and sign in with GitHub.
2. **+ → Analyze new project → Import an organization from GitHub** (skip if `optomachina` already exists).
3. Pick `optomachina/invite-generator` from the repo list → **Set up**.
4. On the project page → **Administration → Analysis Method → Automatic Analysis: ON**.
5. The next push to `main` (or any PR) will trigger an analysis; results comment on the PR as the **SonarCloud Code Analysis** check.

The `sonar.exclusions` in the properties files keep `node_modules`, `.next`, `.vercel`, lockfile, and tsbuildinfo out of analysis.
