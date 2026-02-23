# Questerix — Platform Map

> **Purpose**: This file tells any AI agent working in this repository that the platform spans multiple repos. Do not attempt to manage marketing content or user documentation from here.

## Repository Responsibilities

| Repository                     | URL | Purpose                                             | Status    |
| ------------------------------ | --- | --------------------------------------------------- | --------- |
| **questerix-core** (this repo) | —   | Admin Panel, Student App, Supabase Backend, Workers | Active    |
| **questerix-landing-pages**    | TBD | Public marketing site, articles, SEO                | Extracted |
| **questerix-help-docs**        | TBD | User help center (Parents, Teachers, Admins)        | Extracted |

## Cloudflare Projects

| Project Name              | Domain                       | Repository                  |
| ------------------------- | ---------------------------- | --------------------------- |
| `questerix-admin`         | admin.questerix.com          | questerix-core              |
| `questerix-workers`       | workers.questerix.com        | questerix-core (`workers/`) |
| `questerix-landing-pages` | questerix.com (pending)      | questerix-landing-pages     |
| `questerix-help-docs`     | help.questerix.com (pending) | questerix-help-docs         |

## Design Token Sync

The master design tokens live at `design-system/generated/css-variables.css`.

**Downstream copies** (updated manually when brand changes):

- `questerix-landing-pages/src/styles/tokens.css`
- `questerix-help-docs/.vitepress/theme/vars.css`

## What STAYS in This Repo

- `admin-panel/` — React Admin Panel
- `student-app/` — Flutter Student App
- `supabase/` — Database migrations and Edge Functions
- `workers/` — Cloudflare Worker (AI generation, email alerts)
- `design-system/` — Master design tokens (source of truth)
- `docs/` — Agent-facing architecture and technical docs
- `.agent/` — AI workflows and skills
- `scripts/` — Build, deploy, and knowledge-base tools

## What Was Extracted

- `landing-pages/` → **questerix-landing-pages** repo (COMPLETED)
- `help-docs/` → **questerix-help-docs** repo (COMPLETED)
