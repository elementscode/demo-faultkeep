import { LiveTable, LiveView, sql, ForbiddenError, ValidationError } from "@elements/app";
import { isMemberOrThrow } from "#app/shared/services/projects";

export type IssueStatus = "unresolved" | "resolved" | "ignored";

export interface Issue {
  id: string;
  createdAt: Date;
  projectId: string;
  title: string;
  culprit: string;
  status: IssueStatus;
  assigneeId: string | null;
  eventCount: number;
  userCount: number;
  firstSeen: Date;
  lastSeen: Date;
  resolvedAt: Date | null;
  regressedAt: Date | null;
}

export interface ErrorEvent {
  id: string;
  createdAt: Date;
  projectId: string;
  issueId: string;
  errorType: string;
  message: string;
  stack: string;
  url: string;
  browser: string;
  os: string;
  userAgent: string;
  release: string;
  userKey: string;
}

export interface IssueTag {
  id: string;
  issueId: string;
  key: string;
  value: string;
  timesSeen: number;
}

export interface IssueBucket {
  id: string;
  projectId?: string;
  issueId: string;
  bucketAt: Date;
  total: number;
}

const STATUSES: IssueStatus[] = ["unresolved", "resolved", "ignored"];

function readOnly(): never {
  throw new ForbiddenError("Events are written by the ingest endpoint.");
}

/**
 * Opened per project for the list and per id for the detail page. Ingest
 * writes with plain sql, so a trigger on each table notifies its channel (see
 * the schema migration).
 */
export let issues: LiveTable<Issue> = new LiveTable<Issue>({
  select: (p: { projectId?: string; id?: string }) => sql<Issue>(`
    select id, createdAt, projectId, title, culprit, status, assigneeId,
           eventCount, userCount, firstSeen, lastSeen, resolvedAt, regressedAt
      from issues
     where (${p.projectId ?? null}::uuid is null or projectId = ${p.projectId ?? null}::uuid)
       and (${p.id ?? null}::uuid is null or id = ${p.id ?? null}::uuid)
  `),

  insert: readOnly,
  delete: readOnly,

  update: (item) => {
    isMemberOrThrow(item.projectId);

    if (!STATUSES.includes(item.status)) {
      throw new ValidationError(`Unknown status ${item.status}.`);
    }

    if (item.assigneeId) {
      let member = !sql(`
        select 1 from projectMembers where projectId = ${item.projectId} and userId = ${item.assigneeId}
      `).empty();

      if (!member) {
        throw new ValidationError("The assignee must be a member of the project.");
      }
    }

    return sql<Issue>(`
      update issues
         set status = ${item.status},
             assigneeId = ${item.assigneeId},
             resolvedAt = case when ${item.status} = 'resolved' then coalesce(resolvedAt, now()) end
       where id = ${item.id} and projectId = ${item.projectId}
      returning id, createdAt, projectId, title, culprit, status, assigneeId,
                eventCount, userCount, firstSeen, lastSeen, resolvedAt, regressedAt
    `).firstOrThrow("No such issue.");
  },
});

export let events: LiveTable<ErrorEvent> = new LiveTable<ErrorEvent>({
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

export let issueTags: LiveTable<IssueTag> = new LiveTable<IssueTag>({
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

export let issueBuckets: LiveTable<IssueBucket> = new LiveTable<IssueBucket>({
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

/**
 * Every issue's hourly buckets in a project over the last week, for the list's
 * sparklines. It reads issueBuckets, so it shares that table's channel.
 */
export let projectBuckets: LiveTable<IssueBucket> = new LiveTable<IssueBucket>({
  table: "issue_buckets",

  select: (p: { projectId?: string }) => sql<IssueBucket>(`
    select b.id, i.projectId, b.issueId, b.bucketAt, b.total
      from issueBuckets b
      join issues i on i.id = b.issueId
     where i.projectId = ${p.projectId ?? null}::uuid
       and b.bucketAt > now() - interval '7 days'
  `),

  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

export function setStatus(view: LiveView<Issue>, issue: Issue, status: IssueStatus) {
  view.update({
    ...issue,
    status,
    resolvedAt: status === "resolved" ? new Date() : null,
  });
}

export function assign(view: LiveView<Issue>, issue: Issue, assigneeId: string | null) {
  view.update({ ...issue, assigneeId });
}
