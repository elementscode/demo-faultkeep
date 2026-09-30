import { test, assert, sql, session, ForbiddenError } from "@elements/app";
import { projectOrThrow } from "#app/shared/services/projects";

test("issues", () => {
  test("only members can open a project's pages", () => {
    let user = sql<{ id: string }>(`insert into users (email, name, passwordHash) values ('u@t.dev', 'U', 'x') returning id`).firstOrThrow().id;
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
