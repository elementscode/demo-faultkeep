![Faultkeep, an error tracker built with Elements: the Storefront project's issue list with error types, New and Regressed pills, seven-day sparklines, event and user counts, and first and last seen.](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba/poster?v=ee8c86f7bfb8)

# Faultkeep

> A demo app built with [Elements](https://elements.dev).

A paste-in snippet reports uncaught errors, grouped by stack trace into live issues with charts, triage and email alerts.

**Demo:** [Faultkeep](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 32 min
- **Cost:** $8.16 at API rates, September 2026

## Get started

```bash
elements create faultkeep -scaffold=elementscode/demo-faultkeep
```

Open a project's **Setup & DSN** page for its key, the snippet and a curl
example, then click **Open the test page** and throw a few errors while the
issue list is open in another tab. Events go to `POST /api/events` with the
key in `?key=`, an `X-Faultkeep-Key` header, or the body. In development,
alert emails are written to `.elements/logs/job.log` instead of being sent.

## How it's built

Faultkeep needed an ingest endpoint and a paste-in snippet, grouping by stack trace, live issue lists and charts, triage, and alert emails. Each of those is a part of Elements, so the agent spent its 32 minutes on error tracking itself.

### What Elements gave the app

- **An ingest endpoint in one route.** `app/api/ingest.ts` answers `POST /api/events`, reads the project's key from a header, the query or the body, and accepts the snippet's plain-text posts. `app/api/sdk.ts` serves the snippet at `/sdk.js`, which reports uncaught errors and unhandled rejections from any page.
- **Grouping in SQL.** The `ingestEvent` function in the schema migration fingerprints each event by its stack frames, then updates the issue's counts, affected users, tags and hourly buckets in one call. An event on a resolved issue reopens it and marks it regressed.
- **Live issues and charts.** `issues`, `events`, `issueTags` and two bucket tables are LiveTables in `app/shared/services/issues.ts` with pinned channels, and a trigger notifies them on every ingest. The issue list, each issue's chart and its latest events update as errors arrive.
- **Triage through the table.** Resolve, ignore and assign go through the `update` handler of `issues`, which checks the user belongs to the project and that an assignee is a member.
- **Alert email from a job.** `ingestEvent` in `app/api/ingest.ts` schedules `NotifyIssueJob` inside the ingest transaction for a new or regressed issue, and the job emails every project member with the `issue-alert` template.
- **Data from SQL files.** Two migrations define the schema and seed two users, two projects, 15 issues and about 1,860 events over the past week, some resolved, some ignored and one regressed. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 24 tests pass. Every page works on desktop and phone, and live updates arrive as errors come in, such as an uncaught error on a page with the snippet raising its issue's count on an open issue list.

Start in `app/api/ingest.ts`.

## Seed data and demo accounts

The seed creates two projects, Storefront and Admin Dashboard, with 15 issues
and about 1,860 events spread over the past week, from fictional apps on
`shop.example.com` and `admin.example.com`. Some issues are resolved, some
ignored, one has regressed, and a few are assigned. Both accounts are members
of both projects, their password is `faultkeep`, and the sign-in page lists
them.

| Email                | Name         |
| -------------------- | ------------ |
| ada@faultkeep.test   | Ada Lovelace |
| grace@faultkeep.test | Grace Hopper |

## The prompt

```text
Build an error tracker named faultkeep for web apps.

- Accounts and projects. Each project has a DSN key.
- An ingest endpoint that accepts JSON error events (message, stack trace,
  url, browser, release, user) authenticated by the key, and a small snippet
  to paste into a web page that reports uncaught errors to it.
- Group events into issues by stack trace. Issue list: count, users affected,
  first and last seen, sorted by last seen or frequency.
- Issue detail: the stack trace, a chart of events over time, tags, and the
  latest events.
- Resolve, ignore, or assign an issue. A resolved issue that happens again
  reopens.
- Email when a new issue appears or a resolved one comes back.

Seed two users, two projects, and a week of events across about fifteen
issues. Show the seeded logins on the sign-in page.

New events and issues appear in real time.
```

## License

MIT. See [LICENSE](LICENSE).
