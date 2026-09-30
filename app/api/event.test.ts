import { test, equal, assert } from "@elements/app";
import { normalizeEvent, parseUserAgent } from "./event";

const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
const EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0";

test("event", () => {
  test("parses browsers and systems from a user agent", () => {
    equal(parseUserAgent(CHROME_MAC), { browser: "Chrome 129", os: "macOS" });
    equal(parseUserAgent(SAFARI_IOS), { browser: "Mobile Safari 17.6", os: "iOS" });
    equal(parseUserAgent(EDGE), { browser: "Edge 129", os: "Windows" });
  });

  test("reads the type off a V8 stack and the user off an object", () => {
    let e = normalizeEvent({
      message: "x is undefined",
      stack: "TypeError: x is undefined\n    at f (https://shop.example.com/app.js:1:2)",
      userAgent: CHROME_MAC,
      user: { id: 42, email: "a@b.c" },
    });

    if (typeof e === "string") {
      throw new Error(e);
    }

    equal(e.type, "TypeError");
    equal(e.userKey, "42");
    equal(e.browser, "Chrome 129");
  });

  test("takes a plain browser name when no user agent is sent", () => {
    let e = normalizeEvent({ message: "boom", browser: "Chrome 129", user: "u1" });
    assert(typeof e !== "string" && e.browser === "Chrome 129" && e.userKey === "u1", `got ${JSON.stringify(e)}`);
  });

  test("rejects a body with no message", () => {
    equal(normalizeEvent({ url: "https://shop.example.com" }), "An event needs a message.");
    equal(normalizeEvent([1, 2]), "The body must be a JSON object.");
  });

  test("ignores a timestamp from the future", () => {
    let now = new Date("2026-09-30T12:00:00Z");
    let e = normalizeEvent({ message: "m", timestamp: "2027-01-01T00:00:00Z" }, now);
    assert(typeof e !== "string" && +e.at === +now, `got ${JSON.stringify(e)}`);
  });
});
