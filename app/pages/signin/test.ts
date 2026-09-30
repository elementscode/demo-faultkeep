import { test, assert, sql, session, AuthError } from "@elements/app";
import { signin, signup } from "#app/shared/services/auth";

test("signin", () => {
  // Emails are unique and other test files insert users too.
  function ada(): string {
    let email = `ada.${crypto.randomUUID().slice(0, 8)}@t.dev`;
    sql(`insert into users (email, name, passwordHash) values (${email}, 'Ada', crypt('correct-horse', genSalt('bf', 4)))`);

    return email;
  }

  test("signs in with the right password", () => {
    let email = ada();

    signin(`${email.toUpperCase()} `, "correct-horse");
    assert(session.get("userName") === "Ada", `got ${session.get("userName")}`);
  });

  test("refuses a wrong password", () => {
    let email = ada();

    let threw = false;
    try {
      signin(email, "wrong");
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
