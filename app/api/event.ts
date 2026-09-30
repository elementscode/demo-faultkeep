/**
 * The shape an ingest request may take, and the normalized row it becomes.
 * Kept free of server-only imports so the tests can call it directly.
 */
export interface RawEvent {
  key?: string;
  type?: string;
  name?: string;
  message?: string;
  stack?: string;
  url?: string;
  browser?: string;
  userAgent?: string;
  release?: string;
  user?: string | { id?: string | number; email?: string; username?: string } | null;
  timestamp?: string | number;
}

export interface NormalizedEvent {
  type: string;
  message: string;
  stack: string;
  url: string;
  browser: string;
  os: string;
  userAgent: string;
  release: string;
  userKey: string;
  at: Date;
}

const MAX_MESSAGE = 2_000;
const MAX_STACK = 16_000;
const MAX_FIELD = 500;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function text(value: unknown, max: number): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().slice(0, max);
}

export function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "";
  let m: RegExpMatchArray | null;

  if ((m = ua.match(/Edg(?:A|iOS)?\/(\d+)/))) {
    browser = `Edge ${m[1]}`;
  } else if ((m = ua.match(/OPR\/(\d+)/))) {
    browser = `Opera ${m[1]}`;
  } else if ((m = ua.match(/(?:Firefox|FxiOS)\/(\d+)/))) {
    browser = `Firefox ${m[1]}`;
  } else if ((m = ua.match(/CriOS\/(\d+)/))) {
    browser = `Chrome Mobile ${m[1]}`;
  } else if ((m = ua.match(/Chrome\/(\d+)/))) {
    browser = /Mobile/.test(ua) ? `Chrome Mobile ${m[1]}` : `Chrome ${m[1]}`;
  } else if ((m = ua.match(/Version\/(\d+(?:\.\d+)?).*Safari/))) {
    browser = /Mobile/.test(ua) ? `Mobile Safari ${m[1]}` : `Safari ${m[1]}`;
  }

  let os = "";
  if (/iPhone|iPad|iPod/.test(ua)) {
    os = "iOS";
  } else if (/Android/.test(ua)) {
    os = "Android";
  } else if (/Windows/.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    os = "macOS";
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  return { browser, os };
}

function userKey(user: RawEvent["user"]): string {
  if (!user) {
    return "";
  }

  if (typeof user === "object") {
    return text(user.id ?? user.email ?? user.username, MAX_FIELD);
  }

  return text(user, MAX_FIELD);
}

/** The error's type: given outright, or read off the first line of a V8 stack. */
function errorType(raw: RawEvent, stack: string): string {
  let given = text(raw.type ?? raw.name, 100);
  if (given) {
    return given;
  }

  let m = stack.match(/^([A-Z][A-Za-z0-9_$]*(?:Error|Exception))(?::|$)/);

  return m ? m[1] : "Error";
}

function eventTime(value: RawEvent["timestamp"], now: Date): Date {
  if (value === undefined || value === null || value === "") {
    return now;
  }

  let at = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  if (isNaN(+at) || +at > +now || +now - +at > MAX_AGE_MS) {
    return now;
  }

  return at;
}

/** The normalized event, or a message saying what is wrong with it. */
export function normalizeEvent(raw: unknown, now: Date = new Date()): NormalizedEvent | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "The body must be a JSON object.";
  }

  let event = raw as RawEvent;
  let stack = text(event.stack, MAX_STACK);
  let message = text(event.message, MAX_MESSAGE);

  if (!message && stack) {
    message = stack.split("\n")[0].replace(/^[A-Za-z_$][\w$]*:\s*/, "");
  }

  if (!message) {
    return "An event needs a message.";
  }

  let browserField = text(event.browser, MAX_FIELD);
  let ua = text(event.userAgent, MAX_FIELD) || (/Mozilla\//.test(browserField) ? browserField : "");
  let parsed = parseUserAgent(ua);

  return {
    type: errorType(event, stack),
    message,
    stack,
    url: text(event.url, MAX_FIELD),
    browser: parsed.browser || (ua ? "" : browserField),
    os: parsed.os,
    userAgent: ua,
    release: text(event.release, 100),
    userKey: userKey(event.user),
    at: eventTime(event.timestamp, now),
  };
}
