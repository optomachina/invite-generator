# Evidence Capture Workflow

This repo uses a lightweight Playwright workflow to generate screenshots and optional video artifacts for completed UI work.

## Artifact policy

Save evidence under:

```text
.context/artifacts/<task-slug>/
```

Minimum for visible UI work:
- `desktop-final.png`
- `mobile-final.png`

Also capture video for:
- animation
- drag and drop
- swipe gestures
- scrolling behavior
- onboarding or checkout flows
- any multi-step interaction where a screenshot is not enough

## Commands

From `apps/web`:

```bash
EVIDENCE_TASK=homepage bun run evidence:capture
```

Capture screenshots plus video:

```bash
EVIDENCE_TASK=swipe-stack EVIDENCE_VIDEO=1 bun run evidence:capture
```

Capture a non-root route:

```bash
EVIDENCE_TASK=invite-editor EVIDENCE_PATH=/editor bun run evidence:capture
```

Install Playwright browsers on a new machine:

```bash
bun run evidence:install
```

## What this produces

The Playwright harness creates:
- `.context/artifacts/<task-slug>/desktop-final.png`
- `.context/artifacts/<task-slug>/mobile-final.png`
- `.context/artifacts/<task-slug>/playwright-output/...` for videos and retry traces

For pull requests, GitHub Actions also:
- reruns evidence capture in CI
- uploads the result as a workflow artifact
- publishes reviewer-facing evidence files to a dedicated PR evidence branch
- posts or updates a PR comment with inline screenshot previews and artifact links

Inline motion previews are not the default for the generic final-state capture.
- Only publish inline GIF or video previews when the evidence spec performs a real interaction sequence that reviewers need to see.
- If the evidence run is just a final-state capture, keep the PR comment to screenshots only.

That PR comment is the reviewer-facing location for evidence in GitHub.

## Notes

- Screenshots are captured only after the page is loaded and the main region is visible.
- Video is optional by default because the better default is screenshots for final state and video only for dynamic behavior.
- Traces are kept on first retry, which matches Playwright guidance for useful debugging without recording everything on every passing run.
- If a task needs custom interaction coverage, add or edit a dedicated Playwright spec instead of overloading the generic capture spec.
- GitHub artifact URLs require repository access and are intended for reviewers already in the PR.
- GitHub comments support inline images from URLs. For automated inline previews, this repo publishes PNG and GIF evidence files to a PR-specific branch and references them via branch-hosted raw asset URLs in the comment.
