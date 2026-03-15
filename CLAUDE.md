# YogiBeani — Charlene's Yoga Studio

## Project Overview

A full-stack monorepo for Charlene's yoga studio website. Clients can browse the class schedule, book sessions, sign liability waivers, and purchase class packages via Stripe. An admin dashboard provides class management, booking oversight, and revenue tracking.

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS (no framework/bundler) — served as static files
- **Backend**: Node.js + Express
- **Database**: SQLite via better-sqlite3
- **Payments**: Stripe (Checkout Sessions)
- **Deployment**: Vercel (frontend), Railway or any Node host (backend)

## Repository Structure

```
frontend/       — Static site (index.html, app.js, style.css, assets/)
backend/        — Express API server + SQLite database
claude-agents/  — Git submodule with shared Claude agent configs
.claude/agents/ — Symlinks to claude-agents/*.md (usable by Claude Code)
```

## Running Locally

```bash
cd backend && npm install
node server.js          # Starts on http://localhost:3000
                        # Frontend served at root, API at /api/*
```

## API Contract

All endpoints return `{ success: boolean, data?: any, error?: string }`.

Key endpoints: `/api/settings`, `/api/classes`, `/api/bookings`, `/api/waivers`, `/api/purchases`, `/api/clients`, `/api/dashboard`.

## Agents

This project uses the `claude-agents` submodule (via `.claude/agents/`). Key agents for this project:
- `team-orchestrator` — Coordinates all agents, breaks work into parallel waves
- `backend-engineer-agent` — Server-side implementation
- `frontend-engineer-agent` — UI components and client-side logic
- `database-engineer-agent` — Schema design and migrations
- `qa-test-engineer-agent` — Test planning and execution
