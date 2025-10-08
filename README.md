# StartupQuest AI — Monorepo Skeleton

This is a lightweight scaffold (no installs) for a Duolingo‑style, gamified platform that teaches AI + entrepreneurship through quests.

What’s included:
- pnpm workspaces (`apps/*`, `packages/*`)
- Apps: `web` (Next.js skeleton), `api` (Express stubs), `worker` (BullMQ stub)
- Packages: `core`, `ai`, `grader`, `lessons`, `ui`, `analytics`
- Sample rubrics (quiz, code, business) and 10 lesson stubs

Next steps:
- Install deps: `pnpm install` (requires network)
- (Optional) Add DB/infra (Prisma + docker-compose)
- Run `pnpm dev` to start the web app once deps are installed

