import { test, equal, sql, session } from "@elements/app";
import { signup } from "#app/shared/services/auth";

test("signup", () => {
  test("creates the account and signs in", () => {
    // Emails are unique and other test files insert users too.
    let email = `bo.${crypto.randomUUID().slice(0, 8)}@t.dev`;
    signup("Bo Reyes", email.replace("bo", "Bo").replace("t.dev", "T.dev"), "long-enough");

    let created = sql<{ email: string; name: string }>(`select email, name from users where email = ${email}`).all();
    equal(created.length, 1);
    equal(created[0]!.email, email);
    equal(created[0]!.name, "Bo Reyes");
    equal(session.get("userName"), "Bo Reyes");
  });
});
