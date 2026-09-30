import { Request, Response } from "@elements/app";
import html from "./template";
import { projectOrThrow } from "#app/shared/services/projects";

export default function route(req: Request, res: Response) {
  return new html({ project: projectOrThrow(req.params.projectId) });
}
