# DAS Content Engine

Authenticated internal working product for the Blockworks DAS content team. Nothing auto-posts or auto-DMs. Invitation emails require a rendered preview, an explicit Send click, and a second confirmation.

## Product structure

The homepage separates events by lifecycle:

- Past Events
- Upcoming Events

Every event contains two workspaces:

- Content Analytics
- Clip Library

The global Invitations Command Center adds a single outreach desk for DAS Asia and DAS London. It reads the Event System'26 Speaker Hit List, enriches missing emails from HubSpot, drafts or sends through Bennett's Gmail, and proposes reply-driven Airtable status changes for human confirmation.

## Current data

- NYC 2026 — 118 tracked entities across 94 session transcripts
- Asia 2026 — 36 agenda rows for October 7 in Singapore
- London 2026 — 57 agenda rows for November 10–11

Past-event analytics use transcript mention data. Upcoming-event analytics use agenda readiness data. Clip Library screens expose the intended schema and integration state without inventing clip records that are not in the repository.

## Local use

1. Pull the Vercel development environment variables.
2. Copy the Invitations keys listed in `.env.example` into a local-only environment file. Use preview-scoped credentials for testing.
3. Run `pnpm install`.
4. Run `pnpm dev`.

Clerk protects the dashboard route. The sign-in flow lives at `/sign-in`.

If Airtable or Gmail credentials are absent, Invitations intentionally runs in safe testing mode with representative records. Draft and send actions are simulated and clearly labeled; no external records change.

## Deployment

The project uses Next.js App Router on Vercel. Clerk credentials are provisioned through the Vercel Marketplace and must not be committed.

## Guardrails

- Keep publishing and outreach human-approved
- Limit Invitations access with `INVITATIONS_ALLOWED_EMAILS` (Bennett and Carolyn for v1)
- Never create HubSpot contacts or duplicate Airtable Hit List rows
- Always BCC the existing HubSpot engage address on invitation mail
- Require confirmation before applying reply-classified statuses
- Treat the agenda as the operational source of truth
- Preserve stable session IDs once they are assigned
- Use the documented clip naming convention for new assets
