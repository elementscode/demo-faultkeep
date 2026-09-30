import { Request, Response, sql, NotFoundError } from "@elements/app";
import html from "./template";
import { projectOrThrow, myProjects, membersOf } from "#app/shared/services/projects";
import { issues, events, issueTags, issueBuckets } from "#app/shared/services/issues";

export default function route(req: Request, res: Response) {
  let project = projectOrThrow(req.params.projectId);
  let issueId = req.params.issueId;

  let found = /^[0-9a-f-]{36}$/.test(issueId)
    && !sql(`select 1 from issues where id = ${issueId} and projectId = ${project.id}`).empty();

  if (!found) {
    throw new NotFoundError("No such issue.");
  }

  return new html({
    project,
    projects: myProjects(),
    members: membersOf(project.id),
    issueView: issues.view({ id: issueId }),
    events: events.view({ issueId }, { orderBy: "createdAt desc", limit: 15 }),
    tags: issueTags.view({ issueId }),
    buckets: issueBuckets.view({ issueId }),
  });
}
