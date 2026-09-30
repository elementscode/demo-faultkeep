import { test, assert, sql, session, AuthError } from "@elements/app";
import { signin, signup } from "#app/shared/services/auth";

test("signin", () => {
  test("signs in with the right password", () => {
    sql(`insert into users (email, name, passwordHash) values ('ada@t.dev', 'Ada', crypt('correct-horse', genSalt('bf', 4)))`);

    signin("ADA@t.dev ", "correct-horse");
    assert(session.get("userName") === "Ada", `got ${session.get("userName")}`);
  });

  test("refuses a wrong password", () => {
    sql(`insert into users (email, name, passwordHash) values ('ada@t.dev', 'Ada', crypt('correct-horse', genSalt('bf', 4)))`);

    let threw = false;
    try {
      signin("ada@t.dev", "wrong");
    } catch (err) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
    }

    assert(threw);
    assert(!session.isLoggedIn());
  });

  test("signup refuses a short password", () => {
    let threw = false;
    try {
      signup("Bo", "bo@t.dev", "short");
    } catch (err) {
      threw = true;
    }

    assert(threw);
  });
});
