import { Request, Response } from "@elements/app";
import html from "./template";
import { projectOrThrow, myProjects, membersOf } from "#app/shared/services/projects";

export function originOf(req: Request): string {
  let proto = req.headers["x-forwarded-proto"] ?? "http";

  return `${proto}://${req.headers.host}`;
}

export default function route(req: Request, res: Response) {
  let project = projectOrThrow(req.params.projectId);

  return new html({
    project,
    projects: myProjects(),
    members: membersOf(project.id),
    origin: originOf(req),
  });
}
