![Faultkeep, an error tracker built with Elements: the Storefront project's issue list with error types, New and Regressed pills, seven-day sparklines, event and user counts, and first and last seen.](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba/poster?v=ee8c86f7bfb8)

# Faultkeep

> A demo app built with [Elements](https://elements.dev).

A paste-in snippet reports uncaught errors, grouped by stack trace into live issues with charts, triage and email alerts.

**Demo:** [Faultkeep](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba)

## Agent specs

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

- **An ingest endpoint and snippet.** One route takes JSON error events authenticated by the project's key, and another serves a snippet any web page can include to report uncaught errors and unhandled rejections.

- **Grouping in SQL.** A database function fingerprints each event by its stack frames, then updates the issue's counts, affected users, tags and hourly chart in one call. An event on a resolved issue reopens it.

- **Live issues and charts.** Issues, events, tags and chart buckets are LiveTables, and a database trigger broadcasts every ingest, so the issue list, each issue's chart and its latest events update as errors arrive.

- **Triage.** Resolving, ignoring and assigning save through the issues LiveTable, which checks the user and the assignee are members of the project.

- **Alert emails from a job.** A new or reopened issue schedules a job inside the ingest transaction, and it emails every project member from a template.

- **Data from SQL files.** Migrations define the schema and seed two users, two projects, 15 issues and about 1,860 events over the past week, some resolved, some ignored and one reopened. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 24 tests pass. Every page works on desktop and phone, and live updates arrive as errors come in, such as an uncaught error on a page with the snippet raising its issue's count on an open issue list.

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

**Demo:** [Faultkeep](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba)

## License

MIT. See [LICENSE](LICENSE).
