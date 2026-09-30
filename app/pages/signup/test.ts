import { test, equal, sql, session } from "@elements/app";
import { signup } from "#app/shared/services/auth";

test("signup", () => {
  test("creates the account and signs in", () => {
    signup("Bo Reyes", "Bo@T.dev", "long-enough");

    equal(sql<{ email: string }>(`select email from users`).firstOrThrow().email, "bo@t.dev");
    equal(session.get("userName"), "Bo Reyes");
  });
});
