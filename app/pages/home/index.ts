import { Request, Response, redirect, session } from "@elements/app";
import { myProjects } from "#app/shared/services/projects";

/** No page of its own: sends a visitor to sign in, or to their first project. */
export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let first = myProjects()[0];

  redirect(first ? `/projects/${first.id}` : "/projects");
}
