![An error tracker with email alerts, built by Claude Code on Elements: the Storefront project's issue list with error types, New and Regressed pills, seven-day sparklines, event and user counts, and first and last seen.](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba/poster?v=ee8c86f7bfb8)

# An error tracker with email alerts, built by Claude Code on Elements

> Faultkeep is a full-stack app built with Claude Code on Elements.

A paste-in snippet reports uncaught errors, grouped by stack trace into live issues with charts, triage and email alerts.

[Run this app on your machine](https://elements.dev/demos/01a0f45b-e5ae-722d-9405-0ab9735d61ba). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

Open a project's **Setup & DSN** page for its key, the snippet and a curl
example, then click **Open the test page** and throw a few errors while the
issue list is open in another tab. Events go to `POST /api/events` with the
key in `?key=`, an `X-Faultkeep-Key` header, or the body. In development,
alert emails are written to `.elements/logs/job.log` instead of being sent.

## How it's built

Faultkeep needed an ingest endpoint and a paste-in snippet, grouping by stack trace, live issue lists and charts, triage, and alert emails. Each of those is a part of Elements, so the agent spent its 32 minutes on error tracking itself.

- **An ingest endpoint and snippet.** One route takes JSON error events authenticated by the project's key, and another serves a snippet any web page can include to report uncaught errors and unhandled rejections.

- **Grouping in SQL.** A database function fingerprints each event by its stack frames, then updates the issue's counts, affected users, tags and hourly chart in one call. An event on a resolved issue reopens it.

- **Live issues and charts.** Issues, events, tags and chart buckets are LiveTables, and a database trigger broadcasts every ingest, so the issue list, each issue's chart and its latest events update as errors arrive.

- **Triage.** Resolving, ignoring and assigning save through the issues LiveTable, which checks the user and the assignee are members of the project.

- **Alert emails from a job.** A new or reopened issue schedules a job inside the ingest transaction, and it emails every project member from a template.

- **Data from SQL files.** Migrations define the schema and seed two users, two projects, 15 issues and about 1,860 events over the past week, some resolved, some ignored and one reopened. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
