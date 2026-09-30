import { Request, Response, sql, session } from "@elements/app";
import html, { ProjectSummary } from "./template";
import { myProjects } from "#app/shared/services/projects";

export default function route(req: Request, res: Response) {
  session.isLoggedInOrThrow();

  let summaries = sql<ProjectSummary>(`
    select p.id, p.name,
           (select count(*)::int from issues i where i.projectId = p.id and i.status = 'unresolved') as unresolved,
           (select coalesce(sum(b.total), 0)::int from issueBuckets b join issues i on i.id = b.issueId
             where i.projectId = p.id and b.bucketAt > now() - interval '24 hours') as events24h,
           (select count(*)::int from projectMembers pm where pm.projectId = p.id) as members
      from projects p
      join projectMembers m on m.projectId = p.id
     where m.userId = ${session.getOrThrow("userId")}
     order by p.createdAt
  `).all();

  return new html({ projects: myProjects(), summaries });
}
