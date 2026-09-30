import { test, assert, sql, session, ForbiddenError } from "@elements/app";
import { projectOrThrow } from "#app/shared/services/projects";

test("try", () => {
  test("only members can open a project's pages", () => {
    // Emails are unique and other test files insert users too.
    let email = `u.${crypto.randomUUID().slice(0, 8)}@t.dev`;
    let user = sql<{ id: string }>(`insert into users (email, name, passwordHash) values (${email}, 'U', 'x') returning id`).firstOrThrow().id;
    let projectId = sql<{ id: string }>(`insert into projects (name) values ('P') returning id`).firstOrThrow().id;
    session.login({ userId: user, userName: "U" });

    let threw = false;
    try {
      projectOrThrow(projectId);
    } catch (err) {
      threw = true;
      assert(err instanceof ForbiddenError, `got ${err}`);
    }
    assert(threw);

    sql(`insert into projectMembers (projectId, userId) values (${projectId}, ${user})`);
    assert(projectOrThrow(projectId).name === "P");
  });
});
