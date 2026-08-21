# DAS Content Engine

Authenticated internal working product for the Blockworks DAS content team. Nothing auto-posts, auto-DMs, or auto-emails.

## Product structure

The homepage separates events by lifecycle:

- Past Events
- Upcoming Events

Every event contains two workspaces:

- Content Analytics
- Clip Library

## Current data

- NYC 2026 — 118 tracked entities across 94 session transcripts
- Asia 2026 — 36 agenda rows for October 7 in Singapore
- London 2026 — 57 agenda rows for November 10–11

Past-event analytics use transcript mention data. Upcoming-event analytics use agenda readiness data. Clip Library screens expose the intended schema and integration state without inventing clip records that are not in the repository.

## Local use

1. Pull the Vercel development environment variables.
2. Run `pnpm install`.
3. Run `pnpm dev`.

Clerk protects the dashboard route. The sign-in flow lives at `/sign-in`.

## Deployment

The project uses Next.js App Router on Vercel. Clerk credentials are provisioned through the Vercel Marketplace and must not be committed.

## Guardrails

- Keep publishing and outreach human-approved
- Treat the agenda as the operational source of truth
- Preserve stable session IDs once they are assigned
- Use the documented clip naming convention for new assets
