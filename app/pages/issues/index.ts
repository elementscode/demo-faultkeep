import { Request, Response, session } from "@elements/app";
import html from "./template";
import { projectOrThrow, myProjects, membersOf } from "#app/shared/services/projects";
import { issues, projectBuckets } from "#app/shared/services/issues";

export default function route(req: Request, res: Response) {
  let project = projectOrThrow(req.params.projectId);

  return new html({
    project,
    projects: myProjects(),
    members: membersOf(project.id),
    meId: session.getOrThrow("userId"),
    issues: issues.view({ projectId: project.id }),
    buckets: projectBuckets.view({ projectId: project.id }),
  });
}
