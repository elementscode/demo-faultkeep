![Faultkeep, an error tracker built with Elements: the Storefront project's issue list with error types, New and Regressed pills, seven-day sparklines, event and user counts, and first and last seen.](POSTER_URL)

# Faultkeep

> A demo app built with [Elements](https://elements.dev).

A paste-in snippet reports uncaught errors, grouped into issues by stack trace, with live counts, charts and tags, triage, reopening on regression and email alerts.

**Demo:** [Faultkeep](TBD)

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
