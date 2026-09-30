import { test, equal, sql, session } from "@elements/app";
import { myProjects } from "#app/shared/services/projects";

test("home", () => {
  test("a user sees only the projects they belong to", () => {
    let [ada, grace] = ["ada", "grace"].map((name) =>
      sql<{ id: string }>(`
        insert into users (email, name, passwordHash) values (${`${name}.${crypto.randomUUID().slice(0, 8)}@t.dev`}, ${name}, 'x') returning id
      `).firstOrThrow().id,
    );

    let mine = sql<{ id: string }>(`insert into projects (name) values ('mine') returning id`).firstOrThrow().id;
    sql(`insert into projects (name) values ('theirs')`);
    sql(`insert into projectMembers (projectId, userId) values (${mine}, ${ada})`);

    session.login({ userId: ada, userName: "ada" });
    equal(myProjects().map((p) => p.name), ["mine"]);

    session.login({ userId: grace, userName: "grace" });
    equal(myProjects().length, 0);
  });
});
