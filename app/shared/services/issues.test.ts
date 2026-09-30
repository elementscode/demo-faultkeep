import { test, equal, assert, sql, session, ForbiddenError } from "@elements/app";
import { issues, setStatus, assign } from "./issues";

function setup() {
  let user = (email: string) => sql<{ id: string }>(`
    insert into users (email, name, passwordHash) values (${email}, ${email}, 'x') returning id
  `).firstOrThrow().id;

  let member = user("member@t.dev");
  let outsider = user("outsider@t.dev");
  let projectId = sql<{ id: string }>(`insert into projects (name) values ('P') returning id`).firstOrThrow().id;
  sql(`insert into projectMembers (projectId, userId) values (${projectId}, ${member})`);

  let issueId = sql<{ id: string }>(`
    insert into issues (projectId, fingerprint, title, firstSeen, lastSeen)
         values (${projectId}, 'fp', 'Error: boom', now(), now())
      returning id
  `).firstOrThrow().id;

  return { member, outsider, projectId, issueId };
}

test("issues", () => {
  test("a member can resolve and assign", () => {
    let s = setup();
    session.login({ userId: s.member, userName: "member" });

    let view = issues.view({ id: s.issueId });
    setStatus(view, view.at(0)!, "resolved");

    let row = sql<{ status: string; resolvedAt: Date | null }>(`select status, resolvedAt from issues where id = ${s.issueId}`).firstOrThrow();
    equal(row.status, "resolved");
    assert(row.resolvedAt !== null, "resolvedAt should be set");

    let fresh = issues.view({ projectId: s.projectId });
    assign(fresh, fresh.at(0)!, s.member);
    equal(sql<{ assigneeId: string }>(`select assigneeId from issues where id = ${s.issueId}`).firstOrThrow().assigneeId, s.member);
  });

  test("someone outside the project cannot change an issue", () => {
    let s = setup();
    session.login({ userId: s.outsider, userName: "outsider" });

    let threw = false;
    try {
      let view = issues.view({ id: s.issueId });
      setStatus(view, view.at(0)!, "ignored");
    } catch (err) {
      threw = true;
      assert(err instanceof ForbiddenError, `got ${err}`);
    }

    assert(threw, "should have been refused");
    equal(sql<{ status: string }>(`select status from issues where id = ${s.issueId}`).firstOrThrow().status, "unresolved");
  });

  test("an assignee must be a member", () => {
    let s = setup();
    session.login({ userId: s.member, userName: "member" });

    let threw = false;
    try {
      let view = issues.view({ id: s.issueId });
      assign(view, view.at(0)!, s.outsider);
    } catch (err) {
      threw = true;
    }

    assert(threw, "assigning an outsider should fail");
  });
});
