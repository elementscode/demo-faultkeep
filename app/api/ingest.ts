import { Request, Response, sql, tx } from "@elements/app";
import { NotifyIssueJob } from "#app/jobs/notify-issue";
import { normalizeEvent, NormalizedEvent } from "./event";

interface Ingested {
  rIssueId: string;
  rEventId: string;
  rIsNew: boolean;
  rRegressed: boolean;
}

/**
 * The snippet posts as text/plain so the browser sends it without a CORS
 * preflight, which means the body arrives unparsed.
 */
function readBody(req: Request): unknown {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
    return req.body;
  }

  let raw = req.bodyBuffer?.toString("utf8") ?? (typeof req.body === "string" ? req.body : "");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function keyFrom(req: Request, body: unknown): string {
  let header = req.headers["x-faultkeep-key"];
  if (typeof header === "string" && header) {
    return header;
  }

  let query = req.query.key;
  if (typeof query === "string" && query) {
    return query;
  }

  let fromBody = (body as { key?: unknown } | null)?.key;

  return typeof fromBody === "string" ? fromBody : "";
}

export function ingestEvent(projectId: string, e: NormalizedEvent): Ingested {
  return tx(() => {
    let result = sql<Ingested>(`
      select * from ingestEvent(${projectId}, ${e.type}, ${e.message}, ${e.stack}, ${e.url}, ${e.browser},
                                ${e.os}, ${e.userAgent}, ${e.release}, ${e.userKey}, ${e.at})
    `).firstOrThrow();

    if (result.rIsNew || result.rRegressed) {
      new NotifyIssueJob({
        issueId: result.rIssueId,
        eventId: result.rEventId,
        kind: result.rIsNew ? "new" : "regressed",
      }).schedule();
    }

    return result;
  });
}

export default function route(req: Request, res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Faultkeep-Key");

  if (req.method === "OPTIONS") {
    res.status(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405);
    return { error: "POST a JSON error event to this url." };
  }

  let body = readBody(req);

  let key = keyFrom(req, body);
  if (!key) {
    res.status(401);
    return { error: "Missing DSN key. Pass it as ?key=, an X-Faultkeep-Key header, or a key field." };
  }

  let project = sql<{ id: string }>(`select id from projects where dsnKey = ${key}`).first();
  if (!project) {
    res.status(401);
    return { error: "Unknown DSN key." };
  }

  let event = normalizeEvent(body);
  if (typeof event === "string") {
    res.status(400);
    return { error: event };
  }

  let result = ingestEvent(project.id, event);

  res.status(202);

  return { id: result.rEventId, issueId: result.rIssueId };
}
