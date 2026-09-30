import { Job, email, sql } from "@elements/app";
import IssueAlertEmail from "#app/emails/issue-alert";

export interface NotifyIssueJobFields {
  issueId: string;
  eventId: string;
  kind: "new" | "regressed";
}

interface AlertRow {
  projectId: string;
  projectName: string;
  title: string;
  culprit: string;
  url: string;
  release: string;
  browser: string;
}

/**
 * Emails every member of the issue's project. Scheduled inside the ingest
 * transaction, so an event that rolls back never sends.
 */
export class NotifyIssueJob extends Job<NotifyIssueJobFields> {
  static maxAttempts = 5;

  run() {
    let { issueId, eventId, kind } = this.fields;

    let row = sql<AlertRow>(`
      select i.projectId, p.name as projectName, i.title, i.culprit, e.url, e.release, e.browser
        from issues i
        join projects p on p.id = i.projectId
        join events e on e.id = ${eventId}
       where i.id = ${issueId}
    `).first();

    if (!row) {
      return;
    }

    let to = sql<{ email: string }>(`
      select u.email from users u
        join projectMembers m on m.userId = u.id
       where m.projectId = ${row.projectId}
    `).all().map((u) => u.email);

    if (to.length === 0) {
      return;
    }

    email({
      to,
      subject: `${kind === "new" ? "New issue" : "Regression"} in ${row.projectName}: ${row.title.slice(0, 120)}`,
      body: new IssueAlertEmail({
        kind,
        projectName: row.projectName,
        title: row.title,
        culprit: row.culprit,
        url: row.url,
        release: row.release,
        browser: row.browser,
        link: `/projects/${row.projectId}/issues/${issueId}`,
      }),
    });
  }
}
