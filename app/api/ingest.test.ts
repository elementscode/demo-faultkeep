import { test, equal, assert, sql } from "@elements/app";
import { ingestEvent } from "./ingest";
import { normalizeEvent, NormalizedEvent } from "./event";

function project(): string {
  return sql<{ id: string }>(`insert into projects (name) values ('Test') returning id`).firstOrThrow().id;
}

function event(stack: string, user = "u1"): NormalizedEvent {
  let e = normalizeEvent({ message: "boom", stack, user, url: "https://shop.example.com/cart?x=1", browser: "Chrome 129", release: "web@1" });
  if (typeof e === "string") {
    throw new Error(e);
  }

  return e;
}

const STACK_A = "TypeError: boom\n    at render (https://shop.example.com/assets/cart.1a2b3c4d.js:10:5)\n    at click (https://shop.example.com/assets/main.99ff88ee.js:3:1)";
const STACK_A_REDEPLOYED = "TypeError: boom\n    at render (https://cdn.example.com/assets/cart.deadbeef.js:12:9)\n    at click (https://cdn.example.com/assets/main.0badc0de.js:4:2)";
const STACK_B = "TypeError: boom\n    at checkout (https://shop.example.com/assets/pay.js:1:1)";

test("ingest", () => {
  test("groups a redeployed stack into the same issue", () => {
    let p = project();
    let first = ingestEvent(p, event(STACK_A));
    let second = ingestEvent(p, event(STACK_A_REDEPLOYED, "u2"));
    let other = ingestEvent(p, event(STACK_B));

    equal(first.rIssueId, second.rIssueId);
    assert(other.rIssueId !== first.rIssueId, "a different stack should be a different issue");
    assert(first.rIsNew && !second.rIsNew, "only the first event opens an issue");

    let issue = sql<{ eventCount: number; userCount: number }>(`select eventCount, userCount from issues where id = ${first.rIssueId}`).firstOrThrow();
    equal(issue, { eventCount: 2, userCount: 2 });
  });

  test("counts tags and buckets", () => {
    let p = project();
    let r = ingestEvent(p, event(STACK_A));
    ingestEvent(p, event(STACK_A));

    let url = sql<{ timesSeen: number }>(`select timesSeen from issueTags where issueId = ${r.rIssueId} and key = 'url'`).firstOrThrow();
    equal(url.timesSeen, 2);

    let bucket = sql<{ total: number }>(`select sum(total)::int as total from issueBuckets where issueId = ${r.rIssueId}`).firstOrThrow();
    equal(bucket.total, 2);
  });

  test("a resolved issue that happens again reopens and alerts", () => {
    let p = project();
    let r = ingestEvent(p, event(STACK_A));
    sql(`update issues set status = 'resolved', resolvedAt = now() where id = ${r.rIssueId}`);

    let again = ingestEvent(p, event(STACK_A));
    assert(again.rRegressed, "should report the regression");

    let issue = sql<{ status: string; regressedAt: Date | null }>(`select status, regressedAt from issues where id = ${r.rIssueId}`).firstOrThrow();
    equal(issue.status, "unresolved");
    assert(issue.regressedAt !== null, "regressedAt should be set");

    let jobs = sql<{ n: number }>(`select count(*)::int as n from elements.jobs where fields->>'issueId' = ${r.rIssueId}`).firstOrThrow();
    equal(jobs.n, 2);
  });

  test("an ignored issue stays ignored", () => {
    let p = project();
    let r = ingestEvent(p, event(STACK_A));
    sql(`update issues set status = 'ignored' where id = ${r.rIssueId}`);

    let again = ingestEvent(p, event(STACK_A));
    assert(!again.rRegressed, "ignored issues do not regress");
    equal(sql<{ status: string }>(`select status from issues where id = ${r.rIssueId}`).firstOrThrow().status, "ignored");
  });
});
